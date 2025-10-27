

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";






CREATE TYPE "public"."chatbot_role" AS ENUM (
    'editor',
    'viewer'
);


ALTER TYPE "public"."chatbot_role" OWNER TO "postgres";


CREATE TYPE "public"."chatbot_visibility" AS ENUM (
    'private',
    'public',
    'shared'
);


ALTER TYPE "public"."chatbot_visibility" OWNER TO "postgres";


CREATE TYPE "public"."ingestion_source_enum" AS ENUM (
    'FILE_UPLOAD',
    'URL_SUBMISSION',
    'GOOGLE_DRIVE',
    'NOTION'
);


ALTER TYPE "public"."ingestion_source_enum" OWNER TO "postgres";


CREATE TYPE "public"."task_type_enum" AS ENUM (
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


ALTER TYPE "public"."task_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_oauth_codes"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM oauth_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_oauth_codes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_google_drive_content"("integration_id_param" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Delete content sources that belong to this Google Drive integration
    DELETE FROM public.chatbot_content_sources 
    WHERE ingestion_source = 'GOOGLE_DRIVE' 
    AND metadata->'google_drive'->>'integration_id' = integration_id_param;
    
    -- Note: Associated document_chunks will be cleaned up by CASCADE or triggers
END;
$$;


ALTER FUNCTION "public"."cleanup_google_drive_content"("integration_id_param" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_google_drive_content"("integration_id_param" "text") IS 'Cleans up all Google Drive content for a specific integration';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_rate_limits"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM rate_limit_tracking
  WHERE window_start < NOW() - INTERVAL '25 hours';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_rate_limits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_discord_bot_token"("integration_id_in" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    encrypted_token text;
    decrypted_token text;
BEGIN
    -- Get the encrypted bot token
    SELECT credentials->>'bot_token' INTO encrypted_token
    FROM connected_integrations 
    WHERE id = integration_id_in;
    
    IF encrypted_token IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Decrypt using the same key as encryption
    SELECT pgp_sym_decrypt(
        encrypted_token::bytea, 
        '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'
    ) INTO decrypted_token;
    
    RETURN decrypted_token;
END;
$$;


ALTER FUNCTION "public"."decrypt_discord_bot_token"("integration_id_in" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_discord_user_token"("integration_id_in" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    encrypted_token text;
    decrypted_token text;
BEGIN
    -- Get the encrypted user token
    SELECT credentials->>'user_token' INTO encrypted_token
    FROM connected_integrations 
    WHERE id = integration_id_in;
    
    IF encrypted_token IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Decrypt using the same key as encryption
    SELECT pgp_sym_decrypt(
        encrypted_token::bytea, 
        '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'
    ) INTO decrypted_token;
    
    RETURN decrypted_token;
END;
$$;


ALTER FUNCTION "public"."decrypt_discord_user_token"("integration_id_in" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_google_access_token"("integration_id_in" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    encrypted_token text;
    decrypted_token text;
BEGIN
    -- Get the encrypted access token
    SELECT credentials->>'access_token' INTO encrypted_token
    FROM connected_integrations 
    WHERE id = integration_id_in;
    
    IF encrypted_token IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Decrypt using the same key as encryption
    SELECT pgp_sym_decrypt(
        encrypted_token::bytea, 
        '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'
    ) INTO decrypted_token;
    
    RETURN decrypted_token;
END;
$$;


ALTER FUNCTION "public"."decrypt_google_access_token"("integration_id_in" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_google_refresh_token"("integration_id_in" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    encrypted_token text;
    decrypted_token text;
BEGIN
    -- Get the encrypted refresh token
    SELECT credentials->>'refresh_token' INTO encrypted_token
    FROM connected_integrations 
    WHERE id = integration_id_in;
    
    IF encrypted_token IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Decrypt using the same key as encryption
    SELECT pgp_sym_decrypt(
        encrypted_token::bytea, 
        '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'
    ) INTO decrypted_token;
    
    RETURN decrypted_token;
END;
$$;


ALTER FUNCTION "public"."decrypt_google_refresh_token"("integration_id_in" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_notion_access_token"("integration_id_in" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    encrypted_token text;
    decrypted_token text;
BEGIN
    -- Get the encrypted access token
    SELECT credentials->>'access_token' INTO encrypted_token
    FROM connected_integrations 
    WHERE id = integration_id_in;
    
    IF encrypted_token IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Decrypt using the same key as encryption
    SELECT pgp_sym_decrypt(
        encrypted_token::bytea, 
        '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'
    ) INTO decrypted_token;
    
    RETURN decrypted_token;
END;
$$;


ALTER FUNCTION "public"."decrypt_notion_access_token"("integration_id_in" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_notion_bot_id"("integration_id_in" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    encrypted_bot_id text;
    decrypted_bot_id text;
BEGIN
    -- Get the encrypted bot ID
    SELECT credentials->>'bot_id' INTO encrypted_bot_id
    FROM connected_integrations 
    WHERE id = integration_id_in;
    
    IF encrypted_bot_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Decrypt using the same key as encryption
    SELECT pgp_sym_decrypt(
        encrypted_bot_id::bytea, 
        '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'
    ) INTO decrypted_bot_id;
    
    RETURN decrypted_bot_id;
END;
$$;


ALTER FUNCTION "public"."decrypt_notion_bot_id"("integration_id_in" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_slack_bot_token"("integration_id_in" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    encrypted_token text;
    decrypted_token text;
BEGIN
    -- Get the encrypted token
    SELECT credentials->>'bot_token' INTO encrypted_token
    FROM connected_integrations 
    WHERE id = integration_id_in;
    
    IF encrypted_token IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Decrypt using the same key as encryption
    SELECT pgp_sym_decrypt(
        encrypted_token::bytea, 
        '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'
    ) INTO decrypted_token;
    
    RETURN decrypted_token;
END;
$$;


ALTER FUNCTION "public"."decrypt_slack_bot_token"("integration_id_in" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_slack_user_token"("integration_id_in" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    encrypted_token text;
    decrypted_token text;
BEGIN
    -- Get the encrypted user token
    SELECT credentials->>'user_token' INTO encrypted_token
    FROM connected_integrations 
    WHERE id = integration_id_in;
    
    IF encrypted_token IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Decrypt using the same key as encryption
    SELECT pgp_sym_decrypt(
        encrypted_token::bytea, 
        '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'
    ) INTO decrypted_token;
    
    RETURN decrypted_token;
END;
$$;


ALTER FUNCTION "public"."decrypt_slack_user_token"("integration_id_in" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."encrypt_discord_credentials"("bot_token_in" "text", "user_token_in" "text") RETURNS TABLE("bot_token_out" "bytea", "user_token_out" "bytea")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query
  select
    pgp_sym_encrypt(bot_token_in,  '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'),
    pgp_sym_encrypt(user_token_in, '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R');
end;
$$;


ALTER FUNCTION "public"."encrypt_discord_credentials"("bot_token_in" "text", "user_token_in" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."encrypt_google_credentials"("access_token_in" "text", "refresh_token_in" "text") RETURNS TABLE("access_token_out" "bytea", "refresh_token_out" "bytea")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query
  select
    pgp_sym_encrypt(access_token_in,  '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'),
    CASE 
      WHEN refresh_token_in IS NOT NULL THEN pgp_sym_encrypt(refresh_token_in, '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R')
      ELSE NULL
    END;
end;
$$;


ALTER FUNCTION "public"."encrypt_google_credentials"("access_token_in" "text", "refresh_token_in" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."encrypt_notion_credentials"("access_token_in" "text", "bot_id_in" "text") RETURNS TABLE("access_token_out" "bytea", "bot_id_out" "bytea")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query
  select
    pgp_sym_encrypt(access_token_in, '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'),
    pgp_sym_encrypt(bot_id_in, '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R');
end;
$$;


ALTER FUNCTION "public"."encrypt_notion_credentials"("access_token_in" "text", "bot_id_in" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."encrypt_slack_credentials"("bot_token_in" "text", "signing_secret_in" "text") RETURNS TABLE("bot_token_out" "bytea", "signing_secret_out" "bytea")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query
  select
    pgp_sym_encrypt(bot_token_in,      '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'),
    pgp_sym_encrypt(signing_secret_in, '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R');
end;
$$;


ALTER FUNCTION "public"."encrypt_slack_credentials"("bot_token_in" "text", "signing_secret_in" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ingestion_source_stats"("chatbot_id_param" "uuid") RETURNS TABLE("ingestion_source" "text", "content_count" bigint, "total_size" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."get_ingestion_source_stats"("chatbot_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_ingestion_source_stats"("chatbot_id_param" "uuid") IS 'Returns statistics about content sources by ingestion method for a chatbot';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name) -- Add other default fields as needed
  VALUES (NEW.id, NEW.email, NULL); -- NEW.id and NEW.email refer to the new row in auth.users
                                  -- Set full_name to NULL or some default if you prefer
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_rate_limit_counter"("p_chatbot_id" "uuid", "p_identifier" "text", "p_identifier_type" "text", "p_window_type" "text", "p_window_start" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO rate_limit_tracking (
    chatbot_id, identifier, identifier_type, window_type, window_start, message_count
  )
  VALUES (
    p_chatbot_id, p_identifier, p_identifier_type, p_window_type, p_window_start, 1
  )
  ON CONFLICT (chatbot_id, identifier, identifier_type, window_type, window_start)
  DO UPDATE SET
    message_count = rate_limit_tracking.message_count + 1,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."increment_rate_limit_counter"("p_chatbot_id" "uuid", "p_identifier" "text", "p_identifier_type" "text", "p_window_type" "text", "p_window_start" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_document_chunks"("query_embedding" "extensions"."vector", "chatbot_id_param" "uuid", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 10) RETURNS TABLE("chunk_id" "uuid", "reference_id" "uuid", "page_number" integer, "chunk_text" "text", "token_count" integer, "similarity" double precision, "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $$
  select
    document_chunks.chunk_id,
    document_chunks.reference_id,
    document_chunks.page_number,
    document_chunks.chunk_text,
    document_chunks.token_count,
    1 - (document_chunks.embedding <=> query_embedding) as similarity,
    document_chunks.created_at
  from document_chunks
  where 
    document_chunks.chatbot_id = chatbot_id_param
    and document_chunks.embedding is not null
    and 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by (document_chunks.embedding <=> query_embedding) asc
  limit match_count;
$$;


ALTER FUNCTION "public"."match_document_chunks"("query_embedding" "extensions"."vector", "chatbot_id_param" "uuid", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_document_chunks_enhanced"("query_embedding" "extensions"."vector", "chatbot_id_param" "uuid", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 10, "content_types" "text"[] DEFAULT ARRAY['document'::"text", 'url'::"text", 'video'::"text", 'audio'::"text"], "max_per_content_type" integer DEFAULT NULL::integer) RETURNS TABLE("chunk_id" "uuid", "reference_id" "uuid", "page_number" integer, "chunk_text" "text", "token_count" integer, "similarity" double precision, "content_type" "text", "start_time_seconds" integer, "end_time_seconds" integer, "speaker" "text", "chunk_type" "text", "confidence_score" double precision, "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."match_document_chunks_enhanced"("query_embedding" "extensions"."vector", "chatbot_id_param" "uuid", "match_threshold" double precision, "match_count" integer, "content_types" "text"[], "max_per_content_type" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_multimedia_chunks_with_time"("query_embedding" "extensions"."vector", "chatbot_id_param" "uuid", "reference_id_param" "uuid" DEFAULT NULL::"uuid", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 10, "time_range_start" integer DEFAULT NULL::integer, "time_range_end" integer DEFAULT NULL::integer) RETURNS TABLE("chunk_id" "uuid", "reference_id" "uuid", "chunk_text" "text", "similarity" double precision, "start_time_seconds" integer, "end_time_seconds" integer, "speaker" "text", "chunk_type" "text", "confidence_score" double precision)
    LANGUAGE "sql" STABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."match_multimedia_chunks_with_time"("query_embedding" "extensions"."vector", "chatbot_id_param" "uuid", "reference_id_param" "uuid", "match_threshold" double precision, "match_count" integer, "time_range_start" integer, "time_range_end" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_chatbot_skills_by_similarity"("query_embedding" "extensions"."vector", "chatbot_id_param" "uuid", "similarity_threshold" double precision DEFAULT 0.5, "match_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "user_id" "uuid", "name" "text", "display_name" "text", "description" "text", "category" "text", "type" "text", "function_schema" "jsonb", "configuration" "jsonb", "embedding" "extensions"."vector", "is_active" boolean, "execution_count" integer, "last_executed_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "similarity" double precision, "association_id" "uuid", "association_is_active" boolean, "custom_config" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.name,
    s.display_name,
    s.description,
    s.category,
    s.type,
    s.function_schema,
    s.configuration,
    s.embedding,
    s.is_active,
    s.execution_count,
    s.last_executed_at,
    s.created_at,
    s.updated_at,
    (1 - (s.embedding <=> query_embedding)) as similarity,
    csa.id as association_id,
    csa.is_active as association_is_active,
    csa.custom_config
  FROM skills s
  INNER JOIN chatbot_skill_associations csa ON s.id = csa.skill_id
  WHERE 
    -- Filter by chatbot
    csa.chatbot_id = chatbot_id_param
    -- Only return active skills and active associations
    AND s.is_active = true
    AND csa.is_active = true
    -- Only include skills that have embeddings
    AND s.embedding IS NOT NULL
    -- Filter by similarity threshold
    AND (1 - (s.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;


ALTER FUNCTION "public"."search_chatbot_skills_by_similarity"("query_embedding" "extensions"."vector", "chatbot_id_param" "uuid", "similarity_threshold" double precision, "match_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_current_timestamp_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_current_timestamp_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_chatbot_integrations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_chatbot_integrations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_folders_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_folders_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_session_timestamp_on_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update the parent session's updated_at timestamp
    UPDATE chat_sessions 
    SET updated_at = NOW() 
    WHERE id = NEW.chat_session_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_session_timestamp_on_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_skill_execution_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.skills 
    SET 
        execution_count = execution_count + 1,
        last_executed_at = NEW.created_at
    WHERE id = NEW.skill_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_skill_execution_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chatbot_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


COMMENT ON TABLE "public"."announcements" IS 'Stores announcements for chatbots';



COMMENT ON COLUMN "public"."announcements"."chatbot_id" IS 'The chatbot this announcement belongs to';



COMMENT ON COLUMN "public"."announcements"."user_id" IS 'User who created the announcement (chatbot owner)';



COMMENT ON COLUMN "public"."announcements"."title" IS 'Announcement title';



COMMENT ON COLUMN "public"."announcements"."content" IS 'Announcement content/message';



COMMENT ON COLUMN "public"."announcements"."is_published" IS 'Whether the announcement is published (visible to users)';



COMMENT ON COLUMN "public"."announcements"."published_at" IS 'When the announcement was first published';



CREATE TABLE IF NOT EXISTS "public"."chat_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "user_id" "uuid",
    "chatbot_slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "chatbot_id" "uuid" NOT NULL,
    "source" character varying(20) DEFAULT 'full'::character varying NOT NULL,
    "referrer" "text",
    "embedded_config" "jsonb",
    "channel" character varying(20) DEFAULT 'web'::character varying NOT NULL,
    "external_session_id" "text",
    "workspace_id" "uuid",
    CONSTRAINT "chat_sessions_channel_check" CHECK ((("channel")::"text" = ANY (ARRAY[('web'::character varying)::"text", ('embedded'::character varying)::"text", ('slack'::character varying)::"text", ('discord'::character varying)::"text", ('whatsapp'::character varying)::"text", ('api'::character varying)::"text", ('teams'::character varying)::"text", ('alexa'::character varying)::"text"]))),
    CONSTRAINT "chat_sessions_source_check" CHECK ((("source")::"text" = ANY (ARRAY[('full'::character varying)::"text", ('embedded'::character varying)::"text"])))
);


ALTER TABLE "public"."chat_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."chat_sessions" IS 'Stores chat session metadata for each user-chatbot combination';



COMMENT ON COLUMN "public"."chat_sessions"."id" IS 'Unique identifier for the chat session';



COMMENT ON COLUMN "public"."chat_sessions"."name" IS 'Human-readable name for the chat session (usually generated from first message)';



COMMENT ON COLUMN "public"."chat_sessions"."user_id" IS 'Reference to the user who owns this session';



COMMENT ON COLUMN "public"."chat_sessions"."chatbot_slug" IS 'Slug identifier for the chatbot this session belongs to';



COMMENT ON COLUMN "public"."chat_sessions"."created_at" IS 'Timestamp when the session was created';



COMMENT ON COLUMN "public"."chat_sessions"."updated_at" IS 'Timestamp when the session was last updated';



COMMENT ON COLUMN "public"."chat_sessions"."source" IS 'Source of the chat session: full (regular chatbot) or embedded';



COMMENT ON COLUMN "public"."chat_sessions"."referrer" IS 'Referrer URL for embedded sessions (which website embedded the chatbot)';



COMMENT ON COLUMN "public"."chat_sessions"."embedded_config" IS 'Configuration options specific to embedded chatbot sessions';



CREATE TABLE IF NOT EXISTS "public"."chatbot_channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chatbot_id" "uuid" NOT NULL,
    "integration_id" "uuid",
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chatbot_channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chatbot_content_sources" (
    "id" "uuid" NOT NULL,
    "chatbot_id" "uuid" NOT NULL,
    "source_type" "text" NOT NULL,
    "file_name" "text",
    "storage_path" "text",
    "source_url" "text",
    "title" "text",
    "indexing_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_message" "text",
    "metadata" "jsonb",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "folder_id" "uuid",
    "ingestion_source" "public"."ingestion_source_enum" DEFAULT 'FILE_UPLOAD'::"public"."ingestion_source_enum"
);


ALTER TABLE "public"."chatbot_content_sources" OWNER TO "postgres";


COMMENT ON TABLE "public"."chatbot_content_sources" IS 'Stores content sources (documents, URLs) for chatbots.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."chatbot_id" IS 'The chatbot this content source belongs to.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."source_type" IS 'Type of the content source (e.g., pdf, url).';



COMMENT ON COLUMN "public"."chatbot_content_sources"."file_name" IS 'Original name of the uploaded file.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."storage_path" IS 'Path to the file in object storage.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."source_url" IS 'URL if the source is a web page.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."title" IS 'Display title for this content source.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."indexing_status" IS 'Current status of content processing/indexing.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."error_message" IS 'Error message if content processing failed.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."metadata" IS 'Additional metadata about the source (e.g., page count).';



COMMENT ON COLUMN "public"."chatbot_content_sources"."processed_at" IS 'Timestamp when content processing finished.';



COMMENT ON COLUMN "public"."chatbot_content_sources"."ingestion_source" IS 'How the content was ingested into the system (FILE_UPLOAD, URL_SUBMISSION, GOOGLE_DRIVE)';



CREATE TABLE IF NOT EXISTS "public"."chatbot_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chatbot_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "session_id" "text",
    "feedback_type" "text" NOT NULL,
    "rating" integer,
    "subject" "text",
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text",
    "creator_response" "text",
    "responded_at" timestamp with time zone,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chatbot_feedback_feedback_type_check" CHECK (("feedback_type" = ANY (ARRAY['bug'::"text", 'feature'::"text", 'improvement'::"text", 'question'::"text", 'other'::"text"]))),
    CONSTRAINT "chatbot_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "chatbot_feedback_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'in_progress'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."chatbot_feedback" OWNER TO "postgres";


COMMENT ON TABLE "public"."chatbot_feedback" IS 'Stores user feedback for chatbots';



COMMENT ON COLUMN "public"."chatbot_feedback"."chatbot_id" IS 'The chatbot this feedback is for';



COMMENT ON COLUMN "public"."chatbot_feedback"."user_id" IS 'User who submitted feedback (NULL for anonymous)';



COMMENT ON COLUMN "public"."chatbot_feedback"."session_id" IS 'Session ID for anonymous users';



COMMENT ON COLUMN "public"."chatbot_feedback"."feedback_type" IS 'Type of feedback: bug, feature, improvement, question, other';



COMMENT ON COLUMN "public"."chatbot_feedback"."rating" IS 'Optional 1-5 star rating';



COMMENT ON COLUMN "public"."chatbot_feedback"."subject" IS 'Optional short title/subject';



COMMENT ON COLUMN "public"."chatbot_feedback"."message" IS 'Main feedback message';



COMMENT ON COLUMN "public"."chatbot_feedback"."status" IS 'Status: new, in_progress, resolved, closed';



COMMENT ON COLUMN "public"."chatbot_feedback"."creator_response" IS 'Response from chatbot creator';



COMMENT ON COLUMN "public"."chatbot_feedback"."metadata" IS 'Additional metadata (browser, device, etc)';



CREATE TABLE IF NOT EXISTS "public"."chatbot_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chatbot_id" "uuid" NOT NULL,
    "integration_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."chatbot_integrations" OWNER TO "postgres";


COMMENT ON TABLE "public"."chatbot_integrations" IS 'Associates chatbots with specific user integrations, allowing granular control over which integrations each chatbot can use';



CREATE TABLE IF NOT EXISTS "public"."chatbot_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chatbot_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."chatbot_role" DEFAULT 'viewer'::"public"."chatbot_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chatbot_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chatbot_skill_associations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chatbot_id" "uuid" NOT NULL,
    "skill_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "custom_config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chatbot_skill_associations" OWNER TO "postgres";


COMMENT ON TABLE "public"."chatbot_skill_associations" IS 'Many-to-many links between chatbots and skills (replaces direct chatbot_id in old chatbot_skills)';



COMMENT ON COLUMN "public"."chatbot_skill_associations"."custom_config" IS 'Per-chatbot overrides for skill configuration';



CREATE TABLE IF NOT EXISTS "public"."chatbots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "student_facing_name" "text",
    "logo_url" "text",
    "welcome_message" "text",
    "suggested_questions" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "shareable_url_slug" "text",
    "rate_limit_config" "jsonb",
    "access_control_config" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "theme" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "ai_model_identifier" "text",
    "system_prompt" "text",
    "temperature" numeric(2,1),
    "published" boolean DEFAULT false NOT NULL,
    "visibility" "public"."chatbot_visibility" DEFAULT 'private'::"public"."chatbot_visibility" NOT NULL,
    "tool_selection_method" "text" DEFAULT 'direct'::"text",
    CONSTRAINT "chatbots_tool_selection_method_check" CHECK (("tool_selection_method" = ANY (ARRAY['direct'::"text", 'semantic_retrieval'::"text"])))
);


ALTER TABLE "public"."chatbots" OWNER TO "postgres";


COMMENT ON TABLE "public"."chatbots" IS 'Stores information about each chatbot created by educators.';



COMMENT ON COLUMN "public"."chatbots"."user_id" IS 'The educator who owns this chatbot.';



COMMENT ON COLUMN "public"."chatbots"."name" IS 'Name for the chatbot, visible to the educator only.';



COMMENT ON COLUMN "public"."chatbots"."student_facing_name" IS 'Public name of the chatbot, visible to students.';



COMMENT ON COLUMN "public"."chatbots"."logo_url" IS 'URL for the chatbot''s logo.';



COMMENT ON COLUMN "public"."chatbots"."welcome_message" IS 'Initial message displayed to students.';



COMMENT ON COLUMN "public"."chatbots"."suggested_questions" IS 'JSON array of suggested questions for students.';



COMMENT ON COLUMN "public"."chatbots"."is_active" IS 'Whether the chatbot is currently active and accessible to students.';



COMMENT ON COLUMN "public"."chatbots"."shareable_url_slug" IS 'Unique slug for the student-facing chatbot URL. Must be unique if set.';



COMMENT ON COLUMN "public"."chatbots"."rate_limit_config" IS 'JSON blob for future rate limiting configurations.';



COMMENT ON COLUMN "public"."chatbots"."access_control_config" IS 'JSON blob for future student access control settings.';



CREATE TABLE IF NOT EXISTS "public"."connected_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "integration_type" "text" NOT NULL,
    "credentials" "jsonb",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."connected_integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."default_themes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "theme_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'general'::"text",
    "theme_config" "jsonb" NOT NULL,
    "preview_image_url" "text",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."default_themes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_chunks" (
    "chunk_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reference_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "chatbot_id" "uuid",
    "page_number" integer NOT NULL,
    "chunk_text" "text" NOT NULL,
    "token_count" integer NOT NULL,
    "embedding" "extensions"."vector"(1536),
    "constituent_elements_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content_type" "text" DEFAULT 'document'::"text" NOT NULL,
    "start_time_seconds" integer,
    "end_time_seconds" integer,
    "speaker" "text",
    "confidence_score" double precision,
    "chunk_type" "text",
    CONSTRAINT "chunk_type_check" CHECK (("chunk_type" = ANY (ARRAY['page_text'::"text", 'transcript'::"text", 'frame_description'::"text", 'audio_segment'::"text", 'web_content'::"text"]))),
    CONSTRAINT "confidence_score_check" CHECK ((("confidence_score" IS NULL) OR (("confidence_score" >= (0)::double precision) AND ("confidence_score" <= (1)::double precision)))),
    CONSTRAINT "document_chunks_content_type_check" CHECK (("content_type" = ANY (ARRAY['document'::"text", 'url'::"text", 'video'::"text", 'audio'::"text"]))),
    CONSTRAINT "multimedia_time_fields_check" CHECK ((("content_type" = ANY (ARRAY['document'::"text", 'url'::"text"])) OR (("content_type" = ANY (ARRAY['video'::"text", 'audio'::"text"])) AND ("start_time_seconds" IS NOT NULL) AND ("end_time_seconds" IS NOT NULL)))),
    CONSTRAINT "time_fields_logical_check" CHECK ((("start_time_seconds" IS NULL) OR ("end_time_seconds" IS NULL) OR ("end_time_seconds" >= "start_time_seconds")))
);


ALTER TABLE "public"."document_chunks" OWNER TO "postgres";


COMMENT ON TABLE "public"."document_chunks" IS 'Stores chunked text content from processed documents with embeddings for vector similarity search';



COMMENT ON COLUMN "public"."document_chunks"."chunk_id" IS 'Unique identifier for the text chunk';



COMMENT ON COLUMN "public"."document_chunks"."reference_id" IS 'Reference to the content source this chunk belongs to';



COMMENT ON COLUMN "public"."document_chunks"."user_id" IS 'Reference to the user who owns this content';



COMMENT ON COLUMN "public"."document_chunks"."chatbot_id" IS 'Reference to the chatbot this chunk belongs to';



COMMENT ON COLUMN "public"."document_chunks"."page_number" IS 'Page number in the original document where this chunk originated';



COMMENT ON COLUMN "public"."document_chunks"."chunk_text" IS 'The actual text content of the chunk used for embeddings';



COMMENT ON COLUMN "public"."document_chunks"."token_count" IS 'Number of tokens in the chunk text';



COMMENT ON COLUMN "public"."document_chunks"."embedding" IS 'Vector embedding of the chunk text for similarity search (1536 dimensions for OpenAI ada-002)';



COMMENT ON COLUMN "public"."document_chunks"."constituent_elements_data" IS 'JSON data containing original parsed elements that make up this chunk';



COMMENT ON COLUMN "public"."document_chunks"."created_at" IS 'Timestamp when the chunk was created';



COMMENT ON COLUMN "public"."document_chunks"."updated_at" IS 'Timestamp when the chunk was last updated';



COMMENT ON COLUMN "public"."document_chunks"."content_type" IS 'Type of content: document, url, video, or audio';



COMMENT ON COLUMN "public"."document_chunks"."start_time_seconds" IS 'Start timestamp for multimedia content (seconds from beginning)';



COMMENT ON COLUMN "public"."document_chunks"."end_time_seconds" IS 'End timestamp for multimedia content (seconds from beginning)';



COMMENT ON COLUMN "public"."document_chunks"."speaker" IS 'Speaker name for multimedia content (if applicable)';



COMMENT ON COLUMN "public"."document_chunks"."confidence_score" IS 'Confidence score for transcript accuracy (0.0 to 1.0)';



COMMENT ON COLUMN "public"."document_chunks"."chunk_type" IS 'Specific type of chunk: page_text, transcript, frame_description, audio_segment, web_content';



CREATE TABLE IF NOT EXISTS "public"."folders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "chatbot_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "parent_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."folders" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."google_drive_content_view" AS
 SELECT "ccs"."id",
    "ccs"."chatbot_id",
    "ccs"."source_type",
    "ccs"."ingestion_source",
    "ccs"."file_name",
    "ccs"."title",
    "ccs"."indexing_status",
    "ccs"."uploaded_at",
    "ccs"."processed_at",
    "ccs"."created_at",
    "ccs"."updated_at",
    (("ccs"."metadata" -> 'google_drive'::"text") ->> 'file_id'::"text") AS "drive_file_id",
    (("ccs"."metadata" -> 'google_drive'::"text") ->> 'original_name'::"text") AS "drive_original_name",
    (("ccs"."metadata" -> 'google_drive'::"text") ->> 'mime_type'::"text") AS "drive_mime_type",
    (("ccs"."metadata" -> 'google_drive'::"text") ->> 'drive_folder'::"text") AS "drive_folder_path",
    (("ccs"."metadata" -> 'google_drive'::"text") ->> 'last_modified'::"text") AS "drive_last_modified",
    (("ccs"."metadata" -> 'google_drive'::"text") ->> 'integration_id'::"text") AS "drive_integration_id",
    (("ccs"."metadata" -> 'google_drive'::"text") ->> 'web_view_link'::"text") AS "drive_web_view_link",
    ((("ccs"."metadata" -> 'google_drive'::"text") ->> 'file_size'::"text"))::bigint AS "drive_file_size"
   FROM "public"."chatbot_content_sources" "ccs"
  WHERE ("ccs"."ingestion_source" = 'GOOGLE_DRIVE'::"public"."ingestion_source_enum");


ALTER TABLE "public"."google_drive_content_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."google_drive_content_view" IS 'View for Google Drive content with extracted metadata fields';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "text" NOT NULL,
    "chat_session_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "annotations" "jsonb",
    "parts" "jsonb",
    "experimental_attachments" "jsonb",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "token_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'system'::"text", 'tool'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."messages" IS 'Stores individual chat messages within sessions';



COMMENT ON COLUMN "public"."messages"."id" IS 'Unique database identifier for the message';



COMMENT ON COLUMN "public"."messages"."message_id" IS 'The ID from the AI SDK message (for correlation)';



COMMENT ON COLUMN "public"."messages"."chat_session_id" IS 'Reference to the chat session this message belongs to';



COMMENT ON COLUMN "public"."messages"."user_id" IS 'Reference to the user (for additional security and queries)';



COMMENT ON COLUMN "public"."messages"."role" IS 'Role of the message sender (user, assistant, system, tool)';



COMMENT ON COLUMN "public"."messages"."content" IS 'The main text content of the message';



COMMENT ON COLUMN "public"."messages"."annotations" IS 'Additional annotations from the AI SDK';



COMMENT ON COLUMN "public"."messages"."parts" IS 'Message parts from the AI SDK';



COMMENT ON COLUMN "public"."messages"."experimental_attachments" IS 'Experimental attachments from the AI SDK';



COMMENT ON COLUMN "public"."messages"."metadata" IS 'Additional metadata for the message';



CREATE TABLE IF NOT EXISTS "public"."oauth_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "text" NOT NULL,
    "redirect_uri" "text" NOT NULL,
    "scope" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."oauth_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid",
    "subscription_tier" "text",
    "organization_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Stores additional user-specific settings and preferences, linked to auth.users.';



COMMENT ON COLUMN "public"."profiles"."user_id" IS 'Foreign key referencing the user in auth.users.';



COMMENT ON COLUMN "public"."profiles"."subscription_tier" IS 'The subscription tier of the user (e.g., free, basic, premium).';



COMMENT ON COLUMN "public"."profiles"."organization_name" IS 'Name of the organization the user might belong to.';



CREATE TABLE IF NOT EXISTS "public"."rate_limit_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chatbot_id" "uuid" NOT NULL,
    "identifier" "text" NOT NULL,
    "identifier_type" "text" NOT NULL,
    "window_type" "text" NOT NULL,
    "window_start" timestamp with time zone NOT NULL,
    "message_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rate_limit_tracking_identifier_type_check" CHECK (("identifier_type" = ANY (ARRAY['user'::"text", 'session'::"text"]))),
    CONSTRAINT "rate_limit_tracking_window_type_check" CHECK (("window_type" = ANY (ARRAY['hour'::"text", 'day'::"text"])))
);


ALTER TABLE "public"."rate_limit_tracking" OWNER TO "postgres";


COMMENT ON TABLE "public"."rate_limit_tracking" IS 'Tracks rate limit usage for chatbots per user or session';



COMMENT ON COLUMN "public"."rate_limit_tracking"."identifier" IS 'Either user_id (for authenticated) or session_id (for anonymous)';



COMMENT ON COLUMN "public"."rate_limit_tracking"."identifier_type" IS 'Type of identifier: user or session';



COMMENT ON COLUMN "public"."rate_limit_tracking"."window_type" IS 'Time window type: hour or day';



COMMENT ON COLUMN "public"."rate_limit_tracking"."window_start" IS 'Start timestamp of the current rate limit window';



COMMENT ON COLUMN "public"."rate_limit_tracking"."message_count" IS 'Number of messages sent in this window';



CREATE TABLE IF NOT EXISTS "public"."skill_executions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "skill_id" "uuid" NOT NULL,
    "chat_session_id" "uuid",
    "user_id" "uuid",
    "channel_type" "text" DEFAULT 'web'::"text",
    "execution_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "input_parameters" "jsonb",
    "output_result" "jsonb",
    "error_message" "text",
    "execution_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "skill_executions_channel_type_check" CHECK (("channel_type" = ANY (ARRAY['web'::"text", 'embed'::"text", 'slack'::"text", 'discord'::"text", 'api'::"text", 'alexa'::"text"]))),
    CONSTRAINT "skill_executions_execution_status_check" CHECK (("execution_status" = ANY (ARRAY['pending'::"text", 'success'::"text", 'error'::"text", 'timeout'::"text"])))
);


ALTER TABLE "public"."skill_executions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."skill_executions"."skill_id" IS 'References skills.id in the new reusable skills schema';



CREATE TABLE IF NOT EXISTS "public"."skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "text" DEFAULT 'custom'::"text" NOT NULL,
    "type" "text" DEFAULT 'custom'::"text" NOT NULL,
    "function_schema" "jsonb" NOT NULL,
    "configuration" "jsonb" DEFAULT '{}'::"jsonb",
    "embedding" "extensions"."vector"(1536),
    "is_active" boolean DEFAULT true,
    "execution_count" integer DEFAULT 0,
    "last_executed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "skills_type_check" CHECK (("type" = ANY (ARRAY['custom'::"text", 'builtin'::"text"])))
);


ALTER TABLE "public"."skills" OWNER TO "postgres";


COMMENT ON TABLE "public"."skills" IS 'Reusable skill definitions (replaces old chatbot_skills table)';



COMMENT ON COLUMN "public"."skills"."user_id" IS 'Owner of custom skills; NULL for built-in skills';



COMMENT ON COLUMN "public"."skills"."embedding" IS 'Vector embedding for semantic search (OpenAI ada-002 format)';



CREATE TABLE IF NOT EXISTS "public"."slack_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "slack_user_id" "text" NOT NULL,
    "supabase_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."slack_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."slack_users" IS 'Maps Slack user IDs to internal application user IDs.';



CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_identifier" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "chatbot_id" "uuid" NOT NULL,
    "reference_id" "uuid",
    "task_type" "text" NOT NULL,
    "status" "text" DEFAULT 'QUEUED'::"text" NOT NULL,
    "current_step_description" "text",
    "progress_percentage" integer DEFAULT 0 NOT NULL,
    "input_payload" "jsonb",
    "result_payload" "jsonb",
    "error_details" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tasks_progress_percentage_check" CHECK ((("progress_percentage" >= 0) AND ("progress_percentage" <= 100))),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'QUEUED'::"text", 'PROCESSING'::"text", 'COMPLETED'::"text", 'FAILED'::"text", 'CANCELLED'::"text"]))),
    CONSTRAINT "tasks_task_type_check" CHECK (("task_type" = ANY (ARRAY['DOCUMENT_PROCESSING'::"text", 'METADATA_EXTRACTION'::"text", 'CONTENT_INDEXING'::"text", 'URL_PROCESSING'::"text", 'DOI_CITATION_FETCH'::"text", 'PDF_GENERATION_FROM_URL'::"text", 'DOCUMENT_INDEXING'::"text", 'MULTIMEDIA_PROCESSING'::"text", 'MULTIMEDIA_INDEXING'::"text", 'GOOGLE_DRIVE_PROCESSING'::"text", 'GOOGLE_DRIVE_INDEXING'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks" IS 'Stores background task information for document processing, indexing, and other async operations';



COMMENT ON COLUMN "public"."tasks"."task_identifier" IS 'Unique identifier for tracking task progress via API';



COMMENT ON COLUMN "public"."tasks"."user_id" IS 'ID of the user who initiated the task';



COMMENT ON COLUMN "public"."tasks"."chatbot_id" IS 'ID of the chatbot this task belongs to';



COMMENT ON COLUMN "public"."tasks"."reference_id" IS 'Optional reference to a content source record';



COMMENT ON COLUMN "public"."tasks"."task_type" IS 'Type of background task being performed';



COMMENT ON COLUMN "public"."tasks"."status" IS 'Current status of the task execution';



COMMENT ON COLUMN "public"."tasks"."progress_percentage" IS 'Task completion percentage (0-100)';



COMMENT ON COLUMN "public"."tasks"."input_payload" IS 'JSON data passed to the task';



COMMENT ON COLUMN "public"."tasks"."result_payload" IS 'JSON result data from completed task';



COMMENT ON COLUMN "public"."tasks"."error_details" IS 'Error message if task failed';



CREATE TABLE IF NOT EXISTS "public"."user_custom_themes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "theme_config" "jsonb" NOT NULL,
    "based_on_default_theme_id" "uuid",
    "is_favorite" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_custom_themes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chatbot_channels"
    ADD CONSTRAINT "chatbot_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chatbot_content_sources"
    ADD CONSTRAINT "chatbot_content_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chatbot_feedback"
    ADD CONSTRAINT "chatbot_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chatbot_integrations"
    ADD CONSTRAINT "chatbot_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chatbot_permissions"
    ADD CONSTRAINT "chatbot_permissions_chatbot_id_user_id_key" UNIQUE ("chatbot_id", "user_id");



ALTER TABLE ONLY "public"."chatbot_permissions"
    ADD CONSTRAINT "chatbot_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chatbot_skill_associations"
    ADD CONSTRAINT "chatbot_skill_associations_chatbot_id_skill_id_key" UNIQUE ("chatbot_id", "skill_id");



ALTER TABLE ONLY "public"."chatbot_skill_associations"
    ADD CONSTRAINT "chatbot_skill_associations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chatbots"
    ADD CONSTRAINT "chatbots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."connected_integrations"
    ADD CONSTRAINT "connected_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."default_themes"
    ADD CONSTRAINT "default_themes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."default_themes"
    ADD CONSTRAINT "default_themes_theme_id_key" UNIQUE ("theme_id");



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("chunk_id");



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oauth_codes"
    ADD CONSTRAINT "oauth_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."oauth_codes"
    ADD CONSTRAINT "oauth_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limit_tracking"
    ADD CONSTRAINT "rate_limit_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limit_tracking"
    ADD CONSTRAINT "rate_limit_tracking_unique" UNIQUE ("chatbot_id", "identifier", "identifier_type", "window_type", "window_start");



ALTER TABLE ONLY "public"."skill_executions"
    ADD CONSTRAINT "skill_executions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slack_users"
    ADD CONSTRAINT "slack_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slack_users"
    ADD CONSTRAINT "slack_users_workspace_id_slack_user_id_key" UNIQUE ("workspace_id", "slack_user_id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_task_identifier_key" UNIQUE ("task_identifier");



ALTER TABLE ONLY "public"."chatbot_channels"
    ADD CONSTRAINT "unique_chatbot_channel" UNIQUE ("chatbot_id", "integration_id");



ALTER TABLE ONLY "public"."chatbot_integrations"
    ADD CONSTRAINT "unique_chatbot_integration_type" UNIQUE ("chatbot_id", "integration_id");



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "unique_folder_name_per_chatbot_parent" UNIQUE ("chatbot_id", "parent_id", "name");



ALTER TABLE ONLY "public"."chatbots"
    ADD CONSTRAINT "unique_shareable_url_slug" UNIQUE ("shareable_url_slug");



ALTER TABLE ONLY "public"."user_custom_themes"
    ADD CONSTRAINT "unique_user_theme_name" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."user_custom_themes"
    ADD CONSTRAINT "user_custom_themes_pkey" PRIMARY KEY ("id");



CREATE INDEX "chatbot_skill_associations_chatbot_active_idx" ON "public"."chatbot_skill_associations" USING "btree" ("chatbot_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "document_chunks_chatbot_id_idx" ON "public"."document_chunks" USING "btree" ("chatbot_id");



CREATE INDEX "document_chunks_created_at_idx" ON "public"."document_chunks" USING "btree" ("created_at" DESC);



CREATE INDEX "document_chunks_embedding_idx" ON "public"."document_chunks" USING "hnsw" ("embedding" "extensions"."vector_ip_ops");



CREATE INDEX "document_chunks_reference_id_idx" ON "public"."document_chunks" USING "btree" ("reference_id");



CREATE INDEX "document_chunks_user_chatbot_idx" ON "public"."document_chunks" USING "btree" ("user_id", "chatbot_id");



CREATE INDEX "document_chunks_user_id_idx" ON "public"."document_chunks" USING "btree" ("user_id");



CREATE INDEX "idx_announcements_chatbot_id" ON "public"."announcements" USING "btree" ("chatbot_id");



CREATE INDEX "idx_announcements_created_at" ON "public"."announcements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_announcements_is_published" ON "public"."announcements" USING "btree" ("is_published");



CREATE INDEX "idx_announcements_published" ON "public"."announcements" USING "btree" ("is_published");



CREATE INDEX "idx_announcements_published_at" ON "public"."announcements" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_announcements_user_id" ON "public"."announcements" USING "btree" ("user_id");



CREATE INDEX "idx_chat_sessions_channel" ON "public"."chat_sessions" USING "btree" ("channel");



CREATE INDEX "idx_chat_sessions_chatbot_slug" ON "public"."chat_sessions" USING "btree" ("chatbot_slug");



CREATE INDEX "idx_chat_sessions_external_id" ON "public"."chat_sessions" USING "btree" ("external_session_id");



CREATE INDEX "idx_chat_sessions_referrer" ON "public"."chat_sessions" USING "btree" ("referrer");



CREATE INDEX "idx_chat_sessions_source" ON "public"."chat_sessions" USING "btree" ("source");



CREATE INDEX "idx_chat_sessions_source_chatbot" ON "public"."chat_sessions" USING "btree" ("source", "chatbot_id");



CREATE INDEX "idx_chat_sessions_updated_at" ON "public"."chat_sessions" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_chat_sessions_user_chatbot" ON "public"."chat_sessions" USING "btree" ("user_id", "chatbot_slug");



CREATE INDEX "idx_chat_sessions_user_id" ON "public"."chat_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_chat_sessions_workspace_id" ON "public"."chat_sessions" USING "btree" ("workspace_id");



CREATE INDEX "idx_chatbot_channels_chatbot_id" ON "public"."chatbot_channels" USING "btree" ("chatbot_id");



CREATE INDEX "idx_chatbot_channels_integration_id" ON "public"."chatbot_channels" USING "btree" ("integration_id");



CREATE INDEX "idx_chatbot_content_sources_chatbot_id" ON "public"."chatbot_content_sources" USING "btree" ("chatbot_id");



CREATE INDEX "idx_chatbot_content_sources_chatbot_ingestion" ON "public"."chatbot_content_sources" USING "btree" ("chatbot_id", "ingestion_source");



CREATE INDEX "idx_chatbot_content_sources_indexing_status" ON "public"."chatbot_content_sources" USING "btree" ("indexing_status");



CREATE INDEX "idx_chatbot_content_sources_ingestion_source" ON "public"."chatbot_content_sources" USING "btree" ("ingestion_source");



CREATE INDEX "idx_chatbot_content_sources_source_type" ON "public"."chatbot_content_sources" USING "btree" ("source_type");



CREATE INDEX "idx_chatbot_integrations_chatbot_id" ON "public"."chatbot_integrations" USING "btree" ("chatbot_id");



CREATE INDEX "idx_chatbot_integrations_integration_id" ON "public"."chatbot_integrations" USING "btree" ("integration_id");



CREATE INDEX "idx_chatbot_skill_associations_active" ON "public"."chatbot_skill_associations" USING "btree" ("is_active");



CREATE INDEX "idx_chatbot_skill_associations_chatbot_id" ON "public"."chatbot_skill_associations" USING "btree" ("chatbot_id");



CREATE INDEX "idx_chatbot_skill_associations_skill_id" ON "public"."chatbot_skill_associations" USING "btree" ("skill_id");



CREATE INDEX "idx_chatbots_shareable_url_slug" ON "public"."chatbots" USING "btree" ("shareable_url_slug") WHERE ("published" = true);



CREATE UNIQUE INDEX "idx_chatbots_shareable_url_slug_not_null" ON "public"."chatbots" USING "btree" ("shareable_url_slug") WHERE ("shareable_url_slug" IS NOT NULL);



CREATE INDEX "idx_chatbots_user_id" ON "public"."chatbots" USING "btree" ("user_id");



CREATE INDEX "idx_chunks_chatbot_content_type" ON "public"."document_chunks" USING "btree" ("chatbot_id", "content_type");



CREATE INDEX "idx_chunks_chunk_type" ON "public"."document_chunks" USING "btree" ("chunk_type") WHERE ("chunk_type" IS NOT NULL);



CREATE INDEX "idx_chunks_content_type" ON "public"."document_chunks" USING "btree" ("content_type");



CREATE INDEX "idx_chunks_multimedia_time" ON "public"."document_chunks" USING "btree" ("reference_id", "start_time_seconds", "end_time_seconds") WHERE ("content_type" = ANY (ARRAY['video'::"text", 'audio'::"text"]));



CREATE INDEX "idx_chunks_speaker" ON "public"."document_chunks" USING "btree" ("speaker") WHERE ("speaker" IS NOT NULL);



CREATE INDEX "idx_connected_integrations_type" ON "public"."connected_integrations" USING "btree" ("integration_type");



CREATE INDEX "idx_connected_integrations_user_id" ON "public"."connected_integrations" USING "btree" ("user_id");



CREATE INDEX "idx_connected_integrations_user_type" ON "public"."connected_integrations" USING "btree" ("user_id", "integration_type");



CREATE INDEX "idx_content_sources_folder_id" ON "public"."chatbot_content_sources" USING "btree" ("folder_id");



CREATE INDEX "idx_content_sources_unsorted" ON "public"."chatbot_content_sources" USING "btree" ("chatbot_id") WHERE ("folder_id" IS NULL);



CREATE INDEX "idx_default_themes_active" ON "public"."default_themes" USING "btree" ("is_active", "sort_order");



CREATE INDEX "idx_default_themes_category" ON "public"."default_themes" USING "btree" ("category", "is_active");



CREATE INDEX "idx_default_themes_theme_id" ON "public"."default_themes" USING "btree" ("theme_id") WHERE ("is_active" = true);



CREATE INDEX "idx_feedback_chatbot_id" ON "public"."chatbot_feedback" USING "btree" ("chatbot_id");



CREATE INDEX "idx_feedback_created_at" ON "public"."chatbot_feedback" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_feedback_status" ON "public"."chatbot_feedback" USING "btree" ("status");



CREATE INDEX "idx_feedback_type" ON "public"."chatbot_feedback" USING "btree" ("feedback_type");



CREATE INDEX "idx_feedback_user_id" ON "public"."chatbot_feedback" USING "btree" ("user_id");



CREATE INDEX "idx_folders_chatbot_id" ON "public"."folders" USING "btree" ("chatbot_id");



CREATE INDEX "idx_folders_parent_id" ON "public"."folders" USING "btree" ("parent_id");



CREATE INDEX "idx_folders_user_id" ON "public"."folders" USING "btree" ("user_id");



CREATE INDEX "idx_messages_chat_session_id" ON "public"."messages" USING "btree" ("chat_session_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_message_id" ON "public"."messages" USING "btree" ("message_id");



CREATE INDEX "idx_messages_role" ON "public"."messages" USING "btree" ("role");



CREATE INDEX "idx_messages_session_created" ON "public"."messages" USING "btree" ("chat_session_id", "created_at");



CREATE INDEX "idx_messages_user_id" ON "public"."messages" USING "btree" ("user_id");



CREATE INDEX "idx_oauth_codes_code" ON "public"."oauth_codes" USING "btree" ("code");



CREATE INDEX "idx_oauth_codes_expires_at" ON "public"."oauth_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_permissions_chatbot_id" ON "public"."chatbot_permissions" USING "btree" ("chatbot_id");



CREATE INDEX "idx_permissions_user_id" ON "public"."chatbot_permissions" USING "btree" ("user_id");



CREATE INDEX "idx_rate_limit_chatbot" ON "public"."rate_limit_tracking" USING "btree" ("chatbot_id");



CREATE INDEX "idx_rate_limit_lookup" ON "public"."rate_limit_tracking" USING "btree" ("chatbot_id", "identifier", "identifier_type", "window_type");



CREATE INDEX "idx_rate_limit_window" ON "public"."rate_limit_tracking" USING "btree" ("window_start");



CREATE INDEX "idx_skill_executions_channel_type" ON "public"."skill_executions" USING "btree" ("channel_type");



CREATE INDEX "idx_skill_executions_created_at" ON "public"."skill_executions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_skill_executions_skill_id" ON "public"."skill_executions" USING "btree" ("skill_id");



CREATE INDEX "idx_skills_category" ON "public"."skills" USING "btree" ("category");



CREATE INDEX "idx_skills_embedding" ON "public"."skills" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_skills_name" ON "public"."skills" USING "btree" ("name");



CREATE INDEX "idx_skills_type" ON "public"."skills" USING "btree" ("type");



CREATE INDEX "idx_skills_user_id" ON "public"."skills" USING "btree" ("user_id");



CREATE INDEX "idx_slack_users_lookup" ON "public"."slack_users" USING "btree" ("workspace_id", "slack_user_id");



CREATE INDEX "idx_tasks_chatbot_id" ON "public"."tasks" USING "btree" ("chatbot_id");



CREATE INDEX "idx_tasks_created_at" ON "public"."tasks" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_tasks_reference_id" ON "public"."tasks" USING "btree" ("reference_id");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");



CREATE INDEX "idx_tasks_task_identifier" ON "public"."tasks" USING "btree" ("task_identifier");



CREATE INDEX "idx_tasks_task_type" ON "public"."tasks" USING "btree" ("task_type");



CREATE INDEX "idx_tasks_user_chatbot_created" ON "public"."tasks" USING "btree" ("user_id", "chatbot_id", "created_at" DESC);



CREATE INDEX "idx_tasks_user_id" ON "public"."tasks" USING "btree" ("user_id");



CREATE INDEX "idx_user_custom_themes_based_on" ON "public"."user_custom_themes" USING "btree" ("based_on_default_theme_id") WHERE ("based_on_default_theme_id" IS NOT NULL);



CREATE INDEX "idx_user_custom_themes_favorites" ON "public"."user_custom_themes" USING "btree" ("user_id", "is_favorite") WHERE ("is_favorite" = true);



CREATE INDEX "idx_user_custom_themes_user" ON "public"."user_custom_themes" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "skills_embedding_hnsw_idx" ON "public"."skills" USING "hnsw" ("embedding" "extensions"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE UNIQUE INDEX "unique_alexa_integration" ON "public"."connected_integrations" USING "btree" ("user_id") WHERE ("integration_type" = 'alexa'::"text");



CREATE UNIQUE INDEX "unique_discord_integration" ON "public"."connected_integrations" USING "btree" ("user_id", (("metadata" ->> 'guild_id'::"text"))) WHERE ("integration_type" = 'discord'::"text");



CREATE UNIQUE INDEX "unique_slack_integration" ON "public"."connected_integrations" USING "btree" ("user_id", (("metadata" ->> 'team_id'::"text"))) WHERE ("integration_type" = 'slack'::"text");



CREATE OR REPLACE TRIGGER "set_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "set_chatbot_content_sources_updated_at" BEFORE UPDATE ON "public"."chatbot_content_sources" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "set_chatbots_updated_at" BEFORE UPDATE ON "public"."chatbots" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_folders_updated_at" BEFORE UPDATE ON "public"."folders" FOR EACH ROW EXECUTE FUNCTION "public"."update_folders_updated_at"();



CREATE OR REPLACE TRIGGER "update_chat_sessions_updated_at" BEFORE UPDATE ON "public"."chat_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_chatbot_channels_updated_at" BEFORE UPDATE ON "public"."chatbot_channels" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_chatbot_integrations_updated_at" BEFORE UPDATE ON "public"."chatbot_integrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_chatbot_integrations_updated_at"();



CREATE OR REPLACE TRIGGER "update_chatbot_skill_associations_updated_at" BEFORE UPDATE ON "public"."chatbot_skill_associations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_connected_integrations_updated_at" BEFORE UPDATE ON "public"."connected_integrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_default_themes_updated_at" BEFORE UPDATE ON "public"."default_themes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_document_chunks_modtime" BEFORE UPDATE ON "public"."document_chunks" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_messages_updated_at" BEFORE UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_session_on_message_insert" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_session_timestamp_on_message"();



CREATE OR REPLACE TRIGGER "update_skill_stats_on_execution" AFTER INSERT ON "public"."skill_executions" FOR EACH ROW EXECUTE FUNCTION "public"."update_skill_execution_stats"();



CREATE OR REPLACE TRIGGER "update_skills_updated_at" BEFORE UPDATE ON "public"."skills" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_custom_themes_updated_at" BEFORE UPDATE ON "public"."user_custom_themes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_chatbot_id_fkey" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_channels"
    ADD CONSTRAINT "chatbot_channels_chatbot_id_fkey" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_channels"
    ADD CONSTRAINT "chatbot_channels_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "public"."connected_integrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_content_sources"
    ADD CONSTRAINT "chatbot_content_sources_chatbot_id_fkey" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_feedback"
    ADD CONSTRAINT "chatbot_feedback_chatbot_id_fkey" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_feedback"
    ADD CONSTRAINT "chatbot_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chatbot_integrations"
    ADD CONSTRAINT "chatbot_integrations_chatbot_id_fkey" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_integrations"
    ADD CONSTRAINT "chatbot_integrations_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "public"."connected_integrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_skill_associations"
    ADD CONSTRAINT "chatbot_skill_associations_chatbot_id_fkey" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_skill_associations"
    ADD CONSTRAINT "chatbot_skill_associations_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbots"
    ADD CONSTRAINT "chatbots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."connected_integrations"
    ADD CONSTRAINT "connected_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_chatbot_id_fkey" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "public"."chatbot_content_sources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_sessions"
    ADD CONSTRAINT "fk_chat_sessions_chatbot_id" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_content_sources"
    ADD CONSTRAINT "fk_content_sources_folder_id" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "fk_folders_chatbot_id" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "fk_folders_parent_id" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "fk_folders_user_id" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_permissions"
    ADD CONSTRAINT "fk_permissions_chatbot_id" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_permissions"
    ADD CONSTRAINT "fk_permissions_user_id" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."oauth_codes"
    ADD CONSTRAINT "oauth_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rate_limit_tracking"
    ADD CONSTRAINT "rate_limit_tracking_chatbot_id_fkey" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_executions"
    ADD CONSTRAINT "skill_executions_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."skill_executions"
    ADD CONSTRAINT "skill_executions_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_executions"
    ADD CONSTRAINT "skill_executions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."slack_users"
    ADD CONSTRAINT "slack_users_supabase_user_id_fkey" FOREIGN KEY ("supabase_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_custom_themes"
    ADD CONSTRAINT "user_custom_themes_based_on_default_theme_id_fkey" FOREIGN KEY ("based_on_default_theme_id") REFERENCES "public"."default_themes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_custom_themes"
    ADD CONSTRAINT "user_custom_themes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow access to chunks for own chatbots" ON "public"."document_chunks" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots" "cb"
  WHERE (("cb"."id" = "document_chunks"."chatbot_id") AND ("cb"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chatbots" "cb"
  WHERE (("cb"."id" = "document_chunks"."chatbot_id") AND ("cb"."user_id" = "auth"."uid"())))));



CREATE POLICY "Allow anonymous access to chat_sessions for public chatbots" ON "public"."chat_sessions" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots" "c"
  WHERE (("c"."id" = "chat_sessions"."chatbot_id") AND ("c"."visibility" = 'public'::"public"."chatbot_visibility")))));



CREATE POLICY "Allow anonymous access to chatbot_content_sources for public ch" ON "public"."chatbot_content_sources" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots" "c"
  WHERE (("c"."id" = "chatbot_content_sources"."chatbot_id") AND ("c"."visibility" = 'public'::"public"."chatbot_visibility")))));



CREATE POLICY "Allow anonymous access to document_chunks for public chatbots" ON "public"."document_chunks" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots" "c"
  WHERE (("c"."id" = "document_chunks"."chatbot_id") AND ("c"."visibility" = 'public'::"public"."chatbot_visibility")))));



CREATE POLICY "Allow anonymous access to messages for public chatbots" ON "public"."messages" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM ("public"."chat_sessions" "cs"
     JOIN "public"."chatbots" "c" ON (("c"."id" = "cs"."chatbot_id")))
  WHERE (("cs"."id" = "messages"."chat_session_id") AND ("c"."visibility" = 'public'::"public"."chatbot_visibility")))));



CREATE POLICY "Allow anonymous access to public chatbots" ON "public"."chatbots" FOR SELECT TO "anon" USING (("visibility" = 'public'::"public"."chatbot_visibility"));



CREATE POLICY "Allow anonymous insert to chat_sessions for public chatbots" ON "public"."chat_sessions" FOR INSERT TO "anon" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chatbots" "c"
  WHERE (("c"."id" = "chat_sessions"."chatbot_id") AND ("c"."visibility" = 'public'::"public"."chatbot_visibility")))));



CREATE POLICY "Allow anonymous insert to messages for public chatbots" ON "public"."messages" FOR INSERT TO "anon" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."chat_sessions" "cs"
     JOIN "public"."chatbots" "c" ON (("c"."id" = "cs"."chatbot_id")))
  WHERE (("cs"."id" = "messages"."chat_session_id") AND ("c"."visibility" = 'public'::"public"."chatbot_visibility")))));



CREATE POLICY "Allow anonymous update to chat_sessions for public chatbots" ON "public"."chat_sessions" FOR UPDATE TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots" "c"
  WHERE (("c"."id" = "chat_sessions"."chatbot_id") AND ("c"."visibility" = 'public'::"public"."chatbot_visibility")))));



CREATE POLICY "Allow authenticated access to document_chunks for public and sh" ON "public"."document_chunks" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots" "c"
  WHERE (("c"."id" = "document_chunks"."chatbot_id") AND (("c"."visibility" = 'public'::"public"."chatbot_visibility") OR (("c"."visibility" = 'shared'::"public"."chatbot_visibility") AND (EXISTS ( SELECT 1
           FROM "public"."chatbot_permissions" "p"
          WHERE (("p"."chatbot_id" = "c"."id") AND ("p"."user_id" = "auth"."uid"()))))))))));



CREATE POLICY "Allow authenticated access to public chatbots" ON "public"."chatbots" FOR SELECT TO "authenticated" USING (("visibility" = 'public'::"public"."chatbot_visibility"));



CREATE POLICY "Allow delete access to announcements for own chatbots" ON "public"."announcements" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."chatbots" "cb"
  WHERE (("cb"."id" = "announcements"."chatbot_id") AND ("cb"."user_id" = "auth"."uid"())))) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Allow delete access to content sources for own chatbots" ON "public"."chatbot_content_sources" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots" "cb"
  WHERE (("cb"."id" = "chatbot_content_sources"."chatbot_id") AND ("cb"."user_id" = "auth"."uid"())))));



CREATE POLICY "Allow individual delete access to own chatbots" ON "public"."chatbots" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual insert access for own chatbots" ON "public"."chatbots" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual insert access for own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Allow individual read access to own chatbots" ON "public"."chatbots" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read access to own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Allow individual update access to own chatbots" ON "public"."chatbots" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual update access to own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Allow insert access to announcements for own chatbots" ON "public"."announcements" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."chatbots" "cb"
  WHERE (("cb"."id" = "announcements"."chatbot_id") AND ("cb"."user_id" = "auth"."uid"())))) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Allow insert access to content sources for own chatbots" ON "public"."chatbot_content_sources" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chatbots" "cb"
  WHERE (("cb"."id" = "chatbot_content_sources"."chatbot_id") AND ("cb"."user_id" = "auth"."uid"())))));



CREATE POLICY "Allow limited profile search for user discovery" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow public read access to published chatbots" ON "public"."chatbots" FOR SELECT TO "authenticated", "anon" USING (("published" = true));



CREATE POLICY "Allow read access to announcements for own chatbots" ON "public"."announcements" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."chatbots" "cb"
  WHERE (("cb"."id" = "announcements"."chatbot_id") AND ("cb"."user_id" = "auth"."uid"())))) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Allow read access to content sources for own chatbots" ON "public"."chatbot_content_sources" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots" "cb"
  WHERE (("cb"."id" = "chatbot_content_sources"."chatbot_id") AND ("cb"."user_id" = "auth"."uid"())))));



CREATE POLICY "Allow update access to announcements for own chatbots" ON "public"."announcements" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."chatbots" "cb"
  WHERE (("cb"."id" = "announcements"."chatbot_id") AND ("cb"."user_id" = "auth"."uid"())))) AND ("user_id" = "auth"."uid"()))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."chatbots" "cb"
  WHERE (("cb"."id" = "announcements"."chatbot_id") AND ("cb"."user_id" = "auth"."uid"())))) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Allow update access to content sources for own chatbots" ON "public"."chatbot_content_sources" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots" "cb"
  WHERE (("cb"."id" = "chatbot_content_sources"."chatbot_id") AND ("cb"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chatbots" "cb"
  WHERE (("cb"."id" = "chatbot_content_sources"."chatbot_id") AND ("cb"."user_id" = "auth"."uid"())))));



CREATE POLICY "Anyone can read active default themes" ON "public"."default_themes" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Chatbot owners can manage their content sources" ON "public"."chatbot_content_sources" USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."id" = "chatbot_content_sources"."chatbot_id") AND ("chatbots"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."id" = "chatbot_content_sources"."chatbot_id") AND ("chatbots"."user_id" = "auth"."uid"())))));



CREATE POLICY "Chatbot owners can view all messages for their chatbots" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."chatbots"
     JOIN "public"."chat_sessions" ON (("chatbots"."id" = "chat_sessions"."chatbot_id")))
  WHERE (("chat_sessions"."id" = "messages"."chat_session_id") AND ("chatbots"."user_id" = "auth"."uid"())))));



CREATE POLICY "Chatbot owners can view all sessions for their chatbots" ON "public"."chat_sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."id" = "chat_sessions"."chatbot_id") AND ("chatbots"."user_id" = "auth"."uid"())))));



CREATE POLICY "Default themes are viewable by everyone" ON "public"."default_themes" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Owners can create announcements for their chatbots" ON "public"."announcements" FOR INSERT WITH CHECK (("chatbot_id" IN ( SELECT "chatbots"."id"
   FROM "public"."chatbots"
  WHERE ("chatbots"."user_id" = "auth"."uid"()))));



CREATE POLICY "Owners can delete announcements for their chatbots" ON "public"."announcements" FOR DELETE USING (("chatbot_id" IN ( SELECT "chatbots"."id"
   FROM "public"."chatbots"
  WHERE ("chatbots"."user_id" = "auth"."uid"()))));



CREATE POLICY "Owners can delete feedback for their chatbots" ON "public"."chatbot_feedback" FOR DELETE USING (("chatbot_id" IN ( SELECT "chatbots"."id"
   FROM "public"."chatbots"
  WHERE ("chatbots"."user_id" = "auth"."uid"()))));



CREATE POLICY "Owners can manage permissions for their chatbots" ON "public"."chatbot_permissions" USING ((( SELECT "chatbots"."user_id"
   FROM "public"."chatbots"
  WHERE ("chatbots"."id" = "chatbot_permissions"."chatbot_id")) = "auth"."uid"())) WITH CHECK ((( SELECT "chatbots"."user_id"
   FROM "public"."chatbots"
  WHERE ("chatbots"."id" = "chatbot_permissions"."chatbot_id")) = "auth"."uid"()));



CREATE POLICY "Owners can update announcements for their chatbots" ON "public"."announcements" FOR UPDATE USING (("chatbot_id" IN ( SELECT "chatbots"."id"
   FROM "public"."chatbots"
  WHERE ("chatbots"."user_id" = "auth"."uid"()))));



CREATE POLICY "Owners can update feedback for their chatbots" ON "public"."chatbot_feedback" FOR UPDATE USING (("chatbot_id" IN ( SELECT "chatbots"."id"
   FROM "public"."chatbots"
  WHERE ("chatbots"."user_id" = "auth"."uid"()))));



CREATE POLICY "Owners can view announcements for their chatbots" ON "public"."announcements" FOR SELECT USING (("chatbot_id" IN ( SELECT "chatbots"."id"
   FROM "public"."chatbots"
  WHERE ("chatbots"."user_id" = "auth"."uid"()))));



CREATE POLICY "Owners can view feedback for their chatbots" ON "public"."chatbot_feedback" FOR SELECT USING (("chatbot_id" IN ( SELECT "chatbots"."id"
   FROM "public"."chatbots"
  WHERE ("chatbots"."user_id" = "auth"."uid"()))));



CREATE POLICY "Public chatbot content sources are readable by anyone" ON "public"."chatbot_content_sources" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."id" = "chatbot_content_sources"."chatbot_id") AND ("chatbots"."visibility" = ANY (ARRAY['public'::"public"."chatbot_visibility", 'shared'::"public"."chatbot_visibility"]))))));



CREATE POLICY "Service role can manage default themes" ON "public"."default_themes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Shared chatbot content sources are readable by permitted users" ON "public"."chatbot_content_sources" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."chatbot_permissions"
  WHERE (("chatbot_permissions"."chatbot_id" = "chatbot_content_sources"."chatbot_id") AND ("chatbot_permissions"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create associations for their chatbots" ON "public"."chatbot_skill_associations" FOR INSERT WITH CHECK (("chatbot_id" IN ( SELECT "chatbots"."id"
   FROM "public"."chatbots"
  WHERE ("chatbots"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create chatbot integrations" ON "public"."chatbot_integrations" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."id" = "chatbot_integrations"."chatbot_id") AND ("chatbots"."user_id" = "auth"."uid"())))) AND (EXISTS ( SELECT 1
   FROM "public"."connected_integrations"
  WHERE (("connected_integrations"."id" = "chatbot_integrations"."integration_id") AND ("connected_integrations"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create messages (including anonymous)" ON "public"."messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR (("auth"."uid"() IS NULL) AND ("user_id" IS NULL))));



CREATE POLICY "Users can create sessions (including anonymous)" ON "public"."chat_sessions" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR (("auth"."uid"() IS NULL) AND ("user_id" IS NULL))));



CREATE POLICY "Users can create their own custom themes" ON "public"."user_custom_themes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own skills" ON "public"."skills" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete associations for their chatbots" ON "public"."chatbot_skill_associations" FOR DELETE USING (("chatbot_id" IN ( SELECT "chatbots"."id"
   FROM "public"."chatbots"
  WHERE ("chatbots"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their chatbot integrations" ON "public"."chatbot_integrations" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."id" = "chatbot_integrations"."chatbot_id") AND ("chatbots"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own chatbot folders" ON "public"."folders" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."id" = "folders"."chatbot_id") AND ("chatbots"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own custom themes" ON "public"."user_custom_themes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own messages" ON "public"."messages" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own sessions" ON "public"."chat_sessions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own skills" ON "public"."skills" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own tasks" ON "public"."tasks" FOR DELETE USING ((("auth"."uid"())::"text" = "user_id"));



CREATE POLICY "Users can insert folders for their own chatbots" ON "public"."folders" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."id" = "folders"."chatbot_id") AND ("chatbots"."user_id" = "auth"."uid"())))) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can insert their own tasks" ON "public"."tasks" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = "user_id"));



CREATE POLICY "Users can read their own custom themes" ON "public"."user_custom_themes" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update associations for their chatbots" ON "public"."chatbot_skill_associations" FOR UPDATE USING (("chatbot_id" IN ( SELECT "chatbots"."id"
   FROM "public"."chatbots"
  WHERE ("chatbots"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their chatbot integrations" ON "public"."chatbot_integrations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."id" = "chatbot_integrations"."chatbot_id") AND ("chatbots"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own chatbot folders" ON "public"."folders" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."id" = "folders"."chatbot_id") AND ("chatbots"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own custom themes" ON "public"."user_custom_themes" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own messages" ON "public"."messages" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own sessions" ON "public"."chat_sessions" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own skills" ON "public"."skills" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own tasks" ON "public"."tasks" FOR UPDATE USING ((("auth"."uid"())::"text" = "user_id"));



CREATE POLICY "Users can view associations for their chatbots" ON "public"."chatbot_skill_associations" FOR SELECT USING (("chatbot_id" IN ( SELECT "chatbots"."id"
   FROM "public"."chatbots"
  WHERE ("chatbots"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their chatbot integrations" ON "public"."chatbot_integrations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."id" = "chatbot_integrations"."chatbot_id") AND ("chatbots"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own chatbot folders" ON "public"."folders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."id" = "folders"."chatbot_id") AND ("chatbots"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own messages" ON "public"."messages" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own permissions" ON "public"."chatbot_permissions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own sessions (including anonymous)" ON "public"."chat_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own skills and built-in skills" ON "public"."skills" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("user_id" IS NULL)));



CREATE POLICY "Users can view their own tasks" ON "public"."tasks" FOR SELECT USING ((("auth"."uid"())::"text" = "user_id"));



ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chatbot_channels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chatbot_channels_user_access" ON "public"."chatbot_channels" USING (("auth"."uid"() = ( SELECT "chatbots"."user_id"
   FROM "public"."chatbots"
  WHERE ("chatbots"."id" = "chatbot_channels"."chatbot_id"))));



ALTER TABLE "public"."chatbot_content_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chatbot_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chatbot_integrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chatbot_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chatbot_skill_associations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chatbots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."connected_integrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "connected_integrations_user_access" ON "public"."connected_integrations" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."default_themes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_chunks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oauth_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "oauth_codes_service_access" ON "public"."oauth_codes" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."skills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."slack_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_custom_themes" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";















































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."cleanup_expired_oauth_codes"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_oauth_codes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_oauth_codes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_google_drive_content"("integration_id_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_google_drive_content"("integration_id_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_google_drive_content"("integration_id_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_rate_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_rate_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_rate_limits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_discord_bot_token"("integration_id_in" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_discord_bot_token"("integration_id_in" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_discord_bot_token"("integration_id_in" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_discord_user_token"("integration_id_in" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_discord_user_token"("integration_id_in" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_discord_user_token"("integration_id_in" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_google_access_token"("integration_id_in" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_google_access_token"("integration_id_in" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_google_access_token"("integration_id_in" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_google_refresh_token"("integration_id_in" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_google_refresh_token"("integration_id_in" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_google_refresh_token"("integration_id_in" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_notion_access_token"("integration_id_in" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_notion_access_token"("integration_id_in" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_notion_access_token"("integration_id_in" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_notion_bot_id"("integration_id_in" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_notion_bot_id"("integration_id_in" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_notion_bot_id"("integration_id_in" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_slack_bot_token"("integration_id_in" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_slack_bot_token"("integration_id_in" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_slack_bot_token"("integration_id_in" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_slack_user_token"("integration_id_in" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_slack_user_token"("integration_id_in" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_slack_user_token"("integration_id_in" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."encrypt_discord_credentials"("bot_token_in" "text", "user_token_in" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."encrypt_discord_credentials"("bot_token_in" "text", "user_token_in" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."encrypt_discord_credentials"("bot_token_in" "text", "user_token_in" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."encrypt_google_credentials"("access_token_in" "text", "refresh_token_in" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."encrypt_google_credentials"("access_token_in" "text", "refresh_token_in" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."encrypt_google_credentials"("access_token_in" "text", "refresh_token_in" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."encrypt_notion_credentials"("access_token_in" "text", "bot_id_in" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."encrypt_notion_credentials"("access_token_in" "text", "bot_id_in" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."encrypt_notion_credentials"("access_token_in" "text", "bot_id_in" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."encrypt_slack_credentials"("bot_token_in" "text", "signing_secret_in" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."encrypt_slack_credentials"("bot_token_in" "text", "signing_secret_in" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."encrypt_slack_credentials"("bot_token_in" "text", "signing_secret_in" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ingestion_source_stats"("chatbot_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_ingestion_source_stats"("chatbot_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ingestion_source_stats"("chatbot_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_rate_limit_counter"("p_chatbot_id" "uuid", "p_identifier" "text", "p_identifier_type" "text", "p_window_type" "text", "p_window_start" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_rate_limit_counter"("p_chatbot_id" "uuid", "p_identifier" "text", "p_identifier_type" "text", "p_window_type" "text", "p_window_start" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_rate_limit_counter"("p_chatbot_id" "uuid", "p_identifier" "text", "p_identifier_type" "text", "p_window_type" "text", "p_window_start" timestamp with time zone) TO "service_role";















GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_chatbot_integrations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_chatbot_integrations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_chatbot_integrations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_folders_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_folders_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_folders_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_session_timestamp_on_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_session_timestamp_on_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_session_timestamp_on_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_skill_execution_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_skill_execution_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_skill_execution_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";






























GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."chat_sessions" TO "anon";
GRANT ALL ON TABLE "public"."chat_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."chatbot_channels" TO "anon";
GRANT ALL ON TABLE "public"."chatbot_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."chatbot_channels" TO "service_role";



GRANT ALL ON TABLE "public"."chatbot_content_sources" TO "anon";
GRANT ALL ON TABLE "public"."chatbot_content_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."chatbot_content_sources" TO "service_role";



GRANT ALL ON TABLE "public"."chatbot_feedback" TO "anon";
GRANT ALL ON TABLE "public"."chatbot_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."chatbot_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."chatbot_integrations" TO "anon";
GRANT ALL ON TABLE "public"."chatbot_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."chatbot_integrations" TO "service_role";



GRANT ALL ON TABLE "public"."chatbot_permissions" TO "anon";
GRANT ALL ON TABLE "public"."chatbot_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."chatbot_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."chatbot_skill_associations" TO "anon";
GRANT ALL ON TABLE "public"."chatbot_skill_associations" TO "authenticated";
GRANT ALL ON TABLE "public"."chatbot_skill_associations" TO "service_role";



GRANT ALL ON TABLE "public"."chatbots" TO "anon";
GRANT ALL ON TABLE "public"."chatbots" TO "authenticated";
GRANT ALL ON TABLE "public"."chatbots" TO "service_role";



GRANT ALL ON TABLE "public"."connected_integrations" TO "anon";
GRANT ALL ON TABLE "public"."connected_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."connected_integrations" TO "service_role";



GRANT ALL ON TABLE "public"."default_themes" TO "anon";
GRANT ALL ON TABLE "public"."default_themes" TO "authenticated";
GRANT ALL ON TABLE "public"."default_themes" TO "service_role";



GRANT ALL ON TABLE "public"."document_chunks" TO "anon";
GRANT ALL ON TABLE "public"."document_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."document_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."folders" TO "anon";
GRANT ALL ON TABLE "public"."folders" TO "authenticated";
GRANT ALL ON TABLE "public"."folders" TO "service_role";



GRANT ALL ON TABLE "public"."google_drive_content_view" TO "anon";
GRANT ALL ON TABLE "public"."google_drive_content_view" TO "authenticated";
GRANT ALL ON TABLE "public"."google_drive_content_view" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."oauth_codes" TO "anon";
GRANT ALL ON TABLE "public"."oauth_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."oauth_codes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limit_tracking" TO "anon";
GRANT ALL ON TABLE "public"."rate_limit_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limit_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."skill_executions" TO "anon";
GRANT ALL ON TABLE "public"."skill_executions" TO "authenticated";
GRANT ALL ON TABLE "public"."skill_executions" TO "service_role";



GRANT ALL ON TABLE "public"."skills" TO "anon";
GRANT ALL ON TABLE "public"."skills" TO "authenticated";
GRANT ALL ON TABLE "public"."skills" TO "service_role";



GRANT ALL ON TABLE "public"."slack_users" TO "anon";
GRANT ALL ON TABLE "public"."slack_users" TO "authenticated";
GRANT ALL ON TABLE "public"."slack_users" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."user_custom_themes" TO "anon";
GRANT ALL ON TABLE "public"."user_custom_themes" TO "authenticated";
GRANT ALL ON TABLE "public"."user_custom_themes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
