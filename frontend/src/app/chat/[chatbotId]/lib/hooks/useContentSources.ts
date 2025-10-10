import { useQuery } from '@tanstack/react-query';
import { ContentSource } from '../db/content_queries';

interface ContentSourcesResponse {
  success: boolean;
  data: ContentSource[];
  count: number;
}

/**
 * Fetch content sources for a chatbot
 */
async function fetchContentSources(chatbotSlug: string): Promise<ContentSource[]> {
  const response = await fetch(`/api/content-sources/${chatbotSlug}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch content sources: ${response.statusText}`);
  }
  
  const result: ContentSourcesResponse = await response.json();
  return result.data;
}

/**
 * React Query hook for fetching content sources
 */
export function useContentSources(chatbotSlug: string) {
  return useQuery({
    queryKey: ['content-sources', chatbotSlug],
    queryFn: () => fetchContentSources(chatbotSlug),
    enabled: !!chatbotSlug, // Only run if chatbotSlug is provided
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    retry: 2,
  });
}

/**
 * Hook to get a specific content source by reference_id from the cached data
 */
export function useContentSource(chatbotSlug: string, referenceId: string) {
  const { data: contentSources, ...rest } = useContentSources(chatbotSlug);
  
  const contentSource = contentSources?.find(source => source.id === referenceId) || null;
  
  return {
    ...rest,
    data: contentSource,
  };
} 