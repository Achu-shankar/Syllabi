import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  getFoldersByChatbot, 
  getFolderTreeByChatbot,
  createFolder,
  type FolderCreateInput 
} from '@/app/dashboard/chatbots/[chatbotId]/library/lib/queries';

/**
 * GET /api/dashboard/chatbots/[chatbotId]/library/folders
 * Get all folders for a chatbot
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params;

    // Verify user has access to this chatbot
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify chatbot ownership
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id')
      .eq('id', chatbotId)
      .eq('user_id', user.id)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json(
        { error: 'Chatbot not found or access denied' },
        { status: 404 }
      );
    }

    // Check if tree structure is requested
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    
    if (format === 'tree') {
      const folderTree = await getFolderTreeByChatbot(chatbotId);
      return NextResponse.json({
        folders: folderTree,
        total: folderTree.length,
        format: 'tree'
      });
    } else {
      const folders = await getFoldersByChatbot(chatbotId);
      return NextResponse.json({
        folders,
        total: folders.length,
        format: 'flat'
      });
    }

  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/chatbots/[chatbotId]/library/folders
 * Create a new folder
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params;
    const body = await request.json();

    // Verify user has access to this chatbot
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify chatbot ownership
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id')
      .eq('id', chatbotId)
      .eq('user_id', user.id)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json(
        { error: 'Chatbot not found or access denied' },
        { status: 404 }
      );
    }

    // Validate request body
    const { name, parent_id } = body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Folder name must be 100 characters or less' },
        { status: 400 }
      );
    }

    const folderInput: FolderCreateInput = {
      chatbot_id: chatbotId,
      user_id: user.id,
      name: name.trim(),
      parent_id: parent_id || null
    };

    const folder = await createFolder(folderInput);

    return NextResponse.json({ folder }, { status: 201 });

  } catch (error) {
    console.error('Error creating folder:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique_folder_name_per_chatbot_parent')) {
      return NextResponse.json(
        { error: 'A folder with this name already exists in this location' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
} 