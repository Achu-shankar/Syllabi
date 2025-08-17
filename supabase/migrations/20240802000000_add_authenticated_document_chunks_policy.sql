// Create the policy for authenticated users to read document_chunks for public and shared chatbots
CREATE POLICY "Allow authenticated access to document_chunks for public and shared chatbots"
ON public.document_chunks
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM chatbots c
    WHERE c.id = document_chunks.chatbot_id
      AND (
        c.visibility = 'public'
        OR (
          c.visibility = 'shared'
          AND EXISTS (
            SELECT 1
            FROM chatbot_permissions p
            WHERE p.chatbot_id = c.id
              AND p.user_id = auth.uid()
          )
        )
      )
  )
);
