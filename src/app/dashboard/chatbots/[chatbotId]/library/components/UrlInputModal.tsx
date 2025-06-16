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
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Add URL</DialogTitle>
          <DialogDescription>
            Enter a URL to add content from a web page to your chatbot's knowledge base.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <UrlInputArea 
            chatbotId={chatbotId} 
            userId={userId} 
            onUrlAdded={onClose}
            startUrlIngestion={startUrlIngestion}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
} 