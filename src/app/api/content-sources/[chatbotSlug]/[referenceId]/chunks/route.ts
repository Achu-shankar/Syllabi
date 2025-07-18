import { NextRequest } from 'next/server';
import { 
  getDocumentChunksBySlugAndReference, 
  getDocumentChunksByIds 
} from '@/app/chat/[chatbotId]/lib/db/content_queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotSlug: string; referenceId: string }> }
) {
  try {
    const { chatbotSlug, referenceId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const pageNumber = searchParams.get('page');
    const chunkIdsParam = searchParams.get('chunkIds'); // Comma-separated chunk IDs
    
    if (!chatbotSlug || !referenceId) {
      return new Response('Chatbot slug and reference ID are required', { status: 400 });
    }

    console.log(`[Document Chunks API] Fetching chunks for chatbot: ${chatbotSlug}, reference: ${referenceId}`, {
      pageNumber,
      chunkIdsParam
    });

    let chunks;

    // If specific chunk IDs are requested, fetch those chunks
    if (chunkIdsParam) {
      const chunkIds = chunkIdsParam.split(',').map(id => id.trim()).filter(id => id.length > 0);
      
      if (chunkIds.length === 0) {
        return new Response('Invalid chunk IDs provided', { status: 400 });
      }

      console.log(`[Document Chunks API] Fetching specific chunks:`, chunkIds);
      chunks = await getDocumentChunksByIds(chunkIds);
      
      // Filter chunks to ensure they belong to the specified reference and chatbot
      // This is a security measure to prevent accessing chunks from other documents
      chunks = chunks.filter(chunk => chunk.reference_id === referenceId);
      
    } else {
      // Fetch all chunks for the reference, optionally filtered by page
      const page = pageNumber ? parseInt(pageNumber, 10) : undefined;
      
      if (pageNumber && (isNaN(page!) || page! < 1)) {
        return new Response('Invalid page number', { status: 400 });
      }

      console.log(`[Document Chunks API] Fetching chunks for reference: ${referenceId}${page ? `, page: ${page}` : ''}`);
      chunks = await getDocumentChunksBySlugAndReference(chatbotSlug, referenceId, page);
    }

    console.log(`[Document Chunks API] Found ${chunks.length} chunks for chatbot: ${chatbotSlug}, reference: ${referenceId}`);

    // Transform the response to include only necessary fields for the frontend
    const transformedChunks = chunks.map(chunk => ({
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

    return Response.json({
      success: true,
      data: transformedChunks,
      count: transformedChunks.length,
      filters: {
        chatbot_slug: chatbotSlug,
        reference_id: referenceId,
        ...(pageNumber && { page_number: parseInt(pageNumber, 10) }),
        ...(chunkIdsParam && { chunk_ids: chunkIdsParam.split(',').map(id => id.trim()) })
      }
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
      }
    });

  } catch (error: any) {
    console.error('[Document Chunks API] Error fetching chunks:', error);
    
    if (error.message === 'Chatbot not found') {
      return new Response('Chatbot not found', { status: 404 });
    }

    if (error.message.includes('Failed to fetch document chunks')) {
      return new Response('Failed to fetch document chunks', { status: 500 });
    }

    return new Response('Internal server error', { status: 500 });
  }
} 