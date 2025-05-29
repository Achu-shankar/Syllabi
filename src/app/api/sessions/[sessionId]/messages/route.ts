  import { NextRequest, NextResponse } from 'next/server';
  import { createClient } from '@/utils/supabase/server';
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
  { params }: { params: { sessionId: string } }
) {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const sessionId = params.sessionId;
    if (!sessionId) {
      return new NextResponse('Missing sessionId parameter', { status: 400 });
    }

    // Optional TODO: Add explicit access check if needed
    // const hasAccess = await verifySessionAccess(userId, sessionId);
    // if (!hasAccess) {
    //   return new NextResponse('Forbidden', { status: 403 });
    // }

    console.log(`[API GET /messages] User: ${user.id}, Session: ${sessionId}`);
    const messages = await getMessages(sessionId);

    return NextResponse.json(messages);

  } catch (error) {
    console.error(`[API GET /messages] Error for session ${params.sessionId}:`, error);
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
  { params }: { params: { sessionId: string } }
) {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    
    const sessionId = await params.sessionId;
    if (!sessionId) {
      return new NextResponse('Missing sessionId parameter', { status: 400 });
    }

    // Optional TODO: Add explicit access check if needed
    // const hasAccess = await verifySessionAccess(userId, sessionId);
    // if (!hasAccess) {
    //   return new NextResponse('Forbidden', { status: 403 });
    // }

    // Parse the message pair from the request body
    // Assuming body format is { messages: [userMessage, assistantMessage] }
    let requestBody;
    try {
         requestBody = await request.json();
    } catch (e) {
        return new NextResponse('Invalid JSON body', { status: 400 });
    }

    // Extract messages AND projectId AND chatbotSlug from the body
    const messagesToSave: Message[] = requestBody?.messages;
    const projectId: string | undefined = requestBody?.projectId;
    const chatbotSlug: string | undefined = requestBody?.chatbotSlug;

    if (!messagesToSave || !Array.isArray(messagesToSave) || messagesToSave.length === 0) {
        return new NextResponse('Invalid or missing messages array in request body', { status: 400 });
    }
    // Also validate projectId and chatbotSlug
    if (!projectId) {
         return new NextResponse('Missing projectId in request body', { status: 400 });
    }
    if (!chatbotSlug) {
         return new NextResponse('Missing chatbotSlug in request body', { status: 400 });
    }

    console.log(`[API POST /messages] User: ${user.id}, Session: ${sessionId}, Project: ${projectId}, Chatbot: ${chatbotSlug}, Messages: ${messagesToSave.length}`);

    // Call the save function with projectId and chatbotSlug from the body
    await saveOrUpdateChatMessages(user.id, projectId, chatbotSlug, messagesToSave);

    // Return success status
    return new NextResponse(null, { status: 201 });

  } catch (error) {
    // Log the full error object for better debugging
    console.error(`[API POST /messages] Detailed Error for session ${params.sessionId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    // Avoid sending detailed internal errors to the client unless necessary
    return new NextResponse(JSON.stringify({ error: 'Failed to save messages' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
