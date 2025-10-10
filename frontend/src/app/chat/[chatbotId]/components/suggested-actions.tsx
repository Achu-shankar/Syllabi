'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { memo, useState, useRef } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import { useEbookContext } from '../lib/context/ebook-context';
import { useChatConfig } from '../../contexts/ChatbotContext';
import { ArrowUpIcon, ChevronDownIcon } from './icons';

interface SuggestedActionsProps {
  chatId: string;
  chatbotSlug: string;
  append: UseChatHelpers['append'];
}

function PureSuggestedActions({ chatId, chatbotSlug, append }: SuggestedActionsProps) {
  const { isEbookPanelOpen } = useEbookContext();
  const { chatbot } = useChatConfig();
  const [showAll, setShowAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use chatbot's suggested questions if available, otherwise fallback to defaults
  const defaultSuggestedActions = [
    {
      title: 'How can you help me?',
      subtitle: 'Learn about my capabilities',
      icon: '💬',
      action: 'How can you help me?',
    },
    {
      title: 'What topics can you assist with?',
      subtitle: 'Explore available topics',
      icon: '📚',
      action: 'What topics can you assist with?',
    },
    {
      title: 'Tell me more about your capabilities',
      subtitle: 'Discover what I can do',
      icon: '✨',
      action: 'Tell me more about your capabilities',
    },
  ];

  // Convert chatbot suggested questions to actions format, or use defaults
  const allSuggestedActions = chatbot?.suggested_questions?.length 
    ? chatbot.suggested_questions.map((question, index) => {
        const icons = ['💬', '📚', '✨', '🔍', '📊', '🧠', '⚡', '🎯', '🔬', '📈', '🌟', '🚀'];
        return {
          title: question.length > 40 ? `${question.slice(0, 40)}...` : question,
          subtitle: 'Ask this question',
          icon: icons[index % icons.length],
        action: question,
        };
      })
    : defaultSuggestedActions;

  // Determine how many items to show initially based on screen size and panel state
  const getInitialLimit = () => {
    if (isEbookPanelOpen) {
      return 2; // Very restrictive when panel is open
    }
    // Default limits: 3 on mobile, 4 on tablet, 6 on desktop
    return 6;
  };

  const initialLimit = getInitialLimit();
  const visibleActions = showAll ? allSuggestedActions : allSuggestedActions.slice(0, initialLimit);
  const hasMoreActions = allSuggestedActions.length > initialLimit;

  // For very long lists (>12 items), use a more conservative approach
  const isVeryLongList = allSuggestedActions.length > 12;
  const shouldUseScrollableContainer = showAll && isVeryLongList;

  // Determine grid layout based on panel state and number of items
  const getGridLayoutClasses = () => {
  if (isEbookPanelOpen) {
      return "grid grid-cols-1 gap-3 w-full";
    }
    
    const itemCount = visibleActions.length;
    if (itemCount <= 2) {
      return "grid sm:grid-cols-2 gap-3 w-full";
    } else if (itemCount <= 4) {
      return "grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 w-full";
    } else {
      return "grid sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full";
    }
  };

  const handleToggleShowAll = () => {
    if (showAll && containerRef.current) {
      // Scroll to top of container when collapsing
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
    setShowAll(!showAll);
  };

  return (
    <div className="w-full space-y-4">
    <div
      data-testid="suggested-actions"
        className={`${getGridLayoutClasses()} ${
          showAll && isVeryLongList
            ? 'max-h-[70vh] overflow-y-auto pr-2' 
            : ''
        }`}
        ref={containerRef}
    >
        {visibleActions.map((suggestedAction, index) => {
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.05 * index }}
            key={`suggested-action-${suggestedAction.title}-${index}`}
              className="w-full"
          >
            <Button
              variant="ghost"
              onClick={async () => {
                window.history.replaceState({}, '', `/chat/${chatbotSlug}/${chatId}`);
                append({
                  role: 'user',
                  content: suggestedAction.action,
                });
              }}
                className="group relative w-full h-auto p-0 overflow-hidden transition-all duration-200 hover:shadow-lg"
              style={{
                  backgroundColor: 'var(--chat-input-background-color, #ffffff)',
                  borderColor: 'var(--chat-primary-color, #3b82f6)',
                borderWidth: '1px',
                borderStyle: 'solid',
                  borderRadius: '16px',
              }}
            >
                <div className="flex items-center justify-between w-full p-3 sm:p-4 text-left">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div 
                      className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium"
                      style={{
                        backgroundColor: 'var(--chat-primary-color, #3b82f6)',
                        color: 'white',
                      }}
                    >
                      {suggestedAction.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div 
                        className="font-medium text-xs sm:text-sm leading-tight truncate"
                        style={{ color: 'var(--chat-input-text-color, #1f2937)' }}
                      >
                        {suggestedAction.title}
                      </div>
                      <div 
                        className="text-xs opacity-70 mt-0.5 hidden sm:block"
                        style={{ color: 'var(--chat-input-text-color, #6b7280)' }}
                      >
                        {suggestedAction.subtitle}
                      </div>
                    </div>
                  </div>
                  <div 
                    className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1"
                    style={{ color: 'var(--chat-primary-color, #3b82f6)' }}
                  >
                    <ArrowUpIcon size={12} className="rotate-45 sm:hidden" />
                    <ArrowUpIcon size={14} className="rotate-45 hidden sm:block" />
                  </div>
                </div>
                
                {/* Hover effect overlay */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-200"
                  style={{ backgroundColor: 'var(--chat-primary-color, #3b82f6)' }}
                />
            </Button>
          </motion.div>
        );
      })}
      </div>

      {/* Show More/Less Button */}
      {hasMoreActions && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * visibleActions.length }}
          className="flex justify-center"
        >
          <Button
            variant="ghost"
            onClick={handleToggleShowAll}
            className="group flex items-center gap-2 px-4 py-2 transition-all duration-200"
            style={{
              color: 'var(--chat-primary-color, #3b82f6)',
              borderColor: 'var(--chat-primary-color, #3b82f6)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '12px',
              backgroundColor: 'transparent',
            }}
          >
            <span className="text-sm font-medium">
              {showAll 
                ? 'Show Less' 
                : isVeryLongList 
                  ? `Show All ${allSuggestedActions.length} Options`
                  : `Show ${allSuggestedActions.length - initialLimit} More`
              }
            </span>
            <div className={`transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`}>
              <ChevronDownIcon size={16} />
            </div>
          </Button>
        </motion.div>
      )}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
