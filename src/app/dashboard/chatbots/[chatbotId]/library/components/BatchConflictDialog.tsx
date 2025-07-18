"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText, Copy, X, RotateCcw } from 'lucide-react';
import { ContentSource } from '../lib/queries';
import { type ConflictResolution } from '../hooks/useSupabaseUpload';

export type BatchConflictResolution = 'replace-all' | 'keep-all' | 'skip-all' | 'review-individually';

interface ConflictingFile {
  file: File;
  existingFile: ContentSource;
}

interface BatchConflictDialogProps {
  isOpen: boolean;
  onResolution: (resolution: BatchConflictResolution) => void;
  conflictingFiles: ConflictingFile[];
  nonConflictingCount: number;
}

export default function BatchConflictDialog({
  isOpen,
  onResolution,
  conflictingFiles,
  nonConflictingCount
}: BatchConflictDialogProps) {
  const conflictCount = conflictingFiles.length;
  const totalFiles = conflictCount + nonConflictingCount;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onResolution('skip-all')}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Duplicate Files Found
          </DialogTitle>
          <DialogDescription>
            You are attempting to upload <strong>{conflictCount} file{conflictCount !== 1 ? 's' : ''}</strong> that have the same name as existing files.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          {/* Conflicting files list */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">
              Files with conflicts ({conflictCount}):
            </div>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {conflictingFiles.slice(0, 5).map((conflict, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{conflict.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Existing: {formatDate(conflict.existingFile.uploaded_at)}
                    </p>
                  </div>
                </div>
              ))}
              {conflictingFiles.length > 5 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  and {conflictingFiles.length - 5} more...
                </div>
              )}
            </div>
          </div>

          {/* Non-conflicting files info */}
          {nonConflictingCount > 0 && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-md">
              <div className="text-sm text-green-800 dark:text-green-200">
                <strong>{nonConflictingCount} file{nonConflictingCount !== 1 ? 's' : ''}</strong> without conflicts will be uploaded automatically.
              </div>
            </div>
          )}
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          How would you like to proceed with the duplicate files?
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          {/* Temporarily disabled due to RLS policy issues
          <Button
            onClick={() => onResolution('replace-all')}
            variant="destructive"
            className="w-full"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Replace All Duplicates
          </Button>
          */}
          
          <Button
            onClick={() => onResolution('keep-all')}
            variant="default"
            className="w-full"
          >
            <Copy className="mr-2 h-4 w-4" />
            Keep All Duplicates (Rename New Files)
          </Button>
          
          <Button
            onClick={() => onResolution('review-individually')}
            variant="outline"
            className="w-full"
          >
            <FileText className="mr-2 h-4 w-4" />
            Review Duplicates Individually
          </Button>
          
          <Button
            onClick={() => onResolution('skip-all')}
            variant="outline"
            className="w-full"
          >
            <X className="mr-2 h-4 w-4" />
            Skip All Duplicates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 