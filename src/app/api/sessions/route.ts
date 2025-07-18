import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getChatSessions } from '@/app/chat/[chatbotId]/lib/db/queries'; // Adjust import path as needed

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatbotSlug = searchParams.get('chatbotSlug');

    if (!chatbotSlug) {
      return new NextResponse('chatbotSlug parameter is required', { status: 400 });
    }

    const sessions = await getChatSessions(user.id, chatbotSlug);

    return NextResponse.json(sessions);

  } catch (error) {
    console.error('[API GET /sessions] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
