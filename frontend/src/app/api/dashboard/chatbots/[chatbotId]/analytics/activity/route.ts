import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getChatbotRecentActivity } from '@/app/dashboard/libs/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const { chatbotId } = await params;

    const recentActivity = await getChatbotRecentActivity(chatbotId, user.id, limit);

    return NextResponse.json(recentActivity);
  } catch (error) {
    console.error('Error fetching chatbot recent activity:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch recent activity' },
      { status: 500 }
    );
  }
} 