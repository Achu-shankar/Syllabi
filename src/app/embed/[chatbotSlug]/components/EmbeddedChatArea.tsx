'use client';

import React, { useEffect, useState } from 'react';
import { useChat, type Message } from '@ai-sdk/react';
import { createClient } from '@/utils/supabase/client';

import { generateUUID } from '@/app/chat/[chatbotId]/lib/utils';
import { EmbeddedGreeting } from './EmbeddedGreeting';
import { EmbeddedMessages } from './EmbeddedMessages';
import { EmbeddedMessageInput } from './EmbeddedMessageInput';
import { EmbeddedChatHeader } from './EmbeddedChatHeader';
import { useFetchInitialMessages } from '@/app/chat/[chatbotId]/lib/hooks';
import {
  ChatSession,
  getChatSessions,
  createNewChatSession,
  updateChatSession,
  getCurrentSessionId,
  setCurrentSessionId,
  generateChatTitle
} from '../lib/chatSessionManager';

interface EmbeddedChatAreaProps {
  chatbotSlug: string;
  chatbotName?: string;
  chatbotLogo?: string;
  initialMessages?: Message[];
  sessionMode?: 'stateless' | 'persistent' | 'custom';
  customSessionId?: string;
}

export default function EmbeddedChatArea({ 
  chatbotSlug,
  chatbotName = 'Assistant',
  chatbotLogo,
  initialMessages = [],
  sessionMode = 'persistent', // Changed default to persistent for better UX
  customSessionId
}: EmbeddedChatAreaProps) {
  
  // State for chat sessions
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  
  // Generate or manage session ID based on mode
  const [sessionId, setSessionId] = useState<string>(() => {
    if (customSessionId) return customSessionId;
    
    if (sessionMode === 'persistent') {
      // Try to get current session from localStorage
      const existingSessionId = getCurrentSessionId(chatbotSlug);
      if (existingSessionId) return existingSessionId;
      
      // Create new session if none exists
      const newSession = createNewChatSession(chatbotSlug);
      setCurrentSessionId(chatbotSlug, newSession.id);
      return newSession.id;
    }
    
    // Default: stateless mode - new session each time
    return generateUUID();
  });

  // Load chat sessions on mount
  useEffect(() => {
    if (sessionMode === 'persistent') {
      const sessions = getChatSessions(chatbotSlug);
      setChatSessions(sessions);
      
      // Find current session
      const current = sessions.find(s => s.id === sessionId);
      setCurrentSession(current || null);
    }
  }, [chatbotSlug, sessionId, sessionMode]);

  // Fetch initial messages for persistent/custom sessions
  const shouldFetchMessages = sessionMode === 'persistent' || sessionMode === 'custom';
  const { 
    initialMessages: fetchedMessages, 
    isLoading: isLoadingMessages, 
    error: fetchError 
  } = useFetchInitialMessages(shouldFetchMessages ? sessionId : null);

  // Use fetched messages if available, otherwise use provided initialMessages
  const messagesForChat = shouldFetchMessages && fetchedMessages ? fetchedMessages : initialMessages;

  const {
    messages,
    append,
    status,
    setMessages,
  } = useChat({
    api: '/api/chat/embed', // Use embedded API endpoint
    id: sessionId,
    initialMessages: messagesForChat,
    experimental_throttle: 50, 
    sendExtraMessageFields: true,
    generateId: generateUUID,
    body: {
      chatbotSlug: chatbotSlug,
    },
    onError: (err) => {
      console.error("Embedded chat error:", err);
    },
    onFinish: (message) => {
      // Update session metadata when conversation progresses
      if (sessionMode === 'persistent' && messages.length > 0) {
        const lastUserMessage = messages
          .filter(m => m.role === 'user')
          .slice(-1)[0];
        
        const sessionTitle = currentSession?.title || 
          (lastUserMessage ? generateChatTitle(lastUserMessage.content) : 'New Chat');
        
        updateChatSession(
          chatbotSlug,
          sessionId,
          message.content,
          messages.length + 1 // +1 for the new message
        );
        
        // Refresh sessions list
        const updatedSessions = getChatSessions(chatbotSlug);
        setChatSessions(updatedSessions);
      }
    }
  });

  // Handle sending messages
  const handleSendMessage = (message: string) => {
    append({
      id: generateUUID(),
      role: 'user',
      content: message,
      createdAt: new Date(),
    });

    // Update session title with first message if it's a new session
    if (sessionMode === 'persistent' && messages.length === 0) {
      const newTitle = generateChatTitle(message);
      updateChatSession(chatbotSlug, sessionId, message, 1);
      
      // Update current session state
      setCurrentSession(prev => prev ? { ...prev, title: newTitle } : null);
      
      // Refresh sessions list
      const updatedSessions = getChatSessions(chatbotSlug);
      setChatSessions(updatedSessions);
    }
  };

  // Handle starting a new chat
  const handleStartNewChat = () => {
    if (sessionMode === 'persistent') {
      const newSession = createNewChatSession(chatbotSlug);
      setCurrentSessionId(chatbotSlug, newSession.id);
      setSessionId(newSession.id);
      setCurrentSession(newSession);
      setMessages([]); // Clear current messages
      
      // Refresh sessions list
      const updatedSessions = getChatSessions(chatbotSlug);
      setChatSessions(updatedSessions);
    } else {
      // For stateless mode, just generate new session ID and clear messages
      setSessionId(generateUUID());
      setMessages([]);
    }
  };

  // Handle switching to a different session
  const handleSelectSession = (newSessionId: string) => {
    if (sessionMode === 'persistent') {
      setCurrentSessionId(chatbotSlug, newSessionId);
      setSessionId(newSessionId);
      
      // Find and set the selected session
      const selectedSession = chatSessions.find(s => s.id === newSessionId);
      setCurrentSession(selectedSession || null);
      
      // Clear current messages - new messages will be loaded by the useEffect
      setMessages([]);
    }
  };

  // Handle viewing history (placeholder for now)
  const handleViewHistory = () => {
    // This could open a modal or sidebar with full history
    // For now, the dropdown handles basic history viewing
  };

  // For stateless mode, generate new session ID on each new conversation
  useEffect(() => {
    if (sessionMode === 'stateless' && messages.length === 0) {
      setSessionId(generateUUID());
    }
  }, [sessionMode, messages.length]);

  // Track previous sessionId to detect actual session changes
  const [previousSessionId, setPreviousSessionId] = useState<string | null>(null);

  // Effect to handle session switching - load messages when sessionId changes
  useEffect(() => {
    if (sessionMode === 'persistent' && shouldFetchMessages && fetchedMessages) {
      // Set messages on initial load (previousSessionId is null) or when session actually changes
      if (previousSessionId === null || sessionId !== previousSessionId) {
        setMessages(fetchedMessages);
        setPreviousSessionId(sessionId);
      }
    }
  }, [sessionId, sessionMode, shouldFetchMessages, fetchedMessages, setMessages, previousSessionId]);

  // Show loading state while fetching initial messages
  if (shouldFetchMessages && isLoadingMessages) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]" style={{ backgroundColor: 'var(--chat-chat-window-background-color, #ffffff)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: 'var(--chat-primary-color, #3b82f6)' }}></div>
      </div>
    );
  }

  // Show error state if initial message loading failed
  if (shouldFetchMessages && fetchError) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] p-4" style={{ backgroundColor: 'var(--chat-chat-window-background-color, #ffffff)' }}>
        <div className="text-center space-y-2">
          <p className="text-red-600 font-medium">Failed to load chat history</p>
          <p className="text-sm text-gray-500">{fetchError.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-full w-full"
      style={{ 
        backgroundColor: 'var(--chat-chat-window-background-color, #ffffff)',
        fontFamily: 'var(--chat-font-family, inherit)',
        minHeight: '400px' // Minimum height for embedded widget
      }}
    >
      {/* Header with chat management */}
      <EmbeddedChatHeader
        chatbotName={chatbotName}
        chatbotLogo={chatbotLogo}
        onStartNewChat={handleStartNewChat}
        onViewHistory={handleViewHistory}
        recentSessions={chatSessions}
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
      />

      {messages.length === 0 ? (
        // Initial state with greeting
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <EmbeddedGreeting />
          </div>
          <div 
            // className="border-t"
            // style={{ borderColor: 'var(--chat-primary-color, #e5e7eb)' }}
          >
            <EmbeddedMessageInput
              onSendMessage={handleSendMessage}
              disabled={status === 'submitted' || status === 'streaming'}
              placeholder="Ask me .."
            />
          </div>
        </div>
      ) : (
        // Chat conversation view
        <>
          <EmbeddedMessages
            messages={messages}
            isLoading={status === 'submitted' || status === 'streaming'}
          />
          <div 
            // className="border-t"
            // style={{ borderColor: 'var(--chat-primary-color, #e5e7eb)' }}
          >
            <EmbeddedMessageInput
              onSendMessage={handleSendMessage}
              disabled={status === 'submitted' || status === 'streaming'}
              placeholder="Type your message..."
            />
          </div>
        </>
      )}
    </div>
  );
}; 