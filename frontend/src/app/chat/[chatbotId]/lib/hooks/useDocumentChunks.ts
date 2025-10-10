import { useQuery } from '@tanstack/react-query';
import { DocumentChunk } from '../db/content_queries';
import { CitationInput, UnifiedCitation, transformChunkToCitation } from '../types/citations';

// Response interfaces matching our API endpoints
interface DocumentChunksResponse {
  success: boolean;
  data: DocumentChunk[];
  count: number;
  chunks_by_reference?: Record<string, DocumentChunk[]>;
  requested_count?: number;
  found_count?: number;
  filters: {
    chatbot_slug: string;
    reference_id?: string;
    page_number?: number;
    chunk_ids?: string[];
  };
}

/**
 * Fetch document chunks for a specific reference (document)
 */
async function fetchDocumentChunks(
  chatbotSlug: string, 
  referenceId: string, 
  options?: {
    pageNumber?: number;
    chunkIds?: string[];
  }
): Promise<DocumentChunk[]> {
  const params = new URLSearchParams();
  
  if (options?.pageNumber) {
    params.set('page', options.pageNumber.toString());
  }
  
  if (options?.chunkIds && options.chunkIds.length > 0) {
    params.set('chunkIds', options.chunkIds.join(','));
  }
  
  const url = `/api/content-sources/${chatbotSlug}/${referenceId}/chunks${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch document chunks: ${response.statusText}`);
  }
  
  const result: DocumentChunksResponse = await response.json();
  return result.data;
}

/**
 * Fetch chunks by their IDs across all documents in a chatbot
 */
async function fetchChunksByIds(
  chatbotSlug: string, 
  chunkIds: string[]
): Promise<{
  chunks: DocumentChunk[];
  chunksByReference: Record<string, DocumentChunk[]>;
}> {
  if (!chunkIds || chunkIds.length === 0) {
    return { chunks: [], chunksByReference: {} };
  }
  
  const params = new URLSearchParams();
  params.set('chunkIds', chunkIds.join(','));
  
  const url = `/api/content-sources/${chatbotSlug}/chunks?${params.toString()}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch chunks by IDs: ${response.statusText}`);
  }
  
  const result: DocumentChunksResponse = await response.json();
  return {
    chunks: result.data,
    chunksByReference: result.chunks_by_reference || {}
  };
}

/**
 * React Query hook for fetching document chunks for a specific reference
 */
export function useDocumentChunks(
  chatbotSlug: string, 
  referenceId: string | null,
  options?: {
    pageNumber?: number;
    chunkIds?: string[];
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: ['document-chunks', chatbotSlug, referenceId, options?.pageNumber, options?.chunkIds],
    queryFn: () => fetchDocumentChunks(chatbotSlug, referenceId!, {
      pageNumber: options?.pageNumber,
      chunkIds: options?.chunkIds
    }),
    enabled: !!chatbotSlug && !!referenceId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook for fetching chunks by their IDs (for citation highlighting)
 */
export function useChunksByIds(
  chatbotSlug: string,
  chunkIds: string[] | null,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: ['chunks-by-ids', chatbotSlug, chunkIds],
    queryFn: () => fetchChunksByIds(chatbotSlug, chunkIds!),
    enabled: !!chatbotSlug && !!chunkIds && chunkIds.length > 0 && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get chunks for a specific page from cached document chunks
 */
export function useDocumentChunksForPage(
  chatbotSlug: string,
  referenceId: string | null,
  pageNumber: number
) {
  const { data: allChunks, ...rest } = useDocumentChunks(chatbotSlug, referenceId);
  
  const pageChunks = allChunks?.filter(chunk => chunk.page_number === pageNumber) || [];
  
  return {
    ...rest,
    data: pageChunks,
  };
}

/**
 * Hook to get a specific chunk by ID from cached data
 */
export function useDocumentChunk(
  chatbotSlug: string,
  referenceId: string | null,
  chunkId: string | null
) {
  const { data: chunks, ...rest } = useDocumentChunks(chatbotSlug, referenceId);
  
  const chunk = chunks?.find(c => c.chunk_id === chunkId) || null;
  
  return {
    ...rest,
    data: chunk,
  };
}

/**
 * Utility hook for citation highlighting - fetches chunks for multiple citations
 * Now uses unified citation format that works for both documents and multimedia
 */
export function useCitationChunks(
  chatbotSlug: string,
  citations: CitationInput[] | null,
  options?: {
    enabled?: boolean;
  }
) {
  const chunkIds = citations?.map(c => c.chunk_id) || null;
  
  const { data, ...rest } = useChunksByIds(chatbotSlug, chunkIds, options);
  
  // Transform data to unified citation format
  const citationChunks: UnifiedCitation[] = citations?.map(citation => {
    const chunk = data?.chunks.find(c => c.chunk_id === citation.chunk_id);
    return transformChunkToCitation(citation.reference_id, citation.chunk_id, chunk || null);
  }) || [];
  
  return {
    ...rest,
    data: citationChunks,
    chunksByReference: data?.chunksByReference || {}
  };
}

/**
 * Legacy hook for backward compatibility - will be removed after migration
 * @deprecated Use useCitationChunks with CitationInput[] instead
 */
export function useLegacyCitationChunks(
  chatbotSlug: string,
  citations: Array<{ reference_id: string; chunk_id: string; page_number: number }> | null,
  options?: {
    enabled?: boolean;
  }
) {
  const chunkIds = citations?.map(c => c.chunk_id) || null;
  
  const { data, ...rest } = useChunksByIds(chatbotSlug, chunkIds, options);
  
  // Transform data to match old citation format
  const citationChunks = citations?.map(citation => {
    const chunk = data?.chunks.find(c => c.chunk_id === citation.chunk_id);
    return {
      ...citation,
      chunk: chunk || null,
      coordinates: chunk?.constituent_elements_data || null
    };
  }) || [];
  
  return {
    ...rest,
    data: citationChunks,
    chunksByReference: data?.chunksByReference || {}
  };
} 