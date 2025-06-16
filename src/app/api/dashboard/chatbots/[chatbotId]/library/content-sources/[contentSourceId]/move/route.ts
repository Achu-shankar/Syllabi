import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  getContentSourceById,
  moveContentSourceToFolder,
  getFolderById
} from '@/app/dashboard/chatbots/[chatbotId]/library/lib/queries';

/**
 * PUT /api/dashboard/chatbots/[chatbotId]/library/content-sources/[contentSourceId]/move
 * Move a content source to a folder (or to "Unsorted" if folderId is null)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { chatbotId: string; contentSourceId: string } }
) {
  try {
    const { chatbotId, contentSourceId } = params;
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

    // Verify content source exists and belongs to this chatbot
    const contentSource = await getContentSourceById(contentSourceId);
    if (!contentSource || contentSource.chatbot_id !== chatbotId) {
      return NextResponse.json(
        { error: 'Content source not found' },
        { status: 404 }
      );
    }

    // Extract folder_id from request body
    const { folder_id } = body;

    // If folder_id is provided (not null), verify the folder exists and belongs to this chatbot
    if (folder_id !== null && folder_id !== undefined) {
      const targetFolder = await getFolderById(folder_id);
      if (!targetFolder || targetFolder.chatbot_id !== chatbotId) {
        return NextResponse.json(
          { error: 'Target folder not found' },
          { status: 404 }
        );
      }
    }

    // Move the content source
    const updatedContentSource = await moveContentSourceToFolder(
      contentSourceId, 
      folder_id === undefined ? null : folder_id
    );

    return NextResponse.json({ 
      content_source: updatedContentSource,
      message: folder_id === null || folder_id === undefined 
        ? 'Content moved to Unsorted' 
        : 'Content moved to folder successfully'
    });

  } catch (error) {
    console.error('Error moving content source:', error);
    return NextResponse.json(
      { error: 'Failed to move content source' },
      { status: 500 }
    );
  }
} 