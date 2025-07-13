-- Create unified integrations table
CREATE TABLE IF NOT EXISTS public.connected_integrations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    integration_type text NOT NULL,
    credentials jsonb,
    metadata jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add constraints and indexes
ALTER TABLE public.connected_integrations ADD CONSTRAINT connected_integrations_pkey PRIMARY KEY (id);
ALTER TABLE public.connected_integrations ADD CONSTRAINT connected_integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX idx_connected_integrations_user_id ON public.connected_integrations USING btree (user_id);
CREATE INDEX idx_connected_integrations_type ON public.connected_integrations USING btree (integration_type);
CREATE INDEX idx_connected_integrations_user_type ON public.connected_integrations USING btree (user_id, integration_type);

-- Enable RLS
ALTER TABLE public.connected_integrations ENABLE row level security;

-- Create RLS policy (users can only access their own integrations)
CREATE POLICY "connected_integrations_user_access" ON public.connected_integrations
    AS permissive FOR all TO public
    USING ((auth.uid() = user_id));

-- Add updated_at trigger
CREATE TRIGGER update_connected_integrations_updated_at 
    BEFORE UPDATE ON public.connected_integrations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT DELETE ON TABLE public.connected_integrations TO anon;
GRANT INSERT ON TABLE public.connected_integrations TO anon;
GRANT REFERENCES ON TABLE public.connected_integrations TO anon;
GRANT SELECT ON TABLE public.connected_integrations TO anon;
GRANT TRIGGER ON TABLE public.connected_integrations TO anon;
GRANT TRUNCATE ON TABLE public.connected_integrations TO anon;
GRANT UPDATE ON TABLE public.connected_integrations TO anon;

GRANT DELETE ON TABLE public.connected_integrations TO authenticated;
GRANT INSERT ON TABLE public.connected_integrations TO authenticated;
GRANT REFERENCES ON TABLE public.connected_integrations TO authenticated;
GRANT SELECT ON TABLE public.connected_integrations TO authenticated;
GRANT TRIGGER ON TABLE public.connected_integrations TO authenticated;
GRANT TRUNCATE ON TABLE public.connected_integrations TO authenticated;
GRANT UPDATE ON TABLE public.connected_integrations TO authenticated;

GRANT DELETE ON TABLE public.connected_integrations TO service_role;
GRANT INSERT ON TABLE public.connected_integrations TO service_role;
GRANT REFERENCES ON TABLE public.connected_integrations TO service_role;
GRANT SELECT ON TABLE public.connected_integrations TO service_role;
GRANT TRIGGER ON TABLE public.connected_integrations TO service_role;
GRANT TRUNCATE ON TABLE public.connected_integrations TO service_role;
GRANT UPDATE ON TABLE public.connected_integrations TO service_role;

-- Migrate existing Slack data
INSERT INTO public.connected_integrations (user_id, integration_type, credentials, metadata, created_at)
SELECT 
    installed_by as user_id,
    'slack' as integration_type,
    jsonb_build_object(
        'bot_token', CASE WHEN bot_token IS NOT NULL THEN encode(bot_token, 'hex') ELSE null END,
        'signing_secret', CASE WHEN signing_secret IS NOT NULL THEN encode(signing_secret, 'hex') ELSE null END,
        'bot_user_id', bot_user_id,
        'scope', scope,
        'slack_authed_user_id', slack_authed_user_id
    ) as credentials,
    jsonb_build_object(
        'team_id', team_id,
        'team_name', COALESCE(team_name, ''),
        'original_id', id
    ) as metadata,
    created_at
FROM public.slack_workspaces
WHERE installed_by IS NOT NULL;

-- Migrate existing Discord data  
INSERT INTO public.connected_integrations (user_id, integration_type, credentials, metadata, created_at)
SELECT 
    installed_by_user_id as user_id,
    'discord' as integration_type,
    jsonb_build_object() as credentials, -- Discord doesn't store credentials in this table
    jsonb_build_object(
        'guild_id', guild_id,
        'guild_name', COALESCE(guild_name, ''),
        'original_id', id
    ) as metadata,
    created_at
FROM public.discord_guilds
WHERE installed_by_user_id IS NOT NULL;

-- Migrate existing Alexa data
INSERT INTO public.connected_integrations (user_id, integration_type, credentials, metadata, created_at)
SELECT 
    user_id,
    'alexa' as integration_type,
    jsonb_build_object() as credentials, -- Alexa doesn't store credentials, just account linking
    jsonb_build_object(
        'amazon_user_id', amazon_user_id,
        'original_id', id
    ) as metadata,
    created_at
FROM public.alexa_accounts
WHERE EXISTS (SELECT 1 FROM public.alexa_accounts aa WHERE aa.id = alexa_accounts.id);

-- Add a mapping table to track old IDs to new IDs for the next migration step
-- This will help us update the chatbot mapping tables
CREATE TEMP TABLE integration_id_mapping AS
SELECT 
    'slack' as integration_type,
    sw.id as old_id,
    ci.id as new_integration_id
FROM public.slack_workspaces sw
JOIN public.connected_integrations ci ON (
    ci.user_id = sw.installed_by 
    AND ci.integration_type = 'slack' 
    AND ci.metadata->>'original_id' = sw.id::text
)
UNION ALL
SELECT 
    'discord' as integration_type,
    dg.id as old_id,
    ci.id as new_integration_id
FROM public.discord_guilds dg
JOIN public.connected_integrations ci ON (
    ci.user_id = dg.installed_by_user_id 
    AND ci.integration_type = 'discord' 
    AND ci.metadata->>'original_id' = dg.id::text
)
UNION ALL
SELECT 
    'alexa' as integration_type,
    aa.id as old_id,
    ci.id as new_integration_id
FROM public.alexa_accounts aa
JOIN public.connected_integrations ci ON (
    ci.user_id = aa.user_id 
    AND ci.integration_type = 'alexa' 
    AND ci.metadata->>'original_id' = aa.id::text
);

-- Display migration summary for verification
DO $$
DECLARE
    slack_count integer;
    discord_count integer;
    alexa_count integer;
    total_migrated integer;
BEGIN
    SELECT COUNT(*) INTO slack_count FROM public.connected_integrations WHERE integration_type = 'slack';
    SELECT COUNT(*) INTO discord_count FROM public.connected_integrations WHERE integration_type = 'discord';
    SELECT COUNT(*) INTO alexa_count FROM public.connected_integrations WHERE integration_type = 'alexa';
    SELECT COUNT(*) INTO total_migrated FROM public.connected_integrations;
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE 'Slack integrations migrated: %', slack_count;
    RAISE NOTICE 'Discord integrations migrated: %', discord_count;
    RAISE NOTICE 'Alexa integrations migrated: %', alexa_count;
    RAISE NOTICE 'Total integrations in new table: %', total_migrated;
END $$; 