import { useQuery } from '@tanstack/react-query';

export type TimeRange = '24h' | '7d' | '30d' | 'all';

export interface AnalyticsData {
  totalConversations: number;
  totalMessages: number;
  activeUsers: number;
  anonymousSessions: number;
  averageMessagesPerConversation: number;
  conversationCompletionRate: number;
  contentSources: {
    total: number;
    processed: number;
    processing: number;
    failed: number;
  };
  dailyStats: Array<{
    date: string;
    conversations: number;
    messages: number;
  }>;
  userTypes: {
    registered: number;
    anonymous: number;
  };
  technicalMetrics: {
    averageResponseTime: number; // in seconds
    errorRate: number; // percentage
    totalResponses: number;
    failedResponses: number;
  };
  contentUtilization: {
    totalChunks: number;
    utilizedChunks: number;
    utilizationRate: number; // percentage
    topSources: Array<{
      title: string;
      usage_count: number;
    }>;
  };
}

// Fetch basic analytics data
export const useChatbotAnalytics = (chatbotId: string, timeRange: TimeRange) => {
  return useQuery({
    queryKey: ['chatbot-analytics', chatbotId, timeRange],
    queryFn: async (): Promise<AnalyticsData> => {
      const response = await fetch(
        `/api/dashboard/chatbots/${chatbotId}/analytics?timeRange=${timeRange}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }
      
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds - shorter cache for more responsive time range switching
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in memory longer for quick switches
  });
};

// Fetch content sources analytics
export const useChatbotContentAnalytics = (chatbotId: string) => {
  return useQuery({
    queryKey: ['chatbot-content-analytics', chatbotId],
    queryFn: async () => {
      const response = await fetch(
        `/api/dashboard/chatbots/${chatbotId}/analytics/content`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch content analytics');
      }
      
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute - content sources change less frequently
  });
};

// Fetch recent activity
export const useChatbotRecentActivity = (chatbotId: string, limit: number = 10) => {
  return useQuery({
    queryKey: ['chatbot-recent-activity', chatbotId, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/dashboard/chatbots/${chatbotId}/analytics/activity?limit=${limit}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch recent activity');
      }
      
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds - recent activity should be fresh
  });
}; 