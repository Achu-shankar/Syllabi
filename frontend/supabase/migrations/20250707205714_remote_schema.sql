alter table "public"."chat_sessions" drop constraint "chat_sessions_source_check";

alter table "public"."chat_sessions" add constraint "chat_sessions_source_check" CHECK (((source)::text = ANY ((ARRAY['full'::character varying, 'embedded'::character varying])::text[]))) not valid;

alter table "public"."chat_sessions" validate constraint "chat_sessions_source_check";

create policy "Users can create skill executions for their chatbots"
on "public"."skill_executions"
as permissive
for insert
to public
with check ((skill_id IN ( SELECT cs.id
   FROM (chatbot_skills cs
     JOIN chatbots c ON ((cs.chatbot_id = c.id)))
  WHERE (c.user_id = auth.uid()))));



