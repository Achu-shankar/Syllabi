import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid'; // For more robust unique names

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
// Looser validation for fetched images initially, can be tightened
const ALLOWED_FETCHED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']; 
const BUCKET_NAME = 'chatbot-assets';

async function streamToArrayBuffer(readableStream: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
  const reader = readableStream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  let totalLength = 0;
  chunks.forEach(chunk => totalLength += chunk.length);
  const arrayBuffer = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach(chunk => {
    arrayBuffer.set(chunk, offset);
    offset += chunk.length;
  });
  return arrayBuffer.buffer;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const externalUrl = body.externalUrl as string;

    if (!externalUrl) {
      return NextResponse.json({ success: false, error: 'No external URL provided.' }, { status: 400 });
    }

    let fetchedResponse;
    try {
      fetchedResponse = await fetch(externalUrl);
      if (!fetchedResponse.ok) {
        throw new Error(`Failed to fetch image: ${fetchedResponse.status} ${fetchedResponse.statusText}`);
      }
    } catch (fetchErr: any) {
      console.error("Error fetching external image:", fetchErr);
      return NextResponse.json({ success: false, error: `Failed to download image from URL: ${fetchErr.message || 'Network error'}` }, { status: 400 });
    }

    const contentType = fetchedResponse.headers.get('content-type');
    const contentLength = fetchedResponse.headers.get('content-length');

    if (!contentType || !ALLOWED_FETCHED_IMAGE_TYPES.some(type => contentType.startsWith(type))) {
      return NextResponse.json({ success: false, error: 'Invalid image type from URL.' }, { status: 400 });
    }

    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: `Image from URL is too large. Max size: ${MAX_FILE_SIZE_MB}MB` }, { status: 400 });
    }

    if (!fetchedResponse.body) {
        return NextResponse.json({ success: false, error: 'Image body is not readable.'}, { status: 500 });
    }
    
    const imageBuffer = await streamToArrayBuffer(fetchedResponse.body);

    if (imageBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
         return NextResponse.json({ success: false, error: `Fetched image data exceeds max size: ${MAX_FILE_SIZE_MB}MB` }, { status: 400 });
    }

    const fileExtension = contentType.split('/')[1]?.split('+')[0] || 'png'; // e.g. png, jpeg, svg
    const uniqueFileName = `${user.id}/${uuidv4()}.${fileExtension}`;
    const filePath = `public/${uniqueFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, imageBuffer, { // Upload ArrayBuffer
        contentType: contentType, // Pass original content type
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase Upload Error (from URL import):', uploadError);
      return NextResponse.json({ success: false, error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      console.error('Failed to get public URL for imported image:', filePath);
      await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      return NextResponse.json({ success: false, error: 'File imported but failed to get public URL.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: publicUrlData.publicUrl }, { status: 200 });

  } catch (error: any) {
    console.error('Import_Image General Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
} 