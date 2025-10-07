'use client';

import type { UIMessage } from 'ai';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState } from 'react';
// import type { Vote } from '@/lib/db/schema';
// import { DocumentToolCall, DocumentToolResult } from './document';
import { PencilEditIcon } from '../icons';
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
import { CheckCircle, Loader2, Search, AlertTriangle, ChevronDown, Eye, EyeOff, Settings } from 'lucide-react';
import { TextLoop } from '@/components/ui/text-loop';
import { GradientSpinner } from '@/components/ui/gradient-spinner';
import { ArcSpinner } from '@/components/ui/arc-spinner';
import { useChatConfig, useChatbotDisplayName } from '../../../contexts/ChatbotContext';

// Generic Tool Call Group Component
const ToolCallGroup = ({ 
  batch,
}: { 
  batch: Array<{
    toolName: string; 
    state: 'call' | 'result'; 
    args?: any; 
    result?: any; 
    toolCallId: string;
  }>;
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  
  const isBatchCompleted = batch.every(tool => tool.state === 'result');

  // Generic tool config - same icon for all tools for now
  const getToolConfig = (toolName: string) => ({
    name: toolName,
    displayName: toolName.replace(/([A-Z])/g, ' $1').trim(), // Convert camelCase to readable
    icon: Settings, // Generic icon for all tools
    description: `Executing ${toolName}`,
    color: 'var(--chat-primary-color, #007bff)', // Use theme color for all tools
  });

  return (
    <div className="mt-4 w-full">
      <div 
        className="border rounded-xl overflow-hidden backdrop-blur-sm"
        style={{
          borderColor: 'var(--chat-primary-color, #007bff)',
          backgroundColor: 'color-mix(in srgb, var(--chat-primary-color, #007bff) 5%, transparent)',
        }}
      >
        <div 
          className="flex items-center justify-between p-4 cursor-pointer transition-colors duration-200"
          onClick={() => setIsExpanded(prev => !prev)}
          style={{}}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--chat-primary-color, #007bff) 8%, transparent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div className="flex items-center gap-3 text-sm">
            {isBatchCompleted ? (
              <div className="relative w-5 h-5 flex items-center justify-center">
                <div 
                  className="absolute inset-0 rounded-full opacity-20 animate-pulse" 
                  style={{
                    backgroundColor: 'var(--chat-primary-color, #007bff)',
                  }}
                />
                <div 
                  className="relative w-4 h-4 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--chat-primary-color, #007bff)',
                  }}
                >
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            ) : (
              <GradientSpinner className="w-5 h-5" />
            )}

            {isBatchCompleted ? (
              <div className="flex items-center gap-2">
                <span 
                  className="font-semibold"
                  style={{
                    color: 'var(--chat-primary-color, #007bff)',
                  }}
                >
                  Tools Executed
                </span>
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--chat-primary-color, #007bff) 15%, transparent)',
                    color: 'var(--chat-primary-color, #007bff)',
                  }}
                >
                  {batch.length}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">Executing:</span>
                <TextLoop>
                  {batch.map(t => {
                    const config = getToolConfig(t.toolName);
                        return (
                          <span 
                            key={t.toolCallId} 
                            className="flex items-center gap-2 font-medium"
                            style={{
                              color: 'var(--chat-primary-color, #007bff)',
                            }}
                          >
                            {config.displayName}
                          </span>
                        );
                  })}
                </TextLoop>
              </div>
            )}
          </div>

          <ChevronDown 
            className={`w-4 h-4 transition-all duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
            style={{
              color: 'var(--chat-primary-color, #007bff)',
            }}
          />
        </div>

        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="border-t border-zinc-200/60 dark:border-zinc-700/60"
          >
            <div className="p-3 space-y-2 bg-background/80 dark:bg-zinc-900/50">
              {batch.map((tool, index) => {
                const config = getToolConfig(tool.toolName);
                const IconComponent = config.icon;
                const isCompleted = tool.state === 'result';
                const isSelected = selectedTool === tool.toolCallId;
                
                return (
                  <motion.div 
                    key={tool.toolCallId} 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="space-y-2"
                  >
                    <div 
                      className={`flex items-center justify-between p-2 rounded-lg transition-all duration-200 cursor-pointer group/tool ${
                        isSelected 
                          ? 'bg-blue-100/80 dark:bg-blue-900/50' 
                          : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-700/60'
                      }`}
                      onClick={() => setSelectedTool(isSelected ? null : tool.toolCallId)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 flex items-center justify-center">
                          {isCompleted ? (
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: 'var(--chat-primary-color, #007bff)',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                color: 'var(--chat-primary-color, #007bff)',
                              }}
                            >
                              <ArcSpinner className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <IconComponent 
                          className="w-4 h-4" 
                          style={{
                            color: config.color,
                          }}
                        />

                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                            {config.displayName}
                          </span>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-pre-wrap break-words mt-0.5 font-medium">
                            {/* Try to extract meaningful info from args */}
                            {tool.args?.question || 
                             tool.args?.query || 
                             tool.args?.term || 
                             tool.args?.searchTerm ||
                             tool.args?.input ||
                             Object.keys(tool.args || {}).slice(0, 2).map(key => tool.args[key]).join(', ') ||
                             'Processing...'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 ${
                          isSelected 
                            ? 'bg-blue-200/80 dark:bg-blue-800/80' 
                            : 'bg-zinc-200/80 dark:bg-zinc-700/80 group-hover/tool:bg-zinc-300/80 dark:group-hover/tool:bg-zinc-600/80'
                        }`}>
                          {isSelected ? (
                            <EyeOff className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-4 p-3 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-lg"
                      >
                        <div className="space-y-3">
                          <div>
                            <h5 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2 flex items-center gap-2">
                              <Search className="w-3 h-3" />
                              INPUT
                            </h5>
                            <div className="bg-background/80 dark:bg-zinc-800/80 rounded-md p-2 border border-zinc-200/50 dark:border-zinc-700/50">
                              <div className="font-mono text-xs text-blue-600 dark:text-blue-400 mb-2 font-semibold">{tool.toolName}</div>
                              <pre className="text-xs text-zinc-600 dark:text-zinc-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                {JSON.stringify(tool.args, null, 2)}
                              </pre>
                            </div>
                          </div>
                          
                          {isCompleted && tool.result && (
                            <div>
                              <h5 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2 flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                OUTPUT
                              </h5>
                              <div className="bg-background/80 dark:bg-zinc-800/80 rounded-md p-2 border border-zinc-200/50 dark:border-zinc-700/50">
                                <pre className="text-xs text-zinc-600 dark:text-zinc-400 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                  {typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export const MemoizedToolCallGroup = memo(ToolCallGroup, (prevProps, nextProps) => {
  return equal(prevProps.batch, nextProps.batch);
});

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
        {message.role === 'assistant' && getAvatarUrl('assistant') && (
          <div className="absolute left-[-2.5] top-0 size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
            <div className="translate-y-px">
              <div className="w-6 h-6 relative rounded-full overflow-hidden">
                <Image 
                  src={getAvatarUrl('assistant')!} 
                  alt={`${displayName} Logo`} 
                  fill
                  className="object-cover"
                />
              </div>
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
                    showActions={true}
                    size="default"
                  />
                ))}
              </div>
            )}

            {/* Render parts in order, grouping consecutive tool calls */}
            {(() => {
              const renderedElements: React.ReactNode[] = [];
              let currentToolBatch: Array<any> = [];
              let toolBatchIndex = 0;

              const flushToolBatch = () => {
                if (currentToolBatch.length > 0) {
                  renderedElements.push(
                    <MemoizedToolCallGroup
                      key={`batch-${message.id}-${toolBatchIndex}`}
                      batch={currentToolBatch}
                    />
                  );
                  currentToolBatch = [];
                  toolBatchIndex++;
                }
              };

              message.parts?.forEach((part, index) => {
                const { type } = part;
                const key = `message-${message.id}-part-${index}`;

                if (type === 'reasoning') {
                  flushToolBatch(); // Flush any pending tool batch
                  renderedElements.push(
                    <MessageReasoning
                      key={key}
                      isLoading={isLoading}
                      reasoning={part.reasoning}
                    />
                  );
                }

                if (type === 'text') {
                  flushToolBatch(); // Flush any pending tool batch
                  
                  if (mode === 'view') {
                    renderedElements.push(
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
                    renderedElements.push(
                      <div key={key} className="flex flex-row gap-2 items-start">
                        <div className="size-8" />

                        <MessageEditor
                          key={message.id}
                          message={message}
                          chatId={chatId}
                          setMode={setMode}
                          setMessages={setMessages}
                          reload={reload}
                        />
                      </div>
                    );
                  }
                }

                if (type === 'tool-invocation') {
                  // Add to current batch
                  const { toolInvocation } = part;
                  currentToolBatch.push({
                    toolName: toolInvocation.toolName,
                    toolCallId: toolInvocation.toolCallId,
                    state: toolInvocation.state,
                    args: toolInvocation.args,
                    result: toolInvocation.state === 'result' ? (toolInvocation as any).result : undefined,
                  });
                }
              });

              // Flush any remaining tool batch
              flushToolBatch();

              return renderedElements;
            })()}

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

  // Get avatar URL from theme - only return if it actually exists
  const getAvatarUrl = () => {
    return chatbot?.theme?.config?.aiMessageAvatarUrl || null;
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
      
      {/* Avatar positioned absolutely outside content flow - only show if avatar exists */}
      {getAvatarUrl() && (
        <div className="absolute left-[-2.5] top-0 size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
          <div className="translate-y-px">
            <div className="w-6 h-6 relative rounded-full overflow-hidden">
              <Image 
                src={getAvatarUrl()!} 
                alt={`${displayName} Logo`} 
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main content area - perfectly aligned */}
      <div className="flex flex-col gap-4 w-full min-w-0">
          <div className="flex flex-col gap-4 text-muted-foreground fade-in-text">
            I'm thinking...
        </div>
      </div>
    </motion.div>
  );
};
