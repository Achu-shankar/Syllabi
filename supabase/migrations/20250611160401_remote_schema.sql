create type "public"."chatbot_role" as enum ('editor', 'viewer');

create type "public"."chatbot_visibility" as enum ('private', 'public', 'shared');

drop policy "Users can create their own chat sessions" on "public"."chat_sessions";

drop policy "Users can delete their own chat sessions" on "public"."chat_sessions";

drop policy "Users can update their own chat sessions" on "public"."chat_sessions";

drop policy "Users can view their own chat sessions" on "public"."chat_sessions";

drop policy "Users can create their own messages" on "public"."messages";

drop policy "Users can update their own messages" on "public"."messages";

create table "public"."chatbot_permissions" (
    "id" uuid not null default gen_random_uuid(),
    "chatbot_id" uuid not null,
    "user_id" uuid not null,
    "role" chatbot_role not null default 'viewer'::chatbot_role,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."chatbot_permissions" enable row level security;

alter table "public"."chat_sessions" add column "chatbot_id" uuid not null;

alter table "public"."chat_sessions" alter column "user_id" drop not null;

alter table "public"."chatbots" add column "visibility" chatbot_visibility not null default 'private'::chatbot_visibility;

alter table "public"."messages" add column "token_count" integer not null default 0;

alter table "public"."messages" alter column "user_id" drop not null;

CREATE UNIQUE INDEX chatbot_permissions_chatbot_id_user_id_key ON public.chatbot_permissions USING btree (chatbot_id, user_id);

CREATE UNIQUE INDEX chatbot_permissions_pkey ON public.chatbot_permissions USING btree (id);

CREATE INDEX idx_permissions_chatbot_id ON public.chatbot_permissions USING btree (chatbot_id);

CREATE INDEX idx_permissions_user_id ON public.chatbot_permissions USING btree (user_id);

alter table "public"."chatbot_permissions" add constraint "chatbot_permissions_pkey" PRIMARY KEY using index "chatbot_permissions_pkey";

alter table "public"."chat_sessions" add constraint "fk_chat_sessions_chatbot_id" FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE not valid;

alter table "public"."chat_sessions" validate constraint "fk_chat_sessions_chatbot_id";

alter table "public"."chatbot_permissions" add constraint "chatbot_permissions_chatbot_id_user_id_key" UNIQUE using index "chatbot_permissions_chatbot_id_user_id_key";

alter table "public"."chatbot_permissions" add constraint "fk_permissions_chatbot_id" FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE not valid;

alter table "public"."chatbot_permissions" validate constraint "fk_permissions_chatbot_id";

alter table "public"."chatbot_permissions" add constraint "fk_permissions_user_id" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."chatbot_permissions" validate constraint "fk_permissions_user_id";

grant delete on table "public"."chatbot_permissions" to "anon";

grant insert on table "public"."chatbot_permissions" to "anon";

grant references on table "public"."chatbot_permissions" to "anon";

grant select on table "public"."chatbot_permissions" to "anon";

grant trigger on table "public"."chatbot_permissions" to "anon";

grant truncate on table "public"."chatbot_permissions" to "anon";

grant update on table "public"."chatbot_permissions" to "anon";

grant delete on table "public"."chatbot_permissions" to "authenticated";

grant insert on table "public"."chatbot_permissions" to "authenticated";

grant references on table "public"."chatbot_permissions" to "authenticated";

grant select on table "public"."chatbot_permissions" to "authenticated";

grant trigger on table "public"."chatbot_permissions" to "authenticated";

grant truncate on table "public"."chatbot_permissions" to "authenticated";

grant update on table "public"."chatbot_permissions" to "authenticated";

grant delete on table "public"."chatbot_permissions" to "service_role";

grant insert on table "public"."chatbot_permissions" to "service_role";

grant references on table "public"."chatbot_permissions" to "service_role";

grant select on table "public"."chatbot_permissions" to "service_role";

grant trigger on table "public"."chatbot_permissions" to "service_role";

grant truncate on table "public"."chatbot_permissions" to "service_role";

grant update on table "public"."chatbot_permissions" to "service_role";

create policy "Users can create sessions (including anonymous)"
on "public"."chat_sessions"
as permissive
for insert
to public
with check (((auth.uid() = user_id) OR ((auth.uid() IS NULL) AND (user_id IS NULL))));


create policy "Users can delete their own sessions"
on "public"."chat_sessions"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can update their own sessions"
on "public"."chat_sessions"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Users can view their own sessions (including anonymous)"
on "public"."chat_sessions"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Chatbot owners can manage their content sources"
on "public"."chatbot_content_sources"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM chatbots
  WHERE ((chatbots.id = chatbot_content_sources.chatbot_id) AND (chatbots.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM chatbots
  WHERE ((chatbots.id = chatbot_content_sources.chatbot_id) AND (chatbots.user_id = auth.uid())))));


create policy "Public chatbot content sources are readable by anyone"
on "public"."chatbot_content_sources"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM chatbots
  WHERE ((chatbots.id = chatbot_content_sources.chatbot_id) AND (chatbots.visibility = ANY (ARRAY['public'::chatbot_visibility, 'shared'::chatbot_visibility]))))));


create policy "Shared chatbot content sources are readable by permitted users"
on "public"."chatbot_content_sources"
as permissive
for select
to public
using (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM chatbot_permissions
  WHERE ((chatbot_permissions.chatbot_id = chatbot_content_sources.chatbot_id) AND (chatbot_permissions.user_id = auth.uid()))))));


create policy "Owners can manage permissions for their chatbots"
on "public"."chatbot_permissions"
as permissive
for all
to public
using ((( SELECT chatbots.user_id
   FROM chatbots
  WHERE (chatbots.id = chatbot_permissions.chatbot_id)) = auth.uid()))
with check ((( SELECT chatbots.user_id
   FROM chatbots
  WHERE (chatbots.id = chatbot_permissions.chatbot_id)) = auth.uid()));


create policy "Users can view their own permissions"
on "public"."chatbot_permissions"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "Users can create messages (including anonymous)"
on "public"."messages"
as permissive
for insert
to public
with check (((auth.uid() = user_id) OR ((auth.uid() IS NULL) AND (user_id IS NULL))));


create policy "Users can update their own messages"
on "public"."messages"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



