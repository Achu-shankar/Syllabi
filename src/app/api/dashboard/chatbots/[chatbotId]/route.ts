import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../../utils/supabase/server'; // Adjusted path for server client
import {
  updateChatbot,
  deleteChatbot,
  type UpdateChatbotPayload,
  getChatbotById
} from '../../../../dashboard/libs/queries'; // Adjusted path to queries

interface RouteParams {
  params: Promise<{
    chatbotId: string;
  }>;
}

// GET a specific chatbot
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { chatbotId } = await params;
  if (!chatbotId) {
    return NextResponse.json({ error: "Chatbot ID is required" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const chatbot = await getChatbotById(chatbotId, user.id);

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found or access denied" }, { status: 404 });
    }
    return NextResponse.json(chatbot, { status: 200 });
  } catch (error: any) {
    console.error(`Error fetching chatbot ${chatbotId}:`, error);
    return NextResponse.json({ error: error.message || "Failed to fetch chatbot" }, { status: 500 });
  }
}

// PATCH Handler for updating a chatbot
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { chatbotId } = await params;
  if (!chatbotId) {
    return NextResponse.json({ error: "Chatbot ID is required" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const updates = await request.json() as UpdateChatbotPayload;

    const updatedChatbot = await updateChatbot(chatbotId, user.id, updates);
    return NextResponse.json(updatedChatbot, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating chatbot ${chatbotId}:`, error);
    if (error.message.includes("not found")) {
        return NextResponse.json({ error: "Chatbot not found or access denied" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Failed to update chatbot" }, { status: 500 });
  }
}

// DELETE Handler for deleting a chatbot
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { chatbotId } = await params;
  if (!chatbotId) {
    return NextResponse.json({ error: "Chatbot ID is required" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    await deleteChatbot(chatbotId, user.id);
    return NextResponse.json({ message: "Chatbot deleted successfully" }, { status: 200 }); // Or 204 No Content

  } catch (error: any) {
    console.error(`Error deleting chatbot ${chatbotId}:`, error);
    if (error.message.includes("not found")) { // Or check specific error codes
        return NextResponse.json({ error: "Chatbot not found or access denied" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Failed to delete chatbot" }, { status: 500 });
  }
} 