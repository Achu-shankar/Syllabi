alter table "public"."chat_sessions" drop constraint "chat_sessions_channel_check";

alter table "public"."chat_sessions" drop constraint "chat_sessions_source_check";

CREATE UNIQUE INDEX voice_assistant_chatbots_account_chatbot_key ON public.voice_assistant_chatbots USING btree (alexa_account_id, chatbot_id);

alter table "public"."voice_assistant_chatbots" add constraint "voice_assistant_chatbots_account_chatbot_key" UNIQUE using index "voice_assistant_chatbots_account_chatbot_key";

alter table "public"."chat_sessions" add constraint "chat_sessions_channel_check" CHECK (((channel)::text = ANY (ARRAY[('web'::character varying)::text, ('embedded'::character varying)::text, ('slack'::character varying)::text, ('discord'::character varying)::text, ('whatsapp'::character varying)::text, ('api'::character varying)::text, ('teams'::character varying)::text, ('alexa'::character varying)::text]))) not valid;

alter table "public"."chat_sessions" validate constraint "chat_sessions_channel_check";

alter table "public"."chat_sessions" add constraint "chat_sessions_source_check" CHECK (((source)::text = ANY ((ARRAY['full'::character varying, 'embedded'::character varying])::text[]))) not valid;

alter table "public"."chat_sessions" validate constraint "chat_sessions_source_check";


