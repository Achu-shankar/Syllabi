create policy "Allow delete access to announcements for own chatbots"
on "public"."announcements"
as permissive
for delete
to public
using (((EXISTS ( SELECT 1
   FROM chatbots cb
  WHERE ((cb.id = announcements.chatbot_id) AND (cb.user_id = auth.uid())))) AND (user_id = auth.uid())));


create policy "Allow insert access to announcements for own chatbots"
on "public"."announcements"
as permissive
for insert
to public
with check (((EXISTS ( SELECT 1
   FROM chatbots cb
  WHERE ((cb.id = announcements.chatbot_id) AND (cb.user_id = auth.uid())))) AND (user_id = auth.uid())));


create policy "Allow read access to announcements for own chatbots"
on "public"."announcements"
as permissive
for select
to public
using (((EXISTS ( SELECT 1
   FROM chatbots cb
  WHERE ((cb.id = announcements.chatbot_id) AND (cb.user_id = auth.uid())))) AND (user_id = auth.uid())));


create policy "Allow update access to announcements for own chatbots"
on "public"."announcements"
as permissive
for update
to public
using (((EXISTS ( SELECT 1
   FROM chatbots cb
  WHERE ((cb.id = announcements.chatbot_id) AND (cb.user_id = auth.uid())))) AND (user_id = auth.uid())))
with check (((EXISTS ( SELECT 1
   FROM chatbots cb
  WHERE ((cb.id = announcements.chatbot_id) AND (cb.user_id = auth.uid())))) AND (user_id = auth.uid())));


create policy "Allow delete access to content sources for own chatbots"
on "public"."chatbot_content_sources"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM chatbots cb
  WHERE ((cb.id = chatbot_content_sources.chatbot_id) AND (cb.user_id = auth.uid())))));


create policy "Allow insert access to content sources for own chatbots"
on "public"."chatbot_content_sources"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM chatbots cb
  WHERE ((cb.id = chatbot_content_sources.chatbot_id) AND (cb.user_id = auth.uid())))));


create policy "Allow read access to content sources for own chatbots"
on "public"."chatbot_content_sources"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM chatbots cb
  WHERE ((cb.id = chatbot_content_sources.chatbot_id) AND (cb.user_id = auth.uid())))));


create policy "Allow update access to content sources for own chatbots"
on "public"."chatbot_content_sources"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM chatbots cb
  WHERE ((cb.id = chatbot_content_sources.chatbot_id) AND (cb.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM chatbots cb
  WHERE ((cb.id = chatbot_content_sources.chatbot_id) AND (cb.user_id = auth.uid())))));


create policy "Allow individual delete access to own chatbots"
on "public"."chatbots"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Allow individual insert access for own chatbots"
on "public"."chatbots"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Allow individual read access to own chatbots"
on "public"."chatbots"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Allow individual update access to own chatbots"
on "public"."chatbots"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Allow individual insert access for own profile"
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Allow individual read access to own profile"
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Allow individual update access to own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



