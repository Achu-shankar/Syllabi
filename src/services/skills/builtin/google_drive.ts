import type { SkillExecutionContext } from '../skill-executor-v2';
import { createGoogleDriveClient } from '../google_auth_service';

export const GOOGLE_DRIVE_SKILL_DEFINITIONS = [
  {
    name: 'google_drive_list_files',
    display_name: 'List Google Drive Files',
    description: 'List files and folders in the user\'s Google Drive.',
    category: 'google_drive',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_drive_list_files',
      description: 'List files and folders in the user\'s Google Drive.',
      parameters: {
        type: 'object',
        properties: {
          page_size: {
            type: 'integer',
            description: 'Maximum number of files to return (max 1000)',
            example: 20,
            minimum: 1,
            maximum: 1000
          },
          folder_id: {
            type: 'string',
            description: 'Optional folder ID to list files from (defaults to root)',
            example: 'root'
          }
        },
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'google_drive_search_files',
    display_name: 'Search Google Drive Files',
    description: 'Search for files or folders in Google Drive by name or type.',
    category: 'google_drive',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_drive_search_files',
      description: 'Search for files or folders in Google Drive by name or type.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (e.g., name contains \'report\')',
            example: "name contains 'report'"
          },
          page_size: {
            type: 'integer',
            description: 'Maximum number of files to return (max 1000)',
            example: 20,
            minimum: 1,
            maximum: 1000
          },
          folder_id: {
            type: 'string',
            description: 'Optional folder ID to search within (defaults to root)',
            example: 'root'
          }
        },
        required: ['query']
      }
    },
    configuration: {}
  },
  {
    name: 'google_drive_get_file_metadata',
    display_name: 'Get Google Drive File Metadata',
    description: 'Get metadata for a specific file in Google Drive.',
    category: 'google_drive',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_drive_get_file_metadata',
      description: 'Get metadata for a specific file in Google Drive.',
      parameters: {
        type: 'object',
        properties: {
          file_id: {
            type: 'string',
            description: 'The ID of the file to get metadata for',
            example: '1A2B3C4D5E6F'
          }
        },
        required: ['file_id']
      }
    },
    configuration: {}
  },
  {
    name: 'google_drive_download_file',
    display_name: 'Download Google Drive File',
    description: 'Download the content of a file from Google Drive.',
    category: 'google_drive',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_drive_download_file',
      description: 'Download the content of a file from Google Drive.',
      parameters: {
        type: 'object',
        properties: {
          file_id: {
            type: 'string',
            description: 'The ID of the file to download',
            example: '1A2B3C4D5E6F'
          }
        },
        required: ['file_id']
      }
    },
    configuration: {}
  },
  {
    name: 'google_drive_list_folders',
    display_name: 'List Google Drive Folders',
    description: 'List all folders in the user\'s Google Drive.',
    category: 'google_drive',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_drive_list_folders',
      description: 'List all folders in the user\'s Google Drive.',
      parameters: {
        type: 'object',
        properties: {
          page_size: {
            type: 'integer',
            description: 'Maximum number of folders to return (max 1000)',
            example: 20,
            minimum: 1,
            maximum: 1000
          },
          parent_folder_id: {
            type: 'string',
            description: 'Optional parent folder ID to list folders from (defaults to root)',
            example: 'root'
          }
        },
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'google_drive_share_file',
    display_name: 'Share Google Drive File',
    description: 'Share a file or folder with a user (viewer, commenter, editor).',
    category: 'google_drive',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_drive_share_file',
      description: 'Share a file or folder with a user (viewer, commenter, editor).',
      parameters: {
        type: 'object',
        properties: {
          file_id: { type: 'string', description: 'ID of the file/folder to share', example: '1A2B3C4D5E6F' },
          email: { type: 'string', description: 'Email address to share with', example: 'user@example.com' },
          role: { type: 'string', description: 'Role to grant', enum: ['reader', 'commenter', 'writer'], example: 'reader' },
          send_notification_email: { type: 'boolean', description: 'Send notification email?', example: true }
        },
        required: ['file_id', 'email', 'role']
      }
    },
    configuration: {}
  },
  {
    name: 'google_drive_get_shareable_link',
    display_name: 'Get Google Drive Shareable Link',
    description: 'Get a shareable link for a file or folder.',
    category: 'google_drive',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_drive_get_shareable_link',
      description: 'Get a shareable link for a file or folder.',
      parameters: {
        type: 'object',
        properties: {
          file_id: { type: 'string', description: 'ID of the file/folder', example: '1A2B3C4D5E6F' },
          anyone_can_view: { type: 'boolean', description: 'Make link viewable by anyone?', example: false }
        },
        required: ['file_id']
      }
    },
    configuration: {}
  },
  {
    name: 'google_drive_list_permissions',
    display_name: 'List Google Drive Permissions',
    description: 'List who has access to a file or folder and their roles.',
    category: 'google_drive',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_drive_list_permissions',
      description: 'List who has access to a file or folder and their roles.',
      parameters: {
        type: 'object',
        properties: {
          file_id: { type: 'string', description: 'ID of the file/folder', example: '1A2B3C4D5E6F' }
        },
        required: ['file_id']
      }
    },
    configuration: {}
  },
  {
    name: 'google_drive_create_folder',
    display_name: 'Create Google Drive Folder',
    description: 'Create a new folder in Google Drive.',
    category: 'google_drive',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_drive_create_folder',
      description: 'Create a new folder in Google Drive.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the new folder', example: 'Project Files' },
          parent_id: { type: 'string', description: 'Parent folder ID (optional, defaults to root)', example: 'root' }
        },
        required: ['name']
      }
    },
    configuration: {}
  },
  {
    name: 'google_drive_move_file',
    display_name: 'Move Google Drive File',
    description: 'Move a file or folder to a different parent folder.',
    category: 'google_drive',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_drive_move_file',
      description: 'Move a file or folder to a different parent folder.',
      parameters: {
        type: 'object',
        properties: {
          file_id: { type: 'string', description: 'ID of the file/folder to move', example: '1A2B3C4D5E6F' },
          new_parent_id: { type: 'string', description: 'ID of the new parent folder', example: '0BwwA4oUTeiV1TGRPeTVjaWRDY1E' }
        },
        required: ['file_id', 'new_parent_id']
      }
    },
    configuration: {}
  },
  {
    name: 'google_drive_rename_file',
    display_name: 'Rename Google Drive File',
    description: 'Rename a file or folder in Google Drive.',
    category: 'google_drive',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_drive_rename_file',
      description: 'Rename a file or folder in Google Drive.',
      parameters: {
        type: 'object',
        properties: {
          file_id: { type: 'string', description: 'ID of the file/folder to rename', example: '1A2B3C4D5E6F' },
          new_name: { type: 'string', description: 'New name for the file/folder', example: 'Renamed File' }
        },
        required: ['file_id', 'new_name']
      }
    },
    configuration: {}
  },
  {
    name: 'google_drive_delete_file',
    display_name: 'Delete Google Drive File',
    description: 'Move a file or folder to trash.',
    category: 'google_drive',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_drive_delete_file',
      description: 'Move a file or folder to trash.',
      parameters: {
        type: 'object',
        properties: {
          file_id: { type: 'string', description: 'ID of the file/folder to delete', example: '1A2B3C4D5E6F' }
        },
        required: ['file_id']
      }
    },
    configuration: {}
  },
  {
    name: 'google_drive_list_recent_files',
    display_name: 'List Recent Google Drive Files',
    description: 'List files recently modified or accessed.',
    category: 'google_drive',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_drive_list_recent_files',
      description: 'List files recently modified or accessed.',
      parameters: {
        type: 'object',
        properties: {
          page_size: { type: 'integer', description: 'Maximum number of files to return (max 1000)', example: 20, minimum: 1, maximum: 1000 }
        },
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'google_drive_list_starred_files',
    display_name: 'List Starred Google Drive Files',
    description: 'List files/folders marked as starred.',
    category: 'google_drive',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_drive_list_starred_files',
      description: 'List files/folders marked as starred.',
      parameters: {
        type: 'object',
        properties: {
          page_size: { type: 'integer', description: 'Maximum number of files to return (max 1000)', example: 20, minimum: 1, maximum: 1000 }
        },
        required: []
      }
    },
    configuration: {}
  },
  {
    name: 'google_drive_list_files_by_type',
    display_name: 'List Google Drive Files by Type',
    description: 'List all files of a specific type (Docs, Sheets, PDFs, etc.).',
    category: 'google_drive',
    type: 'builtin' as const,
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_drive_list_files_by_type',
      description: 'List all files of a specific type (Docs, Sheets, PDFs, etc.).',
      parameters: {
        type: 'object',
        properties: {
          mime_type: { type: 'string', description: 'MIME type to filter by (e.g., application/pdf, application/vnd.google-apps.document)', example: 'application/pdf' },
          page_size: { type: 'integer', description: 'Maximum number of files to return (max 1000)', example: 20, minimum: 1, maximum: 1000 }
        },
        required: ['mime_type']
      }
    },
    configuration: {}
  }
];

// List files and folders in the user's Google Drive
async function googleDriveListFiles(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Google Drive operations');
  const drive = await createGoogleDriveClient(context.integrationId);
  const pageSize = Math.min(params.page_size || 20, 1000);
  const folderId = params.folder_id || 'root';
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    pageSize,
    fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, parents, webViewLink, iconLink)'
  });
  return { success: true, files: res.data.files || [] };
}

// Search for files or folders in Google Drive by name or type
async function googleDriveSearchFiles(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Google Drive operations');
  const drive = await createGoogleDriveClient(context.integrationId);
  const pageSize = Math.min(params.page_size || 20, 1000);
  const query = params.query;
  let q = `${query} and trashed = false`;
  if (params.folder_id) {
    q = `'${params.folder_id}' in parents and ${query} and trashed = false`;
  }
  const res = await drive.files.list({
    q,
    pageSize,
    fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, parents, webViewLink, iconLink)'
  });
  return { success: true, files: res.data.files || [] };
}

// Get metadata for a specific file in Google Drive
async function googleDriveGetFileMetadata(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Google Drive operations');
  const drive = await createGoogleDriveClient(context.integrationId);
  const fileId = params.file_id;
  const res = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, modifiedTime, size, parents, webViewLink, iconLink, owners, permissions, description'
  });
  return { success: true, metadata: res.data };
}

// Download the content of a file from Google Drive
async function googleDriveDownloadFile(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Google Drive operations');
  const drive = await createGoogleDriveClient(context.integrationId);
  const fileId = params.file_id;
  // For binary files, you may want to stream or buffer the response
  const res = await drive.files.get({
    fileId,
    alt: 'media',
    responseType: 'arraybuffer',
  } as any); // responseType is not in types, but supported
  return { success: true, content: res.data };
}

// List all folders in the user's Google Drive
async function googleDriveListFolders(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Google Drive operations');
  const drive = await createGoogleDriveClient(context.integrationId);
  const pageSize = Math.min(params.page_size || 20, 1000);
  const parentId = params.parent_folder_id || 'root';
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    pageSize,
    fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, parents, webViewLink, iconLink)'
  });
  return { success: true, folders: res.data.files || [] };
}

// --- Implementations for new skills ---

async function googleDriveShareFile(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Google Drive operations');
  const drive = await createGoogleDriveClient(context.integrationId);
  const { file_id, email, role, send_notification_email } = params;
  const res = await drive.permissions.create({
    fileId: file_id,
    requestBody: {
      type: 'user',
      role,
      emailAddress: email,
    },
    sendNotificationEmail: send_notification_email ?? true,
    fields: 'id, role, emailAddress',
  });
  return { success: true, permission: res.data };
}

async function googleDriveGetShareableLink(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Google Drive operations');
  const drive = await createGoogleDriveClient(context.integrationId);
  const { file_id, anyone_can_view } = params;
  // Set file permission if needed
  if (anyone_can_view) {
    await drive.permissions.create({
      fileId: file_id,
      requestBody: {
        type: 'anyone',
        role: 'reader',
      },
      fields: 'id',
    });
  }
  const res = await drive.files.get({
    fileId: file_id,
    fields: 'webViewLink, webContentLink',
  });
  return { success: true, webViewLink: res.data.webViewLink, webContentLink: res.data.webContentLink };
}

async function googleDriveListPermissions(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Google Drive operations');
  const drive = await createGoogleDriveClient(context.integrationId);
  const { file_id } = params;
  const res = await drive.permissions.list({
    fileId: file_id,
    fields: 'permissions(id, type, role, emailAddress, domain)',
  });
  return { success: true, permissions: res.data.permissions || [] };
}

async function googleDriveCreateFolder(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Google Drive operations');
  const drive = await createGoogleDriveClient(context.integrationId);
  const { name, parent_id } = params;
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parent_id ? [parent_id] : undefined,
    },
    fields: 'id, name, mimeType, parents',
  });
  return { success: true, folder: res.data };
}

async function googleDriveMoveFile(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Google Drive operations');
  const drive = await createGoogleDriveClient(context.integrationId);
  const { file_id, new_parent_id } = params;
  // Get current parents
  const file = await drive.files.get({ fileId: file_id, fields: 'parents' });
  const previousParents = file.data.parents ? file.data.parents.join(',') : '';
  const res = await drive.files.update({
    fileId: file_id,
    addParents: new_parent_id,
    removeParents: previousParents,
    fields: 'id, name, parents',
  });
  return { success: true, file: res.data };
}

async function googleDriveRenameFile(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Google Drive operations');
  const drive = await createGoogleDriveClient(context.integrationId);
  const { file_id, new_name } = params;
  const res = await drive.files.update({
    fileId: file_id,
    requestBody: { name: new_name },
    fields: 'id, name',
  });
  return { success: true, file: res.data };
}

async function googleDriveDeleteFile(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Google Drive operations');
  const drive = await createGoogleDriveClient(context.integrationId);
  const { file_id } = params;
  await drive.files.update({
    fileId: file_id,
    requestBody: { trashed: true },
    fields: 'id, trashed',
  });
  return { success: true };
}

async function googleDriveListRecentFiles(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Google Drive operations');
  const drive = await createGoogleDriveClient(context.integrationId);
  const pageSize = Math.min(params.page_size || 20, 1000);
  const res = await drive.files.list({
    orderBy: 'modifiedTime desc',
    pageSize,
    q: 'trashed = false',
    fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, iconLink)'
  });
  return { success: true, files: res.data.files || [] };
}

async function googleDriveListStarredFiles(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Google Drive operations');
  const drive = await createGoogleDriveClient(context.integrationId);
  const pageSize = Math.min(params.page_size || 20, 1000);
  const res = await drive.files.list({
    q: 'starred = true and trashed = false',
    pageSize,
    fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, iconLink)'
  });
  return { success: true, files: res.data.files || [] };
}

async function googleDriveListFilesByType(params: any, context: SkillExecutionContext) {
  if (!context.integrationId) throw new Error('Integration ID is required for Google Drive operations');
  const drive = await createGoogleDriveClient(context.integrationId);
  const { mime_type } = params;
  const pageSize = Math.min(params.page_size || 20, 1000);
  const res = await drive.files.list({
    q: `mimeType = '${mime_type}' and trashed = false`,
    pageSize,
    fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, iconLink)'
  });
  return { success: true, files: res.data.files || [] };
}

export const GOOGLE_DRIVE_SKILL_IMPLEMENTATIONS = {
  google_drive_list_files: googleDriveListFiles,
  google_drive_search_files: googleDriveSearchFiles,
  google_drive_get_file_metadata: googleDriveGetFileMetadata,
  google_drive_download_file: googleDriveDownloadFile,
  google_drive_list_folders: googleDriveListFolders,
  google_drive_share_file: googleDriveShareFile,
  google_drive_get_shareable_link: googleDriveGetShareableLink,
  google_drive_list_permissions: googleDriveListPermissions,
  google_drive_create_folder: googleDriveCreateFolder,
  google_drive_move_file: googleDriveMoveFile,
  google_drive_rename_file: googleDriveRenameFile,
  google_drive_delete_file: googleDriveDeleteFile,
  google_drive_list_recent_files: googleDriveListRecentFiles,
  google_drive_list_starred_files: googleDriveListStarredFiles,
  google_drive_list_files_by_type: googleDriveListFilesByType,
}; 