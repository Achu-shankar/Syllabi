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
  import { buildExternalChannelPrompt } from '@/lib/external-chat-prompts';
  import {
    generateUUID,
    getMostRecentUserMessage,
    getTrailingMessageId,
  } from '@/app/chat/[chatbotId]/lib/utils';

import { createServiceClient } from '@/utils/supabase/service';
import { saveOrUpdateChatMessages, getChatbotConfig } from '@/app/chat/[chatbotId]/lib/db/queries';
import { calculateTokenCost } from '@/app/chat/[chatbotId]/lib/token-utils';
import { z } from 'zod';
import { getSkillsAsTools, getOptimalToolSelectionConfig } from '@/services/chat/tools-builder-v2';
import { checkAndIncrementRateLimit } from '@/services/rate-limiting/rate-limiter';

  
export const maxDuration = 60;

// Channel types supported by external integrations
export type ExternalChannel = 'slack' | 'discord' | 'teams' | 'sms';

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      chatbotId,
      channel,
      workspaceId,
      externalUserId,
      selectedChatModel,
      selectedDocuments,
    }: {
      id: string;
      messages: Array<UIMessage>;
      chatbotId: string;
      channel: ExternalChannel;
      workspaceId?: string;
      externalUserId?: string;
      selectedChatModel?: string;
      selectedDocuments?: string[];
    } = await request.json();

    console.log(`[External Chat API] Request from ${channel} channel for chatbot ${chatbotId}`);
    console.log(`[External Chat API] External user: ${externalUserId}, Workspace: ${workspaceId}`);

    // Use service client for external integrations (no user auth required)
    const supabase = createServiceClient();

    if (!chatbotId) {
      return new Response('Chatbot ID is required', { status: 400 });
    }

    if (!channel) {
      return new Response('Channel is required', { status: 400 });
    }

    const userMessage = getMostRecentUserMessage(messages);
    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    // Get chatbot to verify it exists
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id, shareable_url_slug')
      .eq('id', chatbotId)
      .single();

    if (chatbotError || !chatbot) {
      return new Response('Chatbot not found', { status: 404 });
    }

    // Fetch chatbot configuration (model, system prompt, temperature)
    let chatbotConfig;
    try {
      chatbotConfig = await getChatbotConfig(chatbotId);
      console.log(`[External Chat API] Loaded config for chatbot ${chatbotId}:`, {
        model: chatbotConfig.ai_model_identifier,
        hasCustomPrompt: !!chatbotConfig.system_prompt,
        temperature: chatbotConfig.temperature,
      });
    } catch (configError) {
      console.error('Failed to fetch chatbot config:', configError);
      return new Response('Failed to load chatbot configuration', { status: 500 });
    }

    // === RATE LIMITING ===
    // Check rate limit before processing the request
    // For external integrations, use externalUserId if available, otherwise session_id
    const identifier = externalUserId || id;
    const identifierType = 'session'; // Treat all external users as sessions

    const rateLimitResult = await checkAndIncrementRateLimit(
      chatbotId,
      identifier,
      identifierType
    );

    if (!rateLimitResult.allowed) {
      const defaultMessage = rateLimitResult.limit_type === 'hour'
        ? 'You have reached your hourly message limit. Please try again in a few minutes.'
        : 'You have reached your daily message limit. Please try again tomorrow.';

      const message = rateLimitResult.custom_message || defaultMessage;

      console.log(`[External Chat API] Rate limit exceeded for ${channel} user ${identifier}: ${message}`);

      return new Response(
        JSON.stringify({
          error: 'RATE_LIMIT_EXCEEDED',
          message,
          limit_type: rateLimitResult.limit_type,
          remaining_hour: rateLimitResult.remaining_hour,
          remaining_day: rateLimitResult.remaining_day
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.limit_type === 'hour' ? '3600' : '86400'
          }
        }
      );
    }

    console.log(`[External Chat API] Rate limit check passed for ${channel} user ${identifier}. Remaining: ${rateLimitResult.remaining_hour}/hour, ${rateLimitResult.remaining_day}/day`);

    // Use configured model or fallback to default
    const modelToUse = chatbotConfig.ai_model_identifier || 'gpt-4o-mini';
    
    // Build system prompt with custom instructions AND channel-specific rules
    const finalSystemPrompt = buildExternalChannelPrompt(
      chatbotConfig.system_prompt,
      channel
    );
    
    // Use configured temperature or fallback to default
    const temperatureToUse = chatbotConfig.temperature ?? 0.7;

    console.log(`[External Chat API] Using model: ${modelToUse}, temperature: ${temperatureToUse}, channel: ${channel}`);

    // Create session metadata for external channel sessions
    // Note: Using 'full' as source since 'external' is not supported by the current type
    const sessionMetadata = {
      source: 'full' as const,
      referrer: request.headers.get('referer') || undefined,
      embeddedConfig: {
        channel: channel,
        workspaceId: workspaceId || undefined,
        externalUserId: externalUserId || undefined,
      },
    };

    // Save user message (no authenticated user, use external identifiers)
    console.log(`[External Chat API] External user: ${externalUserId || 'anonymous'} via ${channel}`);
    
    try {
      // Extract provider from model string for consistency
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
        channel: {
          type: channel,
          workspaceId: workspaceId,
          externalUserId: externalUserId
        },
        timestamp: new Date().toISOString()
      };

      // Add metadata to user message
      const enrichedUserMessage = {
        ...userMessage,
        metadata: userMessageMetadata
      };

      console.log(`[External Chat API] User message metadata:`, JSON.stringify(userMessageMetadata, null, 2));

      // Rough token estimation for user message
      const estimatedUserTokens = Math.ceil(userMessage.content.length / 4);

      await saveOrUpdateChatMessages(
        null, // No authenticated user for external channels
        id,
        chatbot.shareable_url_slug,
        [enrichedUserMessage],
        estimatedUserTokens,
        sessionMetadata
      );
    } catch (saveError) {
      console.error('[External Chat API] Failed to save user message:', saveError);
      // Continue with the chat even if saving fails
    }

    // === SKILLS INTEGRATION ===
    // Build context for skill execution
    // Map external channels to supported skill execution channels
    const mapChannelForSkills = (channel: ExternalChannel): 'web' | 'embed' | 'slack' | 'discord' | 'api' => {
      switch (channel) {
        case 'slack':
          return 'slack';
        case 'discord':
          return 'discord';
        case 'teams':
        case 'sms':
          return 'api'; // Use 'api' for unsupported channels
        default:
          return 'api';
      }
    };

    const skillExecutionContext = {
      skillId: '', // Will be set by individual skills
      chatSessionId: id,
      userId: undefined, // No authenticated user for external channels
      chatbotId: chatbotId, // Add chatbotId for integration lookup
      channel: mapChannelForSkills(channel),
      testMode: false,
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
      console.log(`[External Chat API] Loaded ${skillNames.length} skills as tools for chatbot ${chatbotId} using ${toolSelectionConfig.method} method:`, skillNames);
    } catch (skillsError) {
      console.error('[External Chat API] Failed to load skills as tools:', skillsError);
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
                  // 1. Embed the query using OpenAI via AI SDK
                  const { embedding } = await embed({
                    model: openai.embedding('text-embedding-3-small'),
                    value: query,
                  });

                  // 2. Call the enhanced Supabase RPC function with multimedia support
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

                  // 3. Return the retrieved document chunks with enhanced multimedia metadata
                  console.log(`Retrieved ${data?.length ?? 0} document chunks for query: "${query}"`);
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
              parameters: z.object({}), // No parameters needed
              execute: async () => {
                try {
                  // Query the chatbot_content_sources table for all documents
                  const { data, error } = await supabase
                    .from('chatbot_content_sources')
                    .select('file_name, uploaded_at, indexing_status')
                    .eq('chatbot_id', chatbotId)
                    .order('uploaded_at', { ascending: false });

                  if (error) {
                    console.error('Supabase query error:', error);
                    return { error: `Failed to retrieve document list: ${error.message}` };
                  }

                  // Return the list of available documents
                  console.log(`Retrieved ${data?.length ?? 0} documents for chatbot: ${chatbotId}`);
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
              description: 'Search specifically in video and audio content, optionally within specific time ranges. Useful for finding specific moments in multimedia content.',
              parameters: z.object({
                query: z.string().describe('Search query for multimedia content.'),
                referenceId: z.string().optional().describe('Specific content source ID to search within.'),
                timeRangeStart: z.number().optional().describe('Start time in seconds to search from.'),
                timeRangeEnd: z.number().optional().describe('End time in seconds to search until.'),
              }),
              execute: async ({ query, referenceId, timeRangeStart, timeRangeEnd }) => {
                try {
                  // 1. Embed the query using OpenAI via AI SDK
                  const { embedding } = await embed({
                    model: openai.embedding('text-embedding-3-small'),
                    value: query,
                  });

                  // 2. Call the multimedia-specific Supabase RPC function
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

                  // 3. Return multimedia chunks with time information
                  console.log(`Retrieved ${data?.length ?? 0} multimedia chunks for query: "${query}"`);
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
                      // Format time for better readability
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
            // Save assistant message for external channels
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

              // Extract detailed token usage and model information
              const tokenUsage = usage || {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0
              };

              // Extract provider from model string
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

              // Create metadata object with detailed information
              const messageMetadata = {
                // Token usage details
                tokenUsage: {
                  promptTokens: tokenUsage.promptTokens,
                  completionTokens: tokenUsage.completionTokens,
                  totalTokens: tokenUsage.totalTokens
                },
                // Cost calculation
                cost: calculateTokenCost(tokenUsage, modelToUse),
                // Model and provider information
                model: {
                  provider: detectedProvider,
                  model: responseModel,
                  temperature: temperatureToUse,
                  requestedModel: modelToUse
                },
                // Response metadata
                response: {
                  id: response.id || null,
                  timestamp: new Date().toISOString()
                },
                // Channel information (stored in custom metadata since sessionMetadata is typed)
                channel: {
                  type: channel,
                  workspaceId: workspaceId,
                  externalUserId: externalUserId
                },
                // Save the chatbot configuration used
                chatbotConfig: {
                  chatbotId: chatbotId,
                  systemPrompt: !!chatbotConfig.system_prompt
                }
              };

              // Update the assistant message with metadata
              const enrichedAssistantMessage = {
                ...assistantMessage,
                metadata: messageMetadata
              };

              console.log(`[External Chat API] Assistant message metadata:`, JSON.stringify(messageMetadata, null, 2));

                await saveOrUpdateChatMessages(
                null, // No authenticated user for external channels
                  id,
                  chatbot.shareable_url_slug,
                [enrichedAssistantMessage],
                tokenUsage.totalTokens,
                sessionMetadata
              );

              console.log(`[External Chat API] Saved assistant message with ${tokenUsage.totalTokens} tokens (${tokenUsage.promptTokens} prompt + ${tokenUsage.completionTokens} completion)`);
            } catch (saveError) {
              console.error('Failed to save assistant message:', saveError);
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
    console.error('[External Chat API] Error:', error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
} 