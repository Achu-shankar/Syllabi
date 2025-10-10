import { tool } from 'ai';
import { z } from 'zod';
import { 
  getActiveSkillsForChatbot, 
  searchChatbotSkills,
  type SkillWithAssociation 
} from '@/app/dashboard/libs/skills_db_queries_v2';
import { executeSkill, type SkillExecutionContext } from '../skills/skill-executor-v2';

// Tool selection methods
export type ToolSelectionMethod = 'direct' | 'semantic_retrieval';

// Configuration for tool selection
export interface ToolSelectionConfig {
  method: ToolSelectionMethod;
  maxTools?: number; // For direct method: limit total tools, for semantic: limit search results
  semanticQuery?: string; // For semantic method: the query to search for relevant tools
}

/**
 * Get tools for a chatbot based on the selection method
 */
export async function getSkillsAsTools(
  chatbotId: string,
  context: SkillExecutionContext,
  selectionConfig: ToolSelectionConfig
): Promise<Record<string, any>> {
  try {
    let skills: SkillWithAssociation[] = [];

    switch (selectionConfig.method) {
      case 'direct':
        skills = await getDirectSkills(chatbotId, selectionConfig.maxTools);
        break;
      case 'semantic_retrieval':
        skills = await getSemanticSkills(chatbotId, context.userId!, selectionConfig);
        break;
      default:
        console.error(`Unknown tool selection method: ${selectionConfig.method}`);
        return {};
    }

    if (skills.length === 0) {
      return {}; // No tools if no skills found
    }

    const tools: Record<string, any> = {};
    
    // Convert each skill to AI SDK tool format
    for (const skill of skills) {
      try {
        const parameters = convertJsonSchemaToZod(skill.function_schema?.parameters);
        
        tools[skill.name] = tool({
          description: skill.description,
          parameters,
          execute: async (params) => {
            // AI SDK will call this automatically when tool is invoked
            const result = await executeSkill(skill, params, {
              ...context,
              skillId: skill.id,
              testMode: false, // Real execution in chat
            });
            
            // Return result in format expected by AI
            if (result.success) {
              return {
                success: true,
                message: `Successfully executed ${skill.display_name}`,
                data: result.data
              };
            } else {
              return {
                success: false,
                error: result.error || 'Skill execution failed'
              };
            }
          }
        });
      } catch (skillError) {
        console.error(`Failed to create tool for skill ${skill.name}:`, skillError);
        // Skip this skill and continue with others
        continue;
      }
    }
    
    console.log(`[ToolsBuilder] Created ${Object.keys(tools).length} tools for chatbot ${chatbotId} using ${selectionConfig.method} method`);
    return tools;
    
  } catch (error) {
    console.error('[ToolsBuilder] Failed to build tools:', error);
    return {}; // Return empty tools on error to avoid breaking chat
  }
}

/**
 * Get skills using direct method (all active skills, optionally limited)
 */
async function getDirectSkills(
  chatbotId: string, 
  maxTools?: number
): Promise<SkillWithAssociation[]> {
  const skills = await getActiveSkillsForChatbot(chatbotId);
  
  if (maxTools && skills.length > maxTools) {
    // If we need to limit, prioritize by execution count and recent usage
    const sortedSkills = skills.sort((a, b) => {
      // First sort by execution count (descending)
      if (a.execution_count !== b.execution_count) {
        return b.execution_count - a.execution_count;
      }
      // Then by last executed (most recent first)
      if (a.last_executed_at && b.last_executed_at) {
        return new Date(b.last_executed_at).getTime() - new Date(a.last_executed_at).getTime();
      }
      // Finally by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return sortedSkills.slice(0, maxTools);
  }
  
  return skills;
}

/**
 * Get skills using semantic retrieval method
 */
async function getSemanticSkills(
  chatbotId: string,
  userId: string,
  config: ToolSelectionConfig
): Promise<SkillWithAssociation[]> {
  if (!config.semanticQuery) {
    console.warn('[ToolsBuilder] Semantic query not provided, falling back to direct method');
    return getDirectSkills(chatbotId, config.maxTools);
  }

  try {
    // Use the new chatbot-specific search function
    const relevantSkills = await searchChatbotSkills(
      config.semanticQuery, 
      chatbotId, 
      config.maxTools || 5
    );

    // Return only the semantically relevant skills found by vector search
    console.log(`[ToolsBuilder] Vector search found ${relevantSkills.length} semantically relevant skills`);
    return relevantSkills;

  } catch (error) {
    console.error('[ToolsBuilder] Semantic search failed, falling back to direct method:', error);
    return getDirectSkills(chatbotId, config.maxTools);
  }
}

/**
 * Determine the appropriate tool selection method based on chatbot configuration and skill count
 */
export async function getOptimalToolSelectionConfig(
  chatbotId: string,
  toolSelectionMethod?: ToolSelectionMethod,
  userQuery?: string
): Promise<ToolSelectionConfig> {
  // If method is explicitly set, use it
  if (toolSelectionMethod) {
    return {
      method: toolSelectionMethod,
      maxTools: toolSelectionMethod === 'direct' ? 100 : 10,
      semanticQuery: userQuery,
    };
  }

  // Auto-determine based on skill count
  const skills = await getActiveSkillsForChatbot(chatbotId);
  const skillCount = skills.length;

  if (skillCount <= 5) {
    // Few skills: use direct method
    return {
      method: 'direct',
      maxTools: skillCount,
    };
  } else if (skillCount <= 15) {
    // Medium number of skills: use direct with limit
    return {
      method: 'direct',
      maxTools: 10,
    };
  } else {
    // Many skills: use semantic retrieval if we have a query
    if (userQuery && userQuery.trim().length > 0) {
      return {
        method: 'semantic_retrieval',
        maxTools: 10,
        semanticQuery: userQuery,
      };
    } else {
      // No query available, use direct with limit
      return {
        method: 'direct',
        maxTools: 10,
      };
    }
  }
}

/**
 * Convert JSON Schema to Zod schema for AI SDK
 */
export function convertJsonSchemaToZod(jsonSchema: any): z.ZodObject<any> {
  if (!jsonSchema || !jsonSchema.properties) {
    return z.object({}); // Empty schema if no properties
  }

  const zodFields: Record<string, z.ZodType> = {};
  const required = jsonSchema.required || [];

  // Convert each property to Zod type
  Object.entries(jsonSchema.properties).forEach(([key, prop]: [string, any]) => {
    let zodType = convertPropertyToZod(prop);
    
    // Make optional if not in required array
    if (!required.includes(key)) {
      zodType = zodType.optional();
    }
    
    zodFields[key] = zodType;
  });

  return z.object(zodFields);
}

/**
 * Convert individual JSON Schema property to Zod type
 */
function convertPropertyToZod(property: any): z.ZodType {
  const { type, description, format, enum: enumValues, minimum, maximum } = property;

  switch (type) {
    case 'string':
      let stringSchema = z.string();
      
      if (description) {
        stringSchema = stringSchema.describe(description);
      }
      
      // Handle string formats
      if (format === 'email') {
        stringSchema = stringSchema.email();
      } else if (format === 'url' || format === 'uri') {
        stringSchema = stringSchema.url();
      } else if (format === 'date') {
        stringSchema = stringSchema.regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date in YYYY-MM-DD format');
      } else if (format === 'date-time') {
        stringSchema = stringSchema.datetime();
      }

      if (enumValues) {
        // Zod enums require at least one value
        if (enumValues.length > 0) {
          return z.enum(enumValues as [string, ...string[]]).describe(description);
        }
        return z.string().describe(description); // Fallback for empty enum
      }

      return stringSchema;

    case 'number':
    case 'integer':
      let numberSchema = z.number();
      if (description) {
        numberSchema = numberSchema.describe(description);
      }
      if (minimum !== undefined) {
        numberSchema = numberSchema.min(minimum);
      }
      if (maximum !== undefined) {
        numberSchema = numberSchema.max(maximum);
      }
      return numberSchema;

    case 'boolean':
      return z.boolean().describe(description);

    case 'array':
      if (property.items) {
        const itemSchema = convertPropertyToZod(property.items);
        return z.array(itemSchema).describe(description);
      }
      return z.array(z.any()).describe(description);

    case 'object':
      if (property.properties) {
        return convertJsonSchemaToZod(property).describe(description);
      }
      return z.object({}).describe(description);

    default:
      return z.any().describe(description);
  }
}

/**
 * Validate that a skill's function schema is compatible with AI SDK
 */
export function validateSkillForAI(skill: SkillWithAssociation): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!skill.name) {
    errors.push('Skill name is required');
  }

  if (!skill.description) {
    errors.push('Skill description is required');
  }

  if (!skill.function_schema) {
    errors.push('Function schema is required');
  }

  // Validate function schema structure
  if (skill.function_schema) {
    const schema = skill.function_schema;
    
    if (!schema.name) {
      errors.push('Function schema must have a name');
    }
    
    if (!schema.description) {
      errors.push('Function schema must have a description');
    }
    
    // Validate parameters if present
    if (schema.parameters) {
      const params = schema.parameters;
      
      if (params.type !== 'object') {
        errors.push('Function parameters must be of type "object"');
      }
      
      if (params.properties && typeof params.properties !== 'object') {
        errors.push('Function parameters properties must be an object');
      }
    }
  }

  // Validate skill and association are active
  if (!skill.is_active) {
    errors.push('Skill must be active to be used as a tool');
  }

  if (!skill.association.is_active) {
    errors.push('Skill association must be active to be used as a tool');
  }

  return {
    valid: errors.length === 0,
    errors
  };
} 