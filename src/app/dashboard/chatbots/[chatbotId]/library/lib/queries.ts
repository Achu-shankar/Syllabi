import "server-only";

import { createClient } from '@/utils/supabase/server';

// Types for folders
export interface Folder {
  id: string;
  chatbot_id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FolderWithChildren extends Folder {
  children: FolderWithChildren[];
  level: number;
}

export interface FolderCreateInput {
  chatbot_id: string;
  user_id: string;
  name: string;
  parent_id?: string | null;
}

export interface FolderUpdateInput {
  name?: string;
  parent_id?: string | null;
}

// Types for the content sources
export interface ContentSource {
  id: string;
  chatbot_id: string;
  source_type: 'document' | 'url';
  file_name: string | null;
  storage_path: string | null;
  source_url: string | null;
  title: string | null;
  indexing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  metadata: Record<string, any> | null;
  folder_id: string | null;
  uploaded_at: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentSourceCreateInput {
  chatbot_id: string;
  source_type: 'document' | 'url';
  file_name?: string;
  storage_path?: string;
  source_url?: string;
  title?: string;
  indexing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  folder_id?: string | null;
}

export interface ContentSourceUpdateInput {
  source_type?: 'document' | 'url';
  file_name?: string;
  storage_path?: string;
  source_url?: string;
  title?: string;
  indexing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  metadata?: Record<string, any>;
  folder_id?: string | null;
  processed_at?: string;
}

/**
 * Get all content sources for a specific chatbot
 */
export async function getContentSourcesByChatbotId(chatbotId: string): Promise<ContentSource[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chatbot_content_sources')
    .select('*')
    .eq('chatbot_id', chatbotId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching content sources:', error);
    throw new Error(`Failed to fetch content sources: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a specific content source by ID
 */
export async function getContentSourceById(id: string): Promise<ContentSource | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chatbot_content_sources')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching content source:', error);
    throw new Error(`Failed to fetch content source: ${error.message}`);
  }

  return data;
}

/**
 * Create a new content source
 */
export async function createContentSource(input: ContentSourceCreateInput): Promise<ContentSource> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chatbot_content_sources')
    .insert({
      ...input,
      indexing_status: input.indexing_status || 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating content source:', error);
    throw new Error(`Failed to create content source: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing content source
 */
export async function updateContentSource(id: string, input: ContentSourceUpdateInput): Promise<ContentSource> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chatbot_content_sources')
    .update({
      ...input,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating content source:', error);
    throw new Error(`Failed to update content source: ${error.message}`);
  }

  return data;
}

/**
 * Delete a content source
 */
export async function deleteContentSource(id: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('chatbot_content_sources')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting content source:', error);
    throw new Error(`Failed to delete content source: ${error.message}`);
  }
}

/**
 * Get content sources by indexing status for a specific chatbot
 */
export async function getContentSourcesByStatus(
  chatbotId: string, 
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<ContentSource[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chatbot_content_sources')
    .select('*')
    .eq('chatbot_id', chatbotId)
    .eq('indexing_status', status)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching content sources by status:', error);
    throw new Error(`Failed to fetch content sources by status: ${error.message}`);
  }

  return data || [];
}

/**
 * Get content sources statistics for a chatbot
 */
export async function getContentSourcesStats(chatbotId: string): Promise<{
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chatbot_content_sources')
    .select('indexing_status')
    .eq('chatbot_id', chatbotId);

  if (error) {
    console.error('Error fetching content sources stats:', error);
    throw new Error(`Failed to fetch content sources stats: ${error.message}`);
  }

  const stats = {
    total: data?.length || 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };

  data?.forEach((source: { indexing_status: string }) => {
    switch (source.indexing_status) {
      case 'pending':
        stats.pending++;
        break;
      case 'processing':
        stats.processing++;
        break;
      case 'completed':
        stats.completed++;
        break;
      case 'failed':
        stats.failed++;
        break;
    }
  });

  return stats;
}

// ===================
// FOLDER FUNCTIONS
// ===================

/**
 * Create a new folder
 */
export async function createFolder(input: FolderCreateInput): Promise<Folder> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('folders')
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error('Error creating folder:', error);
    throw new Error(`Failed to create folder: ${error.message}`);
  }

  return data;
}

/**
 * Get all folders for a chatbot as a flat list (ordered by hierarchy)
 */
export async function getFoldersByChatbot(chatbotId: string): Promise<Folder[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('chatbot_id', chatbotId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching folders:', error);
    throw new Error(`Failed to fetch folders: ${error.message}`);
  }

  return data || [];
}

/**
 * Build a folder tree structure from flat folder list
 */
export function buildFolderTree(folders: Folder[]): FolderWithChildren[] {
  const folderMap = new Map<string, FolderWithChildren>();
  const rootFolders: FolderWithChildren[] = [];

  // Convert all folders to FolderWithChildren and create map
  folders.forEach(folder => {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
      level: 0
    });
  });

  // Build tree structure and calculate levels
  folders.forEach(folder => {
    const folderWithChildren = folderMap.get(folder.id)!;
    
    if (folder.parent_id) {
      const parent = folderMap.get(folder.parent_id);
      if (parent) {
        folderWithChildren.level = parent.level + 1;
        parent.children.push(folderWithChildren);
      } else {
        // Parent not found, treat as root
        rootFolders.push(folderWithChildren);
      }
    } else {
      rootFolders.push(folderWithChildren);
    }
  });

  // Sort children recursively
  const sortChildren = (folders: FolderWithChildren[]) => {
    folders.sort((a, b) => a.name.localeCompare(b.name));
    folders.forEach(folder => sortChildren(folder.children));
  };

  sortChildren(rootFolders);
  return rootFolders;
}

/**
 * Get folders as a hierarchical tree structure
 */
export async function getFolderTreeByChatbot(chatbotId: string): Promise<FolderWithChildren[]> {
  const folders = await getFoldersByChatbot(chatbotId);
  return buildFolderTree(folders);
}

/**
 * Flatten a folder tree back to a list (preserving hierarchy order)
 */
export function flattenFolderTree(folders: FolderWithChildren[]): FolderWithChildren[] {
  const result: FolderWithChildren[] = [];
  
  const traverse = (folders: FolderWithChildren[]) => {
    folders.forEach(folder => {
      result.push(folder);
      if (folder.children.length > 0) {
        traverse(folder.children);
      }
    });
  };
  
  traverse(folders);
  return result;
}

/**
 * Get a specific folder by ID
 */
export async function getFolderById(id: string): Promise<Folder | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching folder:', error);
    throw new Error(`Failed to fetch folder: ${error.message}`);
  }

  return data;
}

/**
 * Update a folder's name
 */
export async function updateFolderName(folderId: string, newName: string): Promise<Folder> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('folders')
    .update({ 
      name: newName,
      updated_at: new Date().toISOString()
    })
    .eq('id', folderId)
    .select()
    .single();

  if (error) {
    console.error('Error updating folder:', error);
    throw new Error(`Failed to update folder: ${error.message}`);
  }

  return data;
}

/**
 * Delete a folder (only if empty for Phase 1)
 */
export async function deleteFolder(folderId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  
  // First check if folder has any content
  const { data: contentCount, error: contentError } = await supabase
    .from('chatbot_content_sources')
    .select('id', { count: 'exact' })
    .eq('folder_id', folderId);

  if (contentError) {
    console.error('Error checking folder content:', contentError);
    throw new Error(`Failed to check folder content: ${contentError.message}`);
  }

  if (contentCount && contentCount.length > 0) {
    throw new Error('Cannot delete folder that contains content. Move or delete content first.');
  }

  // Check for subfolders (for future Phase 2 compatibility)
  const { data: subfolders, error: subfoldersError } = await supabase
    .from('folders')
    .select('id', { count: 'exact' })
    .eq('parent_id', folderId);

  if (subfoldersError) {
    console.error('Error checking subfolders:', subfoldersError);
    throw new Error(`Failed to check subfolders: ${subfoldersError.message}`);
  }

  if (subfolders && subfolders.length > 0) {
    throw new Error('Cannot delete folder that contains subfolders.');
  }

  // Delete the folder
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId);

  if (error) {
    console.error('Error deleting folder:', error);
    throw new Error(`Failed to delete folder: ${error.message}`);
  }

  return { success: true };
}

/**
 * Move a content source to a folder (or to "Unsorted" if folderId is null)
 */
export async function moveContentSourceToFolder(
  contentSourceId: string, 
  folderId: string | null
): Promise<ContentSource> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chatbot_content_sources')
    .update({ 
      folder_id: folderId,
      updated_at: new Date().toISOString()
    })
    .eq('id', contentSourceId)
    .select()
    .single();

  if (error) {
    console.error('Error moving content source:', error);
    throw new Error(`Failed to move content source: ${error.message}`);
  }

  return data;
}

/**
 * Get content sources by folder ID (or "Unsorted" if folderId is null)
 */
export async function getContentSourcesByFolder(
  chatbotId: string, 
  folderId: string | null
): Promise<ContentSource[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('chatbot_content_sources')
    .select('*')
    .eq('chatbot_id', chatbotId);
  
  if (folderId === null) {
    // Get "Unsorted" items (where folder_id IS NULL)
    query = query.is('folder_id', null);
  } else {
    // Get items in specific folder
    query = query.eq('folder_id', folderId);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching content sources by folder:', error);
    throw new Error(`Failed to fetch content sources by folder: ${error.message}`);
  }

  return data || [];
}
