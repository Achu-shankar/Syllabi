'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChatbotProvider } from '@/app/chat/contexts/ChatbotContext';
import { EmbeddedChatThemeProvider } from './components/EmbeddedThemeProvider';
import { EmbeddedThemeApplicator } from './components/EmbeddedThemeApplicator';
import { useChatConfig } from '@/app/chat/contexts/ChatbotContext';
import EmbeddedChatArea from './components/EmbeddedChatArea';
import { AlertTriangle } from 'lucide-react';

// Inner component that uses the chatbot context
function EmbeddedChatContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const chatbotSlug = params.chatbotSlug as string;
  
  // Parse URL parameters for embedded configuration
  const sessionMode = (searchParams.get('session') as 'stateless' | 'persistent' | 'custom') || 'stateless';
  const customSessionId = searchParams.get('sessionId') || undefined;
  
  const { chatbot, isLoading, error } = useChatConfig();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-50 p-4">
        <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Chatbot Unavailable</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-gray-500">Chatbot not found</p>
        </div>
      </div>
    );
  }

  // Check if chatbot is public (required for embedding)
  if (chatbot.visibility !== 'public') {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-50 p-4">
        <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Chatbot Unavailable</p>
            <p>This chatbot is not available for embedding</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full" data-chatbot-slug={chatbotSlug}>
      <EmbeddedChatArea
        chatbotSlug={chatbotSlug}
        chatbotName={chatbot.name || 'Assistant'}
        chatbotLogo={chatbot.logo_url || undefined}
        sessionMode={sessionMode}
        customSessionId={customSessionId}
      />
    </div>
  );
}

export default function EmbeddedChatPage() {
  const [queryClient] = useState(() => new QueryClient());
  const params = useParams();
  const chatbotSlug = params.chatbotSlug as string;

  return (
    <QueryClientProvider client={queryClient}>
      <ChatbotProvider slug={chatbotSlug}>
        <EmbeddedChatThemeProvider>
          <EmbeddedThemeApplicator />
          <EmbeddedChatContent />
        </EmbeddedChatThemeProvider>
      </ChatbotProvider>
    </QueryClientProvider>
  );
} 