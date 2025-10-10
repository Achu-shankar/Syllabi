import { NextRequest } from 'next/server';
import { getContentSourcesBySlug } from '@/app/chat/[chatbotId]/lib/db/content_queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotSlug: string }> }
) {
  try {
    const { chatbotSlug } = await params;

    if (!chatbotSlug) {
      return new Response('Chatbot slug is required', { status: 400 });
    }

    console.log(`[ContentSources API] Fetching content sources for chatbot: ${chatbotSlug}`);

    // Get all content sources for this chatbot
    const contentSources = await getContentSourcesBySlug(chatbotSlug);

    console.log(`[ContentSources API] Found ${contentSources.length} content sources for chatbot: ${chatbotSlug}`);

    return Response.json({
      success: true,
      data: contentSources,
      count: contentSources.length
    });

  } catch (error: any) {
    console.error('[ContentSources API] Error fetching content sources:', error);
    
    if (error.message === 'Chatbot not found') {
      return new Response('Chatbot not found', { status: 404 });
    }

    return new Response('Internal server error', { status: 500 });
  }
} 