'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatSession } from '../lib/chatSessionManager';

interface EmbeddedChatHeaderProps {
  chatbotName: string;
  chatbotLogo?: string;
  onStartNewChat: () => void;
  onViewHistory: () => void;
  recentSessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
}

export function EmbeddedChatHeader({
  chatbotName,
  chatbotLogo,
  onStartNewChat,
  onViewHistory,
  recentSessions,
  currentSessionId,
  onSelectSession
}: EmbeddedChatHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setShowHistory(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartNewChat = () => {
    onStartNewChat();
    setIsMenuOpen(false);
    setShowHistory(false);
  };

  const handleViewHistory = () => {
    setShowHistory(true);
  };

  const handleSelectSession = (sessionId: string) => {
    onSelectSession(sessionId);
    setIsMenuOpen(false);
    setShowHistory(false);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div 
      className="flex items-center px-4 py-3 border-b"
      style={{ 
        backgroundColor: 'var(--chat-header-background-color, #ffffff)',
        borderColor: 'var(--chat-border-color, #e5e7eb)',
        color: 'var(--chat-text-color, #374151)'
      }}
    >
      {/* Menu Button - Moved to left to avoid close button conflicts */}
      <div className="relative mr-3" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          style={{ 
            color: 'var(--chat-text-color, #6b7280)' 
          }}
          title="Chat options"
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="5" r="2" fill="currentColor"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
            <circle cx="12" cy="19" r="2" fill="currentColor"/>
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div 
            className="absolute left-0 top-full mt-1 w-48 rounded-md shadow-lg border z-50"
            style={{ 
              backgroundColor: 'var(--chat-chat-window-background-color, #ffffff)',
              borderColor: 'var(--chat-border-color, #e5e7eb)'
            }}
          >
            {!showHistory ? (
              // Main menu
              <div className="py-1">
                <button
                  onClick={handleStartNewChat}
                  className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                  style={{ color: 'var(--chat-text-color, #374151)' }}
                >
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    className="mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      d="M12 4V20M4 12H20" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                    />
                  </svg>
                  Start a new chat
                </button>
                
                <button
                  onClick={handleViewHistory}
                  className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                  style={{ color: 'var(--chat-text-color, #374151)' }}
                >
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    className="mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      d="M3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12Z" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    />
                    <path 
                      d="M12 7V12L16 14" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                    />
                  </svg>
                  View recent chats
                </button>
              </div>
            ) : (
              // History view
              <div className="py-1">
                {/* Back button */}
                <button
                  onClick={() => setShowHistory(false)}
                  className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors border-b"
                  style={{ 
                    color: 'var(--chat-text-color, #374151)',
                    borderColor: 'var(--chat-border-color, #e5e7eb)'
                  }}
                >
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    className="mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      d="M19 12H5M12 19L5 12L12 5" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  Back
                </button>

                {/* Recent chats */}
                <div className="max-h-64 overflow-y-auto">
                  {recentSessions.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No recent chats
                    </div>
                  ) : (
                    recentSessions.slice(0, 10).map((session) => (
                      <button
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`flex flex-col w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                          session.id === currentSessionId ? 'bg-blue-50' : ''
                        }`}
                        style={{ 
                          backgroundColor: session.id === currentSessionId 
                            ? 'var(--chat-primary-color-light, #eff6ff)' 
                            : undefined 
                        }}
                      >
                        <div 
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--chat-text-color, #374151)' }}
                        >
                          {session.title}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center justify-between">
                          <span>{formatTimestamp(session.timestamp)}</span>
                          <span>{session.messageCount} messages</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chatbot Info - Centered and flexible */}
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        {/* Avatar with Logo Support */}
        {chatbotLogo ? (
          <img
            src={chatbotLogo}
            alt={`${chatbotName} avatar`}
            className="w-8 h-8 rounded-full object-cover border border-gray-200"
            onError={(e) => {
              // Fallback to letter avatar if logo fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLDivElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        
        {/* Fallback Letter Avatar (hidden when logo loads successfully) */}
        <div 
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm ${chatbotLogo ? 'hidden' : ''}`}
          style={{ backgroundColor: 'var(--chat-primary-color, #3b82f6)' }}
        >
          {chatbotName.charAt(0).toUpperCase()}
        </div>

        <h2 className="font-semibold text-sm truncate">
          {chatbotName}
        </h2>
      </div>

      {/* Right spacer to account for external close buttons */}
      <div className="w-8 flex-shrink-0"></div>
    </div>
  );
} 