import { createServiceClient } from '@/utils/supabase/service';
import { SkillExecutionContext } from '../skill-executor-v2';

/**
 * Discord Built-in Skills Definitions
 */
export const discordSkills = [
  {
    name: 'discord_send_message',
    display_name: 'Send Discord Message',
    description: 'Send a message to a Discord channel or user',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_send_message',
      description: 'Send a message to a Discord channel or user',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The message content to send',
            example: 'Hello from Syllabi!'
          },
          channel_id: {
            type: 'string',
            description: 'Discord channel ID to send message to',
            example: '1234567890123456789'
          },
          user_id: {
            type: 'string',
            description: 'Discord user ID to send DM to (alternative to channel_id)',
            example: '1234567890123456789'
          },
          embed: {
            type: 'object',
            description: 'Rich embed object (optional)',
            properties: {
              title: { type: 'string', description: 'Embed title' },
              description: { type: 'string', description: 'Embed description' },
              color: { type: 'integer', description: 'Embed color (decimal)' },
              url: { type: 'string', description: 'Embed URL' }
            }
          }
        },
        required: ['message']
      }
    },
    configuration: {}
  },
  {
    name: 'discord_list_channels',
    display_name: 'List Discord Channels',
    description: 'List all channels in a Discord server',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_list_channels',
      description: 'List all channels in a Discord server',
      parameters: {
        type: 'object',
        properties: {
          guild_id: {
            type: 'string',
            description: 'Discord server (guild) ID (optional, uses current server if not provided)',
            example: '1234567890123456789'
          },
          channel_type: {
            type: 'string',
            description: 'Filter by channel type',
            enum: ['text', 'voice', 'category', 'news', 'store', 'stage'],
            example: 'text'
          }
        },
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'discord_get_messages',
    display_name: 'Get Discord Messages',
    description: 'Retrieve messages from a Discord channel',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_get_messages',
      description: 'Retrieve messages from a Discord channel',
      parameters: {
        type: 'object',
        properties: {
          channel_id: {
            type: 'string',
            description: 'Discord channel ID to get messages from',
            example: '1234567890123456789'
          },
          limit: {
            type: 'integer',
            description: 'Number of messages to retrieve (1-100)',
            example: 50,
            minimum: 1,
            maximum: 100
          },
          before: {
            type: 'string',
            description: 'Get messages before this message ID',
            example: '1234567890123456789'
          },
          after: {
            type: 'string',
            description: 'Get messages after this message ID',
            example: '1234567890123456789'
          }
        },
        required: ['channel_id']
      }
    },
    configuration: {}
  },
  {
    name: 'discord_list_members',
    display_name: 'List Discord Members',
    description: 'List members in a Discord server',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_list_members',
      description: 'List members in a Discord server',
      parameters: {
        type: 'object',
        properties: {
          guild_id: {
            type: 'string',
            description: 'Discord server (guild) ID (optional, uses current server if not provided)',
            example: '1234567890123456789'
          },
          limit: {
            type: 'integer',
            description: 'Number of members to retrieve (1-1000)',
            example: 100,
            minimum: 1,
            maximum: 1000
          },
          after: {
            type: 'string',
            description: 'Get members after this user ID',
            example: '1234567890123456789'
          }
        },
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'discord_get_user_info',
    display_name: 'Get Discord User Info',
    description: 'Get information about a Discord user',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_get_user_info',
      description: 'Get information about a Discord user',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'Discord user ID to get info for',
            example: '1234567890123456789'
          },
          guild_id: {
            type: 'string',
            description: 'Discord server (guild) ID for guild-specific info (optional)',
            example: '1234567890123456789'
          }
        },
        required: ['user_id']
      }
    },
    configuration: {}
  },
  {
    name: 'discord_manage_roles',
    display_name: 'Manage Discord Roles',
    description: 'Add or remove roles from a Discord user',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_manage_roles',
      description: 'Add or remove roles from a Discord user',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'Discord user ID to modify roles for',
            example: '1234567890123456789'
          },
          guild_id: {
            type: 'string',
            description: 'Discord server (guild) ID (optional, uses current server if not provided)',
            example: '1234567890123456789'
          },
          action: {
            type: 'string',
            description: 'Action to perform',
            enum: ['add', 'remove'],
            example: 'add'
          },
          role_id: {
            type: 'string',
            description: 'Role ID to add or remove',
            example: '1234567890123456789'
          },
          reason: {
            type: 'string',
            description: 'Reason for the role change (optional)',
            example: 'Promoted to moderator'
          }
        },
        required: ['user_id', 'action', 'role_id']
      }
    },
    configuration: {}
  },
  {
    name: 'discord_list_roles',
    display_name: 'List Discord Roles',
    description: 'List all roles in a Discord server',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_list_roles',
      description: 'List all roles in a Discord server',
      parameters: {
        type: 'object',
        properties: {
          guild_id: {
            type: 'string',
            description: 'Discord server (guild) ID (optional, uses current server if not provided)',
            example: '1234567890123456789'
          }
        },
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'discord_create_channel',
    display_name: 'Create Discord Channel',
    description: 'Create a new channel in a Discord server',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_create_channel',
      description: 'Create a new channel in a Discord server',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Channel name',
            example: 'general-chat'
          },
          type: {
            type: 'integer',
            description: 'Channel type (0=text, 2=voice, 4=category, 5=news, 13=stage)',
            example: 0,
            enum: [0, 2, 4, 5, 13]
          },
          guild_id: {
            type: 'string',
            description: 'Discord server (guild) ID (optional, uses current server if not provided)',
            example: '1234567890123456789'
          },
          topic: {
            type: 'string',
            description: 'Channel topic (for text channels)',
            example: 'General discussion channel'
          },
          parent_id: {
            type: 'string',
            description: 'Parent category ID (optional)',
            example: '1234567890123456789'
          }
        },
        required: ['name', 'type']
      }
    },
    configuration: {}
  },
  {
    name: 'discord_send_embed',
    display_name: 'Send Discord Embed',
    description: 'Send a rich embed message to a Discord channel',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_send_embed',
      description: 'Send a rich embed message to a Discord channel',
      parameters: {
        type: 'object',
        properties: {
          channel_id: {
            type: 'string',
            description: 'Discord channel ID to send embed to',
            example: '1234567890123456789'
          },
          title: {
            type: 'string',
            description: 'Embed title',
            example: 'Important Announcement'
          },
          description: {
            type: 'string',
            description: 'Embed description',
            example: 'This is an important message from the team.'
          },
          color: {
            type: 'integer',
            description: 'Embed color (decimal format)',
            example: 3447003
          },
          url: {
            type: 'string',
            description: 'Embed URL',
            example: 'https://example.com'
          },
          thumbnail_url: {
            type: 'string',
            description: 'Thumbnail image URL',
            example: 'https://example.com/image.png'
          },
          image_url: {
            type: 'string',
            description: 'Main image URL',
            example: 'https://example.com/banner.png'
          },
          footer_text: {
            type: 'string',
            description: 'Footer text',
            example: 'Powered by Syllabi'
          }
        },
        required: ['channel_id', 'title']
      }
    },
    configuration: {}
  },
  {
    name: 'discord_add_reaction',
    display_name: 'Add Discord Reaction',
    description: 'Add a reaction emoji to a Discord message',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_add_reaction',
      description: 'Add a reaction emoji to a Discord message',
      parameters: {
        type: 'object',
        properties: {
          channel_id: {
            type: 'string',
            description: 'Discord channel ID where the message is located',
            example: '1234567890123456789'
          },
          message_id: {
            type: 'string',
            description: 'Discord message ID to add reaction to',
            example: '1234567890123456789'
          },
          emoji: {
            type: 'string',
            description: 'Emoji to add as reaction (Unicode emoji or custom emoji name)',
            example: '👍'
          }
        },
        required: ['channel_id', 'message_id', 'emoji']
      }
    },
    configuration: {}
  },
  {
    name: 'discord_test_connection',
    display_name: 'Test Discord Connection',
    description: 'Test Discord bot connection and permissions',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_test_connection',
      description: 'Test Discord bot connection and permissions',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'discord_edit_message',
    display_name: 'Edit Discord Message',
    description: 'Edit an existing Discord message',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_edit_message',
      description: 'Edit an existing Discord message',
      parameters: {
        type: 'object',
        properties: {
          channel_id: {
            type: 'string',
            description: 'Discord channel ID where the message is located',
            example: '1234567890123456789'
          },
          message_id: {
            type: 'string',
            description: 'Discord message ID to edit',
            example: '1234567890123456789'
          },
          new_content: {
            type: 'string',
            description: 'New message content',
            example: 'Updated message content'
          }
        },
        required: ['channel_id', 'message_id', 'new_content']
      }
    },
    configuration: {}
  },
  {
    name: 'discord_delete_message',
    display_name: 'Delete Discord Message',
    description: 'Delete a Discord message',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_delete_message',
      description: 'Delete a Discord message',
      parameters: {
        type: 'object',
        properties: {
          channel_id: {
            type: 'string',
            description: 'Discord channel ID where the message is located',
            example: '1234567890123456789'
          },
          message_id: {
            type: 'string',
            description: 'Discord message ID to delete',
            example: '1234567890123456789'
          }
        },
        required: ['channel_id', 'message_id']
      }
    },
    configuration: {}
  },
  {
    name: 'discord_ban_user',
    display_name: 'Ban Discord User',
    description: 'Ban a user from the Discord server',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_ban_user',
      description: 'Ban a user from the Discord server',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'Discord user ID to ban',
            example: '1234567890123456789'
          },
          reason: {
            type: 'string',
            description: 'Reason for the ban (optional)',
            example: 'Violating server rules'
          },
          delete_message_days: {
            type: 'integer',
            description: 'Number of days worth of messages to delete (0-7, optional)',
            example: 1
          }
        },
        required: ['user_id']
      }
    },
    configuration: {}
  },
  {
    name: 'discord_kick_user',
    display_name: 'Kick Discord User',
    description: 'Kick a user from the Discord server',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_kick_user',
      description: 'Kick a user from the Discord server',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'Discord user ID to kick',
            example: '1234567890123456789'
          },
          reason: {
            type: 'string',
            description: 'Reason for the kick (optional)',
            example: 'Disruptive behavior'
          }
        },
        required: ['user_id']
      }
    },
    configuration: {}
  },
  {
    name: 'discord_timeout_user',
    display_name: 'Timeout Discord User',
    description: 'Timeout a user in the Discord server',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_timeout_user',
      description: 'Timeout a user in the Discord server',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'Discord user ID to timeout',
            example: '1234567890123456789'
          },
          duration_minutes: {
            type: 'integer',
            description: 'Timeout duration in minutes (max 40320 = 28 days)',
            example: 60
          },
          reason: {
            type: 'string',
            description: 'Reason for the timeout (optional)',
            example: 'Temporary cooling off period'
          }
        },
        required: ['user_id', 'duration_minutes']
      }
    },
    configuration: {}
  },
  {
    name: 'discord_create_invite',
    display_name: 'Create Discord Invite',
    description: 'Create an invite link for a Discord channel',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_create_invite',
      description: 'Create an invite link for a Discord channel',
      parameters: {
        type: 'object',
        properties: {
          channel_id: {
            type: 'string',
            description: 'Discord channel ID to create invite for',
            example: '1234567890123456789'
          },
          max_age: {
            type: 'integer',
            description: 'Duration of invite in seconds (0 = never expires, default 86400 = 24 hours)',
            example: 86400
          },
          max_uses: {
            type: 'integer',
            description: 'Max number of times this invite can be used (0 = unlimited)',
            example: 5
          },
          temporary: {
            type: 'boolean',
            description: 'Whether the invite grants temporary membership',
            example: false
          }
        },
        required: ['channel_id']
      }
    },
    configuration: {}
  },
  {
    name: 'discord_list_invites',
    display_name: 'List Discord Invites',
    description: 'List all invite links for the Discord server',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_list_invites',
      description: 'List all invite links for the Discord server',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'discord_pin_message',
    display_name: 'Pin Discord Message',
    description: 'Pin a message in a Discord channel',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_pin_message',
      description: 'Pin a message in a Discord channel',
      parameters: {
        type: 'object',
        properties: {
          channel_id: {
            type: 'string',
            description: 'Discord channel ID where the message is located',
            example: '1234567890123456789'
          },
          message_id: {
            type: 'string',
            description: 'Discord message ID to pin',
            example: '1234567890123456789'
          }
        },
        required: ['channel_id', 'message_id']
      }
    },
    configuration: {}
  },
  {
    name: 'discord_unpin_message',
    display_name: 'Unpin Discord Message',
    description: 'Unpin a message in a Discord channel',
    category: 'discord',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'discord_unpin_message',
      description: 'Unpin a message in a Discord channel',
      parameters: {
        type: 'object',
        properties: {
          channel_id: {
            type: 'string',
            description: 'Discord channel ID where the message is located',
            example: '1234567890123456789'
          },
          message_id: {
            type: 'string',
            description: 'Discord message ID to unpin',
            example: '1234567890123456789'
          }
        },
        required: ['channel_id', 'message_id']
      }
    },
    configuration: {}
  }
];

/**
 * Get decrypted Discord bot token for an integration
 */
async function getDiscordBotToken(integrationId: string): Promise<string> {
  const supabase = createServiceClient();
  
  const rpcParams = { integration_id_in: integrationId };
  console.log(`[Discord Debug] Calling decrypt_discord_bot_token with params:`, rpcParams);
  
  try {
    const { data, error } = await supabase.rpc('decrypt_discord_bot_token', rpcParams);

    if (error) {
      console.error(`[Discord Debug] RPC Error Details:`, {
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details
      });
      throw new Error(`Failed to decrypt Discord token: ${error.message}`);
    }

    if (!data) {
      console.warn(`[Discord Debug] No token returned for integration ID: ${integrationId}`);
      throw new Error('No Discord token found for this integration');
    }

    console.log(`[Discord Debug] Successfully decrypted bot token for integration ID: ${integrationId}`);
    return data;
  } catch (error) {
    console.error(`[Discord Debug] Token retrieval failed:`, error);
    throw new Error(`Failed to retrieve Discord credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Make Discord API request with authentication
 */
async function makeDiscordRequest(
  endpoint: string,
  integrationId: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await getDiscordBotToken(integrationId);
  
  // Add some basic token validation
  if (!token || token.length < 50) {
    throw new Error(`Invalid Discord bot token format (length: ${token?.length || 0})`);
  }
  
  console.log(`[Discord API] Making request to: ${endpoint}`);
  
  const response = await fetch(`https://discord.com/api/v10${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Discord API] Error (${response.status}):`, errorText);
    
    // Provide more specific error messages
    if (response.status === 401) {
      throw new Error(`Discord bot authentication failed. The bot token may be invalid or the bot may have been removed from the server. Please reconnect your Discord integration.`);
    } else if (response.status === 403) {
      throw new Error(`Discord bot lacks permissions for this operation. Please check the bot's permissions in your Discord server.`);
    } else if (response.status === 404) {
      throw new Error(`Discord resource not found. The channel, user, or server may not exist or the bot may not have access to it.`);
    } else if (response.status === 429) {
      throw new Error(`Discord API rate limit exceeded. Please try again in a few moments.`);
    } else {
      throw new Error(`Discord API request failed: ${response.status} ${errorText}`);
    }
  }

  return response.json();
}

/**
 * Get guild ID from integration or use provided guild_id
 */
async function getGuildId(integrationId: string, providedGuildId?: string): Promise<string> {
  if (providedGuildId) {
    return providedGuildId;
  }

  const supabase = createServiceClient();
  const { data: integration, error } = await supabase
    .from('connected_integrations')
    .select('metadata')
    .eq('id', integrationId)
    .single();

  if (error || !integration?.metadata?.guild_id) {
    throw new Error('Could not determine Discord server ID');
  }

  return integration.metadata.guild_id;
}

/**
 * Send a message to a Discord channel or user
 */
export async function discordSendMessage(
  params: {
    message: string;
    channel_id?: string;
    user_id?: string;
    embed?: {
      title?: string;
      description?: string;
      color?: number;
      url?: string;
    };
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const { message, channel_id, user_id, embed } = params;

  if (!channel_id && !user_id) {
    throw new Error('Either channel_id or user_id must be provided');
  }

  let targetChannelId = channel_id;

  // If user_id is provided, create a DM channel
  if (user_id && !channel_id) {
    const dmChannel = await makeDiscordRequest(
      '/users/@me/channels',
      context.integrationId,
      {
        method: 'POST',
        body: JSON.stringify({
          recipient_id: user_id,
        }),
      }
    );
    targetChannelId = dmChannel.id;
  }

  if (!targetChannelId) {
    throw new Error('Could not determine target channel');
  }

  const messageData: any = {
    content: message,
  };

  if (embed) {
    messageData.embeds = [embed];
  }

  const result = await makeDiscordRequest(
    `/channels/${targetChannelId}/messages`,
    context.integrationId,
    {
      method: 'POST',
      body: JSON.stringify(messageData),
    }
  );

  return {
    success: true,
    message_id: result.id,
    channel_id: result.channel_id,
    content: result.content,
    timestamp: result.timestamp,
  };
}

/**
 * List channels in a Discord server
 */
export async function discordListChannels(
  params: {
    guild_id?: string;
    channel_type?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const guildId = await getGuildId(context.integrationId, params.guild_id);
  const channels = await makeDiscordRequest(`/guilds/${guildId}/channels`, context.integrationId);

  let filteredChannels = channels;

  if (params.channel_type) {
    const typeMap: { [key: string]: number } = {
      text: 0,
      voice: 2,
      category: 4,
      news: 5,
      stage: 13,
    };

    const targetType = typeMap[params.channel_type];
    if (targetType !== undefined) {
      filteredChannels = channels.filter((channel: any) => channel.type === targetType);
    }
  }

  return {
    success: true,
    channels: filteredChannels.map((channel: any) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      topic: channel.topic,
      position: channel.position,
      parent_id: channel.parent_id,
      nsfw: channel.nsfw,
    })),
    total_count: filteredChannels.length,
  };
}

/**
 * Get messages from a Discord channel
 */
export async function discordGetMessages(
  params: {
    channel_id: string;
    limit?: number;
    before?: string;
    after?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const { channel_id, limit = 50, before, after } = params;
  const queryParams = new URLSearchParams();

  queryParams.set('limit', Math.min(limit, 100).toString());
  if (before) queryParams.set('before', before);
  if (after) queryParams.set('after', after);

  const messages = await makeDiscordRequest(
    `/channels/${channel_id}/messages?${queryParams.toString()}`,
    context.integrationId
  );

  return {
    success: true,
    messages: messages.map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      author: {
        id: msg.author.id,
        username: msg.author.username,
        discriminator: msg.author.discriminator,
        avatar: msg.author.avatar,
      },
      timestamp: msg.timestamp,
      edited_timestamp: msg.edited_timestamp,
      embeds: msg.embeds,
      attachments: msg.attachments,
      reactions: msg.reactions,
    })),
    channel_id,
    total_count: messages.length,
  };
}

/**
 * List members in a Discord server
 */
export async function discordListMembers(
  params: {
    guild_id?: string;
    limit?: number;
    after?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const guildId = await getGuildId(context.integrationId, params.guild_id);
  const { limit = 100, after } = params;
  
  const queryParams = new URLSearchParams();
  queryParams.set('limit', Math.min(limit, 1000).toString());
  if (after) queryParams.set('after', after);

  const members = await makeDiscordRequest(
    `/guilds/${guildId}/members?${queryParams.toString()}`,
    context.integrationId
  );

  return {
    success: true,
    members: members.map((member: any) => ({
      user: {
        id: member.user.id,
        username: member.user.username,
        discriminator: member.user.discriminator,
        avatar: member.user.avatar,
      },
      nick: member.nick,
      roles: member.roles,
      joined_at: member.joined_at,
      premium_since: member.premium_since,
    })),
    guild_id: guildId,
    total_count: members.length,
  };
}

/**
 * Get information about a Discord user
 */
export async function discordGetUserInfo(
  params: {
    user_id: string;
    guild_id?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const { user_id, guild_id } = params;

  // Get basic user info
  const user = await makeDiscordRequest(`/users/${user_id}`, context.integrationId);

  let memberInfo = null;
  if (guild_id) {
    try {
      const guildId = await getGuildId(context.integrationId, guild_id);
      memberInfo = await makeDiscordRequest(`/guilds/${guildId}/members/${user_id}`, context.integrationId);
    } catch (error) {
      console.warn('Could not fetch guild member info:', error);
    }
  }

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      bot: user.bot,
      system: user.system,
      public_flags: user.public_flags,
    },
    member: memberInfo ? {
      nick: memberInfo.nick,
      roles: memberInfo.roles,
      joined_at: memberInfo.joined_at,
      premium_since: memberInfo.premium_since,
    } : null,
  };
}

/**
 * Manage roles for a Discord user
 */
export async function discordManageRoles(
  params: {
    user_id: string;
    guild_id?: string;
    action: 'add' | 'remove';
    role_id: string;
    reason?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const { user_id, guild_id, action, role_id, reason } = params;
  const guildId = await getGuildId(context.integrationId, guild_id);

  const endpoint = `/guilds/${guildId}/members/${user_id}/roles/${role_id}`;
  const method = action === 'add' ? 'PUT' : 'DELETE';

  const headers: any = {};
  if (reason) {
    headers['X-Audit-Log-Reason'] = reason;
  }

  await makeDiscordRequest(endpoint, context.integrationId, {
    method,
    headers,
  });

  return {
    success: true,
    action,
    user_id,
    role_id,
    guild_id: guildId,
    reason,
  };
}

/**
 * List roles in a Discord server
 */
export async function discordListRoles(
  params: {
    guild_id?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const guildId = await getGuildId(context.integrationId, params.guild_id);
  const roles = await makeDiscordRequest(`/guilds/${guildId}/roles`, context.integrationId);

  return {
    success: true,
    roles: roles.map((role: any) => ({
      id: role.id,
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      position: role.position,
      permissions: role.permissions,
      managed: role.managed,
      mentionable: role.mentionable,
    })),
    guild_id: guildId,
    total_count: roles.length,
  };
}

/**
 * Create a new channel in a Discord server
 */
export async function discordCreateChannel(
  params: {
    name: string;
    type: number;
    guild_id?: string;
    topic?: string;
    parent_id?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const { name, type, guild_id, topic, parent_id } = params;
  const guildId = await getGuildId(context.integrationId, guild_id);

  const channelData: any = {
    name,
    type,
  };

  if (topic) channelData.topic = topic;
  if (parent_id) channelData.parent_id = parent_id;

  const channel = await makeDiscordRequest(
    `/guilds/${guildId}/channels`,
    context.integrationId,
    {
      method: 'POST',
      body: JSON.stringify(channelData),
    }
  );

  return {
    success: true,
    channel: {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      topic: channel.topic,
      position: channel.position,
      parent_id: channel.parent_id,
    },
    guild_id: guildId,
  };
}

/**
 * Send a rich embed message to a Discord channel
 */
export async function discordSendEmbed(
  params: {
    channel_id: string;
    title: string;
    description?: string;
    color?: number;
    url?: string;
    thumbnail_url?: string;
    image_url?: string;
    footer_text?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const {
    channel_id,
    title,
    description,
    color,
    url,
    thumbnail_url,
    image_url,
    footer_text,
  } = params;

  const embed: any = {
    title,
  };

  if (description) embed.description = description;
  if (color) embed.color = color;
  if (url) embed.url = url;
  if (thumbnail_url) embed.thumbnail = { url: thumbnail_url };
  if (image_url) embed.image = { url: image_url };
  if (footer_text) embed.footer = { text: footer_text };

  const result = await makeDiscordRequest(
    `/channels/${channel_id}/messages`,
    context.integrationId,
    {
      method: 'POST',
      body: JSON.stringify({
        embeds: [embed],
      }),
    }
  );

  return {
    success: true,
    message_id: result.id,
    channel_id: result.channel_id,
    embeds: result.embeds,
    timestamp: result.timestamp,
  };
}

/**
 * Add a reaction to a Discord message
 */
export async function discordAddReaction(
  params: {
    channel_id: string;
    message_id: string;
    emoji: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const { channel_id, message_id, emoji } = params;

  // URL encode the emoji for the API
  const encodedEmoji = encodeURIComponent(emoji);

  await makeDiscordRequest(
    `/channels/${channel_id}/messages/${message_id}/reactions/${encodedEmoji}/@me`,
    context.integrationId,
    {
      method: 'PUT',
    }
  );

  return {
    success: true,
    channel_id,
    message_id,
    emoji,
  };
}

/**
 * Test Discord bot connection and permissions
 */
export async function discordTestConnection(
  params: {},
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  try {
    // Test 1: Get bot user info
    const botUser = await makeDiscordRequest('/users/@me', context.integrationId);
    console.log(`[Discord Test] Bot user:`, botUser);

    // Test 2: Get guild info
    const guildId = await getGuildId(context.integrationId);
    const guild = await makeDiscordRequest(`/guilds/${guildId}`, context.integrationId);
    console.log(`[Discord Test] Guild:`, guild);

    // Test 3: List channels (to test basic permissions)
    const channels = await makeDiscordRequest(`/guilds/${guildId}/channels`, context.integrationId);
    console.log(`[Discord Test] Found ${channels.length} channels`);

    return {
      success: true,
      bot_user: {
        id: botUser.id,
        username: botUser.username,
        discriminator: botUser.discriminator
      },
      guild: {
        id: guild.id,
        name: guild.name,
        member_count: guild.member_count
      },
      channels_count: channels.length,
      message: 'Discord bot connection successful!'
    };
  } catch (error) {
    console.error('[Discord Test] Connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Discord bot connection failed. Please check your integration settings.'
    };
  }
}

/**
 * Edit an existing Discord message
 */
export async function discordEditMessage(
  params: {
    channel_id: string;
    message_id: string;
    new_content: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const { channel_id, message_id, new_content } = params;

  const result = await makeDiscordRequest(
    `/channels/${channel_id}/messages/${message_id}`,
    context.integrationId,
    {
      method: 'PATCH',
      body: JSON.stringify({
        content: new_content
      })
    }
  );

  return {
    success: true,
    message_id: result.id,
    channel_id: result.channel_id,
    new_content: result.content,
    edited_timestamp: result.edited_timestamp
  };
}

/**
 * Delete a Discord message
 */
export async function discordDeleteMessage(
  params: {
    channel_id: string;
    message_id: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const { channel_id, message_id } = params;

  await makeDiscordRequest(
    `/channels/${channel_id}/messages/${message_id}`,
    context.integrationId,
    {
      method: 'DELETE'
    }
  );

  return {
    success: true,
    message_id,
    channel_id,
    action: 'deleted'
  };
}

/**
 * Ban a user from the Discord server
 */
export async function discordBanUser(
  params: {
    user_id: string;
    reason?: string;
    delete_message_days?: number;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const { user_id, reason, delete_message_days = 0 } = params;
  const guildId = await getGuildId(context.integrationId);

  await makeDiscordRequest(
    `/guilds/${guildId}/bans/${user_id}`,
    context.integrationId,
    {
      method: 'PUT',
      body: JSON.stringify({
        delete_message_days: Math.min(Math.max(delete_message_days, 0), 7), // Clamp between 0-7
        reason
      })
    }
  );

  return {
    success: true,
    user_id,
    guild_id: guildId,
    action: 'banned',
    reason,
    delete_message_days
  };
}

/**
 * Kick a user from the Discord server
 */
export async function discordKickUser(
  params: {
    user_id: string;
    reason?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const { user_id, reason } = params;
  const guildId = await getGuildId(context.integrationId);

  await makeDiscordRequest(
    `/guilds/${guildId}/members/${user_id}`,
    context.integrationId,
    {
      method: 'DELETE',
      headers: {
        'X-Audit-Log-Reason': reason || 'No reason provided'
      }
    }
  );

  return {
    success: true,
    user_id,
    guild_id: guildId,
    action: 'kicked',
    reason
  };
}

/**
 * Timeout a user in the Discord server
 */
export async function discordTimeoutUser(
  params: {
    user_id: string;
    duration_minutes: number;
    reason?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const { user_id, duration_minutes, reason } = params;
  const guildId = await getGuildId(context.integrationId);

  // Calculate timeout until timestamp (max 28 days)
  const maxMinutes = 40320; // 28 days
  const clampedDuration = Math.min(Math.max(duration_minutes, 1), maxMinutes);
  const timeoutUntil = new Date(Date.now() + clampedDuration * 60 * 1000).toISOString();

  await makeDiscordRequest(
    `/guilds/${guildId}/members/${user_id}`,
    context.integrationId,
    {
      method: 'PATCH',
      body: JSON.stringify({
        communication_disabled_until: timeoutUntil
      }),
      headers: {
        'X-Audit-Log-Reason': reason || 'No reason provided'
      }
    }
  );

  return {
    success: true,
    user_id,
    guild_id: guildId,
    action: 'timeout',
    duration_minutes: clampedDuration,
    timeout_until: timeoutUntil,
    reason
  };
}

/**
 * Create an invite for a Discord channel
 */
export async function discordCreateInvite(
  params: {
    channel_id: string;
    max_age?: number;
    max_uses?: number;
    temporary?: boolean;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const { channel_id, max_age = 86400, max_uses = 0, temporary = false } = params;

  const result = await makeDiscordRequest(
    `/channels/${channel_id}/invites`,
    context.integrationId,
    {
      method: 'POST',
      body: JSON.stringify({
        max_age,
        max_uses,
        temporary
      })
    }
  );

  return {
    success: true,
    invite_code: result.code,
    invite_url: `https://discord.gg/${result.code}`,
    channel_id,
    max_age,
    max_uses,
    temporary,
    expires_at: result.expires_at
  };
}

/**
 * List all invites for the Discord server
 */
export async function discordListInvites(
  params: {},
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const guildId = await getGuildId(context.integrationId);
  const invites = await makeDiscordRequest(`/guilds/${guildId}/invites`, context.integrationId);

  return {
    success: true,
    guild_id: guildId,
    invites: invites.map((invite: any) => ({
      code: invite.code,
      url: `https://discord.gg/${invite.code}`,
      channel: {
        id: invite.channel.id,
        name: invite.channel.name,
        type: invite.channel.type
      },
      inviter: invite.inviter ? {
        id: invite.inviter.id,
        username: invite.inviter.username,
        discriminator: invite.inviter.discriminator
      } : null,
      uses: invite.uses,
      max_uses: invite.max_uses,
      max_age: invite.max_age,
      temporary: invite.temporary,
      created_at: invite.created_at,
      expires_at: invite.expires_at
    })),
    total_invites: invites.length
  };
}

/**
 * Pin a message in a Discord channel
 */
export async function discordPinMessage(
  params: {
    channel_id: string;
    message_id: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const { channel_id, message_id } = params;

  await makeDiscordRequest(
    `/channels/${channel_id}/pins/${message_id}`,
    context.integrationId,
    {
      method: 'PUT'
    }
  );

  return {
    success: true,
    message_id,
    channel_id,
    action: 'pinned'
  };
}

/**
 * Unpin a message in a Discord channel
 */
export async function discordUnpinMessage(
  params: {
    channel_id: string;
    message_id: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Discord operations');
  }

  const { channel_id, message_id } = params;

  await makeDiscordRequest(
    `/channels/${channel_id}/pins/${message_id}`,
    context.integrationId,
    {
      method: 'DELETE'
    }
  );

  return {
    success: true,
    message_id,
    channel_id,
    action: 'unpinned'
  };
}

/**
 * Discord skill implementations registry
 * Maps skill names to their implementation functions
 */
export const DISCORD_SKILL_IMPLEMENTATIONS = {
  discord_send_message: discordSendMessage,
  discord_list_channels: discordListChannels,
  discord_get_messages: discordGetMessages,
  discord_list_members: discordListMembers,
  discord_get_user_info: discordGetUserInfo,
  discord_manage_roles: discordManageRoles,
  discord_list_roles: discordListRoles,
  discord_create_channel: discordCreateChannel,
  discord_send_embed: discordSendEmbed,
  discord_add_reaction: discordAddReaction,
  discord_test_connection: discordTestConnection,
  discord_edit_message: discordEditMessage,
  discord_delete_message: discordDeleteMessage,
  discord_ban_user: discordBanUser,
  discord_kick_user: discordKickUser,
  discord_timeout_user: discordTimeoutUser,
  discord_create_invite: discordCreateInvite,
  discord_list_invites: discordListInvites,
  discord_pin_message: discordPinMessage,
  discord_unpin_message: discordUnpinMessage,
}; 