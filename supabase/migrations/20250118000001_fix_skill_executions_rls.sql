-- Fix skill_executions RLS policy for new skills schema
-- The current policy checks against chatbot_skills table, but we now use skills + chatbot_skill_associations

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can create skill executions for their chatbots" ON skill_executions;

-- Create new policy that works with the new schema
CREATE POLICY "Users can create skill executions for their skills" ON skill_executions
    AS PERMISSIVE FOR INSERT TO public
    WITH CHECK (
        -- Check if user owns the chatbot that has this skill associated
        EXISTS (
            SELECT 1 
            FROM chatbot_skill_associations csa
            JOIN chatbots c ON csa.chatbot_id = c.id
            WHERE csa.skill_id = skill_executions.skill_id 
            AND c.user_id = auth.uid()
        )
        OR
        -- Fallback: Check against old chatbot_skills table for backward compatibility
        EXISTS (
            SELECT 1
            FROM chatbot_skills cs
            JOIN chatbots c ON cs.chatbot_id = c.id
            WHERE cs.id = skill_executions.skill_id
            AND c.user_id = auth.uid()
        )
    );

-- Also create read policy for consistency
CREATE POLICY "Users can view skill executions for their skills" ON skill_executions
    AS PERMISSIVE FOR SELECT TO public
    USING (
        -- Check if user owns the chatbot that has this skill associated
        EXISTS (
            SELECT 1 
            FROM chatbot_skill_associations csa
            JOIN chatbots c ON csa.chatbot_id = c.id
            WHERE csa.skill_id = skill_executions.skill_id 
            AND c.user_id = auth.uid()
        )
        OR
        -- Fallback: Check against old chatbot_skills table for backward compatibility
        EXISTS (
            SELECT 1
            FROM chatbot_skills cs
            JOIN chatbots c ON cs.chatbot_id = c.id
            WHERE cs.id = skill_executions.skill_id
            AND c.user_id = auth.uid()
        )
    ); 