'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FileUploadArea from './FileUploadArea';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatbotId: string;
  userId: string | null;
  startDocumentIngestion: (file: File, conflictResolution?: any, existingContentSourceId?: string) => Promise<void>;
  startMultimediaIngestion?: (file: File, conflictResolution?: any, existingContentSourceId?: string) => Promise<void>;
}

export default function FileUploadModal({ isOpen, onClose, chatbotId, userId, startDocumentIngestion, startMultimediaIngestion }: FileUploadModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">Upload Files</DialogTitle>
          <DialogDescription>
            Upload documents (PDF, TXT, MD), videos (MP4, AVI, MOV), or audio files (MP3, WAV, M4A) to your chatbot's knowledge base.
          </DialogDescription>
        </DialogHeader>
        <FileUploadArea 
          chatbotId={chatbotId} 
          userId={userId} 
          onUploadStart={onClose}
          startDocumentIngestion={startDocumentIngestion}
          startMultimediaIngestion={startMultimediaIngestion}
        />
      </DialogContent>
    </Dialog>
  );
} 