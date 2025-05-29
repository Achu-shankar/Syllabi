import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../utils/supabase/server'; // Server-side Supabase client
import {
  createChatbot,
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

  const payload: CreateChatbotPayload = {
    user_id: user.id,
    name: chatbotDataFromRequest.name,
    // Include other fields from the request if they are part of CreateChatbotPayload
    description: chatbotDataFromRequest.description,
    student_facing_name: chatbotDataFromRequest.student_facing_name,
    logo_url: chatbotDataFromRequest.logo_url,
    theme: chatbotDataFromRequest.theme,
    ai_model_identifier: chatbotDataFromRequest.ai_model_identifier,
    system_prompt: chatbotDataFromRequest.system_prompt,
    temperature: chatbotDataFromRequest.temperature,
    welcome_message: chatbotDataFromRequest.welcome_message,
    suggested_questions: chatbotDataFromRequest.suggested_questions,
    published: chatbotDataFromRequest.published,
    is_active: chatbotDataFromRequest.is_active,
    shareable_url_slug: chatbotDataFromRequest.shareable_url_slug,
  };

  try {
    const newChatbot = await createChatbot(payload);
    return NextResponse.json(newChatbot, { status: 201 });
  } catch (error: any) {
    console.error('[API /dashboard/chatbots POST] Error:', error);
    // Consider more specific error codes based on the type of error (e.g., unique constraint violation)
    return NextResponse.json(
      { error: 'Failed to create chatbot', details: error.message },
      { status: 500 }
    );
  }
} 