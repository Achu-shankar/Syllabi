"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronUp, 
  X, 
  FileText, 
  Link as LinkIcon,
  Upload,
  Settings,
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskProgressGlobalDisplayProps {
  chatbotId: string;
}

// Mock data for Phase 1 demonstration
const mockActiveTasks = [
  {
    id: 'task-1',
    name: 'ai_research.pdf',
    type: 'document',
    status: 'uploading',
    progress: 75,
    currentStageMessage: 'Uploading to storage...',
    error: null
  },
  {
    id: 'task-2',
    name: 'https://example.com/ml-guide',
    type: 'url',
    status: 'processing',
    progress: 45,
    currentStageMessage: 'Extracting content from webpage...',
    error: null
  },
  {
    id: 'task-3',
    name: 'notes.txt',
    type: 'document',
    status: 'indexing',
    progress: 90,
    currentStageMessage: 'Creating vector embeddings...',
    error: null
  },
  {
    id: 'task-4',
    name: 'broken_link.pdf',
    type: 'document',
    status: 'failed',
    progress: 0,
    currentStageMessage: 'Upload failed',
    error: 'File size exceeds maximum limit'
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'uploading':
      return <Upload className="h-4 w-4" />;
    case 'processing':
      return <Settings className="h-4 w-4 animate-spin" />;
    case 'indexing':
      return <Settings className="h-4 w-4 animate-spin" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'uploading':
      return <Badge variant="secondary">Uploading</Badge>;
    case 'processing':
      return <Badge variant="secondary">Processing</Badge>;
    case 'indexing':
      return <Badge variant="secondary">Indexing</Badge>;
    case 'completed':
      return <Badge variant="default" className="bg-green-500">Completed</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'url':
      return <LinkIcon className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

export default function TaskProgressGlobalDisplay({ chatbotId }: TaskProgressGlobalDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedTasks, setDismissedTasks] = useState<string[]>([]);

  const activeTasks = mockActiveTasks.filter(task => !dismissedTasks.includes(task.id));

  const handleDismissTask = (taskId: string) => {
    console.log('Dismissing task:', taskId, 'for chatbot:', chatbotId);
    setDismissedTasks(prev => [...prev, taskId]);
    
    // Phase 1: Just log to console
    // TODO Phase 4: Implement actual task dismissal
  };

  const handleRetryTask = (taskId: string) => {
    console.log('Retrying task:', taskId, 'for chatbot:', chatbotId);
    
    // Phase 1: Just log to console  
    // TODO Phase 4: Implement actual task retry
  };

  if (activeTasks.length === 0) {
    return null; // Don't show the component if no active tasks
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 z-50">
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Processing Tasks ({activeTasks.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
          <CardDescription className="text-xs">
            Content being processed for this chatbot
          </CardDescription>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="pt-0 space-y-3 max-h-64 overflow-y-auto">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "border rounded-lg p-3 space-y-2",
                  task.status === 'failed' ? "border-red-200 bg-red-50" : "border-gray-200"
                )}
              >
                {/* Task Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getTypeIcon(task.type)}
                    <span className="text-sm font-medium truncate">
                      {task.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(task.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismissTask(task.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar (only for active tasks) */}
                {task.status !== 'failed' && (
                  <div className="space-y-1">
                    <Progress value={task.progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{task.currentStageMessage}</span>
                      <span>{task.progress}%</span>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {task.status === 'failed' && task.error && (
                  <div className="space-y-2">
                    <p className="text-xs text-red-600">{task.error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleRetryTask(task.id)}
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
} 