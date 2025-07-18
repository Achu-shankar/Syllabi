import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getContentSourcesByChatbotId } from '@/app/dashboard/chatbots/[chatbotId]/library/lib/queries';

/**
 * GET /api/dashboard/chatbots/[chatbotId]/library/content-sources
 * Get all content sources for a chatbot (used by library dashboard)
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

    const contentSources = await getContentSourcesByChatbotId(chatbotId);

    return NextResponse.json({
      content_sources: contentSources,
      total: contentSources.length
    });

  } catch (error) {
    console.error('Error fetching content sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content sources' },
      { status: 500 }
    );
  }
} 