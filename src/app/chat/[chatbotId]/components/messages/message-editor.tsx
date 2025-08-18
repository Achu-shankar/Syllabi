'use client';

import { Message } from 'ai';
import { Button } from '@/components/ui/button';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { deleteTrailingMessages } from '../../lib/actions';
import { generateUUID } from '../../lib/utils';
import { createClient } from '@/utils/supabase/client';
import { UseChatHelpers } from '@ai-sdk/react';
import { toast } from 'sonner';

export type MessageEditorProps = {
  message: Message;
  chatId: string;
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
};

export function MessageEditor({
  message,
  chatId,
  setMode,
  setMessages,
  reload,
}: MessageEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [draftContent, setDraftContent] = useState<string>(message.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
    adjustHeight();
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <Textarea
        data-testid="message-editor"
        ref={textareaRef}
        className="bg-transparent outline-none overflow-hidden resize-none !text-base rounded-xl w-full"
        value={draftContent}
        onChange={handleInput}
      />

      <div className="flex flex-row gap-2 justify-end">
        <Button
          variant="outline"
          className="h-fit py-2 px-3"
          onClick={() => {
            setMode('view');
          }}
        >
          Cancel
        </Button>
        <Button
          data-testid="message-editor-send-button"
          variant="default"
          className="h-fit py-2 px-3"
          disabled={isSubmitting}
          onClick={async () => {
            setIsSubmitting(true);

            try {
              // Get current user for database operations
              const supabase = createClient();
              const { data: { user }, error: userError } = await supabase.auth.getUser();
              
              if (userError || !user) {
                toast.error('Authentication required to edit messages');
                setIsSubmitting(false);
                return;
              }

              // 🎯 ELEGANT SOLUTION: Generate new message ID for edited message
              const newMessageId = generateUUID();
              console.log(`[MessageEditor] Editing message ${message.id} → new ID: ${newMessageId}`);

              // Delete trailing messages from database (everything after this message)
              await deleteTrailingMessages({
                messageId: message.id,
                sessionId: chatId,
                userId: user.id
              });

              // Update local state with new message ID and content
              // @ts-expect-error todo: support UIMessage in setMessages
              setMessages((messages) => {
                const index = messages.findIndex((m) => m.id === message.id);

                if (index !== -1) {
                  const updatedMessage = {
                    ...message,
                    id: newMessageId,          // 🔑 NEW ID - prevents duplicate key error
                    content: draftContent,
                    parts: [{ type: 'text', text: draftContent }],
                  };

                  // Return messages up to the edited one, with the new message
                  return [...messages.slice(0, index), updatedMessage];
                }

                return messages;
              });

              setMode('view');
              
              // This will now INSERT the message with new ID (no conflicts!)
              reload();
              
            } catch (error) {
              console.error('[MessageEditor] Error editing message:', error);
              toast.error('Failed to edit message. Please try again.');
              setIsSubmitting(false);
            }
          }}
        >
          {isSubmitting ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
