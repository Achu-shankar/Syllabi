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
exports.GOOGLE_DRIVE_SKILL_IMPLEMENTATIONS = exports.GOOGLE_DRIVE_SKILL_DEFINITIONS = void 0;
var google_auth_service_1 = require("../google_auth_service");
exports.GOOGLE_DRIVE_SKILL_DEFINITIONS = [
    {
        name: 'google_drive_list_files',
        display_name: 'List Google Drive Files',
        description: 'List files and folders in the user\'s Google Drive.',
        category: 'google_drive',
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
        type: 'builtin',
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
function googleDriveListFiles(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var drive, pageSize, folderId, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Google Drive operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleDriveClient)(context.integrationId)];
                case 1:
                    drive = _a.sent();
                    pageSize = Math.min(params.page_size || 20, 1000);
                    folderId = params.folder_id || 'root';
                    return [4 /*yield*/, drive.files.list({
                            q: "'".concat(folderId, "' in parents and trashed = false"),
                            pageSize: pageSize,
                            fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, parents, webViewLink, iconLink)'
                        })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, files: res.data.files || [] }];
            }
        });
    });
}
// Search for files or folders in Google Drive by name or type
function googleDriveSearchFiles(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var drive, pageSize, query, q, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Google Drive operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleDriveClient)(context.integrationId)];
                case 1:
                    drive = _a.sent();
                    pageSize = Math.min(params.page_size || 20, 1000);
                    query = params.query;
                    q = "".concat(query, " and trashed = false");
                    if (params.folder_id) {
                        q = "'".concat(params.folder_id, "' in parents and ").concat(query, " and trashed = false");
                    }
                    return [4 /*yield*/, drive.files.list({
                            q: q,
                            pageSize: pageSize,
                            fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, parents, webViewLink, iconLink)'
                        })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, files: res.data.files || [] }];
            }
        });
    });
}
// Get metadata for a specific file in Google Drive
function googleDriveGetFileMetadata(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var drive, fileId, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Google Drive operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleDriveClient)(context.integrationId)];
                case 1:
                    drive = _a.sent();
                    fileId = params.file_id;
                    return [4 /*yield*/, drive.files.get({
                            fileId: fileId,
                            fields: 'id, name, mimeType, modifiedTime, size, parents, webViewLink, iconLink, owners, permissions, description'
                        })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, metadata: res.data }];
            }
        });
    });
}
// Download the content of a file from Google Drive
function googleDriveDownloadFile(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var drive, fileId, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Google Drive operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleDriveClient)(context.integrationId)];
                case 1:
                    drive = _a.sent();
                    fileId = params.file_id;
                    return [4 /*yield*/, drive.files.get({
                            fileId: fileId,
                            alt: 'media',
                            responseType: 'arraybuffer',
                        })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, content: res.data }];
            }
        });
    });
}
// List all folders in the user's Google Drive
function googleDriveListFolders(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var drive, pageSize, parentId, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Google Drive operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleDriveClient)(context.integrationId)];
                case 1:
                    drive = _a.sent();
                    pageSize = Math.min(params.page_size || 20, 1000);
                    parentId = params.parent_folder_id || 'root';
                    return [4 /*yield*/, drive.files.list({
                            q: "'".concat(parentId, "' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"),
                            pageSize: pageSize,
                            fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, parents, webViewLink, iconLink)'
                        })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, folders: res.data.files || [] }];
            }
        });
    });
}
// --- Implementations for new skills ---
function googleDriveShareFile(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var drive, file_id, email, role, send_notification_email, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Google Drive operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleDriveClient)(context.integrationId)];
                case 1:
                    drive = _a.sent();
                    file_id = params.file_id, email = params.email, role = params.role, send_notification_email = params.send_notification_email;
                    return [4 /*yield*/, drive.permissions.create({
                            fileId: file_id,
                            requestBody: {
                                type: 'user',
                                role: role,
                                emailAddress: email,
                            },
                            sendNotificationEmail: send_notification_email !== null && send_notification_email !== void 0 ? send_notification_email : true,
                            fields: 'id, role, emailAddress',
                        })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, permission: res.data }];
            }
        });
    });
}
function googleDriveGetShareableLink(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var drive, file_id, anyone_can_view, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Google Drive operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleDriveClient)(context.integrationId)];
                case 1:
                    drive = _a.sent();
                    file_id = params.file_id, anyone_can_view = params.anyone_can_view;
                    if (!anyone_can_view) return [3 /*break*/, 3];
                    return [4 /*yield*/, drive.permissions.create({
                            fileId: file_id,
                            requestBody: {
                                type: 'anyone',
                                role: 'reader',
                            },
                            fields: 'id',
                        })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [4 /*yield*/, drive.files.get({
                        fileId: file_id,
                        fields: 'webViewLink, webContentLink',
                    })];
                case 4:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, webViewLink: res.data.webViewLink, webContentLink: res.data.webContentLink }];
            }
        });
    });
}
function googleDriveListPermissions(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var drive, file_id, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Google Drive operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleDriveClient)(context.integrationId)];
                case 1:
                    drive = _a.sent();
                    file_id = params.file_id;
                    return [4 /*yield*/, drive.permissions.list({
                            fileId: file_id,
                            fields: 'permissions(id, type, role, emailAddress, domain)',
                        })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, permissions: res.data.permissions || [] }];
            }
        });
    });
}
function googleDriveCreateFolder(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var drive, name, parent_id, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Google Drive operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleDriveClient)(context.integrationId)];
                case 1:
                    drive = _a.sent();
                    name = params.name, parent_id = params.parent_id;
                    return [4 /*yield*/, drive.files.create({
                            requestBody: {
                                name: name,
                                mimeType: 'application/vnd.google-apps.folder',
                                parents: parent_id ? [parent_id] : undefined,
                            },
                            fields: 'id, name, mimeType, parents',
                        })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, folder: res.data }];
            }
        });
    });
}
function googleDriveMoveFile(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var drive, file_id, new_parent_id, file, previousParents, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Google Drive operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleDriveClient)(context.integrationId)];
                case 1:
                    drive = _a.sent();
                    file_id = params.file_id, new_parent_id = params.new_parent_id;
                    return [4 /*yield*/, drive.files.get({ fileId: file_id, fields: 'parents' })];
                case 2:
                    file = _a.sent();
                    previousParents = file.data.parents ? file.data.parents.join(',') : '';
                    return [4 /*yield*/, drive.files.update({
                            fileId: file_id,
                            addParents: new_parent_id,
                            removeParents: previousParents,
                            fields: 'id, name, parents',
                        })];
                case 3:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, file: res.data }];
            }
        });
    });
}
function googleDriveRenameFile(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var drive, file_id, new_name, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Google Drive operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleDriveClient)(context.integrationId)];
                case 1:
                    drive = _a.sent();
                    file_id = params.file_id, new_name = params.new_name;
                    return [4 /*yield*/, drive.files.update({
                            fileId: file_id,
                            requestBody: { name: new_name },
                            fields: 'id, name',
                        })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, file: res.data }];
            }
        });
    });
}
function googleDriveDeleteFile(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var drive, file_id;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Google Drive operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleDriveClient)(context.integrationId)];
                case 1:
                    drive = _a.sent();
                    file_id = params.file_id;
                    return [4 /*yield*/, drive.files.update({
                            fileId: file_id,
                            requestBody: { trashed: true },
                            fields: 'id, trashed',
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
            }
        });
    });
}
function googleDriveListRecentFiles(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var drive, pageSize, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Google Drive operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleDriveClient)(context.integrationId)];
                case 1:
                    drive = _a.sent();
                    pageSize = Math.min(params.page_size || 20, 1000);
                    return [4 /*yield*/, drive.files.list({
                            orderBy: 'modifiedTime desc',
                            pageSize: pageSize,
                            q: 'trashed = false',
                            fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, iconLink)'
                        })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, files: res.data.files || [] }];
            }
        });
    });
}
function googleDriveListStarredFiles(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var drive, pageSize, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Google Drive operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleDriveClient)(context.integrationId)];
                case 1:
                    drive = _a.sent();
                    pageSize = Math.min(params.page_size || 20, 1000);
                    return [4 /*yield*/, drive.files.list({
                            q: 'starred = true and trashed = false',
                            pageSize: pageSize,
                            fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, iconLink)'
                        })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, files: res.data.files || [] }];
            }
        });
    });
}
function googleDriveListFilesByType(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var drive, mime_type, pageSize, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!context.integrationId)
                        throw new Error('Integration ID is required for Google Drive operations');
                    return [4 /*yield*/, (0, google_auth_service_1.createGoogleDriveClient)(context.integrationId)];
                case 1:
                    drive = _a.sent();
                    mime_type = params.mime_type;
                    pageSize = Math.min(params.page_size || 20, 1000);
                    return [4 /*yield*/, drive.files.list({
                            q: "mimeType = '".concat(mime_type, "' and trashed = false"),
                            pageSize: pageSize,
                            fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, iconLink)'
                        })];
                case 2:
                    res = _a.sent();
                    return [2 /*return*/, { success: true, files: res.data.files || [] }];
            }
        });
    });
}
exports.GOOGLE_DRIVE_SKILL_IMPLEMENTATIONS = {
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
