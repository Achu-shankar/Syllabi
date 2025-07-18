create table "public"."chat_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "user_id" uuid not null,
    "chatbot_slug" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."chat_sessions" enable row level security;

create table "public"."messages" (
    "id" uuid not null default gen_random_uuid(),
    "message_id" text not null,
    "chat_session_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null,
    "content" text not null,
    "annotations" jsonb,
    "parts" jsonb,
    "experimental_attachments" jsonb,
    "metadata" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."messages" enable row level security;

CREATE UNIQUE INDEX chat_sessions_pkey ON public.chat_sessions USING btree (id);

CREATE INDEX idx_chat_sessions_chatbot_slug ON public.chat_sessions USING btree (chatbot_slug);

CREATE INDEX idx_chat_sessions_updated_at ON public.chat_sessions USING btree (updated_at DESC);

CREATE INDEX idx_chat_sessions_user_chatbot ON public.chat_sessions USING btree (user_id, chatbot_slug);

CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions USING btree (user_id);

CREATE INDEX idx_messages_chat_session_id ON public.messages USING btree (chat_session_id);

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);

CREATE INDEX idx_messages_message_id ON public.messages USING btree (message_id);

CREATE INDEX idx_messages_role ON public.messages USING btree (role);

CREATE INDEX idx_messages_session_created ON public.messages USING btree (chat_session_id, created_at);

CREATE INDEX idx_messages_user_id ON public.messages USING btree (user_id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

alter table "public"."chat_sessions" add constraint "chat_sessions_pkey" PRIMARY KEY using index "chat_sessions_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."chat_sessions" add constraint "chat_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."chat_sessions" validate constraint "chat_sessions_user_id_fkey";

alter table "public"."messages" add constraint "messages_chat_session_id_fkey" FOREIGN KEY (chat_session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_chat_session_id_fkey";

alter table "public"."messages" add constraint "messages_role_check" CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text, 'tool'::text]))) not valid;

alter table "public"."messages" validate constraint "messages_role_check";

alter table "public"."messages" add constraint "messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_session_timestamp_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Update the parent session's updated_at timestamp
    UPDATE chat_sessions 
    SET updated_at = NOW() 
    WHERE id = NEW.chat_session_id;
    
    RETURN NEW;
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

grant delete on table "public"."chat_sessions" to "anon";

grant insert on table "public"."chat_sessions" to "anon";

grant references on table "public"."chat_sessions" to "anon";

grant select on table "public"."chat_sessions" to "anon";

grant trigger on table "public"."chat_sessions" to "anon";

grant truncate on table "public"."chat_sessions" to "anon";

grant update on table "public"."chat_sessions" to "anon";

grant delete on table "public"."chat_sessions" to "authenticated";

grant insert on table "public"."chat_sessions" to "authenticated";

grant references on table "public"."chat_sessions" to "authenticated";

grant select on table "public"."chat_sessions" to "authenticated";

grant trigger on table "public"."chat_sessions" to "authenticated";

grant truncate on table "public"."chat_sessions" to "authenticated";

grant update on table "public"."chat_sessions" to "authenticated";

grant delete on table "public"."chat_sessions" to "service_role";

grant insert on table "public"."chat_sessions" to "service_role";

grant references on table "public"."chat_sessions" to "service_role";

grant select on table "public"."chat_sessions" to "service_role";

grant trigger on table "public"."chat_sessions" to "service_role";

grant truncate on table "public"."chat_sessions" to "service_role";

grant update on table "public"."chat_sessions" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

create policy "Users can create their own chat sessions"
on "public"."chat_sessions"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can delete their own chat sessions"
on "public"."chat_sessions"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can update their own chat sessions"
on "public"."chat_sessions"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own chat sessions"
on "public"."chat_sessions"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can create their own messages"
on "public"."messages"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can delete their own messages"
on "public"."messages"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can update their own messages"
on "public"."messages"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own messages"
on "public"."messages"
as permissive
for select
to public
using ((auth.uid() = user_id));


CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_on_message_insert AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION update_session_timestamp_on_message();


