'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface EmbeddedMessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function EmbeddedMessageInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message..." 
}: EmbeddedMessageInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  // Listen for suggested question events
  useEffect(() => {
    const handleSuggestedQuestion = (event: CustomEvent) => {
      const question = event.detail?.question;
      if (question && !disabled) {
        setInput(question);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            adjustHeight();
          }
        }, 0);
      }
    };

    window.addEventListener('embeddedSuggestedQuestion', handleSuggestedQuestion as EventListener);
    return () => {
      window.removeEventListener('embeddedSuggestedQuestion', handleSuggestedQuestion as EventListener);
    };
  }, [disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-start gap-2 p-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-lg border-none drop-shadow-md px-3 py-3 pr-12 text-sm focus:outline-none focus:ring-2 transition-all duration-200"
            style={{
              backgroundColor: 'var(--chat-input-background-color, #ffffff)',
              color: 'var(--chat-input-text-color, #1f2937)',
              borderColor: 'var(--chat-primary-color, #d1d5db)',
              maxHeight: '120px',
              minHeight: '44px',
              lineHeight: '1.5'
            }}
          />
          
          {/* Send Button - Positioned to stay vertically centered */}
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="absolute right-2 p-1.5 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: input.trim() && !disabled 
                ? 'var(--chat-primary-color, #3b82f6)' 
                : 'transparent',
              color: input.trim() && !disabled 
                ? '#ffffff' 
                : 'var(--chat-primary-color, #9ca3af)',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
} 