'use client';

import React from 'react';
import type { UIMessage } from 'ai';
import { useChatConfig } from '@/app/chat/contexts/ChatbotContext';
import { Bot, User } from 'lucide-react';
import Image from 'next/image';

interface EmbeddedMessageProps {
  message: UIMessage;
  isTyping?: boolean;
}

export function EmbeddedMessage({ message, isTyping = false }: EmbeddedMessageProps) {
  const { chatbot } = useChatConfig();
  const isUser = message.role === 'user';
  const displayName = chatbot?.student_facing_name || chatbot?.name || 'AI Assistant';

  // Get avatar URLs from theme config
  const getAvatarUrl = (role: 'user' | 'assistant') => {
    if (role === 'assistant') {
      return chatbot?.theme?.config?.aiMessageAvatarUrl || chatbot?.logo_url;
    } else {
      return chatbot?.theme?.config?.userMessageAvatarUrl;
    }
  };

  const avatarUrl = getAvatarUrl(isUser ? 'user' : 'assistant');

  // Simple markdown-like formatting for basic text
  const formatContent = (content: string) => {
    // Convert **bold** to <strong>
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert *italic* to <em>
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Convert line breaks
    content = content.replace(/\n/g, '<br>');
    return content;
  };

  return (
    <div className={`flex gap-3 p-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            <Image 
              src={avatarUrl} 
              alt={isUser ? 'User' : displayName} 
              width={32}
              height={32}
              className="object-cover"
            />
          ) : (
            isUser ? (
              <User className="w-5 h-5 text-gray-600" />
            ) : (
              <Bot className="w-5 h-5 text-gray-600" />
            )
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-xs sm:max-w-md ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block px-4 py-2 rounded-2xl ${
            isUser 
              ? 'rounded-br-md' 
              : 'rounded-bl-md'
          } text-sm leading-relaxed`}
          style={{
            backgroundColor: isUser 
              ? 'var(--chat-bubble-user-background-color, #3b82f6)' 
              : 'var(--chat-bubble-bot-background-color, #f3f4f6)',
            color: isUser 
              ? 'var(--chat-bubble-user-text-color, #ffffff)' 
              : 'var(--chat-bubble-bot-text-color, #1f2937)',
          }}
        >
          {isTyping ? (
            <div className="flex items-center space-x-1">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce opacity-60"></div>
                <div className="w-2 h-2 bg-current rounded-full animate-bounce opacity-60" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-current rounded-full animate-bounce opacity-60" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs opacity-70 ml-2">thinking...</span>
            </div>
          ) : (
            <div 
              dangerouslySetInnerHTML={{ 
                __html: formatContent(message.content) 
              }} 
            />
          )}
        </div>
        
        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.createdAt || Date.now()).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
} 