// Create the policy for authenticated users to read public chatbots
CREATE POLICY "Allow authenticated access to public chatbots"
ON public.chatbots
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (visibility = 'public');
