import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import crypto from 'crypto';
import { WebClient } from '@slack/web-api';
import { v4 as uuidv4 } from 'uuid';

// Helper function to fix common formatting issues for Slack
function fixSlackFormatting(text: string): string {
    let fixed = text;
    
    console.log('Before formatting:', text.substring(0, 200) + '...');
    
    // Fix headers: ### Header -> *Header:*
    fixed = fixed.replace(/^#{1,6}\s*(.+?)$/gm, '*$1:*');
    
    // Fix bold: **text** -> *text* (more comprehensive)
    // Handle **text**: (with colon)
    fixed = fixed.replace(/\*\*([^*]+)\*\*:/g, '*$1*:');
    // Handle **text** (without colon)
    fixed = fixed.replace(/\*\*([^*]+)\*\*/g, '*$1*');
    
    // Fix italic: __text__ -> _text_
    fixed = fixed.replace(/__([^_]+)__/g, '_$1_');
    
    // Fix triple asterisks: ***text*** -> *text*
    fixed = fixed.replace(/\*\*\*([^*]+)\*\*\*/g, '*$1*');
    
    // Fix inline formatting in lists
    fixed = fixed.replace(/^(\s*[-•]\s*)\*\*([^*]+)\*\*/gm, '$1*$2*');
    
    // Ensure proper spacing around bullet points
    fixed = fixed.replace(/^(\s*)-\s*(.+)$/gm, '$1• $2');
    
    // Clean up excessive line breaks (more than 2 consecutive)
    fixed = fixed.replace(/\n{3,}/g, '\n\n');
    
    console.log('After formatting:', fixed.substring(0, 200) + '...');
    
    return fixed;
}

// A helper function to verify the Slack request signature
async function verifySlackRequest(request: NextRequest, body: string) {
  const supabase = createServiceClient();
  const signature = request.headers.get('x-slack-signature');
  const timestamp = request.headers.get('x-slack-request-timestamp');

  // TODO: In a multi-workspace setup, you'd look up the signing secret from the DB
  // For now, we'll use an environment variable.
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signature || !timestamp || !signingSecret) {
    return false;
  }

  // Prevent replay attacks
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 60 * 5) {
    return false;
  }

  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(baseString);
  const computedSignature = `v0=${hmac.digest('hex')}`;

  return crypto.timingSafeEqual(Buffer.from(computedSignature, 'utf8'), Buffer.from(signature, 'utf8'));
}

// Define the expected return type from our RPC function
interface DecryptedWorkspace {
    id: string;
    bot_token: string;
    default_chatbot_id: string;
}

export async function processSlackMessage(payload: any) {
    const { user, text, channel, thread_ts } = payload.event;
    const team_id = payload.team_id as string;

    const supabase = createServiceClient();

    // 1. Find the Slack integration
    const { data: integration, error: integrationError } = await supabase
        .from('connected_integrations')
        .select('*')
        .eq('integration_type', 'slack')
        .eq('metadata->>team_id', team_id)
        .single();
    
    if (integrationError || !integration) {
        console.error(`Slack integration not found for team_id: ${team_id}`, integrationError);
        return;
    }

    // Extract and decrypt bot token from credentials
    const encrypted_bot_token = integration.credentials?.bot_token;
    if (!encrypted_bot_token) {
        console.error(`Bot token not found for team_id: ${team_id}`);
        return;
    }

    // Decrypt the bot token
    let bot_token: string;
    try {
        const { data: decryptedToken, error: decryptError } = await supabase
            .rpc('decrypt_slack_bot_token', {
                integration_id_in: integration.id
            })
            .single();
            
        if (decryptError || !decryptedToken) {
            console.error(`Failed to decrypt bot token:`, decryptError);
            return;
        }
        
        bot_token = decryptedToken as string;
    } catch (decryptionError) {
        console.error(`Decryption error:`, decryptionError);
        return;
    }
    
    // Note: For now, we'll use a simple default chatbot approach
    // Later we'll create proper chatbot linking tables
    let chatbotIdToUse = integration.metadata?.default_chatbot_id;
    let userQuestion = text;

    // 2. Implement Routing Logic using chatbot_channels table
    const firstWord = text.split(' ')[0].toLowerCase();
    
    // Try to find chatbot with matching slash command
    const { data: commandMatch } = await supabase
        .from('chatbot_channels')
        .select('chatbot_id, config')
        .eq('integration_id', integration.id)
        .eq('config->>slash_command', firstWord)
        .maybeSingle();

    if (commandMatch) {
        chatbotIdToUse = commandMatch.chatbot_id;
        userQuestion = text.substring(firstWord.length).trim();
    } else {
        // Fall back to default chatbot for this integration
        const { data: defaultMatch } = await supabase
            .from('chatbot_channels')
            .select('chatbot_id, config')
            .eq('integration_id', integration.id)
            .eq('config->>is_default', true)
            .maybeSingle();

        if (defaultMatch) {
            chatbotIdToUse = defaultMatch.chatbot_id;
            userQuestion = text; // Use full text for default bot
        }
    }
    
    if (!chatbotIdToUse) {
        console.error(`No chatbot found for slash command: ${firstWord} or default chatbot not configured for team: ${team_id}`);
        return;
    }

    const slack = new WebClient(bot_token);

    // 3. Find or create a chat session using external session ID
    const external_session_id = thread_ts || channel;
    
    let { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('external_session_id', external_session_id)
        .maybeSingle();

    if (!session) {
        // Create new session with external session tracking
        const sessionId = uuidv4();
        const { data: newSession, error: newSessionError } = await supabase
            .from('chat_sessions')
            .insert({
                id: sessionId,
                chatbot_id: chatbotIdToUse,
                external_session_id: external_session_id,
                name: `Slack Conversation in ${channel}`,
                // Additional fields will be set by the external chat API
            })
            .select('id')
            .single();
        
        if (newSessionError) {
            console.error('Failed to create new session:', newSessionError);
            return;
        }
        session = newSession;
    }
    
    const sessionId = session.id;

    // 4. Post a "Thinking..." message to Slack
    const thinkingMessage = await slack.chat.postMessage({
        channel: channel,
        thread_ts: thread_ts,
        text: '🤔 Thinking...',
    });

    try {
        // 5. Fetch conversation history for context
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

        // 6. Call the new external chat API
        const externalChatResponse = await fetch(
            new URL('/api/chat/external', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: sessionId,
                    messages: messageHistory,
                    chatbotId: chatbotIdToUse,
                    channel: 'slack',
                    workspaceId: integration.id,
                    externalUserId: user,
                }),
            }
        );

        if (!externalChatResponse.ok) {
            throw new Error(`External chat API failed with status: ${externalChatResponse.status}`);
        }
        
        // 7. Accumulate the streaming response instead of sending each chunk
        // This avoids Slack rate limits while still providing good UX
        let accumulatedText = '';
        let lastUpdateTime = Date.now();
        const UPDATE_INTERVAL = 2000; // Update every 2 seconds maximum
        
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
                        // The format is like: 0:"some text with\nescaped characters"
                        const jsonPart = line.substring(2).trim(); // Remove "0:" prefix
                        if (jsonPart) {
                            // Use JSON.parse to properly unescape the string
                            const unescapedText = JSON.parse(jsonPart);
                            accumulatedText += unescapedText;
                            
                            // Update Slack message periodically to show progress
                            const now = Date.now();
                            if (now - lastUpdateTime > UPDATE_INTERVAL && accumulatedText.trim()) {
                                await slack.chat.update({
                                    channel: channel,
                                    ts: thinkingMessage.ts!,
                                    text: accumulatedText + ' ⏳', // Add loading indicator
                                });
                                lastUpdateTime = now;
                            }
                        }
                    } catch (parseError) {
                        // Continue processing even if individual chunk parsing fails
                        console.warn('Failed to parse streaming chunk:', parseError);
                    }
                }
            }
        }

        // 8. Send the final complete message with formatting fixes
        if (accumulatedText.trim()) {
            const formattedText = fixSlackFormatting(accumulatedText);
            await slack.chat.update({
                channel: channel,
                ts: thinkingMessage.ts!,
                text: formattedText,
            });
        } else {
            throw new Error('No response text accumulated from external chat API');
        }

    } catch (error) {
        console.error('Error processing Slack message:', error);
        await slack.chat.update({
            channel: channel,
            ts: thinkingMessage.ts!,
            text: 'Sorry, I encountered an error. Please try again.',
        });
    }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify the request is from Slack
  const isVerified = await verifySlackRequest(request, rawBody);
  if (!isVerified) {
    console.warn('Slack signature verification failed.');
    return NextResponse.json({ error: 'Verification failed' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  // Handle the one-time URL verification challenge from Slack
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // Handle events asynchronously
  if (payload.event) {
    const { type, subtype, bot_id } = payload.event;
    
    // Explicitly ignore any message from any bot, including our own.
    if (bot_id || subtype) {
        return NextResponse.json({ status: 'ignored bot message or subtype' });
    }

    // Only process direct messages or explicit mentions
    if (type === 'message' || type === 'app_mention') {
        // Ignore slash commands to avoid double processing
        if (payload.event.text && payload.event.text.startsWith('/ask')) {
            return NextResponse.json({ status: 'ignored slash command' });
        }
        processSlackMessage(payload).catch(console.error);
    }
  }
  
  // Acknowledge immediately
  return NextResponse.json({ status: 'ok' });
} 