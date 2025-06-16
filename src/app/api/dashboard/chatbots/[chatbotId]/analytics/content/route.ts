import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getChatbotContentAnalytics } from '@/app/dashboard/libs/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: { chatbotId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentAnalytics = await getChatbotContentAnalytics(params.chatbotId, user.id);

    return NextResponse.json(contentAnalytics);
  } catch (error) {
    console.error('Error fetching chatbot content analytics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch content analytics' },
      { status: 500 }
    );
  }
} 