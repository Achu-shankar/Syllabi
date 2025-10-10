-- Migration: Add multimedia support with content types
-- File: 20250101000000_add_multimedia_support.sql
-- Description: Adds support for video/audio content with timestamps and enhanced RAG search

-- ============================================================================
-- 1. ADD NEW COLUMNS TO document_chunks TABLE
-- ============================================================================

-- Add content type field (document, url, video, audio)
ALTER TABLE "public"."document_chunks" 
ADD COLUMN "content_type" text NOT NULL DEFAULT 'document';

-- Add multimedia-specific fields
ALTER TABLE "public"."document_chunks" 
ADD COLUMN "start_time_seconds" integer;

ALTER TABLE "public"."document_chunks" 
ADD COLUMN "end_time_seconds" integer;

ALTER TABLE "public"."document_chunks" 
ADD COLUMN "speaker" text;

ALTER TABLE "public"."document_chunks" 
ADD COLUMN "confidence_score" float;

ALTER TABLE "public"."document_chunks" 
ADD COLUMN "chunk_type" text;

-- ============================================================================
-- 2. ADD CONSTRAINTS
-- ============================================================================

-- Content type constraint
ALTER TABLE "public"."document_chunks" 
ADD CONSTRAINT "document_chunks_content_type_check" 
CHECK ((content_type = ANY (ARRAY[
  'document'::text,
  'url'::text, 
  'video'::text,
  'audio'::text
])));

-- Time fields required for video/audio content
ALTER TABLE "public"."document_chunks" 
ADD CONSTRAINT "multimedia_time_fields_check" 
CHECK ((
  (content_type IN ('document', 'url')) OR
  (content_type IN ('video', 'audio') AND start_time_seconds IS NOT NULL AND end_time_seconds IS NOT NULL)
));

-- Chunk type constraint
ALTER TABLE "public"."document_chunks" 
ADD CONSTRAINT "chunk_type_check" 
CHECK ((chunk_type = ANY (ARRAY[
  'page_text'::text,           -- Traditional document chunks
  'transcript'::text,          -- Video/audio transcript
  'frame_description'::text,   -- Video frame descriptions
  'audio_segment'::text,       -- Pure audio content
  'web_content'::text          -- URL/web page content
])));

-- Confidence score should be between 0 and 1
ALTER TABLE "public"."document_chunks" 
ADD CONSTRAINT "confidence_score_check" 
CHECK ((confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)));

-- Time fields should be logical (end >= start)
ALTER TABLE "public"."document_chunks" 
ADD CONSTRAINT "time_fields_logical_check" 
CHECK ((
  start_time_seconds IS NULL OR 
  end_time_seconds IS NULL OR 
  end_time_seconds >= start_time_seconds
));

-- ============================================================================
-- 3. ADD PERFORMANCE INDEXES
-- ============================================================================

-- Index for content type filtering
CREATE INDEX "idx_chunks_content_type" 
ON "public"."document_chunks" ("content_type");

-- Index for multimedia time-based queries
CREATE INDEX "idx_chunks_multimedia_time" 
ON "public"."document_chunks" ("reference_id", "start_time_seconds", "end_time_seconds") 
WHERE ("content_type" IN ('video', 'audio'));

-- Index for chatbot + content type queries (common RAG pattern)
CREATE INDEX "idx_chunks_chatbot_content_type" 
ON "public"."document_chunks" ("chatbot_id", "content_type");

-- Index for speaker-based queries
CREATE INDEX "idx_chunks_speaker" 
ON "public"."document_chunks" ("speaker") 
WHERE ("speaker" IS NOT NULL);

-- Index for chunk type filtering
CREATE INDEX "idx_chunks_chunk_type" 
ON "public"."document_chunks" ("chunk_type") 
WHERE ("chunk_type" IS NOT NULL);

-- ============================================================================
-- 4. UPDATE TASKS TABLE - ADD NEW TASK TYPES
-- ============================================================================

-- Drop existing task type constraint
ALTER TABLE "public"."tasks" 
DROP CONSTRAINT IF EXISTS "tasks_task_type_check";

-- Add new constraint with multimedia task types
ALTER TABLE "public"."tasks" 
ADD CONSTRAINT "tasks_task_type_check" 
CHECK ((task_type = ANY (ARRAY[
  'DOCUMENT_PROCESSING'::text, 
  'METADATA_EXTRACTION'::text, 
  'CONTENT_INDEXING'::text, 
  'URL_PROCESSING'::text, 
  'DOI_CITATION_FETCH'::text, 
  'PDF_GENERATION_FROM_URL'::text, 
  'DOCUMENT_INDEXING'::text,
  'MULTIMEDIA_PROCESSING'::text,    -- NEW: Video/audio file processing
  'MULTIMEDIA_INDEXING'::text       -- NEW: Video/audio content indexing
])));

-- ============================================================================
-- 5. UPDATE EXISTING DATA (SET CONTENT TYPES FOR EXISTING CHUNKS)
-- ============================================================================

-- Update existing chunks to have appropriate content types based on source type
UPDATE "public"."document_chunks" 
SET content_type = CASE 
  WHEN EXISTS (
    SELECT 1 FROM "public"."chatbot_content_sources" ccs 
    WHERE ccs.id = document_chunks.reference_id 
    AND ccs.source_type = 'url'
  ) THEN 'url'
  ELSE 'document'
END,
chunk_type = CASE 
  WHEN EXISTS (
    SELECT 1 FROM "public"."chatbot_content_sources" ccs 
    WHERE ccs.id = document_chunks.reference_id 
    AND ccs.source_type = 'url'
  ) THEN 'web_content'
  ELSE 'page_text'
END
WHERE content_type = 'document'; -- Only update default values

-- ============================================================================
-- 6. CREATE ENHANCED SEARCH FUNCTION
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.match_document_chunks_enhanced;

-- Create enhanced search function with content type filtering
CREATE OR REPLACE FUNCTION public.match_document_chunks_enhanced(
  query_embedding vector, 
  chatbot_id_param uuid, 
  match_threshold double precision DEFAULT 0.7, 
  match_count integer DEFAULT 10,
  content_types text[] DEFAULT ARRAY['document', 'url', 'video', 'audio'],
  max_per_content_type integer DEFAULT NULL
)
RETURNS TABLE(
  chunk_id uuid, 
  reference_id uuid, 
  page_number integer, 
  chunk_text text, 
  token_count integer, 
  similarity double precision, 
  content_type text,
  start_time_seconds integer,
  end_time_seconds integer,
  speaker text,
  chunk_type text,
  confidence_score float,
  created_at timestamp with time zone
)
LANGUAGE sql STABLE
AS $function$
  WITH ranked_chunks AS (
    SELECT
      dc.chunk_id,
      dc.reference_id,
      dc.page_number,
      dc.chunk_text,
      dc.token_count,
      1 - (dc.embedding <=> query_embedding) as similarity,
      dc.content_type,
      dc.start_time_seconds,
      dc.end_time_seconds,
      dc.speaker,
      dc.chunk_type,
      dc.confidence_score,
      dc.created_at,
      ROW_NUMBER() OVER (
        PARTITION BY dc.content_type 
        ORDER BY (dc.embedding <=> query_embedding) ASC
      ) as rn
    FROM document_chunks dc
    WHERE 
      dc.chatbot_id = chatbot_id_param
      AND dc.embedding IS NOT NULL
      AND dc.content_type = ANY(content_types)
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  )
  SELECT 
    rc.chunk_id,
    rc.reference_id,
    rc.page_number,
    rc.chunk_text,
    rc.token_count,
    rc.similarity,
    rc.content_type,
    rc.start_time_seconds,
    rc.end_time_seconds,
    rc.speaker,
    rc.chunk_type,
    rc.confidence_score,
    rc.created_at
  FROM ranked_chunks rc
  WHERE 
    (max_per_content_type IS NULL OR rc.rn <= max_per_content_type)
  ORDER BY rc.similarity DESC
  LIMIT match_count;
$function$;

-- ============================================================================
-- 7. CREATE MULTIMEDIA-SPECIFIC SEARCH FUNCTION
-- ============================================================================

-- Function specifically for searching multimedia content with time ranges
CREATE OR REPLACE FUNCTION public.match_multimedia_chunks_with_time(
  query_embedding vector, 
  chatbot_id_param uuid, 
  reference_id_param uuid DEFAULT NULL,
  match_threshold double precision DEFAULT 0.7, 
  match_count integer DEFAULT 10,
  time_range_start integer DEFAULT NULL,
  time_range_end integer DEFAULT NULL
)
RETURNS TABLE(
  chunk_id uuid, 
  reference_id uuid, 
  chunk_text text, 
  similarity double precision, 
  start_time_seconds integer,
  end_time_seconds integer,
  speaker text,
  chunk_type text,
  confidence_score float
)
LANGUAGE sql STABLE
AS $function$
  SELECT
    dc.chunk_id,
    dc.reference_id,
    dc.chunk_text,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.start_time_seconds,
    dc.end_time_seconds,
    dc.speaker,
    dc.chunk_type,
    dc.confidence_score
  FROM document_chunks dc
  WHERE 
    dc.chatbot_id = chatbot_id_param
    AND dc.content_type IN ('video', 'audio')
    AND dc.embedding IS NOT NULL
    AND (reference_id_param IS NULL OR dc.reference_id = reference_id_param)
    AND (time_range_start IS NULL OR dc.end_time_seconds >= time_range_start)
    AND (time_range_end IS NULL OR dc.start_time_seconds <= time_range_end)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY (dc.embedding <=> query_embedding) ASC
  LIMIT match_count;
$function$;

-- ============================================================================
-- 8. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN "public"."document_chunks"."content_type" IS 'Type of content: document, url, video, or audio';
COMMENT ON COLUMN "public"."document_chunks"."start_time_seconds" IS 'Start timestamp for multimedia content (seconds from beginning)';
COMMENT ON COLUMN "public"."document_chunks"."end_time_seconds" IS 'End timestamp for multimedia content (seconds from beginning)';
COMMENT ON COLUMN "public"."document_chunks"."speaker" IS 'Speaker name for multimedia content (if applicable)';
COMMENT ON COLUMN "public"."document_chunks"."confidence_score" IS 'Confidence score for transcript accuracy (0.0 to 1.0)';
COMMENT ON COLUMN "public"."document_chunks"."chunk_type" IS 'Specific type of chunk: page_text, transcript, frame_description, audio_segment, web_content';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify the migration
SELECT 
  'Migration completed successfully. New columns added:' as status,
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN content_type = 'document' THEN 1 END) as document_chunks,
  COUNT(CASE WHEN content_type = 'url' THEN 1 END) as url_chunks,
  COUNT(CASE WHEN content_type = 'video' THEN 1 END) as video_chunks,
  COUNT(CASE WHEN content_type = 'audio' THEN 1 END) as audio_chunks
FROM "public"."document_chunks"; 