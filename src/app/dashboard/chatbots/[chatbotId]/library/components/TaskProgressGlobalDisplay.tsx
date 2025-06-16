"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronUp, 
  X, 
  FileText, 
  Link as LinkIcon,
  Upload,
  Settings2 as SettingsIcon,
  CheckCircle2 as CheckCircleIcon,
  AlertCircle as AlertCircleIcon,
  Trash2 as TrashIcon,
  RefreshCw as RetryIcon,
  Loader2,
  Video,
  Music,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskStore, IngestionTask, TaskStatus } from '../store/taskStore';
import CircularProgress from './CircularProgress';

interface TaskProgressGlobalDisplayProps {
  chatbotId: string;
}

// Helper function to get task type icon
const getTaskTypeIcon = (task: IngestionTask) => {
  if (task.type === 'multimedia') {
    return task.multimediaType === 'video' 
      ? <Video className="h-3 w-3" />
      : <Music className="h-3 w-3" />;
  } else if (task.type === 'url') {
    return <LinkIcon className="h-3 w-3" />;
  }
  return <FileText className="h-3 w-3" />;
};

// Helper function to format estimated time remaining
const formatTimeRemaining = (task: IngestionTask): string | null => {
  if (task.type !== 'multimedia' || !task.estimatedDuration) return null;
  
  const isProcessing = ['processing', 'processing_queued'].includes(task.status);
  const isIndexing = ['indexing', 'indexing_queued'].includes(task.status);
  
  if (!isProcessing && !isIndexing) return null;
  
  // Rough estimation based on progress and estimated duration
  const progressDecimal = task.progress / 100;
  if (progressDecimal <= 0) return `~${Math.ceil(task.estimatedDuration / 60)}min`;
  
  const elapsedRatio = progressDecimal;
  const remainingRatio = 1 - elapsedRatio;
  const estimatedRemaining = (task.estimatedDuration * remainingRatio) / elapsedRatio;
  
  if (estimatedRemaining < 60) return `~${Math.ceil(estimatedRemaining)}s`;
  return `~${Math.ceil(estimatedRemaining / 60)}min`;
};

// Enhanced status messages for multimedia
const getEnhancedStatusMessage = (task: IngestionTask): string => {
  if (task.type !== 'multimedia') return task.currentStageMessage;
  
  const mediaType = task.multimediaType === 'video' ? 'Video' : 'Audio';
  
  switch (task.status) {
    case 'uploading':
      return `Uploading ${mediaType.toLowerCase()} file...`;
    case 'processing_queued':
      return `${mediaType} queued for processing...`;
    case 'processing':
      if (task.currentStageMessage.toLowerCase().includes('transcrib')) {
        return `Transcribing ${mediaType.toLowerCase()}...`;
      } else if (task.currentStageMessage.toLowerCase().includes('extract')) {
        return `Extracting ${mediaType.toLowerCase()} content...`;
      }
      return `Processing ${mediaType.toLowerCase()}...`;
    case 'indexing_queued':
      return `${mediaType} ready for indexing...`;
    case 'indexing':
      if (task.currentStageMessage.toLowerCase().includes('chunk')) {
        return `Creating searchable segments...`;
      } else if (task.currentStageMessage.toLowerCase().includes('embed')) {
        return `Generating embeddings...`;
      }
      return `Indexing ${mediaType.toLowerCase()} content...`;
    case 'completed':
      return `${mediaType} ready for search!`;
    default:
      return task.currentStageMessage;
  }
};

const getStatusVisuals = (status: TaskStatus, type: 'icon' | 'badge' | 'color') => {
  let icon = <FileText className="h-4 w-4 text-muted-foreground" />;
  let badge = <Badge variant="outline">{status}</Badge>;
  let colorClass = 'border-gray-200 dark:border-gray-700';

  switch (status) {
    case 'pending_upload':
    case 'uploading':
      icon = <Upload className="h-4 w-4 text-blue-500" />;
      badge = <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300">Uploading</Badge>;
      colorClass = 'border-blue-200 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-700';
      break;
    case 'upload_failed':
      icon = <AlertCircleIcon className="h-4 w-4 text-red-500" />;
      badge = <Badge variant="destructive">Upload Failed</Badge>;
      colorClass = 'border-red-200 bg-red-50 dark:bg-red-900/30 dark:border-red-700';
      break;
    case 'uploaded':
    case 'processing_queued':
      icon = <SettingsIcon className="h-4 w-4 text-purple-500" />;
      badge = <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-300">Processing Queued</Badge>;
      colorClass = 'border-purple-200 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-700';
      break;
    case 'processing':
      icon = <SettingsIcon className="h-4 w-4 text-orange-500 animate-spin" />;
      badge = <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-300">Processing</Badge>;
      colorClass = 'border-orange-200 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-700';
      break;
    case 'processing_failed':
      icon = <AlertCircleIcon className="h-4 w-4 text-red-500" />;
      badge = <Badge variant="destructive">Processing Failed</Badge>;
      colorClass = 'border-red-200 bg-red-50 dark:bg-red-900/30 dark:border-red-700';
      break;
    case 'completed':
      icon = <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      badge = <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">Completed</Badge>;
      colorClass = 'border-green-200 bg-green-50 dark:bg-green-900/30 dark:border-green-700';
      break;
    case 'cancelled':
      icon = <X className="h-4 w-4 text-gray-500" />;
      badge = <Badge variant="outline">Cancelled</Badge>;
      colorClass = 'border-gray-200 bg-gray-50 dark:bg-gray-900/30 dark:border-gray-700';
      break;
    case 'indexing_queued':
      icon = <SettingsIcon className="h-4 w-4 text-indigo-500" />;
      badge = <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-300">Indexing Queued</Badge>;
      colorClass = 'border-indigo-200 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-700';
      break;
    case 'indexing':
      icon = <SettingsIcon className="h-4 w-4 text-indigo-500 animate-spin" />;
      badge = <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-300">Indexing</Badge>;
      colorClass = 'border-indigo-200 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-700';
      break;
    case 'indexing_failed':
      icon = <AlertCircleIcon className="h-4 w-4 text-red-500" />;
      badge = <Badge variant="destructive">Indexing Failed</Badge>;
      colorClass = 'border-red-200 bg-red-50 dark:bg-red-900/30 dark:border-red-700';
      break;
  }

  if (type === 'icon') return icon;
  if (type === 'badge') return badge;
  return colorClass;
};

export default function TaskProgressGlobalDisplay({ chatbotId }: TaskProgressGlobalDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const tasks = useTaskStore((state) => state.tasks);
  const removeTask = useTaskStore((state) => state.removeTask);
  const updateTask = useTaskStore((state) => state.updateTask);

  // Show all tasks, sorted by creation time (maintain upload order)
  const displayTasks = useMemo(() => 
    tasks.sort((a, b) => b.createdAt - a.createdAt)
  , [tasks]);

  // Count only active tasks for the header
  const activeTaskCount = useMemo(() => 
    tasks.filter(task => 
      task.status !== 'completed' && 
      task.status !== 'cancelled' && 
      task.status !== 'failed_permanently'
    ).length
  , [tasks]);

  const handleDismissTask = (taskId: string, status: TaskStatus) => {
    console.log('Dismissing task:', taskId, 'current status:', status);
    if (status === 'completed' || status.includes('failed')) {
      removeTask(taskId);
    } else {
      updateTask(taskId, { status: 'cancelled', currentStageMessage: 'Task cancelled by user.', progress: 0 });
    }
  };

  const handleRetryTask = (task: IngestionTask) => {
    console.log('Retrying task:', task.id, 'for chatbot:', chatbotId);
    alert('Retry functionality to be implemented in a later phase. Please remove and re-add the source.');
  };

  // Don't show anything if no tasks
  if (displayTasks.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {activeTaskCount > 0 && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            )}
            <h3 className="text-sm font-semibold text-gray-900">
              Processing
            </h3>
            {activeTaskCount > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                {activeTaskCount}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="max-h-80 overflow-y-auto">
            <div className="p-3 space-y-2">
              {displayTasks.slice(0, 5).map((task) => {
                const isActiveProgress = [
                  'uploading', 
                  'processing', 
                  'processing_queued', 
                  'indexing', 
                  'indexing_queued'
                ].includes(task.status);
                const isCompleted = task.status === 'completed';
                const isFailed = task.status.includes('failed');
                const timeRemaining = formatTimeRemaining(task);
                const enhancedMessage = getEnhancedStatusMessage(task);

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded border text-xs",
                      getStatusVisuals(task.status, 'color')
                    )}
                  >
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {getStatusVisuals(task.status, 'icon')}
                    </div>

                    {/* Task Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 mb-1">
                        {/* Task type icon */}
                        <div className="text-muted-foreground">
                          {getTaskTypeIcon(task)}
                        </div>
                        <span className="font-medium text-xs truncate" title={task.name}>
                          {task.name}
                        </span>
                      </div>
                      
                      {/* Enhanced status message */}
                      <p className="text-[10px] text-muted-foreground truncate" title={enhancedMessage}>
                        {enhancedMessage}
                      </p>
                      
                      {/* Time remaining for multimedia */}
                      {timeRemaining && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="text-[9px] text-muted-foreground">
                            {timeRemaining}
                          </span>
                        </div>
                      )}
                      
                      {/* Error message */}
                      {task.error && (
                        <p className="text-red-600 text-[10px] truncate mt-1" title={task.error}>
                          {task.error}
                        </p>
                      )}
                    </div>

                    {/* Progress */}
                    {(isActiveProgress || isCompleted) && (
                      <CircularProgress
                        progress={task.progress}
                        size={20}
                        strokeWidth={2}
                        isComplete={isCompleted}
                        showPercentage={true}
                      />
                    )}
                    
                    {/* Dismiss Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-red-100 hover:text-red-600"
                      onClick={() => handleDismissTask(task.id, task.status)}
                      title="Dismiss"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              
              {displayTasks.length > 5 && (
                <div className="text-center py-2 text-xs text-gray-500">
                  +{displayTasks.length - 5} more tasks
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsed view - show summary */}
        {!isExpanded && (
          <div className="px-4 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">
                {activeTaskCount > 0 ? `${activeTaskCount} active` : `${tasks.length} completed`}
              </span>
              {activeTaskCount > 0 && (
                <div className="flex -space-x-1">
                  {displayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="w-4 h-4 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 