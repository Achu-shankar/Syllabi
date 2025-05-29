import type {  Message } from '@ai-sdk/react';
import type { CoreAssistantMessage, CoreToolMessage} from 'ai';
import type { DBMessage } from './db/queries'; // Assuming it's in the same lib folder for simplicity
import { M } from 'framer-motion/dist/types.d-DDSxwf0n';

/**
 * Converts database message objects into the AI SDK Message format.
 * @param dbMessages - An array of message objects fetched from the database.
 * @returns An array of messages formatted for the AI SDK `useChat` hook.
 */
export function convertDbMessagesToUiMessages(dbMessages: DBMessage[] | null | undefined): Message[] {
  if (!dbMessages || dbMessages.length === 0) {
    return [];
  }

  return dbMessages.map((dbMsg): Message => {
    // Basic mapping
    const uiMessage: Message = {
      id: dbMsg.message_id, // Use the original SDK message ID stored in the DB
      role: dbMsg.role as 'user' | 'assistant' | 'system' | 'data', // Assert type to only supported roles
      content: dbMsg.content || '',
      createdAt: dbMsg.created_at ? new Date(dbMsg.created_at) : undefined,
    };

    // Add optional fields if they exist in the DB record and are not null/empty
    // Ensure correct parsing if these are stored as strings but expected as objects/arrays
    if (dbMsg.parts) {
      (uiMessage as any).parts = typeof dbMsg.parts === 'string'
        ? JSON.parse(dbMsg.parts)
        : dbMsg.parts;
    }
    
    if (dbMsg.experimental_attachments) {
      (uiMessage as any).experimental_attachments = typeof dbMsg.experimental_attachments === 'string'
        ? JSON.parse(dbMsg.experimental_attachments)
        : dbMsg.experimental_attachments;
    }

    return uiMessage;
  });
}


export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
export function getMostRecentUserMessage(messages: Array<Message>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}


type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}
