import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ContentSource, ContentSourceCreateInput, ContentSourceUpdateInput } from '../lib/queries';

// API response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Query keys for React Query
const QUERY_KEYS = {
  contentSources: (chatbotId: string) => ['content-sources', chatbotId],
  contentSource: (sourceId: string) => ['content-source', sourceId],
} as const;

// API functions
const contentSourcesApi = {
  async getAll(chatbotId: string): Promise<ContentSource[]> {
    const response = await fetch(`/api/chatbots/${chatbotId}/content-sources`);
    const result: ApiResponse<ContentSource[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch content sources');
    }
    
    return result.data || [];
  },

  async getById(sourceId: string, chatbotId: string): Promise<ContentSource> {
    const response = await fetch(`/api/chatbots/${chatbotId}/content-sources/${sourceId}`);
    const result: ApiResponse<ContentSource> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch content source');
    }
    
    if (!result.data) {
      throw new Error('Content source not found');
    }
    
    return result.data;
  },

  async create(chatbotId: string, input: ContentSourceCreateInput): Promise<ContentSource> {
    const response = await fetch(`/api/chatbots/${chatbotId}/content-sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    
    const result: ApiResponse<ContentSource> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create content source');
    }
    
    if (!result.data) {
      throw new Error('No data returned from create operation');
    }
    
    return result.data;
  },

  async update(sourceId: string, chatbotId: string, input: ContentSourceUpdateInput): Promise<ContentSource> {
    const response = await fetch(`/api/chatbots/${chatbotId}/content-sources/${sourceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    
    const result: ApiResponse<ContentSource> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update content source');
    }
    
    if (!result.data) {
      throw new Error('No data returned from update operation');
    }
    
    return result.data;
  },

  async delete(sourceId: string, chatbotId: string): Promise<void> {
    const response = await fetch(`/api/chatbots/${chatbotId}/content-sources/${sourceId}`, {
      method: 'DELETE',
    });
    
    const result: ApiResponse<null> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete content source');
    }
  },
};

// React Query hooks
export function useContentSources(chatbotId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.contentSources(chatbotId),
    queryFn: () => contentSourcesApi.getAll(chatbotId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useContentSource(sourceId: string, chatbotId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.contentSource(sourceId),
    queryFn: () => contentSourcesApi.getById(sourceId, chatbotId),
    enabled: !!sourceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateContentSource(chatbotId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: ContentSourceCreateInput) => contentSourcesApi.create(chatbotId, input),
    onSuccess: (newSource) => {
      // Invalidate and refetch the content sources list
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.contentSources(chatbotId)
      });
      
      // Optionally, add the new source to the cache immediately
      queryClient.setQueryData(
        QUERY_KEYS.contentSources(chatbotId),
        (oldData: ContentSource[] | undefined) => {
          if (!oldData) return [newSource];
          return [newSource, ...oldData];
        }
      );
    },
  });
}

export function useUpdateContentSource(chatbotId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sourceId, input }: { sourceId: string; input: ContentSourceUpdateInput }) =>
      contentSourcesApi.update(sourceId, chatbotId, input),
    onSuccess: (updatedSource) => {
      // Update the individual source in cache
      queryClient.setQueryData(
        QUERY_KEYS.contentSource(updatedSource.id),
        updatedSource
      );
      
      // Update the source in the main list
      queryClient.setQueryData(
        QUERY_KEYS.contentSources(chatbotId),
        (oldData: ContentSource[] | undefined) => {
          if (!oldData) return [updatedSource];
          return oldData.map(source => 
            source.id === updatedSource.id ? updatedSource : source
          );
        }
      );

      // IMPORTANT: Also invalidate folder-specific queries used by ContentSourcesTable
      // This ensures the UI updates immediately when using useContentSourcesByFolder
      queryClient.invalidateQueries({ 
        queryKey: ['content-sources-by-folder', chatbotId] 
      });
      
      // Also invalidate the main content sources query for good measure
      queryClient.invalidateQueries({ 
        queryKey: ['content-sources', chatbotId] 
      });
    },
  });
}

export function useDeleteContentSource(chatbotId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sourceId: string) => contentSourcesApi.delete(sourceId, chatbotId),
    onSuccess: (_, sourceId) => {
      // Remove the source from the list
      queryClient.setQueryData(
        QUERY_KEYS.contentSources(chatbotId),
        (oldData: ContentSource[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(source => source.id !== sourceId);
        }
      );
      
      // Remove the individual source from cache
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.contentSource(sourceId)
      });
    },
  });
}

// Utility hook to refresh content sources
export function useRefreshContentSources(chatbotId: string) {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.contentSources(chatbotId)
    });
  };
}

// Check if a file with the same name already exists
export function useCheckDuplicateFile(chatbotId: string) {
  const { data: contentSources } = useContentSources(chatbotId);
  
  return (fileName: string): ContentSource | null => {
    if (!contentSources || !fileName) return null;
    
    return contentSources.find(source => 
      source.file_name === fileName || 
      source.title === fileName
    ) || null;
  };
} 