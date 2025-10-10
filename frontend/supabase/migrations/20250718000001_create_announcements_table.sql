-- Create announcements table

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_id uuid NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcements_chatbot_id ON announcements(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_announcements_user_id ON announcements(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

-- Add RLS policies
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Chatbot owners can view all announcements for their chatbots
CREATE POLICY "Owners can view announcements for their chatbots"
  ON announcements
  FOR SELECT
  USING (
    chatbot_id IN (
      SELECT id FROM chatbots WHERE user_id = auth.uid()
    )
  );

-- Policy: Chatbot owners can create announcements for their chatbots
CREATE POLICY "Owners can create announcements for their chatbots"
  ON announcements
  FOR INSERT
  WITH CHECK (
    chatbot_id IN (
      SELECT id FROM chatbots WHERE user_id = auth.uid()
    )
  );

-- Policy: Chatbot owners can update announcements for their chatbots
CREATE POLICY "Owners can update announcements for their chatbots"
  ON announcements
  FOR UPDATE
  USING (
    chatbot_id IN (
      SELECT id FROM chatbots WHERE user_id = auth.uid()
    )
  );

-- Policy: Chatbot owners can delete announcements for their chatbots
CREATE POLICY "Owners can delete announcements for their chatbots"
  ON announcements
  FOR DELETE
  USING (
    chatbot_id IN (
      SELECT id FROM chatbots WHERE user_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE announcements IS 'Stores announcements for chatbots';
COMMENT ON COLUMN announcements.chatbot_id IS 'The chatbot this announcement belongs to';
COMMENT ON COLUMN announcements.user_id IS 'User who created the announcement (chatbot owner)';
COMMENT ON COLUMN announcements.title IS 'Announcement title';
COMMENT ON COLUMN announcements.content IS 'Announcement content/message';
COMMENT ON COLUMN announcements.is_published IS 'Whether the announcement is published (visible to users)';
COMMENT ON COLUMN announcements.published_at IS 'When the announcement was first published';
