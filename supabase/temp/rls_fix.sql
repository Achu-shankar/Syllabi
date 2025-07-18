-- Update RLS policies to allow anonymous sessions

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON public.chat_sessions;

DROP POLICY IF EXISTS "Users can create their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- Create new policies that support anonymous users
CREATE POLICY "Users can create sessions (including anonymous)"
ON public.chat_sessions FOR INSERT
WITH CHECK (
    -- Allow if user owns the session OR if both auth.uid() and user_id are null (anonymous)
    auth.uid() = user_id OR (auth.uid() IS NULL AND user_id IS NULL)
);

CREATE POLICY "Users can view their own sessions (including anonymous)"
ON public.chat_sessions FOR SELECT
USING (
    -- Allow if user owns the session OR if both auth.uid() and user_id are null (anonymous)
    auth.uid() = user_id OR (auth.uid() IS NULL AND user_id IS NULL)
);

CREATE POLICY "Users can update their own sessions"
ON public.chat_sessions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
ON public.chat_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Messages policies (support anonymous)
CREATE POLICY "Users can create messages (including anonymous)"
ON public.messages FOR INSERT
WITH CHECK (
    -- Allow if user owns the message OR if both auth.uid() and user_id are null (anonymous)
    auth.uid() = user_id OR (auth.uid() IS NULL AND user_id IS NULL)
);

CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (
    -- Allow if user owns the message OR if both auth.uid() and user_id are null (anonymous)
    auth.uid() = user_id OR (auth.uid() IS NULL AND user_id IS NULL)
);

CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.messages FOR DELETE
USING (auth.uid() = user_id); 