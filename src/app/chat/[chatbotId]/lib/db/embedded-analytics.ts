import "server-only";
import { createClient } from '@/utils/supabase/server';

export interface EmbeddedAnalytics {
  totalSessions: number;
  totalMessages: number;
  uniqueReferrers: number;
  topReferrers: Array<{ referrer: string; sessions: number }>;
  sessionsOverTime: Array<{ date: string; embedded: number; full: number }>;
  averageMessagesPerSession: {
    embedded: number;
    full: number;
  };
}

/**
 * Get comprehensive analytics for embedded vs full chatbot usage
 */
export async function getEmbeddedAnalytics(
  chatbotId: string,
  startDate?: Date,
  endDate?: Date
): Promise<EmbeddedAnalytics> {
  const supabase = await createClient();
  
  // Set default date range (last 30 days)
  const defaultEndDate = endDate || new Date();
  const defaultStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    // Get total sessions by source
    const { data: sessionCounts } = await supabase
      .from('chat_sessions')
      .select('source')
      .eq('chatbot_id', chatbotId)
      .gte('created_at', defaultStartDate.toISOString())
      .lte('created_at', defaultEndDate.toISOString());

    const embeddedSessions = sessionCounts?.filter(s => s.source === 'embedded').length || 0;
    const fullSessions = sessionCounts?.filter(s => s.source === 'full').length || 0;

    // Get message counts by session type
    const { data: messageCounts } = await supabase
      .from('messages')
      .select(`
        id,
        chat_sessions!inner (
          source,
          chatbot_id
        )
      `)
      .eq('chat_sessions.chatbot_id', chatbotId)
      .gte('created_at', defaultStartDate.toISOString())
      .lte('created_at', defaultEndDate.toISOString());

    const embeddedMessages = messageCounts?.filter(m => 
      (m.chat_sessions as any).source === 'embedded'
    ).length || 0;
    
    const fullMessages = messageCounts?.filter(m => 
      (m.chat_sessions as any).source === 'full'
    ).length || 0;

    // Get unique referrers for embedded sessions
    const { data: referrerData } = await supabase
      .from('chat_sessions')
      .select('referrer')
      .eq('chatbot_id', chatbotId)
      .eq('source', 'embedded')
      .not('referrer', 'is', null)
      .gte('created_at', defaultStartDate.toISOString())
      .lte('created_at', defaultEndDate.toISOString());

    const uniqueReferrers = new Set(referrerData?.map(r => r.referrer)).size;

    // Get top referrers
    const referrerCounts = referrerData?.reduce((acc, { referrer }) => {
      if (referrer) {
        acc[referrer] = (acc[referrer] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    const topReferrers = Object.entries(referrerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([referrer, sessions]) => ({ referrer, sessions }));

    // Get sessions over time (daily breakdown)
    const { data: dailySessions } = await supabase
      .from('chat_sessions')
      .select('created_at, source')
      .eq('chatbot_id', chatbotId)
      .gte('created_at', defaultStartDate.toISOString())
      .lte('created_at', defaultEndDate.toISOString())
      .order('created_at');

    const sessionsByDay = dailySessions?.reduce((acc, session) => {
      const date = new Date(session.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { embedded: 0, full: 0 };
      }
      acc[date][session.source as 'embedded' | 'full']++;
      return acc;
    }, {} as Record<string, { embedded: number; full: number }>) || {};

    const sessionsOverTime = Object.entries(sessionsByDay)
      .map(([date, counts]) => ({
        date,
        embedded: counts.embedded,
        full: counts.full
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate average messages per session
    const averageMessagesPerSession = {
      embedded: embeddedSessions > 0 ? embeddedMessages / embeddedSessions : 0,
      full: fullSessions > 0 ? fullMessages / fullSessions : 0
    };

    return {
      totalSessions: embeddedSessions + fullSessions,
      totalMessages: embeddedMessages + fullMessages,
      uniqueReferrers,
      topReferrers,
      sessionsOverTime,
      averageMessagesPerSession
    };

  } catch (error) {
    console.error('Error fetching embedded analytics:', error);
    throw new Error('Failed to fetch embedded analytics');
  }
}

/**
 * Get simple embedded usage stats for dashboard
 */
export async function getEmbeddedUsageStats(chatbotId: string, days: number = 30) {
  const supabase = await createClient();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('source, created_at')
      .eq('chatbot_id', chatbotId)
      .gte('created_at', startDate.toISOString());

    const embeddedCount = sessions?.filter(s => s.source === 'embedded').length || 0;
    const fullCount = sessions?.filter(s => s.source === 'full').length || 0;
    const total = embeddedCount + fullCount;

    return {
      embedded: embeddedCount,
      full: fullCount,
      total,
      embeddedPercentage: total > 0 ? Math.round((embeddedCount / total) * 100) : 0
    };
  } catch (error) {
    console.error('Error fetching embedded usage stats:', error);
    return {
      embedded: 0,
      full: 0,
      total: 0,
      embeddedPercentage: 0
    };
  }
}

/**
 * Get top embedded domains for a chatbot
 */
export async function getTopEmbeddedDomains(chatbotId: string, limit: number = 10) {
  const supabase = await createClient();

  try {
    const { data } = await supabase
      .from('chat_sessions')
      .select('referrer')
      .eq('chatbot_id', chatbotId)
      .eq('source', 'embedded')
      .not('referrer', 'is', null);

    const domainCounts = data?.reduce((acc, { referrer }) => {
      if (referrer) {
        try {
          const domain = new URL(referrer).hostname;
          acc[domain] = (acc[domain] || 0) + 1;
        } catch {
          // Invalid URL, use as-is
          acc[referrer] = (acc[referrer] || 0) + 1;
        }
      }
      return acc;
    }, {} as Record<string, number>) || {};

    return Object.entries(domainCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([domain, count]) => ({ domain, count }));

  } catch (error) {
    console.error('Error fetching top embedded domains:', error);
    return [];
  }
} 