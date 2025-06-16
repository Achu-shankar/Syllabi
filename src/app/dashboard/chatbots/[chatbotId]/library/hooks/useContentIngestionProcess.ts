"use client";

import { v4 as uuidv4 } from 'uuid';
import { useSupabaseUpload, type ConflictResolution } from './useSupabaseUpload';
import { useTaskStore, IngestionTask } from '../store/taskStore';
import { apiClient } from '../services/apiClient';
import { useTaskSSE, SSEMessage } from './useTaskSSE';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRefreshContentSources, useDeleteContentSource } from './useContentSources';
import { useQueryClient } from '@tanstack/react-query';

interface IngestionProcessOptions {
  chatbotId: string;
  userId: string;
}

// Task-specific SSE connection tracking
export interface TaskSSEConnection {
  taskId: string;
  type: 'processing' | 'indexing';
  frontendTaskId: string;
}

export function useContentIngestionProcess({ chatbotId, userId }: IngestionProcessOptions) {
  const { addTask, updateTask, getTask } = useTaskStore();
  const { uploadFile: supabaseUpload } = useSupabaseUpload(chatbotId);
  const refreshContentSources = useRefreshContentSources(chatbotId);
  const deleteContentSource = useDeleteContentSource(chatbotId);
  const queryClient = useQueryClient();

  // Track active SSE connections per frontend task
  const [activeConnections, setActiveConnections] = useState<Map<string, TaskSSEConnection>>(new Map());
  const activeConnectionsRef = useRef<Map<string, TaskSSEConnection>>(new Map());

  // Keep ref in sync for closures
  useEffect(() => {
    activeConnectionsRef.current = activeConnections;
  }, [activeConnections]);

  // Debug activeConnections state changes
  useEffect(() => {
    console.log(`[IngestionProcess] activeConnections state changed:`, Array.from(activeConnections.entries()));
  }, [activeConnections]);

  const addConnection = useCallback((frontendTaskId: string, connection: TaskSSEConnection) => {
    console.log(`[IngestionProcess] Adding SSE connection for frontend task ${frontendTaskId}:`, connection);
    setActiveConnections(prev => {
      console.log(`[IngestionProcess] Previous connections:`, Array.from(prev.entries()));
      const newMap = new Map(prev);
      newMap.set(frontendTaskId, connection);
      console.log(`[IngestionProcess] New connections after adding:`, Array.from(newMap.entries()));
      console.log(`[IngestionProcess] New map size:`, newMap.size);
      return newMap;
    });
  }, []);

  const removeConnection = useCallback((frontendTaskId: string) => {
    console.log(`[IngestionProcess] Removing SSE connection for frontend task ${frontendTaskId}`);
    setActiveConnections(prev => {
      const newMap = new Map(prev);
      newMap.delete(frontendTaskId);
      console.log(`[IngestionProcess] Active connections after removal:`, Array.from(newMap.entries()));
      return newMap;
    });
  }, []);

  const getConnection = useCallback((frontendTaskId: string): TaskSSEConnection | null => {
    return activeConnectionsRef.current.get(frontendTaskId) || null;
  }, []);

  const handleSSEUpdate = useCallback((frontendTaskId: string, sseData: SSEMessage) => {
    console.log(`[IngestionProcess] SSE Update for Task ${frontendTaskId}: Received Data:`, JSON.stringify(sseData, null, 2));
    
    const currentTask = getTask(frontendTaskId);
    if (!currentTask) {
      console.warn(`[IngestionProcess] Cannot find task ${frontendTaskId} in store to update.`);
      return;
    }

    // Map backend status to frontend TaskStatus
    const mapBackendStatusToFrontend = (backendStatus: string, taskType: string): IngestionTask['status'] => {
      const status = backendStatus.toUpperCase();
      const type = taskType.toUpperCase();
      
      console.log(`[IngestionProcess] Mapping status: ${backendStatus} (${status}) + taskType: ${taskType} (${type})`);
      
      switch (status) {
        case 'QUEUED':
          const queuedResult = type.includes('INDEXING') ? 'indexing_queued' : 'processing_queued';
          console.log(`[IngestionProcess] QUEUED mapped to: ${queuedResult}`);
          return queuedResult;
        case 'PROCESSING':
          const processingResult = type.includes('INDEXING') ? 'indexing' : 'processing';
          console.log(`[IngestionProcess] PROCESSING mapped to: ${processingResult}`);
          return processingResult;
        case 'COMPLETED':
          console.log(`[IngestionProcess] COMPLETED mapped to: completed`);
          return 'completed';
        case 'FAILED':
          const failedResult = type.includes('INDEXING') ? 'indexing_failed' : 'processing_failed';
          console.log(`[IngestionProcess] FAILED mapped to: ${failedResult}`);
          return failedResult;
        default:
          console.warn(`[IngestionProcess] Unknown backend status: ${backendStatus}`);
          return currentTask.status; // Keep current status if unknown
      }
    };

    const updates: Partial<IngestionTask> = {};
    
    if (sseData.status && sseData.task_type) {
      const mappedStatus = mapBackendStatusToFrontend(sseData.status, sseData.task_type);
      if (mappedStatus !== currentTask.status) {
        updates.status = mappedStatus;
      }
    }
    if (sseData.progress_percentage !== undefined && sseData.progress_percentage !== currentTask.progress) {
      updates.progress = sseData.progress_percentage;
    }
    if (sseData.current_step_description && sseData.current_step_description !== currentTask.currentStageMessage) {
      updates.currentStageMessage = sseData.current_step_description;
    }

    if (Object.keys(updates).length > 0) {
      console.log(`[IngestionProcess] Updating Task ${frontendTaskId} in store with:`, JSON.stringify(updates, null, 2));
      updateTask(frontendTaskId, updates);
    } else {
      console.log(`[IngestionProcess] SSE Update for Task ${frontendTaskId}: No effective changes to task state.`, updates);
    }
  }, [updateTask, getTask]);

  const handleSSEError = useCallback((frontendTaskId: string, errorData: SSEMessage | { message: string }) => {
    const errorMessage = (errorData as SSEMessage).error_details || (errorData as { message: string }).message || 'SSE error occurred';
    console.error(`[IngestionProcess] SSE Error for ${frontendTaskId}:`, errorMessage);
    
    const connection = getConnection(frontendTaskId);
    const task = getTask(frontendTaskId);
    
    if (task && connection) {
        updateTask(frontendTaskId, {
            status: connection.type === 'processing' ? 'processing_failed' : 'indexing_failed',
            currentStageMessage: `Error: ${errorMessage}`,
            error: errorMessage,
        });
    }
    
    removeConnection(frontendTaskId);
  }, [updateTask, getTask, getConnection, removeConnection]);

  // Comprehensive refresh function that invalidates all content source queries
  const refreshAllContentSources = useCallback(() => {
    console.log('[IngestionProcess] Refreshing all content source queries');
    // Invalidate the general content sources query
    queryClient.invalidateQueries({ 
      queryKey: ['content-sources', chatbotId] 
    });
    // Invalidate all folder-specific content source queries
    queryClient.invalidateQueries({ 
      queryKey: ['content-sources-by-folder', chatbotId] 
    });
  }, [queryClient, chatbotId]);

  const handleSSEComplete = useCallback(async (frontendTaskId: string, sseData: SSEMessage) => {
    const connection = getConnection(frontendTaskId);
    console.log(`[IngestionProcess] SSE Complete for ${frontendTaskId}, type ${connection?.type}:`, JSON.stringify(sseData, null, 2));
    
    const task = getTask(frontendTaskId);
    if (!task || !connection) {
      console.warn(`[IngestionProcess] Task ${frontendTaskId} or connection not found for SSE complete.`);
      return;
    }

    if (connection.type === 'processing') {
      updateTask(frontendTaskId, {
        progress: sseData.progress_percentage !== undefined ? sseData.progress_percentage : 100, 
        currentStageMessage: sseData.current_step_description || 'Processing completed. Preparing for indexing...',
        error: undefined 
      });

      // Refresh content sources after processing completes
      refreshAllContentSources();

      if (task.referenceId) {
        try {
          const indexingPayload = { chatbotId, userId, referenceId: task.referenceId };
          
          // Use appropriate indexing endpoint based on task type
          let indexingResponse;
          if (task.type === 'multimedia') {
            console.log('[IngestionProcess] Calling initiateMultimediaIndexing with:', indexingPayload);
            indexingResponse = await apiClient.initiateMultimediaIndexing(indexingPayload);
          } else {
          console.log('[IngestionProcess] Calling initiateIndexing with:', indexingPayload);
            indexingResponse = await apiClient.initiateIndexing(indexingPayload);
          }
          
          const indexingMessage = task.type === 'multimedia' 
            ? `${task.multimediaType === 'video' ? 'Video' : 'Audio'} indexing started. Creating searchable content...`
            : 'Indexing started. Waiting for updates...';
          
          updateTask(frontendTaskId, {
            status: 'indexing_queued',
            currentStageMessage: indexingMessage,
            indexingTaskId: indexingResponse.task_identifier,
            progress: 0, 
          });
          
          // Update connection to indexing type
          addConnection(frontendTaskId, {
            taskId: indexingResponse.task_identifier,
            type: 'indexing',
            frontendTaskId
          });
          
          console.log('[IngestionProcess] Indexing initiated:', indexingResponse);
        } catch (apiError: any) {
          console.error('[IngestionProcess] API error initiating indexing:', apiError);
          const errorMessage = task.type === 'multimedia' 
            ? `Failed to start ${task.multimediaType} indexing: ${apiError.message || 'API error'}`
            : `Failed to start indexing: ${apiError.message || 'API error'}`;
          
          updateTask(frontendTaskId, {
            status: 'indexing_failed',
            currentStageMessage: errorMessage,
            error: apiError.message || 'API error after processing.',
          });
          removeConnection(frontendTaskId);
        }
      } else {
        console.error('[IngestionProcess] No referenceId found to start indexing for task:', frontendTaskId);
        updateTask(frontendTaskId, { 
          status: 'processing_failed', 
          currentStageMessage: 'Error: Missing reference ID for indexing.', 
          error: 'Missing reference ID for indexing.'
        });
        removeConnection(frontendTaskId);
      }
    } else if (connection.type === 'indexing') {
      updateTask(frontendTaskId, {
        status: 'completed',
        progress: sseData.progress_percentage !== undefined ? sseData.progress_percentage : 100, 
        currentStageMessage: sseData.current_step_description || 'Content successfully indexed and ready!',
        error: undefined 
      });

      // Refresh content sources after indexing completes
      refreshAllContentSources();

      console.log(`[IngestionProcess] Task ${frontendTaskId} fully completed.`);
      removeConnection(frontendTaskId);
    }
  }, [updateTask, getTask, chatbotId, userId, getConnection, addConnection, removeConnection, refreshAllContentSources]);

  const sseOnCloseHandler = useCallback((frontendTaskId: string) => {
    const connection = getConnection(frontendTaskId);
    if (connection) {
        const task = getTask(frontendTaskId);
        if (task && task.status !== 'completed' && !task.status.includes('failed') && task.status !== 'cancelled') {
            console.warn(`[IngestionProcess] SSE connection closed (onClose triggered) for ${frontendTaskId} in status ${task.status}`);
            // Could potentially update task to error state here if needed
        }
    }
  }, [getConnection, getTask]);

  const startDocumentIngestion = async (file: File, conflictResolution: ConflictResolution = 'original', existingContentSourceId?: string) => {
    if (!userId) {
      console.error('[IngestionProcess] Cannot start document ingestion: userId is not available.');
      return;
    }
    if (!file) {
      console.error('[IngestionProcess] No file provided for document ingestion.');
      return;
    }

    const task = addTask({
      name: file.name,
      type: 'document',
      file: file,
      contentType: file.type,
      fileSize: file.size,
    });

    // If replacing, delete the existing content source entry first
    if (conflictResolution === 'replace' && existingContentSourceId) {
      try {
        console.log('[IngestionProcess] Deleting existing content source for replacement:', {
          contentSourceId: existingContentSourceId,
          fileName: file.name
        });
        await deleteContentSource.mutateAsync(existingContentSourceId);
        console.log('[IngestionProcess] Successfully deleted existing content source');
      } catch (error) {
        console.error('[IngestionProcess] Failed to delete existing content source:', error);
        // Continue with upload anyway, as the file deletion in storage will handle the replacement
      }
    }

    updateTask(task.id, { status: 'uploading', currentStageMessage: 'Uploading to storage...', progress: 5 });

    const { storagePath, error: uploadError } = await supabaseUpload(file, conflictResolution);

    if (uploadError || !storagePath) {
      console.error('[IngestionProcess] Supabase upload failed:', uploadError?.message);
      updateTask(task.id, {
        status: 'upload_failed',
        currentStageMessage: `Upload failed: ${uploadError?.message || 'Unknown error'}`,
        error: uploadError?.message || 'Unknown error during upload.',
        progress: 0,
      });
      return;
    }

    const referenceId = uuidv4();
    updateTask(task.id, {
      status: 'uploaded',
      currentStageMessage: 'File uploaded. Queuing for processing...',
      progress: 30,
      storagePath: storagePath,
      referenceId: referenceId,
    });

    try {
      const processingPayload = {
        chatbotId,
        userId,
        storagePath,
        referenceId,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
      };
      console.log('[IngestionProcess] Calling initiateDocumentProcessing with:', processingPayload);
      const processingResponse = await apiClient.initiateDocumentProcessing(processingPayload);
      
      updateTask(task.id, {
        status: 'processing_queued',
        currentStageMessage: 'Processing started. Waiting for updates...',
        processingTaskId: processingResponse.task_identifier,
        referenceId: processingResponse.reference_id || referenceId,
        progress: 40,
      });
      console.log('[IngestionProcess] Document processing initiated:', processingResponse);

      // Add SSE connection for this task
      addConnection(task.id, {
        taskId: processingResponse.task_identifier,
        type: 'processing',
        frontendTaskId: task.id
      });

    } catch (apiError: any) {
      console.error('[IngestionProcess] API error initiating document processing:', apiError);
      updateTask(task.id, {
        status: 'processing_failed',
        currentStageMessage: `Failed to start processing: ${apiError.message || 'API error'}`,
        error: apiError.message || 'API error after upload.',
        progress: 30,
      });
    }
  };

  const startUrlIngestion = async (url: string, title?: string) => {
    if (!userId) {
      console.error('[IngestionProcess] Cannot start URL ingestion: userId is not available.');
      return;
    }
    if (!url || !url.trim()) {
      console.error('[IngestionProcess] No URL provided for ingestion.');
      return;
    }
    
    const taskName = title || url;
    
    const task = addTask({
      name: taskName,
      type: 'url',
      url: url,
      title: title,
    });

    const referenceId = uuidv4();
    updateTask(task.id, { referenceId: referenceId, status: 'processing_queued', currentStageMessage: 'Preparing URL for processing...' });

    try {
      const processingPayload = {
        chatbotId,
        userId,
        url,
        referenceId,
        title
      };
      console.log('[IngestionProcess] Calling initiateUrlProcessing with:', processingPayload);
      const processingResponse = await apiClient.initiateUrlProcessing(processingPayload);

      updateTask(task.id, {
        currentStageMessage: 'URL processing started. Waiting for updates...',
        processingTaskId: processingResponse.task_identifier,
        referenceId: processingResponse.reference_id || referenceId,
        progress: 10,
      });
      console.log('[IngestionProcess] URL processing initiated:', processingResponse);

      // Add SSE connection for this task
      addConnection(task.id, {
        taskId: processingResponse.task_identifier,
        type: 'processing',
        frontendTaskId: task.id
      });

    } catch (apiError: any) {
      console.error('[IngestionProcess] API error initiating URL processing:', apiError);
      updateTask(task.id, {
        status: 'processing_failed',
        currentStageMessage: `Failed to process URL: ${apiError.message || 'API error'}`,
        error: apiError.message || 'API error processing URL.',
        progress: 0,
      });
    }
  };

  const startMultimediaIngestion = async (file: File, conflictResolution: ConflictResolution = 'original', existingContentSourceId?: string) => {
    if (!userId) {
      console.error('[IngestionProcess] Cannot start multimedia ingestion: userId is not available.');
      return;
    }
    if (!file) {
      console.error('[IngestionProcess] No file provided for multimedia ingestion.');
      return;
    }

    // Determine multimedia type from file
    const fileName = file.name.toLowerCase();
    const isVideo = fileName.includes('.mp4') || fileName.includes('.avi') || fileName.includes('.mov') || 
                   fileName.includes('.mkv') || fileName.includes('.webm') || file.type.startsWith('video/');
    const multimediaType = isVideo ? 'video' : 'audio';
    
    // Estimate processing duration based on file size (rough estimate)
    const estimatedDuration = Math.max(30, Math.min(300, Math.floor(file.size / (1024 * 1024) * 10))); // 10 seconds per MB, min 30s, max 5min

    const task = addTask({
      name: file.name,
      type: 'multimedia',
      file: file,
      contentType: file.type,
      fileSize: file.size,
      multimediaType: multimediaType,
      estimatedDuration: estimatedDuration,
    });

    // If replacing, delete the existing content source entry first
    if (conflictResolution === 'replace' && existingContentSourceId) {
      try {
        console.log('[IngestionProcess] Deleting existing multimedia content source for replacement:', {
          contentSourceId: existingContentSourceId,
          fileName: file.name
        });
        await deleteContentSource.mutateAsync(existingContentSourceId);
        console.log('[IngestionProcess] Successfully deleted existing multimedia content source');
      } catch (error) {
        console.error('[IngestionProcess] Failed to delete existing multimedia content source:', error);
        // Continue with upload anyway
      }
    }

    updateTask(task.id, { 
      status: 'uploading', 
      currentStageMessage: `Uploading ${multimediaType} file to storage...`, 
      progress: 5 
    });

    const { storagePath, error: uploadError } = await supabaseUpload(file, conflictResolution);

    if (uploadError || !storagePath) {
      console.error('[IngestionProcess] Multimedia Supabase upload failed:', uploadError?.message);
      updateTask(task.id, {
        status: 'upload_failed',
        currentStageMessage: `Upload failed: ${uploadError?.message || 'Unknown error'}`,
        error: uploadError?.message || 'Unknown error during upload.',
        progress: 0,
      });
      return;
    }

    const referenceId = uuidv4();
    updateTask(task.id, {
      status: 'uploaded',
      currentStageMessage: `${multimediaType === 'video' ? 'Video' : 'Audio'} uploaded. Queuing for processing...`,
      progress: 20,
      storagePath: storagePath,
      referenceId: referenceId,
    });

    try {
      const processingPayload = {
        chatbotId,
        userId,
        storagePath,
        referenceId,
        fileName: file.name,
        fileSize: file.size,
        contentType: multimediaType, // Use 'video' or 'audio' instead of MIME type
      };
      console.log('[IngestionProcess] Calling initiateMultimediaProcessing with:', processingPayload);
      const processingResponse = await apiClient.initiateMultimediaProcessing(processingPayload);
      
      updateTask(task.id, {
        status: 'processing_queued',
        currentStageMessage: `${multimediaType === 'video' ? 'Video' : 'Audio'} processing started. This may take several minutes...`,
        processingTaskId: processingResponse.task_identifier,
        referenceId: processingResponse.reference_id || referenceId,
        progress: 30,
      });
      console.log('[IngestionProcess] Multimedia processing initiated:', processingResponse);

      // Add SSE connection for this task
      addConnection(task.id, {
        taskId: processingResponse.task_identifier,
        type: 'processing',
        frontendTaskId: task.id
      });

    } catch (apiError: any) {
      console.error('[IngestionProcess] API error initiating multimedia processing:', apiError);
      updateTask(task.id, {
        status: 'processing_failed',
        currentStageMessage: `Failed to start ${multimediaType} processing: ${apiError.message || 'API error'}`,
        error: apiError.message || 'API error after upload.',
        progress: 20,
      });
    }
  };

  return { 
    startDocumentIngestion, 
    startUrlIngestion,
    startMultimediaIngestion,
    activeConnections,
    handleSSEUpdate,
    handleSSEComplete,
    handleSSEError,
    sseOnCloseHandler
  };
} 