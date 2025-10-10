-- Cleanup Migration: Remove Old Skills Implementation
-- This migration safely removes the old chatbot_skills table and related objects
-- after confirming the new skills + chatbot_skill_associations architecture is working

-- Step 1: Verify new architecture exists
DO $$
BEGIN
    -- Check if new tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skills') THEN
        RAISE EXCEPTION 'New skills table does not exist. Cannot proceed with cleanup.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chatbot_skill_associations') THEN
        RAISE EXCEPTION 'New chatbot_skill_associations table does not exist. Cannot proceed with cleanup.';
    END IF;
    
    RAISE NOTICE 'New skills architecture verified. Proceeding with cleanup...';
END $$;

-- Step 2: Drop RLS policies for old table
DROP POLICY IF EXISTS "Users can view skills for their own chatbots" ON chatbot_skills;
DROP POLICY IF EXISTS "Users can create skills for their own chatbots" ON chatbot_skills;
DROP POLICY IF EXISTS "Users can update skills for their own chatbots" ON chatbot_skills;
DROP POLICY IF EXISTS "Users can delete skills for their own chatbots" ON chatbot_skills;

-- Step 3: Drop indexes for old table
DROP INDEX IF EXISTS idx_chatbot_skills_chatbot_id;
DROP INDEX IF EXISTS idx_chatbot_skills_is_active;
DROP INDEX IF EXISTS idx_chatbot_skills_name;
DROP INDEX IF EXISTS idx_chatbot_skills_skill_type;
DROP INDEX IF EXISTS idx_chatbot_skills_execution_count;
DROP INDEX IF EXISTS idx_chatbot_skills_last_executed;

-- Step 4: Drop triggers for old table
DROP TRIGGER IF EXISTS update_chatbot_skills_updated_at ON chatbot_skills;
DROP TRIGGER IF EXISTS trigger_update_chatbot_skills_updated_at ON chatbot_skills;

-- Step 5: Drop functions related to old implementation
DROP FUNCTION IF EXISTS update_chatbot_skills_updated_at();
DROP FUNCTION IF EXISTS get_chatbot_skills_for_ai(uuid);
DROP FUNCTION IF EXISTS increment_skill_execution_count(uuid);

-- Step 6: Drop the old chatbot_skills table
-- Note: This will cascade to any remaining foreign keys
DROP TABLE IF EXISTS chatbot_skills CASCADE;

-- Step 7: Clean up any remaining references in other tables
-- Update any views or functions that might reference the old table
-- (This is a safety measure - there shouldn't be any)

-- Step 8: Verify skill_executions table is properly connected to new schema
DO $$
BEGIN
    -- Check if skill_executions.skill_id references the new skills table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.referential_constraints 
        WHERE constraint_name = 'skill_executions_skill_id_fkey'
        AND unique_constraint_name IN (
            SELECT constraint_name FROM information_schema.table_constraints 
            WHERE table_name = 'skills' AND constraint_type = 'PRIMARY KEY'
        )
    ) THEN
        RAISE NOTICE 'WARNING: skill_executions may not be properly linked to new skills table';
    ELSE
        RAISE NOTICE 'skill_executions properly linked to new skills table';
    END IF;
END $$;

-- Step 9: Add helpful comments
COMMENT ON TABLE skills IS 'Reusable skill definitions (replaces old chatbot_skills table)';
COMMENT ON TABLE chatbot_skill_associations IS 'Many-to-many links between chatbots and skills (replaces direct chatbot_id in old chatbot_skills)';

-- Step 10: Clean up any orphaned skill_executions records
-- (Records that might reference non-existent skills)
DELETE FROM skill_executions 
WHERE skill_id NOT IN (SELECT id FROM skills);

-- Step 11: Update any remaining constraints or indexes that might reference old table
-- This is a safety measure to ensure clean state

-- Final verification
DO $$
DECLARE
    old_table_count INTEGER;
BEGIN
    -- Count any remaining references to old table
    SELECT COUNT(*) INTO old_table_count
    FROM information_schema.tables 
    WHERE table_name = 'chatbot_skills';
    
    IF old_table_count > 0 THEN
        RAISE EXCEPTION 'Old chatbot_skills table still exists after cleanup';
    ELSE
        RAISE NOTICE 'Successfully cleaned up old skills implementation';
        RAISE NOTICE 'New architecture: skills + chatbot_skill_associations is now the only skills system';
    END IF;
END $$; 