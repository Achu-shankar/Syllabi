"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client'; // Ensure this path is correct
import { v4 as uuidv4 } from 'uuid';

interface UseSupabaseUploadOptions {
  bucketName?: string;
}

interface UploadResult {
  storagePath: string | null;
  error: Error | null;
}

interface UploadProgress {
  percentage: number | null;
  loaded: number;
  total: number;
}

export type ConflictResolution = 'replace' | 'keep-both' | 'original' | 'cancel';

export function useSupabaseUpload(chatbotId: string, options?: UseSupabaseUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ percentage: null, loaded: 0, total: 0 });
  const supabase = createClient();
  const bucketName = options?.bucketName || 'documents'; // Corrected default bucket

  // Generate a unique filename based on conflict resolution
  const generateFileName = (originalName: string, resolution: ConflictResolution): string => {
    switch (resolution) {
      case 'original':
        // Keep original name as-is (this is the new default behavior)
        return originalName;
      case 'keep-both':
        // Add a timestamp or counter to make it unique
        const fileExtension = originalName.includes('.') ? originalName.split('.').pop() : '';
        const nameWithoutExt = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        return fileExtension ? `${nameWithoutExt}-${timestamp}.${fileExtension}` : `${nameWithoutExt}-${timestamp}`;
      case 'replace':
        // Use original name for replacement (this ensures the path matches the existing file)
        return originalName;
      default:
        return originalName;
    }
  };

  const uploadFile = async (file: File, conflictResolution: ConflictResolution = 'original'): Promise<UploadResult> => {
    if (!file) {
      return { storagePath: null, error: new Error('No file provided.') };
    }
    if (!chatbotId) {
      return { storagePath: null, error: new Error('Chatbot ID is required.') };
    }

    setIsUploading(true);
    setUploadProgress({ percentage: 0, loaded: 0, total: file.size });

    const fileName = generateFileName(file.name, conflictResolution);
    const filePath = `${chatbotId}/uploads/${fileName}`;

    try {
      // For replace operations, use upload with upsert=true directly
      if (conflictResolution === 'replace') {
        console.log(`[Upload] Replacing existing file: ${filePath}`);
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true, // Use upsert for replace operations
          });

        setIsUploading(false);

        if (error) {
          console.error('Supabase upload error during replace:', error);
          setUploadProgress({ percentage: 100, loaded: file.size, total: file.size }); 
          return { storagePath: null, error: new Error(error.message) };
        }

        if (data) {
          setUploadProgress({ percentage: 100, loaded: file.size, total: file.size });
          return { storagePath: data.path, error: null };
        }
        
        return { storagePath: null, error: new Error('Replace operation failed for an unknown reason.') };
      }

      // For non-replace operations, use regular upload
      console.log(`[Upload] Uploading new file: ${filePath}`);

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // Don't use upsert for new files
        });

      setIsUploading(false);

      if (error) {
        console.error('Supabase upload error:', error);
        setUploadProgress({ percentage: 100, loaded: file.size, total: file.size }); 
        return { storagePath: null, error: new Error(error.message) };
      }

      if (data) {
        setUploadProgress({ percentage: 100, loaded: file.size, total: file.size });
        return { storagePath: data.path, error: null };
      }
      
      return { storagePath: null, error: new Error('Upload failed for an unknown reason.') };

    } catch (err: any) {
      setIsUploading(false);
      console.error('Unexpected error during upload:', err);
      setUploadProgress({ percentage: 100, loaded: file.size, total: file.size }); // Simulate completion on catch
      return { storagePath: null, error: new Error(err.message || 'An unexpected error occurred.') };
    }
  };

  // Basic progress simulation (since Supabase JS v2 lacks direct progress events for .upload())
  // In a real scenario, you might use TUS protocol or track XHR progress for larger files.
  // For this hook, we will just go from 0 to 100 on start/finish.
  // If you need fine-grained progress, you would typically use `supabase.storage.from(bucketName).uploadToSignedUrl`
  // and then perform an XHR request to that signed URL, attaching progress listeners to the XHR object.

  return { uploadFile, isUploading, uploadProgress };
} 