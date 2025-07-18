import { WebClient } from '@slack/web-api';
import { createServiceClient } from '@/utils/supabase/service';
import type { SkillExecutionContext } from '../skill-executor-v2';

/**
 * Slack skill definitions for the built-in skills registry
 */
export const SLACK_SKILL_DEFINITIONS = [
  {
    name: 'slack_send_message',
    display_name: 'Send Slack Message',
    description: 'Send a message to a channel, user, or group of users',
    category: 'slack',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'slack_send_message',
      description: 'Send a message to a channel, user, or group of users',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The content of the message to send',
            example: 'Hello from Syllabi!'
          },
          channel_name: {
            type: 'string',
            description: 'Channel name to send message to (e.g., #general)',
            example: '#general'
          },
          conversation_id: {
            type: 'string',
            description: 'Conversation ID to send message to (preferred over channel_name)',
            example: 'C1234567890'
          },
          user_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Slack user IDs to message (creates DM or group chat)',
            example: ['U1234567890', 'U0987654321']
          },
          emails: {
            type: 'array',
            items: { type: 'string' },
            description: 'Email addresses to message',
            example: ['user@example.com']
          },
          thread_ts: {
            type: 'string',
            description: 'Optional timestamp of parent message to reply in thread',
            example: '1234567890.123456'
          }
        },
        required: ['message']
      }
    },
    configuration: {}
  },
  {
    name: 'slack_list_users',
    display_name: 'List Slack Users',
    description: 'List all users in the Slack workspace',
    category: 'slack',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'slack_list_users',
      description: 'List all users in the Slack workspace',
      parameters: {
        type: 'object',
        properties: {
          exclude_bots: {
            type: 'boolean',
            description: 'Whether to exclude bots from the results',
            example: true
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of users to return (max 500)',
            example: 50,
            minimum: 1,
            maximum: 500
          },
          cursor: {
            type: 'string',
            description: 'Cursor for pagination',
            example: 'dXNlcjpVMDYxTkZUVDI='
          }
        },
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'slack_get_user_info',
    display_name: 'Get Slack User Info',
    description: 'Get information about a specific Slack user',
    category: 'slack',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'slack_get_user_info',
      description: 'Get information about a specific Slack user',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'The Slack user ID to get information for',
            example: 'U1234567890'
          }
        },
        required: ['user_id']
      }
    },
    configuration: {}
  },
  {
    name: 'slack_get_users_info',
    display_name: 'Get Multiple Users Info',
    description: 'Get information about multiple Slack users by ID, username, or email',
    category: 'slack',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'slack_get_users_info',
      description: 'Get information about multiple Slack users',
      parameters: {
        type: 'object',
        properties: {
          user_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'The Slack user IDs to get information for',
            example: ['U1234567890', 'U0987654321']
          },
          emails: {
            type: 'array',
            items: { type: 'string' },
            description: 'Email addresses to look up users by',
            example: ['user1@example.com', 'user2@example.com']
          },
          usernames: {
            type: 'array',
            items: { type: 'string' },
            description: 'Usernames to look up (prefer user_ids or emails for better performance)',
            example: ['john.doe', 'jane.smith']
          }
        },
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'slack_list_channels',
    display_name: 'List Slack Channels',
    description: 'List channels in the Slack workspace',
    category: 'slack',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'slack_list_channels',
      description: 'List channels in the Slack workspace',
      parameters: {
        type: 'object',
        properties: {
          types: {
            type: 'string',
            description: 'Comma-separated list of channel types to include',
            example: 'public_channel,private_channel',
            enum: ['public_channel', 'private_channel', 'mpim', 'im']
          },
          exclude_archived: {
            type: 'boolean',
            description: 'Whether to exclude archived channels',
            example: true
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of channels to return (max 1000)',
            example: 100,
            minimum: 1,
            maximum: 1000
          },
          cursor: {
            type: 'string',
            description: 'Cursor for pagination',
            example: 'dGVhbTpDMDYxRkE1UlI='
          }
        },
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'slack_get_messages',
    display_name: 'Get Slack Messages',
    description: 'Get messages from a Slack channel or conversation',
    category: 'slack',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'slack_get_messages',
      description: 'Get messages from a Slack channel or conversation',
      parameters: {
        type: 'object',
        properties: {
          channel_name: {
            type: 'string',
            description: 'Channel name to get messages from (e.g., #general)',
            example: '#general'
          },
          conversation_id: {
            type: 'string',
            description: 'Conversation ID to get messages from (preferred over channel_name)',
            example: 'C1234567890'
          },
          user_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'User IDs to get conversation messages from',
            example: ['U1234567890']
          },
          emails: {
            type: 'array',
            items: { type: 'string' },
            description: 'Email addresses to get conversation messages from',
            example: ['user@example.com']
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of messages to return (max 1000)',
            example: 20,
            minimum: 1,
            maximum: 1000
          },
          oldest_datetime: {
            type: 'string',
            description: 'Oldest message datetime in YYYY-MM-DD HH:MM:SS format',
            example: '2024-01-01 10:00:00'
          },
          latest_datetime: {
            type: 'string',
            description: 'Latest message datetime in YYYY-MM-DD HH:MM:SS format',
            example: '2024-01-02 18:00:00'
          },
          cursor: {
            type: 'string',
            description: 'Cursor for pagination',
            example: 'bmV4dF9faWQ='
          }
        },
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'slack_get_users_in_conversation',
    display_name: 'Get Users in Conversation',
    description: 'Get the users in a Slack conversation by channel ID or name',
    category: 'slack',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'slack_get_users_in_conversation',
      description: 'Get the users in a Slack conversation',
      parameters: {
        type: 'object',
        properties: {
          conversation_id: {
            type: 'string',
            description: 'The conversation ID to get users from',
            example: 'C1234567890'
          },
          channel_name: {
            type: 'string',
            description: 'The channel name to get users from (prefer conversation_id)',
            example: '#general'
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of users to return (max 500)',
            example: 200,
            minimum: 1,
            maximum: 500
          },
          cursor: {
            type: 'string',
            description: 'Cursor for pagination',
            example: 'dXNlcjpVMDYxTkZUVDI='
          }
        },
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'slack_get_conversation_metadata',
    display_name: 'Get Conversation Metadata',
    description: 'Get metadata of a Slack channel, DM, or group conversation',
    category: 'slack',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'slack_get_conversation_metadata',
      description: 'Get metadata of a Slack conversation',
      parameters: {
        type: 'object',
        properties: {
          conversation_id: {
            type: 'string',
            description: 'The conversation ID to get metadata for',
            example: 'C1234567890'
          },
          channel_name: {
            type: 'string',
            description: 'The channel name to get metadata for (prefer conversation_id)',
            example: '#general'
          },
          user_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'User IDs to get conversation metadata for',
            example: ['U1234567890']
          },
          emails: {
            type: 'array',
            items: { type: 'string' },
            description: 'Email addresses to get conversation metadata for',
            example: ['user@example.com']
          }
        },
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'slack_search_messages',
    display_name: 'Search Slack Messages',
    description: 'Search for messages across the Slack workspace',
    category: 'slack',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'slack_search_messages',
      description: 'Search for messages across the Slack workspace',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (keywords, phrases, or search operators)',
            example: 'budget Q4 from:@john in:#marketing'
          },
          sort: {
            type: 'string',
            description: 'Sort results by relevance or timestamp',
            enum: ['score', 'timestamp'],
            example: 'timestamp'
          },
          sort_dir: {
            type: 'string',
            description: 'Sort direction',
            enum: ['asc', 'desc'],
            example: 'desc'
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of results to return (max 100)',
            example: 20,
            minimum: 1,
            maximum: 100
          }
        },
        required: ['query']
      }
    },
    configuration: {}
  },
  {
    name: 'slack_set_status',
    display_name: 'Set Slack Status',
    description: 'Set the status message and emoji for the authenticated user',
    category: 'slack',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'slack_set_status',
      description: 'Set the status message and emoji for the authenticated user',
      parameters: {
        type: 'object',
        properties: {
          status_text: {
            type: 'string',
            description: 'Status text to display',
            example: 'In a meeting'
          },
          status_emoji: {
            type: 'string',
            description: 'Status emoji (with colons)',
            example: ':calendar:'
          },
          status_expiration: {
            type: 'integer',
            description: 'Unix timestamp when status expires (0 for no expiration)',
            example: 1640995200
          }
        },
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'slack_create_reminder',
    display_name: 'Create Slack Reminder',
    description: 'Create a reminder for yourself or another user',
    category: 'slack',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'slack_create_reminder',
      description: 'Create a reminder for yourself or another user',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The reminder message',
            example: 'Review the quarterly report'
          },
          time: {
            type: 'string',
            description: 'When to be reminded (natural language or timestamp)',
            example: 'tomorrow at 2pm'
          },
          user: {
            type: 'string',
            description: 'User ID to remind (defaults to authenticated user)',
            example: 'U1234567890'
          }
        },
        required: ['text', 'time']
      }
    },
    configuration: {}
  },
  {
    name: 'slack_get_reminders',
    display_name: 'Get Slack Reminders',
    description: 'List pending reminders for the authenticated user',
    category: 'slack',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'slack_get_reminders',
      description: 'List pending reminders for the authenticated user',
      parameters: {
        type: 'object',
        properties: {
          team_id: {
            type: 'string',
            description: 'Team ID to get reminders from (optional)',
            example: 'T1234567890'
          }
        },
        required: []
      }
    },
    configuration: {}
  }
];

/**
 * Get decrypted Slack bot token for an integration
 */
async function getSlackBotToken(integrationId: string): Promise<string> {
  const supabase = createServiceClient();
  
  const rpcParams = { integration_id_in: integrationId };
  console.log(`[Slack Debug] Calling decrypt_slack_bot_token with params:`, rpcParams);
  
  try {
    const { data, error } = await supabase.rpc('decrypt_slack_bot_token', rpcParams);

    if (error) {
      console.error(`[Slack Debug] RPC Error Details:`, {
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details
      });
      throw new Error(`Failed to decrypt Slack token: ${error.message}`);
    }

    if (!data) {
      console.warn(`[Slack Debug] No token returned for integration ID: ${integrationId}`);
      throw new Error('No Slack token found for this integration');
    }

    console.log(`[Slack Debug] Successfully decrypted bot token for integration ID: ${integrationId}`);
    return data;
  } catch (error) {
    console.error(`[Slack Debug] Token retrieval failed:`, error);
    throw new Error(`Failed to retrieve Slack credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get decrypted Slack user token for an integration (for personal actions like reminders)
 */
async function getSlackUserToken(integrationId: string): Promise<string> {
  const supabase = createServiceClient();
  
  const rpcParams = { integration_id_in: integrationId };
  console.log(`[Slack Debug] Calling decrypt_slack_user_token with params:`, rpcParams);
  
  try {
    const { data, error } = await supabase.rpc('decrypt_slack_user_token', rpcParams);

    if (error) {
      console.error(`[Slack Debug] User Token RPC Error Details:`, {
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details
      });
      throw new Error(`Failed to decrypt Slack user token: ${error.message}`);
    }

    if (!data) {
      console.warn(`[Slack Debug] No user token returned for integration ID: ${integrationId}`);
      throw new Error('No Slack user token found. Please reconnect your Slack integration with user permissions.');
    }

    console.log(`[Slack Debug] Successfully decrypted user token for integration ID: ${integrationId}`);
    return data;
  } catch (error) {
    console.error(`[Slack Debug] User token retrieval failed:`, error);
    throw new Error(`Failed to retrieve user token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create Slack WebClient with authenticated token
 */
async function createSlackClient(integrationId: string, useUserToken: boolean = false): Promise<WebClient> {
  const token = useUserToken 
    ? await getSlackUserToken(integrationId)
    : await getSlackBotToken(integrationId);
  
  return new WebClient(token, {
    retryConfig: {
      retries: 2,
      factor: 2,
    },
    timeout: 10000,
  });
}

/**
 * Send a message to a Slack channel or user
 */
export async function slackSendMessage(
  params: {
    message: string;
    channel_name?: string;
    conversation_id?: string;
    user_ids?: string[];
    emails?: string[];
    thread_ts?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Slack operations');
  }

  try {
    const slack = await createSlackClient(context.integrationId);

    let targetChannel: string;

    // Determine target channel/conversation
    if (params.conversation_id) {
      targetChannel = params.conversation_id;
    } else if (params.channel_name) {
      targetChannel = params.channel_name;
    } else if (params.user_ids || params.emails) {
      // Create or find DM/group conversation
      if (params.user_ids && params.user_ids.length === 1) {
        // Single user DM
        const dmResult = await slack.conversations.open({
          users: params.user_ids[0]
        });
        if (!dmResult.ok) {
          throw new Error(`Failed to open DM: ${dmResult.error}`);
        }
        targetChannel = dmResult.channel!.id!;
      } else if (params.user_ids && params.user_ids.length > 1) {
        // Multi-user group
        const groupResult = await slack.conversations.open({
          users: params.user_ids.join(',')
        });
        if (!groupResult.ok) {
          throw new Error(`Failed to open group conversation: ${groupResult.error}`);
        }
        targetChannel = groupResult.channel!.id!;
      } else {
        throw new Error('User lookup by email not yet implemented - please use user_ids');
      }
    } else {
      throw new Error('Must provide conversation_id, channel_name, or user_ids');
    }

    const result = await slack.chat.postMessage({
      channel: targetChannel,
      text: params.message,
      thread_ts: params.thread_ts,
      link_names: true,
      parse: 'full'
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || 'Unknown error'}`);
    }

    return {
      success: true,
      message_ts: result.ts,
      channel: result.channel,
      text: params.message,
      permalink: (result.message as any)?.permalink ?? undefined
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('channel_not_found')) {
        throw new Error('Channel not found. Please check the channel name or ID.');
      }
      if (error.message.includes('not_in_channel')) {
        throw new Error('Bot is not a member of this channel. Please invite the bot to the channel first.');
      }
      if (error.message.includes('invalid_auth')) {
        throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
      }
      if (error.message.includes('rate_limited')) {
        throw new Error('Rate limited by Slack. Please try again in a moment.');
      }
    }
    throw error;
  }
}

/**
 * List users in the Slack workspace
 */
export async function slackListUsers(
  params: {
    exclude_bots?: boolean;
    limit?: number;
    cursor?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Slack operations');
  }

  try {
    const slack = await createSlackClient(context.integrationId);

    const result = await slack.users.list({
      limit: Math.min(params.limit || 200, 500),
      cursor: params.cursor
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || 'Unknown error'}`);
    }

    let users = result.members || [];

    // Filter out bots if requested
    if (params.exclude_bots !== false) {
      users = users.filter(user => !user.is_bot && !user.deleted);
    }

    // Transform to useful format
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      real_name: user.real_name,
      display_name: user.profile?.display_name,
      email: user.profile?.email,
      title: user.profile?.title,
      is_admin: user.is_admin,
      is_owner: user.is_owner,
      timezone: user.tz_label
    }));

    return {
      success: true,
      users: formattedUsers,
      total_count: formattedUsers.length,
      next_cursor: result.response_metadata?.next_cursor
    };

  } catch (error) {
    if (error instanceof Error && error.message.includes('invalid_auth')) {
      throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
    }
    throw error;
  }
}

/**
 * Get information about a specific Slack user
 */
export async function slackGetUserInfo(
  params: {
    user_id: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Slack operations');
  }

  try {
    const slack = await createSlackClient(context.integrationId);

    const result = await slack.users.info({
      user: params.user_id
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || 'Unknown error'}`);
    }

    const user = result.user;
    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        real_name: user.real_name,
        display_name: user.profile?.display_name,
        email: user.profile?.email,
        phone: user.profile?.phone,
        title: user.profile?.title,
        status_text: user.profile?.status_text,
        status_emoji: user.profile?.status_emoji,
        is_admin: user.is_admin,
        is_owner: user.is_owner,
        is_bot: user.is_bot,
        timezone: user.tz_label,
        timezone_offset: user.tz_offset
      }
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('user_not_found')) {
        throw new Error('User not found. Please check the user ID.');
      }
      if (error.message.includes('invalid_auth')) {
        throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
      }
    }
    throw error;
  }
}

/**
 * List channels in the Slack workspace
 */
export async function slackListChannels(
  params: {
    types?: string;
    exclude_archived?: boolean;
    limit?: number;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Slack operations');
  }

  try {
    const slack = await createSlackClient(context.integrationId);

    const types = params.types || 'public_channel,private_channel';
    
    const result = await slack.conversations.list({
      types,
      exclude_archived: params.exclude_archived !== false, // Default to excluding archived
      limit: Math.min(params.limit || 200, 1000) // Cap at 1000 as per Slack API
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || 'Unknown error'}`);
    }

    const channels = result.channels || [];

    // Transform to useful format
    const formattedChannels = channels.map(channel => ({
      id: channel.id,
      name: channel.name,
      is_channel: channel.is_channel,
      is_group: channel.is_group,
      is_im: channel.is_im,
      is_mpim: channel.is_mpim,
      is_private: channel.is_private,
      is_archived: channel.is_archived,
      is_general: channel.is_general,
      num_members: channel.num_members,
      topic: channel.topic?.value,
      purpose: channel.purpose?.value,
      created: channel.created
    }));

    return {
      success: true,
      channels: formattedChannels,
      total_count: formattedChannels.length
    };

  } catch (error) {
    if (error instanceof Error && error.message.includes('invalid_auth')) {
      throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
    }
    throw error;
  }
}

/**
 * Get information about multiple Slack users
 */
export async function slackGetUsersInfo(
  params: {
    user_ids?: string[];
    emails?: string[];
    usernames?: string[];
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Slack operations');
  }

  if (!params.user_ids && !params.emails && !params.usernames) {
    throw new Error('Must provide at least one of: user_ids, emails, or usernames');
  }

  try {
    const slack = await createSlackClient(context.integrationId);
    const foundUsers = [];

    // Look up by user IDs (most efficient)
    if (params.user_ids) {
      for (const userId of params.user_ids) {
        try {
          const result = await slack.users.info({ user: userId });
          if (result.ok && result.user) {
            foundUsers.push(result.user);
          }
        } catch (error) {
          console.warn(`Failed to fetch user ${userId}:`, error);
        }
      }
    }

    // Look up by email (requires users:read.email scope)
    if (params.emails) {
      for (const email of params.emails) {
        try {
          const result = await slack.users.lookupByEmail({ email });
          if (result.ok && result.user) {
            foundUsers.push(result.user);
          }
        } catch (error) {
          console.warn(`Failed to fetch user by email ${email}:`, error);
        }
      }
    }

    // Look up by username (less efficient - requires listing all users)
    if (params.usernames) {
      const allUsersResult = await slack.users.list({});
      if (allUsersResult.ok) {
        const usersByName = new Map<string, any>();
        allUsersResult.members?.forEach(user => {
          if (user.name) usersByName.set(user.name, user);
        });
        
        for (const username of params.usernames) {
          const user = usersByName.get(username);
          if (user) {
            foundUsers.push(user);
          }
        }
      }
    }

    // Transform to useful format
    const formattedUsers = foundUsers.map(user => ({
      id: user.id,
      name: user.name,
      real_name: user.real_name,
      display_name: user.profile?.display_name,
      email: user.profile?.email,
      phone: user.profile?.phone,
      title: user.profile?.title,
      status_text: user.profile?.status_text,
      status_emoji: user.profile?.status_emoji,
      is_admin: user.is_admin,
      is_owner: user.is_owner,
      is_bot: user.is_bot,
      timezone: user.tz_label,
      timezone_offset: user.tz_offset
    }));

    return {
      success: true,
      users: formattedUsers,
      total_count: formattedUsers.length
    };

  } catch (error) {
    if (error instanceof Error && error.message.includes('invalid_auth')) {
      throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
    }
    throw error;
  }
}

/**
 * Get users in a conversation
 */
export async function slackGetUsersInConversation(
  params: {
    conversation_id?: string;
    channel_name?: string;
    limit?: number;
    cursor?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Slack operations');
  }

  if (!params.conversation_id && !params.channel_name) {
    throw new Error('Must provide either conversation_id or channel_name');
  }

  try {
    const slack = await createSlackClient(context.integrationId);

    let channelId = params.conversation_id;

    // If channel_name provided, resolve to ID
    if (!channelId && params.channel_name) {
      const channelsResult = await slack.conversations.list({
        types: 'public_channel,private_channel'
      });
      
      if (channelsResult.ok) {
        const channel = channelsResult.channels?.find(
          ch => ch.name === params.channel_name?.replace('#', '')
        );
        if (channel) {
          channelId = channel.id;
        } else {
          throw new Error(`Channel ${params.channel_name} not found`);
        }
      }
    }

    if (!channelId) {
      throw new Error('Could not resolve channel ID');
    }

    const result = await slack.conversations.members({
      channel: channelId,
      limit: Math.min(params.limit || 200, 500),
      cursor: params.cursor
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || 'Unknown error'}`);
    }

    // Get user details for all members
    const userDetails = [];
    const memberIds = result.members || [];
    
    for (const userId of memberIds) {
      try {
        const userResult = await slack.users.info({ user: userId });
        if (userResult.ok && userResult.user) {
          userDetails.push({
            id: userResult.user.id,
            name: userResult.user.name,
            real_name: userResult.user.real_name,
            display_name: userResult.user.profile?.display_name,
            email: userResult.user.profile?.email,
            is_admin: userResult.user.is_admin,
            is_owner: userResult.user.is_owner,
            is_bot: userResult.user.is_bot
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch details for user ${userId}`);
      }
    }

    return {
      success: true,
      users: userDetails,
      total_count: userDetails.length,
      next_cursor: result.response_metadata?.next_cursor
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('channel_not_found')) {
        throw new Error('Channel not found. Please check the channel name or ID.');
      }
      if (error.message.includes('invalid_auth')) {
        throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
      }
    }
    throw error;
  }
}

/**
 * Get conversation metadata
 */
export async function slackGetConversationMetadata(
  params: {
    conversation_id?: string;
    channel_name?: string;
    user_ids?: string[];
    emails?: string[];
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Slack operations');
  }

  try {
    const slack = await createSlackClient(context.integrationId);

    let channelId = params.conversation_id;

    // Resolve channel by name if needed
    if (!channelId && params.channel_name) {
      const channelsResult = await slack.conversations.list({
        types: 'public_channel,private_channel,mpim,im'
      });
      
      if (channelsResult.ok) {
        const channel = channelsResult.channels?.find(
          ch => ch.name === params.channel_name?.replace('#', '')
        );
        if (channel) {
          channelId = channel.id;
        }
      }
    }

    // Find DM/group conversation by users if needed
    if (!channelId && (params.user_ids || params.emails)) {
      if (params.user_ids) {
        if (params.user_ids.length === 1) {
          // Single user DM
          const dmResult = await slack.conversations.open({
            users: params.user_ids[0]
          });
          if (dmResult.ok) {
            channelId = dmResult.channel!.id;
          }
        } else if (params.user_ids.length > 1) {
          // Multi-user group
          const groupResult = await slack.conversations.open({
            users: params.user_ids.join(',')
          });
          if (groupResult.ok) {
            channelId = groupResult.channel!.id;
          }
        }
      }
    }

    if (!channelId) {
      throw new Error('Could not resolve conversation ID');
    }

    const result = await slack.conversations.info({
      channel: channelId
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || 'Unknown error'}`);
    }

    const channel = result.channel;
    if (!channel) {
      throw new Error('Channel not found');
    }

    return {
      success: true,
      conversation: {
        id: channel.id,
        name: channel.name,
        is_channel: channel.is_channel,
        is_group: channel.is_group,
        is_im: channel.is_im,
        is_mpim: channel.is_mpim,
        is_private: channel.is_private,
        is_archived: channel.is_archived,
        is_general: channel.is_general,
        num_members: channel.num_members,
        topic: {
          value: channel.topic?.value,
          creator: channel.topic?.creator,
          last_set: channel.topic?.last_set
        },
        purpose: {
          value: channel.purpose?.value,
          creator: channel.purpose?.creator,
          last_set: channel.purpose?.last_set
        },
        created: channel.created,
        creator: channel.creator
      }
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('channel_not_found')) {
        throw new Error('Channel not found. Please check the channel name or ID.');
      }
      if (error.message.includes('invalid_auth')) {
        throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
      }
    }
    throw error;
  }
}

/**
 * Get messages from a Slack channel or conversation
 */
export async function slackGetMessages(
  params: {
    channel_name?: string;
    conversation_id?: string;
    user_ids?: string[];
    emails?: string[];
    limit?: number;
    oldest_datetime?: string;
    latest_datetime?: string;
    cursor?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Slack operations');
  }

  try {
    const slack = await createSlackClient(context.integrationId);

    let channelId = params.conversation_id;

    // Resolve channel by name
    if (!channelId && params.channel_name) {
      const channelsResult = await slack.conversations.list({
        types: 'public_channel,private_channel,mpim,im'
      });
      
      if (channelsResult.ok) {
        const channel = channelsResult.channels?.find(
          ch => ch.name === params.channel_name?.replace('#', '')
        );
        if (channel) {
          channelId = channel.id;
        }
      }
    }

    // Find conversation by users
    if (!channelId && (params.user_ids || params.emails)) {
      if (params.user_ids) {
        const conversationResult = await slack.conversations.open({
          users: params.user_ids.join(',')
        });
        if (conversationResult.ok) {
          channelId = conversationResult.channel!.id;
        }
      }
    }

    if (!channelId) {
      throw new Error('Could not resolve conversation - provide conversation_id, channel_name, or user_ids');
    }

    // Convert datetime strings to timestamps
    let oldest: string | undefined;
    let latest: string | undefined;

    if (params.oldest_datetime) {
      oldest = (new Date(params.oldest_datetime).getTime() / 1000).toString();
    }
    if (params.latest_datetime) {
      latest = (new Date(params.latest_datetime).getTime() / 1000).toString();
    }

    const result = await slack.conversations.history({
      channel: channelId,
      limit: Math.min(params.limit || 20, 1000),
      oldest,
      latest,
      cursor: params.cursor
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || 'Unknown error'}`);
    }

    const messages = result.messages || [];

    // Transform to useful format
    const formattedMessages = messages.map(message => ({
      ts: message.ts,
      user: message.user,
      text: message.text,
      type: message.type,
      subtype: message.subtype,
      thread_ts: message.thread_ts,
      reply_count: message.reply_count,
      reactions: message.reactions,
      files: message.files?.map(file => ({
        id: file.id,
        name: file.name,
        mimetype: file.mimetype,
        size: file.size,
        url: file.url_private
      })),
      timestamp: new Date(parseFloat(message.ts || '0') * 1000).toISOString()
    }));

    return {
      success: true,
      messages: formattedMessages,
      total_count: formattedMessages.length,
      has_more: result.has_more,
      next_cursor: result.response_metadata?.next_cursor
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('channel_not_found')) {
        throw new Error('Channel not found. Please check the channel name or ID.');
      }
      if (error.message.includes('not_in_channel')) {
        throw new Error('Bot is not a member of this channel. Please invite the bot to the channel first.');
      }
      if (error.message.includes('invalid_auth')) {
        throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
      }
    }
    throw error;
  }
}

/**
 * Search for messages across the Slack workspace
 */
export async function slackSearchMessages(
  params: {
    query: string;
    sort?: 'score' | 'timestamp';
    sort_dir?: 'asc' | 'desc';
    limit?: number;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Slack operations');
  }

  try {
    const slack = await createSlackClient(context.integrationId);

    const result = await slack.search.messages({
      query: params.query,
      sort: params.sort || 'score',
      sort_dir: params.sort_dir || 'desc',
      count: Math.min(params.limit || 20, 100) // Max 100 per Slack API
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || 'Unknown error'}`);
    }

    const searchResults = result.messages;
    if (!searchResults) {
      return {
        success: true,
        messages: [],
        total_count: 0
      };
    }

    // Transform to useful format
    const formattedMessages = searchResults.matches?.map(match => ({
      ts: match.ts,
      user: match.user,
      username: match.username,
      text: match.text,
      type: match.type,
      channel: {
        id: match.channel?.id,
        name: match.channel?.name,
        is_private: match.channel?.is_private
      },
      team: match.team,
      permalink: match.permalink,
      timestamp: new Date(parseFloat(match.ts || '0') * 1000).toISOString()
    })) || [];

    return {
      success: true,
      messages: formattedMessages,
      total_count: searchResults.total || 0,
      query: params.query
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('invalid_auth')) {
        throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
      }
      if (error.message.includes('paid_only')) {
        throw new Error('Search functionality requires a paid Slack plan.');
      }
    }
    throw error;
  }
}

/**
 * Set the status for the authenticated user
 */
export async function slackSetStatus(
  params: {
    status_text?: string;
    status_emoji?: string;
    status_expiration?: number;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Slack operations');
  }

  try {
    const slack = await createSlackClient(context.integrationId, true); // Use user token

    const profile: any = {};
    
    if (params.status_text !== undefined) {
      profile.status_text = params.status_text;
    }
    
    if (params.status_emoji !== undefined) {
      profile.status_emoji = params.status_emoji;
    }
    
    if (params.status_expiration !== undefined) {
      profile.status_expiration = params.status_expiration;
    }

    const result = await slack.users.profile.set({
      profile: profile
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || 'Unknown error'}`);
    }

    return {
      success: true,
      status: {
        text: params.status_text,
        emoji: params.status_emoji,
        expiration: params.status_expiration
      }
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('invalid_auth')) {
        throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
      }
      if (error.message.includes('user_not_found')) {
        throw new Error('User not found. Cannot set status.');
      }
    }
    throw error;
  }
}

/**
 * Create a reminder for a user
 */
export async function slackCreateReminder(
  params: {
    text: string;
    time: string;
    user?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Slack operations');
  }

  try {
    const slack = await createSlackClient(context.integrationId, true); // Use user token

    const result = await slack.reminders.add({
      text: params.text,
      time: params.time,
      user: params.user // If not provided, defaults to authenticated user
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || 'Unknown error'}`);
    }

    const reminder = result.reminder;
    if (!reminder) {
      throw new Error('Failed to create reminder');
    }

    return {
      success: true,
      reminder: {
        id: reminder.id,
        text: reminder.text,
        time: reminder.time,
        user: reminder.user,
        creator: reminder.creator,
        recurring: reminder.recurring,
        complete_ts: reminder.complete_ts
      }
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('invalid_auth')) {
        throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
      }
      if (error.message.includes('cannot_parse')) {
        throw new Error('Could not parse the time. Try formats like "tomorrow at 2pm" or "in 30 minutes".');
      }
      if (error.message.includes('time_in_past')) {
        throw new Error('Cannot set reminder for a time in the past.');
      }
      if (error.message.includes('user_not_found')) {
        throw new Error('User not found. Please check the user ID.');
      }
    }
    throw error;
  }
}

/**
 * Get pending reminders for the authenticated user
 */
export async function slackGetReminders(
  params: {
    team_id?: string;
  },
  context: SkillExecutionContext
): Promise<any> {
  if (!context.integrationId) {
    throw new Error('Integration ID is required for Slack operations');
  }

  try {
    const slack = await createSlackClient(context.integrationId, true); // Use user token

    const result = await slack.reminders.list({
      team_id: params.team_id
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || 'Unknown error'}`);
    }

    const reminders = result.reminders || [];

    // Transform to useful format
    const formattedReminders = reminders.map(reminder => ({
      id: reminder.id,
      text: reminder.text,
      time: reminder.time,
      user: reminder.user,
      creator: reminder.creator,
      recurring: reminder.recurring,
      complete_ts: reminder.complete_ts,
      timestamp: reminder.time ? new Date(reminder.time * 1000).toISOString() : null
    }));

    return {
      success: true,
      reminders: formattedReminders,
      total_count: formattedReminders.length
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('invalid_auth')) {
        throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
      }
    }
    throw error;
  }
}

/**
 * Registry of Slack skill implementations
 */
export const SLACK_SKILL_IMPLEMENTATIONS = {
  slack_send_message: slackSendMessage,
  slack_list_users: slackListUsers,
  slack_get_user_info: slackGetUserInfo,
  slack_get_users_info: slackGetUsersInfo,
  slack_list_channels: slackListChannels,
  slack_get_messages: slackGetMessages,
  slack_get_users_in_conversation: slackGetUsersInConversation,
  slack_get_conversation_metadata: slackGetConversationMetadata,
  slack_search_messages: slackSearchMessages,
  slack_set_status: slackSetStatus,
  slack_create_reminder: slackCreateReminder,
  slack_get_reminders: slackGetReminders,
}; 