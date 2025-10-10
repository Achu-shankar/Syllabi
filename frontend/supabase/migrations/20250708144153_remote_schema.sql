alter table "public"."chat_sessions" drop constraint "chat_sessions_source_check";

create table "public"."slack_users" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "slack_user_id" text not null,
    "supabase_user_id" uuid,
    "created_at" timestamp with time zone default now()
);


alter table "public"."slack_users" enable row level security;

create table "public"."slack_workspace_chatbots" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "chatbot_id" uuid not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."slack_workspace_chatbots" enable row level security;

create table "public"."slack_workspaces" (
    "id" uuid not null default gen_random_uuid(),
    "team_id" text not null,
    "team_name" text,
    "bot_token" text not null,
    "signing_secret" text not null,
    "default_chatbot_id" uuid,
    "created_at" timestamp with time zone default now()
);


alter table "public"."slack_workspaces" enable row level security;

alter table "public"."chat_sessions" add column "channel" character varying(20) not null default 'web'::character varying;

alter table "public"."chat_sessions" add column "external_session_id" text;

alter table "public"."chat_sessions" add column "workspace_id" uuid;

CREATE INDEX idx_chat_sessions_channel ON public.chat_sessions USING btree (channel);

CREATE INDEX idx_chat_sessions_external_id ON public.chat_sessions USING btree (external_session_id);

CREATE INDEX idx_chat_sessions_workspace_id ON public.chat_sessions USING btree (workspace_id);

CREATE INDEX idx_slack_users_lookup ON public.slack_users USING btree (workspace_id, slack_user_id);

CREATE UNIQUE INDEX slack_users_pkey ON public.slack_users USING btree (id);

CREATE UNIQUE INDEX slack_users_workspace_id_slack_user_id_key ON public.slack_users USING btree (workspace_id, slack_user_id);

CREATE UNIQUE INDEX slack_workspace_chatbots_pkey ON public.slack_workspace_chatbots USING btree (id);

CREATE UNIQUE INDEX slack_workspace_chatbots_workspace_id_chatbot_id_key ON public.slack_workspace_chatbots USING btree (workspace_id, chatbot_id);

CREATE UNIQUE INDEX slack_workspaces_pkey ON public.slack_workspaces USING btree (id);

CREATE UNIQUE INDEX slack_workspaces_team_id_key ON public.slack_workspaces USING btree (team_id);

alter table "public"."slack_users" add constraint "slack_users_pkey" PRIMARY KEY using index "slack_users_pkey";

alter table "public"."slack_workspace_chatbots" add constraint "slack_workspace_chatbots_pkey" PRIMARY KEY using index "slack_workspace_chatbots_pkey";

alter table "public"."slack_workspaces" add constraint "slack_workspaces_pkey" PRIMARY KEY using index "slack_workspaces_pkey";

alter table "public"."chat_sessions" add constraint "chat_sessions_channel_check" CHECK (((channel)::text = ANY ((ARRAY['web'::character varying, 'embedded'::character varying, 'slack'::character varying, 'discord'::character varying, 'whatsapp'::character varying, 'api'::character varying, 'teams'::character varying])::text[]))) not valid;

alter table "public"."chat_sessions" validate constraint "chat_sessions_channel_check";

alter table "public"."chat_sessions" add constraint "chat_sessions_workspace_fkey" FOREIGN KEY (workspace_id) REFERENCES slack_workspaces(id) ON DELETE SET NULL not valid;

alter table "public"."chat_sessions" validate constraint "chat_sessions_workspace_fkey";

alter table "public"."slack_users" add constraint "slack_users_supabase_user_id_fkey" FOREIGN KEY (supabase_user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."slack_users" validate constraint "slack_users_supabase_user_id_fkey";

alter table "public"."slack_users" add constraint "slack_users_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES slack_workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."slack_users" validate constraint "slack_users_workspace_id_fkey";

alter table "public"."slack_users" add constraint "slack_users_workspace_id_slack_user_id_key" UNIQUE using index "slack_users_workspace_id_slack_user_id_key";

alter table "public"."slack_workspace_chatbots" add constraint "slack_workspace_chatbots_chatbot_id_fkey" FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE not valid;

alter table "public"."slack_workspace_chatbots" validate constraint "slack_workspace_chatbots_chatbot_id_fkey";

alter table "public"."slack_workspace_chatbots" add constraint "slack_workspace_chatbots_workspace_id_chatbot_id_key" UNIQUE using index "slack_workspace_chatbots_workspace_id_chatbot_id_key";

alter table "public"."slack_workspace_chatbots" add constraint "slack_workspace_chatbots_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES slack_workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."slack_workspace_chatbots" validate constraint "slack_workspace_chatbots_workspace_id_fkey";

alter table "public"."slack_workspaces" add constraint "slack_workspaces_default_chatbot_id_fkey" FOREIGN KEY (default_chatbot_id) REFERENCES chatbots(id) ON DELETE SET NULL not valid;

alter table "public"."slack_workspaces" validate constraint "slack_workspaces_default_chatbot_id_fkey";

alter table "public"."slack_workspaces" add constraint "slack_workspaces_team_id_key" UNIQUE using index "slack_workspaces_team_id_key";

alter table "public"."chat_sessions" add constraint "chat_sessions_source_check" CHECK (((source)::text = ANY ((ARRAY['full'::character varying, 'embedded'::character varying])::text[]))) not valid;

alter table "public"."chat_sessions" validate constraint "chat_sessions_source_check";

grant delete on table "public"."slack_users" to "anon";

grant insert on table "public"."slack_users" to "anon";

grant references on table "public"."slack_users" to "anon";

grant select on table "public"."slack_users" to "anon";

grant trigger on table "public"."slack_users" to "anon";

grant truncate on table "public"."slack_users" to "anon";

grant update on table "public"."slack_users" to "anon";

grant delete on table "public"."slack_users" to "authenticated";

grant insert on table "public"."slack_users" to "authenticated";

grant references on table "public"."slack_users" to "authenticated";

grant select on table "public"."slack_users" to "authenticated";

grant trigger on table "public"."slack_users" to "authenticated";

grant truncate on table "public"."slack_users" to "authenticated";

grant update on table "public"."slack_users" to "authenticated";

grant delete on table "public"."slack_users" to "service_role";

grant insert on table "public"."slack_users" to "service_role";

grant references on table "public"."slack_users" to "service_role";

grant select on table "public"."slack_users" to "service_role";

grant trigger on table "public"."slack_users" to "service_role";

grant truncate on table "public"."slack_users" to "service_role";

grant update on table "public"."slack_users" to "service_role";

grant delete on table "public"."slack_workspace_chatbots" to "anon";

grant insert on table "public"."slack_workspace_chatbots" to "anon";

grant references on table "public"."slack_workspace_chatbots" to "anon";

grant select on table "public"."slack_workspace_chatbots" to "anon";

grant trigger on table "public"."slack_workspace_chatbots" to "anon";

grant truncate on table "public"."slack_workspace_chatbots" to "anon";

grant update on table "public"."slack_workspace_chatbots" to "anon";

grant delete on table "public"."slack_workspace_chatbots" to "authenticated";

grant insert on table "public"."slack_workspace_chatbots" to "authenticated";

grant references on table "public"."slack_workspace_chatbots" to "authenticated";

grant select on table "public"."slack_workspace_chatbots" to "authenticated";

grant trigger on table "public"."slack_workspace_chatbots" to "authenticated";

grant truncate on table "public"."slack_workspace_chatbots" to "authenticated";

grant update on table "public"."slack_workspace_chatbots" to "authenticated";

grant delete on table "public"."slack_workspace_chatbots" to "service_role";

grant insert on table "public"."slack_workspace_chatbots" to "service_role";

grant references on table "public"."slack_workspace_chatbots" to "service_role";

grant select on table "public"."slack_workspace_chatbots" to "service_role";

grant trigger on table "public"."slack_workspace_chatbots" to "service_role";

grant truncate on table "public"."slack_workspace_chatbots" to "service_role";

grant update on table "public"."slack_workspace_chatbots" to "service_role";

grant delete on table "public"."slack_workspaces" to "anon";

grant insert on table "public"."slack_workspaces" to "anon";

grant references on table "public"."slack_workspaces" to "anon";

grant select on table "public"."slack_workspaces" to "anon";

grant trigger on table "public"."slack_workspaces" to "anon";

grant truncate on table "public"."slack_workspaces" to "anon";

grant update on table "public"."slack_workspaces" to "anon";

grant delete on table "public"."slack_workspaces" to "authenticated";

grant insert on table "public"."slack_workspaces" to "authenticated";

grant references on table "public"."slack_workspaces" to "authenticated";

grant select on table "public"."slack_workspaces" to "authenticated";

grant trigger on table "public"."slack_workspaces" to "authenticated";

grant truncate on table "public"."slack_workspaces" to "authenticated";

grant update on table "public"."slack_workspaces" to "authenticated";

grant delete on table "public"."slack_workspaces" to "service_role";

grant insert on table "public"."slack_workspaces" to "service_role";

grant references on table "public"."slack_workspaces" to "service_role";

grant select on table "public"."slack_workspaces" to "service_role";

grant trigger on table "public"."slack_workspaces" to "service_role";

grant truncate on table "public"."slack_workspaces" to "service_role";

grant update on table "public"."slack_workspaces" to "service_role";

create policy "Users can manage chatbot links for their workspaces"
on "public"."slack_workspace_chatbots"
as permissive
for all
to public
using ((chatbot_id IN ( SELECT chatbots.id
   FROM chatbots
  WHERE (chatbots.user_id = auth.uid()))));


create policy "Users can manage workspaces linked to their chatbots"
on "public"."slack_workspaces"
as permissive
for all
to public
using ((id IN ( SELECT swc.workspace_id
   FROM (slack_workspace_chatbots swc
     JOIN chatbots c ON ((swc.chatbot_id = c.id)))
  WHERE (c.user_id = auth.uid()))));



