import { 
  createSkillExecution,
  type SkillWithAssociation 
} from '@/app/dashboard/libs/skills_db_queries_v2';
import { SLACK_SKILL_IMPLEMENTATIONS } from './builtin/slack';
import { DISCORD_SKILL_IMPLEMENTATIONS } from './builtin/discord';
import { GOOGLE_DRIVE_SKILL_IMPLEMENTATIONS } from './builtin/google_drive';
import { GMAIL_SKILL_IMPLEMENTATIONS } from './builtin/gmail';
import { GOOGLE_CALENDAR_SKILL_IMPLEMENTATIONS } from './builtin/google_calendar';
import { NOTION_SKILL_IMPLEMENTATIONS } from './builtin/notion';
import { createServiceClient } from '@/utils/supabase/service';

export interface SkillExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface SkillExecutionContext {
  skillId: string;
  chatSessionId?: string;
  userId?: string;
  chatbotId?: string; // Add chatbotId for integration lookup
  integrationId?: string; // For built-in skills that need integration auth
  channel?: 'web' | 'embed' | 'slack' | 'discord' | 'api' | 'alexa';
  testMode?: boolean;
}

/**
 * Built-in skills registry
 * This registry maps skill names to their implementation functions
 */
const BUILTIN_SKILLS_REGISTRY: Record<string, (params: any, context: SkillExecutionContext) => Promise<any>> = {
  // Slack built-in skills
  ...SLACK_SKILL_IMPLEMENTATIONS,
  
  // Discord built-in skills
  ...DISCORD_SKILL_IMPLEMENTATIONS,

  // Google Drive built-in skills
  ...GOOGLE_DRIVE_SKILL_IMPLEMENTATIONS,

  // Gmail built-in skills
  ...GMAIL_SKILL_IMPLEMENTATIONS,

  // Google Calendar built-in skills
  ...GOOGLE_CALENDAR_SKILL_IMPLEMENTATIONS,

  // Notion built-in skills
  ...NOTION_SKILL_IMPLEMENTATIONS,

  // Add more built-in skills here as needed
};

/**
 * Fetch integration ID for a chatbot and integration type
 */
async function getIntegrationIdForChatbot(chatbotId: string, integrationType: string): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    
    // First, get all integrations for this chatbot and type
    const { data: allIntegrations, error: allError } = await supabase
      .from('chatbot_integrations')
      .select(`
        integration_id,
        connected_integrations!inner(
          id,
          integration_type,
          metadata
        )
      `)
      .eq('chatbot_id', chatbotId)
      .eq('connected_integrations.integration_type', integrationType)
      .order('created_at', { ascending: false });

    if (allError) {
      console.error(`Failed to fetch integrations: ${allError.message}`);
      return null;
    }

    if (!allIntegrations || allIntegrations.length === 0) {
      return null;
    }

    // If multiple integrations exist, log a warning and use the most recent
    if (allIntegrations.length > 1) {
      const workspaceNames = allIntegrations.map(int => {
        const metadata = (int.connected_integrations as any).metadata;
        return metadata?.team_name || metadata?.guild_name || metadata?.workspace_name || 'Unknown';
      });
      
      console.warn(`[Integration Warning] Chatbot ${chatbotId} has ${allIntegrations.length} ${integrationType} integrations: [${workspaceNames.join(', ')}]. Using most recent: "${workspaceNames[0]}"`);
      console.warn(`[Integration Warning] Consider using chatbot integration management to specify which ${integrationType} workspace to use.`);
    }

    const selectedIntegration = allIntegrations[0];
    const workspaceName = (selectedIntegration.connected_integrations as any).metadata?.team_name || 
                         (selectedIntegration.connected_integrations as any).metadata?.guild_name || 
                         'Unknown Workspace';
    
    console.log(`[Integration] Using ${integrationType} integration: "${workspaceName}" for chatbot ${chatbotId}`);
    return selectedIntegration.integration_id;

  } catch (error) {
    console.error('Error fetching integration ID:', error);
    return null;
  }
}

/**
 * Auto-fetch integration ID for built-in skills that require it
 */
async function ensureIntegrationId(
  skill: { name: string }, 
  context: SkillExecutionContext
): Promise<SkillExecutionContext> {
  // If integration ID is already provided, return as-is
  if (context.integrationId) {
    return context;
  }

  // Determine integration type based on skill name
  let integrationType: string | null = null;
  if (skill.name.startsWith('slack_')) {
    integrationType = 'slack';
  } else if (skill.name.startsWith('discord_')) {
    integrationType = 'discord';
  } else if (skill.name.startsWith('google_drive_')) {
    integrationType = 'google';
  } else if (skill.name.startsWith('gmail_')) {
    integrationType = 'google';
  } else if (skill.name.startsWith('google_calendar_')) {
    integrationType = 'google';
  } else if (skill.name.startsWith('notion_')) {
    integrationType = 'notion';
  }

  // If this skill doesn't require an integration, return as-is
  if (!integrationType) {
    return context;
  }

  // Validate required context
  if (!context.chatSessionId) {
    throw new Error(`Chat session required for ${integrationType} skills`);
  }

  const chatbotId = (context as any).chatbotId;
  if (!chatbotId) {
    throw new Error(`Chatbot ID required for ${integrationType} skills`);
  }

  // Look up integration ID
  const integrationId = await getIntegrationIdForChatbot(chatbotId, integrationType);
  if (!integrationId) {
    throw new Error(`No active ${integrationType} integration found for this chatbot. Please connect ${integrationType} in the chatbot settings.`);
  }

  console.log(`Auto-fetched ${integrationType} integration ID: ${integrationId} for chatbot ${chatbotId}`);
  
  return {
    ...context,
    integrationId
  };
}

/**
 * Execute a custom skill by making HTTP request to user's endpoint
 */
async function executeCustomSkill(
  skill: SkillWithAssociation, 
  parameters: Record<string, any>
): Promise<SkillExecutionResult> {
  try {
    // Get configuration (prefer custom_config from association, fallback to skill config)
    const config = {
      ...skill.configuration,
      ...skill.association.custom_config,
    };

    // Handle both old and new webhook configuration structures
    let webhookConfig;
    if (config.webhook_config) {
      // New structure: { webhook_config: { url, method, headers, timeout_ms } }
      webhookConfig = config.webhook_config;
    } else {
      // Old/legacy structure: { url, method, headers, timeout_ms }
      webhookConfig = config;
    }

    const webhookUrl = webhookConfig.url || config.webhook_url;
    if (!webhookUrl) {
      return {
        success: false,
        error: 'Webhook URL not configured',
      };
    }

    // Prepare request headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Syllabi-Skills/2.0',
    };

    // Add custom headers if they exist
    if (webhookConfig.headers && typeof webhookConfig.headers === 'object') {
      Object.entries(webhookConfig.headers).forEach(([key, value]) => {
        if (typeof key === 'string' && typeof value === 'string') {
          headers[key] = value;
        }
      });
    }

    // Prepare request
    const method = webhookConfig.method || 'POST';
    const requestInit: RequestInit = {
      method: method.toUpperCase(),
      headers,
      signal: AbortSignal.timeout(webhookConfig.timeout_ms || 30000),
    };

    // Add body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(requestInit.method!)) {
      requestInit.body = JSON.stringify(parameters);
    } else if (method.toUpperCase() === 'GET' && Object.keys(parameters).length > 0) {
      // For GET requests, add parameters as query string
      const url = new URL(webhookUrl);
      Object.entries(parameters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
      return await makeHttpRequest(url.toString(), requestInit);
    }

    return await makeHttpRequest(webhookUrl, requestInit);

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: 'Unknown error occurred',
    };
  }
}

/**
 * Execute a built-in skill using the registry
 */
async function executeBuiltinSkill(
  skill: SkillWithAssociation, 
  parameters: Record<string, any>, 
  context: SkillExecutionContext
): Promise<SkillExecutionResult> {
  try {
    // Get the skill function from the registry
    const skillFunction = BUILTIN_SKILLS_REGISTRY[skill.name];
    if (!skillFunction) {
      return {
        success: false,
        error: `Built-in skill '${skill.name}' not found in registry`,
      };
    }

    // Auto-fetch integrationId for skills that require it (e.g., Slack, Discord)
    const updatedContext = await ensureIntegrationId(skill, context);

    // Execute the built-in skill with potentially updated context
    const result = await skillFunction(parameters, updatedContext);

    return {
      success: true,
      data: result,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Helper function to make HTTP request
 */
async function makeHttpRequest(url: string, requestInit: RequestInit): Promise<SkillExecutionResult> {
  try {
    const response = await fetch(url, requestInit);
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Try to parse response as JSON, fall back to text
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (jsonError) {
        responseData = await response.text();
      }
    } else {
      responseData = await response.text();
    }

    return {
      success: true,
      data: responseData,
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: 'Unknown error occurred',
    };
  }
}

/**
 * Main skill execution function
 */
export async function executeSkill(
  skill: SkillWithAssociation, 
  parameters: Record<string, any>, 
  context: SkillExecutionContext = { skillId: skill.id }
): Promise<SkillExecutionResult> {
  const startTime = Date.now();
  let result: SkillExecutionResult;
  let status: 'pending' | 'success' | 'error' | 'timeout' = 'pending';

  try {
    // Check if skill and association are active
    if (!skill.is_active || !skill.association.is_active) {
      result = {
        success: false,
        error: 'Skill is currently disabled',
      };
      status = 'error';
    } else {
      // Execute based on skill type
      switch (skill.type) {
        case 'custom':
          result = await executeCustomSkill(skill, parameters);
          break;
        case 'builtin':
          result = await executeBuiltinSkill(skill, parameters, context);
          break;
        default:
          result = {
            success: false,
            error: `Unknown skill type: ${skill.type}`,
          };
      }

      status = result.success ? 'success' : 'error';
    }

  } catch (error) {
    result = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    status = 'error';
  }

  const executionTime = Date.now() - startTime;

  // Log execution (unless in test mode)
  if (!context.testMode) {
    try {
      await createSkillExecution({
        skill_id: skill.id,
        chat_session_id: context.chatSessionId || null,
        user_id: context.userId || null,
        channel_type: context.channel || 'web',
        execution_status: status,
        input_parameters: parameters,
        output_result: result.data || null,
        error_message: result.error || null,
        execution_time_ms: executionTime,
      });
    } catch (loggingError) {
      // Don't fail the skill execution if logging fails
      console.warn('Failed to log skill execution (continuing execution):', loggingError instanceof Error ? loggingError.message : 'Unknown error');
    }
  }

  return result;
}

/**
 * Validate skill parameters against function schema
 */
export function validateSkillParameters(
  skill: SkillWithAssociation, 
  parameters: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const schema = skill.function_schema.parameters;
  
  if (!schema || !schema.properties) {
    return { valid: true, errors: [] };
  }

  // Check required parameters
  const required = schema.required || [];
  for (const requiredParam of required) {
    if (!(requiredParam in parameters) || parameters[requiredParam] === undefined || parameters[requiredParam] === null) {
      errors.push(`Missing required parameter: ${requiredParam}`);
    }
  }

  // Validate parameter types (basic validation)
  for (const [paramName, paramValue] of Object.entries(parameters)) {
    const paramSchema = schema.properties[paramName];
    if (!paramSchema) {
      continue; // Allow extra parameters
    }

    if (paramValue === null || paramValue === undefined) {
      continue; // Already handled in required check
    }

    // Basic type validation
    const expectedType = paramSchema.type;
    const actualType = typeof paramValue;

    if (expectedType === 'string' && actualType !== 'string') {
      errors.push(`Parameter ${paramName} must be a string`);
    } else if (expectedType === 'number' && actualType !== 'number') {
      errors.push(`Parameter ${paramName} must be a number`);
    } else if (expectedType === 'boolean' && actualType !== 'boolean') {
      errors.push(`Parameter ${paramName} must be a boolean`);
    } else if (expectedType === 'array' && !Array.isArray(paramValue)) {
      errors.push(`Parameter ${paramName} must be an array`);
    } else if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(paramValue))) {
      errors.push(`Parameter ${paramName} must be an object`);
    }

    // Format validation for strings
    if (expectedType === 'string' && paramSchema.format) {
      const stringValue = paramValue as string;
      switch (paramSchema.format) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(stringValue)) {
            errors.push(`Parameter ${paramName} must be a valid email address`);
          }
          break;
        case 'uri':
        case 'url':
          try {
            new URL(stringValue);
          } catch {
            errors.push(`Parameter ${paramName} must be a valid URL`);
          }
          break;
        case 'date':
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(stringValue)) {
            errors.push(`Parameter ${paramName} must be a valid date in YYYY-MM-DD format`);
          }
          break;
      }
    }

    // Enum validation
    if (paramSchema.enum && !paramSchema.enum.includes(paramValue)) {
      errors.push(`Parameter ${paramName} must be one of: ${paramSchema.enum.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get example parameters for a skill based on its schema
 */
export function getSkillExampleParameters(skill: SkillWithAssociation): Record<string, any> {
  const schema = skill.function_schema.parameters;
  const examples: Record<string, any> = {};

  if (!schema || !schema.properties) {
    return examples;
  }

  for (const [paramName, paramSchema] of Object.entries(schema.properties)) {
    const param = paramSchema as any;
    
    // Use example if provided
    if (param.example !== undefined) {
      examples[paramName] = param.example;
      continue;
    }

    // Generate example based on type
    switch (param.type) {
      case 'string':
        if (param.format === 'email') {
          examples[paramName] = 'user@example.com';
        } else if (param.format === 'uri' || param.format === 'url') {
          examples[paramName] = 'https://example.com';
        } else if (param.format === 'date') {
          examples[paramName] = '2024-01-15';
        } else if (param.enum && param.enum.length > 0) {
          examples[paramName] = param.enum[0];
        } else {
          examples[paramName] = param.description ? `Example ${paramName}` : 'example';
        }
        break;
      case 'number':
        examples[paramName] = param.minimum || 0;
        break;
      case 'integer':
        examples[paramName] = param.minimum || 1;
        break;
      case 'boolean':
        examples[paramName] = true;
        break;
      case 'array':
        examples[paramName] = [];
        break;
      case 'object':
        examples[paramName] = {};
        break;
      default:
        examples[paramName] = null;
    }
  }

  return examples;
}

/**
 * Register a new built-in skill function
 * This will be used when we implement actual built-in skills
 */
export function registerBuiltinSkill(
  name: string, 
  implementation: (params: any, context: SkillExecutionContext) => Promise<any>
): void {
  BUILTIN_SKILLS_REGISTRY[name] = implementation;
}

/**
 * Get all registered built-in skill names
 */
export function getRegisteredBuiltinSkills(): string[] {
  return Object.keys(BUILTIN_SKILLS_REGISTRY);
} 