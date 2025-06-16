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
import { AlertTriangle, FileText, Copy, X } from 'lucide-react';
import { ContentSource } from '../lib/queries';
import { type ConflictResolution } from '../hooks/useSupabaseUpload';

interface FileConflictDialogProps {
  isOpen: boolean;
  onResolution: (resolution: ConflictResolution) => void;
  fileName: string;
  existingFile: ContentSource;
}

export default function FileConflictDialog({
  isOpen,
  onResolution,
  fileName,
  existingFile
}: FileConflictDialogProps) {
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
    <Dialog open={isOpen} onOpenChange={() => onResolution('cancel')}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            File Already Exists
          </DialogTitle>
          <DialogDescription>
            A file named <strong>"{fileName}"</strong> already exists in this chatbot's library.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 p-3 bg-muted rounded-md">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Existing file:</span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            <div>Added: {formatDate(existingFile.uploaded_at)}</div>
            <div>Status: <span className="capitalize">{existingFile.indexing_status}</span></div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          What would you like to do?
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          {/* Temporarily disabled due to RLS policy issues
          <Button
            onClick={() => onResolution('replace')}
            variant="destructive"
            className="w-full"
          >
            <FileText className="mr-2 h-4 w-4" />
            Replace existing file
          </Button>
          */}
          
          <Button
            onClick={() => onResolution('keep-both')}
            variant="default"
            className="w-full"
          >
            <Copy className="mr-2 h-4 w-4" />
            Keep both files (rename new)
          </Button>
          
          <Button
            onClick={() => onResolution('cancel')}
            variant="outline"
            className="w-full"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 