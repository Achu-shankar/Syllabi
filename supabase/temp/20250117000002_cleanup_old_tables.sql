-- Migration to clean up old integration linking tables
-- These are no longer needed since we've migrated to the unified chatbot_channels system

-- Step 1: Drop all foreign key constraints first
ALTER TABLE IF EXISTS public.discord_guild_chatbots DROP CONSTRAINT IF EXISTS discord_guild_chatbots_chatbot_id_fkey;
ALTER TABLE IF EXISTS public.discord_guild_chatbots DROP CONSTRAINT IF EXISTS discord_guild_chatbots_guild_id_fkey;
ALTER TABLE IF EXISTS public.slack_workspace_chatbots DROP CONSTRAINT IF EXISTS slack_workspace_chatbots_chatbot_id_fkey;
ALTER TABLE IF EXISTS public.slack_workspace_chatbots DROP CONSTRAINT IF EXISTS slack_workspace_chatbots_workspace_id_fkey;
ALTER TABLE IF EXISTS public.voice_assistant_chatbots DROP CONSTRAINT IF EXISTS voice_assistant_chatbots_chatbot_id_fkey;
ALTER TABLE IF EXISTS public.voice_assistant_chatbots DROP CONSTRAINT IF EXISTS voice_assistant_chatbots_alexa_account_id_fkey;

-- Step 2: Drop any indexes that might be causing dependencies
DROP INDEX IF EXISTS public.discord_guild_chatbots_guild_id_chatbot_id_key;
DROP INDEX IF EXISTS public.discord_guild_chatbots_pkey;
DROP INDEX IF EXISTS public.unique_slash_command_per_workspace;

-- Step 3: Drop RLS policies
DROP POLICY IF EXISTS "Users can manage Discord links for their own chatbots" ON public.discord_guild_chatbots;
DROP POLICY IF EXISTS "Users can manage their own Slack workspace chatbot links" ON public.slack_workspace_chatbots;
DROP POLICY IF EXISTS "Users can manage their own voice assistant chatbot links" ON public.voice_assistant_chatbots;

-- Step 4: Drop the linking tables
DROP TABLE IF EXISTS public.discord_guild_chatbots CASCADE;
DROP TABLE IF EXISTS public.slack_workspace_chatbots CASCADE;
DROP TABLE IF EXISTS public.voice_assistant_chatbots CASCADE;

-- Step 5: Drop the old guild/workspace tables (these might still have dependencies)
-- First check if discord_guilds has any remaining dependencies
ALTER TABLE IF EXISTS public.discord_guilds DROP CONSTRAINT IF EXISTS discord_guilds_guild_id_key;
DROP INDEX IF EXISTS public.discord_guilds_guild_id_key;
DROP INDEX IF EXISTS public.discord_guilds_pkey;

-- Drop RLS policies on guild tables
DROP POLICY IF EXISTS "Users can view Discord guilds linked to their chatbots" ON public.discord_guilds;

-- Now drop the guild table
DROP TABLE IF EXISTS public.discord_guilds CASCADE;

-- For slack_workspaces, we need to be more careful as it might be used elsewhere
-- Let's check if it has any remaining references in the codebase
-- For now, we'll leave slack_workspaces as it might still be used for OAuth or other purposes

-- Clean up any remaining functions that reference old tables
DROP FUNCTION IF EXISTS public.decrypt_slack_credentials(text);

-- Add a comment to track this migration
COMMENT ON SCHEMA public IS 'Cleaned up old integration linking tables on 2025-01-17 - migrated to unified chatbot_channels system'; 