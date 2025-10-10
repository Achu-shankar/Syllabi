import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Allowed file types and their corresponding MIME types
const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  // Documents
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/csv': ['.csv'],
  // Excel files
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
} as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET_NAME = 'chat-files';

/**
 * Validates file type and size
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File size must be less than ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB. Your file is ${Math.round(file.size / (1024 * 1024))}MB.` 
    };
  }

  // Check file type
  if (!Object.keys(ALLOWED_MIME_TYPES).includes(file.type)) {
    const allowedTypes = Object.values(ALLOWED_MIME_TYPES).flat().join(', ');
    return { 
      valid: false, 
      error: `File type '${file.type}' is not supported. Allowed types: ${allowedTypes}` 
    };
  }

  // Check if file has content
  if (file.size === 0) {
    return { 
      valid: false, 
      error: 'File appears to be empty' 
    };
  }

  return { valid: true };
}

/**
 * Sanitizes filename to make it safe for storage
 */
function sanitizeFilename(filename: string): string {
  // Remove any path components and keep only the filename
  const basename = filename.replace(/^.*[\\\/]/, '');
  
  // Replace potentially dangerous characters
  const sanitized = basename
    .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .substring(0, 100); // Limit length
  
  return sanitized || 'unnamed_file';
}

/**
 * Generates a unique file path for storage
 */
function generateFilePath(userId: string, filename: string): string {
  const timestamp = Date.now();
  const uniqueId = crypto.randomUUID().substring(0, 8);
  const sanitizedName = sanitizeFilename(filename);
  
  // Structure: userId/timestamp-uniqueId-filename
  return `${userId}/${timestamp}-${uniqueId}-${sanitizedName}`;
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[File Upload] Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Generate unique file path
    const filePath = generateFilePath(user.id, file.name);
    
    // Convert file to array buffer for upload
    const fileBuffer = await file.arrayBuffer();
    
    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600', // Cache for 1 hour
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error('[File Upload] Storage upload error:', uploadError);
      
      // Handle specific storage errors
      if (uploadError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'A file with this name already exists. Please rename your file.' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error('[File Upload] Failed to get public URL for uploaded file');
      
      // Try to clean up the uploaded file
      await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      
      return NextResponse.json(
        { error: 'Failed to generate file URL' },
        { status: 500 }
      );
    }

    // Record the upload in our tracking table
    const { error: dbError } = await supabase
      .from('chat_file_uploads')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      });

    if (dbError) {
      console.error('[File Upload] Database tracking error:', dbError);
      // Don't fail the upload for tracking errors, just log them
    }

    // Prepare response data
    const responseData = {
      url: urlData.publicUrl,
      name: file.name,
      contentType: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    console.log(`✅ File uploaded successfully: ${file.name} (${file.size} bytes) for user ${user.id}`);
    
    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('[File Upload] Unexpected error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? `Upload failed: ${error.message}` 
          : 'An unexpected error occurred during file upload'
      },
      { status: 500 }
    );
  }
}

// Handle unsupported HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to upload files.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to upload files.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to upload files.' },
    { status: 405 }
  );
}

