import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Folder, FolderWithChildren, ContentSource } from './queries';

// ===================
// FOLDER HOOKS
// ===================

/**
 * Hook to fetch all folders for a chatbot (flat list)
 */
export function useChatbotFolders(chatbotId: string) {
  return useQuery({
    queryKey: ['folders', chatbotId],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/library/folders`);
      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }
      const data = await response.json();
      return data.folders as Folder[];
    },
    enabled: !!chatbotId,
  });
}

/**
 * Hook to fetch folder tree structure for a chatbot
 */
export function useChatbotFolderTree(chatbotId: string) {
  return useQuery({
    queryKey: ['folders', chatbotId, 'tree'],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/library/folders?format=tree`);
      if (!response.ok) {
        throw new Error('Failed to fetch folder tree');
      }
      const data = await response.json();
      return data.folders as FolderWithChildren[];
    },
    enabled: !!chatbotId,
  });
}

/**
 * Hook to create a new folder
 */
export function useCreateFolder(chatbotId: string, onFolderCreated?: (folder: Folder) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, parent_id }: { name: string; parent_id?: string | null }) => {
      const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/library/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, parent_id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create folder');
      }

      const data = await response.json();
      return data.folder as Folder;
    },
    onSuccess: (newFolder) => {
      // Invalidate and refetch folders (both flat and tree)
      queryClient.invalidateQueries({ queryKey: ['folders', chatbotId] });
      
      // Also invalidate content sources as the folder structure affects filtering
      queryClient.invalidateQueries({ queryKey: ['content-sources', chatbotId] });
      
      // Call the callback if provided (for triggering edit mode)
      if (onFolderCreated) {
        onFolderCreated(newFolder);
      }
      
      toast.success(`Folder "${newFolder.name}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook to update a folder's name
 */
export function useUpdateFolder(chatbotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, name }: { folderId: string; name: string }) => {
      const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/library/folders/${folderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update folder');
      }

      const data = await response.json();
      return data.folder as Folder;
    },
    onSuccess: (updatedFolder) => {
      // Invalidate and refetch folders
      queryClient.invalidateQueries({ queryKey: ['folders', chatbotId] });
      
      toast.success(`Folder renamed to "${updatedFolder.name}"`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook to delete a folder
 */
export function useDeleteFolder(chatbotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/library/folders/${folderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete folder');
      }

      return { folderId };
    },
    onSuccess: ({ folderId }) => {
      // Invalidate and refetch folders
      queryClient.invalidateQueries({ queryKey: ['folders', chatbotId] });
      
      // Also invalidate content sources to update the display
      queryClient.invalidateQueries({ queryKey: ['content-sources', chatbotId] });
      
      toast.success('Folder deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ===================
// CONTENT SOURCE HOOKS
// ===================

/**
 * Hook to move a content source to a folder
 */
export function useMoveContentSource(chatbotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      contentSourceId, 
      folderId 
    }: { 
      contentSourceId: string; 
      folderId: string | null 
    }) => {
      const response = await fetch(
        `/api/dashboard/chatbots/${chatbotId}/library/content-sources/${contentSourceId}/move`, 
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ folder_id: folderId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to move content');
      }

      const data = await response.json();
      return {
        content_source: data.content_source as ContentSource,
        message: data.message as string,
      };
    },
    onSuccess: ({ message }) => {
      // Invalidate and refetch content sources to update the table
      queryClient.invalidateQueries({ queryKey: ['content-sources', chatbotId] });
      
      // Optionally invalidate folder-specific queries if we implement them later
      queryClient.invalidateQueries({ queryKey: ['content-sources-by-folder'] });
      
      toast.success(message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook to get content sources filtered by folder
 * This is an additional hook that can be used for folder-specific views
 */
export function useContentSourcesByFolder(chatbotId: string, folderId: string | null) {
  return useQuery({
    queryKey: ['content-sources-by-folder', chatbotId, folderId],
    queryFn: async () => {
      // For now, we'll fetch all content sources and filter client-side
      // Later, we can create a dedicated API endpoint for this
      const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/library/content-sources`);
      if (!response.ok) {
        throw new Error('Failed to fetch content sources');
      }
      const data = await response.json();
      const allSources = data.content_sources as ContentSource[];
      
      // Filter based on folder
      if (folderId === null) {
        // Return "Unsorted" items (where folder_id is null)
        return allSources.filter(source => source.folder_id === null);
      } else {
        // Return items in specific folder
        return allSources.filter(source => source.folder_id === folderId);
      }
    },
    enabled: !!chatbotId,
  });
}

/**
 * Hook to delete a content source
 */
export function useDeleteContentSource(chatbotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentSourceId: string) => {
      const response = await fetch(
        `/api/dashboard/chatbots/${chatbotId}/library/content-sources/${contentSourceId}`, 
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete content source');
      }

      return { contentSourceId };
    },
    onSuccess: ({ contentSourceId }) => {
      // Invalidate all content source queries to update the UI
      queryClient.invalidateQueries({ queryKey: ['content-sources', chatbotId] });
      queryClient.invalidateQueries({ queryKey: ['content-sources-by-folder'] });
      
      toast.success('Content source deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ===================
// UTILITY TYPES FOR HOOKS
// ===================

export type FolderHookData = {
  folders: Folder[];
  isLoading: boolean;
  error: Error | null;
};

export type CreateFolderData = {
  name: string;
  parent_id?: string | null;
};

export type UpdateFolderData = {
  folderId: string;
  name: string;
};

export type MoveContentData = {
  contentSourceId: string;
  folderId: string | null;
}; 