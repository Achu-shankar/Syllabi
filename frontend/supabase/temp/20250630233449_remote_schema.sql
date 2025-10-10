drop policy "Allow public read access to published chatbots" on "public"."chatbots";

create table "public"."default_themes" (
    "id" uuid not null default gen_random_uuid(),
    "theme_id" text not null,
    "name" text not null,
    "description" text,
    "category" text default 'general'::text,
    "theme_config" jsonb not null,
    "preview_image_url" text,
    "is_active" boolean default true,
    "sort_order" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."default_themes" enable row level security;

create table "public"."user_custom_themes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "description" text,
    "theme_config" jsonb not null,
    "based_on_default_theme_id" uuid,
    "is_favorite" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."user_custom_themes" enable row level security;

alter table "public"."chat_sessions" add column "embedded_config" jsonb;

alter table "public"."chat_sessions" add column "referrer" text;

alter table "public"."chat_sessions" add column "source" character varying(20) not null default 'full'::character varying;

CREATE UNIQUE INDEX default_themes_pkey ON public.default_themes USING btree (id);

CREATE UNIQUE INDEX default_themes_theme_id_key ON public.default_themes USING btree (theme_id);

CREATE INDEX idx_chat_sessions_referrer ON public.chat_sessions USING btree (referrer);

CREATE INDEX idx_chat_sessions_source ON public.chat_sessions USING btree (source);

CREATE INDEX idx_chat_sessions_source_chatbot ON public.chat_sessions USING btree (source, chatbot_id);

CREATE INDEX idx_default_themes_active ON public.default_themes USING btree (is_active, sort_order);

CREATE INDEX idx_default_themes_category ON public.default_themes USING btree (category, is_active);

CREATE INDEX idx_default_themes_theme_id ON public.default_themes USING btree (theme_id) WHERE (is_active = true);

CREATE INDEX idx_user_custom_themes_based_on ON public.user_custom_themes USING btree (based_on_default_theme_id) WHERE (based_on_default_theme_id IS NOT NULL);

CREATE INDEX idx_user_custom_themes_favorites ON public.user_custom_themes USING btree (user_id, is_favorite) WHERE (is_favorite = true);

CREATE INDEX idx_user_custom_themes_user ON public.user_custom_themes USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX unique_user_theme_name ON public.user_custom_themes USING btree (user_id, name);

CREATE UNIQUE INDEX user_custom_themes_pkey ON public.user_custom_themes USING btree (id);

alter table "public"."default_themes" add constraint "default_themes_pkey" PRIMARY KEY using index "default_themes_pkey";

alter table "public"."user_custom_themes" add constraint "user_custom_themes_pkey" PRIMARY KEY using index "user_custom_themes_pkey";

alter table "public"."chat_sessions" add constraint "chat_sessions_source_check" CHECK (((source)::text = ANY ((ARRAY['full'::character varying, 'embedded'::character varying])::text[]))) not valid;

alter table "public"."chat_sessions" validate constraint "chat_sessions_source_check";

alter table "public"."default_themes" add constraint "default_themes_theme_id_key" UNIQUE using index "default_themes_theme_id_key";

alter table "public"."user_custom_themes" add constraint "unique_user_theme_name" UNIQUE using index "unique_user_theme_name";

alter table "public"."user_custom_themes" add constraint "user_custom_themes_based_on_default_theme_id_fkey" FOREIGN KEY (based_on_default_theme_id) REFERENCES default_themes(id) ON DELETE SET NULL not valid;

alter table "public"."user_custom_themes" validate constraint "user_custom_themes_based_on_default_theme_id_fkey";

alter table "public"."user_custom_themes" add constraint "user_custom_themes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_custom_themes" validate constraint "user_custom_themes_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."default_themes" to "anon";

grant insert on table "public"."default_themes" to "anon";

grant references on table "public"."default_themes" to "anon";

grant select on table "public"."default_themes" to "anon";

grant trigger on table "public"."default_themes" to "anon";

grant truncate on table "public"."default_themes" to "anon";

grant update on table "public"."default_themes" to "anon";

grant delete on table "public"."default_themes" to "authenticated";

grant insert on table "public"."default_themes" to "authenticated";

grant references on table "public"."default_themes" to "authenticated";

grant select on table "public"."default_themes" to "authenticated";

grant trigger on table "public"."default_themes" to "authenticated";

grant truncate on table "public"."default_themes" to "authenticated";

grant update on table "public"."default_themes" to "authenticated";

grant delete on table "public"."default_themes" to "service_role";

grant insert on table "public"."default_themes" to "service_role";

grant references on table "public"."default_themes" to "service_role";

grant select on table "public"."default_themes" to "service_role";

grant trigger on table "public"."default_themes" to "service_role";

grant truncate on table "public"."default_themes" to "service_role";

grant update on table "public"."default_themes" to "service_role";

grant delete on table "public"."user_custom_themes" to "anon";

grant insert on table "public"."user_custom_themes" to "anon";

grant references on table "public"."user_custom_themes" to "anon";

grant select on table "public"."user_custom_themes" to "anon";

grant trigger on table "public"."user_custom_themes" to "anon";

grant truncate on table "public"."user_custom_themes" to "anon";

grant update on table "public"."user_custom_themes" to "anon";

grant delete on table "public"."user_custom_themes" to "authenticated";

grant insert on table "public"."user_custom_themes" to "authenticated";

grant references on table "public"."user_custom_themes" to "authenticated";

grant select on table "public"."user_custom_themes" to "authenticated";

grant trigger on table "public"."user_custom_themes" to "authenticated";

grant truncate on table "public"."user_custom_themes" to "authenticated";

grant update on table "public"."user_custom_themes" to "authenticated";

grant delete on table "public"."user_custom_themes" to "service_role";

grant insert on table "public"."user_custom_themes" to "service_role";

grant references on table "public"."user_custom_themes" to "service_role";

grant select on table "public"."user_custom_themes" to "service_role";

grant trigger on table "public"."user_custom_themes" to "service_role";

grant truncate on table "public"."user_custom_themes" to "service_role";

grant update on table "public"."user_custom_themes" to "service_role";

create policy "Anyone can read active default themes"
on "public"."default_themes"
as permissive
for select
to public
using ((is_active = true));


create policy "Default themes are viewable by everyone"
on "public"."default_themes"
as permissive
for select
to public
using ((is_active = true));


create policy "Service role can manage default themes"
on "public"."default_themes"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Users can create their own custom themes"
on "public"."user_custom_themes"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "Users can delete their own custom themes"
on "public"."user_custom_themes"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "Users can read their own custom themes"
on "public"."user_custom_themes"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "Users can update their own custom themes"
on "public"."user_custom_themes"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Allow public read access to published chatbots"
on "public"."chatbots"
as permissive
for select
to authenticated, anon
using ((published = true));


CREATE TRIGGER update_default_themes_updated_at BEFORE UPDATE ON public.default_themes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_custom_themes_updated_at BEFORE UPDATE ON public.user_custom_themes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


