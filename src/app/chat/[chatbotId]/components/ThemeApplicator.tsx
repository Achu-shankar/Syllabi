'use client';

import { useEffect } from 'react';
import { useChatTheme } from '../../contexts/ChatbotThemeContext';
import { useChatbotTheme } from '../../contexts/ChatbotContext';
import { ThemeColors } from '../../contexts/ChatbotContext';

/**
 * ThemeApplicator component that applies chatbot theme colors as CSS variables
 * This component listens to chat theme changes and applies the appropriate color scheme
 * with smooth transitions and polished styling
 */
export function ThemeApplicator() {
  const { resolvedTheme } = useChatTheme();
  const chatbotTheme = useChatbotTheme();

  useEffect(() => {
    if (!chatbotTheme) return;

    const root = document.documentElement;
    
    // Use the resolved theme from our independent chat theme context
    const isDark = resolvedTheme === 'dark';
    
    const colors: ThemeColors = isDark ? chatbotTheme.dark : chatbotTheme.light;

    // Apply smooth transitions for theme changes
    const applyTransitions = () => {
      const chatElements = document.querySelectorAll('[data-chat-themed]');
      chatElements.forEach(el => {
        const element = el as HTMLElement;
        element.style.transition = 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease';
      });
      
      // Also apply transitions to common chat UI elements
      const commonSelectors = [
        '.chat-message',
        '.chat-input',
        '.chat-sidebar',
        '.suggested-action',
        '[class*="bubble"]',
        '[class*="chat"]'
      ];
      
      commonSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const element = el as HTMLElement;
          element.style.transition = 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease';
        });
      });
    };

    // Apply theme colors as CSS custom properties
    const applyColors = (colorSet: ThemeColors, prefix = '--chat') => {
      Object.entries(colorSet).forEach(([key, value]) => {
        if (typeof value === 'string' && value) {
          // Convert camelCase to kebab-case for CSS variables
          const cssVarName = `${prefix}-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          root.style.setProperty(cssVarName, value);
        }
      });
    };

    // Apply colors with smooth transitions
    applyTransitions();
    applyColors(colors);

    // Apply font family if specified
    if (chatbotTheme.fontFamily) {
      root.style.setProperty('--chat-font-family', chatbotTheme.fontFamily);
    }

    // Apply avatar URLs if specified
    if (chatbotTheme.aiMessageAvatarUrl) {
      root.style.setProperty('--chat-ai-avatar-url', `url(${chatbotTheme.aiMessageAvatarUrl})`);
    }
    if (chatbotTheme.userMessageAvatarUrl) {
      root.style.setProperty('--chat-user-avatar-url', `url(${chatbotTheme.userMessageAvatarUrl})`);
    }

    // Apply theme indicator for debugging (can be removed in production)
    root.style.setProperty('--chat-theme-mode', isDark ? 'dark' : 'light');

    // Cleanup function to remove theme variables when component unmounts
    return () => {
      const themeVars = Array.from(root.style).filter(prop => prop.startsWith('--chat-'));
      themeVars.forEach(prop => root.style.removeProperty(prop));
    };
  }, [chatbotTheme, resolvedTheme]);

  // This component doesn't render anything, it just applies styles
  return null;
}

/**
 * Hook to get CSS variable names for theme colors
 * Useful for components that need to reference the CSS variables
 */
export const useChatThemeVars = () => {
  return {
    // Core colors
    primaryColor: 'var(--chat-primary-color)',
    headerTextColor: 'var(--chat-header-text-color)',
    chatWindowBackgroundColor: 'var(--chat-chat-window-background-color)',
    
    // Bubble colors
    bubbleUserBackgroundColor: 'var(--chat-bubble-user-background-color)',
    bubbleBotBackgroundColor: 'var(--chat-bubble-bot-background-color)',
    bubbleUserTextColor: 'var(--chat-bubble-user-text-color)',
    bubbleBotTextColor: 'var(--chat-bubble-bot-text-color)',
    
    // Input colors
    inputBackgroundColor: 'var(--chat-input-background-color)',
    inputTextColor: 'var(--chat-input-text-color)',
    inputAreaBackgroundColor: 'var(--chat-input-area-background-color)',
    
    // Sidebar colors
    sidebarBackgroundColor: 'var(--chat-sidebar-background-color)',
    sidebarTextColor: 'var(--chat-sidebar-text-color)',
    
    // Suggested questions
    suggestedQuestionChipBackgroundColor: 'var(--chat-suggested-question-chip-background-color)',
    suggestedQuestionChipTextColor: 'var(--chat-suggested-question-chip-text-color)',
    suggestedQuestionChipBorderColor: 'var(--chat-suggested-question-chip-border-color)',
    
    // Font and avatars
    fontFamily: 'var(--chat-font-family)',
    aiAvatarUrl: 'var(--chat-ai-avatar-url)',
    userAvatarUrl: 'var(--chat-user-avatar-url)',
  };
}; 