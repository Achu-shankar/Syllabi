ALTER TABLE public.voice_assistant_chatbots
ADD CONSTRAINT voice_assistant_chatbots_account_chatbot_key UNIQUE (alexa_account_id, chatbot_id); 