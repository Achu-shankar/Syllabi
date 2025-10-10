-- Migration: Add RLS policies for anonymous access to public chatbots
-- This allows anonymous users to read/write to public chatbot data when embedded

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous access to messages for public chatbots" ON "public"."messages";
DROP POLICY IF EXISTS "Allow anonymous insert to messages for public chatbots" ON "public"."messages";
DROP POLICY IF EXISTS "Allow anonymous access to chat_sessions for public chatbots" ON "public"."chat_sessions";
DROP POLICY IF EXISTS "Allow anonymous insert to chat_sessions for public chatbots" ON "public"."chat_sessions";
DROP POLICY IF EXISTS "Allow anonymous update to chat_sessions for public chatbots" ON "public"."chat_sessions";
DROP POLICY IF EXISTS "Allow anonymous access to document_chunks for public chatbots" ON "public"."document_chunks";
DROP POLICY IF EXISTS "Allow anonymous access to chatbot_content_sources for public chatbots" ON "public"."chatbot_content_sources";
DROP POLICY IF EXISTS "Allow anonymous access to public chatbots" ON "public"."chatbots";

-- Messages: Allow anonymous access if the chatbot (via chat_sessions) is public
create policy "Allow anonymous access to messages for public chatbots"
  ON "public"."messages"
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM chat_sessions cs
      JOIN chatbots c ON c.id = cs.chatbot_id
      WHERE cs.id = messages.chat_session_id
        AND c.visibility = 'public'
    )
  );

create policy "Allow anonymous insert to messages for public chatbots"
  ON "public"."messages"
  AS PERMISSIVE
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM chat_sessions cs
      JOIN chatbots c ON c.id = cs.chatbot_id
      WHERE cs.id = messages.chat_session_id
        AND c.visibility = 'public'
    )
  );

-- Chat Sessions: Allow anonymous access for public chatbots
create policy "Allow anonymous access to chat_sessions for public chatbots"
  ON "public"."chat_sessions"
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM chatbots c
      WHERE c.id = chat_sessions.chatbot_id
        AND c.visibility = 'public'
    )
  );

create policy "Allow anonymous insert to chat_sessions for public chatbots"
  ON "public"."chat_sessions"
  AS PERMISSIVE
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM chatbots c
      WHERE c.id = chat_sessions.chatbot_id
        AND c.visibility = 'public'
    )
  );

create policy "Allow anonymous update to chat_sessions for public chatbots"
  ON "public"."chat_sessions"
  AS PERMISSIVE
  FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM chatbots c
      WHERE c.id = chat_sessions.chatbot_id
        AND c.visibility = 'public'
    )
  );

-- Document Chunks: Allow anonymous access for public chatbots
create policy "Allow anonymous access to document_chunks for public chatbots"
  ON "public"."document_chunks"
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM chatbots c
      WHERE c.id = document_chunks.chatbot_id
        AND c.visibility = 'public'
    )
  );

-- Content References: Allow anonymous access for public chatbots
create policy "Allow anonymous access to chatbot_content_sources for public chatbots"
  ON "public"."chatbot_content_sources"
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM chatbots c
      WHERE c.id = chatbot_content_sources.chatbot_id
        AND c.visibility = 'public'
    )
  );

-- Chatbots: Allow anonymous access to public chatbot basic info
create policy "Allow anonymous access to public chatbots"
  ON "public"."chatbots"
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (
    visibility = 'public'
  ); 