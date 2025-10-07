import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';

interface RouteParams {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * GET published announcements for a chatbot (chat interface)
 * Returns only published announcements, sorted by published_at DESC
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: 'Chatbot slug is required' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();

    // Get chatbot ID from slug
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id')
      .eq('shareable_url_slug', slug)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    // Get published announcements
    const { data: announcements, error: announcementsError } = await supabase
      .from('announcements')
      .select('id, title, content, published_at, created_at')
      .eq('chatbot_id', chatbot.id)
      .eq('is_published', true)
      .order('published_at', { ascending: false });

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
