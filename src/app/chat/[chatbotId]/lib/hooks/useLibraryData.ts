import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import React from 'react';

// Define the types for our library items
export interface LibraryFile {
  id: string;
  type: 'file';
  name: string;
  source_type: 'pdf' | 'url' | 'text' | 'youtube' | string;
  folder_id: string | null;
  [key: string]: any; // Allow other properties from ContentSource
}

export interface LibraryFolder {
  id: string;
  type: 'folder';
  name: string;
  children: (LibraryFolder | LibraryFile)[];
  parent_id: string | null;
  [key: string]: any; // Allow other properties from Folder
}

export type LibraryItem = LibraryFolder | LibraryFile;

// Types from the backend hooks
interface FolderWithChildren {
  id: string;
  name: string;
  parent_id: string | null;
  children: FolderWithChildren[];
  [key: string]: any;
}

interface ContentSource {
  id: string;
  title: string;
  file_name: string | null;
  folder_id: string | null;
  source_type: string;
  [key: string]: any;
}

interface LibraryApiResponse {
  folders: FolderWithChildren[];
  files: ContentSource[];
}

/**
 * Hook to fetch the entire library structure (folders and files) for a chatbot.
 * It now calls a single, dedicated API endpoint for the chat view.
 */
export function useLibraryData() {
  const params = useParams();
  const chatbotSlug = params.chatbotId as string;

  const { data, isLoading, error } = useQuery<LibraryApiResponse>({
    queryKey: ['library', chatbotSlug],
    queryFn: async () => {
      const response = await fetch(`/api/chat/${chatbotSlug}/library`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch library data');
      }
      const result = await response.json();
      return result.data;
    },
    enabled: !!chatbotSlug,
  });

  const libraryData: LibraryItem[] | null = React.useMemo(() => {
    if (isLoading || !data) {
      return null;
    }

    const { folders: folderTree, files: contentSources } = data;
    const filesByFolder = new Map<string | null, LibraryFile[]>();

    contentSources.forEach(source => {
      const file: LibraryFile = {
        ...source,
        type: 'file',
        name: source.title || source.file_name || 'Untitled',
      };

      const key = source.folder_id || null;
      if (!filesByFolder.has(key)) {
        filesByFolder.set(key, []);
      }
      filesByFolder.get(key)!.push(file);
    });

    const buildTreeWithFiles = (folders: FolderWithChildren[]): LibraryFolder[] => {
      return folders.map(folder => {
        const childrenFolders = buildTreeWithFiles(folder.children || []);
        const childrenFiles = filesByFolder.get(folder.id) || [];
        
        const allChildren = [...childrenFolders, ...childrenFiles].sort((a, b) => 
          a.name.localeCompare(b.name)
        );

        return {
          ...folder,
          type: 'folder',
          children: allChildren,
        };
      });
    };

    const rootFolders = buildTreeWithFiles(folderTree);
    const rootFiles = filesByFolder.get(null) || [];
    
    const combinedRoot = [...rootFolders, ...rootFiles].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return combinedRoot;
  }, [isLoading, data]);

  return {
    data: libraryData,
    isLoading,
    error,
  };
} 