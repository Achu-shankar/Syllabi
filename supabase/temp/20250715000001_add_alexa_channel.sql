-- Add 'alexa' to the allowed channels in chat_sessions
ALTER TABLE public.chat_sessions 
DROP CONSTRAINT chat_sessions_channel_check;

ALTER TABLE public.chat_sessions 
ADD CONSTRAINT chat_sessions_channel_check 
CHECK (((channel)::text = ANY ((ARRAY['web'::character varying, 'embedded'::character varying, 'slack'::character varying, 'discord'::character varying, 'whatsapp'::character varying, 'api'::character varying, 'teams'::character varying, 'alexa'::character varying])::text[]))); 