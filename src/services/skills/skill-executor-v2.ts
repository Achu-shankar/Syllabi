import { 
  createSkillExecution,
  type SkillWithAssociation 
} from '@/app/dashboard/libs/skills_db_queries_v2';

export interface SkillExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface SkillExecutionContext {
  skillId: string;
  chatSessionId?: string;
  userId?: string;
  integrationId?: string; // For built-in skills that need integration auth
  channel?: 'web' | 'embed' | 'slack' | 'discord' | 'api' | 'alexa';
  testMode?: boolean;
}

/**
 * Built-in skills registry
 * This will be populated with actual implementations in the future
 */
const BUILTIN_SKILLS_REGISTRY: Record<string, (params: any, context: SkillExecutionContext) => Promise<any>> = {
  // Slack built-in skills (placeholders)
  slack_send_message: async (params, context) => {
    // TODO: Implement Slack message sending
    console.log('TODO: Implement slack_send_message', { params, context });
    throw new Error('Built-in skills not yet implemented');
  },
  
  slack_get_members: async (params, context) => {
    // TODO: Implement Slack members retrieval
    console.log('TODO: Implement slack_get_members', { params, context });
    throw new Error('Built-in skills not yet implemented');
  },
  
  slack_get_messages: async (params, context) => {
    // TODO: Implement Slack messages retrieval
    console.log('TODO: Implement slack_get_messages', { params, context });
    throw new Error('Built-in skills not yet implemented');
  },
  
  // Google Drive built-in skills (placeholders)
  gdrive_list_files: async (params, context) => {
    // TODO: Implement Google Drive file listing
    console.log('TODO: Implement gdrive_list_files', { params, context });
    throw new Error('Built-in skills not yet implemented');
  },
  
  gdrive_upload_file: async (params, context) => {
    // TODO: Implement Google Drive file upload
    console.log('TODO: Implement gdrive_upload_file', { params, context });
    throw new Error('Built-in skills not yet implemented');
  },
  
  // Add more built-in skills as needed
};

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
    // Find the skill function in the registry
    const skillFunction = BUILTIN_SKILLS_REGISTRY[skill.name];
    
    if (!skillFunction) {
      return {
        success: false,
        error: `Built-in skill '${skill.name}' not found in registry`,
      };
    }

    // Execute the built-in skill
    const result = await skillFunction(parameters, context);

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