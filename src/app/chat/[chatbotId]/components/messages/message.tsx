'use client';

import type { UIMessage } from 'ai';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState } from 'react';
// import type { Vote } from '@/lib/db/schema';
// import { DocumentToolCall, DocumentToolResult } from './document';
import { PencilEditIcon, SparklesIcon } from '../icons';
import { MemoizedMarkdown } from './MemoizedMarkdown';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from './preview-attachment';
// import { Weather } from './weather';
import equal from 'fast-deep-equal';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageEditor } from './message-editor';
// import { DocumentPreview } from './document-preview';
import { MessageReasoning } from './message-reasoning';
import { UseChatHelpers } from '@ai-sdk/react';
import Image from 'next/image';
import { useChatConfig, useChatbotDisplayName } from '../../../contexts/ChatbotContext';

const PurePreviewMessage = ({
  chatId,
  message,
  // vote,
  isLoading,
  setMessages,
  reload,
  isReadonly,
}: {
  chatId: string;
  message: UIMessage;
  // vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const { chatbot } = useChatConfig();
  const displayName = useChatbotDisplayName();

  // Get avatar URLs from theme or use defaults
  const getAvatarUrl = (role: 'user' | 'assistant') => {
    if (role === 'assistant') {
      return chatbot?.theme?.config?.aiMessageAvatarUrl || null;
    } else {
      return chatbot?.theme?.config?.userMessageAvatarUrl || null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-4xl px-10 group/message relative"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        {/* Avatar positioned absolutely outside content flow */}
        {message.role === 'assistant' && (
          <div className="absolute left-[-2.5] top-0 size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
            <div className="translate-y-px">
              {getAvatarUrl('assistant') ? (
                <div className="w-6 h-6 relative rounded-full overflow-hidden">
                  <Image 
                    src={getAvatarUrl('assistant')!} 
                    alt={`${displayName} Logo`} 
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <SparklesIcon size={16} />
              )}
            </div>
          </div>
        )}

        {message.role === 'user' && getAvatarUrl('user') && (
          <div className="absolute right-[-2.5] top-0 size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
            <div className="w-6 h-6 relative rounded-full overflow-hidden">
              <Image 
                src={getAvatarUrl('user')!} 
                alt="User Avatar" 
                fill
                className="object-cover"
              />
            </div>
          </div>
        )}

        {/* Main content area - perfectly aligned */}
        <div
          className={cn(
            'flex flex-col gap-4 w-full min-w-0',
            {
              'ml-auto max-w-2xl': message.role === 'user',
              'w-full': mode === 'edit' || message.role === 'assistant',
            },
          )}
        >
            {message.experimental_attachments && (
              <div
                data-testid={`message-attachments`}
                className="flex flex-row justify-end gap-2"
              >
                {message.experimental_attachments.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}

            {message.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              if (type === 'reasoning') {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.reasoning}
                  />
                );
              }

              if (type === 'text') {
                if (mode === 'view') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      {message.role === 'user' && !isReadonly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                              onClick={() => {
                                setMode('edit');
                              }}
                            >
                              <PencilEditIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        data-testid="message-content"
                      className={cn('flex flex-col gap-4 min-w-0 flex-1', {
                          'px-3 py-2 rounded-xl': message.role === 'user',
                        })}
                        style={message.role === 'user' ? {
                          backgroundColor: 'var(--chat-bubble-user-background-color, #007bff)',
                          color: 'var(--chat-bubble-user-text-color, #ffffff)',
                        } : {
                          color: 'var(--chat-bubble-bot-text-color, #000000)',
                        }}
                      >
                        <MemoizedMarkdown content={part.text} id={`${message.id}-${index}`} />
                      </div>
                    </div>
                  );
                }

                if (mode === 'edit') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      <div className="size-8" />

                      <MessageEditor
                        key={message.id}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        reload={reload}
                      />
                    </div>
                  );
                }
              }

              if (type === 'tool-invocation') {
                const { toolInvocation } = part;
                const { toolName, toolCallId, state } = toolInvocation;

                if (state === 'call') {
                  const { args } = toolInvocation;
                  return(
                    <div key={toolCallId}>
                      <p className='text-sm text-muted-foreground'>Searching knowledge base for {args.query}</p>
                    </div>
                  )
                }

                if (state === 'result') {
                  const { result } = toolInvocation;
                  return(
                    <div key={toolCallId}>
                      <p className='text-sm text-muted-foreground'>Found {result.length} relevant documents ....</p>
                    </div>
                  )
                }
              }
            })}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                // vote={vote}
                isLoading={isLoading}
              />
            )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    // if (!equal(prevProps.vote, nextProps.vote)) return false;

    return true;
  },
);

// Add fade-in animation style for thinking message
const fadeInStyle = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .fade-in-text {
    animation: fadeIn 0.3s ease-in-out;
  }
`;

export const ThinkingMessage = () => {
  const role = 'assistant';
  const { chatbot } = useChatConfig();
  const displayName = useChatbotDisplayName();

  // Get avatar URL from theme or use default
  const getAvatarUrl = () => {
    return chatbot?.theme?.config?.aiMessageAvatarUrl || '/logo.png';
  };

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full mx-auto max-w-4xl px-10 group/message relative"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <style jsx>{fadeInStyle}</style>
      
      {/* Avatar positioned absolutely outside content flow */}
      <div className="absolute left-[-2.5] top-0 size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
        <div className="translate-y-px">
          {getAvatarUrl() ? (
            <div className="w-6 h-6 relative rounded-full overflow-hidden">
              <Image 
                src={getAvatarUrl()!} 
                alt={`${displayName} Logo`} 
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <SparklesIcon size={16} />
          )}
        </div>
        </div>

      {/* Main content area - perfectly aligned */}
      <div className="flex flex-col gap-4 w-full min-w-0">
          <div className="flex flex-col gap-4 text-muted-foreground fade-in-text">
            Hmm... I'm thinking...
        </div>
      </div>
    </motion.div>
  );
};
