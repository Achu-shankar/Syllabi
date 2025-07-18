-- ================================================
-- Add Embedded Chatbot Analytics Support
-- ================================================
-- This migration adds columns to track embedded vs full chatbot usage

-- Add new columns to chat_sessions for embedded analytics
ALTER TABLE public.chat_sessions 
  ADD COLUMN source VARCHAR(20) DEFAULT 'full' CHECK (source IN ('full', 'embedded')),
  ADD COLUMN referrer TEXT,
  ADD COLUMN embedded_config JSONB;

-- Add comments for documentation
COMMENT ON COLUMN chat_sessions.source IS 'Source of the chat session: full (regular chatbot) or embedded';
COMMENT ON COLUMN chat_sessions.referrer IS 'Referrer URL for embedded sessions (which website embedded the chatbot)';
COMMENT ON COLUMN chat_sessions.embedded_config IS 'Configuration options specific to embedded chatbot sessions';

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_source ON public.chat_sessions(source);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_referrer ON public.chat_sessions(referrer);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_source_chatbot ON public.chat_sessions(source, chatbot_id);

-- Update existing sessions to have 'full' source (they're all full chatbot sessions)
UPDATE public.chat_sessions SET source = 'full' WHERE source IS NULL;

-- Make source column NOT NULL now that we've set defaults
ALTER TABLE public.chat_sessions ALTER COLUMN source SET NOT NULL; 