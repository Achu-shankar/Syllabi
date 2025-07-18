import { createNotionClient } from '../notion_auth_service';
import type { SkillExecutionContext } from '../skill-executor-v2';

export const NOTION_SKILL_DEFINITIONS = [
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
            description: "Content blocks to append. You can pass full Notion block objects OR simple objects of the form { type: 'paragraph' | 'bulleted_list_item' | 'heading_1' | 'heading_2' | 'heading_3', text: 'Plain text' }. The backend will convert these simple objects to valid Notion block structures for you.",
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'The block type. Supported: paragraph, heading_1, heading_2, heading_3, bulleted_list_item, numbered_list_item',
                  enum: ['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item']
                },
                text: { type: 'string', description: 'Plain text content for the block' }
              },
              required: ['type', 'text']
            },
            example: [
              { "type": "heading_2", "text": "Chest Exercises" },
              { "type": "bulleted_list_item", "text": "Barbell Bench Press" },
              { "type": "bulleted_list_item", "text": "Push-Ups" }
            ]
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

function getPageProperties(page: any) {
  if ('properties' in page) return page.properties;
  return undefined;
}
function getPageUrl(page: any) {
  if ('url' in page) return page.url;
  return undefined;
}

// --- Helper: extract plain text from Notion blocks (non-recursive) ---
function extractTextFromBlocks(blocks: any[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    if (!block || !block.type) continue;
    const data = (block as any)[block.type];
    if (data?.rich_text && Array.isArray(data.rich_text)) {
      const text = data.rich_text
        .map((t: any) => t.plain_text ?? t.text?.content ?? '')
        .join('');
      if (text) lines.push(text);
    }
  }
  return lines.join('\n');
}

// --- Helper: fetch **all** children for a block (handles pagination) ---
async function fetchAllChildren(notion: any, blockId: string) {
  let cursor: string | undefined = undefined;
  let results: any[] = [];
  do {
    const res: any = await notion.blocks.children.list({ block_id: blockId, start_cursor: cursor });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor as string : undefined;
  } while (cursor);
  return results;
}

// --- Helper: convert rich_text array to plain string ---
function richTextToPlain(rich: any[]): string {
  return rich?.map((r: any) => r.plain_text ?? r.text?.content ?? '').join('') || '';
}

// --- Recursive helper: flatten blocks into plain-text lines ---
async function blocksToText(notion: any, blocks: any[], depth = 0): Promise<string[]> {
  const lines: string[] = [];
  let listIndex = 1;

  for (const block of blocks) {
    if (!block || !block.type) continue;

    const { type, has_children } = block;
    const data = (block as any)[type];

    let prefix = '';
    let line = '';

    switch (type) {
      case 'paragraph':
        line = richTextToPlain(data.rich_text);
        break;
      case 'heading_1':
        line = `# ${richTextToPlain(data.rich_text)}`;
        break;
      case 'heading_2':
        line = `## ${richTextToPlain(data.rich_text)}`;
        break;
      case 'heading_3':
        line = `### ${richTextToPlain(data.rich_text)}`;
        break;
      case 'bulleted_list_item':
        prefix = '- ';
        line = prefix + richTextToPlain(data.rich_text);
        break;
      case 'numbered_list_item':
        prefix = `${listIndex++}. `;
        line = prefix + richTextToPlain(data.rich_text);
        break;
      case 'to_do':
        const check = data.checked ? '☑' : '☐';
        line = `${check} ${richTextToPlain(data.rich_text)}`;
        break;
      case 'quote':
        line = `> ${richTextToPlain(data.rich_text)}`;
        break;
      case 'callout':
        line = richTextToPlain(data.rich_text);
        break;
      case 'table_row':
        // Flatten table row cells
        line = data.cells.map((cell: any) => richTextToPlain(cell)).join(' | ');
        break;
      case 'child_page':
        line = `[[Sub-page]]: ${data?.title || 'Untitled'}`;
        break;
      default:
        // For other types just try to extract rich_text if present
        if (data?.rich_text) line = richTextToPlain(data.rich_text);
        break;
    }

    if (line) lines.push(line);

    if (has_children) {
      const children = await fetchAllChildren(notion, block.id);
      const childLines = await blocksToText(notion, children, depth + 1);
      lines.push(...childLines);
    }
  }
  return lines;
}

export const NOTION_SKILL_IMPLEMENTATIONS = {
  // Search for pages in your Notion workspace by keyword
  async notion_search_pages(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Notion operations');
    const { query, page_size = 10 } = params;
    const notion = await createNotionClient(context.integrationId);
    const res = await notion.search({ query, page_size });
    return (res.results || []).map((item: any) => ({
      id: item.id,
      object: item.object,
      type: item.type,
      title: item.properties?.title?.title?.[0]?.plain_text || item.properties?.Name?.title?.[0]?.plain_text || '',
      url: getPageUrl(item),
    }));
  },

  // Get page – now returns full plain-text, including nested blocks
  async notion_get_page(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Notion operations');
    const { page_id } = params;
    const notion = await createNotionClient(context.integrationId);

    const page = await notion.pages.retrieve({ page_id });
    const rootBlocks = await fetchAllChildren(notion, page_id);
    const textLines = await blocksToText(notion, rootBlocks);
    const textContent = textLines.join('\n');

    return {
      id: page.id,
      url: getPageUrl(page),
      text: textContent,
    };
  },

  // Create a new page in Notion
  async notion_create_page(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Notion operations');
    const { parent_id, title, properties = {}, children = [] } = params;
    const notion = await createNotionClient(context.integrationId);
    // If parent_id is a database, set parent.type = 'database_id', else 'page_id'
    const parentType = parent_id.length === 36 ? 'database_id' : 'page_id';
    const parent = { [parentType]: parent_id };
    const pageProps = {
      ...properties,
      title: [{ text: { content: title } }],
    };
    const res = await notion.pages.create({
      parent: parent as any,
      properties: pageProps,
      children,
    });
    return { id: res.id, url: getPageUrl(res) };
  },

  // Update properties of an existing Notion page
  async notion_update_page(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Notion operations');
    const { page_id, properties } = params;
    const notion = await createNotionClient(context.integrationId);
    const res = await notion.pages.update({ page_id, properties });
    return { id: res.id, url: getPageUrl(res), properties: getPageProperties(res) };
  },

  // Append content blocks to an existing Notion page
  async notion_append_to_page(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Notion operations');
    const { page_id, children } = params;

    if (!Array.isArray(children) || children.length === 0) {
      throw new Error('Invalid input: "children" must be a non-empty array of Notion block objects.');
    }

    // Helper to convert simple {type,text} objects into valid Notion block objects
    const toRichText = (text: string) => [{ type: 'text', text: { content: text } }];

    const convertSimpleBlock = (item: any): any => {
      // If it already looks like a Notion block (has object === 'block' and a type-specific property), use as is
      if (item && item.object === 'block' && item.type) {
        return item;
      }

      if (!item || !item.type || !item.text) {
        throw new Error('Each child must either be a full Notion block object or have "type" and "text" fields.');
      }

      const textRT = toRichText(item.text);
      switch (item.type) {
        case 'paragraph':
          return { object: 'block', type: 'paragraph', paragraph: { rich_text: textRT } };
        case 'heading_1':
        case 'heading_2':
        case 'heading_3':
          return { object: 'block', type: item.type, [item.type]: { rich_text: textRT } } as any;
        case 'bulleted_list_item':
          return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: textRT } };
        case 'numbered_list_item':
          return { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: textRT } };
        default:
          throw new Error(`Unsupported block type: ${item.type}`);
      }
    };

    const blocks = children.map(convertSimpleBlock);

    const notion = await createNotionClient(context.integrationId);
    const allAppended: any[] = [];
    const CHUNK_SIZE = 100; // Notion API limit is 100 blocks per request

    for (let i = 0; i < blocks.length; i += CHUNK_SIZE) {
      const chunk = blocks.slice(i, i + CHUNK_SIZE);
      const res = await notion.blocks.children.append({ block_id: page_id, children: chunk });
      allAppended.push(...res.results);
    }

    return { block_id: page_id, appended_count: allAppended.length };
  },

  // List all accessible Notion databases
  async notion_list_databases(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Notion operations');
    const { query } = params;
    const notion = await createNotionClient(context.integrationId);
    // Notion doesn't have a direct list databases endpoint, so we search for objects of type 'database'
    const res = await notion.search({ query, filter: { property: 'object', value: 'database' } });
    return (res.results || []).map((db: any) => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || db.properties?.Name?.title?.[0]?.plain_text || '',
      url: getPageUrl(db),
      properties: db.properties,
    }));
  },

  // Query a Notion database with filters and sorts
  async notion_query_database(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Notion operations');
    const { database_id, filter, sorts, page_size = 10 } = params;
    const notion = await createNotionClient(context.integrationId);
    const res = await notion.databases.query({ database_id, filter, sorts, page_size });
    return (res.results || []).map((row: any) => ({
      id: row.id,
      properties: row.properties,
      url: getPageUrl(row),
    }));
  },

  // Create a new entry (row) in a Notion database
  async notion_create_database_entry(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Notion operations');
    const { database_id, properties } = params;
    const notion = await createNotionClient(context.integrationId);
    const res = await notion.pages.create({
      parent: { database_id },
      properties,
    });
    return { id: res.id, url: getPageUrl(res) };
  },

  // Update an entry (row) in a Notion database
  async notion_update_database_entry(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Notion operations');
    const { page_id, properties } = params;
    const notion = await createNotionClient(context.integrationId);
    const res = await notion.pages.update({ page_id, properties });
    return { id: res.id, url: getPageUrl(res), properties: getPageProperties(res) };
  },

  // Get a specific entry (row) from a Notion database
  async notion_get_database_entry(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Notion operations');
    const { page_id } = params;
    const notion = await createNotionClient(context.integrationId);
    const page = await notion.pages.retrieve({ page_id });
    return { id: page.id, properties: getPageProperties(page), url: getPageUrl(page) };
  },

  // List all users in the Notion workspace
  async notion_list_users(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Notion operations');
    const notion = await createNotionClient(context.integrationId);
    const res = await notion.users.list({});
    return (res.results || []).map((user: any) => ({
      id: user.id,
      name: user.name,
      type: user.type,
      avatar_url: user.avatar_url,
      person: user.person,
      bot: user.bot,
    }));
  },

  // Get comments for a Notion page
  async notion_get_page_comments(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Notion operations');
    const { page_id } = params;
    const notion = await createNotionClient(context.integrationId);
    // Notion API: comments are part of the discussions API (beta), not in the main client yet
    // We'll return an empty array for now or you can implement a fetch to the discussions endpoint if needed
    return { page_id, comments: [] };
  },

  // List all accessible Notion pages
  async notion_list_pages(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Notion operations');
    const { query, page_size = 10 } = params;
    const notion = await createNotionClient(context.integrationId);
    const res = await notion.search({ query, page_size, filter: { property: 'object', value: 'page' } });
    return (res.results || []).map((page: any) => ({
      id: page.id,
      title: page.properties?.title?.title?.[0]?.plain_text || page.properties?.Name?.title?.[0]?.plain_text || '',
      url: getPageUrl(page),
      properties: getPageProperties(page),
    }));
  },
}; 