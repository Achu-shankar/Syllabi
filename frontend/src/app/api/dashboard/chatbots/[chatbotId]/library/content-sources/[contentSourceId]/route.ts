import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  getContentSourceById,
  deleteContentSource
} from '@/app/dashboard/chatbots/[chatbotId]/library/lib/queries';

/**
 * DELETE /api/dashboard/chatbots/[chatbotId]/library/content-sources/[contentSourceId]
 * Delete a content source
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string; contentSourceId: string }> }
) {
  try {
    const { chatbotId, contentSourceId } = await params;

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

    // Delete the content source
    await deleteContentSource(contentSourceId);

    return NextResponse.json({ 
      success: true,
      message: 'Content source deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting content source:', error);
    return NextResponse.json(
      { error: 'Failed to delete content source' },
      { status: 500 }
    );
  }
} 