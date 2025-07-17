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
exports.NOTION_SKILL_IMPLEMENTATIONS = exports.NOTION_SKILL_DEFINITIONS = void 0;
var notion_auth_service_1 = require("../notion_auth_service");
exports.NOTION_SKILL_DEFINITIONS = [
    {
        name: 'notion_search_pages',
        display_name: 'Search Notion Pages',
        description: 'Search for pages in your Notion workspace by keyword.',
        category: 'notion',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'notion_search_pages',
            description: 'Search for pages in your Notion workspace by keyword.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search query', example: 'project plan' },
                    page_size: { type: 'integer', description: 'Max results to return', example: 10 },
                },
                required: ['query']
            }
        },
        configuration: {},
    },
    {
        name: 'notion_get_page',
        display_name: 'Get Notion Page',
        description: 'Get the content of a Notion page by ID.',
        category: 'notion',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'notion_get_page',
            description: 'Get the content of a Notion page by ID.',
            parameters: {
                type: 'object',
                properties: {
                    page_id: { type: 'string', description: 'The Notion page ID', example: 'abc123' },
                },
                required: ['page_id']
            }
        },
        configuration: {},
    },
    {
        name: 'notion_create_page',
        display_name: 'Create Notion Page',
        description: 'Create a new page in Notion.',
        category: 'notion',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'notion_create_page',
            description: 'Create a new page in Notion.',
            parameters: {
                type: 'object',
                properties: {
                    parent_id: { type: 'string', description: 'Parent page or database ID', example: 'abc123' },
                    title: { type: 'string', description: 'Title of the new page', example: 'New Project' },
                    properties: { type: 'object', description: 'Properties for the new page', example: { Status: { select: { name: 'In Progress' } } } },
                    children: {
                        type: 'array',
                        description: "Content blocks for the new page, following Notion's block object structure. See Notion API documentation for details.",
                        items: { type: 'object' },
                        example: [{ "object": "block", "type": "paragraph", "paragraph": { "rich_text": [{ "type": "text", "text": { "content": "This is the first paragraph." } }] } }]
                    },
                },
                required: ['parent_id', 'title']
            }
        },
        configuration: {},
    },
    {
        name: 'notion_update_page',
        display_name: 'Update Notion Page',
        description: 'Update properties of an existing Notion page.',
        category: 'notion',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'notion_update_page',
            description: 'Update properties of an existing Notion page.',
            parameters: {
                type: 'object',
                properties: {
                    page_id: { type: 'string', description: 'The Notion page ID', example: 'abc123' },
                    properties: { type: 'object', description: 'Properties to update', example: { Status: { select: { name: 'Done' } } } },
                },
                required: ['page_id', 'properties']
            }
        },
        configuration: {},
    },
    {
        name: 'notion_append_to_page',
        display_name: 'Append to Notion Page',
        description: 'Append content blocks to an existing Notion page.',
        category: 'notion',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'notion_append_to_page',
            description: 'Append content blocks to an existing Notion page.',
            parameters: {
                type: 'object',
                properties: {
                    page_id: { type: 'string', description: 'The Notion page ID', example: 'abc123' },
                    children: {
                        type: 'array',
                        description: "Content blocks to append, following Notion's block object structure. See Notion API documentation for details.",
                        items: { type: 'object' },
                        example: [{ "object": "block", "type": "paragraph", "paragraph": { "rich_text": [{ "type": "text", "text": { "content": "This is a new paragraph." } }] } }]
                    },
                },
                required: ['page_id', 'children']
            }
        },
        configuration: {},
    },
    {
        name: 'notion_list_databases',
        display_name: 'List Notion Databases',
        description: 'List all accessible Notion databases.',
        category: 'notion',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'notion_list_databases',
            description: 'List all accessible Notion databases.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Optional search query', example: 'Tasks' },
                },
                required: []
            }
        },
        configuration: {},
    },
    {
        name: 'notion_query_database',
        display_name: 'Query Notion Database',
        description: 'Query a Notion database with filters and sorts.',
        category: 'notion',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'notion_query_database',
            description: 'Query a Notion database with filters and sorts.',
            parameters: {
                type: 'object',
                properties: {
                    database_id: { type: 'string', description: 'The Notion database ID', example: 'abc123' },
                    filter: { type: 'object', description: 'Filter object', example: {} },
                    sorts: { type: 'array', description: 'Sorts array', items: { type: 'object' }, example: [] },
                    page_size: { type: 'integer', description: 'Max results to return', example: 10 },
                },
                required: ['database_id']
            }
        },
        configuration: {},
    },
    {
        name: 'notion_create_database_entry',
        display_name: 'Create Notion Database Entry',
        description: 'Create a new entry (row) in a Notion database.',
        category: 'notion',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'notion_create_database_entry',
            description: 'Create a new entry (row) in a Notion database.',
            parameters: {
                type: 'object',
                properties: {
                    database_id: { type: 'string', description: 'The Notion database ID', example: 'abc123' },
                    properties: { type: 'object', description: 'Properties for the new entry', example: { Name: { title: [{ text: { content: 'Task 1' } }] } } },
                },
                required: ['database_id', 'properties']
            }
        },
        configuration: {},
    },
    {
        name: 'notion_update_database_entry',
        display_name: 'Update Notion Database Entry',
        description: 'Update an entry (row) in a Notion database.',
        category: 'notion',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'notion_update_database_entry',
            description: 'Update an entry (row) in a Notion database.',
            parameters: {
                type: 'object',
                properties: {
                    page_id: { type: 'string', description: 'The Notion page ID (row)', example: 'abc123' },
                    properties: { type: 'object', description: 'Properties to update', example: { Status: { select: { name: 'Done' } } } },
                },
                required: ['page_id', 'properties']
            }
        },
        configuration: {},
    },
    {
        name: 'notion_get_database_entry',
        display_name: 'Get Notion Database Entry',
        description: 'Get a specific entry (row) from a Notion database.',
        category: 'notion',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'notion_get_database_entry',
            description: 'Get a specific entry (row) from a Notion database.',
            parameters: {
                type: 'object',
                properties: {
                    page_id: { type: 'string', description: 'The Notion page ID (row)', example: 'abc123' },
                },
                required: ['page_id']
            }
        },
        configuration: {},
    },
    {
        name: 'notion_list_users',
        display_name: 'List Notion Users',
        description: 'List all users in the Notion workspace.',
        category: 'notion',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'notion_list_users',
            description: 'List all users in the Notion workspace.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        },
        configuration: {},
    },
    {
        name: 'notion_get_page_comments',
        display_name: 'Get Notion Page Comments',
        description: 'Get comments for a Notion page.',
        category: 'notion',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'notion_get_page_comments',
            description: 'Get comments for a Notion page.',
            parameters: {
                type: 'object',
                properties: {
                    page_id: { type: 'string', description: 'The Notion page ID', example: 'abc123' },
                },
                required: ['page_id']
            }
        },
        configuration: {},
    },
    {
        name: 'notion_list_pages',
        display_name: 'List Notion Pages',
        description: 'List all accessible Notion pages.',
        category: 'notion',
        type: 'builtin',
        is_active: true,
        user_id: null,
        function_schema: {
            name: 'notion_list_pages',
            description: 'List all accessible Notion pages.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Optional search query', example: 'Meeting Notes' },
                    page_size: { type: 'integer', description: 'Max results to return', example: 10 },
                },
                required: []
            }
        },
        configuration: {},
    },
];
function getPageProperties(page) {
    if ('properties' in page)
        return page.properties;
    return undefined;
}
function getPageUrl(page) {
    if ('url' in page)
        return page.url;
    return undefined;
}
// --- Helper: extract plain text from Notion blocks (non-recursive) ---
function extractTextFromBlocks(blocks) {
    var lines = [];
    for (var _i = 0, blocks_1 = blocks; _i < blocks_1.length; _i++) {
        var block = blocks_1[_i];
        if (!block || !block.type)
            continue;
        var data = block[block.type];
        if ((data === null || data === void 0 ? void 0 : data.rich_text) && Array.isArray(data.rich_text)) {
            var text = data.rich_text
                .map(function (t) { var _a, _b, _c; return (_c = (_a = t.plain_text) !== null && _a !== void 0 ? _a : (_b = t.text) === null || _b === void 0 ? void 0 : _b.content) !== null && _c !== void 0 ? _c : ''; })
                .join('');
            if (text)
                lines.push(text);
        }
    }
    return lines.join('\n');
}
// --- Helper: fetch **all** children for a block (handles pagination) ---
function fetchAllChildren(notion, blockId) {
    return __awaiter(this, void 0, void 0, function () {
        var cursor, results, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cursor = undefined;
                    results = [];
                    _a.label = 1;
                case 1: return [4 /*yield*/, notion.blocks.children.list({ block_id: blockId, start_cursor: cursor })];
                case 2:
                    res = _a.sent();
                    results.push.apply(results, res.results);
                    cursor = res.has_more ? res.next_cursor : undefined;
                    _a.label = 3;
                case 3:
                    if (cursor) return [3 /*break*/, 1];
                    _a.label = 4;
                case 4: return [2 /*return*/, results];
            }
        });
    });
}
// --- Helper: convert rich_text array to plain string ---
function richTextToPlain(rich) {
    return (rich === null || rich === void 0 ? void 0 : rich.map(function (r) { var _a, _b, _c; return (_c = (_a = r.plain_text) !== null && _a !== void 0 ? _a : (_b = r.text) === null || _b === void 0 ? void 0 : _b.content) !== null && _c !== void 0 ? _c : ''; }).join('')) || '';
}
// --- Recursive helper: flatten blocks into plain-text lines ---
function blocksToText(notion_1, blocks_2) {
    return __awaiter(this, arguments, void 0, function (notion, blocks, depth) {
        var lines, listIndex, _i, blocks_3, block, type, has_children, data, prefix, line, check, children, childLines;
        if (depth === void 0) { depth = 0; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    lines = [];
                    listIndex = 1;
                    _i = 0, blocks_3 = blocks;
                    _a.label = 1;
                case 1:
                    if (!(_i < blocks_3.length)) return [3 /*break*/, 5];
                    block = blocks_3[_i];
                    if (!block || !block.type)
                        return [3 /*break*/, 4];
                    type = block.type, has_children = block.has_children;
                    data = block[type];
                    prefix = '';
                    line = '';
                    switch (type) {
                        case 'paragraph':
                            line = richTextToPlain(data.rich_text);
                            break;
                        case 'heading_1':
                            line = "# ".concat(richTextToPlain(data.rich_text));
                            break;
                        case 'heading_2':
                            line = "## ".concat(richTextToPlain(data.rich_text));
                            break;
                        case 'heading_3':
                            line = "### ".concat(richTextToPlain(data.rich_text));
                            break;
                        case 'bulleted_list_item':
                            prefix = '- ';
                            line = prefix + richTextToPlain(data.rich_text);
                            break;
                        case 'numbered_list_item':
                            prefix = "".concat(listIndex++, ". ");
                            line = prefix + richTextToPlain(data.rich_text);
                            break;
                        case 'to_do':
                            check = data.checked ? '☑' : '☐';
                            line = "".concat(check, " ").concat(richTextToPlain(data.rich_text));
                            break;
                        case 'quote':
                            line = "> ".concat(richTextToPlain(data.rich_text));
                            break;
                        case 'callout':
                            line = richTextToPlain(data.rich_text);
                            break;
                        case 'table_row':
                            // Flatten table row cells
                            line = data.cells.map(function (cell) { return richTextToPlain(cell); }).join(' | ');
                            break;
                        case 'child_page':
                            line = "[[Sub-page]]: ".concat((data === null || data === void 0 ? void 0 : data.title) || 'Untitled');
                            break;
                        default:
                            // For other types just try to extract rich_text if present
                            if (data === null || data === void 0 ? void 0 : data.rich_text)
                                line = richTextToPlain(data.rich_text);
                            break;
                    }
                    if (line)
                        lines.push(line);
                    if (!has_children) return [3 /*break*/, 4];
                    return [4 /*yield*/, fetchAllChildren(notion, block.id)];
                case 2:
                    children = _a.sent();
                    return [4 /*yield*/, blocksToText(notion, children, depth + 1)];
                case 3:
                    childLines = _a.sent();
                    lines.push.apply(lines, childLines);
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/, lines];
            }
        });
    });
}
exports.NOTION_SKILL_IMPLEMENTATIONS = {
    // Search for pages in your Notion workspace by keyword
    notion_search_pages: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var query, _a, page_size, notion, res;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Notion operations');
                        query = params.query, _a = params.page_size, page_size = _a === void 0 ? 10 : _a;
                        return [4 /*yield*/, (0, notion_auth_service_1.createNotionClient)(context.integrationId)];
                    case 1:
                        notion = _b.sent();
                        return [4 /*yield*/, notion.search({ query: query, page_size: page_size })];
                    case 2:
                        res = _b.sent();
                        return [2 /*return*/, (res.results || []).map(function (item) {
                                var _a, _b, _c, _d, _e, _f, _g, _h;
                                return ({
                                    id: item.id,
                                    object: item.object,
                                    type: item.type,
                                    title: ((_d = (_c = (_b = (_a = item.properties) === null || _a === void 0 ? void 0 : _a.title) === null || _b === void 0 ? void 0 : _b.title) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.plain_text) || ((_h = (_g = (_f = (_e = item.properties) === null || _e === void 0 ? void 0 : _e.Name) === null || _f === void 0 ? void 0 : _f.title) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.plain_text) || '',
                                    url: getPageUrl(item),
                                });
                            })];
                }
            });
        });
    },
    // Get page – now returns full plain-text, including nested blocks
    notion_get_page: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var page_id, notion, page, rootBlocks, textLines, textContent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Notion operations');
                        page_id = params.page_id;
                        return [4 /*yield*/, (0, notion_auth_service_1.createNotionClient)(context.integrationId)];
                    case 1:
                        notion = _a.sent();
                        return [4 /*yield*/, notion.pages.retrieve({ page_id: page_id })];
                    case 2:
                        page = _a.sent();
                        return [4 /*yield*/, fetchAllChildren(notion, page_id)];
                    case 3:
                        rootBlocks = _a.sent();
                        return [4 /*yield*/, blocksToText(notion, rootBlocks)];
                    case 4:
                        textLines = _a.sent();
                        textContent = textLines.join('\n');
                        return [2 /*return*/, {
                                id: page.id,
                                url: getPageUrl(page),
                                text: textContent,
                            }];
                }
            });
        });
    },
    // Create a new page in Notion
    notion_create_page: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var parent_id, title, _a, properties, _b, children, notion, parentType, parent, pageProps, res;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Notion operations');
                        parent_id = params.parent_id, title = params.title, _a = params.properties, properties = _a === void 0 ? {} : _a, _b = params.children, children = _b === void 0 ? [] : _b;
                        return [4 /*yield*/, (0, notion_auth_service_1.createNotionClient)(context.integrationId)];
                    case 1:
                        notion = _d.sent();
                        parentType = parent_id.length === 36 ? 'database_id' : 'page_id';
                        parent = (_c = {}, _c[parentType] = parent_id, _c);
                        pageProps = __assign(__assign({}, properties), { title: [{ text: { content: title } }] });
                        return [4 /*yield*/, notion.pages.create({
                                parent: parent,
                                properties: pageProps,
                                children: children,
                            })];
                    case 2:
                        res = _d.sent();
                        return [2 /*return*/, { id: res.id, url: getPageUrl(res) }];
                }
            });
        });
    },
    // Update properties of an existing Notion page
    notion_update_page: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var page_id, properties, notion, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Notion operations');
                        page_id = params.page_id, properties = params.properties;
                        return [4 /*yield*/, (0, notion_auth_service_1.createNotionClient)(context.integrationId)];
                    case 1:
                        notion = _a.sent();
                        return [4 /*yield*/, notion.pages.update({ page_id: page_id, properties: properties })];
                    case 2:
                        res = _a.sent();
                        return [2 /*return*/, { id: res.id, url: getPageUrl(res), properties: getPageProperties(res) }];
                }
            });
        });
    },
    // Append content blocks to an existing Notion page
    notion_append_to_page: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var page_id, children, notion, allAppended, CHUNK_SIZE, i, chunk, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Notion operations');
                        page_id = params.page_id, children = params.children;
                        if (!Array.isArray(children) || children.length === 0) {
                            throw new Error('Invalid input: "children" must be a non-empty array of Notion block objects.');
                        }
                        return [4 /*yield*/, (0, notion_auth_service_1.createNotionClient)(context.integrationId)];
                    case 1:
                        notion = _a.sent();
                        allAppended = [];
                        CHUNK_SIZE = 100;
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < children.length)) return [3 /*break*/, 5];
                        chunk = children.slice(i, i + CHUNK_SIZE);
                        return [4 /*yield*/, notion.blocks.children.append({ block_id: page_id, children: chunk })];
                    case 3:
                        res = _a.sent();
                        allAppended.push.apply(allAppended, res.results);
                        _a.label = 4;
                    case 4:
                        i += CHUNK_SIZE;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, { block_id: page_id, appended_count: allAppended.length }];
                }
            });
        });
    },
    // List all accessible Notion databases
    notion_list_databases: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var query, notion, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Notion operations');
                        query = params.query;
                        return [4 /*yield*/, (0, notion_auth_service_1.createNotionClient)(context.integrationId)];
                    case 1:
                        notion = _a.sent();
                        return [4 /*yield*/, notion.search({ query: query, filter: { property: 'object', value: 'database' } })];
                    case 2:
                        res = _a.sent();
                        return [2 /*return*/, (res.results || []).map(function (db) {
                                var _a, _b, _c, _d, _e, _f;
                                return ({
                                    id: db.id,
                                    title: ((_b = (_a = db.title) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.plain_text) || ((_f = (_e = (_d = (_c = db.properties) === null || _c === void 0 ? void 0 : _c.Name) === null || _d === void 0 ? void 0 : _d.title) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.plain_text) || '',
                                    url: getPageUrl(db),
                                    properties: db.properties,
                                });
                            })];
                }
            });
        });
    },
    // Query a Notion database with filters and sorts
    notion_query_database: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var database_id, filter, sorts, _a, page_size, notion, res;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Notion operations');
                        database_id = params.database_id, filter = params.filter, sorts = params.sorts, _a = params.page_size, page_size = _a === void 0 ? 10 : _a;
                        return [4 /*yield*/, (0, notion_auth_service_1.createNotionClient)(context.integrationId)];
                    case 1:
                        notion = _b.sent();
                        return [4 /*yield*/, notion.databases.query({ database_id: database_id, filter: filter, sorts: sorts, page_size: page_size })];
                    case 2:
                        res = _b.sent();
                        return [2 /*return*/, (res.results || []).map(function (row) { return ({
                                id: row.id,
                                properties: row.properties,
                                url: getPageUrl(row),
                            }); })];
                }
            });
        });
    },
    // Create a new entry (row) in a Notion database
    notion_create_database_entry: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var database_id, properties, notion, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Notion operations');
                        database_id = params.database_id, properties = params.properties;
                        return [4 /*yield*/, (0, notion_auth_service_1.createNotionClient)(context.integrationId)];
                    case 1:
                        notion = _a.sent();
                        return [4 /*yield*/, notion.pages.create({
                                parent: { database_id: database_id },
                                properties: properties,
                            })];
                    case 2:
                        res = _a.sent();
                        return [2 /*return*/, { id: res.id, url: getPageUrl(res) }];
                }
            });
        });
    },
    // Update an entry (row) in a Notion database
    notion_update_database_entry: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var page_id, properties, notion, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Notion operations');
                        page_id = params.page_id, properties = params.properties;
                        return [4 /*yield*/, (0, notion_auth_service_1.createNotionClient)(context.integrationId)];
                    case 1:
                        notion = _a.sent();
                        return [4 /*yield*/, notion.pages.update({ page_id: page_id, properties: properties })];
                    case 2:
                        res = _a.sent();
                        return [2 /*return*/, { id: res.id, url: getPageUrl(res), properties: getPageProperties(res) }];
                }
            });
        });
    },
    // Get a specific entry (row) from a Notion database
    notion_get_database_entry: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var page_id, notion, page;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Notion operations');
                        page_id = params.page_id;
                        return [4 /*yield*/, (0, notion_auth_service_1.createNotionClient)(context.integrationId)];
                    case 1:
                        notion = _a.sent();
                        return [4 /*yield*/, notion.pages.retrieve({ page_id: page_id })];
                    case 2:
                        page = _a.sent();
                        return [2 /*return*/, { id: page.id, properties: getPageProperties(page), url: getPageUrl(page) }];
                }
            });
        });
    },
    // List all users in the Notion workspace
    notion_list_users: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var notion, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Notion operations');
                        return [4 /*yield*/, (0, notion_auth_service_1.createNotionClient)(context.integrationId)];
                    case 1:
                        notion = _a.sent();
                        return [4 /*yield*/, notion.users.list({})];
                    case 2:
                        res = _a.sent();
                        return [2 /*return*/, (res.results || []).map(function (user) { return ({
                                id: user.id,
                                name: user.name,
                                type: user.type,
                                avatar_url: user.avatar_url,
                                person: user.person,
                                bot: user.bot,
                            }); })];
                }
            });
        });
    },
    // Get comments for a Notion page
    notion_get_page_comments: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var page_id, notion;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Notion operations');
                        page_id = params.page_id;
                        return [4 /*yield*/, (0, notion_auth_service_1.createNotionClient)(context.integrationId)];
                    case 1:
                        notion = _a.sent();
                        // Notion API: comments are part of the discussions API (beta), not in the main client yet
                        // We'll return an empty array for now or you can implement a fetch to the discussions endpoint if needed
                        return [2 /*return*/, { page_id: page_id, comments: [] }];
                }
            });
        });
    },
    // List all accessible Notion pages
    notion_list_pages: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var query, _a, page_size, notion, res;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Notion operations');
                        query = params.query, _a = params.page_size, page_size = _a === void 0 ? 10 : _a;
                        return [4 /*yield*/, (0, notion_auth_service_1.createNotionClient)(context.integrationId)];
                    case 1:
                        notion = _b.sent();
                        return [4 /*yield*/, notion.search({ query: query, page_size: page_size, filter: { property: 'object', value: 'page' } })];
                    case 2:
                        res = _b.sent();
                        return [2 /*return*/, (res.results || []).map(function (page) {
                                var _a, _b, _c, _d, _e, _f, _g, _h;
                                return ({
                                    id: page.id,
                                    title: ((_d = (_c = (_b = (_a = page.properties) === null || _a === void 0 ? void 0 : _a.title) === null || _b === void 0 ? void 0 : _b.title) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.plain_text) || ((_h = (_g = (_f = (_e = page.properties) === null || _e === void 0 ? void 0 : _e.Name) === null || _f === void 0 ? void 0 : _f.title) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.plain_text) || '',
                                    url: getPageUrl(page),
                                    properties: getPageProperties(page),
                                });
                            })];
                }
            });
        });
    },
};
