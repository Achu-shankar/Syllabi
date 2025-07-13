drop policy "Users can view Discord guilds linked to their chatbots" on "public"."discord_guilds";

alter table "public"."discord_guild_chatbots" drop constraint "discord_guild_chatbots_guild_id_fkey";

alter table "public"."chat_sessions" drop constraint "chat_sessions_channel_check";

alter table "public"."chat_sessions" drop constraint "chat_sessions_source_check";

alter table "public"."discord_guild_chatbots" drop constraint "discord_guild_chatbots_guild_id_chatbot_id_key";

drop index if exists "public"."discord_guild_chatbots_guild_id_chatbot_id_key";

create table "public"."alexa_accounts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "amazon_user_id" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."alexa_accounts" enable row level security;

create table "public"."oauth_codes" (
    "id" uuid not null default gen_random_uuid(),
    "code" text not null,
    "user_id" uuid not null,
    "client_id" text not null,
    "redirect_uri" text not null,
    "scope" text,
    "expires_at" timestamp with time zone not null,
    "used" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."oauth_codes" enable row level security;

create table "public"."voice_assistant_chatbots" (
    "id" uuid not null default gen_random_uuid(),
    "alexa_account_id" uuid not null,
    "chatbot_id" uuid not null,
    "trigger" text,
    "default_flag" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."voice_assistant_chatbots" enable row level security;

alter table "public"."discord_guild_chatbots" drop column "guild_id";

alter table "public"."discord_guild_chatbots" add column "guild_table_id" uuid not null;

alter table "public"."discord_guild_chatbots" add column "slash_command" text;

CREATE UNIQUE INDEX alexa_accounts_pkey ON public.alexa_accounts USING btree (id);

CREATE UNIQUE INDEX alexa_accounts_user_id_key ON public.alexa_accounts USING btree (user_id);

CREATE INDEX idx_alexa_accounts_amazon_user_id ON public.alexa_accounts USING btree (amazon_user_id);

CREATE INDEX idx_alexa_accounts_user_id ON public.alexa_accounts USING btree (user_id);

CREATE INDEX idx_oauth_codes_code ON public.oauth_codes USING btree (code);

CREATE INDEX idx_oauth_codes_expires_at ON public.oauth_codes USING btree (expires_at);

CREATE INDEX idx_voice_assistant_chatbots_alexa_account ON public.voice_assistant_chatbots USING btree (alexa_account_id);

CREATE INDEX idx_voice_assistant_chatbots_chatbot ON public.voice_assistant_chatbots USING btree (chatbot_id);

CREATE UNIQUE INDEX oauth_codes_code_key ON public.oauth_codes USING btree (code);

CREATE UNIQUE INDEX oauth_codes_pkey ON public.oauth_codes USING btree (id);

CREATE UNIQUE INDEX unique_default_per_account ON public.voice_assistant_chatbots USING btree (alexa_account_id, default_flag);

CREATE UNIQUE INDEX unique_slash_cmd_per_guild ON public.discord_guild_chatbots USING btree (guild_table_id, slash_command) WHERE (slash_command IS NOT NULL);

CREATE UNIQUE INDEX voice_assistant_chatbots_pkey ON public.voice_assistant_chatbots USING btree (id);

CREATE UNIQUE INDEX discord_guild_chatbots_guild_id_chatbot_id_key ON public.discord_guild_chatbots USING btree (guild_table_id, chatbot_id);

alter table "public"."alexa_accounts" add constraint "alexa_accounts_pkey" PRIMARY KEY using index "alexa_accounts_pkey";

alter table "public"."oauth_codes" add constraint "oauth_codes_pkey" PRIMARY KEY using index "oauth_codes_pkey";

alter table "public"."voice_assistant_chatbots" add constraint "voice_assistant_chatbots_pkey" PRIMARY KEY using index "voice_assistant_chatbots_pkey";

alter table "public"."alexa_accounts" add constraint "alexa_accounts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."alexa_accounts" validate constraint "alexa_accounts_user_id_fkey";

alter table "public"."alexa_accounts" add constraint "alexa_accounts_user_id_key" UNIQUE using index "alexa_accounts_user_id_key";

alter table "public"."discord_guild_chatbots" add constraint "discord_guild_chatbots_guild_table_id_fkey" FOREIGN KEY (guild_table_id) REFERENCES discord_guilds(id) ON DELETE CASCADE not valid;

alter table "public"."discord_guild_chatbots" validate constraint "discord_guild_chatbots_guild_table_id_fkey";

alter table "public"."oauth_codes" add constraint "oauth_codes_code_key" UNIQUE using index "oauth_codes_code_key";

alter table "public"."oauth_codes" add constraint "oauth_codes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."oauth_codes" validate constraint "oauth_codes_user_id_fkey";

alter table "public"."voice_assistant_chatbots" add constraint "unique_default_per_account" UNIQUE using index "unique_default_per_account" DEFERRABLE INITIALLY DEFERRED;

alter table "public"."voice_assistant_chatbots" add constraint "voice_assistant_chatbots_alexa_account_id_fkey" FOREIGN KEY (alexa_account_id) REFERENCES alexa_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."voice_assistant_chatbots" validate constraint "voice_assistant_chatbots_alexa_account_id_fkey";

alter table "public"."voice_assistant_chatbots" add constraint "voice_assistant_chatbots_chatbot_id_fkey" FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE not valid;

alter table "public"."voice_assistant_chatbots" validate constraint "voice_assistant_chatbots_chatbot_id_fkey";

alter table "public"."chat_sessions" add constraint "chat_sessions_channel_check" CHECK (((channel)::text = ANY ((ARRAY['web'::character varying, 'embedded'::character varying, 'slack'::character varying, 'discord'::character varying, 'whatsapp'::character varying, 'api'::character varying, 'teams'::character varying])::text[]))) not valid;

alter table "public"."chat_sessions" validate constraint "chat_sessions_channel_check";

alter table "public"."chat_sessions" add constraint "chat_sessions_source_check" CHECK (((source)::text = ANY ((ARRAY['full'::character varying, 'embedded'::character varying])::text[]))) not valid;

alter table "public"."chat_sessions" validate constraint "chat_sessions_source_check";

alter table "public"."discord_guild_chatbots" add constraint "discord_guild_chatbots_guild_id_chatbot_id_key" UNIQUE using index "discord_guild_chatbots_guild_id_chatbot_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_codes()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM oauth_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."alexa_accounts" to "anon";

grant insert on table "public"."alexa_accounts" to "anon";

grant references on table "public"."alexa_accounts" to "anon";

grant select on table "public"."alexa_accounts" to "anon";

grant trigger on table "public"."alexa_accounts" to "anon";

grant truncate on table "public"."alexa_accounts" to "anon";

grant update on table "public"."alexa_accounts" to "anon";

grant delete on table "public"."alexa_accounts" to "authenticated";

grant insert on table "public"."alexa_accounts" to "authenticated";

grant references on table "public"."alexa_accounts" to "authenticated";

grant select on table "public"."alexa_accounts" to "authenticated";

grant trigger on table "public"."alexa_accounts" to "authenticated";

grant truncate on table "public"."alexa_accounts" to "authenticated";

grant update on table "public"."alexa_accounts" to "authenticated";

grant delete on table "public"."alexa_accounts" to "service_role";

grant insert on table "public"."alexa_accounts" to "service_role";

grant references on table "public"."alexa_accounts" to "service_role";

grant select on table "public"."alexa_accounts" to "service_role";

grant trigger on table "public"."alexa_accounts" to "service_role";

grant truncate on table "public"."alexa_accounts" to "service_role";

grant update on table "public"."alexa_accounts" to "service_role";

grant delete on table "public"."oauth_codes" to "anon";

grant insert on table "public"."oauth_codes" to "anon";

grant references on table "public"."oauth_codes" to "anon";

grant select on table "public"."oauth_codes" to "anon";

grant trigger on table "public"."oauth_codes" to "anon";

grant truncate on table "public"."oauth_codes" to "anon";

grant update on table "public"."oauth_codes" to "anon";

grant delete on table "public"."oauth_codes" to "authenticated";

grant insert on table "public"."oauth_codes" to "authenticated";

grant references on table "public"."oauth_codes" to "authenticated";

grant select on table "public"."oauth_codes" to "authenticated";

grant trigger on table "public"."oauth_codes" to "authenticated";

grant truncate on table "public"."oauth_codes" to "authenticated";

grant update on table "public"."oauth_codes" to "authenticated";

grant delete on table "public"."oauth_codes" to "service_role";

grant insert on table "public"."oauth_codes" to "service_role";

grant references on table "public"."oauth_codes" to "service_role";

grant select on table "public"."oauth_codes" to "service_role";

grant trigger on table "public"."oauth_codes" to "service_role";

grant truncate on table "public"."oauth_codes" to "service_role";

grant update on table "public"."oauth_codes" to "service_role";

grant delete on table "public"."voice_assistant_chatbots" to "anon";

grant insert on table "public"."voice_assistant_chatbots" to "anon";

grant references on table "public"."voice_assistant_chatbots" to "anon";

grant select on table "public"."voice_assistant_chatbots" to "anon";

grant trigger on table "public"."voice_assistant_chatbots" to "anon";

grant truncate on table "public"."voice_assistant_chatbots" to "anon";

grant update on table "public"."voice_assistant_chatbots" to "anon";

grant delete on table "public"."voice_assistant_chatbots" to "authenticated";

grant insert on table "public"."voice_assistant_chatbots" to "authenticated";

grant references on table "public"."voice_assistant_chatbots" to "authenticated";

grant select on table "public"."voice_assistant_chatbots" to "authenticated";

grant trigger on table "public"."voice_assistant_chatbots" to "authenticated";

grant truncate on table "public"."voice_assistant_chatbots" to "authenticated";

grant update on table "public"."voice_assistant_chatbots" to "authenticated";

grant delete on table "public"."voice_assistant_chatbots" to "service_role";

grant insert on table "public"."voice_assistant_chatbots" to "service_role";

grant references on table "public"."voice_assistant_chatbots" to "service_role";

grant select on table "public"."voice_assistant_chatbots" to "service_role";

grant trigger on table "public"."voice_assistant_chatbots" to "service_role";

grant truncate on table "public"."voice_assistant_chatbots" to "service_role";

grant update on table "public"."voice_assistant_chatbots" to "service_role";

create policy "alexa_accounts_user_access"
on "public"."alexa_accounts"
as permissive
for all
to public
using ((auth.uid() = user_id));


create policy "oauth_codes_service_access"
on "public"."oauth_codes"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "voice_assistant_chatbots_user_access"
on "public"."voice_assistant_chatbots"
as permissive
for all
to public
using ((alexa_account_id IN ( SELECT alexa_accounts.id
   FROM alexa_accounts
  WHERE (alexa_accounts.user_id = auth.uid()))));


create policy "Users can view Discord guilds linked to their chatbots"
on "public"."discord_guilds"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (discord_guild_chatbots dgc
     JOIN chatbots c ON ((dgc.chatbot_id = c.id)))
  WHERE ((dgc.guild_table_id = discord_guilds.id) AND (c.user_id = auth.uid())))));


CREATE TRIGGER update_alexa_accounts_updated_at BEFORE UPDATE ON public.alexa_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_assistant_chatbots_updated_at BEFORE UPDATE ON public.voice_assistant_chatbots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


