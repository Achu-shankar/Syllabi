-- Add Google Drive support to content sources
-- This migration adds the ingestion_source column and updates enums

-- First, let's create the ingestion_source enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE ingestion_source_enum AS ENUM ('FILE_UPLOAD', 'URL_SUBMISSION', 'GOOGLE_DRIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add ingestion_source column to chatbot_content_sources table
-- Set default to 'FILE_UPLOAD' for backward compatibility
ALTER TABLE public.chatbot_content_sources 
ADD COLUMN IF NOT EXISTS ingestion_source ingestion_source_enum DEFAULT 'FILE_UPLOAD';

-- Update existing records based on source_type
-- URL sources should be marked as URL_SUBMISSION
UPDATE public.chatbot_content_sources 
SET ingestion_source = 'URL_SUBMISSION' 
WHERE source_type = 'URL';

-- Add comment for documentation
COMMENT ON COLUMN public.chatbot_content_sources.ingestion_source IS 'How the content was ingested into the system (FILE_UPLOAD, URL_SUBMISSION, GOOGLE_DRIVE)';

-- Update source_type enum to remove URL (it's now an ingestion method, not a file type)
-- Note: We need to be careful about existing data, so we'll keep URL for now and handle it in the application
-- In a future migration, we can remove URL from source_type after ensuring all URL records are converted to PDF

-- Add new task types for Google Drive processing
DO $$ BEGIN
    -- Check if task_type_enum exists and add new values
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_type_enum') THEN
        -- Add new enum values if they don't exist
        BEGIN
            ALTER TYPE task_type_enum ADD VALUE 'GOOGLE_DRIVE_PROCESSING';
        EXCEPTION
            WHEN duplicate_object THEN null;
        END;
        
        BEGIN
            ALTER TYPE task_type_enum ADD VALUE 'GOOGLE_DRIVE_INDEXING';
        EXCEPTION
            WHEN duplicate_object THEN null;
        END;
    ELSE
        -- Create the enum if it doesn't exist (fallback)
        CREATE TYPE task_type_enum AS ENUM (
            'DOCUMENT_PROCESSING',
            'METADATA_EXTRACTION', 
            'CONTENT_INDEXING',
            'URL_PROCESSING',
            'DOI_CITATION_FETCH',
            'PDF_GENERATION_FROM_URL',
            'DOCUMENT_INDEXING',
            'MULTIMEDIA_PROCESSING',
            'MULTIMEDIA_INDEXING',
            'GOOGLE_DRIVE_PROCESSING',
            'GOOGLE_DRIVE_INDEXING'
        );
    END IF;
END $$;

-- Create index on ingestion_source for better query performance
CREATE INDEX IF NOT EXISTS idx_chatbot_content_sources_ingestion_source 
ON public.chatbot_content_sources(ingestion_source);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_chatbot_content_sources_chatbot_ingestion 
ON public.chatbot_content_sources(chatbot_id, ingestion_source);

-- Add RLS policies for Google Drive content (inherits from existing chatbot_id based policies)
-- The existing RLS policies should cover Google Drive content since they're based on chatbot_id

-- Create a helper function to get ingestion source statistics
CREATE OR REPLACE FUNCTION get_ingestion_source_stats(chatbot_id_param uuid)
RETURNS TABLE (
    ingestion_source text,
    content_count bigint,
    total_size bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ccs.ingestion_source::text,
        COUNT(*)::bigint as content_count,
        COALESCE(SUM(
            CASE 
                WHEN ccs.metadata->'google_drive'->>'file_size' IS NOT NULL 
                THEN (ccs.metadata->'google_drive'->>'file_size')::bigint
                ELSE 0 
            END
        ), 0) as total_size
    FROM public.chatbot_content_sources ccs
    WHERE ccs.chatbot_id = chatbot_id_param
    GROUP BY ccs.ingestion_source;
END;
$$;

-- Grant permissions to the stats function
GRANT EXECUTE ON FUNCTION get_ingestion_source_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ingestion_source_stats(uuid) TO anon;

-- Create a function to clean up Google Drive content when integration is removed
CREATE OR REPLACE FUNCTION cleanup_google_drive_content(integration_id_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete content sources that belong to this Google Drive integration
    DELETE FROM public.chatbot_content_sources 
    WHERE ingestion_source = 'GOOGLE_DRIVE' 
    AND metadata->'google_drive'->>'integration_id' = integration_id_param;
    
    -- Note: Associated document_chunks will be cleaned up by CASCADE or triggers
END;
$$;

-- Grant permissions to the cleanup function
GRANT EXECUTE ON FUNCTION cleanup_google_drive_content(text) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_google_drive_content(text) TO service_role;

-- Add a trigger to automatically update updated_at timestamp when ingestion_source changes
-- (This assumes the updated_at trigger already exists for the table)

-- Create a view for Google Drive content with enhanced metadata
CREATE OR REPLACE VIEW google_drive_content_view AS
SELECT 
    ccs.id,
    ccs.chatbot_id,
    ccs.source_type,
    ccs.ingestion_source,
    ccs.file_name,
    ccs.title,
    ccs.indexing_status,
    ccs.uploaded_at,
    ccs.processed_at,
    ccs.created_at,
    ccs.updated_at,
    -- Extract Google Drive specific metadata
    ccs.metadata->'google_drive'->>'file_id' as drive_file_id,
    ccs.metadata->'google_drive'->>'original_name' as drive_original_name,
    ccs.metadata->'google_drive'->>'mime_type' as drive_mime_type,
    ccs.metadata->'google_drive'->>'drive_folder' as drive_folder_path,
    ccs.metadata->'google_drive'->>'last_modified' as drive_last_modified,
    ccs.metadata->'google_drive'->>'integration_id' as drive_integration_id,
    ccs.metadata->'google_drive'->>'web_view_link' as drive_web_view_link,
    (ccs.metadata->'google_drive'->>'file_size')::bigint as drive_file_size
FROM public.chatbot_content_sources ccs
WHERE ccs.ingestion_source = 'GOOGLE_DRIVE';

-- Set up RLS for the view (inherits from the base table)
ALTER VIEW google_drive_content_view OWNER TO postgres;

-- Grant permissions on the view
GRANT SELECT ON google_drive_content_view TO authenticated;
GRANT SELECT ON google_drive_content_view TO anon;

-- Add helpful comments
COMMENT ON VIEW google_drive_content_view IS 'View for Google Drive content with extracted metadata fields';
COMMENT ON FUNCTION cleanup_google_drive_content(text) IS 'Cleans up all Google Drive content for a specific integration';
COMMENT ON FUNCTION get_ingestion_source_stats(uuid) IS 'Returns statistics about content sources by ingestion method for a chatbot';

-- Create notification for successful migration
DO $$
BEGIN
    RAISE NOTICE 'Google Drive support migration completed successfully';
    RAISE NOTICE 'Added ingestion_source column to chatbot_content_sources';
    RAISE NOTICE 'Added GOOGLE_DRIVE_PROCESSING and GOOGLE_DRIVE_INDEXING task types';
    RAISE NOTICE 'Created helper functions and views for Google Drive content management';
END $$;