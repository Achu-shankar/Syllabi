"use client";

import React from 'react';
import FileUploadArea from './components/FileUploadArea';
import UrlInputArea from './components/UrlInputArea';
import ContentSourcesTable from './components/ContentSourcesTable';
import TaskProgressGlobalDisplay from './components/TaskProgressGlobalDisplay';

export default function ChatbotLibraryPage({ params }: { params: { chatbotId: string } }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Chatbot Library & Content Sources</h1>
        <p className="text-muted-foreground">
          Manage the knowledge base for your chatbot. Upload files, add websites, and monitor processing status.
        </p>
      </div>

      {/* Upload/Input Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FileUploadArea chatbotId={params.chatbotId} />
        <UrlInputArea chatbotId={params.chatbotId} />
      </div>

      {/* Content Sources Table */}
      <ContentSourcesTable chatbotId={params.chatbotId} />

      {/* Global Task Progress Display (Fixed Position) */}
      <TaskProgressGlobalDisplay chatbotId={params.chatbotId} />
    </div>
  );
}