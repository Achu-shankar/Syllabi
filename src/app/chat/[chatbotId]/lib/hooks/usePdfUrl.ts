import { useQuery } from '@tanstack/react-query';

interface PdfUrlResponse {
  success: boolean;
  url: string;
  fileName: string;
  expiresAt: string;
}

/**
 * Fetch signed URL for PDF viewing
 */
async function fetchPdfUrl(chatbotSlug: string, referenceId: string): Promise<string> {
  const url = `/api/content-sources/${chatbotSlug}/${referenceId}/view`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF URL: ${response.statusText}`);
  }
  
  const result: PdfUrlResponse = await response.json();
  return result.url;
}

/**
 * React Query hook for fetching PDF signed URLs
 */
export function usePdfUrl(chatbotSlug: string, referenceId: string | null) {
  return useQuery({
    queryKey: ['pdf-url', chatbotSlug, referenceId],
    queryFn: () => fetchPdfUrl(chatbotSlug, referenceId!),
    enabled: !!chatbotSlug && !!referenceId, // Only run if both are provided
    staleTime: 4 * 60 * 1000, // URLs are fresh for 4 minutes (before 5min cache expires)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2,
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid unnecessary requests
  });
} 