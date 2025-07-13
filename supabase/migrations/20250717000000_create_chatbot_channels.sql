-- Create unified chatbot_channels table for linking chatbots to all channel types
CREATE TABLE IF NOT EXISTS public.chatbot_channels (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    chatbot_id uuid NOT NULL,
    integration_id uuid NULL, -- FK to connected_integrations.id (NULL for native channels like email/SMS)
    config jsonb NOT NULL DEFAULT '{}'::jsonb, -- Channel-specific settings
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add constraints
ALTER TABLE public.chatbot_channels ADD CONSTRAINT chatbot_channels_pkey PRIMARY KEY (id);
ALTER TABLE public.chatbot_channels ADD CONSTRAINT chatbot_channels_chatbot_id_fkey FOREIGN KEY (chatbot_id) REFERENCES public.chatbots(id) ON DELETE CASCADE;
ALTER TABLE public.chatbot_channels ADD CONSTRAINT chatbot_channels_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.connected_integrations(id) ON DELETE CASCADE;

-- Unique constraint: one link per chatbot per integration
ALTER TABLE public.chatbot_channels ADD CONSTRAINT unique_chatbot_channel UNIQUE (chatbot_id, integration_id);

-- Add indexes for performance
CREATE INDEX idx_chatbot_channels_chatbot_id ON public.chatbot_channels USING btree (chatbot_id);
CREATE INDEX idx_chatbot_channels_integration_id ON public.chatbot_channels USING btree (integration_id);

-- Enable RLS (users can only access links for their own chatbots)
ALTER TABLE public.chatbot_channels ENABLE row level security;

-- Create RLS policy
CREATE POLICY "chatbot_channels_user_access" ON public.chatbot_channels
    AS permissive FOR all TO public
    USING (auth.uid() = (SELECT user_id FROM public.chatbots WHERE id = chatbot_id));

-- Add updated_at trigger
CREATE TRIGGER update_chatbot_channels_updated_at 
    BEFORE UPDATE ON public.chatbot_channels 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT DELETE ON TABLE public.chatbot_channels TO anon;
GRANT INSERT ON TABLE public.chatbot_channels TO anon;
GRANT REFERENCES ON TABLE public.chatbot_channels TO anon;
GRANT SELECT ON TABLE public.chatbot_channels TO anon;
GRANT TRIGGER ON TABLE public.chatbot_channels TO anon;
GRANT TRUNCATE ON TABLE public.chatbot_channels TO anon;
GRANT UPDATE ON TABLE public.chatbot_channels TO anon;

GRANT DELETE ON TABLE public.chatbot_channels TO authenticated;
GRANT INSERT ON TABLE public.chatbot_channels TO authenticated;
GRANT REFERENCES ON TABLE public.chatbot_channels TO authenticated;
GRANT SELECT ON TABLE public.chatbot_channels TO authenticated;
GRANT TRIGGER ON TABLE public.chatbot_channels TO authenticated;
GRANT TRUNCATE ON TABLE public.chatbot_channels TO authenticated;
GRANT UPDATE ON TABLE public.chatbot_channels TO authenticated;

GRANT DELETE ON TABLE public.chatbot_channels TO service_role;
GRANT INSERT ON TABLE public.chatbot_channels TO service_role;
GRANT REFERENCES ON TABLE public.chatbot_channels TO service_role;
GRANT SELECT ON TABLE public.chatbot_channels TO service_role;
GRANT TRIGGER ON TABLE public.chatbot_channels TO service_role;
GRANT TRUNCATE ON TABLE public.chatbot_channels TO service_role;
GRANT UPDATE ON TABLE public.chatbot_channels TO service_role;

-- Migration summary
DO $$
BEGIN
    RAISE NOTICE 'chatbot_channels table created successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '- Unified linking for all channel types (Slack, Discord, Alexa, Teams, etc.)';
    RAISE NOTICE '- References connected_integrations for third-party channels';
    RAISE NOTICE '- Supports native channels (email/SMS) with NULL integration_id';
    RAISE NOTICE '- Flexible config JSONB for channel-specific settings';
    RAISE NOTICE '- Unique constraint per chatbot per integration';
    RAISE NOTICE '- RLS enabled for user isolation';
END $$; 