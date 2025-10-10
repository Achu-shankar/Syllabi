/**
 * Token utilities for cost calculation and usage analytics
 */

// OpenAI pricing per 1M tokens (as of 2024)
// You should update these based on current pricing
const OPENAI_PRICING = {
  'gpt-4o': {
    prompt: 2.50,      // $2.50 per 1M prompt tokens
    completion: 10.00  // $10.00 per 1M completion tokens
  },
  'gpt-4o-mini': {
    prompt: 0.15,      // $0.15 per 1M prompt tokens  
    completion: 0.60   // $0.60 per 1M completion tokens
  },
  'gpt-4-turbo': {
    prompt: 10.00,
    completion: 30.00
  },
  'gpt-3.5-turbo': {
    prompt: 0.50,
    completion: 1.50
  }
} as const;

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface TokenCost {
  promptCost: number;
  completionCost: number;
  totalCost: number;
  currency: 'USD';
}

/**
 * Calculate the cost of token usage for a specific model
 */
export function calculateTokenCost(
  usage: TokenUsage, 
  model: string
): TokenCost {
  const pricing = OPENAI_PRICING[model as keyof typeof OPENAI_PRICING];
  
  if (!pricing) {
    console.warn(`No pricing found for model: ${model}, using gpt-4o-mini pricing`);
    const fallbackPricing = OPENAI_PRICING['gpt-4o-mini'];
    return {
      promptCost: (usage.promptTokens / 1_000_000) * fallbackPricing.prompt,
      completionCost: (usage.completionTokens / 1_000_000) * fallbackPricing.completion,
      totalCost: ((usage.promptTokens / 1_000_000) * fallbackPricing.prompt) + 
                 ((usage.completionTokens / 1_000_000) * fallbackPricing.completion),
      currency: 'USD'
    };
  }

  const promptCost = (usage.promptTokens / 1_000_000) * pricing.prompt;
  const completionCost = (usage.completionTokens / 1_000_000) * pricing.completion;

  return {
    promptCost,
    completionCost,
    totalCost: promptCost + completionCost,
    currency: 'USD'
  };
}

/**
 * Extract token usage from message metadata
 */
export function extractTokenUsageFromMetadata(metadata: any): TokenUsage | null {
  if (!metadata?.tokenUsage) {
    return null;
  }

  return {
    promptTokens: metadata.tokenUsage.promptTokens || 0,
    completionTokens: metadata.tokenUsage.completionTokens || 0,
    totalTokens: metadata.tokenUsage.totalTokens || 0
  };
}

/**
 * Calculate total usage and cost for multiple messages
 */
export function calculateTotalUsageAndCost(
  messages: Array<{ metadata?: any; token_count: number }>,
  defaultModel: string = 'gpt-4o-mini'
): {
  totalUsage: TokenUsage;
  totalCost: TokenCost;
  breakdown: Array<{ messageIndex: number; usage: TokenUsage; cost: TokenCost; model: string }>;
} {
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;
  let totalPromptCost = 0;
  let totalCompletionCost = 0;

  const breakdown = messages.map((message, index) => {
    const usage = extractTokenUsageFromMetadata(message.metadata) || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: message.token_count || 0
    };

    const model = message.metadata?.model?.model || defaultModel;
    const cost = calculateTokenCost(usage, model);

    totalPromptTokens += usage.promptTokens;
    totalCompletionTokens += usage.completionTokens;
    totalTokens += usage.totalTokens;
    totalPromptCost += cost.promptCost;
    totalCompletionCost += cost.completionCost;

    return {
      messageIndex: index,
      usage,
      cost,
      model
    };
  });

  return {
    totalUsage: {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens: totalTokens
    },
    totalCost: {
      promptCost: totalPromptCost,
      completionCost: totalCompletionCost,
      totalCost: totalPromptCost + totalCompletionCost,
      currency: 'USD'
    },
    breakdown
  };
} 