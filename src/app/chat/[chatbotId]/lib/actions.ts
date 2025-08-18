'use server';

import { generateText, Message } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function generateTitleFromUserMessage({
  message,
}: {
  message: Message | undefined;
}) {
  // Handle case where message is undefined or invalid
  if (!message || !message.content || typeof message.content !== 'string') {
    console.warn('[Actions] generateTitleFromUserMessage called with invalid message:', message);
    return 'New Chat';
  }

  try {
    const { text: title } = await generateText({
      model: openai('gpt-4o-mini'), 
      system: `\n
      - you will generate a short title based on the first message a user begins a conversation with
      - ensure it is not more than 80 characters long
      - the title should be a summary of the user's message
      - do not use quotes or colons
      - And include an icon or emoji at the beginning of the title`,
      prompt: message.content, // Use just the content, not the entire JSON object
      temperature: 0.7,
    });
  
    return title || 'New Chat'; // Fallback if title generation returns empty
  } catch (error) {
    console.error('[Actions] Error generating title:', error);
    // Fallback to a simple title based on message content
    const content = message.content.substring(0, 50);
    return content.length < message.content.length ? `${content}...` : content;
  }
}

export async function deleteTrailingMessages({ 
  messageId, 
  sessionId, 
  userId 
}: { 
  messageId: string;
  sessionId: string;
  userId: string;
}) {
  const { getMessageById, deleteMessagesAfterTimestamp } = await import('./db/queries');
  
  try {
    // Get the message to find its timestamp
    const message = await getMessageById(messageId, userId);
    
    if (!message) {
      console.warn(`[Actions] Message ${messageId} not found for user ${userId}`);
      return; // Message doesn't exist, nothing to delete after
    }

    // Delete all messages created after this message's timestamp
    await deleteMessagesAfterTimestamp(userId, sessionId, message.created_at);
    console.log(`[Actions] Successfully deleted trailing messages after ${messageId}`);
    
  } catch (error) {
    console.error(`[Actions] Error deleting trailing messages:`, error);
    throw error;
  }
}