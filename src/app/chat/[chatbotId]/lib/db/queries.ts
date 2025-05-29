import "server-only";
import { createClient } from '@/utils/supabase/server';
import { UUID } from "crypto";
import { Message } from "@ai-sdk/react";
import { generateTitleFromUserMessage } from "../actions";


export interface ChatSession {
    id: string;
    name: string;
    user_id: string;
    chatbot_slug: string;
    updated_at: string;
    created_at: string;
}

export interface DBMessage {
    id: string;
    message_id: string;
    chat_session_id: string;
    user_id: string;
    role: string;
    content: string;
    annotations: any | null;
    parts: any | null;
    experimental_attachments: any | null;
    metadata: any | null;
    created_at: string;
    updated_at: string;
}



export async function getChatSessions(userId: string, chatbotSlug: string): Promise<ChatSession[]> {
    const supabase = await createClient();
    try {
        const {data, error} = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('chatbot_slug', chatbotSlug)
            .order('updated_at', { ascending: false });
        if (error){
            console.error('Error fetching chat sessions:', error);
            throw new Error(`Failed to fetch chat sessions: ${error.message}`);
        }
        return data as ChatSession[] | [];
    } catch (error) {
        console.error('Error fetching chat sessions:', error);
        throw error;
    }
}


export async function getMessages(sessionId: string) {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from('messages').select('*').eq('chat_session_id', sessionId);
    if (error){
        console.error('Error fetching messages:', error);
        throw new Error(`Failed to fetch messages: ${error.message}`);
    }
    return data as DBMessage[] | [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

export async function saveOrUpdateChatMessages(
    userId: string,
    sessionId: string,
    chatbotSlug: string,
    messagesToSave: Message[]
  ): Promise<void> {
    if (!userId || !sessionId || !chatbotSlug || messagesToSave.length === 0) {
      console.warn('[Queries] saveOrUpdateChatMessages called with invalid parameters.', { userId, sessionId, chatbotSlug, messagesCount: messagesToSave.length });
      return; // Or throw an error
    }
  
    const supabase = await createClient();
    console.log(`[Queries] Saving ${messagesToSave.length} messages for session ${sessionId} in chatbot ${chatbotSlug}`);
  
    try {
      // Step 1: Check if session exists and potentially create it
      const { data: existingSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('chatbot_slug', chatbotSlug)
        .maybeSingle(); // Use maybeSingle to get null if not found, or the object if found
  
      if (sessionError) {
        console.error(`[Queries] Error checking for session ${sessionId}:`, sessionError);
        throw new Error(`Failed to check session existence: ${sessionError.message}`);
      }
  
      if (!existingSession) {
        console.log(`[Queries] Session ${sessionId} not found for chatbot ${chatbotSlug}. Creating new session...`);
        // Determine a default name (e.g., from the first user message)
        const firstUserMessage = messagesToSave.find(m => m.role === 'user');
        const sessionName = await generateTitleFromUserMessage({ message: firstUserMessage as Message });
        // const sessionName = firstUserMessage?.content.substring(0, 50) || 'New Chat'; // Truncate content
  
        const { error: insertSessionError } = await supabase
          .from('chat_sessions')
          .insert({
            id: sessionId,
            user_id: userId,
            chatbot_slug: chatbotSlug,
            name: sessionName,
            // created_at and updated_at have defaults
          });
  
        if (insertSessionError) {
          console.error(`[Queries] Error creating session ${sessionId}:`, insertSessionError);
          throw new Error(`Failed to create session: ${insertSessionError.message}`);
        }
        console.log(`[Queries] Session ${sessionId} created successfully for chatbot ${chatbotSlug}.`);
      }
  
      // Step 2: Map SDK Messages to DB Rows
      const dbMessages = messagesToSave.map(msg => ({
        message_id: msg.id, // The ID from the SDK message
        chat_session_id: sessionId,
        user_id: userId,
        role: msg.role,
        content: msg.content, // The primary text content
        annotations: msg.annotations ?? null, // Handle potential undefined
        parts: msg.parts ?? null,
        experimental_attachments: msg.experimental_attachments ?? null,
        metadata: null, // Add logic if you have specific metadata to save
      }));
  
      // Step 3: Insert the messages
      const { error: insertMessagesError } = await supabase
        .from('messages')
        .insert(dbMessages);
  
      if (insertMessagesError) {
        console.error(`[Queries] Error saving messages for session ${sessionId}:`, insertMessagesError);
        // Note: If session creation succeeded but message insertion failed, session exists but is empty.
        throw new Error(`Failed to save messages: ${insertMessagesError.message}`);
      }
  
      // Step 4: Update the session's updated_at timestamp (optional but good practice)
      // We don't strictly need this if the trigger on the table works for inserts/updates from messages,
      // but doing it explicitly ensures it reflects the *message save* time.
      const { error: updateTimestampError } = await supabase
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', sessionId);
  
      if (updateTimestampError) {
           console.warn(`[Queries] Failed to update timestamp for session ${sessionId}:`, updateTimestampError.message);
           // Non-critical error, maybe just log it.
      }
  
      console.log(`[Queries] Successfully saved ${dbMessages.length} messages and updated session ${sessionId}.`);
  
    } catch (err) {
      console.error(`[Queries] Unexpected error in saveOrUpdateChatMessages for session ${sessionId}:`, err);
      // Don't wrap the error further, let the API route handle the specific error type
      throw err;
    }
  } 


export async function updateChatSessionName(
    userId: string,
    sessionId: string,
    chatbotSlug: string,
    newName: string | null
  ): Promise<void> {
    if (!userId || !sessionId || !chatbotSlug) {
      throw new Error('User ID, Session ID, and Chatbot Slug are required to rename a session.');
    }
  
    // Ensure the new name is either a string or explicitly null.
    // Trim whitespace if it's a string.
    const finalName = typeof newName === 'string' ? newName.trim() : null;
  
    const supabase = await createClient();
    console.log(`[Queries] Attempting update for session ID: '${sessionId}' in chatbot '${chatbotSlug}' by user ${userId}`); 
    console.log(`[Queries] Updating name for session ${sessionId} by user ${userId} to: \"${finalName}\"`);
  
    try {
      // First, let's check if the session exists with our conditions
      const { data: existingSession, error: lookupError } = await supabase
        .from('chat_sessions')
        .select('id, user_id, chatbot_slug, name')
        .eq('id', sessionId)
        .maybeSingle();

      if (lookupError) {
        console.error(`[Queries] Error looking up session ${sessionId}:`, lookupError);
        throw new Error(`Failed to lookup session: ${lookupError.message}`);
      }

      if (!existingSession) {
        console.warn(`[Queries] Session ${sessionId} not found at all.`);
        throw new Error('Session not found.');
      }

      console.log(`[Queries] Found session:`, existingSession);

      // Check ownership and chatbot match
      if (existingSession.user_id !== userId) {
        console.warn(`[Queries] User ${userId} does not own session ${sessionId}. Owner is: ${existingSession.user_id}`);
        throw new Error('User does not own this session.');
      }

      if (existingSession.chatbot_slug !== chatbotSlug) {
        console.warn(`[Queries] Session ${sessionId} belongs to chatbot '${existingSession.chatbot_slug}', not '${chatbotSlug}'`);
        throw new Error('Session belongs to different chatbot.');
      }

      // Now perform the update
      const { data, error, count } = await supabase
        .from('chat_sessions')
        .update({
            name: finalName,
            updated_at: new Date().toISOString() // Also update the timestamp
        })
        .eq('id', sessionId)
        .eq('user_id', userId) // Security Check: Ensure user owns the session
        .eq('chatbot_slug', chatbotSlug) // Security Check: Ensure session belongs to correct chatbot
        .select()
        .returns<ChatSession[]>(); // Type the return for better TypeScript support
  
      if (error) {
        console.error(`[Queries] Error updating session ${sessionId} name:`, error);
        throw new Error(`Database error during rename: ${error.message}`);
      }
  
      console.log(`[Queries] Update result - count: ${count}, data:`, data);
  
      // Check if any row was actually updated by checking the data array
      // If data is empty or null, it means no rows were affected
      if (!data || data.length === 0) {
          console.warn(`[Queries] Update returned no data. This suggests the WHERE conditions didn't match any records.`);
          console.warn(`[Queries] Conditions were: id='${sessionId}', user_id='${userId}', chatbot_slug='${chatbotSlug}'`);
          // Since we already verified the session exists and user owns it, this is unexpected
          throw new Error('Update failed - no rows affected despite session existing.'); 
      }
  
      console.log(`[Queries] Successfully updated name for session ${sessionId} to "${finalName}".`);
      console.log(`[Queries] Updated ${data.length} row(s).`);
  
    } catch (err) {
      // Re-throw specific errors or handle generic ones
      console.error(`[Queries] Unexpected error in updateChatSessionName for session ${sessionId}:`, err);
      if (err instanceof Error) {
          throw err; // Re-throw the original or a wrapped error
      }
      throw new Error('An unexpected error occurred while renaming the session.');
    }
  }

  export async function deleteChatSession(userId: string, sessionId: string, chatbotSlug: string) {
    console.log(`[Queries] Attempting delete for session ID: '${sessionId}' in chatbot '${chatbotSlug}' by user ${userId}`);
    const supabase = await createClient();
  
    try {
      const { error, count } = await supabase
        .from('chat_sessions')
        .delete({ count: 'exact' }) // Request count to verify deletion
        .eq('id', sessionId)
        .eq('user_id', userId)
        .eq('chatbot_slug', chatbotSlug);
  
      if (error) {
        console.error(`[Queries] Error deleting session ${sessionId}:`, error);
        throw new Error(`Database error during session deletion: ${error.message}`);
      }
  
      if (count === 0) {
        console.warn(`[Queries] Session ${sessionId} not found for user ${userId} in chatbot ${chatbotSlug} or deletion forbidden.`);
        // We throw an error here because the user tried to delete something specific
        // that wasn't found or they didn't have permission for.
        throw new Error("Session not found or deletion forbidden.");
      }
  
      console.log(`[Queries] Successfully deleted session ${sessionId} from chatbot ${chatbotSlug} (count: ${count}).`);
      return { success: true, count };
  
    } catch (error) {
      console.error(`[Queries] Exception during delete for session ${sessionId}:`, error);
      // Re-throw the error to be handled by the API route
      throw error;
    }
  }

