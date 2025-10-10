-- ================================================
-- Skills System Migration
-- ================================================
-- This migration adds support for chatbot skills (actions) functionality
-- Compatible with existing chatbot and content source structure

-- ================================================
-- 1. CHATBOT_SKILLS TABLE
-- ================================================
-- Stores individual skills that chatbots can perform

CREATE TABLE IF NOT EXISTS "public"."chatbot_skills" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "chatbot_id" UUID NOT NULL REFERENCES "public"."chatbots"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skill_type" TEXT NOT NULL DEFAULT 'webhook' CHECK (skill_type IN ('webhook', 'builtin', 'integration')),
    "configuration" JSONB DEFAULT '{}'::jsonb,
    "function_schema" JSONB NOT NULL,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "execution_count" INTEGER DEFAULT 0 NOT NULL,
    "last_executed_at" TIMESTAMPTZ NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add table and column comments
COMMENT ON TABLE "public"."chatbot_skills" IS 'Stores skills (actions) that chatbots can execute';
COMMENT ON COLUMN "public"."chatbot_skills"."chatbot_id" IS 'The chatbot this skill belongs to';
COMMENT ON COLUMN "public"."chatbot_skills"."name" IS 'Human-readable name for the skill (e.g., "Book Meeting")';
COMMENT ON COLUMN "public"."chatbot_skills"."description" IS 'Description of what this skill does';
COMMENT ON COLUMN "public"."chatbot_skills"."skill_type" IS 'Type of skill: webhook, builtin, or integration';
COMMENT ON COLUMN "public"."chatbot_skills"."configuration" IS 'Skill-specific configuration (webhook URL, headers, etc.)';
COMMENT ON COLUMN "public"."chatbot_skills"."function_schema" IS 'OpenAI function calling schema for this skill';
COMMENT ON COLUMN "public"."chatbot_skills"."is_active" IS 'Whether this skill is currently enabled';
COMMENT ON COLUMN "public"."chatbot_skills"."execution_count" IS 'Number of times this skill has been executed';
COMMENT ON COLUMN "public"."chatbot_skills"."last_executed_at" IS 'Timestamp of last execution';

-- ================================================
-- 2. SKILL_EXECUTIONS TABLE
-- ================================================
-- Logs skill execution attempts for debugging and analytics

CREATE TABLE IF NOT EXISTS "public"."skill_executions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "skill_id" UUID NOT NULL REFERENCES "public"."chatbot_skills"("id") ON DELETE CASCADE,
    "chat_session_id" UUID NULL REFERENCES "public"."chat_sessions"("id") ON DELETE SET NULL,
    "user_id" UUID NULL REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    "execution_status" TEXT NOT NULL DEFAULT 'pending' CHECK (execution_status IN ('pending', 'success', 'error', 'timeout')),
    "input_parameters" JSONB NULL,
    "output_result" JSONB NULL,
    "error_message" TEXT NULL,
    "execution_time_ms" INTEGER NULL,
    "triggered_from" TEXT DEFAULT 'chat' CHECK (triggered_from IN ('chat', 'test', 'slack', 'discord', 'api')),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add table and column comments
COMMENT ON TABLE "public"."skill_executions" IS 'Logs all skill execution attempts for debugging and analytics';
COMMENT ON COLUMN "public"."skill_executions"."skill_id" IS 'The skill that was executed';
COMMENT ON COLUMN "public"."skill_executions"."chat_session_id" IS 'Chat session if executed from chat (nullable for API calls)';
COMMENT ON COLUMN "public"."skill_executions"."user_id" IS 'User who triggered the execution (nullable for anonymous)';
COMMENT ON COLUMN "public"."skill_executions"."execution_status" IS 'Whether the skill execution succeeded or failed';
COMMENT ON COLUMN "public"."skill_executions"."input_parameters" IS 'Parameters passed to the skill';
COMMENT ON COLUMN "public"."skill_executions"."output_result" IS 'Result returned by the skill';
COMMENT ON COLUMN "public"."skill_executions"."error_message" IS 'Error message if execution failed';
COMMENT ON COLUMN "public"."skill_executions"."execution_time_ms" IS 'How long the execution took in milliseconds';
COMMENT ON COLUMN "public"."skill_executions"."triggered_from" IS 'Where the execution was triggered from';

-- ================================================
-- 3. INTEGRATION_CONNECTIONS TABLE
-- ================================================
-- Stores third-party integration credentials and settings

CREATE TABLE IF NOT EXISTS "public"."integration_connections" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "chatbot_id" UUID NOT NULL REFERENCES "public"."chatbots"("id") ON DELETE CASCADE,
    "integration_type" TEXT NOT NULL CHECK (integration_type IN ('slack', 'discord', 'zapier', 'calendly', 'stripe', 'webhook')),
    "connection_name" TEXT NOT NULL,
    "credentials" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "settings" JSONB DEFAULT '{}'::jsonb,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "last_tested_at" TIMESTAMPTZ NULL,
    "test_status" TEXT NULL CHECK (test_status IN ('success', 'error', 'pending')),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add table and column comments
COMMENT ON TABLE "public"."integration_connections" IS 'Stores third-party integration credentials and settings';
COMMENT ON COLUMN "public"."integration_connections"."chatbot_id" IS 'The chatbot this integration belongs to';
COMMENT ON COLUMN "public"."integration_connections"."integration_type" IS 'Type of integration (slack, discord, etc.)';
COMMENT ON COLUMN "public"."integration_connections"."connection_name" IS 'User-defined name for this connection';
COMMENT ON COLUMN "public"."integration_connections"."credentials" IS 'Encrypted credentials for the integration';
COMMENT ON COLUMN "public"."integration_connections"."settings" IS 'Integration-specific settings';
COMMENT ON COLUMN "public"."integration_connections"."is_active" IS 'Whether this integration is currently active';
COMMENT ON COLUMN "public"."integration_connections"."last_tested_at" IS 'When the connection was last tested';
COMMENT ON COLUMN "public"."integration_connections"."test_status" IS 'Result of last connection test';

-- ================================================
-- 4. INDEXES FOR PERFORMANCE
-- ================================================

-- Chatbot Skills Indexes
CREATE INDEX IF NOT EXISTS "idx_chatbot_skills_chatbot_id" ON "public"."chatbot_skills" USING btree ("chatbot_id");
CREATE INDEX IF NOT EXISTS "idx_chatbot_skills_skill_type" ON "public"."chatbot_skills" USING btree ("skill_type");
CREATE INDEX IF NOT EXISTS "idx_chatbot_skills_is_active" ON "public"."chatbot_skills" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "idx_chatbot_skills_execution_count" ON "public"."chatbot_skills" USING btree ("execution_count" DESC);

-- Skill Executions Indexes
CREATE INDEX IF NOT EXISTS "idx_skill_executions_skill_id" ON "public"."skill_executions" USING btree ("skill_id");
CREATE INDEX IF NOT EXISTS "idx_skill_executions_chat_session_id" ON "public"."skill_executions" USING btree ("chat_session_id");
CREATE INDEX IF NOT EXISTS "idx_skill_executions_user_id" ON "public"."skill_executions" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_skill_executions_status" ON "public"."skill_executions" USING btree ("execution_status");
CREATE INDEX IF NOT EXISTS "idx_skill_executions_created_at" ON "public"."skill_executions" USING btree ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_skill_executions_triggered_from" ON "public"."skill_executions" USING btree ("triggered_from");

-- Integration Connections Indexes
CREATE INDEX IF NOT EXISTS "idx_integration_connections_chatbot_id" ON "public"."integration_connections" USING btree ("chatbot_id");
CREATE INDEX IF NOT EXISTS "idx_integration_connections_type" ON "public"."integration_connections" USING btree ("integration_type");
CREATE INDEX IF NOT EXISTS "idx_integration_connections_is_active" ON "public"."integration_connections" USING btree ("is_active");

-- ================================================
-- 5. UPDATE TRIGGERS
-- ================================================

-- Set up automatic updated_at triggers for new tables
CREATE OR REPLACE TRIGGER "set_chatbot_skills_updated_at" 
    BEFORE UPDATE ON "public"."chatbot_skills" 
    FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();

CREATE OR REPLACE TRIGGER "set_integration_connections_updated_at" 
    BEFORE UPDATE ON "public"."integration_connections" 
    FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();

-- Trigger to update skill execution count and last_executed_at
CREATE OR REPLACE FUNCTION "public"."update_skill_execution_stats"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update execution count and timestamp when a skill execution is logged
    UPDATE public.chatbot_skills 
    SET 
        execution_count = execution_count + 1,
        last_executed_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.skill_id;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER "update_skill_stats_on_execution"
    AFTER INSERT ON "public"."skill_executions"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_skill_execution_stats"();

-- ================================================
-- 6. ROW LEVEL SECURITY
-- ================================================

-- Enable RLS on new tables
ALTER TABLE "public"."chatbot_skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."skill_executions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."integration_connections" ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only access their own chatbot's skills)
CREATE POLICY "Users can view their own chatbot skills" ON "public"."chatbot_skills"
    FOR SELECT USING (
        chatbot_id IN (
            SELECT id FROM public.chatbots WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own chatbot skills" ON "public"."chatbot_skills"
    FOR ALL USING (
        chatbot_id IN (
            SELECT id FROM public.chatbots WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own skill executions" ON "public"."skill_executions"
    FOR SELECT USING (
        skill_id IN (
            SELECT cs.id FROM public.chatbot_skills cs
            JOIN public.chatbots c ON cs.chatbot_id = c.id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "System can log skill executions" ON "public"."skill_executions"
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage their own integrations" ON "public"."integration_connections"
    FOR ALL USING (
        chatbot_id IN (
            SELECT id FROM public.chatbots WHERE user_id = auth.uid()
        )
    ); 