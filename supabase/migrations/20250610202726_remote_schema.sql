create extension if not exists "vector" with schema "extensions";


create table "public"."document_chunks" (
    "chunk_id" uuid not null default gen_random_uuid(),
    "reference_id" uuid not null,
    "user_id" uuid,
    "chatbot_id" uuid,
    "page_number" integer not null,
    "chunk_text" text not null,
    "token_count" integer not null,
    "embedding" vector(1536),
    "constituent_elements_data" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."document_chunks" enable row level security;

create table "public"."folders" (
    "id" uuid not null default uuid_generate_v4(),
    "chatbot_id" uuid not null,
    "user_id" uuid not null,
    "name" text not null,
    "parent_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."folders" enable row level security;

create table "public"."tasks" (
    "id" uuid not null default gen_random_uuid(),
    "task_identifier" uuid not null default gen_random_uuid(),
    "user_id" text not null,
    "chatbot_id" uuid not null,
    "reference_id" uuid,
    "task_type" text not null,
    "status" text not null default 'QUEUED'::text,
    "current_step_description" text,
    "progress_percentage" integer not null default 0,
    "input_payload" jsonb,
    "result_payload" jsonb,
    "error_details" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."chatbot_content_sources" add column "folder_id" uuid;

alter table "public"."chatbot_content_sources" alter column "id" drop default;

CREATE INDEX document_chunks_chatbot_id_idx ON public.document_chunks USING btree (chatbot_id);

CREATE INDEX document_chunks_created_at_idx ON public.document_chunks USING btree (created_at DESC);

CREATE INDEX document_chunks_embedding_idx ON public.document_chunks USING hnsw (embedding vector_ip_ops);

CREATE UNIQUE INDEX document_chunks_pkey ON public.document_chunks USING btree (chunk_id);

CREATE INDEX document_chunks_reference_id_idx ON public.document_chunks USING btree (reference_id);

CREATE INDEX document_chunks_user_chatbot_idx ON public.document_chunks USING btree (user_id, chatbot_id);

CREATE INDEX document_chunks_user_id_idx ON public.document_chunks USING btree (user_id);

CREATE UNIQUE INDEX folders_pkey ON public.folders USING btree (id);

CREATE INDEX idx_content_sources_folder_id ON public.chatbot_content_sources USING btree (folder_id);

CREATE INDEX idx_content_sources_unsorted ON public.chatbot_content_sources USING btree (chatbot_id) WHERE (folder_id IS NULL);

CREATE INDEX idx_folders_chatbot_id ON public.folders USING btree (chatbot_id);

CREATE INDEX idx_folders_parent_id ON public.folders USING btree (parent_id);

CREATE INDEX idx_folders_user_id ON public.folders USING btree (user_id);

CREATE INDEX idx_tasks_chatbot_id ON public.tasks USING btree (chatbot_id);

CREATE INDEX idx_tasks_created_at ON public.tasks USING btree (created_at DESC);

CREATE INDEX idx_tasks_reference_id ON public.tasks USING btree (reference_id);

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);

CREATE INDEX idx_tasks_task_identifier ON public.tasks USING btree (task_identifier);

CREATE INDEX idx_tasks_task_type ON public.tasks USING btree (task_type);

CREATE INDEX idx_tasks_user_chatbot_created ON public.tasks USING btree (user_id, chatbot_id, created_at DESC);

CREATE INDEX idx_tasks_user_id ON public.tasks USING btree (user_id);

CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id);

CREATE UNIQUE INDEX tasks_task_identifier_key ON public.tasks USING btree (task_identifier);

CREATE UNIQUE INDEX unique_folder_name_per_chatbot_parent ON public.folders USING btree (chatbot_id, parent_id, name);

alter table "public"."document_chunks" add constraint "document_chunks_pkey" PRIMARY KEY using index "document_chunks_pkey";

alter table "public"."folders" add constraint "folders_pkey" PRIMARY KEY using index "folders_pkey";

alter table "public"."tasks" add constraint "tasks_pkey" PRIMARY KEY using index "tasks_pkey";

alter table "public"."chatbot_content_sources" add constraint "fk_content_sources_folder_id" FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL not valid;

alter table "public"."chatbot_content_sources" validate constraint "fk_content_sources_folder_id";

alter table "public"."document_chunks" add constraint "document_chunks_chatbot_id_fkey" FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE not valid;

alter table "public"."document_chunks" validate constraint "document_chunks_chatbot_id_fkey";

alter table "public"."document_chunks" add constraint "document_chunks_reference_id_fkey" FOREIGN KEY (reference_id) REFERENCES chatbot_content_sources(id) ON DELETE CASCADE not valid;

alter table "public"."document_chunks" validate constraint "document_chunks_reference_id_fkey";

alter table "public"."document_chunks" add constraint "document_chunks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."document_chunks" validate constraint "document_chunks_user_id_fkey";

alter table "public"."folders" add constraint "fk_folders_chatbot_id" FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE not valid;

alter table "public"."folders" validate constraint "fk_folders_chatbot_id";

alter table "public"."folders" add constraint "fk_folders_parent_id" FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE not valid;

alter table "public"."folders" validate constraint "fk_folders_parent_id";

alter table "public"."folders" add constraint "fk_folders_user_id" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."folders" validate constraint "fk_folders_user_id";

alter table "public"."folders" add constraint "unique_folder_name_per_chatbot_parent" UNIQUE using index "unique_folder_name_per_chatbot_parent";

alter table "public"."tasks" add constraint "tasks_progress_percentage_check" CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100))) not valid;

alter table "public"."tasks" validate constraint "tasks_progress_percentage_check";

alter table "public"."tasks" add constraint "tasks_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'QUEUED'::text, 'PROCESSING'::text, 'COMPLETED'::text, 'FAILED'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."tasks" validate constraint "tasks_status_check";

alter table "public"."tasks" add constraint "tasks_task_identifier_key" UNIQUE using index "tasks_task_identifier_key";

alter table "public"."tasks" add constraint "tasks_task_type_check" CHECK ((task_type = ANY (ARRAY['DOCUMENT_PROCESSING'::text, 'METADATA_EXTRACTION'::text, 'CONTENT_INDEXING'::text, 'URL_PROCESSING'::text, 'DOI_CITATION_FETCH'::text, 'PDF_GENERATION_FROM_URL'::text, 'DOCUMENT_INDEXING'::text]))) not valid;

alter table "public"."tasks" validate constraint "tasks_task_type_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.match_document_chunks(query_embedding vector, chatbot_id_param uuid, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10)
 RETURNS TABLE(chunk_id uuid, reference_id uuid, page_number integer, chunk_text text, token_count integer, similarity double precision, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE
AS $function$
  select
    document_chunks.chunk_id,
    document_chunks.reference_id,
    document_chunks.page_number,
    document_chunks.chunk_text,
    document_chunks.token_count,
    1 - (document_chunks.embedding <=> query_embedding) as similarity,
    document_chunks.created_at
  from document_chunks
  where 
    document_chunks.chatbot_id = chatbot_id_param
    and document_chunks.embedding is not null
    and 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by (document_chunks.embedding <=> query_embedding) asc
  limit match_count;
$function$
;

CREATE OR REPLACE FUNCTION public.update_folders_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_modified_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."document_chunks" to "anon";

grant insert on table "public"."document_chunks" to "anon";

grant references on table "public"."document_chunks" to "anon";

grant select on table "public"."document_chunks" to "anon";

grant trigger on table "public"."document_chunks" to "anon";

grant truncate on table "public"."document_chunks" to "anon";

grant update on table "public"."document_chunks" to "anon";

grant delete on table "public"."document_chunks" to "authenticated";

grant insert on table "public"."document_chunks" to "authenticated";

grant references on table "public"."document_chunks" to "authenticated";

grant select on table "public"."document_chunks" to "authenticated";

grant trigger on table "public"."document_chunks" to "authenticated";

grant truncate on table "public"."document_chunks" to "authenticated";

grant update on table "public"."document_chunks" to "authenticated";

grant delete on table "public"."document_chunks" to "service_role";

grant insert on table "public"."document_chunks" to "service_role";

grant references on table "public"."document_chunks" to "service_role";

grant select on table "public"."document_chunks" to "service_role";

grant trigger on table "public"."document_chunks" to "service_role";

grant truncate on table "public"."document_chunks" to "service_role";

grant update on table "public"."document_chunks" to "service_role";

grant delete on table "public"."folders" to "anon";

grant insert on table "public"."folders" to "anon";

grant references on table "public"."folders" to "anon";

grant select on table "public"."folders" to "anon";

grant trigger on table "public"."folders" to "anon";

grant truncate on table "public"."folders" to "anon";

grant update on table "public"."folders" to "anon";

grant delete on table "public"."folders" to "authenticated";

grant insert on table "public"."folders" to "authenticated";

grant references on table "public"."folders" to "authenticated";

grant select on table "public"."folders" to "authenticated";

grant trigger on table "public"."folders" to "authenticated";

grant truncate on table "public"."folders" to "authenticated";

grant update on table "public"."folders" to "authenticated";

grant delete on table "public"."folders" to "service_role";

grant insert on table "public"."folders" to "service_role";

grant references on table "public"."folders" to "service_role";

grant select on table "public"."folders" to "service_role";

grant trigger on table "public"."folders" to "service_role";

grant truncate on table "public"."folders" to "service_role";

grant update on table "public"."folders" to "service_role";

grant delete on table "public"."tasks" to "anon";

grant insert on table "public"."tasks" to "anon";

grant references on table "public"."tasks" to "anon";

grant select on table "public"."tasks" to "anon";

grant trigger on table "public"."tasks" to "anon";

grant truncate on table "public"."tasks" to "anon";

grant update on table "public"."tasks" to "anon";

grant delete on table "public"."tasks" to "authenticated";

grant insert on table "public"."tasks" to "authenticated";

grant references on table "public"."tasks" to "authenticated";

grant select on table "public"."tasks" to "authenticated";

grant trigger on table "public"."tasks" to "authenticated";

grant truncate on table "public"."tasks" to "authenticated";

grant update on table "public"."tasks" to "authenticated";

grant delete on table "public"."tasks" to "service_role";

grant insert on table "public"."tasks" to "service_role";

grant references on table "public"."tasks" to "service_role";

grant select on table "public"."tasks" to "service_role";

grant trigger on table "public"."tasks" to "service_role";

grant truncate on table "public"."tasks" to "service_role";

grant update on table "public"."tasks" to "service_role";

create policy "Allow access to chunks for own chatbots"
on "public"."document_chunks"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM chatbots cb
  WHERE ((cb.id = document_chunks.chatbot_id) AND (cb.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM chatbots cb
  WHERE ((cb.id = document_chunks.chatbot_id) AND (cb.user_id = auth.uid())))));


create policy "Users can delete their own chatbot folders"
on "public"."folders"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM chatbots
  WHERE ((chatbots.id = folders.chatbot_id) AND (chatbots.user_id = auth.uid())))));


create policy "Users can insert folders for their own chatbots"
on "public"."folders"
as permissive
for insert
to public
with check (((EXISTS ( SELECT 1
   FROM chatbots
  WHERE ((chatbots.id = folders.chatbot_id) AND (chatbots.user_id = auth.uid())))) AND (user_id = auth.uid())));


create policy "Users can update their own chatbot folders"
on "public"."folders"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM chatbots
  WHERE ((chatbots.id = folders.chatbot_id) AND (chatbots.user_id = auth.uid())))));


create policy "Users can view their own chatbot folders"
on "public"."folders"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM chatbots
  WHERE ((chatbots.id = folders.chatbot_id) AND (chatbots.user_id = auth.uid())))));


create policy "Users can delete their own tasks"
on "public"."tasks"
as permissive
for delete
to public
using (((auth.uid())::text = user_id));


create policy "Users can insert their own tasks"
on "public"."tasks"
as permissive
for insert
to public
with check (((auth.uid())::text = user_id));


create policy "Users can update their own tasks"
on "public"."tasks"
as permissive
for update
to public
using (((auth.uid())::text = user_id));


create policy "Users can view their own tasks"
on "public"."tasks"
as permissive
for select
to public
using (((auth.uid())::text = user_id));


CREATE TRIGGER update_document_chunks_modtime BEFORE UPDATE ON public.document_chunks FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trigger_update_folders_updated_at BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION update_folders_updated_at();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


