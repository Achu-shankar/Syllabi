-- Create chatbot feedback table

CREATE TABLE IF NOT EXISTS chatbot_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_id uuid NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous
  session_id text, -- For anonymous user tracking
  feedback_type text NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'improvement', 'question', 'other')),
  rating integer CHECK (rating >= 1 AND rating <= 5), -- Optional 1-5 stars
  subject text, -- Optional short title
  message text NOT NULL,
  status text DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  creator_response text, -- Creator's response (optional)
  responded_at timestamptz,
  metadata jsonb, -- Browser, device, URL, etc
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_chatbot_id ON chatbot_feedback(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON chatbot_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON chatbot_feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON chatbot_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON chatbot_feedback(created_at DESC);

-- Add RLS policies
ALTER TABLE chatbot_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Chatbot owners can view all feedback for their chatbots
CREATE POLICY "Owners can view feedback for their chatbots"
  ON chatbot_feedback
  FOR SELECT
  USING (
    chatbot_id IN (
      SELECT id FROM chatbots WHERE user_id = auth.uid()
    )
  );

-- Policy: Chatbot owners can update feedback (status, response)
CREATE POLICY "Owners can update feedback for their chatbots"
  ON chatbot_feedback
  FOR UPDATE
  USING (
    chatbot_id IN (
      SELECT id FROM chatbots WHERE user_id = auth.uid()
    )
  );

-- Policy: Chatbot owners can delete feedback
CREATE POLICY "Owners can delete feedback for their chatbots"
  ON chatbot_feedback
  FOR DELETE
  USING (
    chatbot_id IN (
      SELECT id FROM chatbots WHERE user_id = auth.uid()
    )
  );

-- Policy: Anyone can insert feedback (authenticated or anonymous via service role)
-- Note: INSERT is handled via API with service role, no user-level INSERT policy needed

-- Add comments for documentation
COMMENT ON TABLE chatbot_feedback IS 'Stores user feedback for chatbots';
COMMENT ON COLUMN chatbot_feedback.chatbot_id IS 'The chatbot this feedback is for';
COMMENT ON COLUMN chatbot_feedback.user_id IS 'User who submitted feedback (NULL for anonymous)';
COMMENT ON COLUMN chatbot_feedback.session_id IS 'Session ID for anonymous users';
COMMENT ON COLUMN chatbot_feedback.feedback_type IS 'Type of feedback: bug, feature, improvement, question, other';
COMMENT ON COLUMN chatbot_feedback.rating IS 'Optional 1-5 star rating';
COMMENT ON COLUMN chatbot_feedback.subject IS 'Optional short title/subject';
COMMENT ON COLUMN chatbot_feedback.message IS 'Main feedback message';
COMMENT ON COLUMN chatbot_feedback.status IS 'Status: new, in_progress, resolved, closed';
COMMENT ON COLUMN chatbot_feedback.creator_response IS 'Response from chatbot creator';
COMMENT ON COLUMN chatbot_feedback.metadata IS 'Additional metadata (browser, device, etc)';
