import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface RouteParams {
  params: Promise<{
    chatbotId: string;
  }>;
}

/**
 * GET all announcements for a chatbot (dashboard)
 * Returns both published and draft announcements
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { chatbotId } = await params;

  if (!chatbotId) {
    return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Verify user owns the chatbot
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

    // Get all announcements (published and drafts)
    const { data: announcements, error: announcementsError } = await supabase
      .from('announcements')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .order('created_at', { ascending: false });

    if (announcementsError) {
      console.error('Error fetching announcements:', announcementsError);
      return NextResponse.json(
        { error: 'Failed to fetch announcements' },
        { status: 500 }
      );
    }

    return NextResponse.json(announcements || [], { status: 200 });
  } catch (error: any) {
    console.error('Unexpected error fetching announcements:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST create new announcement
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { chatbotId } = await params;

  if (!chatbotId) {
    return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Verify user owns the chatbot
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

    // Parse request body
    const body = await request.json();
    const { title, content, is_published } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Create announcement
    const announcementData: any = {
      chatbot_id: chatbotId,
      user_id: user.id,
      title,
      content,
      is_published: is_published || false,
    };

    // Set published_at if publishing
    if (is_published) {
      announcementData.published_at = new Date().toISOString();
    }

    const { data: announcement, error: createError } = await supabase
      .from('announcements')
      .insert([announcementData])
      .select()
      .single();

    if (createError) {
      console.error('Error creating announcement:', createError);
      return NextResponse.json(
        { error: 'Failed to create announcement' },
        { status: 500 }
      );
    }

    return NextResponse.json(announcement, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error creating announcement:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
