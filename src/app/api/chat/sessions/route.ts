import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getChatSessions, deleteChatSession } from '@/app/chat/[chatbotId]/lib/db/queries';

// GET /api/chat/sessions?chatbotSlug=<slug>
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatbotSlug = searchParams.get('chatbotSlug');

    if (!chatbotSlug) {
      return NextResponse.json(
        { error: 'chatbotSlug parameter is required' },
        { status: 400 }
      );
    }

    const sessions = await getChatSessions(user.id, chatbotSlug);
    return NextResponse.json({ sessions });

  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat sessions' },
      { status: 500 }
    );
  }
}

// DELETE /api/chat/sessions
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, chatbotSlug } = body;

    if (!sessionId || !chatbotSlug) {
      return NextResponse.json(
        { error: 'sessionId and chatbotSlug are required' },
        { status: 400 }
      );
    }

    const result = await deleteChatSession(user.id, sessionId, chatbotSlug);
    return NextResponse.json({ success: true, result });

  } catch (error) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat session' },
      { status: 500 }
    );
  }
} 