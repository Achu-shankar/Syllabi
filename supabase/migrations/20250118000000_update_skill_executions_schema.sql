-- Update skill_executions table for new skills schema
-- This migration:
-- 1. Adds 'alexa' to allowed channel types
-- 2. Updates skill_executions to work with both old and new skills tables during transition

-- Add 'alexa' to the channel_type constraint
ALTER TABLE skill_executions DROP CONSTRAINT IF EXISTS skill_executions_channel_type_check;
ALTER TABLE skill_executions ADD CONSTRAINT skill_executions_channel_type_check 
    CHECK (channel_type = ANY (ARRAY['web'::text, 'embed'::text, 'slack'::text, 'discord'::text, 'api'::text, 'alexa'::text]));

-- Update the foreign key constraint to handle both old and new skills tables
-- For now, we'll keep the existing FK to chatbot_skills since we're in transition
-- Later, when we fully migrate, we can update this to reference the skills table

-- Add a comment to track the transition
COMMENT ON COLUMN skill_executions.skill_id IS 'References chatbot_skills.id during transition, will reference skills.id after full migration';

-- Add index for performance on channel_type
CREATE INDEX IF NOT EXISTS idx_skill_executions_channel_type ON skill_executions(channel_type); 