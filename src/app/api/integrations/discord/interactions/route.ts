import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { webcrypto } from 'crypto';
import { generateUUID } from '@/app/chat/[chatbotId]/lib/utils';

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!;
const DISCORD_APPLICATION_ID = process.env.DISCORD_CLIENT_ID!;

// Manual Discord signature verification using Web Crypto API
async function verifyDiscordSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  publicKey: string
): Promise<boolean> {
  try {
    const timestampData = new TextEncoder().encode(timestamp);
    const bodyData = new TextEncoder().encode(rawBody);
    const message = new Uint8Array(timestampData.length + bodyData.length);
    message.set(timestampData);
    message.set(bodyData, timestampData.length);

    const publicKeyBytes = new Uint8Array(
      publicKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    const cryptoKey = await webcrypto.subtle.importKey(
      'raw',
      publicKeyBytes,
      {
        name: 'Ed25519',
        namedCurve: 'Ed25519',
      },
      false,
      ['verify']
    );

    return await webcrypto.subtle.verify(
      'Ed25519',
      cryptoKey,
      signatureBytes,
      message
    );
  } catch (error) {
    console.error('Error in manual signature verification:', error);
    return false;
  }
}

// Discord interaction types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
};

// Discord interaction response types
const InteractionResponseType = {
  PONG: 1,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
};

export async function POST(request: NextRequest) {
  try {
    console.log('=== Discord Interaction Received ===');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.text();

    console.log('Signature:', signature);
    console.log('Timestamp:', timestamp);
    console.log('Body:', body);
    console.log('Public Key:', DISCORD_PUBLIC_KEY);

    if (!signature || !timestamp) {
      console.log('Missing signature headers');
      return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
    }

    // Verify the request signature
    const isValidRequest = await verifyDiscordSignature(body, signature, timestamp, DISCORD_PUBLIC_KEY);
    console.log('Signature valid:', isValidRequest);
    
    if (!isValidRequest) {
      console.log('Invalid signature - returning 401');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const interaction = JSON.parse(body);
    console.log('Parsed interaction:', interaction);

    // Handle Discord PING
    if (interaction.type === InteractionType.PING) {
      console.log('Responding to PING with PONG');
      return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    // Handle slash commands
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      // Respond immediately with "thinking" message
      const deferredResponse = NextResponse.json({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      });

      // Process the command asynchronously
      processDiscordCommand(interaction).catch(error => {
        console.error('Error processing Discord command:', error);
      });

      return deferredResponse;
    }

    return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 });
  } catch (error) {
    console.error('Discord interactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processDiscordCommand(interaction: any) {
  try {
    const { guild_id, member, data, token } = interaction;
    const userId = member?.user?.id;
    const commandName = data.name;

    console.log(`Processing Discord command: ${commandName} in guild ${guild_id}`);

    // Look up the guild and determine which chatbot to use
    const supabase = createServiceClient();
    
    // Find the Discord integration
    console.log(`🔍 Looking for Discord integration with guild_id: ${guild_id}`);
    
    const { data: integration, error: integrationError } = await supabase
      .from('connected_integrations')
      .select('*')
      .eq('integration_type', 'discord')
      .eq('metadata->>guild_id', guild_id)
      .single();

    if (integrationError || !integration) {
      console.error(`❌ Discord integration not found for guild_id: ${guild_id}`, integrationError);
      await sendFollowupMessage(
        token,
        `❌ This Discord server is not set up with Syllabi yet.\n\n🔗 To connect your chatbot:\n1. Go to https://0a95ee576cb0.ngrok-free.app/dashboard/integrations\n2. Click "Connect" on Discord\n3. Select this server and link your chatbots\n\n💡 Need help? Contact your server admin or visit our docs.`
      );
      return;
    }

    console.log(`✅ Found Discord integration:`, {
      id: integration.id,
      name: integration.name,
      guild_id: integration.metadata?.guild_id
    });

    let question = '';
    let targetBotSlug = null;
    let guildChatbot = null;

    if (commandName === 'ask') {
      // Handle /ask command with bot parameter
      const options = data.options || [];
      const questionOption = options.find((opt: any) => opt.name === 'question');
      const botOption = options.find((opt: any) => opt.name === 'bot');

      question = questionOption?.value || '';
      targetBotSlug = botOption?.value;

      if (!question.trim()) {
        await sendFollowupMessage(token, 'Please provide a question to ask.');
        return;
      }

      // Find the appropriate chatbot using chatbot_channels table
      console.log(`🔍 Looking for chatbot with targetBotSlug: ${targetBotSlug}`);
      
      let channelLinkQuery = supabase
        .from('chatbot_channels')
        .select('chatbot_id, config')
        .eq('integration_id', integration.id);

      if (targetBotSlug) {
        // User specified a specific bot
        channelLinkQuery = channelLinkQuery.eq('config->>slash_command', targetBotSlug);
      } else {
        // Use the default bot
        channelLinkQuery = channelLinkQuery.eq('config->>is_default', true);
      }

      const { data: foundChannelLink, error: chatbotError } = await channelLinkQuery.single();

      if (chatbotError || !foundChannelLink) {
        console.error(`❌ No chatbot found for targetBotSlug: ${targetBotSlug}`, chatbotError);
        const message = targetBotSlug
          ? `Chatbot "${targetBotSlug}" is not linked to this Discord server.`
          : 'No default chatbot is configured for this Discord server. Please ask an admin to set one up.';
        
        await sendFollowupMessage(token, message);
        return;
      }

      console.log(`✅ Found channel link:`, foundChannelLink);
      guildChatbot = { chatbot_id: foundChannelLink.chatbot_id, config: foundChannelLink.config };

    } else {
      // Handle custom slash command (e.g., /achubot)
      const options = data.options || [];
      const questionOption = options.find((opt: any) => opt.name === 'question');

      question = questionOption?.value || '';

      if (!question.trim()) {
        await sendFollowupMessage(token, 'Please provide a question to ask.');
        return;
      }

      // Find chatbot by slash command name using chatbot_channels table
      console.log(`🔍 Looking for chatbot with command name: ${commandName}`);
      
      const { data: foundChannelLink, error: chatbotError } = await supabase
        .from('chatbot_channels')
        .select('chatbot_id, config')
        .eq('integration_id', integration.id)
        .eq('config->>slash_command', commandName)
        .single();

      if (chatbotError || !foundChannelLink) {
        console.error(`❌ No chatbot found for command: ${commandName}`, chatbotError);
        await sendFollowupMessage(
          token, 
          `Chatbot "${commandName}" is not configured for this Discord server. Please contact an admin.`
        );
        return;
      }

      console.log(`✅ Found channel link for command ${commandName}:`, foundChannelLink);
      guildChatbot = { chatbot_id: foundChannelLink.chatbot_id, config: foundChannelLink.config };
    }

    // Fetch chatbot details in a second query
    const { data: chatbot, error: chatbotDetailsError } = await supabase
      .from('chatbots')
      .select('id, name, shareable_url_slug')
      .eq('id', guildChatbot.chatbot_id)
      .single();

    if (chatbotDetailsError || !chatbot) {
      await sendFollowupMessage(token, 'The linked chatbot could not be found. Please check your configuration.');
      return;
    }

    // Send initial "thinking" message
    await sendFollowupMessage(token, '🤔 Thinking...');

    // Generate a new session and message ID for this interaction
    const sessionId = generateUUID();
    const messageId = generateUUID();

    // Call the external chat API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/chat/external`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: sessionId,
        messages: [
          {
            id: messageId,
            role: 'user',
            content: question,
          },
        ],
        channel: 'discord',
        workspaceId: integration.id,
        chatbotId: chatbot.id,
        externalUserId: userId,
      }),
    });

    if (!response.ok) {
      await sendFollowupMessage(token, 'Sorry, I encountered an error processing your request.');
      return;
    }

    // Stream the response
    let accumulatedText = '';
    let lastUpdateTime = Date.now();
    const BATCH_INTERVAL = 2000; // 2 seconds

    const reader = response.body?.getReader();
    if (!reader) {
      await sendFollowupMessage(token, 'Sorry, I encountered an error processing your request.');
      return;
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

              // Update message every 2 seconds
              const now = Date.now();
              if (now - lastUpdateTime >= BATCH_INTERVAL && accumulatedText.trim()) {
                await updateFollowupMessage(token, fixDiscordFormatting(accumulatedText) + ' ⏳');
                lastUpdateTime = now;
              }
            }
          } catch (parseError) {
            console.warn('Failed to parse streaming chunk:', parseError);
          }
        }
      }
    }

    // Send final update
    if (accumulatedText.trim()) {
      await updateFollowupMessage(token, fixDiscordFormatting(accumulatedText));
    } else {
      await updateFollowupMessage(token, 'Sorry, I didn\'t receive a proper response. Please try again.');
    }

  } catch (error) {
    console.error('Error processing Discord command:', error);
    await sendFollowupMessage(interaction.token, 'Sorry, I encountered an error processing your request.');
  }
}

async function sendFollowupMessage(token: string, content: string) {
  try {
    await fetch(`https://discord.com/api/webhooks/${DISCORD_APPLICATION_ID}/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content.slice(0, 2000), // Discord 2000 char limit
      }),
    });
  } catch (error) {
    console.error('Error sending Discord followup message:', error);
  }
}

async function updateFollowupMessage(token: string, content: string) {
  try {
    await fetch(`https://discord.com/api/webhooks/${DISCORD_APPLICATION_ID}/${token}/messages/@original`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content.slice(0, 2000), // Discord 2000 char limit
      }),
    });
  } catch (error) {
    console.error('Error updating Discord message:', error);
  }
}

function fixDiscordFormatting(text: string): string {
  if (!text) return text;

  // Discord uses standard markdown
  // Remove excessive line breaks
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // Ensure proper spacing around headings
  text = text.replace(/^(#{1,3})\s*(.+)$/gm, '$1 $2\n');
  
  // Clean up bullet points - Discord supports standard markdown
  text = text.replace(/^[\s]*[•·▪▫‣⁃]\s*/gm, '• ');
  
  // Ensure links are properly formatted
  text = text.replace(/\[(\d+)\]/g, '[$1]');
  
  return text.trim();
} 