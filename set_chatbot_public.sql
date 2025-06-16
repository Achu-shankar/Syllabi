-- Set the test chatbot to public visibility
-- Replace 'cepm-bot' with your actual chatbot slug

UPDATE public.chatbots 
SET visibility = 'public' 
WHERE shareable_url_slug = 'cepm-bot';

-- Verify the update
SELECT id, name, shareable_url_slug, visibility 
FROM public.chatbots 
WHERE shareable_url_slug = 'cepm-bot'; 