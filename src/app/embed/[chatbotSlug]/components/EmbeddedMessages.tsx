'use client';

import React, { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { EmbeddedMessage } from './EmbeddedMessage';

interface EmbeddedMessagesProps {
  messages: UIMessage[];
  isLoading?: boolean;
}

export function EmbeddedMessages({ messages, isLoading = false }: EmbeddedMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-0">
        {messages.map((message) => (
          <EmbeddedMessage
            key={message.id}
            message={message}
          />
        ))}
        
        {/* Typing indicator when loading */}
        {isLoading && (
          <EmbeddedMessage
            message={{
              id: 'typing',
              role: 'assistant',
              content: '',
              createdAt: new Date(),
            }}
            isTyping={true}
          />
        )}
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
} 