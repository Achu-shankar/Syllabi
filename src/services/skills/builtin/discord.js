"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISCORD_SKILL_IMPLEMENTATIONS = exports.discordSkills = void 0;
exports.discordSendMessage = discordSendMessage;
exports.discordListChannels = discordListChannels;
exports.discordGetMessages = discordGetMessages;
exports.discordListMembers = discordListMembers;
exports.discordGetUserInfo = discordGetUserInfo;
exports.discordManageRoles = discordManageRoles;
exports.discordListRoles = discordListRoles;
exports.discordCreateChannel = discordCreateChannel;
exports.discordSendEmbed = discordSendEmbed;
exports.discordAddReaction = discordAddReaction;
exports.discordTestConnection = discordTestConnection;
exports.discordEditMessage = discordEditMessage;
exports.discordDeleteMessage = discordDeleteMessage;
exports.discordBanUser = discordBanUser;
exports.discordKickUser = discordKickUser;
exports.discordTimeoutUser = discordTimeoutUser;
exports.discordCreateInvite = discordCreateInvite;
exports.discordListInvites = discordListInvites;
exports.discordPinMessage = discordPinMessage;
exports.discordUnpinMessage = discordUnpinMessage;
var service_1 = require("@/utils/supabase/service");
/**
 * Discord Built-in Skills Definitions
 */
exports.discordSkills = [
    {
        name: 'discord_send_message',
        display_name: 'Send Discord Message',
        description: 'Send a message to a Discord channel or user',
        category: 'discord',
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
function getDiscordBotToken(integrationId) {
    return __awaiter(this, void 0, void 0, function () {
        var supabase, rpcParams, _a, data, error, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    supabase = (0, service_1.createServiceClient)();
                    rpcParams = { integration_id_in: integrationId };
                    console.log("[Discord Debug] Calling decrypt_discord_bot_token with params:", rpcParams);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, supabase.rpc('decrypt_discord_bot_token', rpcParams)];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        console.error("[Discord Debug] RPC Error Details:", {
                            code: error.code,
                            message: error.message,
                            hint: error.hint,
                            details: error.details
                        });
                        throw new Error("Failed to decrypt Discord token: ".concat(error.message));
                    }
                    if (!data) {
                        console.warn("[Discord Debug] No token returned for integration ID: ".concat(integrationId));
                        throw new Error('No Discord token found for this integration');
                    }
                    console.log("[Discord Debug] Successfully decrypted bot token for integration ID: ".concat(integrationId));
                    return [2 /*return*/, data];
                case 3:
                    error_1 = _b.sent();
                    console.error("[Discord Debug] Token retrieval failed:", error_1);
                    throw new Error("Failed to retrieve Discord credentials: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error'));
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Make Discord API request with authentication
 */
function makeDiscordRequest(endpoint_1, integrationId_1) {
    return __awaiter(this, arguments, void 0, function (endpoint, integrationId, options) {
        var token, response, errorText;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDiscordBotToken(integrationId)];
                case 1:
                    token = _a.sent();
                    // Add some basic token validation
                    if (!token || token.length < 50) {
                        throw new Error("Invalid Discord bot token format (length: ".concat((token === null || token === void 0 ? void 0 : token.length) || 0, ")"));
                    }
                    console.log("[Discord API] Making request to: ".concat(endpoint));
                    return [4 /*yield*/, fetch("https://discord.com/api/v10".concat(endpoint), __assign(__assign({}, options), { headers: __assign({ 'Authorization': "Bot ".concat(token), 'Content-Type': 'application/json' }, options.headers) }))];
                case 2:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.text()];
                case 3:
                    errorText = _a.sent();
                    console.error("[Discord API] Error (".concat(response.status, "):"), errorText);
                    // Provide more specific error messages
                    if (response.status === 401) {
                        throw new Error("Discord bot authentication failed. The bot token may be invalid or the bot may have been removed from the server. Please reconnect your Discord integration.");
                    }
                    else if (response.status === 403) {
                        throw new Error("Discord bot lacks permissions for this operation. Please check the bot's permissions in your Discord server.");
                    }
                    else if (response.status === 404) {
                        throw new Error("Discord resource not found. The channel, user, or server may not exist or the bot may not have access to it.");
                    }
                    else if (response.status === 429) {
                        throw new Error("Discord API rate limit exceeded. Please try again in a few moments.");
                    }
                    else {
                        throw new Error("Discord API request failed: ".concat(response.status, " ").concat(errorText));
                    }
                    _a.label = 4;
                case 4: return [2 /*return*/, response.json()];
            }
        });
    });
}
/**
 * Get guild ID from integration or use provided guild_id
 */
function getGuildId(integrationId, providedGuildId) {
    return __awaiter(this, void 0, void 0, function () {
        var supabase, _a, integration, error;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (providedGuildId) {
                        return [2 /*return*/, providedGuildId];
                    }
                    supabase = (0, service_1.createServiceClient)();
                    return [4 /*yield*/, supabase
                            .from('connected_integrations')
                            .select('metadata')
                            .eq('id', integrationId)
                            .single()];
                case 1:
                    _a = _c.sent(), integration = _a.data, error = _a.error;
                    if (error || !((_b = integration === null || integration === void 0 ? void 0 : integration.metadata) === null || _b === void 0 ? void 0 : _b.guild_id)) {
                        throw new Error('Could not determine Discord server ID');
                    }
                    return [2 /*return*/, integration.metadata.guild_id];
            }
        });
    });
}
/**
 * Send a message to a Discord channel or user
 */
function discordSendMessage(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var message, channel_id, user_id, embed, targetChannelId, dmChannel, messageData, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    message = params.message, channel_id = params.channel_id, user_id = params.user_id, embed = params.embed;
                    if (!channel_id && !user_id) {
                        throw new Error('Either channel_id or user_id must be provided');
                    }
                    targetChannelId = channel_id;
                    if (!(user_id && !channel_id)) return [3 /*break*/, 2];
                    return [4 /*yield*/, makeDiscordRequest('/users/@me/channels', context.integrationId, {
                            method: 'POST',
                            body: JSON.stringify({
                                recipient_id: user_id,
                            }),
                        })];
                case 1:
                    dmChannel = _a.sent();
                    targetChannelId = dmChannel.id;
                    _a.label = 2;
                case 2:
                    if (!targetChannelId) {
                        throw new Error('Could not determine target channel');
                    }
                    messageData = {
                        content: message,
                    };
                    if (embed) {
                        messageData.embeds = [embed];
                    }
                    return [4 /*yield*/, makeDiscordRequest("/channels/".concat(targetChannelId, "/messages"), context.integrationId, {
                            method: 'POST',
                            body: JSON.stringify(messageData),
                        })];
                case 3:
                    result = _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            message_id: result.id,
                            channel_id: result.channel_id,
                            content: result.content,
                            timestamp: result.timestamp,
                        }];
            }
        });
    });
}
/**
 * List channels in a Discord server
 */
function discordListChannels(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var guildId, channels, filteredChannels, typeMap, targetType_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    return [4 /*yield*/, getGuildId(context.integrationId, params.guild_id)];
                case 1:
                    guildId = _a.sent();
                    return [4 /*yield*/, makeDiscordRequest("/guilds/".concat(guildId, "/channels"), context.integrationId)];
                case 2:
                    channels = _a.sent();
                    filteredChannels = channels;
                    if (params.channel_type) {
                        typeMap = {
                            text: 0,
                            voice: 2,
                            category: 4,
                            news: 5,
                            stage: 13,
                        };
                        targetType_1 = typeMap[params.channel_type];
                        if (targetType_1 !== undefined) {
                            filteredChannels = channels.filter(function (channel) { return channel.type === targetType_1; });
                        }
                    }
                    return [2 /*return*/, {
                            success: true,
                            channels: filteredChannels.map(function (channel) { return ({
                                id: channel.id,
                                name: channel.name,
                                type: channel.type,
                                topic: channel.topic,
                                position: channel.position,
                                parent_id: channel.parent_id,
                                nsfw: channel.nsfw,
                            }); }),
                            total_count: filteredChannels.length,
                        }];
            }
        });
    });
}
/**
 * Get messages from a Discord channel
 */
function discordGetMessages(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var channel_id, _a, limit, before, after, queryParams, messages;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    channel_id = params.channel_id, _a = params.limit, limit = _a === void 0 ? 50 : _a, before = params.before, after = params.after;
                    queryParams = new URLSearchParams();
                    queryParams.set('limit', Math.min(limit, 100).toString());
                    if (before)
                        queryParams.set('before', before);
                    if (after)
                        queryParams.set('after', after);
                    return [4 /*yield*/, makeDiscordRequest("/channels/".concat(channel_id, "/messages?").concat(queryParams.toString()), context.integrationId)];
                case 1:
                    messages = _b.sent();
                    return [2 /*return*/, {
                            success: true,
                            messages: messages.map(function (msg) { return ({
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
                            }); }),
                            channel_id: channel_id,
                            total_count: messages.length,
                        }];
            }
        });
    });
}
/**
 * List members in a Discord server
 */
function discordListMembers(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var guildId, _a, limit, after, queryParams, members;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    return [4 /*yield*/, getGuildId(context.integrationId, params.guild_id)];
                case 1:
                    guildId = _b.sent();
                    _a = params.limit, limit = _a === void 0 ? 100 : _a, after = params.after;
                    queryParams = new URLSearchParams();
                    queryParams.set('limit', Math.min(limit, 1000).toString());
                    if (after)
                        queryParams.set('after', after);
                    return [4 /*yield*/, makeDiscordRequest("/guilds/".concat(guildId, "/members?").concat(queryParams.toString()), context.integrationId)];
                case 2:
                    members = _b.sent();
                    return [2 /*return*/, {
                            success: true,
                            members: members.map(function (member) { return ({
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
                            }); }),
                            guild_id: guildId,
                            total_count: members.length,
                        }];
            }
        });
    });
}
/**
 * Get information about a Discord user
 */
function discordGetUserInfo(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var user_id, guild_id, user, memberInfo, guildId, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    user_id = params.user_id, guild_id = params.guild_id;
                    return [4 /*yield*/, makeDiscordRequest("/users/".concat(user_id), context.integrationId)];
                case 1:
                    user = _a.sent();
                    memberInfo = null;
                    if (!guild_id) return [3 /*break*/, 6];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 6]);
                    return [4 /*yield*/, getGuildId(context.integrationId, guild_id)];
                case 3:
                    guildId = _a.sent();
                    return [4 /*yield*/, makeDiscordRequest("/guilds/".concat(guildId, "/members/").concat(user_id), context.integrationId)];
                case 4:
                    memberInfo = _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    error_2 = _a.sent();
                    console.warn('Could not fetch guild member info:', error_2);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/, {
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
                    }];
            }
        });
    });
}
/**
 * Manage roles for a Discord user
 */
function discordManageRoles(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var user_id, guild_id, action, role_id, reason, guildId, endpoint, method, headers;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    user_id = params.user_id, guild_id = params.guild_id, action = params.action, role_id = params.role_id, reason = params.reason;
                    return [4 /*yield*/, getGuildId(context.integrationId, guild_id)];
                case 1:
                    guildId = _a.sent();
                    endpoint = "/guilds/".concat(guildId, "/members/").concat(user_id, "/roles/").concat(role_id);
                    method = action === 'add' ? 'PUT' : 'DELETE';
                    headers = {};
                    if (reason) {
                        headers['X-Audit-Log-Reason'] = reason;
                    }
                    return [4 /*yield*/, makeDiscordRequest(endpoint, context.integrationId, {
                            method: method,
                            headers: headers,
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            action: action,
                            user_id: user_id,
                            role_id: role_id,
                            guild_id: guildId,
                            reason: reason,
                        }];
            }
        });
    });
}
/**
 * List roles in a Discord server
 */
function discordListRoles(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var guildId, roles;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    return [4 /*yield*/, getGuildId(context.integrationId, params.guild_id)];
                case 1:
                    guildId = _a.sent();
                    return [4 /*yield*/, makeDiscordRequest("/guilds/".concat(guildId, "/roles"), context.integrationId)];
                case 2:
                    roles = _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            roles: roles.map(function (role) { return ({
                                id: role.id,
                                name: role.name,
                                color: role.color,
                                hoist: role.hoist,
                                position: role.position,
                                permissions: role.permissions,
                                managed: role.managed,
                                mentionable: role.mentionable,
                            }); }),
                            guild_id: guildId,
                            total_count: roles.length,
                        }];
            }
        });
    });
}
/**
 * Create a new channel in a Discord server
 */
function discordCreateChannel(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var name, type, guild_id, topic, parent_id, guildId, channelData, channel;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    name = params.name, type = params.type, guild_id = params.guild_id, topic = params.topic, parent_id = params.parent_id;
                    return [4 /*yield*/, getGuildId(context.integrationId, guild_id)];
                case 1:
                    guildId = _a.sent();
                    channelData = {
                        name: name,
                        type: type,
                    };
                    if (topic)
                        channelData.topic = topic;
                    if (parent_id)
                        channelData.parent_id = parent_id;
                    return [4 /*yield*/, makeDiscordRequest("/guilds/".concat(guildId, "/channels"), context.integrationId, {
                            method: 'POST',
                            body: JSON.stringify(channelData),
                        })];
                case 2:
                    channel = _a.sent();
                    return [2 /*return*/, {
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
                        }];
            }
        });
    });
}
/**
 * Send a rich embed message to a Discord channel
 */
function discordSendEmbed(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var channel_id, title, description, color, url, thumbnail_url, image_url, footer_text, embed, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    channel_id = params.channel_id, title = params.title, description = params.description, color = params.color, url = params.url, thumbnail_url = params.thumbnail_url, image_url = params.image_url, footer_text = params.footer_text;
                    embed = {
                        title: title,
                    };
                    if (description)
                        embed.description = description;
                    if (color)
                        embed.color = color;
                    if (url)
                        embed.url = url;
                    if (thumbnail_url)
                        embed.thumbnail = { url: thumbnail_url };
                    if (image_url)
                        embed.image = { url: image_url };
                    if (footer_text)
                        embed.footer = { text: footer_text };
                    return [4 /*yield*/, makeDiscordRequest("/channels/".concat(channel_id, "/messages"), context.integrationId, {
                            method: 'POST',
                            body: JSON.stringify({
                                embeds: [embed],
                            }),
                        })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            message_id: result.id,
                            channel_id: result.channel_id,
                            embeds: result.embeds,
                            timestamp: result.timestamp,
                        }];
            }
        });
    });
}
/**
 * Add a reaction to a Discord message
 */
function discordAddReaction(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var channel_id, message_id, emoji, encodedEmoji;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    channel_id = params.channel_id, message_id = params.message_id, emoji = params.emoji;
                    encodedEmoji = encodeURIComponent(emoji);
                    return [4 /*yield*/, makeDiscordRequest("/channels/".concat(channel_id, "/messages/").concat(message_id, "/reactions/").concat(encodedEmoji, "/@me"), context.integrationId, {
                            method: 'PUT',
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            channel_id: channel_id,
                            message_id: message_id,
                            emoji: emoji,
                        }];
            }
        });
    });
}
/**
 * Test Discord bot connection and permissions
 */
function discordTestConnection(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var botUser, guildId, guild, channels, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, makeDiscordRequest('/users/@me', context.integrationId)];
                case 2:
                    botUser = _a.sent();
                    console.log("[Discord Test] Bot user:", botUser);
                    return [4 /*yield*/, getGuildId(context.integrationId)];
                case 3:
                    guildId = _a.sent();
                    return [4 /*yield*/, makeDiscordRequest("/guilds/".concat(guildId), context.integrationId)];
                case 4:
                    guild = _a.sent();
                    console.log("[Discord Test] Guild:", guild);
                    return [4 /*yield*/, makeDiscordRequest("/guilds/".concat(guildId, "/channels"), context.integrationId)];
                case 5:
                    channels = _a.sent();
                    console.log("[Discord Test] Found ".concat(channels.length, " channels"));
                    return [2 /*return*/, {
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
                        }];
                case 6:
                    error_3 = _a.sent();
                    console.error('[Discord Test] Connection test failed:', error_3);
                    return [2 /*return*/, {
                            success: false,
                            error: error_3 instanceof Error ? error_3.message : 'Unknown error',
                            message: 'Discord bot connection failed. Please check your integration settings.'
                        }];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Edit an existing Discord message
 */
function discordEditMessage(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var channel_id, message_id, new_content, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    channel_id = params.channel_id, message_id = params.message_id, new_content = params.new_content;
                    return [4 /*yield*/, makeDiscordRequest("/channels/".concat(channel_id, "/messages/").concat(message_id), context.integrationId, {
                            method: 'PATCH',
                            body: JSON.stringify({
                                content: new_content
                            })
                        })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            message_id: result.id,
                            channel_id: result.channel_id,
                            new_content: result.content,
                            edited_timestamp: result.edited_timestamp
                        }];
            }
        });
    });
}
/**
 * Delete a Discord message
 */
function discordDeleteMessage(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var channel_id, message_id;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    channel_id = params.channel_id, message_id = params.message_id;
                    return [4 /*yield*/, makeDiscordRequest("/channels/".concat(channel_id, "/messages/").concat(message_id), context.integrationId, {
                            method: 'DELETE'
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            message_id: message_id,
                            channel_id: channel_id,
                            action: 'deleted'
                        }];
            }
        });
    });
}
/**
 * Ban a user from the Discord server
 */
function discordBanUser(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var user_id, reason, _a, delete_message_days, guildId;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    user_id = params.user_id, reason = params.reason, _a = params.delete_message_days, delete_message_days = _a === void 0 ? 0 : _a;
                    return [4 /*yield*/, getGuildId(context.integrationId)];
                case 1:
                    guildId = _b.sent();
                    return [4 /*yield*/, makeDiscordRequest("/guilds/".concat(guildId, "/bans/").concat(user_id), context.integrationId, {
                            method: 'PUT',
                            body: JSON.stringify({
                                delete_message_days: Math.min(Math.max(delete_message_days, 0), 7), // Clamp between 0-7
                                reason: reason
                            })
                        })];
                case 2:
                    _b.sent();
                    return [2 /*return*/, {
                            success: true,
                            user_id: user_id,
                            guild_id: guildId,
                            action: 'banned',
                            reason: reason,
                            delete_message_days: delete_message_days
                        }];
            }
        });
    });
}
/**
 * Kick a user from the Discord server
 */
function discordKickUser(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var user_id, reason, guildId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    user_id = params.user_id, reason = params.reason;
                    return [4 /*yield*/, getGuildId(context.integrationId)];
                case 1:
                    guildId = _a.sent();
                    return [4 /*yield*/, makeDiscordRequest("/guilds/".concat(guildId, "/members/").concat(user_id), context.integrationId, {
                            method: 'DELETE',
                            headers: {
                                'X-Audit-Log-Reason': reason || 'No reason provided'
                            }
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            user_id: user_id,
                            guild_id: guildId,
                            action: 'kicked',
                            reason: reason
                        }];
            }
        });
    });
}
/**
 * Timeout a user in the Discord server
 */
function discordTimeoutUser(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var user_id, duration_minutes, reason, guildId, maxMinutes, clampedDuration, timeoutUntil;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    user_id = params.user_id, duration_minutes = params.duration_minutes, reason = params.reason;
                    return [4 /*yield*/, getGuildId(context.integrationId)];
                case 1:
                    guildId = _a.sent();
                    maxMinutes = 40320;
                    clampedDuration = Math.min(Math.max(duration_minutes, 1), maxMinutes);
                    timeoutUntil = new Date(Date.now() + clampedDuration * 60 * 1000).toISOString();
                    return [4 /*yield*/, makeDiscordRequest("/guilds/".concat(guildId, "/members/").concat(user_id), context.integrationId, {
                            method: 'PATCH',
                            body: JSON.stringify({
                                communication_disabled_until: timeoutUntil
                            }),
                            headers: {
                                'X-Audit-Log-Reason': reason || 'No reason provided'
                            }
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            user_id: user_id,
                            guild_id: guildId,
                            action: 'timeout',
                            duration_minutes: clampedDuration,
                            timeout_until: timeoutUntil,
                            reason: reason
                        }];
            }
        });
    });
}
/**
 * Create an invite for a Discord channel
 */
function discordCreateInvite(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var channel_id, _a, max_age, _b, max_uses, _c, temporary, result;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    channel_id = params.channel_id, _a = params.max_age, max_age = _a === void 0 ? 86400 : _a, _b = params.max_uses, max_uses = _b === void 0 ? 0 : _b, _c = params.temporary, temporary = _c === void 0 ? false : _c;
                    return [4 /*yield*/, makeDiscordRequest("/channels/".concat(channel_id, "/invites"), context.integrationId, {
                            method: 'POST',
                            body: JSON.stringify({
                                max_age: max_age,
                                max_uses: max_uses,
                                temporary: temporary
                            })
                        })];
                case 1:
                    result = _d.sent();
                    return [2 /*return*/, {
                            success: true,
                            invite_code: result.code,
                            invite_url: "https://discord.gg/".concat(result.code),
                            channel_id: channel_id,
                            max_age: max_age,
                            max_uses: max_uses,
                            temporary: temporary,
                            expires_at: result.expires_at
                        }];
            }
        });
    });
}
/**
 * List all invites for the Discord server
 */
function discordListInvites(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var guildId, invites;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    return [4 /*yield*/, getGuildId(context.integrationId)];
                case 1:
                    guildId = _a.sent();
                    return [4 /*yield*/, makeDiscordRequest("/guilds/".concat(guildId, "/invites"), context.integrationId)];
                case 2:
                    invites = _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            guild_id: guildId,
                            invites: invites.map(function (invite) { return ({
                                code: invite.code,
                                url: "https://discord.gg/".concat(invite.code),
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
                            }); }),
                            total_invites: invites.length
                        }];
            }
        });
    });
}
/**
 * Pin a message in a Discord channel
 */
function discordPinMessage(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var channel_id, message_id;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    channel_id = params.channel_id, message_id = params.message_id;
                    return [4 /*yield*/, makeDiscordRequest("/channels/".concat(channel_id, "/pins/").concat(message_id), context.integrationId, {
                            method: 'PUT'
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            message_id: message_id,
                            channel_id: channel_id,
                            action: 'pinned'
                        }];
            }
        });
    });
}
/**
 * Unpin a message in a Discord channel
 */
function discordUnpinMessage(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var channel_id, message_id;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Discord operations');
                    }
                    channel_id = params.channel_id, message_id = params.message_id;
                    return [4 /*yield*/, makeDiscordRequest("/channels/".concat(channel_id, "/pins/").concat(message_id), context.integrationId, {
                            method: 'DELETE'
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            message_id: message_id,
                            channel_id: channel_id,
                            action: 'unpinned'
                        }];
            }
        });
    });
}
/**
 * Discord skill implementations registry
 * Maps skill names to their implementation functions
 */
exports.DISCORD_SKILL_IMPLEMENTATIONS = {
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
