import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';

interface RouteParams {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * POST submit feedback for a chatbot (chat interface)
 * Allows both authenticated and anonymous users to submit feedback
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Parse request body
    const body = await request.json();
    const {
      user_id,
      session_id,
      feedback_type,
      rating,
      subject,
      message,
      metadata,
    } = body;

    // Validate required fields
    if (!feedback_type || !message) {
      return NextResponse.json(
        { error: 'Feedback type and message are required' },
        { status: 400 }
      );
    }

    // Validate feedback_type
    const validTypes = ['bug', 'feature', 'improvement', 'question', 'other'];
    if (!validTypes.includes(feedback_type)) {
      return NextResponse.json(
        { error: `Invalid feedback type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate rating if provided
    if (rating !== undefined && rating !== null) {
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: 'Rating must be a number between 1 and 5' },
          { status: 400 }
        );
      }
    }

    // Build feedback data
    const feedbackData: any = {
      chatbot_id: chatbot.id,
      user_id: user_id || null,
      session_id: session_id || null,
      feedback_type,
      message,
      status: 'new',
    };

    if (rating !== undefined && rating !== null) {
      feedbackData.rating = rating;
    }
    if (subject) {
      feedbackData.subject = subject;
    }
    if (metadata) {
      feedbackData.metadata = metadata;
    }

    // Insert feedback using service client (bypasses RLS)
    const { data: feedback, error: createError } = await supabase
      .from('chatbot_feedback')
      .insert([feedbackData])
      .select()
      .single();

    if (createError) {
      console.error('Error creating feedback:', createError);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Feedback submitted successfully', id: feedback.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Unexpected error submitting feedback:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
