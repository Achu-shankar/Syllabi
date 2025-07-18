-- Update skill_executions foreign key to reference new skills table
-- Currently it references chatbot_skills.id, but we now use skills.id

-- Drop the existing foreign key constraint
ALTER TABLE skill_executions DROP CONSTRAINT IF EXISTS skill_executions_skill_id_fkey;

-- Add new foreign key constraint pointing to skills table
ALTER TABLE skill_executions ADD CONSTRAINT skill_executions_skill_id_fkey 
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE;

-- Update the comment to reflect the change
COMMENT ON COLUMN skill_executions.skill_id IS 'References skills.id in the new reusable skills schema'; 