import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getContentSourceById } from '@/app/chat/[chatbotId]/lib/db/content_queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotSlug: string; referenceId: string }> }
) {
  try {
    const { referenceId } = await params;
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');

    if (!referenceId) {
      return new Response('Reference ID is required', { status: 400 });
    }

    console.log(`[Content View API] Generating signed URL for content: ${referenceId}`);

    // Get the content source to verify it exists and get storage path
    const contentSource = await getContentSourceById(referenceId);
    
    if (!contentSource) {
      console.error(`[Content View API] Content not found for ID: ${referenceId}`);
      return new Response('Content not found', { status: 404 });
    }

    console.log(`[Content View API] Found content:`, {
      id: contentSource.id,
      fileName: contentSource.file_name,
      storagePath: contentSource.storage_path,
      sourceType: contentSource.source_type,
      indexingStatus: contentSource.indexing_status
    });

    // Check if content has a storage path (required for viewing)
    if (!contentSource.storage_path) {
      console.error(`[Content View API] Content has no storage path: ${referenceId}`);
      return new Response('Content has no storage path', { status: 400 });
    }

    // Determine storage bucket based on content type
    const storageBucket = 'documents'; // All content types use the documents bucket
    const sourceType = contentSource.source_type?.toLowerCase();
    
    // Note: Based on the backend implementation, all files (documents, URLs, and multimedia)
    // are stored in the 'documents' bucket in Supabase

    // Create Supabase client and generate signed URL
    const supabase = await createClient();
    
    console.log(`[Content View API] Generating signed URL for storage path: ${contentSource.storage_path} in bucket: ${storageBucket}`);
    
    const { data: signedUrlData, error } = await supabase.storage
      .from(storageBucket)
      .createSignedUrl(contentSource.storage_path, 3600); // 1 hour expiry

    if (error) {
      console.error('[Content View API] Error generating signed URL:', error);
      return new Response('Failed to generate signed URL', { status: 500 });
    }

    if (!signedUrlData?.signedUrl) {
      console.error('[Content View API] No signed URL returned from Supabase');
      return new Response('Failed to generate signed URL', { status: 500 });
    }

    let finalUrl = signedUrlData.signedUrl;
    
    // Add page fragment if specified (only for PDF documents)
    if ((sourceType === 'document' || sourceType === 'url') && page && !isNaN(parseInt(page))) {
      finalUrl += `#page=${page}`;
    }

    console.log(`[Content View API] Successfully generated signed URL for content: ${referenceId}${page ? ` (page ${page})` : ''}`);

    return Response.json({
      success: true,
      url: finalUrl,
      fileName: contentSource.file_name,
      contentType: sourceType,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
      }
    });

  } catch (error: any) {
    console.error('[Content View API] Error:', error);
    
    if (error.message === 'Content not found') {
      return new Response('Content not found', { status: 404 });
    }

    return new Response('Internal server error', { status: 500 });
  }
} 