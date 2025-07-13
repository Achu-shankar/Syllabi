alter table "public"."chat_sessions" drop constraint "chat_sessions_channel_check";

alter table "public"."chat_sessions" drop constraint "chat_sessions_source_check";

alter table "public"."slack_workspaces" alter column "bot_token" drop not null;

alter table "public"."slack_workspaces" alter column "bot_token" set data type bytea using "bot_token"::bytea;

alter table "public"."slack_workspaces" alter column "signing_secret" drop not null;

alter table "public"."slack_workspaces" alter column "signing_secret" set data type bytea using "signing_secret"::bytea;

alter table "public"."chat_sessions" add constraint "chat_sessions_channel_check" CHECK (((channel)::text = ANY ((ARRAY['web'::character varying, 'embedded'::character varying, 'slack'::character varying, 'discord'::character varying, 'whatsapp'::character varying, 'api'::character varying, 'teams'::character varying])::text[]))) not valid;

alter table "public"."chat_sessions" validate constraint "chat_sessions_channel_check";

alter table "public"."chat_sessions" add constraint "chat_sessions_source_check" CHECK (((source)::text = ANY ((ARRAY['full'::character varying, 'embedded'::character varying])::text[]))) not valid;

alter table "public"."chat_sessions" validate constraint "chat_sessions_source_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.decrypt_slack_credentials(team_id_in text)
 RETURNS TABLE(id uuid, bot_token text, default_chatbot_id uuid)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        sw.id,
        pgp_sym_decrypt(sw.bot_token, current_setting('app.settings.pgcrypto_key')),
        sw.default_chatbot_id
    FROM
        public.slack_workspaces sw
    WHERE
        sw.team_id = team_id_in;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.encrypt_slack_credentials(bot_token_in text, signing_secret_in text)
 RETURNS TABLE(bot_token_out bytea, signing_secret_out bytea)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- This function requires the PGCRYPTO_KEY to be set in the environment
    -- for the PostgREST server, or you can hardcode it here (not recommended).
    -- Supabase handles this via Dashboard -> Settings -> Configuration -> Postgres
    RETURN QUERY
    SELECT
        pgp_sym_encrypt(bot_token_in, current_setting('app.settings.pgcrypto_key')),
        pgp_sym_encrypt(signing_secret_in, current_setting('app.settings.pgcrypto_key'));
END;
$function$
;

create policy "Users can create slack workspace with their own chatbot"
on "public"."slack_workspaces"
as permissive
for insert
to public
with check ((default_chatbot_id IN ( SELECT chatbots.id
   FROM chatbots
  WHERE (chatbots.user_id = auth.uid()))));


create policy "Users can read their slack workspaces"
on "public"."slack_workspaces"
as permissive
for select
to public
using ((default_chatbot_id IN ( SELECT chatbots.id
   FROM chatbots
  WHERE (chatbots.user_id = auth.uid()))));



