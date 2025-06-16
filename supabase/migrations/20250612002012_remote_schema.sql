create policy "Allow limited profile search for user discovery"
on "public"."profiles"
as permissive
for select
to authenticated
using (true);



