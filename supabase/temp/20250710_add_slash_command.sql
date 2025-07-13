ALTER TABLE public.slack_workspace_chatbots
ADD COLUMN slash_command TEXT;

COMMENT ON COLUMN public.slack_workspace_chatbots.slash_command IS 'The unique slash command name for this chatbot in the workspace (e.g., "hr-bot").';
 
-- Add a unique constraint to ensure no two chatbots in the same workspace have the same command
ALTER TABLE public.slack_workspace_chatbots
ADD CONSTRAINT unique_slash_command_per_workspace UNIQUE (workspace_id, slash_command); 