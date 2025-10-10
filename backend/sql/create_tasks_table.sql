-- Create tasks table for background task management
-- This table stores information about asynchronous tasks like document processing, indexing, etc.

-- Drop table if it exists (for development/testing - remove in production)
DROP TABLE IF EXISTS public.tasks;

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_identifier UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    chatbot_id UUID NOT NULL,
    reference_id UUID NULL,
    task_type TEXT NOT NULL CHECK (task_type IN (
        'DOCUMENT_PROCESSING',
        'METADATA_EXTRACTION', 
        'CONTENT_INDEXING',
        'URL_PROCESSING',
        'DOI_CITATION_FETCH',
        'PDF_GENERATION_FROM_URL',
        'DOCUMENT_INDEXING'
    )),
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN (
        'PENDING',
        'QUEUED', 
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'CANCELLED'
    )),
    current_step_description TEXT NULL,
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    input_payload JSONB NULL,
    result_payload JSONB NULL,
    error_details TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_task_identifier ON public.tasks(task_identifier);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_chatbot_id ON public.tasks(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reference_id ON public.tasks(reference_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON public.tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_chatbot_created ON public.tasks(user_id, chatbot_id, created_at DESC);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies if needed
-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tasks
CREATE POLICY "Users can view their own tasks" ON public.tasks
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can only insert their own tasks  
CREATE POLICY "Users can insert their own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can only update their own tasks
CREATE POLICY "Users can update their own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: Users can only delete their own tasks
CREATE POLICY "Users can delete their own tasks" ON public.tasks
    FOR DELETE USING (auth.uid()::text = user_id);

-- Grant necessary permissions (adjust as needed for your setup)
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

-- Add comments for documentation
COMMENT ON TABLE public.tasks IS 'Stores background task information for document processing, indexing, and other async operations';
COMMENT ON COLUMN public.tasks.task_identifier IS 'Unique identifier for tracking task progress via API';
COMMENT ON COLUMN public.tasks.user_id IS 'ID of the user who initiated the task';
COMMENT ON COLUMN public.tasks.chatbot_id IS 'ID of the chatbot this task belongs to';
COMMENT ON COLUMN public.tasks.reference_id IS 'Optional reference to a content source record';
COMMENT ON COLUMN public.tasks.task_type IS 'Type of background task being performed';
COMMENT ON COLUMN public.tasks.status IS 'Current status of the task execution';
COMMENT ON COLUMN public.tasks.progress_percentage IS 'Task completion percentage (0-100)';
COMMENT ON COLUMN public.tasks.input_payload IS 'JSON data passed to the task';
COMMENT ON COLUMN public.tasks.result_payload IS 'JSON result data from completed task';
COMMENT ON COLUMN public.tasks.error_details IS 'Error message if task failed'; 