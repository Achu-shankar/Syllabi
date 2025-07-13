'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';

// Chat-specific theme types
type ChatTheme = 'light' | 'dark' | 'system';

interface EmbeddedChatThemeContextValue {
  theme: ChatTheme;
  setTheme: (theme: ChatTheme) => void;
  resolvedTheme: 'light' | 'dark'; // The actual resolved theme (light or dark)
  isUrlOverride: boolean; // Whether theme is set via URL parameter
}

const EmbeddedChatThemeContext = createContext<EmbeddedChatThemeContextValue | undefined>(undefined);

interface EmbeddedChatThemeProviderProps {
  children: ReactNode;
}

export function EmbeddedChatThemeProvider({ children }: EmbeddedChatThemeProviderProps) {
  const searchParams = useSearchParams();
  const urlTheme = searchParams.get('theme'); // Get theme from URL parameter
  
  const [theme, setThemeState] = useState<ChatTheme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [isUrlOverride, setIsUrlOverride] = useState(false);

  // Function to resolve the actual theme based on system preference
  const resolveTheme = (themeValue: ChatTheme): 'light' | 'dark' => {
    if (themeValue === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeValue;
  };

  // Initialize theme on mount, prioritizing URL parameter
  useEffect(() => {
    if (urlTheme && ['light', 'dark', 'system'].includes(urlTheme)) {
      // URL parameter takes precedence for embedded widgets
      setThemeState(urlTheme as ChatTheme);
      setIsUrlOverride(true);
      console.log(`[EmbeddedTheme] Using URL theme override: ${urlTheme}`);
    } else {
      // Try to load from localStorage for embedded session persistence
      const storageKey = 'embedded-chat-theme';
      const savedTheme = localStorage.getItem(storageKey) as ChatTheme;
      
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeState(savedTheme);
      } else {
        // Default to system if no saved preference
        setThemeState('system');
      }
      setIsUrlOverride(false);
    }
  }, [urlTheme]);

  // Update resolved theme when theme changes
  useEffect(() => {
    const newResolvedTheme = resolveTheme(theme);
    setResolvedTheme(newResolvedTheme);

    // Only persist to localStorage if not overridden by URL
    if (!isUrlOverride) {
      localStorage.setItem('embedded-chat-theme', theme);
    }
  }, [theme, isUrlOverride]);

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

  const setTheme = (newTheme: ChatTheme) => {
    // Don't allow manual theme changes if URL override is active
    if (!isUrlOverride) {
      setThemeState(newTheme);
    }
  };

  return (
    <EmbeddedChatThemeContext.Provider value={{ theme, setTheme, resolvedTheme, isUrlOverride }}>
      {children}
    </EmbeddedChatThemeContext.Provider>
  );
}

export function useEmbeddedChatTheme(): EmbeddedChatThemeContextValue {
  const context = useContext(EmbeddedChatThemeContext);
  if (context === undefined) {
    throw new Error('useEmbeddedChatTheme must be used within an EmbeddedChatThemeProvider');
  }
  return context;
}

// Also provide the original interface for compatibility with existing components
export function useChatTheme(): { theme: ChatTheme; setTheme: (theme: ChatTheme) => void; resolvedTheme: 'light' | 'dark' } {
  return useEmbeddedChatTheme();
} 