"use client";

import React from 'react';
import { useTaskSSE, SSEMessage } from '../hooks/useTaskSSE';
import { TaskSSEConnection } from '../hooks/useContentIngestionProcess';

interface SSEConnectionManagerProps {
  activeConnections: Map<string, TaskSSEConnection>;
  onUpdate: (frontendTaskId: string, data: SSEMessage) => void;
  onComplete: (frontendTaskId: string, data: SSEMessage) => void;
  onError: (frontendTaskId: string, errorData: SSEMessage | { message: string }) => void;
  onClose: (frontendTaskId: string) => void;
}

// Individual SSE connection wrapper
function TaskSSEWrapper({ 
  connection, 
  onUpdate, 
  onComplete, 
  onError, 
  onClose 
}: {
  connection: TaskSSEConnection;
  onUpdate: (frontendTaskId: string, data: SSEMessage) => void;
  onComplete: (frontendTaskId: string, data: SSEMessage) => void;
  onError: (frontendTaskId: string, errorData: SSEMessage | { message: string }) => void;
  onClose: (frontendTaskId: string) => void;
}) {
  console.log(`[TaskSSEWrapper] Setting up SSE for frontendTaskId: ${connection.frontendTaskId}, taskId: ${connection.taskId}, type: ${connection.type}`);
  
  useTaskSSE({
    taskId: connection.taskId,
    enabled: true,
    onUpdate: (data) => onUpdate(connection.frontendTaskId, data),
    onComplete: (data) => onComplete(connection.frontendTaskId, data),
    onError: (errorData) => onError(connection.frontendTaskId, errorData),
    onClose: () => onClose(connection.frontendTaskId)
  });

  return null; // This component doesn't render anything visible
}

export default function SSEConnectionManager({
  activeConnections,
  onUpdate,
  onComplete,
  onError,
  onClose
}: SSEConnectionManagerProps) {
  console.log(`[SSEConnectionManager] Rendering with ${activeConnections.size} active connections`);

  return (
    <>
      {Array.from(activeConnections.entries()).map(([frontendTaskId, connection]) => (
        <TaskSSEWrapper
          key={frontendTaskId}
          connection={connection}
          onUpdate={onUpdate}
          onComplete={onComplete}
          onError={onError}
          onClose={onClose}
        />
      ))}
    </>
  );
} 