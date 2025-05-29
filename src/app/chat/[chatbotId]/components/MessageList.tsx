import React, { useEffect, useRef, memo } from 'react';
import type { Message } from '@ai-sdk/react'; // Import Message type
import { ScrollArea } from "@/components/ui/scroll-area"; // Assuming shadcn/ui ScrollArea
import { Bot, User, LoaderIcon, Paperclip } from 'lucide-react'; // Icons for roles and LoaderIcon
import Image from 'next/image'; // For rendering image attachments

// Import the new memoized component
import { MemoizedMarkdown } from './messages/MemoizedMarkdown';

// Define props for MessageList
interface MessageListProps {
  sessionId: string;
  messages: Message[]; // Add messages prop
  status: "submitted" | "streaming" | "ready" | "error"; // Add status prop
}

// Define Attachment type locally if needed
type Attachment = { name?: string; contentType?: string; url: string };

// --- Render different message parts (modified) ---
const renderTextPart = (part: any, index: number, messageId: string) => (
  // Apply serif font and adjust prose styling for better spacing
  <div key={`${messageId}-text-${index}`} className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-1">
    <MemoizedMarkdown content={part.text} id={`${messageId}-text-${index}`} />
  </div>
);

// Tool invocation parts are no longer rendered directly
// const renderToolInvocationPart = (...) => { ... };

const renderAttachment = (attachment: Attachment, index: number, messageId: string) => {
    const isImage = attachment?.contentType?.startsWith('image/');
    return (
      <div key={`${messageId}-att-${index}`} className="mt-2 first:mt-0">
        {isImage ? (
          <Image
            src={attachment.url}
            width={300}
            height={200}
            alt={attachment.name ?? `attachment-${index}`}
            className="rounded border border-gray-200 dark:border-zinc-700"
          />
        ) : (
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 text-xs bg-gray-50 dark:bg-zinc-800 rounded border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 hover:dark:bg-zinc-700 hover:border-gray-300 hover:dark:border-zinc-600 transition-colors"
          >
            <Paperclip size={12} />
            <span className="font-sans">{attachment.name || 'Attached File'}</span>
            {attachment.contentType && <span className="text-gray-500 dark:text-gray-400 font-sans">({attachment.contentType})</span>}
          </a>
        )}
      </div>
    );
};
// --- End Render different message parts ---

// Individual Message Component
const MessageItem = memo(({ message }: { message: Message }) => {
  const isUser = message.role === 'user';

  // Filter parts we know how to render and want to show
  const partsToRender = message.parts?.filter(part => part.type === 'text') ?? [];
  const contentToRender = partsToRender.length > 0 ? null : message.content;

  return (
    <div className={`flex gap-3 my-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
       {/* Assistant Icon */}
       {!isUser && (
         <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center self-start mt-1">
           <Bot size={18} className="text-gray-600 dark:text-gray-300" />
         </div>
       )}

       {/* Message Bubble */}
       <div
         className={`p-4 rounded-xl max-w-[75%] text-sm relative shadow-sm ${ 
           isUser
             ? 'bg-primary/90 text-primary-foreground' 
             : 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-zinc-700'
         }`}
       >
         {/* Render filtered parts */}
         {partsToRender.map((part, index) => {
             // Since we filtered, we know it's 'text'
             return renderTextPart(part, index, message.id);
         })}

         {/* Render fallback content only if no parts were rendered AND content exists */}
         {!partsToRender.length && contentToRender && (
             <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-1 font-serif">
                {isUser ? (
                   <p className="my-0">{contentToRender}</p>
                 ) : (
                   <MemoizedMarkdown content={contentToRender} id={message.id} />
                 )}
             </div>
         )}

         {/* Render Attachments */}
         {message.experimental_attachments && message.experimental_attachments.length > 0 && (
            <div className="mt-3 space-y-2"> {/* Increased spacing */}
                 {message.experimental_attachments.map((att, index) => renderAttachment(att, index, message.id))}
            </div>
         )}
       </div>

        {/* User Icon */}
        {isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center self-end mb-1">
              <User size={18} className="text-blue-700 dark:text-blue-300" />
            </div>
        )}
    </div>
  );
});
MessageItem.displayName = 'MessageItem';

// Import the status indicator
import StatusIndicator from './StatusIndicator';
import { AnimatePresence } from 'framer-motion';

const MessageList: React.FC<MessageListProps> = ({ sessionId, messages, status }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Slightly delay scrollIntoView to allow layout adjustments
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const lastMessageIsUser = messages.length > 0 && messages[messages.length - 1].role === 'user';
  const showThinkingIndicator = lastMessageIsUser && (status === 'submitted' || status === 'streaming');

  // --- Add Logging ---
//   console.log('[MessageList Render]', {
//       messageCount: messages.length,
//       lastMessageRole: messages[messages.length - 1]?.role,
//       status: status,
//       lastMessageIsUser: lastMessageIsUser,
//       showThinkingIndicator: showThinkingIndicator
//   });
  // --- End Logging ---

  // TODO: Refine logic to show "Calling tool..." if a tool call is detected in the stream

  if (messages.length === 0 && status === 'ready') { // Only show prompt if ready and no messages
    return (
      <div className="flex-1 w-full h-full overflow-y-auto p-4 flex items-center justify-center">
        <p className="text-center text-gray-500 dark:text-gray-400">Send a message to start the conversation.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 w-full h-full overflow-y-auto" ref={scrollAreaRef}>
      <div className="p-4 space-y-1 w-full max-w-5xl mx-auto">
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}

        {/* Animated Status Indicator */}
        <AnimatePresence>
          {showThinkingIndicator && <StatusIndicator text="Thinking..." />}
        </AnimatePresence>

        <div ref={messagesEndRef} className="h-1" />
      </div>
    </ScrollArea>
  );
};

export default MessageList;
 
