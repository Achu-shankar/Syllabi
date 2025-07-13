import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import {
    getMessages,
    saveOrUpdateChatMessages,
    // We might need a function to verify session ownership if not implicit
    // verifySessionAccess
} from '@/app/chat/[chatbotId]/lib/db/queries'; // Adjust import path
import type { Message } from '@ai-sdk/react'; // Import SDK type

// --- GET Handler: Fetch Messages ---
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  if (!sessionId) {
    return new NextResponse('Missing sessionId parameter', { status: 400 });
  }

  try {
    // First, determine which chatbot this session belongs to using service client
    const serviceClient = createServiceClient();
    
    const { data: sessionData, error: sessionError } = await serviceClient
      .from('chat_sessions')
      .select(`
        chatbot_slug,
        chatbots!inner(visibility)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      // For embedded chatbots with persistence, the session might not exist yet on first load
      // Return empty messages array instead of 404 to allow graceful handling
      console.log(`[API GET /messages] Session not found (may be first load): ${sessionId}`, sessionError);
      return NextResponse.json([]);
    }

    const chatbotVisibility = (sessionData.chatbots as any).visibility;
    
    // Choose the appropriate client based on chatbot visibility
    let supabase;
    let userId = null;
    
    if (chatbotVisibility === 'public') {
      // For public chatbots, use service client (no authentication required)
      supabase = serviceClient;
      console.log(`[API GET /messages] Public chatbot - using service client for session: ${sessionId}`);
    } else {
      // For private/shared chatbots, require user authentication
      supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return new NextResponse('Unauthorized - Authentication required for this chatbot', { status: 401 });
      }
      
      userId = user.id;
      console.log(`[API GET /messages] Private chatbot - authenticated user: ${userId}, Session: ${sessionId}`);
    }

    // Fetch messages using the appropriate client
    const messages = await getMessages(sessionId);

    return NextResponse.json(messages);

  } catch (error) {
    console.error(`[API GET /messages] Error for session ${sessionId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// --- POST Handler: Save Messages ---
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  if (!sessionId) {
    return new NextResponse('Missing sessionId parameter', { status: 400 });
  }

  try {
    // First, determine which chatbot this session belongs to using service client
    const serviceClient = createServiceClient();
    
    const { data: sessionData, error: sessionError } = await serviceClient
      .from('chat_sessions')
      .select(`
        chatbot_slug,
        chatbots!inner(visibility)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      console.error(`[API POST /messages] Session not found: ${sessionId}`, sessionError);
      return new NextResponse('Session not found', { status: 404 });
    }

    const chatbotVisibility = (sessionData.chatbots as any).visibility;
    
    // Choose the appropriate client based on chatbot visibility
    let supabase;
    let userId = null;
    
    if (chatbotVisibility === 'public') {
      // For public chatbots, use service client (allow anonymous)
      supabase = serviceClient;
      console.log(`[API POST /messages] Public chatbot - allowing anonymous save for session: ${sessionId}`);
    } else {
      // For private/shared chatbots, require user authentication
      supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return new NextResponse('Unauthorized - Authentication required for this chatbot', { status: 401 });
      }
      
      userId = user.id;
      console.log(`[API POST /messages] Private chatbot - authenticated user: ${userId}, Session: ${sessionId}`);
    }

    // Parse the message data from the request body
    let requestBody;
    try {
         requestBody = await request.json();
    } catch (e) {
        return new NextResponse('Invalid JSON body', { status: 400 });
    }

    // Extract messages, chatbotSlug, and tokenCount from the body
    const messagesToSave: Message[] = requestBody?.messages;
    const chatbotSlug: string | undefined = requestBody?.chatbotSlug;
    const tokenCount: number = requestBody?.tokenCount || 0;

    if (!messagesToSave || !Array.isArray(messagesToSave) || messagesToSave.length === 0) {
        return new NextResponse('Invalid or missing messages array in request body', { status: 400 });
    }
    
    if (!chatbotSlug) {
         return new NextResponse('Missing chatbotSlug in request body', { status: 400 });
    }

    console.log(`[API POST /messages] User: ${userId || 'anonymous'}, Session: ${sessionId}, Chatbot: ${chatbotSlug}, Messages: ${messagesToSave.length}`);

    // Call the save function with the correct parameters
    await saveOrUpdateChatMessages(userId, sessionId, chatbotSlug, messagesToSave, tokenCount);

    // Return success status
    return new NextResponse(null, { status: 201 });

  } catch (error) {
    // Log the full error object for better debugging
    console.error(`[API POST /messages] Detailed Error for session ${sessionId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    // Avoid sending detailed internal errors to the client unless necessary
    return new NextResponse(JSON.stringify({ error: 'Failed to save messages' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
