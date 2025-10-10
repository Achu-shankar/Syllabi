-- ================================================
-- Document Chunks Table Creation Script
-- ================================================
-- This script creates the document_chunks table for storing text chunks
-- generated from processed documents with their embeddings for vector search

-- ================================================
-- 0. UTILITY FUNCTIONS
-- ================================================

-- Create or replace the update_modified_column function
-- This function automatically updates the updated_at column when a row is modified
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ================================================
-- 1. DOCUMENT_CHUNKS TABLE
-- ================================================
-- Stores chunked text content from documents with embeddings for similarity search

CREATE TABLE IF NOT EXISTS public.document_chunks (
    chunk_id UUID NOT NULL DEFAULT gen_random_uuid(),
    reference_id UUID NOT NULL,
    user_id UUID NULL,
    chatbot_id UUID NULL, -- Changed from project_id to chatbot_id
    page_number INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    token_count INTEGER NOT NULL,
    embedding VECTOR(1536) NULL, -- OpenAI text-embedding-ada-002 dimensions
    constituent_elements_data JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT document_chunks_pkey PRIMARY KEY (chunk_id),
    CONSTRAINT document_chunks_chatbot_id_fkey FOREIGN KEY (chatbot_id) REFERENCES chatbots (id) ON DELETE CASCADE,
    CONSTRAINT document_chunks_reference_id_fkey FOREIGN KEY (reference_id) REFERENCES chatbot_content_sources (id) ON DELETE CASCADE,
    CONSTRAINT document_chunks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Add comments for documentation
COMMENT ON TABLE public.document_chunks IS 'Stores chunked text content from processed documents with embeddings for vector similarity search';
COMMENT ON COLUMN public.document_chunks.chunk_id IS 'Unique identifier for the text chunk';
COMMENT ON COLUMN public.document_chunks.reference_id IS 'Reference to the content source this chunk belongs to';
COMMENT ON COLUMN public.document_chunks.user_id IS 'Reference to the user who owns this content';
COMMENT ON COLUMN public.document_chunks.chatbot_id IS 'Reference to the chatbot this chunk belongs to';
COMMENT ON COLUMN public.document_chunks.page_number IS 'Page number in the original document where this chunk originated';
COMMENT ON COLUMN public.document_chunks.chunk_text IS 'The actual text content of the chunk used for embeddings';
COMMENT ON COLUMN public.document_chunks.token_count IS 'Number of tokens in the chunk text';
COMMENT ON COLUMN public.document_chunks.embedding IS 'Vector embedding of the chunk text for similarity search (1536 dimensions for OpenAI ada-002)';
COMMENT ON COLUMN public.document_chunks.constituent_elements_data IS 'JSON data containing original parsed elements that make up this chunk';
COMMENT ON COLUMN public.document_chunks.created_at IS 'Timestamp when the chunk was created';
COMMENT ON COLUMN public.document_chunks.updated_at IS 'Timestamp when the chunk was last updated';

-- ================================================
-- 2. INDEXES FOR PERFORMANCE
-- ================================================

-- Vector similarity search index (HNSW for pgvector)
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON public.document_chunks 
USING hnsw (embedding vector_ip_ops) 
TABLESPACE pg_default;

-- Foreign key indexes for fast lookups
CREATE INDEX IF NOT EXISTS document_chunks_reference_id_idx 
ON public.document_chunks 
USING btree (reference_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS document_chunks_user_id_idx 
ON public.document_chunks 
USING btree (user_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS document_chunks_chatbot_id_idx 
ON public.document_chunks 
USING btree (chatbot_id) 
TABLESPACE pg_default;

-- Composite index for user + chatbot queries
CREATE INDEX IF NOT EXISTS document_chunks_user_chatbot_idx 
ON public.document_chunks 
USING btree (user_id, chatbot_id) 
TABLESPACE pg_default;

-- Time-based index for sorting by creation time
CREATE INDEX IF NOT EXISTS document_chunks_created_at_idx 
ON public.document_chunks 
USING btree (created_at DESC) 
TABLESPACE pg_default;

-- ================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS on the table
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access chunks for their own chatbots
CREATE POLICY "Allow access to chunks for own chatbots"
ON public.document_chunks
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM chatbots cb 
        WHERE cb.id = document_chunks.chatbot_id 
        AND cb.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM chatbots cb 
        WHERE cb.id = document_chunks.chatbot_id 
        AND cb.user_id = auth.uid()
    )
);

-- ================================================
-- 4. TRIGGERS
-- ================================================

-- Trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_document_chunks_modtime 
BEFORE UPDATE ON public.document_chunks 
FOR EACH ROW 
EXECUTE FUNCTION update_modified_column();

-- ================================================
-- 5. ADDITIONAL NOTES
-- ================================================
-- 
-- Prerequisites:
-- 1. pgvector extension must be installed: CREATE EXTENSION IF NOT EXISTS vector;
-- 2. auth.users table must exist (part of Supabase Auth)
-- 3. chatbots table must exist
-- 4. chatbot_content_sources table must exist
--
-- Common embedding dimensions:
-- - OpenAI text-embedding-ada-002: 1536 dimensions
-- - OpenAI text-embedding-3-small: 1536 dimensions  
-- - OpenAI text-embedding-3-large: 3072 dimensions
-- - Cohere embed-english-v3.0: 1024 dimensions
-- - Sentence Transformers all-MiniLM-L6-v2: 384 dimensions
--
-- Usage:
-- - This table stores text chunks from documents after they've been processed and converted to PDF
-- - Each chunk has an embedding vector for semantic similarity search
-- - Chunks are linked to content sources (documents/URLs) and belong to specific chatbots
-- - RLS ensures users can only access chunks for their own chatbots