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

// Define the expected return type from our RPC function
interface DecryptedWorkspace {
    id: string;
    bot_token: string;
    default_chatbot_id: string;
}

async function verifySlackRequest(request: NextRequest, body: string) {
    const signature = request.headers.get('x-slack-signature');
    const timestamp = request.headers.get('x-slack-request-timestamp');
    const signingSecret = process.env.SLACK_SIGNING_SECRET!;

    if (!signature || !timestamp) return false;
    if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 60 * 5) return false;

    const baseString = `v0:${timestamp}:${body}`;
    const hmac = crypto.createHmac('sha256', signingSecret).update(baseString).digest('hex');
    const computedSignature = `v0=${hmac}`;

    return crypto.timingSafeEqual(Buffer.from(computedSignature, 'utf8'), Buffer.from(signature, 'utf8'));
}

async function processSlashCommand(team_id: string, user_id: string, channel_id: string, text: string) {
    const supabase = createServiceClient();

    // 1. Find the Slack integration
    console.log(`🔍 Looking for Slack integration with team_id: ${team_id}`);
    
    const { data: integration, error: integrationError } = await supabase
        .from('connected_integrations')
        .select('*')
        .eq('integration_type', 'slack')
        .eq('metadata->>team_id', team_id)
        .single();
    
    if (integrationError || !integration) {
        console.error(`❌ Slack integration not found for team_id: ${team_id}`, integrationError);
        return;
    }

    console.log(`✅ Found integration:`, {
        id: integration.id,
        name: integration.name,
        has_credentials: !!integration.credentials,
        credentials_keys: integration.credentials ? Object.keys(integration.credentials) : []
    });

    // Extract and decrypt bot token from credentials
    const encrypted_bot_token = integration.credentials?.bot_token;
    if (!encrypted_bot_token) {
        console.error(`❌ Bot token not found for team_id: ${team_id}. Available credentials keys:`, 
            integration.credentials ? Object.keys(integration.credentials) : 'No credentials object');
        return;
    }

    console.log(`🔑 Encrypted bot token found. Length: ${encrypted_bot_token.length}`);
    
    // Decrypt the bot token using the decrypt_slack_bot_token function
    let bot_token: string;
    try {
        const { data: decryptedToken, error: decryptError } = await supabase
            .rpc('decrypt_slack_bot_token', {
                integration_id_in: integration.id
            })
            .single();
            
        if (decryptError || !decryptedToken) {
            console.error(`❌ Failed to decrypt bot token:`, decryptError);
            return;
        }
        
        bot_token = decryptedToken as string;
        console.log(`✅ Token decrypted successfully. Length: ${bot_token.length}, starts with: ${bot_token.substring(0, 10)}...`);
    } catch (decryptionError) {
        console.error(`❌ Decryption error:`, decryptionError);
        return;
    }
    
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

    console.log(`🤖 Initializing Slack WebClient with token: ${bot_token.substring(0, 10)}...`);
    const slack = new WebClient(bot_token);

    // 3. Find or create a chat session (use channel_id as external session for slash commands)
    const external_session_id = channel_id;
    
    let { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('external_session_id', external_session_id)
        .maybeSingle();

    if (!session) {
        const sessionId = uuidv4();
        const { data: newSession, error: newSessionError } = await supabase
            .from('chat_sessions')
            .insert({
                id: sessionId,
                chatbot_id: chatbotIdToUse,
                external_session_id: external_session_id,
                name: `Slack Slash Command in ${channel_id}`,
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

    // 4. Post initial thinking message
    console.log(`💬 Posting thinking message to channel: ${channel_id}`);
    let thinkingMessage;
    try {
        thinkingMessage = await slack.chat.postMessage({
            channel: channel_id,
            text: '🤔 Thinking...',
        });
        console.log(`✅ Thinking message posted successfully. Message TS: ${thinkingMessage.ts}`);
    } catch (slackError) {
        console.error(`❌ Failed to post thinking message:`, slackError);
        console.error(`Token used: ${bot_token.substring(0, 15)}...`);
        console.error(`Channel: ${channel_id}`);
        throw slackError;
    }

    try {
        // 5. Fetch conversation history
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

        // 6. Call the external chat API
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
                    externalUserId: user_id,
                }),
            }
        );

        if (!externalChatResponse.ok) {
            throw new Error(`External chat API failed with status: ${externalChatResponse.status}`);
        }
        
        // 7. Accumulate streaming response
        let accumulatedText = '';
        let lastUpdateTime = Date.now();
        const UPDATE_INTERVAL = 2000;
        
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
                            
                            // Update periodically
                            const now = Date.now();
                            if (now - lastUpdateTime > UPDATE_INTERVAL && accumulatedText.trim()) {
                                await slack.chat.update({
                                    channel: channel_id,
                                    ts: thinkingMessage.ts!,
                                    text: accumulatedText + ' ⏳',
                                });
                                lastUpdateTime = now;
                            }
                        }
                    } catch (parseError) {
                        console.warn('Failed to parse streaming chunk:', parseError);
                    }
                }
            }
        }

        // 8. Send final message
        if (accumulatedText.trim()) {
            await slack.chat.update({
                channel: channel_id,
                ts: thinkingMessage.ts!,
                text: fixSlackFormatting(accumulatedText),
            });
        } else {
            throw new Error('No response text accumulated from external chat API');
        }

    } catch (error) {
        console.error('Error processing slash command:', error);
        await slack.chat.update({
            channel: channel_id,
            ts: thinkingMessage.ts!,
            text: 'Sorry, I encountered an error. Please try again.',
        });
    }
}

export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const isVerified = await verifySlackRequest(request, rawBody);
    if (!isVerified) {
        return NextResponse.json({ error: 'Verification failed' }, { status: 401 });
    }
    
    // Slack sends slash commands as x-www-form-urlencoded
    const payload = new URLSearchParams(rawBody);
    const text = payload.get('text') || '';
    const team_id = payload.get('team_id');
    const user_id = payload.get('user_id');
    const channel_id = payload.get('channel_id');

    if (!team_id || !user_id || !channel_id) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Acknowledge the command immediately to avoid timeout
    const acknowledgementResponse = NextResponse.json({
        response_type: 'in_channel',
        text: '🤔 Thinking...',
    });

    // Process the actual request asynchronously
    processSlashCommand(team_id, user_id, channel_id, text).catch(console.error);
    
    return acknowledgementResponse;
} 