'use server';

import { generateText, Message } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function generateTitleFromUserMessage({
    message,
  }: {
    message: Message;
  }) {
    const { text: title } = await generateText({
      model: openai('gpt-4.1-mini'),
      system: `\n
      - you will generate a short title based on the first message a user begins a conversation with
      - ensure it is not more than 80 characters long
      - the title should be a summary of the user's message
      - do not use quotes or colons
      - And include an icon or emoji at the begginning of the title`,
      prompt: JSON.stringify(message),
      temperature: 0.7,
    });
  
    return title;
  }

  // export async function deleteTrailingMessages({ id }: { id: string }) {
  //   const [message] = await getMessageById({ id });
  
  //   await deleteMessagesByChatIdAfterTimestamp({
  //     chatId: message.chatId,
  //     timestamp: message.createdAt,
  //   });
  // }