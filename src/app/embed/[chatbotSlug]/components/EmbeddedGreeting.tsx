'use client';

import { useChatConfig } from '@/app/chat/contexts/ChatbotContext';
import Image from 'next/image';

export function EmbeddedGreeting() {
  const { chatbot } = useChatConfig();

  const displayName = chatbot?.student_facing_name || chatbot?.name || 'AI Assistant';
  const welcomeMessage = chatbot?.welcome_message || `Hello! I'm ${displayName}. How can I help you today?`;
  const logoUrl = chatbot?.logo_url;

  return (
    <div className="flex flex-col items-center space-y-4 p-6">
      {/* Logo */}
      {logoUrl && (
        <div className="w-16 h-16 relative rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
          <Image 
            src={logoUrl} 
            alt={`${displayName} Logo`} 
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Welcome Message */}
      <div className="text-center space-y-2">
        <h2 
          className="text-xl font-semibold"
          style={{ color: 'var(--chat-bubble-bot-text-color, #1f2937)' }}
        >
          {displayName}
        </h2>
        <p 
          className="text-base max-w-md mx-auto leading-relaxed"
          style={{ color: 'var(--chat-bubble-bot-text-color, #6b7280)' }}
        >
          {welcomeMessage}
        </p>
      </div>

      {/* Suggested Questions */}
      {chatbot?.suggested_questions && chatbot.suggested_questions.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center max-w-md">
          {chatbot.suggested_questions.slice(0, 3).map((question, index) => (
            <button
              key={index}
              className="px-3 py-2 text-sm rounded-full border transition-colors duration-200 hover:shadow-sm"
              style={{
                backgroundColor: 'var(--chat-suggested-question-chip-background-color, #f3f4f6)',
                color: 'var(--chat-suggested-question-chip-text-color, #374151)',
                borderColor: 'var(--chat-suggested-question-chip-border-color, #d1d5db)',
              }}
              onClick={() => {
                // We'll implement this when we create the input component
                const event = new CustomEvent('embeddedSuggestedQuestion', { 
                  detail: { question } 
                });
                window.dispatchEvent(event);
              }}
            >
              {question.length > 50 ? `${question.substring(0, 50)}...` : question}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 