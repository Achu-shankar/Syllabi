import { createServiceClient } from '@/utils/supabase/service';

/**
 * Rate limit configuration structure stored in chatbots.rate_limit_config
 */
export interface RateLimitConfig {
  enabled: boolean;
  authenticated_users: {
    messages_per_hour: number;
    messages_per_day: number;
  };
  anonymous_visitors: {
    messages_per_hour: number;
    messages_per_day: number;
  };
  custom_message?: string;
}

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining_hour?: number;
  remaining_day?: number;
  limit_type?: 'hour' | 'day';
  custom_message?: string;
}

/**
 * Usage record from database
 */
interface UsageRecord {
  message_count: number;
}

/**
 * Check rate limit and increment counter if allowed
 *
 * @param chatbotId - The chatbot ID
 * @param identifier - Either user_id or session_id
 * @param identifierType - Type of identifier: 'user' or 'session'
 * @returns RateLimitResult indicating if request is allowed
 */
export async function checkAndIncrementRateLimit(
  chatbotId: string,
  identifier: string,
  identifierType: 'user' | 'session'
): Promise<RateLimitResult> {
  const supabase = createServiceClient();

  try {
    // 1. Fetch chatbot's rate limit config
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('rate_limit_config')
      .eq('id', chatbotId)
      .single();

    if (chatbotError) {
      console.error('[RateLimiter] Error fetching chatbot config:', chatbotError);
      // Fail open - allow request if we can't fetch config
      return { allowed: true };
    }

    const config: RateLimitConfig | null = chatbot?.rate_limit_config as RateLimitConfig | null;

    // If rate limiting is disabled or config is null, allow immediately
    if (!config || !config.enabled) {
      return { allowed: true };
    }

    // 2. Determine limits based on identifier type
    const limits = identifierType === 'user'
      ? config.authenticated_users
      : config.anonymous_visitors;

    if (!limits) {
      console.warn('[RateLimiter] No limits configured for identifier type:', identifierType);
      return { allowed: true };
    }

    // 3. Calculate window start times
    const now = new Date();
    const hourStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      0, 0, 0
    );
    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0, 0, 0, 0
    );

    // 4. Check hourly limit
    const hourlyUsage = await getOrCreateUsage(
      supabase,
      chatbotId,
      identifier,
      identifierType,
      'hour',
      hourStart
    );

    if (hourlyUsage.message_count >= limits.messages_per_hour) {
      console.log(`[RateLimiter] Hourly limit exceeded for ${identifierType} ${identifier}: ${hourlyUsage.message_count}/${limits.messages_per_hour}`);
      return {
        allowed: false,
        limit_type: 'hour',
        remaining_hour: 0,
        remaining_day: Math.max(0, limits.messages_per_day - (await getOrCreateUsage(supabase, chatbotId, identifier, identifierType, 'day', dayStart)).message_count),
        custom_message: config.custom_message
      };
    }

    // 5. Check daily limit
    const dailyUsage = await getOrCreateUsage(
      supabase,
      chatbotId,
      identifier,
      identifierType,
      'day',
      dayStart
    );

    if (dailyUsage.message_count >= limits.messages_per_day) {
      console.log(`[RateLimiter] Daily limit exceeded for ${identifierType} ${identifier}: ${dailyUsage.message_count}/${limits.messages_per_day}`);
      return {
        allowed: false,
        limit_type: 'day',
        remaining_hour: Math.max(0, limits.messages_per_hour - hourlyUsage.message_count),
        remaining_day: 0,
        custom_message: config.custom_message
      };
    }

    // 6. Increment both counters
    await incrementUsage(supabase, chatbotId, identifier, identifierType, 'hour', hourStart);
    await incrementUsage(supabase, chatbotId, identifier, identifierType, 'day', dayStart);

    // 7. Return success with remaining quota
    return {
      allowed: true,
      remaining_hour: limits.messages_per_hour - hourlyUsage.message_count - 1,
      remaining_day: limits.messages_per_day - dailyUsage.message_count - 1
    };

  } catch (error) {
    console.error('[RateLimiter] Unexpected error:', error);
    // Fail open - allow request on unexpected errors
    return { allowed: true };
  }
}

/**
 * Get existing usage record or create a new one with 0 count
 */
async function getOrCreateUsage(
  supabase: any,
  chatbotId: string,
  identifier: string,
  identifierType: 'user' | 'session',
  windowType: 'hour' | 'day',
  windowStart: Date
): Promise<UsageRecord> {
  const { data, error } = await supabase
    .from('rate_limit_tracking')
    .select('message_count')
    .eq('chatbot_id', chatbotId)
    .eq('identifier', identifier)
    .eq('identifier_type', identifierType)
    .eq('window_type', windowType)
    .eq('window_start', windowStart.toISOString())
    .maybeSingle();

  if (error) {
    console.error('[RateLimiter] Error fetching usage:', error);
    return { message_count: 0 };
  }

  if (data) {
    return { message_count: data.message_count };
  }

  // Record doesn't exist yet, will be created on first increment
  return { message_count: 0 };
}

/**
 * Increment usage counter atomically using database function
 */
async function incrementUsage(
  supabase: any,
  chatbotId: string,
  identifier: string,
  identifierType: 'user' | 'session',
  windowType: 'hour' | 'day',
  windowStart: Date
): Promise<void> {
  const { error } = await supabase.rpc('increment_rate_limit_counter', {
    p_chatbot_id: chatbotId,
    p_identifier: identifier,
    p_identifier_type: identifierType,
    p_window_type: windowType,
    p_window_start: windowStart.toISOString()
  });

  if (error) {
    console.error('[RateLimiter] Error incrementing usage:', error);
    throw error;
  }
}

/**
 * Get remaining quota for a user/session (for display purposes)
 */
export async function getRemainingQuota(
  chatbotId: string,
  identifier: string,
  identifierType: 'user' | 'session'
): Promise<{ remaining_hour: number; remaining_day: number } | null> {
  const supabase = createServiceClient();

  try {
    // Fetch config
    const { data: chatbot } = await supabase
      .from('chatbots')
      .select('rate_limit_config')
      .eq('id', chatbotId)
      .single();

    const config: RateLimitConfig | null = chatbot?.rate_limit_config as RateLimitConfig | null;

    if (!config || !config.enabled) {
      return null; // No limits
    }

    const limits = identifierType === 'user'
      ? config.authenticated_users
      : config.anonymous_visitors;

    // Calculate windows
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Get current usage
    const hourlyUsage = await getOrCreateUsage(supabase, chatbotId, identifier, identifierType, 'hour', hourStart);
    const dailyUsage = await getOrCreateUsage(supabase, chatbotId, identifier, identifierType, 'day', dayStart);

    return {
      remaining_hour: Math.max(0, limits.messages_per_hour - hourlyUsage.message_count),
      remaining_day: Math.max(0, limits.messages_per_day - dailyUsage.message_count)
    };

  } catch (error) {
    console.error('[RateLimiter] Error getting remaining quota:', error);
    return null;
  }
}
