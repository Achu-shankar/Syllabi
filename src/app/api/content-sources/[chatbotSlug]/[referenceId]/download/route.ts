import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getContentSourceById } from '@/app/chat/[chatbotId]/lib/db/content_queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotSlug: string; referenceId: string }> }
) {
  try {
    const { referenceId } = await params;

    if (!referenceId) {
      return new Response('Reference ID is required', { status: 400 });
    }

    console.log(`[Download API] Generating download URL for content: ${referenceId}`);

    // Get the content source to verify it exists and get storage path
    const contentSource = await getContentSourceById(referenceId);
    
    if (!contentSource) {
      console.error(`[Download API] Content not found for ID: ${referenceId}`);
      return new Response('Content not found', { status: 404 });
    }

    console.log(`[Download API] Found content:`, {
      id: contentSource.id,
      fileName: contentSource.file_name,
      storagePath: contentSource.storage_path,
      sourceType: contentSource.source_type,
    });

    // Check if content has a storage path (required for download)
    if (!contentSource.storage_path) {
      console.error(`[Download API] Content has no storage path: ${referenceId}`);
      return new Response('Content has no storage path', { status: 400 });
    }

    // All content types with storage paths can be downloaded (documents, URLs converted to PDF, multimedia)
    // URLs are converted to PDFs during processing, so they have downloadable files

    // Create Supabase client and generate signed URL for download
    const supabase = await createClient();
    
    console.log(`[Download API] Generating download URL for storage path: ${contentSource.storage_path}`);
    
    const { data: signedUrlData, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(contentSource.storage_path, 3600, {
        download: true // This sets the Content-Disposition header for download
      });

    if (error) {
      console.error('[Download API] Error generating signed URL:', error);
      return new Response('Failed to generate download URL', { status: 500 });
    }

    if (!signedUrlData?.signedUrl) {
      console.error('[Download API] No signed URL returned from Supabase');
      return new Response('Failed to generate download URL', { status: 500 });
    }

    console.log(`[Download API] Successfully generated download URL for content: ${referenceId}`);

    return Response.json({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      fileName: contentSource.file_name || 'download',
      contentType: contentSource.source_type,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
      }
    });

  } catch (error: any) {
    console.error('[Download API] Error:', error);
    
    if (error.message === 'Content not found') {
      return new Response('Content not found', { status: 404 });
    }

    return new Response('Internal server error', { status: 500 });
  }
} 