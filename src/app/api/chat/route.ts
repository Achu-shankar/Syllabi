import {
    type UIMessage,
    appendResponseMessages,
    createDataStreamResponse,
    embed,
    smoothStream,
    streamText,
    tool,
  } from 'ai';
  import { openai } from '@ai-sdk/openai';
  import { systemPrompt } from '@/app/chat/[chatbotId]/lib/prompt';
  import {
    generateUUID,
    getMostRecentUserMessage,
    getTrailingMessageId,
  } from '@/app/chat/[chatbotId]/lib/utils';

import { createClient } from '@/utils/supabase/server';
import { saveOrUpdateChatMessages } from '@/app/chat/[chatbotId]/lib/db/queries';
import { z } from 'zod';

  
  export const maxDuration = 60;
  
  export async function POST(request: Request) {
    try {
      const {
        id,
        messages,
        selectedChatModel,
        chatbotSlug,
      }: {
        id: string;
        messages: Array<UIMessage>;
        selectedChatModel: string;
        chatbotSlug: string;
      } = await request.json();

      
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
  
      // if (!user?.id) {
      //   return new Response('Unauthorized', { status: 401 });
      // }

      if (!chatbotSlug) {
        return new Response('Chatbot slug is required', { status: 400 });
      }

      const userMessage = getMostRecentUserMessage(messages)
      if (!userMessage) {
        return new Response('No user message found', { status: 400 });
      }

      if (user){
       await saveOrUpdateChatMessages(user.id, id, chatbotSlug, [userMessage]);
      }
  
  
      return createDataStreamResponse({
        execute: (dataStream) => {
          const result = streamText({
            model: openai('gpt-4.1'),
            system: systemPrompt,
            messages,
            maxSteps: 5,
            // toolChoice: 'required',
            // experimental_activeTools: ['getDspaDocs'],
            // experimental_activeTools:
            //   selectedChatModel === 'chat-model-reasoning'
            //     ? []
            //     : [
            //         'getWeather',
            //         'createDocument',
            //         'updateDocument',
            //         'requestSuggestions',
            //       ],
            experimental_transform: smoothStream({ chunking: 'word' }),
            experimental_generateMessageId: generateUUID,
            tools: {
              getDspaDocs: tool({
                description: 'Get information from your DSPA knowledge base to answer the user\'s question.',
                parameters: z.object({
                  query: z.string().describe('The search query to find relevant documents.'),
                }),
                execute: async ({ query }) => {
                  try {
                    // 1. Embed the query using OpenAI via AI SDK
                    const { embedding } = await embed({
                      model: openai.embedding('text-embedding-3-small'), // Ensure this model matches DB embeddings
                      value: query,
                    });

                    // 2. Call Supabase RPC function with the embedding
                    const { data, error } = await supabase.rpc('retrieve_dspa_docs', {
                      query_embedding: embedding, // Pass the generated embedding
                      num_docs: 5, // Keep the default or make it configurable?
                    });

                    if (error) {
                      console.error('Supabase RPC error:', error);
                      // Consider returning a more specific error message to the model
                      return { error: `Failed to retrieve documents: ${error.message}` };
                    }

                    // 3. Return the retrieved documents
                    // Ensure the returned data is serializable (usually is from Supabase)
                    console.log(`Retrieved ${data?.length ?? 0} documents for query: "${query}"`);
                    return { documents: data ?? [] }; // Return data under a 'documents' key

                  } catch (embeddingError) {
                    console.error('Embedding error:', embeddingError);
                    return { error: `Failed to create embedding for the query.` };
                  }
                },
              }),
            },
            onFinish: async ({ response }) => {
              if (user?.id) {
                try {
                  const assistantId = getTrailingMessageId({
                    messages: response.messages.filter(
                      (message) => message.role === 'assistant',
                    ),
                  });
  
                  if (!assistantId) {
                    throw new Error('No assistant message found!');
                  }
  
                  const [, assistantMessage] = appendResponseMessages({
                    messages: [userMessage],
                    responseMessages: response.messages,
                  });

                  await saveOrUpdateChatMessages(
                    user.id,
                    id,
                    chatbotSlug,
                    [assistantMessage]
                  );
                } catch (_) {
                  console.error('Failed to save chat');
                }
              }
            },
            // experimental_telemetry: {
            //   isEnabled: isProductionEnvironment,
            //   functionId: 'stream-text',
            // },
          });
  
          result.consumeStream();
  
          result.mergeIntoDataStream(dataStream, {
            sendReasoning: true,
          });
        },
        onError: () => {
          return 'Oops, an error occurred!';
        },
      });
    } catch (error) {
      return new Response('An error occurred while processing your request!', {
        status: 500,
      });
    }
  }
  