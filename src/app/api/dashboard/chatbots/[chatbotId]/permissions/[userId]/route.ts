import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../../../../utils/supabase/server';

interface RouteParams {
  params: {
    chatbotId: string;
    userId: string;
  };
}

// DELETE - Remove permission for a specific user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { chatbotId, userId } = await params;
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Verify the user owns this chatbot
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id, user_id')
      .eq('id', chatbotId)
      .eq('user_id', user.id)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json({ error: "Chatbot not found or access denied" }, { status: 404 });
    }

    // Remove permission
    const { error } = await supabase
      .from('chatbot_permissions')
      .delete()
      .eq('chatbot_id', chatbotId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing permission:', error);
      return NextResponse.json({ error: "Failed to remove permission" }, { status: 500 });
    }

    return NextResponse.json({ message: "Permission removed successfully" }, { status: 200 });

  } catch (error: any) {
    console.error('Error removing chatbot permission:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
} 