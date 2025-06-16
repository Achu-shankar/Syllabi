import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  getFolderById,
  updateFolderName, 
  deleteFolder 
} from '@/app/dashboard/chatbots/[chatbotId]/library/lib/queries';

/**
 * PUT /api/dashboard/chatbots/[chatbotId]/library/folders/[folderId]
 * Update a folder (currently just name)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { chatbotId: string; folderId: string } }
) {
  try {
    const { chatbotId, folderId } = params;
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

    // Verify folder exists and belongs to this chatbot
    const folder = await getFolderById(folderId);
    if (!folder || folder.chatbot_id !== chatbotId) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Validate request body
    const { name } = body;
    
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

    const updatedFolder = await updateFolderName(folderId, name.trim());

    return NextResponse.json({ folder: updatedFolder });

  } catch (error) {
    console.error('Error updating folder:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique_folder_name_per_chatbot_parent')) {
      return NextResponse.json(
        { error: 'A folder with this name already exists in this location' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dashboard/chatbots/[chatbotId]/library/folders/[folderId]
 * Delete a folder (only if empty)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { chatbotId: string; folderId: string } }
) {
  try {
    const { chatbotId, folderId } = params;

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

    // Verify folder exists and belongs to this chatbot
    const folder = await getFolderById(folderId);
    if (!folder || folder.chatbot_id !== chatbotId) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    const result = await deleteFolder(folderId);

    return NextResponse.json({ success: result.success });

  } catch (error) {
    console.error('Error deleting folder:', error);
    
    // Handle specific error messages from deleteFolder function
    if (error instanceof Error) {
      if (error.message.includes('Cannot delete folder that contains content')) {
        return NextResponse.json(
          { error: 'Cannot delete folder that contains content. Move or delete content first.' },
          { status: 400 }
        );
      }
      if (error.message.includes('Cannot delete folder that contains subfolders')) {
        return NextResponse.json(
          { error: 'Cannot delete folder that contains subfolders.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
} 