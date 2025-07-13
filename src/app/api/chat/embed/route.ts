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
import { buildSystemPrompt } from '@/app/chat/[chatbotId]/lib/prompt';
import {
  generateUUID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from '@/app/chat/[chatbotId]/lib/utils';

import { createClient } from '@/utils/supabase/server';
import { resolveClientBySlug } from '@/utils/supabase/resolveClient';
import { saveOrUpdateChatMessages, getChatbotConfig } from '@/app/chat/[chatbotId]/lib/db/queries';
import { calculateTokenCost } from '@/app/chat/[chatbotId]/lib/token-utils';
import { z } from 'zod';
import { getSkillsAsTools, getOptimalToolSelectionConfig } from '@/services/chat/tools-builder-v2';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
      chatbotSlug,
      selectedDocuments,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
      chatbotSlug: string;
      selectedDocuments?: string[];
    } = await request.json();

    console.log(`[Embedded Chat API] Processing embedded chat for chatbot: ${chatbotSlug}`);

    // Extract embedded-specific metadata
    const referrer = request.headers.get('referer') || request.headers.get('origin');
    const userAgent = request.headers.get('user-agent');
    
    // Create embedded session metadata
    const sessionMetadata = {
      source: 'embedded' as const,
      referrer: referrer || undefined,
      embeddedConfig: {
        userAgent: userAgent,
        timestamp: new Date().toISOString(),
        // Add any other embedded-specific config here
      }
    };

    console.log(`[Embedded Chat API] Session metadata:`, sessionMetadata);

    if (!chatbotSlug) {
      return new Response('Chatbot slug is required', { status: 400 });
    }

    const userMessage = getMostRecentUserMessage(messages)
    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    // Resolve the appropriate Supabase client based on chatbot visibility
    let supabase;
    try {
      supabase = await resolveClientBySlug(chatbotSlug);
    } catch (error) {
      console.error('[Embedded Chat API] Failed to resolve client:', error);
      return new Response('Chatbot not found', { status: 404 });
    }

    // Get chatbot details including visibility (this was already done in resolveClientBySlug)
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id, visibility')
      .eq('shareable_url_slug', chatbotSlug)
      .single();

    if (chatbotError || !chatbot) {
      return new Response('Chatbot not found', { status: 404 });
    }

    // Check if chatbot is accessible for embedding (must be public)
    if (chatbot.visibility !== 'public') {
      return new Response('Chatbot is not available for embedding', { status: 403 });
    }

    // For embedded chatbots, try to get user if available, but allow anonymous
    // Only try to get user if using user client (private chatbots)
    let userId = null;
    if (chatbot.visibility !== 'public') {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
      
      if (!userId) {
        return new Response('Authentication required for this chatbot', { status: 401 });
      }
    }

    const chatbotId = chatbot.id;

    // Fetch chatbot configuration (model, system prompt, temperature)
    let chatbotConfig;
    try {
      chatbotConfig = await getChatbotConfig(chatbotId);
      console.log(`[Embedded Chat API] Loaded config for chatbot ${chatbotId}:`, {
        model: chatbotConfig.ai_model_identifier,
        hasCustomPrompt: !!chatbotConfig.system_prompt,
        temperature: chatbotConfig.temperature,
      });
    } catch (configError) {
      console.error('Failed to fetch chatbot config:', configError);
      return new Response('Failed to load chatbot configuration', { status: 500 });
    }

    // Use configured model or fallback to default
    const modelToUse = chatbotConfig.ai_model_identifier || 'gpt-4o-mini';
    
    // Build system prompt with custom instructions
    const finalSystemPrompt = buildSystemPrompt(chatbotConfig.system_prompt);
    
    // Use configured temperature or fallback to default
    const temperatureToUse = chatbotConfig.temperature ?? 0.7;

    console.log(`[Embedded Chat API] Using model: ${modelToUse}, temperature: ${temperatureToUse}`);

    // Save user message with embedded metadata
    try {
      const extractProviderFromModel = (modelName: string): string => {
        if (modelName.startsWith('gpt-') || modelName.startsWith('o1-') || modelName.startsWith('chatgpt-')) {
          return 'openai';
        } else if (modelName.startsWith('claude-')) {
          return 'anthropic';
        } else if (modelName.startsWith('llama-') || modelName.startsWith('meta-')) {
          return 'meta';
        } else if (modelName.startsWith('gemini-')) {
          return 'google';
        }
        return 'unknown';
      };

      // Create metadata for user message
      const userMessageMetadata = {
        model: {
          provider: extractProviderFromModel(modelToUse),
          model: modelToUse,
          temperature: temperatureToUse
        },
        chatbotConfig: {
          chatbotId: chatbotId,
          systemPrompt: !!chatbotConfig.system_prompt
        },
        embedded: true, // Flag to indicate this is from embedded chatbot
        referrer: referrer,
        timestamp: new Date().toISOString()
      };

      // Add metadata to user message
      const enrichedUserMessage = {
        ...userMessage,
        metadata: userMessageMetadata
      };

      console.log(`[Embedded Chat API] User message metadata:`, JSON.stringify(userMessageMetadata, null, 2));

      // Rough token estimation for user message
      const estimatedUserTokens = Math.ceil(userMessage.content.length / 4);

      await saveOrUpdateChatMessages(
        userId, 
        id, 
        chatbotSlug, 
        [enrichedUserMessage], 
        estimatedUserTokens,
        sessionMetadata // Pass embedded session metadata
      );
    } catch (saveError) {
      console.error('[Embedded Chat API] Failed to save user message:', saveError);
      // Continue with the chat even if saving fails (for now)
    }

    // === SKILLS INTEGRATION ===
    // Build context for skill execution
    const skillExecutionContext = {
      skillId: '', // Will be set by individual skills
      chatSessionId: id,
      userId: userId || undefined,
      channel: 'embed' as const,
      testMode: false
    };

    // Get optimal tool selection configuration
    const toolSelectionConfig = await getOptimalToolSelectionConfig(
      chatbotId,
      chatbotConfig.tool_selection_method || undefined,
      userMessage.content
    );

    // Get skills as AI tools for this chatbot
    let skillsTools = {};
    let skillNames: string[] = [];
    try {
      skillsTools = await getSkillsAsTools(chatbotId, skillExecutionContext, toolSelectionConfig);
      skillNames = Object.keys(skillsTools);
      console.log(`[Embedded Chat API] Loaded ${skillNames.length} skills as tools for chatbot ${chatbotId} using ${toolSelectionConfig.method} method:`, skillNames);
    } catch (skillsError) {
      console.error('[Embedded Chat API] Failed to load skills as tools:', skillsError);
      // Continue without skills rather than failing the entire chat
    }

    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: openai(modelToUse),
          system: finalSystemPrompt,
          messages,
          temperature: temperatureToUse,
          maxSteps: 5,
          experimental_activeTools: [
            'getRelevantDocuments', 
            'listAvailableDocuments', 
            'getMultimediaContent',
            ...skillNames // Include dynamically loaded skills
          ] as any,
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            // === EXISTING KNOWLEDGE BASE TOOLS ===
            getRelevantDocuments: tool({
              description: 'Get information from the chatbot\'s knowledge base to answer the user\'s question.',
              parameters: z.object({
                query: z.string().describe('The a good search query to find relevant documents.'),
                contentTypes: z.array(z.enum(['document', 'url', 'video', 'audio'])).optional().describe('Specific content types to search. Defaults to all types.'),
                maxPerType: z.number().optional().describe('Maximum results per content type. Useful for balanced results.'),
              }),
              execute: async ({ query, contentTypes, maxPerType }) => {
                try {
                  // Use the same RAG functionality as the main chat API
                  const { embedding } = await embed({
                    model: openai.embedding('text-embedding-3-small'),
                    value: query,
                  });

                  const { data, error } = await supabase.rpc('match_document_chunks_enhanced', {
                    query_embedding: embedding,
                    chatbot_id_param: chatbotId,
                    match_threshold: 0.2,
                    match_count: 10,
                    content_types: contentTypes || ['document', 'url', 'video', 'audio'],
                    max_per_content_type: maxPerType || null,
                  });

                  if (error) {
                    console.error('Supabase RPC error:', error);
                    return { error: `Failed to retrieve documents: ${error.message}` };
                  }

                  console.log(`Retrieved ${data?.length ?? 0} document chunks for embedded query: "${query}"`);
                  return { 
                    documents: data?.map((chunk: any) => ({
                      chunk_id: chunk.chunk_id,
                      reference_id: chunk.reference_id,
                      page_number: chunk.page_number,
                      content: chunk.chunk_text,
                      token_count: chunk.token_count,
                      similarity: chunk.similarity,
                      content_type: chunk.content_type,
                      start_time_seconds: chunk.start_time_seconds,
                      end_time_seconds: chunk.end_time_seconds,
                      speaker: chunk.speaker,
                      chunk_type: chunk.chunk_type,
                      confidence_score: chunk.confidence_score,
                      created_at: chunk.created_at
                    })) ?? [] 
                  };

                } catch (embeddingError) {
                  console.error('Embedding error:', embeddingError);
                  return { error: `Failed to create embedding for the query.` };
                }
              },
            }),
            
            listAvailableDocuments: tool({
              description: 'List all documents available in the chatbot\'s knowledge base.',
              parameters: z.object({}),
              execute: async () => {
                try {
                  const { data, error } = await supabase
                    .from('chatbot_content_sources')
                    .select('file_name, uploaded_at, indexing_status')
                    .eq('chatbot_id', chatbotId)
                    .order('uploaded_at', { ascending: false });

                  if (error) {
                    console.error('Supabase query error:', error);
                    return { error: `Failed to retrieve document list: ${error.message}` };
                  }

                  console.log(`Retrieved ${data?.length ?? 0} documents for embedded chatbot: ${chatbotId}`);
                  return { 
                    documents: data?.map((doc: any) => ({
                      file_name: doc.file_name,
                      uploaded_at: doc.uploaded_at,
                      indexing_status: doc.indexing_status
                    })) ?? [] 
                  };

                } catch (queryError) {
                  console.error('Database query error:', queryError);
                  return { error: `Failed to query document list.` };
                }
              },
            }),

            getMultimediaContent: tool({
              description: 'Search specifically in video and audio content, optionally within specific time ranges.',
              parameters: z.object({
                query: z.string().describe('Search query for multimedia content.'),
                referenceId: z.string().optional().describe('Specific content source ID to search within.'),
                timeRangeStart: z.number().optional().describe('Start time in seconds to search from.'),
                timeRangeEnd: z.number().optional().describe('End time in seconds to search until.'),
              }),
              execute: async ({ query, referenceId, timeRangeStart, timeRangeEnd }) => {
                try {
                  const { embedding } = await embed({
                    model: openai.embedding('text-embedding-3-small'),
                    value: query,
                  });

                  const { data, error } = await supabase.rpc('match_multimedia_chunks_with_time', {
                    query_embedding: embedding,
                    chatbot_id_param: chatbotId,
                    reference_id_param: referenceId || null,
                    match_threshold: 0.2,
                    match_count: 8,
                    time_range_start: timeRangeStart || null,
                    time_range_end: timeRangeEnd || null,
                  });

                  if (error) {
                    console.error('Multimedia search error:', error);
                    return { error: `Failed to retrieve multimedia content: ${error.message}` };
                  }

                  console.log(`Retrieved ${data?.length ?? 0} multimedia chunks for embedded query: "${query}"`);
                  return { 
                    multimedia_content: data?.map((chunk: any) => ({
                      chunk_id: chunk.chunk_id,
                      reference_id: chunk.reference_id,
                      content: chunk.chunk_text,
                      similarity: chunk.similarity,
                      start_time_seconds: chunk.start_time_seconds,
                      end_time_seconds: chunk.end_time_seconds,
                      speaker: chunk.speaker,
                      chunk_type: chunk.chunk_type,
                      confidence_score: chunk.confidence_score,
                      time_range: `${Math.floor(chunk.start_time_seconds / 60)}:${(chunk.start_time_seconds % 60).toString().padStart(2, '0')} - ${Math.floor(chunk.end_time_seconds / 60)}:${(chunk.end_time_seconds % 60).toString().padStart(2, '0')}`
                    })) ?? [] 
                  };

                } catch (embeddingError) {
                  console.error('Multimedia embedding error:', embeddingError);
                  return { error: `Failed to create embedding for multimedia search.` };
                }
              },
            }),

            // === CHATBOT SKILLS/ACTIONS ===
            ...skillsTools,
          },
          onFinish: async ({ response, usage }) => {
            // Save assistant message for embedded session
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

              // Extract token usage and model information
              const tokenUsage = usage || {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0
              };

              const extractProviderFromModel = (modelName: string): string => {
                if (modelName.startsWith('gpt-') || modelName.startsWith('o1-') || modelName.startsWith('chatgpt-')) {
                  return 'openai';
                } else if (modelName.startsWith('claude-')) {
                  return 'anthropic';
                } else if (modelName.startsWith('llama-') || modelName.startsWith('meta-')) {
                  return 'meta';
                } else if (modelName.startsWith('gemini-')) {
                  return 'google';
                }
                return 'unknown';
              };

              const detectedProvider = extractProviderFromModel(modelToUse);
              const responseModel = response.modelId || modelToUse;

              // Create metadata object with embedded-specific information
              const messageMetadata = {
                tokenUsage: {
                  promptTokens: tokenUsage.promptTokens,
                  completionTokens: tokenUsage.completionTokens,
                  totalTokens: tokenUsage.totalTokens
                },
                cost: calculateTokenCost(tokenUsage, modelToUse),
                model: {
                  provider: detectedProvider,
                  model: responseModel,
                  temperature: temperatureToUse,
                  requestedModel: modelToUse
                },
                response: {
                  id: response.id || null,
                  timestamp: new Date().toISOString()
                },
                chatbotConfig: {
                  chatbotId: chatbotId,
                  systemPrompt: !!chatbotConfig.system_prompt
                },
                embedded: true, // Flag to indicate this is from embedded chatbot
                referrer: referrer
              };

              // Update the assistant message with metadata
              const enrichedAssistantMessage = {
                ...assistantMessage,
                metadata: messageMetadata
              };

              console.log(`[Embedded Chat API] Assistant message metadata:`, JSON.stringify(messageMetadata, null, 2));

              await saveOrUpdateChatMessages(
                userId, // null for embedded (anonymous)
                id,
                chatbotSlug,
                [enrichedAssistantMessage],
                tokenUsage.totalTokens,
                sessionMetadata // Pass embedded session metadata
              );

              console.log(`[Embedded Chat API] Saved assistant message with ${tokenUsage.totalTokens} tokens (${tokenUsage.promptTokens} prompt + ${tokenUsage.completionTokens} completion)`);
            } catch (saveError) {
              console.error('[Embedded Chat API] Failed to save assistant message:', saveError);
            }
          },
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
    console.error('[Embedded Chat API] Unexpected error:', error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
} 