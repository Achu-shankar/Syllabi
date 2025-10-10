import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import jwt from 'jsonwebtoken';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// LLM-powered routing utility
const RoutingSchema = z.object({
  picked_trigger: z.string().nullable(),    // e.g. "finance", null = no trigger found
  is_switch_intent: z.boolean(),            // true if user just wants to switch bots
  user_question: z.string(),                // plain question with trigger words stripped
});

async function parseUtteranceWithLLM(utterance: string, availableTriggers: Array<{trigger: string, chatbot_id: string}>) {
  try {
    // Build the trigger list for the prompt
    const triggerList = availableTriggers
      .map((t, i) => `${i + 1}. ${t.trigger}`)
      .join('\n');
    
    const { object } = await generateObject({
      model: openai('gpt-4.1'),
      temperature: 0, // Deterministic
      schema: RoutingSchema,
      system: `You are a router that decides which chatbot should answer a spoken Alexa request.
Here are the available chatbot trigger names:

${triggerList}

Rules:
- If the user mentions one of these trigger names, return that EXACT trigger name in picked_trigger
- If no trigger is mentioned, set picked_trigger to null
- If user just wants to switch bots (like "open finance bot"), set is_switch_intent to true and user_question to empty
- Always strip trigger words from user_question when a trigger is found
- Return only the trigger NAME, never return UUIDs or IDs

Examples:
- "ask cbot about revenue" → picked_trigger: "cbot", user_question: "about revenue"
- "what's my budget" → picked_trigger: null, user_question: "what's my budget"
- "switch to cbot" → picked_trigger: "cbot", is_switch_intent: true, user_question: ""`,
      prompt: utterance,
    });
    
    return object;
    
  } catch (error) {
    console.error('[Alexa Skill] LLM routing error:', error);
    
    // Fallback to simple regex if LLM fails
    const firstWord = utterance.split(' ')[0].toLowerCase();
    const matchedTrigger = availableTriggers.find(t => 
      t.trigger.toLowerCase() === firstWord
    );
    
    if (matchedTrigger) {
      return {
        picked_trigger: matchedTrigger.trigger,
        is_switch_intent: utterance.trim().split(' ').length === 1,
        user_question: utterance.substring(firstWord.length).trim()
      };
    }
    
    return {
      picked_trigger: null,
      is_switch_intent: false,
      user_question: utterance
    };
  }
}

// Authentication & User Resolution
async function resolveAlexaUser(accessToken: string, amazonUserId: string, sessionAttributes: any = {}) {
  const supabase = createServiceClient();
  
  // Check if we already have cached user info in session
  if (sessionAttributes.alexa_account_id && sessionAttributes.user_id) {
    return {
      user_id: sessionAttributes.user_id,
      alexa_account_id: sessionAttributes.alexa_account_id
    };
  }
  
  try {
    // Decode JWT to get user_id and alexa_account_id
    console.log('[Alexa Skill] JWT decode attempt with token length:', accessToken.length);
    
    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }
    
    console.log('[Alexa Skill] Using JWT secret:', jwtSecret ? 'present' : 'missing');
    
    const decoded = jwt.verify(accessToken, jwtSecret) as { 
      sub: string; // This is the user_id 
      user_id: string;
      integration_id: string; // This is the alexa_account_id
      alexa_account_id?: string; // Fallback field
    };
    
    console.log('[Alexa Skill] JWT decoded successfully:', {
      sub: decoded.sub,
      user_id: decoded.user_id,
      integration_id: decoded.integration_id,
      alexa_account_id: decoded.alexa_account_id,
      allKeys: Object.keys(decoded)
    });
    
    const user_id = decoded.sub || decoded.user_id;
    const alexa_account_id = decoded.integration_id || decoded.alexa_account_id;
    
    // Update the amazon_user_id if we don't have it yet
    const { error: updateError } = await supabase
      .from('connected_integrations')
      .update({ 
        metadata: { amazon_user_id: amazonUserId }
      })
      .eq('id', alexa_account_id)
      .eq('integration_type', 'alexa')
      .is('metadata->>amazon_user_id', null); // Only update if it's currently null
    
    if (updateError) {
      console.warn('[Alexa Skill] Could not update amazon_user_id:', updateError);
      // Don't fail the request for this
    }
    
    return {
      user_id,
      alexa_account_id
    };
    
  } catch (error) {
    console.error('[Alexa Skill] JWT authentication error:', error);
    
    // Fallback: try to find the Alexa account by amazon_user_id
    console.log('[Alexa Skill] Attempting fallback lookup by amazon_user_id:', amazonUserId);
    
    try {
      const { data: alexaIntegration, error: lookupError } = await supabase
        .from('connected_integrations')
        .select('id, user_id')
        .eq('integration_type', 'alexa')
        .eq('metadata->>amazon_user_id', amazonUserId)
        .single();
      
      if (lookupError || !alexaIntegration) {
        console.error('[Alexa Skill] Fallback lookup failed:', lookupError);
        throw new Error(`Could not find Alexa account for amazon_user_id: ${amazonUserId}`);
      }
      
      console.log('[Alexa Skill] Fallback lookup successful:', alexaIntegration);
      
      return {
        user_id: alexaIntegration.user_id,
        alexa_account_id: alexaIntegration.id
      };
      
    } catch (fallbackError) {
      console.error('[Alexa Skill] Fallback authentication failed:', fallbackError);
      throw new Error('Authentication failed - please relink your Alexa account');
    }
  }
}

// Session Management
async function resolveOrCreateSession(alexaSessionId: string, chatbotId: string) {
  const supabase = createServiceClient();
  
  // Use Alexa sessionId as external_session_id
  const external_session_id = alexaSessionId;
  
  // Try to find existing session
  let { data: session, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('external_session_id', external_session_id)
    .eq('chatbot_id', chatbotId) // Ensure it's for the same chatbot
    .maybeSingle();
  
  if (sessionError) {
    console.error('[Alexa Skill] Session lookup error:', sessionError);
    throw new Error(`Failed to lookup session: ${sessionError.message}`);
  }
  
  // Create new session if none exists
  if (!session) {
    // First, get the chatbot's slug which is required for chat_sessions
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('shareable_url_slug')
      .eq('id', chatbotId)
      .single();
    
    if (chatbotError || !chatbot) {
      console.error('[Alexa Skill] Failed to get chatbot slug:', chatbotError);
      throw new Error(`Failed to get chatbot information: ${chatbotError?.message || 'Chatbot not found'}`);
    }
    
    const sessionId = uuidv4();
    const { data: newSession, error: newSessionError } = await supabase
      .from('chat_sessions')
      .insert({
        id: sessionId,
        chatbot_id: chatbotId,
        chatbot_slug: chatbot.shareable_url_slug,
        external_session_id: external_session_id,
        name: `Alexa Session ${alexaSessionId.substring(0, 8)}`,
        channel: 'alexa'
      })
      .select('id')
      .single();
    
    if (newSessionError) {
      console.error('[Alexa Skill] Failed to create session:', newSessionError);
      throw new Error(`Failed to create session: ${newSessionError.message}`);
    }
    
    session = newSession;
    console.log('[Alexa Skill] Created new session:', sessionId);
  } else {
    console.log('[Alexa Skill] Using existing session:', session.id);
  }
  
  return session.id;
}

// Chat Processing (following Slack pattern)
async function processAlexaChat(sessionId: string, userQuestion: string, chatbotId: string, alexa_account_id: string) {
  const supabase = createServiceClient();
  
  try {
    // 1. Fetch conversation history (same as Slack)
    const { data: rawHistory } = await supabase
      .from('messages')
      .select('role, content, message_id')
      .eq('chat_session_id', sessionId)
      .order('created_at', { ascending: true });

    const messageHistory = (rawHistory || []).map((m: any) => ({
      id: m.message_id,
      role: m.role,
      content: m.content,
    }));

    // Add the current user message
    messageHistory.push({
      id: uuidv4(),
      role: 'user',
      content: userQuestion,
    });

    // 2. Call the external chat API (exact same pattern as Slack)
    const externalChatResponse = await fetch(
      new URL('/api/chat/external', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          messages: messageHistory,
          chatbotId: chatbotId,
          channel: 'alexa', // Channel-specific for proper prompting - triggers strict voice formatting
          workspaceId: alexa_account_id, // Use alexa_account_id as workspace equivalent
          externalUserId: alexa_account_id, // Use alexa_account_id as user identifier
        }),
      }
    );

    if (!externalChatResponse.ok) {
      throw new Error(`External chat API failed with status: ${externalChatResponse.status}`);
    }
    
    // 3. Accumulate streaming response (same logic as Slack)
    let accumulatedText = '';
    
    const reader = externalChatResponse.body?.getReader();
    if (!reader) {
      throw new Error('No readable stream from external chat API');
    }

    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('0:')) {
          try {
            // Parse the text chunk from Vercel AI SDK format
            const jsonPart = line.substring(2).trim(); // Remove "0:" prefix
            if (jsonPart) {
              // Use JSON.parse to properly unescape the string
              const unescapedText = JSON.parse(jsonPart);
              accumulatedText += unescapedText;
            }
          } catch (parseError) {
            console.warn('[Alexa Skill] Failed to parse streaming chunk:', parseError);
          }
        }
      }
    }

    if (!accumulatedText.trim()) {
      throw new Error('No response text accumulated from external chat API');
    }
    
    return accumulatedText;
    
  } catch (error) {
    console.error('[Alexa Skill] Chat processing error:', error);
    throw error;
  }
}

// SSML Response Formatting (Alexa equivalent of fixSlackFormatting)
function fixAlexaFormatting(text: string): string {
  let fixed = text;
  
  console.log('[Alexa Skill] Before SSML formatting:', text.substring(0, 200) + '...');
  
  // Strip code blocks completely
  fixed = fixed.replace(/```[\s\S]*?```/g, '');
  fixed = fixed.replace(/`([^`]+)`/g, '$1');
  
  // Strip markdown headers
  fixed = fixed.replace(/^#{1,6}\s*(.+?)$/gm, '$1');
  
  // Strip bold/italic markdown
  fixed = fixed.replace(/\*\*([^*]+)\*\*/g, '$1');
  fixed = fixed.replace(/\*([^*]+)\*/g, '$1');
  fixed = fixed.replace(/__([^_]+)__/g, '$1');
  fixed = fixed.replace(/_([^_]+)_/g, '$1');
  
  // Convert bullet points to speech-friendly format
  fixed = fixed.replace(/^(\s*)[•\-\*]\s*(.+)$/gm, '$1$2. ');
  
  // Strip tables (anything with | characters)
  fixed = fixed.replace(/^\|.*\|$/gm, '');
  
  // Strip LaTeX math expressions
  fixed = fixed.replace(/\$\$[\s\S]*?\$\$/g, 'mathematical expression');
  fixed = fixed.replace(/\$([^$]+)\$/g, 'mathematical expression');
  
  // CRITICAL: Remove emoji and unsupported Unicode characters
  fixed = fixed.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ''); // Remove surrogate pairs (emoji)
  fixed = fixed.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
  fixed = fixed.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Misc symbols
  fixed = fixed.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport symbols
  fixed = fixed.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // Flags
  fixed = fixed.replace(/[\u{2600}-\u{26FF}]/gu, ''); // Misc symbols
  fixed = fixed.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
  fixed = fixed.replace(/[\u{FE00}-\u{FE0F}]/gu, ''); // Variation selectors
  fixed = fixed.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Supplemental symbols
  
  // Escape XML/SSML special characters
  fixed = fixed.replace(/&/g, '&amp;');
  fixed = fixed.replace(/</g, '&lt;');
  fixed = fixed.replace(/>/g, '&gt;');
  fixed = fixed.replace(/"/g, '&quot;');
  fixed = fixed.replace(/'/g, '&apos;');
  
  // Clean up excessive line breaks
  fixed = fixed.replace(/\n{3,}/g, '\n\n');
  
  // Convert line breaks to proper pauses
  fixed = fixed.replace(/\n\n/g, '. <break time="0.5s"/> ');
  fixed = fixed.replace(/\n/g, '. ');
  
  // Clean up multiple periods
  fixed = fixed.replace(/\.{2,}/g, '.');
  
  // Remove any remaining non-printable characters
  fixed = fixed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Ensure we don't exceed Alexa's 8000 character limit
  if (fixed.length > 8000) {
    fixed = fixed.substring(0, 7950) + '... and more.';
  }
  
  // Wrap in SSML speak tags
  const ssml = `<speak>${fixed}</speak>`;
  
  console.log('[Alexa Skill] After SSML formatting:', ssml.substring(0, 200) + '...');
  
  return ssml;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[Alexa Skill] Received request:', {
      type: body.request?.type,
      locale: body.request?.locale,
      sessionId: body.session?.sessionId,
      userId: body.session?.user?.userId,
      accessToken: body.session?.user?.accessToken ? 'present' : 'missing'
    });

    // Check if user has linked their account
    const accessToken = body.session?.user?.accessToken;
    
    if (!accessToken) {
      console.log('[Alexa Skill] No access token - user needs to link account');
      
      // Return a LinkAccount card to force account linking
      return NextResponse.json({
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: 'Please link your Syllabi account using the Alexa app to get started.'
          },
          card: {
            type: 'LinkAccount'
          },
          shouldEndSession: true
        }
      });
    }

    // Resolve user authentication
    const sessionAttributes = body.session?.attributes || {};
    const amazonUserId = body.session?.user?.userId || '';
    
    console.log('[Alexa Skill] About to resolve user with:', {
      accessToken: accessToken ? 'present' : 'missing',
      amazonUserId,
      sessionAttributes
    });
    
    const { user_id, alexa_account_id } = await resolveAlexaUser(accessToken, amazonUserId, sessionAttributes);
    
    console.log('[Alexa Skill] User resolved:', { user_id, alexa_account_id });
    
    // Handle different request types
    const requestType = body.request?.type;
    const alexaSessionId = body.session?.sessionId;
    
    console.log('[Alexa Skill] Request details:', {
      requestType,
      alexaSessionId,
      fullRequest: JSON.stringify(body.request, null, 2)
    });
    
    // Handle LaunchRequest (when user opens skill)
    if (requestType === 'LaunchRequest') {
      return NextResponse.json({
        version: '1.0',
        sessionAttributes: { user_id, alexa_account_id },
        response: {
          outputSpeech: {
            type: 'SSML',
            ssml: '<speak>Welcome to Syllabi! Ask me anything from your knowledge base, or say the name of a specific bot followed by your question.</speak>'
          },
          shouldEndSession: false
        }
      });
    }
    
    // Handle IntentRequest (actual questions)
    if (requestType === 'IntentRequest') {
      const intentName = body.request?.intent?.name;
      
      console.log('[Alexa Skill] IntentRequest details:', {
        intentName,
        slots: body.request?.intent?.slots,
        fullIntent: JSON.stringify(body.request?.intent, null, 2)
      });
      
      // Handle our main SearchIntent
      if (intentName === 'SearchIntent') {
        const utterance = body.request?.intent?.slots?.query?.value || '';
        
        console.log('[Alexa Skill] SearchIntent processing:', {
          utterance,
          slots: body.request?.intent?.slots
        });
        
        if (!utterance.trim()) {
          return NextResponse.json({
            version: '1.0',
            sessionAttributes: { user_id, alexa_account_id },
            response: {
              outputSpeech: {
                type: 'SSML',
                ssml: '<speak>I didn\'t catch that. Please ask me a question about your knowledge base.</speak>'
              },
              shouldEndSession: false
            }
          });
        }
        
        // 1. Fetch available triggers for this user using chatbot_channels table
        console.log('[Alexa Skill] Looking for chatbot channels for alexa_account_id:', alexa_account_id);
        
        const supabase = createServiceClient();
        const { data: channelLinks, error: channelError } = await supabase
          .from('chatbot_channels')
          .select('chatbot_id, config')
          .eq('integration_id', alexa_account_id);
        
        if (channelError) {
          console.error('[Alexa Skill] Error fetching channel links:', channelError);
        }
        
        console.log('[Alexa Skill] Found channel links:', channelLinks);
        
        const triggers = (channelLinks || [])
          .filter(link => link.config?.trigger) // Only links with triggers
          .map(link => ({ 
            trigger: link.config.trigger, 
            chatbot_id: link.chatbot_id 
          }));
        
        // 2. Use LLM to parse the utterance
        console.log('[Alexa Skill] About to call LLM with:', { utterance, triggers });
        const { picked_trigger, is_switch_intent, user_question } = await parseUtteranceWithLLM(utterance, triggers);
        
        console.log('[Alexa Skill] LLM routing result:', {
          picked_trigger,
          is_switch_intent,
          user_question
        });
        
        // 3. Determine which chatbot to use
        let chatbotId: string | null = null;
        
        if (picked_trigger) {
          // First try to match by trigger name
          let matchedChannelLink = channelLinks?.find(link =>
            link.config?.trigger?.toLowerCase() === picked_trigger.toLowerCase()
          );

          // If not found and picked_trigger looks like a UUID, try matching chatbot_id directly
          if (!matchedChannelLink) {
            matchedChannelLink = channelLinks?.find(link => link.chatbot_id === picked_trigger);
          }

          chatbotId = matchedChannelLink?.chatbot_id || null;
        } else {
          // Use default bot
          const defaultChannelLink = channelLinks?.find(link => link.config?.is_default === true);
          chatbotId = defaultChannelLink?.chatbot_id || null;
        }
        
        console.log('[Alexa Skill] Chatbot resolution:', {
          chatbotId,
          picked_trigger,
          channelLinksCount: channelLinks?.length || 0
        });
        
        if (!chatbotId) {
          console.log('[Alexa Skill] No chatbot found - available channel links:', channelLinks);
          return NextResponse.json({
            version: '1.0',
            sessionAttributes: { user_id, alexa_account_id },
            response: {
              outputSpeech: {
                type: 'SSML',
                ssml: '<speak>I couldn\'t find a chatbot to help with that. Please set up your bots in the Syllabi dashboard first.</speak>'
              },
              shouldEndSession: true
            }
          });
        }
        
        // Handle switch intent without question
        if (is_switch_intent && !user_question.trim()) {
          return NextResponse.json({
            version: '1.0',
            sessionAttributes: { user_id, alexa_account_id, current_chatbot_id: chatbotId },
            response: {
              outputSpeech: {
                type: 'SSML',
                ssml: `<speak>Switched to ${picked_trigger || 'default'} bot. What would you like to know?</speak>`
              },
              shouldEndSession: false
            }
          });
        }
        
        // 4. Create/find session
        const sessionId = await resolveOrCreateSession(alexaSessionId, chatbotId);
        
        // 5. Process the chat
        const responseText = await processAlexaChat(sessionId, user_question, chatbotId, alexa_account_id);
        
        // 6. Format for Alexa and respond
        const ssmlResponse = fixAlexaFormatting(responseText);
        
        return NextResponse.json({
          version: '1.0',
          sessionAttributes: { user_id, alexa_account_id, current_chatbot_id: chatbotId },
          response: {
            outputSpeech: {
              type: 'SSML',
              ssml: ssmlResponse
            },
            shouldEndSession: false
          }
        });
      }
      
      // Handle unknown intents
      console.log('[Alexa Skill] Unknown intent received:', intentName);
      
      // Handle built-in intents
      if (['AMAZON.StopIntent', 'AMAZON.CancelIntent'].includes(intentName)) {
        return NextResponse.json({
          version: '1.0',
          response: {
            outputSpeech: {
              type: 'SSML',
              ssml: '<speak>Goodbye! Thanks for using Syllabi.</speak>'
            },
            shouldEndSession: true
          }
        });
      }
      
      if (intentName === 'AMAZON.HelpIntent') {
        return NextResponse.json({
          version: '1.0',
          sessionAttributes: { user_id, alexa_account_id },
          response: {
            outputSpeech: {
              type: 'SSML',
              ssml: '<speak>You can ask me questions about your knowledge base. Say something like "ask finance about budgets" to use a specific bot, or just ask your question directly.</speak>'
            },
            shouldEndSession: false
          }
        });
      }
    }
    
    // Handle SessionEndedRequest
    if (requestType === 'SessionEndedRequest') {
      // Nothing to do, just acknowledge
      return NextResponse.json({
        version: '1.0',
        response: {}
      });
    }
    
    // Default fallback
    console.log('[Alexa Skill] Falling back to default response for request type:', requestType);
    return NextResponse.json({
      version: '1.0',
      sessionAttributes: { user_id, alexa_account_id },
      response: {
        outputSpeech: {
          type: 'SSML',
          ssml: '<speak>I\'m not sure how to handle that request. Please try asking a question about your knowledge base.</speak>'
        },
        shouldEndSession: false
      }
    });

  } catch (error) {
    console.error('[Alexa Skill] Error processing request:', error);
    
    return NextResponse.json({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'Sorry, I encountered an error. Please try again later.'
        },
        shouldEndSession: true
      }
    });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
} 