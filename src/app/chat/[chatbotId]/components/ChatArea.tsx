'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChat, type Message, type CreateMessage } from '@ai-sdk/react';
import { useParams } from 'next/navigation'; // To get projectId
import { useQueryClient } from '@tanstack/react-query'; // <-- Import useQueryClient
import { createClient } from '@/utils/supabase/client';
// import { CodeRuntimesProvider } from '../lib/useCodeRuntimes'; // Import the provider

import MessageList from './MessageList';
import { MultimodalInput } from './multimodal-input';
import { useFetchInitialMessages } from '../lib/hooks'; // Import the new hook
import { generateUUID } from '../lib/utils';
import { Messages } from './messages/messages';

// Define local Attachment type if not exported by SDK
type Attachment = {
  name?: string;
  contentType?: string;
  url: string;
};


interface ChatAreaProps {
  activeSessionId: string | null;
  chatbotSlug: string;
  initialMessages: Message[];
}

export default function ChatArea({ activeSessionId, initialMessages, chatbotSlug }: ChatAreaProps) {
   // Get the chatbot slug from URL params
  
  const queryClient = useQueryClient();

  // Ref to store the last *user* message just before submission
  const lastSubmittedUserMessageRef = useRef<Message | null>(null);

  // Type for user data
  interface User {
    id: string;
    [key: string]: any;
  }
  
  const [user, setUser] = useState<User | null>(null);
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
    error,
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
            onFinish: (assistantMessage) => {
              queryClient.invalidateQueries({ queryKey: ['sessionList'] })
            },
            onError: (err) => {
              console.error("Chat error:", err);
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
        className="flex-1 flex flex-col h-full w-full overflow-hidden"
        style={{ 
          backgroundColor: 'var(--chat-chat-window-background-color,rgb(0, 0, 0))', 
          fontFamily: 'var(--chat-font-family, inherit)' 
        }}
      >
        {/* <MessageList
          key={`msg-${activeSessionId}`} // Key ensures component remounts on session change
          sessionId={activeSessionId || ''}
          messages={messages}
          status={status}
        /> */}
        {/* <CodeRuntimesProvider> */}
          <Messages
            chatId={activeSessionId || ''}
            status={status}
            messages={messages}
            setMessages={setMessages}
            reload={reload}
            isReadonly={false}
          />
        {/* </CodeRuntimesProvider> */}
        <div className="w-full max-w-5xl mx-auto px-4">
          <MultimodalInput
            key={`input-${activeSessionId}`}
            chatId={activeSessionId || ''}
            chatbotSlug={chatbotSlug}
            input={input}
            setInput={setInput}
            status={status}
            stop={stop}
            messages={messages}
            setMessages={setMessages}
            append={append}
            handleSubmit={originalHandleSubmit}
            className="px-4 py-3 border-t dark:border-zinc-700"
          />
        </div>
      </div>
    
  );
};


