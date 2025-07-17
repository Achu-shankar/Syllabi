-- Create chatbot_integrations table to associate chatbots with specific integrations
CREATE TABLE IF NOT EXISTS public.chatbot_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES public.connected_integrations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure one integration per type per chatbot (e.g., only one Slack integration per chatbot)
    CONSTRAINT unique_chatbot_integration_type UNIQUE (chatbot_id, integration_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chatbot_integrations_chatbot_id ON public.chatbot_integrations(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_integrations_integration_id ON public.chatbot_integrations(integration_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_chatbot_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chatbot_integrations_updated_at
    BEFORE UPDATE ON public.chatbot_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_chatbot_integrations_updated_at();

-- RLS Policies
ALTER TABLE public.chatbot_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only see integrations for chatbots they own
CREATE POLICY "Users can view their chatbot integrations" ON public.chatbot_integrations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chatbots 
            WHERE chatbots.id = chatbot_integrations.chatbot_id 
            AND chatbots.user_id = auth.uid()
        )
    );

-- Users can only create integrations for chatbots they own and integrations they own
CREATE POLICY "Users can create chatbot integrations" ON public.chatbot_integrations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chatbots 
            WHERE chatbots.id = chatbot_integrations.chatbot_id 
            AND chatbots.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.connected_integrations 
            WHERE connected_integrations.id = chatbot_integrations.integration_id 
            AND connected_integrations.user_id = auth.uid()
        )
    );

-- Users can only update integrations for chatbots they own
CREATE POLICY "Users can update their chatbot integrations" ON public.chatbot_integrations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.chatbots 
            WHERE chatbots.id = chatbot_integrations.chatbot_id 
            AND chatbots.user_id = auth.uid()
        )
    );

-- Users can only delete integrations for chatbots they own
CREATE POLICY "Users can delete their chatbot integrations" ON public.chatbot_integrations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.chatbots 
            WHERE chatbots.id = chatbot_integrations.chatbot_id 
            AND chatbots.user_id = auth.uid()
        )
    );

-- Add comment for documentation
COMMENT ON TABLE public.chatbot_integrations IS 'Associates chatbots with specific user integrations, allowing granular control over which integrations each chatbot can use'; 