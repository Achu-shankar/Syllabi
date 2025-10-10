"use client";

import { useState, useEffect, useRef } from 'react';

// Define the expected structure of SSE messages from the backend
// Aligned with Python test client observations
export interface SSEMessage {
  task_identifier: string; // Matches backend field name
  reference_id?: string;
  status: string; // e.g., "PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"
  task_type?: string; // e.g., "DOCUMENT_PROCESSING", "DOCUMENT_INDEXING"
  current_step_description?: string; // Detailed message about the current step
  progress_percentage?: number; // Overall percentage for the current task (0-100)
  error_details?: string; // Details if an error occurred
  result_payload?: any; // For any additional data, e.g., final result on completion
  
  // event_type is not explicitly in python client logs for data messages, but good to keep if backend might use it for differentiating message types beyond parsing the content itself.
  event_type?: 'status_update' | 'progress_update' | 'log' | 'error' | 'result' | 'completed';
}

interface UseTaskSSEOptions {
  taskId: string | null | undefined;
  enabled?: boolean;
  onOpen?: (event: Event) => void;
  onUpdate?: (data: SSEMessage) => void; 
  onComplete?: (data: SSEMessage) => void; 
  onError?: (errorData: SSEMessage | { message: string }) => void; 
  onClose?: () => void; 
}

// TODO: Get this from environment variables or a config file  
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000/api/v1'; 

export function useTaskSSE({
  taskId,
  enabled = true,
  onOpen,
  onUpdate,
  onComplete,
  onError,
  onClose
}: UseTaskSSEOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Refs for callbacks to keep them fresh without re-triggering useEffect
  const onOpenRef = useRef(onOpen);
  const onUpdateRef = useRef(onUpdate);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onOpenRef.current = onOpen;
    onUpdateRef.current = onUpdate;
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
    onCloseRef.current = onClose;
  }, [onOpen, onUpdate, onComplete, onError, onClose]);

  useEffect(() => {
    if (!enabled || !taskId) {
      if (eventSourceRef.current) {
        console.log(`[TaskSSE] useEffect (deps: taskId, enabled): Closing SSE for ${eventSourceRef.current.url.split('/').pop()} (disabled/no taskId)`);
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
        if (onCloseRef.current) onCloseRef.current();
      }
      return;
    }

    console.log(`[TaskSSE] useEffect (deps: taskId, enabled): Setting up SSE for taskId: ${taskId}`);
    const sseUrl = `${API_BASE_URL}/tasks/${taskId}/status-stream`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = (event) => {
      console.log(`[TaskSSE] es.onopen: Connection opened for taskId: ${taskId}`);
      setIsConnected(true);
      if (onOpenRef.current) onOpenRef.current(event);
    };

    es.onmessage = (event) => {
      try {
        const parsedData: SSEMessage = JSON.parse(event.data);
        const normalizedStatus = parsedData.status?.toUpperCase();

        if (normalizedStatus === 'COMPLETED') {
          console.log(`[TaskSSE] es.onmessage: Received COMPLETED for ${taskId}. Calling onComplete.`);
          if (onCompleteRef.current) onCompleteRef.current(parsedData);
          // After processing onComplete, which might change taskId via parent state,
          // we close this specific connection deliberately.
          if (eventSourceRef.current) {
            console.log(`[TaskSSE] es.onmessage: Deliberately closing connection for completed task ${taskId}.`);
            eventSourceRef.current.close();
            eventSourceRef.current = null; // Prevent cleanup function from trying to close again or calling onClose again for this specific closure.
            setIsConnected(false); // Update connection status
            // We don't call onCloseRef.current here because this is a SUCCESSFUL completion, not an error or unexpected close.
            // The parent component handles the transition based on onComplete.
          }
        } else if (normalizedStatus === 'FAILED' || normalizedStatus === 'CANCELLED' || parsedData.error_details) {
          console.log(`[TaskSSE] es.onmessage: Received FAILED/CANCELLED/ERROR for ${taskId}. Calling onError.`);
          if (onErrorRef.current) onErrorRef.current(parsedData);
          // Similar to above, if this is a terminal error state, close the connection.
          if (eventSourceRef.current) {
            console.log(`[TaskSSE] es.onmessage: Deliberately closing connection for failed/cancelled task ${taskId}.`);
            eventSourceRef.current.close();
            eventSourceRef.current = null;
            setIsConnected(false);
             // Call onClose as it's a terminal state not necessarily handled by a direct 'completed' path.
            if (onCloseRef.current) onCloseRef.current();
          }
        } else {
          if (onUpdateRef.current) onUpdateRef.current(parsedData);
        }
      } catch (e) {
        console.error(`[TaskSSE] es.onmessage: Error parsing for ${taskId}:`, e, event.data);
        if (onErrorRef.current) onErrorRef.current({ message: 'Failed to parse message.' });
      }
    };

    es.onerror = (errorEvent) => {
      // This error handler is now more for unexpected network errors or if the server closes the stream without a proper COMPLETED/FAILED message.
      // If eventSourceRef.current is null, it means we already deliberately closed it in onmessage.
      if (!eventSourceRef.current) {
        console.log(`[TaskSSE] es.onerror: Error event for an already closed connection (taskId: ${taskId}). Ignoring.`);
        return;
      }
      
      console.error(`[TaskSSE] es.onerror: Unexpected error for taskId: ${taskId}`, errorEvent);
      setIsConnected(false);
      
      const readyState = (errorEvent.target as EventSource)?.readyState;
      if (onErrorRef.current) {
        if (readyState === EventSource.CLOSED) {
          onErrorRef.current({ message: 'SSE connection closed by server or persistent error.' });
          if (onCloseRef.current) onCloseRef.current(); 
        } else {
          onErrorRef.current({ message: 'SSE connection error, may attempt reconnect.' });
        }
      }
      if (readyState === EventSource.CLOSED && eventSourceRef.current) {
          eventSourceRef.current.close(); 
          eventSourceRef.current = null;
      }
    };

    return () => {
      // This cleanup now primarily handles cases where the component unmounts or taskId/enabled changes *before* a terminal message (COMPLETED/FAILED) is received.
      if (eventSourceRef.current) {
        console.log(`[TaskSSE] useEffect cleanup (deps: taskId, enabled): Closing SSE for ${taskId} (if not already closed in onmessage).`);
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false); 
        if (onCloseRef.current) onCloseRef.current();
      }
    };
  }, [taskId, enabled]);

  return { isConnected };
} 