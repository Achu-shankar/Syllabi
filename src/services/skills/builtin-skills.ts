export interface BuiltinSkillTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  function_schema: Record<string, any>;
  default_configuration: Record<string, any>;
  execute: (parameters: Record<string, any>, settings: Record<string, any>) => Promise<any>;
}

/**
 * Calculate mathematical expressions
 */
const calculatorSkill: BuiltinSkillTemplate = {
  id: 'calculator',
  name: 'Calculator',
  description: 'Perform basic mathematical calculations',
  category: 'utility',
  function_schema: {
    name: 'calculate',
    description: 'Perform a mathematical calculation',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate (e.g., "2 + 3 * 4")',
          example: '2 + 3 * 4',
        },
      },
      required: ['expression'],
    },
  },
  default_configuration: {
    template_id: 'calculator',
    settings: {
      precision: 2,
    },
  },
  async execute(parameters, settings) {
    const { expression } = parameters;
    const { precision = 2 } = settings;

    try {
      // Basic expression validation (only allow safe mathematical operations)
      const safeExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
      if (safeExpression !== expression) {
        throw new Error('Invalid characters in expression');
      }

      // Evaluate the expression
      const result = Function(`"use strict"; return (${safeExpression})`)();
      
      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Invalid mathematical expression');
      }

      return {
        expression,
        result: Number(result.toFixed(precision)),
        formatted_result: `${expression} = ${result.toFixed(precision)}`,
      };
    } catch (error) {
      throw new Error(`Calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

/**
 * Generate random numbers
 */
const randomNumberSkill: BuiltinSkillTemplate = {
  id: 'random_number',
  name: 'Random Number Generator',
  description: 'Generate random numbers within a specified range',
  category: 'utility',
  function_schema: {
    name: 'generate_random_number',
    description: 'Generate a random number within the specified range',
    parameters: {
      type: 'object',
      properties: {
        min: {
          type: 'number',
          description: 'Minimum value (inclusive)',
          example: 1,
        },
        max: {
          type: 'number',
          description: 'Maximum value (inclusive)',
          example: 100,
        },
        count: {
          type: 'integer',
          description: 'Number of random numbers to generate',
          minimum: 1,
          maximum: 10,
          example: 1,
        },
      },
      required: ['min', 'max'],
    },
  },
  default_configuration: {
    template_id: 'random_number',
    settings: {},
  },
  async execute(parameters) {
    const { min, max, count = 1 } = parameters;

    if (min >= max) {
      throw new Error('Minimum value must be less than maximum value');
    }

    const numbers = [];
    for (let i = 0; i < count; i++) {
      const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
      numbers.push(randomNumber);
    }

    return {
      numbers,
      min,
      max,
      count,
      summary: count === 1 
        ? `Generated random number: ${numbers[0]}`
        : `Generated ${count} random numbers: ${numbers.join(', ')}`,
    };
  },
};

/**
 * Get current date and time
 */
const dateTimeSkill: BuiltinSkillTemplate = {
  id: 'current_datetime',
  name: 'Current Date & Time',
  description: 'Get the current date and time in various formats',
  category: 'utility',
  function_schema: {
    name: 'get_current_datetime',
    description: 'Get the current date and time',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone (e.g., "America/New_York", "UTC")',
          example: 'UTC',
        },
        format: {
          type: 'string',
          enum: ['iso', 'human', 'date_only', 'time_only'],
          description: 'Output format',
          example: 'iso',
        },
      },
      required: [],
    },
  },
  default_configuration: {
    template_id: 'current_datetime',
    settings: {
      default_timezone: 'UTC',
    },
  },
  async execute(parameters, settings) {
    const { timezone = settings.default_timezone || 'UTC', format = 'iso' } = parameters;

    try {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
      };

      let result: string;
      switch (format) {
        case 'iso':
          result = now.toISOString();
          break;
        case 'human':
          result = now.toLocaleDateString('en-US', {
            ...options,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          break;
        case 'date_only':
          result = now.toLocaleDateString('en-US', {
            ...options,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          break;
        case 'time_only':
          result = now.toLocaleTimeString('en-US', {
            ...options,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          break;
        default:
          result = now.toISOString();
      }

      return {
        datetime: result,
        timezone,
        format,
        timestamp: now.getTime(),
      };
    } catch (error) {
      throw new Error(`Failed to get current datetime: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

/**
 * Text manipulation utilities
 */
const textUtilsSkill: BuiltinSkillTemplate = {
  id: 'text_utils',
  name: 'Text Utilities',
  description: 'Various text manipulation functions',
  category: 'utility',
  function_schema: {
    name: 'manipulate_text',
    description: 'Perform text manipulation operations',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to manipulate',
          example: 'Hello World',
        },
        operation: {
          type: 'string',
          enum: ['uppercase', 'lowercase', 'title_case', 'reverse', 'word_count', 'char_count'],
          description: 'Text manipulation operation to perform',
          example: 'uppercase',
        },
      },
      required: ['text', 'operation'],
    },
  },
  default_configuration: {
    template_id: 'text_utils',
    settings: {},
  },
  async execute(parameters) {
    const { text, operation } = parameters;

    let result: string | number;
    let description: string;

    switch (operation) {
      case 'uppercase':
        result = text.toUpperCase();
        description = 'Converted to uppercase';
        break;
      case 'lowercase':
        result = text.toLowerCase();
        description = 'Converted to lowercase';
        break;
      case 'title_case':
        result = text.replace(/\w\S*/g, (txt: string) => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
        description = 'Converted to title case';
        break;
      case 'reverse':
        result = text.split('').reverse().join('');
        description = 'Reversed the text';
        break;
      case 'word_count':
        result = text.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
        description = 'Counted words';
        break;
      case 'char_count':
        result = text.length;
        description = 'Counted characters';
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return {
      original_text: text,
      operation,
      result,
      description,
    };
  },
};

/**
 * URL/Link utilities
 */
const urlUtilsSkill: BuiltinSkillTemplate = {
  id: 'url_utils',
  name: 'URL Utilities',
  description: 'Parse and manipulate URLs',
  category: 'utility',
  function_schema: {
    name: 'parse_url',
    description: 'Parse a URL and extract its components',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          description: 'The URL to parse',
          example: 'https://example.com/path?param=value#section',
        },
      },
      required: ['url'],
    },
  },
  default_configuration: {
    template_id: 'url_utils',
    settings: {},
  },
  async execute(parameters) {
    const { url } = parameters;

    try {
      const parsedUrl = new URL(url);
      
      return {
        original_url: url,
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80'),
        pathname: parsedUrl.pathname,
        search: parsedUrl.search,
        hash: parsedUrl.hash,
        origin: parsedUrl.origin,
        is_secure: parsedUrl.protocol === 'https:',
        domain_parts: parsedUrl.hostname.split('.'),
      };
    } catch (error) {
      throw new Error(`Invalid URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

/**
 * Registry of all builtin skills
 */
export const builtinSkills: Record<string, BuiltinSkillTemplate> = {
  calculator: calculatorSkill,
  random_number: randomNumberSkill,
  current_datetime: dateTimeSkill,
  text_utils: textUtilsSkill,
  url_utils: urlUtilsSkill,
};

/**
 * Get all available builtin skill templates
 */
export function getBuiltinSkillTemplates(): BuiltinSkillTemplate[] {
  return Object.values(builtinSkills);
}

/**
 * Get builtin skill template by ID
 */
export function getBuiltinSkillTemplate(templateId: string): BuiltinSkillTemplate | null {
  return builtinSkills[templateId] || null;
}

/**
 * Get builtin skills by category
 */
export function getBuiltinSkillsByCategory(category: string): BuiltinSkillTemplate[] {
  return Object.values(builtinSkills).filter(skill => skill.category === category);
}

/**
 * Get all available categories
 */
export function getBuiltinSkillCategories(): string[] {
  const categories = new Set(Object.values(builtinSkills).map(skill => skill.category));
  return Array.from(categories).sort();
} 