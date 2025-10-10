'use client';

import { useEffect } from 'react';
import { useEmbeddedChatTheme } from './EmbeddedThemeProvider';
import { useChatConfig } from '@/app/chat/contexts/ChatbotContext';
import { ThemeColors } from '@/app/chat/contexts/ChatbotContext';

/**
 * EmbeddedThemeApplicator - Simplified theme applicator for embedded chatbots
 * Only applies essential CSS variables needed for the embedded experience
 */
export function EmbeddedThemeApplicator() {
  const { resolvedTheme } = useEmbeddedChatTheme();
  const { chatbot } = useChatConfig();

  useEffect(() => {
    if (!chatbot?.theme) return;

    const root = document.documentElement;
    
    // Use the resolved theme from our embedded chat theme context
    const isDark = resolvedTheme === 'dark';
    
    // Extract the actual theme config from the enhanced format
    const themeConfig = chatbot.theme.config;
    const colors: ThemeColors = isDark ? themeConfig.dark : themeConfig.light;

    // Apply core colors as CSS custom properties (only what's needed for embedded)
    const applyEmbeddedColors = (colorSet: ThemeColors) => {
      // Primary colors
      if (colorSet.primaryColor) {
        root.style.setProperty('--chat-primary-color', colorSet.primaryColor);
        // Also set light version for selection highlights
        const primaryHex = colorSet.primaryColor;
        if (primaryHex.startsWith('#')) {
          const r = parseInt(primaryHex.slice(1, 3), 16);
          const g = parseInt(primaryHex.slice(3, 5), 16);
          const b = parseInt(primaryHex.slice(5, 7), 16);
          root.style.setProperty('--chat-primary-color-light', `rgba(${r}, ${g}, ${b}, 0.1)`);
        }
      }
      
      // Background colors
      if (colorSet.chatWindowBackgroundColor) {
        root.style.setProperty('--chat-chat-window-background-color', colorSet.chatWindowBackgroundColor);
        // Use same color for header background by default
        root.style.setProperty('--chat-header-background-color', colorSet.chatWindowBackgroundColor);
      }
      
      // Text colors
      if (colorSet.bubbleBotTextColor) {
        root.style.setProperty('--chat-text-color', colorSet.bubbleBotTextColor);
      }
      
      // Border colors - derive from primary or set default
      const borderColor = isDark ? '#374151' : '#e5e7eb';
      root.style.setProperty('--chat-border-color', borderColor);
      
      // Message bubble colors
      if (colorSet.bubbleUserBackgroundColor) {
        root.style.setProperty('--chat-bubble-user-background-color', colorSet.bubbleUserBackgroundColor);
      }
      if (colorSet.bubbleBotBackgroundColor) {
        root.style.setProperty('--chat-bubble-bot-background-color', colorSet.bubbleBotBackgroundColor);
      }
      if (colorSet.bubbleUserTextColor) {
        root.style.setProperty('--chat-bubble-user-text-color', colorSet.bubbleUserTextColor);
      }
      if (colorSet.bubbleBotTextColor) {
        root.style.setProperty('--chat-bubble-bot-text-color', colorSet.bubbleBotTextColor);
      }
      
      // Input colors
      if (colorSet.inputBackgroundColor) {
        root.style.setProperty('--chat-input-background-color', colorSet.inputBackgroundColor);
      }
      if (colorSet.inputTextColor) {
        root.style.setProperty('--chat-input-text-color', colorSet.inputTextColor);
      }
      
      // Suggested questions
      if (colorSet.suggestedQuestionChipBackgroundColor) {
        root.style.setProperty('--chat-suggested-question-chip-background-color', colorSet.suggestedQuestionChipBackgroundColor);
      }
      if (colorSet.suggestedQuestionChipTextColor) {
        root.style.setProperty('--chat-suggested-question-chip-text-color', colorSet.suggestedQuestionChipTextColor);
      }
      if (colorSet.suggestedQuestionChipBorderColor) {
        root.style.setProperty('--chat-suggested-question-chip-border-color', colorSet.suggestedQuestionChipBorderColor);
      }
    };

    // Apply theme colors
    applyEmbeddedColors(colors);

    // Apply font family if specified
    if (themeConfig.fontFamily) {
      root.style.setProperty('--chat-font-family', themeConfig.fontFamily);
    }

    // Apply avatar URLs if specified
    if (themeConfig.aiMessageAvatarUrl) {
      root.style.setProperty('--chat-ai-avatar-url', `url(${themeConfig.aiMessageAvatarUrl})`);
    }
    if (themeConfig.userMessageAvatarUrl) {
      root.style.setProperty('--chat-user-avatar-url', `url(${themeConfig.userMessageAvatarUrl})`);
    }

    // Apply theme indicator for debugging
    root.style.setProperty('--chat-theme-mode', isDark ? 'dark' : 'light');

    // Cleanup function to remove theme variables when component unmounts
    return () => {
      const themeVars = [
        '--chat-primary-color',
        '--chat-primary-color-light',
        '--chat-chat-window-background-color',
        '--chat-header-background-color',
        '--chat-text-color',
        '--chat-border-color',
        '--chat-bubble-user-background-color',
        '--chat-bubble-bot-background-color',
        '--chat-bubble-user-text-color',
        '--chat-bubble-bot-text-color',
        '--chat-input-background-color',
        '--chat-input-text-color',
        '--chat-suggested-question-chip-background-color',
        '--chat-suggested-question-chip-text-color',
        '--chat-suggested-question-chip-border-color',
        '--chat-font-family',
        '--chat-ai-avatar-url',
        '--chat-user-avatar-url',
        '--chat-theme-mode'
      ];
      
      themeVars.forEach(prop => root.style.removeProperty(prop));
    };
  }, [chatbot, resolvedTheme]);

  // This component doesn't render anything, it just applies styles
  return null;
} 