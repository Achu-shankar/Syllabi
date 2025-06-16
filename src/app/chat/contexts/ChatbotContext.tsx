'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Updated to match the PublicChatbot interface from queries
export interface PublicChatbot {
  id: string;
  student_facing_name?: string | null;
  name: string;
  logo_url?: string | null;
  welcome_message?: string | null;
  theme: ThemeConfig;
  suggested_questions?: string[] | null;
  shareable_url_slug?: string | null;
  visibility: 'private' | 'public' | 'shared';
}

// Import the ThemeConfig interface
export interface ThemeColors {
  primaryColor?: string;
  headerTextColor?: string;
  chatWindowBackgroundColor?: string;
  bubbleUserBackgroundColor?: string;
  bubbleBotBackgroundColor?: string;
  inputBackgroundColor?: string;
  inputTextColor?: string;
  sidebarBackgroundColor?: string;
  sidebarTextColor?: string;
  inputAreaBackgroundColor?: string;
  bubbleUserTextColor?: string;
  bubbleBotTextColor?: string;
  suggestedQuestionChipBackgroundColor?: string;
  suggestedQuestionChipTextColor?: string;
  suggestedQuestionChipBorderColor?: string;
  [key: string]: any;
}

export interface ThemeConfig {
  fontFamily?: string;
  aiMessageAvatarUrl?: string | null;
  userMessageAvatarUrl?: string | null;
  light: ThemeColors;
  dark: ThemeColors;
  [key: string]: any;
}

// Context state interface
interface ChatbotContextState {
  chatbot: PublicChatbot | null;
  isLoading: boolean;
  error: string | null;
}

// Context interface
interface ChatbotContextValue extends ChatbotContextState {
  refetch: () => Promise<void>;
}

// Create the context
const ChatbotContext = createContext<ChatbotContextValue | undefined>(undefined);

// Provider props interface
interface ChatbotProviderProps {
  slug: string;
  children: ReactNode;
}

/**
 * ChatbotProvider - Fetches and provides chatbot configuration data
 * @param slug - The shareable URL slug for the chatbot
 * @param children - Child components
 */
export function ChatbotProvider({ slug, children }: ChatbotProviderProps) {
  const [state, setState] = useState<ChatbotContextState>({
    chatbot: null,
    isLoading: true,
    error: null,
  });

  const fetchChatbot = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Use API route instead of direct server function call
      const response = await fetch(`/api/chat/${encodeURIComponent(slug)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.chatbot) {
        setState({
          chatbot: null,
          isLoading: false,
          error: 'Chatbot not found or access denied',
        });
        return;
      }

      setState({
        chatbot: data.chatbot,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('[ChatbotContext] Error fetching chatbot:', err);
      setState({
        chatbot: null,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load chatbot',
      });
    }
  };

  // Fetch chatbot data when slug changes
  useEffect(() => {
    if (slug) {
      fetchChatbot();
    }
  }, [slug]);

  const contextValue: ChatbotContextValue = {
    ...state,
    refetch: fetchChatbot,
  };

  return (
    <ChatbotContext.Provider value={contextValue}>
      {children}
    </ChatbotContext.Provider>
  );
}

/**
 * useChatConfig - Hook to consume chatbot configuration
 * @returns Chatbot configuration state and methods
 */
export function useChatConfig(): ChatbotContextValue {
  const context = useContext(ChatbotContext);
  
  if (context === undefined) {
    throw new Error('useChatConfig must be used within a ChatbotProvider');
  }
  
  return context;
}

/**
 * Helper hook to get the chatbot display name
 * @returns The student-facing name or fallback name
 */
export function useChatbotDisplayName(): string {
  const { chatbot } = useChatConfig();
  return chatbot?.student_facing_name || chatbot?.name || 'Chatbot';
}

/**
 * Helper hook to get the chatbot theme with fallback
 * @returns The chatbot theme or undefined
 */
export function useChatbotTheme() {
  const { chatbot } = useChatConfig();
  return chatbot?.theme;
} 