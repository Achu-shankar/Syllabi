import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'];
const BUCKET_NAME = 'chatbot-assets';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Upload_Asset Auth Error:', authError);
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: `File too large. Max size: ${MAX_FILE_SIZE_MB}MB` },
        { status: 400 }
      );
    }

    // Generate a unique file name to prevent overwrites and ensure clean paths
    const fileExtension = file.name.split('.').pop() || 'png';
    // Using user ID for organization and a timestamp + random number for uniqueness.
    // Consider using UUID for more robust uniqueness in production.
    const uniqueFileName = `${user.id}/${Date.now()}_${Math.floor(Math.random() * 10000)}.${fileExtension}`;
    const filePath = `public/${uniqueFileName}`; // Path within the bucket, e.g. public/user_id/timestamp_rand.png

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600', // Optional: cache for 1 hour
        upsert: false, // Important: don't upsert, rely on unique name
      });

    if (uploadError) {
      console.error('Supabase Upload Error:', uploadError);
      return NextResponse.json({ success: false, error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error('Failed to get public URL for:', filePath);
      // Attempt to clean up the uploaded file if URL retrieval fails an asset is unusable
      await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      return NextResponse.json({ success: false, error: 'File uploaded but failed to get public URL.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: publicUrlData.publicUrl }, { status: 200 });

  } catch (error) {
    console.error('Upload_Asset General Error:', error);
    // Check if error is an instance of Error to access message property safely
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
} 