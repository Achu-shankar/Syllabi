'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UrlInputArea from './UrlInputArea';

interface UrlInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatbotId: string;
  userId: string | null;
  startUrlIngestion: (url: string, title?: string) => Promise<void>;
}

export default function UrlInputModal({ isOpen, onClose, chatbotId, userId, startUrlIngestion }: UrlInputModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">Add URL</DialogTitle>
          <DialogDescription>
            Enter a URL to add content from a web page to your chatbot's knowledge base.
          </DialogDescription>
        </DialogHeader>
        <UrlInputArea 
          chatbotId={chatbotId} 
          userId={userId} 
          onUrlAdded={onClose}
          startUrlIngestion={startUrlIngestion}
        />
      </DialogContent>
    </Dialog>
  );
} 