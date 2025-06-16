import { NextRequest } from 'next/server';
import { 
  getDocumentChunksByIds,
  getChatbotBySlug 
} from '@/app/chat/[chatbotId]/lib/db/content_queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotSlug: string }> }
) {
  try {
    const { chatbotSlug } = await params;
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const chunkIdsParam = searchParams.get('chunkIds'); // Comma-separated chunk IDs (required)
    
    if (!chatbotSlug) {
      return new Response('Chatbot slug is required', { status: 400 });
    }

    if (!chunkIdsParam) {
      return new Response('Chunk IDs parameter is required', { status: 400 });
    }

    // Parse chunk IDs
    const chunkIds = chunkIdsParam.split(',').map(id => id.trim()).filter(id => id.length > 0);
    
    if (chunkIds.length === 0) {
      return new Response('At least one valid chunk ID is required', { status: 400 });
    }

    if (chunkIds.length > 50) {
      return new Response('Too many chunk IDs requested (max 50)', { status: 400 });
    }

    console.log(`[Chunks API] Fetching ${chunkIds.length} chunks for chatbot: ${chatbotSlug}`, chunkIds);

    // Validate chatbot exists (for security)
    const chatbot = await getChatbotBySlug(chatbotSlug);
    if (!chatbot) {
      return new Response('Chatbot not found', { status: 404 });
    }

    // Fetch the chunks
    const chunks = await getDocumentChunksByIds(chunkIds);

    // Security: Filter chunks to ensure they belong to this chatbot
    const validChunks = chunks.filter(chunk => chunk.chatbot_id === chatbot.id);

    console.log(`[Chunks API] Found ${validChunks.length} valid chunks out of ${chunkIds.length} requested for chatbot: ${chatbotSlug}`);

    // Transform the response to include only necessary fields for the frontend
    const transformedChunks = validChunks.map(chunk => ({
      chunk_id: chunk.chunk_id,
      reference_id: chunk.reference_id,
      page_number: chunk.page_number,
      chunk_text: chunk.chunk_text,
      constituent_elements_data: chunk.constituent_elements_data, // Contains coordinate data
      content_type: chunk.content_type,
      chunk_type: chunk.chunk_type,
      // Include multimedia fields if present
      ...(chunk.start_time_seconds !== null && { start_time_seconds: chunk.start_time_seconds }),
      ...(chunk.end_time_seconds !== null && { end_time_seconds: chunk.end_time_seconds }),
      ...(chunk.speaker && { speaker: chunk.speaker }),
      ...(chunk.confidence_score !== null && { confidence_score: chunk.confidence_score }),
    }));

    // Group chunks by reference_id for easier frontend processing
    const chunksByReference = transformedChunks.reduce((acc, chunk) => {
      if (!acc[chunk.reference_id]) {
        acc[chunk.reference_id] = [];
      }
      acc[chunk.reference_id].push(chunk);
      return acc;
    }, {} as Record<string, typeof transformedChunks>);

    return Response.json({
      success: true,
      data: transformedChunks,
      count: transformedChunks.length,
      chunks_by_reference: chunksByReference,
      requested_count: chunkIds.length,
      found_count: validChunks.length,
      filters: {
        chatbot_slug: chatbotSlug,
        chunk_ids: chunkIds
      }
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
      }
    });

  } catch (error: any) {
    console.error('[Chunks API] Error fetching chunks:', error);
    
    if (error.message === 'Chatbot not found') {
      return new Response('Chatbot not found', { status: 404 });
    }

    if (error.message.includes('Failed to fetch document chunks')) {
      return new Response('Failed to fetch document chunks', { status: 500 });
    }

    return new Response('Internal server error', { status: 500 });
  }
} 