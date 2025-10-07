-- Create rate limiting table and functions

-- 1. Create rate_limit_tracking table
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_id uuid NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  identifier text NOT NULL,           -- user_id or session_id
  identifier_type text NOT NULL,      -- 'user' or 'session'
  window_type text NOT NULL,          -- 'hour' or 'day'
  window_start timestamptz NOT NULL,  -- Start of the current window
  message_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT rate_limit_tracking_unique UNIQUE(chatbot_id, identifier, identifier_type, window_type, window_start),
  CONSTRAINT rate_limit_tracking_identifier_type_check CHECK (identifier_type IN ('user', 'session')),
  CONSTRAINT rate_limit_tracking_window_type_check CHECK (window_type IN ('hour', 'day'))
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_tracking(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup ON rate_limit_tracking(chatbot_id, identifier, identifier_type, window_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_chatbot ON rate_limit_tracking(chatbot_id);

-- 3. Create function for atomic increment
CREATE OR REPLACE FUNCTION increment_rate_limit_counter(
  p_chatbot_id uuid,
  p_identifier text,
  p_identifier_type text,
  p_window_type text,
  p_window_start timestamptz
) RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

-- 4. Create cleanup function for old records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_tracking
  WHERE window_start < NOW() - INTERVAL '25 hours';
END;
$$ LANGUAGE plpgsql;

-- 5. Add default rate_limit_config to existing chatbots
UPDATE chatbots
SET rate_limit_config = jsonb_build_object(
  'enabled', false,
  'authenticated_users', jsonb_build_object(
    'messages_per_hour', 60,
    'messages_per_day', 200
  ),
  'anonymous_visitors', jsonb_build_object(
    'messages_per_hour', 20,
    'messages_per_day', 50
  )
)
WHERE rate_limit_config IS NULL;

-- 6. Add comment for documentation
COMMENT ON TABLE rate_limit_tracking IS 'Tracks rate limit usage for chatbots per user or session';
COMMENT ON COLUMN rate_limit_tracking.identifier IS 'Either user_id (for authenticated) or session_id (for anonymous)';
COMMENT ON COLUMN rate_limit_tracking.identifier_type IS 'Type of identifier: user or session';
COMMENT ON COLUMN rate_limit_tracking.window_type IS 'Time window type: hour or day';
COMMENT ON COLUMN rate_limit_tracking.window_start IS 'Start timestamp of the current rate limit window';
COMMENT ON COLUMN rate_limit_tracking.message_count IS 'Number of messages sent in this window';
