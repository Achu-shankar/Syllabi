drop policy "Allow individual insert access for own profile" on "public"."profiles";

drop policy "Allow individual read access to own profile" on "public"."profiles";

drop policy "Allow individual update access to own profile" on "public"."profiles";

alter table "public"."chatbots" drop column "customization_details";

alter table "public"."chatbots" drop column "internal_name";

alter table "public"."chatbots" drop column "theme_identifier";

alter table "public"."chatbots" add column "ai_model_identifier" text;

alter table "public"."chatbots" add column "description" text;

alter table "public"."chatbots" add column "name" text not null;

alter table "public"."chatbots" add column "published" boolean not null default false;

alter table "public"."chatbots" add column "system_prompt" text;

alter table "public"."chatbots" add column "temperature" numeric(2,1);

alter table "public"."chatbots" add column "theme" jsonb not null default '{}'::jsonb;

alter table "public"."profiles" add column "avatar_url" text;

alter table "public"."profiles" add column "full_name" text;

alter table "public"."profiles" alter column "user_id" drop not null;

CREATE INDEX idx_chatbots_shareable_url_slug ON public.chatbots USING btree (shareable_url_slug) WHERE (published = true);

CREATE UNIQUE INDEX unique_shareable_url_slug ON public.chatbots USING btree (shareable_url_slug);

alter table "public"."chatbots" add constraint "unique_shareable_url_slug" UNIQUE using index "unique_shareable_url_slug";

create policy "Allow public read access to published chatbots"
on "public"."chatbots"
as permissive
for select
to anon, authenticated
using ((published = true));


create policy "Allow individual insert access for own profile"
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = id));


create policy "Allow individual read access to own profile"
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = id));


create policy "Allow individual update access to own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id))
with check ((auth.uid() = id));



