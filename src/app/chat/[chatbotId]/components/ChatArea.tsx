'use client';

import React, { useEffect, useState } from 'react';
import { useChat, type Message } from '@ai-sdk/react';
import type { Attachment } from 'ai';
import { useQueryClient } from '@tanstack/react-query'; // <-- Import useQueryClient
import { createClient } from '@/utils/supabase/client';
// import { CodeRuntimesProvider } from '../lib/useCodeRuntimes'; // Import the provider

import { MultimodalInput } from './multimodal-input';
import { generateUUID } from '../lib/utils';
import { Messages } from './messages/messages';
import { Greeting } from './messages/greeting';


interface ChatAreaProps {
  activeSessionId: string | null;
  chatbotSlug: string;
  initialMessages: Message[];
}

export default function ChatArea({ activeSessionId, initialMessages, chatbotSlug }: ChatAreaProps) {
   // Get the chatbot slug from URL params
  
  const queryClient = useQueryClient();

  // Type for user data
  interface User {
    id: string;
    [key: string]: any;
  }
  
  const [user, setUser] = useState<User | null>(null);
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
  }, []);



  const {
    messages,
    input,
    setInput,
    handleSubmit: originalHandleSubmit,
    append,
    status,
    stop,
    setMessages, 
    reload,
  } = useChat({
            api: '/api/chat', 
            id: activeSessionId!, 
            initialMessages: initialMessages,
            experimental_throttle: 50, 
            sendExtraMessageFields: true,
            generateId: generateUUID,
            body: {
              chat_session_id: activeSessionId,
              chatbotSlug: chatbotSlug, // Pass the chatbot slug to the API
            },
            onFinish: () => {
              queryClient.invalidateQueries({ queryKey: ['sessionList'] })
            },
            onError: async (err) => {
              console.error("Chat error:", err);

              // Try to parse the error response
              let errorMessage = '⚠️ Sorry, something went wrong. Please try again.';
              let isRateLimitError = false;

              try {
                // Check if it's a Response object (fetch error)
                if (err instanceof Response) {
                  if (err.status === 429) {
                    const errorData = await err.json();
                    errorMessage = errorData.message || 'You have reached your message limit. Please try again later.';
                    isRateLimitError = true;
                  }
                }
                // Check if it's an Error with a message
                else if (err instanceof Error) {
                  // Try to parse the error message as JSON (in case it's a stringified response)
                  try {
                    const parsedError = JSON.parse(err.message);
                    if (parsedError.error === 'RATE_LIMIT_EXCEEDED') {
                      errorMessage = parsedError.message;
                      isRateLimitError = true;
                    }
                  } catch {
                    // Not a JSON error, use the error message directly
                    errorMessage = err.message || errorMessage;
                  }
                }
              } catch (parseError) {
                console.error("Error parsing error response:", parseError);
              }

              // Add a fallback assistant message locally without triggering another API call
              const fallbackMessage: Message = {
                id: generateUUID(),
                role: 'assistant',
                content: isRateLimitError
                  ? `🚫 ${errorMessage}`
                  : `⚠️ ${errorMessage}`,
                createdAt: new Date(),
              };
              setMessages((prev) => [...prev, fallbackMessage]);
            },
            // experimental_attachments: true, // Enable if needed for backend processing via body
  });


  // If no session is active, we might want to show a welcome message or prompt
  // if (!activeSessionId) {
  //   return (
  //     <div className="flex-1 flex items-center justify-center p-4 bg-gray-50 dark:bg-zinc-900 text-gray-500 dark:text-gray-400">
  //       <p>Select a session or start a new chat.</p>
  //     </div>
  //   );
  // }

  // Otherwise, render the message list and input area for the active session
  return (
   
      <div 
        className="flex-1 flex flex-col h-full w-full overflow-auto"
        style={{ 
          backgroundColor: 'var(--chat-chat-window-background-color,rgb(0, 0, 0))', 
          fontFamily: 'var(--chat-font-family, inherit)' 
        }}
      >
        {messages.length === 0 ? (
          // Centered layout for home page
          <div className="flex-1 flex flex-col items-center w-full max-w-4xl mx-auto px-4 sm:px-10 pt-48 pb-8">
            <div className="flex flex-col items-center w-full space-y-6 sm:space-y-8">
              <Greeting />
              <div className="w-full max-w-3xl">
                <MultimodalInput
                  key={`input-${activeSessionId}`}
                  chatId={activeSessionId || ''}
                  chatbotSlug={chatbotSlug}
                  input={input}
                  setInput={setInput}
                  status={status}
                  stop={stop}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  messages={messages}
                  setMessages={setMessages}
                  append={append}
                  handleSubmit={originalHandleSubmit}
                  className=""
                />
              </div>
            </div>
          </div>
        ) : (
          // Regular chat layout
          <>
            {/* <MessageList
              key={`msg-${activeSessionId}`} // Key ensures component remounts on session change
              sessionId={activeSessionId || ''}
              messages={messages}
              status={status}
            /> */}
            {/* <CodeRuntimesProvider> */}
            {messages.length > 0 && (
              <Messages
                chatId={activeSessionId || ''}
                status={status}
                messages={messages}
                setMessages={setMessages}
                reload={reload}
                isReadonly={false}
              />
            )}
            {/* </CodeRuntimesProvider> */}
            <div className="w-full max-w-4xl mx-auto px-4 sm:px-10">
              <MultimodalInput
                key={`input-${activeSessionId}`}
                chatId={activeSessionId || ''}
                chatbotSlug={chatbotSlug}
                input={input}
                setInput={setInput}
                status={status}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                setMessages={setMessages}
                append={append}
                handleSubmit={originalHandleSubmit}
                className="px-4 py-3 border-t dark:border-zinc-700"
              />
            </div>
          </>
        )}
      </div>
    
  );
};


