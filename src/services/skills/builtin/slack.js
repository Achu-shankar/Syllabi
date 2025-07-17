"use strict";
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
exports.SLACK_SKILL_IMPLEMENTATIONS = exports.SLACK_SKILL_DEFINITIONS = void 0;
exports.slackSendMessage = slackSendMessage;
exports.slackListUsers = slackListUsers;
exports.slackGetUserInfo = slackGetUserInfo;
exports.slackListChannels = slackListChannels;
exports.slackGetUsersInfo = slackGetUsersInfo;
exports.slackGetUsersInConversation = slackGetUsersInConversation;
exports.slackGetConversationMetadata = slackGetConversationMetadata;
exports.slackGetMessages = slackGetMessages;
exports.slackSearchMessages = slackSearchMessages;
exports.slackSetStatus = slackSetStatus;
exports.slackCreateReminder = slackCreateReminder;
exports.slackGetReminders = slackGetReminders;
var web_api_1 = require("@slack/web-api");
var service_1 = require("@/utils/supabase/service");
/**
 * Slack skill definitions for the built-in skills registry
 */
exports.SLACK_SKILL_DEFINITIONS = [
    {
        name: 'slack_send_message',
        display_name: 'Send Slack Message',
        description: 'Send a message to a channel, user, or group of users',
        category: 'slack',
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
function getSlackBotToken(integrationId) {
    return __awaiter(this, void 0, void 0, function () {
        var supabase, rpcParams, _a, data, error, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    supabase = (0, service_1.createServiceClient)();
                    rpcParams = { integration_id_in: integrationId };
                    console.log("[Slack Debug] Calling decrypt_slack_bot_token with params:", rpcParams);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, supabase.rpc('decrypt_slack_bot_token', rpcParams)];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        console.error("[Slack Debug] RPC Error Details:", {
                            code: error.code,
                            message: error.message,
                            hint: error.hint,
                            details: error.details
                        });
                        throw new Error("Failed to decrypt Slack token: ".concat(error.message));
                    }
                    if (!data) {
                        console.warn("[Slack Debug] No token returned for integration ID: ".concat(integrationId));
                        throw new Error('No Slack token found for this integration');
                    }
                    console.log("[Slack Debug] Successfully decrypted bot token for integration ID: ".concat(integrationId));
                    return [2 /*return*/, data];
                case 3:
                    error_1 = _b.sent();
                    console.error("[Slack Debug] Token retrieval failed:", error_1);
                    throw new Error("Failed to retrieve Slack credentials: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error'));
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get decrypted Slack user token for an integration (for personal actions like reminders)
 */
function getSlackUserToken(integrationId) {
    return __awaiter(this, void 0, void 0, function () {
        var supabase, rpcParams, _a, data, error, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    supabase = (0, service_1.createServiceClient)();
                    rpcParams = { integration_id_in: integrationId };
                    console.log("[Slack Debug] Calling decrypt_slack_user_token with params:", rpcParams);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, supabase.rpc('decrypt_slack_user_token', rpcParams)];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        console.error("[Slack Debug] User Token RPC Error Details:", {
                            code: error.code,
                            message: error.message,
                            hint: error.hint,
                            details: error.details
                        });
                        throw new Error("Failed to decrypt Slack user token: ".concat(error.message));
                    }
                    if (!data) {
                        console.warn("[Slack Debug] No user token returned for integration ID: ".concat(integrationId));
                        throw new Error('No Slack user token found. Please reconnect your Slack integration with user permissions.');
                    }
                    console.log("[Slack Debug] Successfully decrypted user token for integration ID: ".concat(integrationId));
                    return [2 /*return*/, data];
                case 3:
                    error_2 = _b.sent();
                    console.error("[Slack Debug] User token retrieval failed:", error_2);
                    throw new Error("Failed to retrieve user token: ".concat(error_2 instanceof Error ? error_2.message : 'Unknown error'));
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Create Slack WebClient with authenticated token
 */
function createSlackClient(integrationId_1) {
    return __awaiter(this, arguments, void 0, function (integrationId, useUserToken) {
        var token, _a;
        if (useUserToken === void 0) { useUserToken = false; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!useUserToken) return [3 /*break*/, 2];
                    return [4 /*yield*/, getSlackUserToken(integrationId)];
                case 1:
                    _a = _b.sent();
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, getSlackBotToken(integrationId)];
                case 3:
                    _a = _b.sent();
                    _b.label = 4;
                case 4:
                    token = _a;
                    return [2 /*return*/, new web_api_1.WebClient(token, {
                            retryConfig: {
                                retries: 2,
                                factor: 2,
                            },
                            timeout: 10000,
                        })];
            }
        });
    });
}
/**
 * Send a message to a Slack channel or user
 */
function slackSendMessage(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var slack, targetChannel, dmResult, groupResult, result, error_3;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Slack operations');
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 13, , 14]);
                    return [4 /*yield*/, createSlackClient(context.integrationId)];
                case 2:
                    slack = _c.sent();
                    targetChannel = void 0;
                    if (!params.conversation_id) return [3 /*break*/, 3];
                    targetChannel = params.conversation_id;
                    return [3 /*break*/, 11];
                case 3:
                    if (!params.channel_name) return [3 /*break*/, 4];
                    targetChannel = params.channel_name;
                    return [3 /*break*/, 11];
                case 4:
                    if (!(params.user_ids || params.emails)) return [3 /*break*/, 10];
                    if (!(params.user_ids && params.user_ids.length === 1)) return [3 /*break*/, 6];
                    return [4 /*yield*/, slack.conversations.open({
                            users: params.user_ids[0]
                        })];
                case 5:
                    dmResult = _c.sent();
                    if (!dmResult.ok) {
                        throw new Error("Failed to open DM: ".concat(dmResult.error));
                    }
                    targetChannel = dmResult.channel.id;
                    return [3 /*break*/, 9];
                case 6:
                    if (!(params.user_ids && params.user_ids.length > 1)) return [3 /*break*/, 8];
                    return [4 /*yield*/, slack.conversations.open({
                            users: params.user_ids.join(',')
                        })];
                case 7:
                    groupResult = _c.sent();
                    if (!groupResult.ok) {
                        throw new Error("Failed to open group conversation: ".concat(groupResult.error));
                    }
                    targetChannel = groupResult.channel.id;
                    return [3 /*break*/, 9];
                case 8: throw new Error('User lookup by email not yet implemented - please use user_ids');
                case 9: return [3 /*break*/, 11];
                case 10: throw new Error('Must provide conversation_id, channel_name, or user_ids');
                case 11: return [4 /*yield*/, slack.chat.postMessage({
                        channel: targetChannel,
                        text: params.message,
                        thread_ts: params.thread_ts,
                        link_names: true,
                        parse: 'full'
                    })];
                case 12:
                    result = _c.sent();
                    if (!result.ok) {
                        throw new Error("Slack API error: ".concat(result.error || 'Unknown error'));
                    }
                    return [2 /*return*/, {
                            success: true,
                            message_ts: result.ts,
                            channel: result.channel,
                            text: params.message,
                            permalink: (_b = (_a = result.message) === null || _a === void 0 ? void 0 : _a.permalink) !== null && _b !== void 0 ? _b : undefined
                        }];
                case 13:
                    error_3 = _c.sent();
                    if (error_3 instanceof Error) {
                        if (error_3.message.includes('channel_not_found')) {
                            throw new Error('Channel not found. Please check the channel name or ID.');
                        }
                        if (error_3.message.includes('not_in_channel')) {
                            throw new Error('Bot is not a member of this channel. Please invite the bot to the channel first.');
                        }
                        if (error_3.message.includes('invalid_auth')) {
                            throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
                        }
                        if (error_3.message.includes('rate_limited')) {
                            throw new Error('Rate limited by Slack. Please try again in a moment.');
                        }
                    }
                    throw error_3;
                case 14: return [2 /*return*/];
            }
        });
    });
}
/**
 * List users in the Slack workspace
 */
function slackListUsers(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var slack, result, users, formattedUsers, error_4;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Slack operations');
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, createSlackClient(context.integrationId)];
                case 2:
                    slack = _b.sent();
                    return [4 /*yield*/, slack.users.list({
                            limit: Math.min(params.limit || 200, 500),
                            cursor: params.cursor
                        })];
                case 3:
                    result = _b.sent();
                    if (!result.ok) {
                        throw new Error("Slack API error: ".concat(result.error || 'Unknown error'));
                    }
                    users = result.members || [];
                    // Filter out bots if requested
                    if (params.exclude_bots !== false) {
                        users = users.filter(function (user) { return !user.is_bot && !user.deleted; });
                    }
                    formattedUsers = users.map(function (user) {
                        var _a, _b, _c;
                        return ({
                            id: user.id,
                            name: user.name,
                            real_name: user.real_name,
                            display_name: (_a = user.profile) === null || _a === void 0 ? void 0 : _a.display_name,
                            email: (_b = user.profile) === null || _b === void 0 ? void 0 : _b.email,
                            title: (_c = user.profile) === null || _c === void 0 ? void 0 : _c.title,
                            is_admin: user.is_admin,
                            is_owner: user.is_owner,
                            timezone: user.tz_label
                        });
                    });
                    return [2 /*return*/, {
                            success: true,
                            users: formattedUsers,
                            total_count: formattedUsers.length,
                            next_cursor: (_a = result.response_metadata) === null || _a === void 0 ? void 0 : _a.next_cursor
                        }];
                case 4:
                    error_4 = _b.sent();
                    if (error_4 instanceof Error && error_4.message.includes('invalid_auth')) {
                        throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
                    }
                    throw error_4;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get information about a specific Slack user
 */
function slackGetUserInfo(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var slack, result, user, error_5;
        var _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Slack operations');
                    }
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, createSlackClient(context.integrationId)];
                case 2:
                    slack = _g.sent();
                    return [4 /*yield*/, slack.users.info({
                            user: params.user_id
                        })];
                case 3:
                    result = _g.sent();
                    if (!result.ok) {
                        throw new Error("Slack API error: ".concat(result.error || 'Unknown error'));
                    }
                    user = result.user;
                    if (!user) {
                        throw new Error('User not found');
                    }
                    return [2 /*return*/, {
                            success: true,
                            user: {
                                id: user.id,
                                name: user.name,
                                real_name: user.real_name,
                                display_name: (_a = user.profile) === null || _a === void 0 ? void 0 : _a.display_name,
                                email: (_b = user.profile) === null || _b === void 0 ? void 0 : _b.email,
                                phone: (_c = user.profile) === null || _c === void 0 ? void 0 : _c.phone,
                                title: (_d = user.profile) === null || _d === void 0 ? void 0 : _d.title,
                                status_text: (_e = user.profile) === null || _e === void 0 ? void 0 : _e.status_text,
                                status_emoji: (_f = user.profile) === null || _f === void 0 ? void 0 : _f.status_emoji,
                                is_admin: user.is_admin,
                                is_owner: user.is_owner,
                                is_bot: user.is_bot,
                                timezone: user.tz_label,
                                timezone_offset: user.tz_offset
                            }
                        }];
                case 4:
                    error_5 = _g.sent();
                    if (error_5 instanceof Error) {
                        if (error_5.message.includes('user_not_found')) {
                            throw new Error('User not found. Please check the user ID.');
                        }
                        if (error_5.message.includes('invalid_auth')) {
                            throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
                        }
                    }
                    throw error_5;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * List channels in the Slack workspace
 */
function slackListChannels(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var slack, types, result, channels, formattedChannels, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Slack operations');
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, createSlackClient(context.integrationId)];
                case 2:
                    slack = _a.sent();
                    types = params.types || 'public_channel,private_channel';
                    return [4 /*yield*/, slack.conversations.list({
                            types: types,
                            exclude_archived: params.exclude_archived !== false, // Default to excluding archived
                            limit: Math.min(params.limit || 200, 1000) // Cap at 1000 as per Slack API
                        })];
                case 3:
                    result = _a.sent();
                    if (!result.ok) {
                        throw new Error("Slack API error: ".concat(result.error || 'Unknown error'));
                    }
                    channels = result.channels || [];
                    formattedChannels = channels.map(function (channel) {
                        var _a, _b;
                        return ({
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
                            topic: (_a = channel.topic) === null || _a === void 0 ? void 0 : _a.value,
                            purpose: (_b = channel.purpose) === null || _b === void 0 ? void 0 : _b.value,
                            created: channel.created
                        });
                    });
                    return [2 /*return*/, {
                            success: true,
                            channels: formattedChannels,
                            total_count: formattedChannels.length
                        }];
                case 4:
                    error_6 = _a.sent();
                    if (error_6 instanceof Error && error_6.message.includes('invalid_auth')) {
                        throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
                    }
                    throw error_6;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get information about multiple Slack users
 */
function slackGetUsersInfo(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var slack, foundUsers, _i, _a, userId, result, error_7, _b, _c, email, result, error_8, allUsersResult, usersByName_1, _d, _e, username, user, formattedUsers, error_9;
        var _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Slack operations');
                    }
                    if (!params.user_ids && !params.emails && !params.usernames) {
                        throw new Error('Must provide at least one of: user_ids, emails, or usernames');
                    }
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 17, , 18]);
                    return [4 /*yield*/, createSlackClient(context.integrationId)];
                case 2:
                    slack = _g.sent();
                    foundUsers = [];
                    if (!params.user_ids) return [3 /*break*/, 8];
                    _i = 0, _a = params.user_ids;
                    _g.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3 /*break*/, 8];
                    userId = _a[_i];
                    _g.label = 4;
                case 4:
                    _g.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, slack.users.info({ user: userId })];
                case 5:
                    result = _g.sent();
                    if (result.ok && result.user) {
                        foundUsers.push(result.user);
                    }
                    return [3 /*break*/, 7];
                case 6:
                    error_7 = _g.sent();
                    console.warn("Failed to fetch user ".concat(userId, ":"), error_7);
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 3];
                case 8:
                    if (!params.emails) return [3 /*break*/, 14];
                    _b = 0, _c = params.emails;
                    _g.label = 9;
                case 9:
                    if (!(_b < _c.length)) return [3 /*break*/, 14];
                    email = _c[_b];
                    _g.label = 10;
                case 10:
                    _g.trys.push([10, 12, , 13]);
                    return [4 /*yield*/, slack.users.lookupByEmail({ email: email })];
                case 11:
                    result = _g.sent();
                    if (result.ok && result.user) {
                        foundUsers.push(result.user);
                    }
                    return [3 /*break*/, 13];
                case 12:
                    error_8 = _g.sent();
                    console.warn("Failed to fetch user by email ".concat(email, ":"), error_8);
                    return [3 /*break*/, 13];
                case 13:
                    _b++;
                    return [3 /*break*/, 9];
                case 14:
                    if (!params.usernames) return [3 /*break*/, 16];
                    return [4 /*yield*/, slack.users.list({})];
                case 15:
                    allUsersResult = _g.sent();
                    if (allUsersResult.ok) {
                        usersByName_1 = new Map();
                        (_f = allUsersResult.members) === null || _f === void 0 ? void 0 : _f.forEach(function (user) {
                            if (user.name)
                                usersByName_1.set(user.name, user);
                        });
                        for (_d = 0, _e = params.usernames; _d < _e.length; _d++) {
                            username = _e[_d];
                            user = usersByName_1.get(username);
                            if (user) {
                                foundUsers.push(user);
                            }
                        }
                    }
                    _g.label = 16;
                case 16:
                    formattedUsers = foundUsers.map(function (user) {
                        var _a, _b, _c, _d, _e, _f;
                        return ({
                            id: user.id,
                            name: user.name,
                            real_name: user.real_name,
                            display_name: (_a = user.profile) === null || _a === void 0 ? void 0 : _a.display_name,
                            email: (_b = user.profile) === null || _b === void 0 ? void 0 : _b.email,
                            phone: (_c = user.profile) === null || _c === void 0 ? void 0 : _c.phone,
                            title: (_d = user.profile) === null || _d === void 0 ? void 0 : _d.title,
                            status_text: (_e = user.profile) === null || _e === void 0 ? void 0 : _e.status_text,
                            status_emoji: (_f = user.profile) === null || _f === void 0 ? void 0 : _f.status_emoji,
                            is_admin: user.is_admin,
                            is_owner: user.is_owner,
                            is_bot: user.is_bot,
                            timezone: user.tz_label,
                            timezone_offset: user.tz_offset
                        });
                    });
                    return [2 /*return*/, {
                            success: true,
                            users: formattedUsers,
                            total_count: formattedUsers.length
                        }];
                case 17:
                    error_9 = _g.sent();
                    if (error_9 instanceof Error && error_9.message.includes('invalid_auth')) {
                        throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
                    }
                    throw error_9;
                case 18: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get users in a conversation
 */
function slackGetUsersInConversation(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var slack, channelId, channelsResult, channel, result, userDetails, memberIds, _i, memberIds_1, userId, userResult, error_10, error_11;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Slack operations');
                    }
                    if (!params.conversation_id && !params.channel_name) {
                        throw new Error('Must provide either conversation_id or channel_name');
                    }
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 12, , 13]);
                    return [4 /*yield*/, createSlackClient(context.integrationId)];
                case 2:
                    slack = _e.sent();
                    channelId = params.conversation_id;
                    if (!(!channelId && params.channel_name)) return [3 /*break*/, 4];
                    return [4 /*yield*/, slack.conversations.list({
                            types: 'public_channel,private_channel'
                        })];
                case 3:
                    channelsResult = _e.sent();
                    if (channelsResult.ok) {
                        channel = (_a = channelsResult.channels) === null || _a === void 0 ? void 0 : _a.find(function (ch) { var _a; return ch.name === ((_a = params.channel_name) === null || _a === void 0 ? void 0 : _a.replace('#', '')); });
                        if (channel) {
                            channelId = channel.id;
                        }
                        else {
                            throw new Error("Channel ".concat(params.channel_name, " not found"));
                        }
                    }
                    _e.label = 4;
                case 4:
                    if (!channelId) {
                        throw new Error('Could not resolve channel ID');
                    }
                    return [4 /*yield*/, slack.conversations.members({
                            channel: channelId,
                            limit: Math.min(params.limit || 200, 500),
                            cursor: params.cursor
                        })];
                case 5:
                    result = _e.sent();
                    if (!result.ok) {
                        throw new Error("Slack API error: ".concat(result.error || 'Unknown error'));
                    }
                    userDetails = [];
                    memberIds = result.members || [];
                    _i = 0, memberIds_1 = memberIds;
                    _e.label = 6;
                case 6:
                    if (!(_i < memberIds_1.length)) return [3 /*break*/, 11];
                    userId = memberIds_1[_i];
                    _e.label = 7;
                case 7:
                    _e.trys.push([7, 9, , 10]);
                    return [4 /*yield*/, slack.users.info({ user: userId })];
                case 8:
                    userResult = _e.sent();
                    if (userResult.ok && userResult.user) {
                        userDetails.push({
                            id: userResult.user.id,
                            name: userResult.user.name,
                            real_name: userResult.user.real_name,
                            display_name: (_b = userResult.user.profile) === null || _b === void 0 ? void 0 : _b.display_name,
                            email: (_c = userResult.user.profile) === null || _c === void 0 ? void 0 : _c.email,
                            is_admin: userResult.user.is_admin,
                            is_owner: userResult.user.is_owner,
                            is_bot: userResult.user.is_bot
                        });
                    }
                    return [3 /*break*/, 10];
                case 9:
                    error_10 = _e.sent();
                    console.warn("Failed to fetch details for user ".concat(userId));
                    return [3 /*break*/, 10];
                case 10:
                    _i++;
                    return [3 /*break*/, 6];
                case 11: return [2 /*return*/, {
                        success: true,
                        users: userDetails,
                        total_count: userDetails.length,
                        next_cursor: (_d = result.response_metadata) === null || _d === void 0 ? void 0 : _d.next_cursor
                    }];
                case 12:
                    error_11 = _e.sent();
                    if (error_11 instanceof Error) {
                        if (error_11.message.includes('channel_not_found')) {
                            throw new Error('Channel not found. Please check the channel name or ID.');
                        }
                        if (error_11.message.includes('invalid_auth')) {
                            throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
                        }
                    }
                    throw error_11;
                case 13: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get conversation metadata
 */
function slackGetConversationMetadata(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var slack, channelId, channelsResult, channel_1, dmResult, groupResult, result, channel, error_12;
        var _a, _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Slack operations');
                    }
                    _h.label = 1;
                case 1:
                    _h.trys.push([1, 10, , 11]);
                    return [4 /*yield*/, createSlackClient(context.integrationId)];
                case 2:
                    slack = _h.sent();
                    channelId = params.conversation_id;
                    if (!(!channelId && params.channel_name)) return [3 /*break*/, 4];
                    return [4 /*yield*/, slack.conversations.list({
                            types: 'public_channel,private_channel,mpim,im'
                        })];
                case 3:
                    channelsResult = _h.sent();
                    if (channelsResult.ok) {
                        channel_1 = (_a = channelsResult.channels) === null || _a === void 0 ? void 0 : _a.find(function (ch) { var _a; return ch.name === ((_a = params.channel_name) === null || _a === void 0 ? void 0 : _a.replace('#', '')); });
                        if (channel_1) {
                            channelId = channel_1.id;
                        }
                    }
                    _h.label = 4;
                case 4:
                    if (!(!channelId && (params.user_ids || params.emails))) return [3 /*break*/, 8];
                    if (!params.user_ids) return [3 /*break*/, 8];
                    if (!(params.user_ids.length === 1)) return [3 /*break*/, 6];
                    return [4 /*yield*/, slack.conversations.open({
                            users: params.user_ids[0]
                        })];
                case 5:
                    dmResult = _h.sent();
                    if (dmResult.ok) {
                        channelId = dmResult.channel.id;
                    }
                    return [3 /*break*/, 8];
                case 6:
                    if (!(params.user_ids.length > 1)) return [3 /*break*/, 8];
                    return [4 /*yield*/, slack.conversations.open({
                            users: params.user_ids.join(',')
                        })];
                case 7:
                    groupResult = _h.sent();
                    if (groupResult.ok) {
                        channelId = groupResult.channel.id;
                    }
                    _h.label = 8;
                case 8:
                    if (!channelId) {
                        throw new Error('Could not resolve conversation ID');
                    }
                    return [4 /*yield*/, slack.conversations.info({
                            channel: channelId
                        })];
                case 9:
                    result = _h.sent();
                    if (!result.ok) {
                        throw new Error("Slack API error: ".concat(result.error || 'Unknown error'));
                    }
                    channel = result.channel;
                    if (!channel) {
                        throw new Error('Channel not found');
                    }
                    return [2 /*return*/, {
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
                                    value: (_b = channel.topic) === null || _b === void 0 ? void 0 : _b.value,
                                    creator: (_c = channel.topic) === null || _c === void 0 ? void 0 : _c.creator,
                                    last_set: (_d = channel.topic) === null || _d === void 0 ? void 0 : _d.last_set
                                },
                                purpose: {
                                    value: (_e = channel.purpose) === null || _e === void 0 ? void 0 : _e.value,
                                    creator: (_f = channel.purpose) === null || _f === void 0 ? void 0 : _f.creator,
                                    last_set: (_g = channel.purpose) === null || _g === void 0 ? void 0 : _g.last_set
                                },
                                created: channel.created,
                                creator: channel.creator
                            }
                        }];
                case 10:
                    error_12 = _h.sent();
                    if (error_12 instanceof Error) {
                        if (error_12.message.includes('channel_not_found')) {
                            throw new Error('Channel not found. Please check the channel name or ID.');
                        }
                        if (error_12.message.includes('invalid_auth')) {
                            throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
                        }
                    }
                    throw error_12;
                case 11: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get messages from a Slack channel or conversation
 */
function slackGetMessages(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var slack, channelId, channelsResult, channel, conversationResult, oldest, latest, result, messages, formattedMessages, error_13;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Slack operations');
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 8, , 9]);
                    return [4 /*yield*/, createSlackClient(context.integrationId)];
                case 2:
                    slack = _c.sent();
                    channelId = params.conversation_id;
                    if (!(!channelId && params.channel_name)) return [3 /*break*/, 4];
                    return [4 /*yield*/, slack.conversations.list({
                            types: 'public_channel,private_channel,mpim,im'
                        })];
                case 3:
                    channelsResult = _c.sent();
                    if (channelsResult.ok) {
                        channel = (_a = channelsResult.channels) === null || _a === void 0 ? void 0 : _a.find(function (ch) { var _a; return ch.name === ((_a = params.channel_name) === null || _a === void 0 ? void 0 : _a.replace('#', '')); });
                        if (channel) {
                            channelId = channel.id;
                        }
                    }
                    _c.label = 4;
                case 4:
                    if (!(!channelId && (params.user_ids || params.emails))) return [3 /*break*/, 6];
                    if (!params.user_ids) return [3 /*break*/, 6];
                    return [4 /*yield*/, slack.conversations.open({
                            users: params.user_ids.join(',')
                        })];
                case 5:
                    conversationResult = _c.sent();
                    if (conversationResult.ok) {
                        channelId = conversationResult.channel.id;
                    }
                    _c.label = 6;
                case 6:
                    if (!channelId) {
                        throw new Error('Could not resolve conversation - provide conversation_id, channel_name, or user_ids');
                    }
                    oldest = void 0;
                    latest = void 0;
                    if (params.oldest_datetime) {
                        oldest = (new Date(params.oldest_datetime).getTime() / 1000).toString();
                    }
                    if (params.latest_datetime) {
                        latest = (new Date(params.latest_datetime).getTime() / 1000).toString();
                    }
                    return [4 /*yield*/, slack.conversations.history({
                            channel: channelId,
                            limit: Math.min(params.limit || 20, 1000),
                            oldest: oldest,
                            latest: latest,
                            cursor: params.cursor
                        })];
                case 7:
                    result = _c.sent();
                    if (!result.ok) {
                        throw new Error("Slack API error: ".concat(result.error || 'Unknown error'));
                    }
                    messages = result.messages || [];
                    formattedMessages = messages.map(function (message) {
                        var _a;
                        return ({
                            ts: message.ts,
                            user: message.user,
                            text: message.text,
                            type: message.type,
                            subtype: message.subtype,
                            thread_ts: message.thread_ts,
                            reply_count: message.reply_count,
                            reactions: message.reactions,
                            files: (_a = message.files) === null || _a === void 0 ? void 0 : _a.map(function (file) { return ({
                                id: file.id,
                                name: file.name,
                                mimetype: file.mimetype,
                                size: file.size,
                                url: file.url_private
                            }); }),
                            timestamp: new Date(parseFloat(message.ts || '0') * 1000).toISOString()
                        });
                    });
                    return [2 /*return*/, {
                            success: true,
                            messages: formattedMessages,
                            total_count: formattedMessages.length,
                            has_more: result.has_more,
                            next_cursor: (_b = result.response_metadata) === null || _b === void 0 ? void 0 : _b.next_cursor
                        }];
                case 8:
                    error_13 = _c.sent();
                    if (error_13 instanceof Error) {
                        if (error_13.message.includes('channel_not_found')) {
                            throw new Error('Channel not found. Please check the channel name or ID.');
                        }
                        if (error_13.message.includes('not_in_channel')) {
                            throw new Error('Bot is not a member of this channel. Please invite the bot to the channel first.');
                        }
                        if (error_13.message.includes('invalid_auth')) {
                            throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
                        }
                    }
                    throw error_13;
                case 9: return [2 /*return*/];
            }
        });
    });
}
/**
 * Search for messages across the Slack workspace
 */
function slackSearchMessages(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var slack, result, searchResults, formattedMessages, error_14;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Slack operations');
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, createSlackClient(context.integrationId)];
                case 2:
                    slack = _b.sent();
                    return [4 /*yield*/, slack.search.messages({
                            query: params.query,
                            sort: params.sort || 'score',
                            sort_dir: params.sort_dir || 'desc',
                            count: Math.min(params.limit || 20, 100) // Max 100 per Slack API
                        })];
                case 3:
                    result = _b.sent();
                    if (!result.ok) {
                        throw new Error("Slack API error: ".concat(result.error || 'Unknown error'));
                    }
                    searchResults = result.messages;
                    if (!searchResults) {
                        return [2 /*return*/, {
                                success: true,
                                messages: [],
                                total_count: 0
                            }];
                    }
                    formattedMessages = ((_a = searchResults.matches) === null || _a === void 0 ? void 0 : _a.map(function (match) {
                        var _a, _b, _c;
                        return ({
                            ts: match.ts,
                            user: match.user,
                            username: match.username,
                            text: match.text,
                            type: match.type,
                            channel: {
                                id: (_a = match.channel) === null || _a === void 0 ? void 0 : _a.id,
                                name: (_b = match.channel) === null || _b === void 0 ? void 0 : _b.name,
                                is_private: (_c = match.channel) === null || _c === void 0 ? void 0 : _c.is_private
                            },
                            team: match.team,
                            permalink: match.permalink,
                            timestamp: new Date(parseFloat(match.ts || '0') * 1000).toISOString()
                        });
                    })) || [];
                    return [2 /*return*/, {
                            success: true,
                            messages: formattedMessages,
                            total_count: searchResults.total || 0,
                            query: params.query
                        }];
                case 4:
                    error_14 = _b.sent();
                    if (error_14 instanceof Error) {
                        if (error_14.message.includes('invalid_auth')) {
                            throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
                        }
                        if (error_14.message.includes('paid_only')) {
                            throw new Error('Search functionality requires a paid Slack plan.');
                        }
                    }
                    throw error_14;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Set the status for the authenticated user
 */
function slackSetStatus(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var slack, profile, result, error_15;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Slack operations');
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, createSlackClient(context.integrationId, true)];
                case 2:
                    slack = _a.sent();
                    profile = {};
                    if (params.status_text !== undefined) {
                        profile.status_text = params.status_text;
                    }
                    if (params.status_emoji !== undefined) {
                        profile.status_emoji = params.status_emoji;
                    }
                    if (params.status_expiration !== undefined) {
                        profile.status_expiration = params.status_expiration;
                    }
                    return [4 /*yield*/, slack.users.profile.set({
                            profile: profile
                        })];
                case 3:
                    result = _a.sent();
                    if (!result.ok) {
                        throw new Error("Slack API error: ".concat(result.error || 'Unknown error'));
                    }
                    return [2 /*return*/, {
                            success: true,
                            status: {
                                text: params.status_text,
                                emoji: params.status_emoji,
                                expiration: params.status_expiration
                            }
                        }];
                case 4:
                    error_15 = _a.sent();
                    if (error_15 instanceof Error) {
                        if (error_15.message.includes('invalid_auth')) {
                            throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
                        }
                        if (error_15.message.includes('user_not_found')) {
                            throw new Error('User not found. Cannot set status.');
                        }
                    }
                    throw error_15;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Create a reminder for a user
 */
function slackCreateReminder(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var slack, result, reminder, error_16;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Slack operations');
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, createSlackClient(context.integrationId, true)];
                case 2:
                    slack = _a.sent();
                    return [4 /*yield*/, slack.reminders.add({
                            text: params.text,
                            time: params.time,
                            user: params.user // If not provided, defaults to authenticated user
                        })];
                case 3:
                    result = _a.sent();
                    if (!result.ok) {
                        throw new Error("Slack API error: ".concat(result.error || 'Unknown error'));
                    }
                    reminder = result.reminder;
                    if (!reminder) {
                        throw new Error('Failed to create reminder');
                    }
                    return [2 /*return*/, {
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
                        }];
                case 4:
                    error_16 = _a.sent();
                    if (error_16 instanceof Error) {
                        if (error_16.message.includes('invalid_auth')) {
                            throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
                        }
                        if (error_16.message.includes('cannot_parse')) {
                            throw new Error('Could not parse the time. Try formats like "tomorrow at 2pm" or "in 30 minutes".');
                        }
                        if (error_16.message.includes('time_in_past')) {
                            throw new Error('Cannot set reminder for a time in the past.');
                        }
                        if (error_16.message.includes('user_not_found')) {
                            throw new Error('User not found. Please check the user ID.');
                        }
                    }
                    throw error_16;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get pending reminders for the authenticated user
 */
function slackGetReminders(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var slack, result, reminders, formattedReminders, error_17;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId) {
                        throw new Error('Integration ID is required for Slack operations');
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, createSlackClient(context.integrationId, true)];
                case 2:
                    slack = _a.sent();
                    return [4 /*yield*/, slack.reminders.list({
                            team_id: params.team_id
                        })];
                case 3:
                    result = _a.sent();
                    if (!result.ok) {
                        throw new Error("Slack API error: ".concat(result.error || 'Unknown error'));
                    }
                    reminders = result.reminders || [];
                    formattedReminders = reminders.map(function (reminder) { return ({
                        id: reminder.id,
                        text: reminder.text,
                        time: reminder.time,
                        user: reminder.user,
                        creator: reminder.creator,
                        recurring: reminder.recurring,
                        complete_ts: reminder.complete_ts,
                        timestamp: reminder.time ? new Date(reminder.time * 1000).toISOString() : null
                    }); });
                    return [2 /*return*/, {
                            success: true,
                            reminders: formattedReminders,
                            total_count: formattedReminders.length
                        }];
                case 4:
                    error_17 = _a.sent();
                    if (error_17 instanceof Error) {
                        if (error_17.message.includes('invalid_auth')) {
                            throw new Error('Invalid Slack authentication. Please reconnect your Slack integration.');
                        }
                    }
                    throw error_17;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Registry of Slack skill implementations
 */
exports.SLACK_SKILL_IMPLEMENTATIONS = {
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
