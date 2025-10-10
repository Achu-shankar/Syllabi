-- Fix task type constraint to include Google Drive task types
-- This migration ensures the task_type_enum includes all Google Drive task types

-- Add Google Drive task types if they don't exist
DO $$ BEGIN
    -- Add GOOGLE_DRIVE_PROCESSING if it doesn't exist
    BEGIN
        ALTER TYPE task_type_enum ADD VALUE 'GOOGLE_DRIVE_PROCESSING';
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;
    
    -- Add GOOGLE_DRIVE_INDEXING if it doesn't exist  
    BEGIN
        ALTER TYPE task_type_enum ADD VALUE 'GOOGLE_DRIVE_INDEXING';
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;
END $$;

-- Drop and recreate the constraint if it exists
DO $$ BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_task_type_check' 
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE public.tasks DROP CONSTRAINT tasks_task_type_check;
    END IF;
    
    -- Recreate the constraint with all current enum values (using text comparison)
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_task_type_check 
    CHECK (task_type::text = ANY(ARRAY[
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
    ]));
END $$;

-- Notification
DO $$
BEGIN
    RAISE NOTICE 'Task type constraint updated to include Google Drive task types';
END $$;