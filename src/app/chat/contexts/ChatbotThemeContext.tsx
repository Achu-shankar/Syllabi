'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Chat-specific theme types
type ChatTheme = 'light' | 'dark' | 'system';

interface ChatThemeContextValue {
  theme: ChatTheme;
  setTheme: (theme: ChatTheme) => void;
  resolvedTheme: 'light' | 'dark'; // The actual resolved theme (light or dark)
}

const ChatThemeContext = createContext<ChatThemeContextValue | undefined>(undefined);

interface ChatThemeProviderProps {
  children: ReactNode;
}

export function ChatThemeProvider({ children }: ChatThemeProviderProps) {
  const [theme, setThemeState] = useState<ChatTheme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Function to resolve the actual theme based on system preference
  const resolveTheme = (themeValue: ChatTheme): 'light' | 'dark' => {
    if (themeValue === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeValue;
  };

  // Update resolved theme when theme changes
  useEffect(() => {
    const newResolvedTheme = resolveTheme(theme);
    setResolvedTheme(newResolvedTheme);

    // Store in localStorage for persistence
    localStorage.setItem('chat-theme', theme);
  }, [theme]);

  // Listen for system theme changes when using 'system' theme
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = () => {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('chat-theme') as ChatTheme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme);
    } else {
      // Default to system if no saved preference
      setThemeState('system');
    }
  }, []);

  const setTheme = (newTheme: ChatTheme) => {
    setThemeState(newTheme);
  };

  return (
    <ChatThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ChatThemeContext.Provider>
  );
}

export function useChatTheme(): ChatThemeContextValue {
  const context = useContext(ChatThemeContext);
  if (context === undefined) {
    throw new Error('useChatTheme must be used within a ChatThemeProvider');
  }
  return context;
} 