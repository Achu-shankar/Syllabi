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
exports.GMAIL_SKILL_IMPLEMENTATIONS = exports.GMAIL_SKILL_DEFINITIONS = void 0;
var google_auth_service_1 = require("../google_auth_service");
exports.GMAIL_SKILL_DEFINITIONS = [
    {
        name: 'gmail_list_messages',
        display_name: 'List Gmail Messages',
        description: 'List messages in a label/folder (e.g., Inbox, Sent, custom labels).',
        category: 'gmail',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'gmail_list_messages',
            description: 'List messages in a label/folder.',
            parameters: {
                type: 'object',
                properties: {
                    label_id: { type: 'string', description: 'Label/folder ID (e.g., INBOX, SENT, custom)', example: 'INBOX' },
                    max_results: { type: 'integer', description: 'Maximum number of messages to return (max 100)', example: 20, minimum: 1, maximum: 100 },
                    page_token: { type: 'string', description: 'Page token for pagination', example: 'nextPageToken' }
                },
                required: ['label_id']
            }
        },
        configuration: {}
    },
    {
        name: 'gmail_search_messages',
        display_name: 'Search Gmail Messages',
        description: 'Search for messages by query (subject, sender, content, etc.).',
        category: 'gmail',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'gmail_search_messages',
            description: 'Search for messages by query.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Gmail search query (e.g., from:alice subject:report)', example: 'from:alice subject:report' },
                    max_results: { type: 'integer', description: 'Maximum number of messages to return (max 100)', example: 20, minimum: 1, maximum: 100 },
                    page_token: { type: 'string', description: 'Page token for pagination', example: 'nextPageToken' }
                },
                required: ['query']
            }
        },
        configuration: {}
    },
    {
        name: 'gmail_read_messages',
        display_name: 'Read Gmail Messages',
        description: 'Read one or more Gmail messages by ID, with options to return only text or include images/attachments.',
        category: 'gmail',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'gmail_read_messages',
            description: 'Read one or more Gmail messages by ID, with options to return only text or include images/attachments.',
            parameters: {
                type: 'object',
                properties: {
                    message_ids: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Array of Gmail message IDs to fetch',
                        example: ['17c7b8e5e6e8a1a2']
                    },
                    text_only: {
                        type: 'boolean',
                        description: 'If true, only return the plain text or HTML content (no images/attachments). Default: true',
                        example: true
                    }
                },
                required: ['message_ids']
            }
        },
        configuration: {}
    },
    {
        name: 'gmail_send_message',
        display_name: 'Send Gmail Message',
        description: 'Send a new email (to, subject, body, attachments).',
        category: 'gmail',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'gmail_send_message',
            description: 'Send a new email.',
            parameters: {
                type: 'object',
                properties: {
                    to: { type: 'string', description: 'Recipient email address', example: 'user@example.com' },
                    subject: { type: 'string', description: 'Email subject', example: 'Hello' },
                    body: { type: 'string', description: 'Email body (plain text or HTML)', example: 'This is a test email.' },
                    cc: { type: 'string', description: 'CC email addresses (comma-separated)', example: 'cc@example.com' },
                    bcc: { type: 'string', description: 'BCC email addresses (comma-separated)', example: 'bcc@example.com' },
                    attachments: { type: 'array', items: { type: 'object' }, description: 'Attachments (base64-encoded)', example: [] }
                },
                required: ['to', 'subject', 'body']
            }
        },
        configuration: {}
    },
    {
        name: 'gmail_reply_message',
        display_name: 'Reply to Gmail Message',
        description: 'Reply to an existing email thread.',
        category: 'gmail',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'gmail_reply_message',
            description: 'Reply to an existing email thread.',
            parameters: {
                type: 'object',
                properties: {
                    message_id: { type: 'string', description: 'ID of the message to reply to', example: '17c7b8e5e6e8a1a2' },
                    body: { type: 'string', description: 'Reply body (plain text or HTML)', example: 'Thanks for your email.' },
                    cc: { type: 'string', description: 'CC email addresses (comma-separated)', example: 'cc@example.com' },
                    bcc: { type: 'string', description: 'BCC email addresses (comma-separated)', example: 'bcc@example.com' },
                    attachments: { type: 'array', items: { type: 'object' }, description: 'Attachments (base64-encoded)', example: [] }
                },
                required: ['message_id', 'body']
            }
        },
        configuration: {}
    },
    {
        name: 'gmail_list_labels',
        display_name: 'List Gmail Labels',
        description: 'List all labels/folders in the user’s Gmail.',
        category: 'gmail',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'gmail_list_labels',
            description: 'List all labels/folders in the user’s Gmail.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        },
        configuration: {}
    },
    {
        name: 'gmail_mark_as_read',
        display_name: 'Mark Gmail Message as Read',
        description: 'Mark a message as read.',
        category: 'gmail',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'gmail_mark_as_read',
            description: 'Mark a message as read.',
            parameters: {
                type: 'object',
                properties: {
                    message_id: { type: 'string', description: 'ID of the message to mark as read', example: '17c7b8e5e6e8a1a2' }
                },
                required: ['message_id']
            }
        },
        configuration: {}
    },
    {
        name: 'gmail_mark_as_unread',
        display_name: 'Mark Gmail Message as Unread',
        description: 'Mark a message as unread.',
        category: 'gmail',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'gmail_mark_as_unread',
            description: 'Mark a message as unread.',
            parameters: {
                type: 'object',
                properties: {
                    message_id: { type: 'string', description: 'ID of the message to mark as unread', example: '17c7b8e5e6e8a1a2' }
                },
                required: ['message_id']
            }
        },
        configuration: {}
    },
    {
        name: 'gmail_delete_message',
        display_name: 'Delete Gmail Message',
        description: 'Move a message to trash.',
        category: 'gmail',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'gmail_delete_message',
            description: 'Move a message to trash.',
            parameters: {
                type: 'object',
                properties: {
                    message_id: { type: 'string', description: 'ID of the message to delete', example: '17c7b8e5e6e8a1a2' }
                },
                required: ['message_id']
            }
        },
        configuration: {}
    },
    {
        name: 'gmail_star_message',
        display_name: 'Star Gmail Message',
        description: 'Star or unstar a message.',
        category: 'gmail',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'gmail_star_message',
            description: 'Star or unstar a message.',
            parameters: {
                type: 'object',
                properties: {
                    message_id: { type: 'string', description: 'ID of the message to star/unstar', example: '17c7b8e5e6e8a1a2' },
                    starred: { type: 'boolean', description: 'Whether to star (true) or unstar (false)', example: true }
                },
                required: ['message_id', 'starred']
            }
        },
        configuration: {}
    }
];
// Unified read messages (single or bulk, with text_only option)
function extractTextFromPayload(payload) {
    if (!payload)
        return '';
    // If the message has no parts, check body directly
    if (!payload.parts) {
        if (payload.mimeType === 'text/plain' || payload.mimeType === 'text/html') {
            return Buffer.from(payload.body.data || '', 'base64').toString('utf-8');
        }
        return '';
    }
    // Otherwise, recursively search parts
    for (var _i = 0, _a = payload.parts; _i < _a.length; _i++) {
        var part = _a[_i];
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
            return Buffer.from(part.body.data || '', 'base64').toString('utf-8');
        }
        // Recursively check sub-parts
        if (part.parts) {
            var sub = extractTextFromPayload(part);
            if (sub)
                return sub;
        }
    }
    return '';
}
function gmailReadMessages(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var gmail, message_ids, text_only, onlyText, results;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Gmail operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleGmailClient)(context.integrationId)];
                case 1:
                    gmail = _a.sent();
                    message_ids = params.message_ids, text_only = params.text_only;
                    if (!Array.isArray(message_ids) || message_ids.length === 0) {
                        throw new Error('message_ids must be a non-empty array');
                    }
                    onlyText = text_only !== false;
                    return [4 /*yield*/, Promise.all(message_ids.map(function (id) { return __awaiter(_this, void 0, void 0, function () {
                            var res, text, error_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, gmail.users.messages.get({ userId: 'me', id: id, format: 'full' })];
                                    case 1:
                                        res = _a.sent();
                                        if (onlyText) {
                                            text = extractTextFromPayload(res.data.payload);
                                            return [2 /*return*/, { id: id, success: true, text: text, snippet: res.data.snippet }];
                                        }
                                        else {
                                            return [2 /*return*/, { id: id, success: true, message: res.data }];
                                        }
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_1 = _a.sent();
                                        return [2 /*return*/, { id: id, success: false, error: error_1 instanceof Error ? error_1.message : String(error_1) }];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 2:
                    results = _a.sent();
                    return [2 /*return*/, { success: true, results: results }];
            }
        });
    });
}
// List messages in a label/folder
function gmailListMessages(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var gmail, label_id, max_results, page_token, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Gmail operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleGmailClient)(context.integrationId)];
                case 1:
                    gmail = _a.sent();
                    label_id = params.label_id, max_results = params.max_results, page_token = params.page_token;
                    return [4 /*yield*/, gmail.users.messages.list({
                            userId: 'me',
                            labelIds: [label_id],
                            maxResults: max_results || 20,
                            pageToken: page_token,
                        })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, messages: res.data.messages || [], nextPageToken: res.data.nextPageToken }];
            }
        });
    });
}
// Search for messages by query
function gmailSearchMessages(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var gmail, query, max_results, page_token, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Gmail operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleGmailClient)(context.integrationId)];
                case 1:
                    gmail = _a.sent();
                    query = params.query, max_results = params.max_results, page_token = params.page_token;
                    return [4 /*yield*/, gmail.users.messages.list({
                            userId: 'me',
                            q: query,
                            maxResults: max_results || 20,
                            pageToken: page_token,
                        })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, messages: res.data.messages || [], nextPageToken: res.data.nextPageToken }];
            }
        });
    });
}
// Send a new email
function gmailSendMessage(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var gmail, to, subject, body, cc, bcc, attachments, email, encodedMessage, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Gmail operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleGmailClient)(context.integrationId)];
                case 1:
                    gmail = _a.sent();
                    to = params.to, subject = params.subject, body = params.body, cc = params.cc, bcc = params.bcc, attachments = params.attachments;
                    email = '';
                    email += "To: ".concat(to, "\r\n");
                    if (cc)
                        email += "Cc: ".concat(cc, "\r\n");
                    if (bcc)
                        email += "Bcc: ".concat(bcc, "\r\n");
                    email += "Subject: ".concat(subject, "\r\n");
                    email += 'Content-Type: text/html; charset=UTF-8\r\n';
                    email += '\r\n';
                    email += body;
                    encodedMessage = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    return [4 /*yield*/, gmail.users.messages.send({
                            userId: 'me',
                            requestBody: {
                                raw: encodedMessage,
                            },
                        })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, sent: true, message: res.data }];
            }
        });
    });
}
// Reply to an existing email thread
function gmailReplyMessage(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var gmail, message_id, body, cc, bcc, attachments, orig, threadId, headers, subject, to, email, encodedMessage, res;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Gmail operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleGmailClient)(context.integrationId)];
                case 1:
                    gmail = _f.sent();
                    message_id = params.message_id, body = params.body, cc = params.cc, bcc = params.bcc, attachments = params.attachments;
                    return [4 /*yield*/, gmail.users.messages.get({ userId: 'me', id: message_id, format: 'metadata', metadataHeaders: ['Message-ID', 'In-Reply-To', 'References', 'Subject', 'From', 'To'] })];
                case 2:
                    orig = _f.sent();
                    threadId = orig.data.threadId;
                    headers = ((_a = orig.data.payload) === null || _a === void 0 ? void 0 : _a.headers) || [];
                    subject = ((_b = headers.find(function (h) { return h.name === 'Subject'; })) === null || _b === void 0 ? void 0 : _b.value) || '';
                    to = ((_c = headers.find(function (h) { return h.name === 'From'; })) === null || _c === void 0 ? void 0 : _c.value) || '';
                    email = '';
                    email += "To: ".concat(to, "\r\n");
                    if (cc)
                        email += "Cc: ".concat(cc, "\r\n");
                    if (bcc)
                        email += "Bcc: ".concat(bcc, "\r\n");
                    email += "Subject: ".concat(subject, "\r\n");
                    if (headers.find(function (h) { return h.name === 'Message-ID'; }))
                        email += "In-Reply-To: ".concat((_d = headers.find(function (h) { return h.name === 'Message-ID'; })) === null || _d === void 0 ? void 0 : _d.value, "\r\n");
                    if (headers.find(function (h) { return h.name === 'References'; }))
                        email += "References: ".concat((_e = headers.find(function (h) { return h.name === 'References'; })) === null || _e === void 0 ? void 0 : _e.value, "\r\n");
                    email += 'Content-Type: text/html; charset=UTF-8\r\n';
                    email += '\r\n';
                    email += body;
                    encodedMessage = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    return [4 /*yield*/, gmail.users.messages.send({
                            userId: 'me',
                            requestBody: {
                                raw: encodedMessage,
                                threadId: threadId,
                            },
                        })];
                case 3:
                    res = _f.sent();
                    return [2 /*return*/, { success: true, sent: true, message: res.data }];
            }
        });
    });
}
// List all labels/folders
function gmailListLabels(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var gmail, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Gmail operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleGmailClient)(context.integrationId)];
                case 1:
                    gmail = _a.sent();
                    return [4 /*yield*/, gmail.users.labels.list({ userId: 'me' })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, labels: res.data.labels || [] }];
            }
        });
    });
}
// Mark a message as read
function gmailMarkAsRead(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var gmail, message_id;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Gmail operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleGmailClient)(context.integrationId)];
                case 1:
                    gmail = _a.sent();
                    message_id = params.message_id;
                    return [4 /*yield*/, gmail.users.messages.modify({
                            userId: 'me',
                            id: message_id,
                            requestBody: { removeLabelIds: ['UNREAD'] },
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
            }
        });
    });
}
// Mark a message as unread
function gmailMarkAsUnread(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var gmail, message_id;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Gmail operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleGmailClient)(context.integrationId)];
                case 1:
                    gmail = _a.sent();
                    message_id = params.message_id;
                    return [4 /*yield*/, gmail.users.messages.modify({
                            userId: 'me',
                            id: message_id,
                            requestBody: { addLabelIds: ['UNREAD'] },
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
            }
        });
    });
}
// Move a message to trash
function gmailDeleteMessage(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var gmail, message_id;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Gmail operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleGmailClient)(context.integrationId)];
                case 1:
                    gmail = _a.sent();
                    message_id = params.message_id;
                    return [4 /*yield*/, gmail.users.messages.trash({ userId: 'me', id: message_id })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
            }
        });
    });
}
// Star or unstar a message
function gmailStarMessage(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var gmail, message_id, starred;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Gmail operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleGmailClient)(context.integrationId)];
                case 1:
                    gmail = _a.sent();
                    message_id = params.message_id, starred = params.starred;
                    return [4 /*yield*/, gmail.users.messages.modify({
                            userId: 'me',
                            id: message_id,
                            requestBody: starred ? { addLabelIds: ['STARRED'] } : { removeLabelIds: ['STARRED'] },
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
            }
        });
    });
}
exports.GMAIL_SKILL_IMPLEMENTATIONS = {
    gmail_list_messages: gmailListMessages,
    gmail_search_messages: gmailSearchMessages,
    gmail_read_messages: gmailReadMessages,
    gmail_send_message: gmailSendMessage,
    gmail_reply_message: gmailReplyMessage,
    gmail_list_labels: gmailListLabels,
    gmail_mark_as_read: gmailMarkAsRead,
    gmail_mark_as_unread: gmailMarkAsUnread,
    gmail_delete_message: gmailDeleteMessage,
    gmail_star_message: gmailStarMessage,
};
