import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { updateChatSessionName, getMessages } from '@/app/chat/[chatbotId]/lib/db/queries';

// GET /api/chat/sessions/[sessionId]?chatbotSlug=<slug>
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const chatbotSlug = searchParams.get('chatbotSlug');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!chatbotSlug) {
      return NextResponse.json(
        { error: 'chatbotSlug parameter is required' },
        { status: 400 }
      );
    }

    // First, determine the chatbot visibility using service client
    const serviceClient = createServiceClient();
    const { data: chatbot, error: chatbotError } = await serviceClient
      .from('chatbots')
      .select('visibility')
      .eq('shareable_url_slug', chatbotSlug)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    // Choose the appropriate client based on chatbot visibility
    let supabase;
    let userId = null;
    
    if (chatbot.visibility === 'public') {
      // For public chatbots, use service client (no authentication required)
      supabase = serviceClient;
      console.log(`[API GET /chat/sessions] Public chatbot - using service client for session: ${sessionId}`);
    } else {
      // For private/shared chatbots, require user authentication
      supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      userId = user.id;
      console.log(`[API GET /chat/sessions] Private chatbot - authenticated user: ${userId}, Session: ${sessionId}`);
    }

    const messages = await getMessages(sessionId);
    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// PATCH /api/chat/sessions/[sessionId] - Update session name
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;
    const body = await request.json();
    const { name, chatbotSlug } = body;

    if (!sessionId || !chatbotSlug) {
      return NextResponse.json(
        { error: 'sessionId and chatbotSlug are required' },
        { status: 400 }
      );
    }

    if (typeof name !== 'string' && name !== null) {
      return NextResponse.json(
        { error: 'name must be a string or null' },
        { status: 400 }
      );
    }

    await updateChatSessionName(user.id, sessionId, chatbotSlug, name);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating session name:', error);
    return NextResponse.json(
      { error: 'Failed to update session name' },
      { status: 500 }
    );
  }
} 