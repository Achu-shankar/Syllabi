import type { SkillExecutionContext } from '../skill-executor-v2';
import { createGoogleGmailClient } from '../google_auth_service';

export const GMAIL_SKILL_DEFINITIONS = [
  {
    name: 'gmail_list_messages',
    display_name: 'List Gmail Messages',
    description: 'List messages in a label/folder (e.g., Inbox, Sent, custom labels).',
    category: 'gmail',
    type: 'builtin' as const,
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
    type: 'builtin' as const,
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
    type: 'builtin' as const,
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
    type: 'builtin' as const,
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
    type: 'builtin' as const,
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
    type: 'builtin' as const,
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
    type: 'builtin' as const,
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
    type: 'builtin' as const,
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
    type: 'builtin' as const,
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
    type: 'builtin' as const,
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
function extractTextFromPayload(payload: any): string {
  if (!payload) return '';
  // If the message has no parts, check body directly
  if (!payload.parts) {
    if (payload.mimeType === 'text/plain' || payload.mimeType === 'text/html') {
      return Buffer.from(payload.body.data || '', 'base64').toString('utf-8');
    }
    return '';
  }
  // Otherwise, recursively search parts
  for (const part of payload.parts) {
    if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
      return Buffer.from(part.body.data || '', 'base64').toString('utf-8');
    }
    // Recursively check sub-parts
    if (part.parts) {
      const sub = extractTextFromPayload(part);
      if (sub) return sub;
    }
  }
  return '';
}

async function gmailReadMessages(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Gmail operations');
  const gmail = await createGoogleGmailClient(context.integrationId);
  const { message_ids, text_only } = params;
  if (!Array.isArray(message_ids) || message_ids.length === 0) {
    throw new Error('message_ids must be a non-empty array');
  }
  const onlyText = text_only !== false; // default true
  const results = await Promise.all(
    message_ids.map(async (id: string) => {
      try {
        const res = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
        if (onlyText) {
          const text = extractTextFromPayload(res.data.payload);
          return { id, success: true, text, snippet: res.data.snippet };
        } else {
          return { id, success: true, message: res.data };
        }
      } catch (error) {
        return { id, success: false, error: error instanceof Error ? error.message : String(error) };
      }
    })
  );
  return { success: true, results };
}

// List messages in a label/folder
async function gmailListMessages(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Gmail operations');
  const gmail = await createGoogleGmailClient(context.integrationId);
  const { label_id, max_results, page_token } = params;
  const res = await gmail.users.messages.list({
    userId: 'me',
    labelIds: [label_id],
    maxResults: max_results || 20,
    pageToken: page_token,
  });
  return { success: true, messages: res.data.messages || [], nextPageToken: res.data.nextPageToken };
}

// Search for messages by query
async function gmailSearchMessages(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Gmail operations');
  const gmail = await createGoogleGmailClient(context.integrationId);
  const { query, max_results, page_token } = params;
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: max_results || 20,
    pageToken: page_token,
  });
  return { success: true, messages: res.data.messages || [], nextPageToken: res.data.nextPageToken };
}

// Send a new email
async function gmailSendMessage(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Gmail operations');
  const gmail = await createGoogleGmailClient(context.integrationId);
  const { to, subject, body, cc, bcc, attachments } = params;
  // Build raw email
  let email = '';
  email += `To: ${to}\r\n`;
  if (cc) email += `Cc: ${cc}\r\n`;
  if (bcc) email += `Bcc: ${bcc}\r\n`;
  email += `Subject: ${subject}\r\n`;
  email += 'Content-Type: text/html; charset=UTF-8\r\n';
  email += '\r\n';
  email += body;
  // TODO: Add attachments support
  const encodedMessage = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
  return { success: true, sent: true, message: res.data };
}

// Reply to an existing email thread
async function gmailReplyMessage(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Gmail operations');
  const gmail = await createGoogleGmailClient(context.integrationId);
  const { message_id, body, cc, bcc, attachments } = params;
  // Get original message to get threadId and headers
  const orig = await gmail.users.messages.get({ userId: 'me', id: message_id, format: 'metadata', metadataHeaders: ['Message-ID', 'In-Reply-To', 'References', 'Subject', 'From', 'To'] });
  const threadId = orig.data.threadId;
  const headers = orig.data.payload?.headers || [];
  const subject = headers.find(h => h.name === 'Subject')?.value || '';
  const to = headers.find(h => h.name === 'From')?.value || '';
  let email = '';
  email += `To: ${to}\r\n`;
  if (cc) email += `Cc: ${cc}\r\n`;
  if (bcc) email += `Bcc: ${bcc}\r\n`;
  email += `Subject: ${subject}\r\n`;
  if (headers.find(h => h.name === 'Message-ID')) email += `In-Reply-To: ${headers.find(h => h.name === 'Message-ID')?.value}\r\n`;
  if (headers.find(h => h.name === 'References')) email += `References: ${headers.find(h => h.name === 'References')?.value}\r\n`;
  email += 'Content-Type: text/html; charset=UTF-8\r\n';
  email += '\r\n';
  email += body;
  // TODO: Add attachments support
  const encodedMessage = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
      threadId,
    },
  });
  return { success: true, sent: true, message: res.data };
}

// List all labels/folders
async function gmailListLabels(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Gmail operations');
  const gmail = await createGoogleGmailClient(context.integrationId);
  const res = await gmail.users.labels.list({ userId: 'me' });
  return { success: true, labels: res.data.labels || [] };
}

// Mark a message as read
async function gmailMarkAsRead(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Gmail operations');
  const gmail = await createGoogleGmailClient(context.integrationId);
  const { message_id } = params;
  await gmail.users.messages.modify({
    userId: 'me',
    id: message_id,
    requestBody: { removeLabelIds: ['UNREAD'] },
  });
  return { success: true };
}

// Mark a message as unread
async function gmailMarkAsUnread(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Gmail operations');
  const gmail = await createGoogleGmailClient(context.integrationId);
  const { message_id } = params;
  await gmail.users.messages.modify({
    userId: 'me',
    id: message_id,
    requestBody: { addLabelIds: ['UNREAD'] },
  });
  return { success: true };
}

// Move a message to trash
async function gmailDeleteMessage(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Gmail operations');
  const gmail = await createGoogleGmailClient(context.integrationId);
  const { message_id } = params;
  await gmail.users.messages.trash({ userId: 'me', id: message_id });
  return { success: true };
}

// Star or unstar a message
async function gmailStarMessage(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Gmail operations');
  const gmail = await createGoogleGmailClient(context.integrationId);
  const { message_id, starred } = params;
  await gmail.users.messages.modify({
    userId: 'me',
    id: message_id,
    requestBody: starred ? { addLabelIds: ['STARRED'] } : { removeLabelIds: ['STARRED'] },
  });
  return { success: true };
}

export const GMAIL_SKILL_IMPLEMENTATIONS = {
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