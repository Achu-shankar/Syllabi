import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface RouteParams {
  params: Promise<{
    chatbotId: string;
    feedbackId: string;
  }>;
}

/**
 * PATCH update feedback (status, response)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { chatbotId, feedbackId } = await params;

  if (!chatbotId || !feedbackId) {
    return NextResponse.json(
      { error: 'Chatbot ID and Feedback ID are required' },
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
    const { status, creator_response } = body;

    // Build update object
    const updates: any = {};
    if (status !== undefined) {
      // Validate status
      const validStatuses = ['new', 'in_progress', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updates.status = status;
    }
    if (creator_response !== undefined) {
      updates.creator_response = creator_response;
      // Set responded_at timestamp if adding a response
      if (creator_response) {
        updates.responded_at = new Date().toISOString();
      }
    }

    // Ensure there's something to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update feedback
    const { data: feedback, error: updateError } = await supabase
      .from('chatbot_feedback')
      .update(updates)
      .eq('id', feedbackId)
      .eq('chatbot_id', chatbotId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating feedback:', updateError);
      return NextResponse.json(
        { error: 'Failed to update feedback' },
        { status: 500 }
      );
    }

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    return NextResponse.json(feedback, { status: 200 });
  } catch (error: any) {
    console.error('Unexpected error updating feedback:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE feedback
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { chatbotId, feedbackId } = await params;

  if (!chatbotId || !feedbackId) {
    return NextResponse.json(
      { error: 'Chatbot ID and Feedback ID are required' },
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

    // Delete feedback
    const { error: deleteError } = await supabase
      .from('chatbot_feedback')
      .delete()
      .eq('id', feedbackId)
      .eq('chatbot_id', chatbotId);

    if (deleteError) {
      console.error('Error deleting feedback:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Feedback deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Unexpected error deleting feedback:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
