import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../utils/supabase/server'; // Server-side Supabase client
import {
  getChatbotsByUserId,
  type CreateChatbotPayload,
} from '@/app/dashboard/libs/queries'; // Adjusted path

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const chatbots = await getChatbotsByUserId(user.id);
    return NextResponse.json(chatbots);
  } catch (error: any) {
    console.error('[API /dashboard/chatbots GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chatbots', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let chatbotDataFromRequest: Partial<CreateChatbotPayload>;

  try {
    chatbotDataFromRequest = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!chatbotDataFromRequest.name) {
    return NextResponse.json(
      { error: "'name' is required" },
      { status: 400 }
    );
  }

  try {
    // Insert the new chatbot using direct data with user_id override
    const { data: newChatbot, error: insertError } = await supabase
      .from('chatbots')
      .insert([{
        ...chatbotDataFromRequest,
        user_id: user.id, // Ensure user_id is set correctly (override any client value)
      }])
      .select()
      .single();

    if (insertError) {
      console.error('[API /dashboard/chatbots POST] Error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create chatbot', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(newChatbot, { status: 201 });
  } catch (error: any) {
    console.error('[API /dashboard/chatbots POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create chatbot', details: error.message },
      { status: 500 }
    );
  }
} 