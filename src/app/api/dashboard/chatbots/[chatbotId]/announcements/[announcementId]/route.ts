import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface RouteParams {
  params: Promise<{
    chatbotId: string;
    announcementId: string;
  }>;
}

/**
 * PATCH update an announcement
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { chatbotId, announcementId } = await params;

  if (!chatbotId || !announcementId) {
    return NextResponse.json(
      { error: 'Chatbot ID and Announcement ID are required' },
      { status: 400 }
    );
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

    // Build update object
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (is_published !== undefined) {
      updates.is_published = is_published;
      // Set published_at when publishing
      if (is_published) {
        // Only set published_at if it hasn't been set before
        const { data: existingAnnouncement } = await supabase
          .from('announcements')
          .select('published_at')
          .eq('id', announcementId)
          .single();

        if (existingAnnouncement && !existingAnnouncement.published_at) {
          updates.published_at = new Date().toISOString();
        }
      }
    }

    // Update announcement
    const { data: announcement, error: updateError } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', announcementId)
      .eq('chatbot_id', chatbotId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating announcement:', updateError);
      return NextResponse.json(
        { error: 'Failed to update announcement' },
        { status: 500 }
      );
    }

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    return NextResponse.json(announcement, { status: 200 });
  } catch (error: any) {
    console.error('Unexpected error updating announcement:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE an announcement
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { chatbotId, announcementId } = await params;

  if (!chatbotId || !announcementId) {
    return NextResponse.json(
      { error: 'Chatbot ID and Announcement ID are required' },
      { status: 400 }
    );
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

    // Delete announcement
    const { error: deleteError } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId)
      .eq('chatbot_id', chatbotId);

    if (deleteError) {
      console.error('Error deleting announcement:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete announcement' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Announcement deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Unexpected error deleting announcement:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
