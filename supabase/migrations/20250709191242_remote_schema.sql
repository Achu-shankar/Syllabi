alter table "public"."chat_sessions" drop constraint "chat_sessions_channel_check";

alter table "public"."chat_sessions" drop constraint "chat_sessions_source_check";

create table "public"."discord_guild_chatbots" (
    "id" uuid not null default uuid_generate_v4(),
    "guild_id" uuid not null,
    "chatbot_id" uuid not null,
    "is_default" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."discord_guild_chatbots" enable row level security;

create table "public"."discord_guilds" (
    "id" uuid not null default uuid_generate_v4(),
    "guild_id" text not null,
    "guild_name" text,
    "installed_by_user_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."discord_guilds" enable row level security;

alter table "public"."slack_workspace_chatbots" add column "slash_command" text;

alter table "public"."slack_workspaces" add column "bot_user_id" text;

alter table "public"."slack_workspaces" add column "installed_by" uuid;

alter table "public"."slack_workspaces" add column "scope" text;

alter table "public"."slack_workspaces" add column "slack_authed_user_id" text;

CREATE UNIQUE INDEX discord_guild_chatbots_guild_id_chatbot_id_key ON public.discord_guild_chatbots USING btree (guild_id, chatbot_id);

CREATE UNIQUE INDEX discord_guild_chatbots_pkey ON public.discord_guild_chatbots USING btree (id);

CREATE UNIQUE INDEX discord_guilds_guild_id_key ON public.discord_guilds USING btree (guild_id);

CREATE UNIQUE INDEX discord_guilds_pkey ON public.discord_guilds USING btree (id);

CREATE UNIQUE INDEX unique_slash_command_per_workspace ON public.slack_workspace_chatbots USING btree (workspace_id, slash_command);

alter table "public"."discord_guild_chatbots" add constraint "discord_guild_chatbots_pkey" PRIMARY KEY using index "discord_guild_chatbots_pkey";

alter table "public"."discord_guilds" add constraint "discord_guilds_pkey" PRIMARY KEY using index "discord_guilds_pkey";

alter table "public"."discord_guild_chatbots" add constraint "discord_guild_chatbots_chatbot_id_fkey" FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE not valid;

alter table "public"."discord_guild_chatbots" validate constraint "discord_guild_chatbots_chatbot_id_fkey";

alter table "public"."discord_guild_chatbots" add constraint "discord_guild_chatbots_guild_id_chatbot_id_key" UNIQUE using index "discord_guild_chatbots_guild_id_chatbot_id_key";

alter table "public"."discord_guild_chatbots" add constraint "discord_guild_chatbots_guild_id_fkey" FOREIGN KEY (guild_id) REFERENCES discord_guilds(id) ON DELETE CASCADE not valid;

alter table "public"."discord_guild_chatbots" validate constraint "discord_guild_chatbots_guild_id_fkey";

alter table "public"."discord_guilds" add constraint "discord_guilds_guild_id_key" UNIQUE using index "discord_guilds_guild_id_key";

alter table "public"."slack_workspace_chatbots" add constraint "unique_slash_command_per_workspace" UNIQUE using index "unique_slash_command_per_workspace";

alter table "public"."slack_workspaces" add constraint "slack_workspaces_installed_by_fkey" FOREIGN KEY (installed_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."slack_workspaces" validate constraint "slack_workspaces_installed_by_fkey";

alter table "public"."chat_sessions" add constraint "chat_sessions_channel_check" CHECK (((channel)::text = ANY ((ARRAY['web'::character varying, 'embedded'::character varying, 'slack'::character varying, 'discord'::character varying, 'whatsapp'::character varying, 'api'::character varying, 'teams'::character varying])::text[]))) not valid;

alter table "public"."chat_sessions" validate constraint "chat_sessions_channel_check";

alter table "public"."chat_sessions" add constraint "chat_sessions_source_check" CHECK (((source)::text = ANY ((ARRAY['full'::character varying, 'embedded'::character varying])::text[]))) not valid;

alter table "public"."chat_sessions" validate constraint "chat_sessions_source_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.decrypt_slack_credentials(team_id_in text)
 RETURNS TABLE(id uuid, bot_token text, default_chatbot_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select
    sw.id,
    pgp_sym_decrypt(
      sw.bot_token,
      '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'          -- same key you used in encrypt
    )::text,
    sw.default_chatbot_id
  from public.slack_workspaces sw
  where sw.team_id = team_id_in;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.encrypt_slack_credentials(bot_token_in text, signing_secret_in text)
 RETURNS TABLE(bot_token_out bytea, signing_secret_out bytea)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select
    pgp_sym_encrypt(bot_token_in,      '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R'),
    pgp_sym_encrypt(signing_secret_in, '5zk_?Tq]qwV.zug2xqD8Wmv8R?PxDB]R');
end;
$function$
;

grant delete on table "public"."discord_guild_chatbots" to "anon";

grant insert on table "public"."discord_guild_chatbots" to "anon";

grant references on table "public"."discord_guild_chatbots" to "anon";

grant select on table "public"."discord_guild_chatbots" to "anon";

grant trigger on table "public"."discord_guild_chatbots" to "anon";

grant truncate on table "public"."discord_guild_chatbots" to "anon";

grant update on table "public"."discord_guild_chatbots" to "anon";

grant delete on table "public"."discord_guild_chatbots" to "authenticated";

grant insert on table "public"."discord_guild_chatbots" to "authenticated";

grant references on table "public"."discord_guild_chatbots" to "authenticated";

grant select on table "public"."discord_guild_chatbots" to "authenticated";

grant trigger on table "public"."discord_guild_chatbots" to "authenticated";

grant truncate on table "public"."discord_guild_chatbots" to "authenticated";

grant update on table "public"."discord_guild_chatbots" to "authenticated";

grant delete on table "public"."discord_guild_chatbots" to "service_role";

grant insert on table "public"."discord_guild_chatbots" to "service_role";

grant references on table "public"."discord_guild_chatbots" to "service_role";

grant select on table "public"."discord_guild_chatbots" to "service_role";

grant trigger on table "public"."discord_guild_chatbots" to "service_role";

grant truncate on table "public"."discord_guild_chatbots" to "service_role";

grant update on table "public"."discord_guild_chatbots" to "service_role";

grant delete on table "public"."discord_guilds" to "anon";

grant insert on table "public"."discord_guilds" to "anon";

grant references on table "public"."discord_guilds" to "anon";

grant select on table "public"."discord_guilds" to "anon";

grant trigger on table "public"."discord_guilds" to "anon";

grant truncate on table "public"."discord_guilds" to "anon";

grant update on table "public"."discord_guilds" to "anon";

grant delete on table "public"."discord_guilds" to "authenticated";

grant insert on table "public"."discord_guilds" to "authenticated";

grant references on table "public"."discord_guilds" to "authenticated";

grant select on table "public"."discord_guilds" to "authenticated";

grant trigger on table "public"."discord_guilds" to "authenticated";

grant truncate on table "public"."discord_guilds" to "authenticated";

grant update on table "public"."discord_guilds" to "authenticated";

grant delete on table "public"."discord_guilds" to "service_role";

grant insert on table "public"."discord_guilds" to "service_role";

grant references on table "public"."discord_guilds" to "service_role";

grant select on table "public"."discord_guilds" to "service_role";

grant trigger on table "public"."discord_guilds" to "service_role";

grant truncate on table "public"."discord_guilds" to "service_role";

grant update on table "public"."discord_guilds" to "service_role";

create policy "Users can manage Discord links for their own chatbots"
on "public"."discord_guild_chatbots"
as permissive
for all
to public
using ((( SELECT chatbots.user_id
   FROM chatbots
  WHERE (chatbots.id = discord_guild_chatbots.chatbot_id)) = auth.uid()))
with check ((( SELECT chatbots.user_id
   FROM chatbots
  WHERE (chatbots.id = discord_guild_chatbots.chatbot_id)) = auth.uid()));


create policy "Users can view Discord guilds linked to their chatbots"
on "public"."discord_guilds"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (discord_guild_chatbots dgc
     JOIN chatbots c ON ((dgc.chatbot_id = c.id)))
  WHERE ((dgc.guild_id = discord_guilds.id) AND (c.user_id = auth.uid())))));



