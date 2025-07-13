alter table "public"."tasks" drop constraint "tasks_task_type_check";

alter table "public"."document_chunks" add column "chunk_type" text;

alter table "public"."document_chunks" add column "confidence_score" double precision;

alter table "public"."document_chunks" add column "content_type" text not null default 'document'::text;

alter table "public"."document_chunks" add column "end_time_seconds" integer;

alter table "public"."document_chunks" add column "speaker" text;

alter table "public"."document_chunks" add column "start_time_seconds" integer;

CREATE INDEX idx_chunks_chatbot_content_type ON public.document_chunks USING btree (chatbot_id, content_type);

CREATE INDEX idx_chunks_chunk_type ON public.document_chunks USING btree (chunk_type) WHERE (chunk_type IS NOT NULL);

CREATE INDEX idx_chunks_content_type ON public.document_chunks USING btree (content_type);

CREATE INDEX idx_chunks_multimedia_time ON public.document_chunks USING btree (reference_id, start_time_seconds, end_time_seconds) WHERE (content_type = ANY (ARRAY['video'::text, 'audio'::text]));

CREATE INDEX idx_chunks_speaker ON public.document_chunks USING btree (speaker) WHERE (speaker IS NOT NULL);

alter table "public"."document_chunks" add constraint "chunk_type_check" CHECK ((chunk_type = ANY (ARRAY['page_text'::text, 'transcript'::text, 'frame_description'::text, 'audio_segment'::text, 'web_content'::text]))) not valid;

alter table "public"."document_chunks" validate constraint "chunk_type_check";

alter table "public"."document_chunks" add constraint "confidence_score_check" CHECK (((confidence_score IS NULL) OR ((confidence_score >= (0)::double precision) AND (confidence_score <= (1)::double precision)))) not valid;

alter table "public"."document_chunks" validate constraint "confidence_score_check";

alter table "public"."document_chunks" add constraint "document_chunks_content_type_check" CHECK ((content_type = ANY (ARRAY['document'::text, 'url'::text, 'video'::text, 'audio'::text]))) not valid;

alter table "public"."document_chunks" validate constraint "document_chunks_content_type_check";

alter table "public"."document_chunks" add constraint "multimedia_time_fields_check" CHECK (((content_type = ANY (ARRAY['document'::text, 'url'::text])) OR ((content_type = ANY (ARRAY['video'::text, 'audio'::text])) AND (start_time_seconds IS NOT NULL) AND (end_time_seconds IS NOT NULL)))) not valid;

alter table "public"."document_chunks" validate constraint "multimedia_time_fields_check";

alter table "public"."document_chunks" add constraint "time_fields_logical_check" CHECK (((start_time_seconds IS NULL) OR (end_time_seconds IS NULL) OR (end_time_seconds >= start_time_seconds))) not valid;

alter table "public"."document_chunks" validate constraint "time_fields_logical_check";

alter table "public"."tasks" add constraint "tasks_task_type_check" CHECK ((task_type = ANY (ARRAY['DOCUMENT_PROCESSING'::text, 'METADATA_EXTRACTION'::text, 'CONTENT_INDEXING'::text, 'URL_PROCESSING'::text, 'DOI_CITATION_FETCH'::text, 'PDF_GENERATION_FROM_URL'::text, 'DOCUMENT_INDEXING'::text, 'MULTIMEDIA_PROCESSING'::text, 'MULTIMEDIA_INDEXING'::text]))) not valid;

alter table "public"."tasks" validate constraint "tasks_task_type_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.match_document_chunks_enhanced(query_embedding vector, chatbot_id_param uuid, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10, content_types text[] DEFAULT ARRAY['document'::text, 'url'::text, 'video'::text, 'audio'::text], max_per_content_type integer DEFAULT NULL::integer)
 RETURNS TABLE(chunk_id uuid, reference_id uuid, page_number integer, chunk_text text, token_count integer, similarity double precision, content_type text, start_time_seconds integer, end_time_seconds integer, speaker text, chunk_type text, confidence_score double precision, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE
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
$function$
;

CREATE OR REPLACE FUNCTION public.match_multimedia_chunks_with_time(query_embedding vector, chatbot_id_param uuid, reference_id_param uuid DEFAULT NULL::uuid, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10, time_range_start integer DEFAULT NULL::integer, time_range_end integer DEFAULT NULL::integer)
 RETURNS TABLE(chunk_id uuid, reference_id uuid, chunk_text text, similarity double precision, start_time_seconds integer, end_time_seconds integer, speaker text, chunk_type text, confidence_score double precision)
 LANGUAGE sql
 STABLE
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
$function$
;

create policy "Chatbot owners can view all sessions for their chatbots"
on "public"."chat_sessions"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM chatbots
  WHERE ((chatbots.id = chat_sessions.chatbot_id) AND (chatbots.user_id = auth.uid())))));


create policy "Chatbot owners can view all messages for their chatbots"
on "public"."messages"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (chatbots
     JOIN chat_sessions ON ((chatbots.id = chat_sessions.chatbot_id)))
  WHERE ((chat_sessions.id = messages.chat_session_id) AND (chatbots.user_id = auth.uid())))));



