import "server-only";
import { createClient } from '@/utils/supabase/server';
import { Message } from "@ai-sdk/react";
import { generateTitleFromUserMessage } from "../actions";


export interface ChatSession {
    id: string;
    name: string;
    user_id: string | null;
    chatbot_id: string;
    chatbot_slug: string;
    source?: 'full' | 'embedded';
    referrer?: string;
    embedded_config?: any;
    updated_at: string;
    created_at: string;
}

export interface DBMessage {
    id: string;
    message_id: string;
    chat_session_id: string;
    user_id: string | null;
    role: string;
    content: string;
    token_count: number;
    annotations: any | null;
    parts: any | null;
    experimental_attachments: any | null;
    metadata: any | null;
    created_at: string;
    updated_at: string;
}

/**
 * Get chatbot_id from chatbot_slug
 * Helper function to translate slug to ID
 */
export async function getChatbotIdFromSlug(chatbotSlug: string): Promise<string | null> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('chatbots')
            .select('id')
            .eq('shareable_url_slug', chatbotSlug)
            .single();
        
        if (error) {
            console.error('Error fetching chatbot ID:', error);
            return null;
        }
        
        return data?.id || null;
    } catch (error) {
        console.error('Error in getChatbotIdFromSlug:', error);
        return null;
    }
}

export async function getChatSessions(userId: string, chatbotSlug: string): Promise<ChatSession[]> {
    const supabase = await createClient();
    try {
        // First get the chatbot_id from slug
        const chatbotId = await getChatbotIdFromSlug(chatbotSlug);
        if (!chatbotId) {
            throw new Error(`Chatbot not found for slug: ${chatbotSlug}`);
        }

        const {data, error} = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('chatbot_id', chatbotId)
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
    userId: string | null,
    sessionId: string,
    chatbotSlug: string,
    messagesToSave: Message[],
    tokenCount: number = 0,
    sessionMetadata?: {
      source?: 'full' | 'embedded';
      referrer?: string;
      embeddedConfig?: any;
    }
  ): Promise<void> {
    if (!sessionId || !chatbotSlug || messagesToSave.length === 0) {
      console.warn('[Queries] saveOrUpdateChatMessages called with invalid parameters.', { userId, sessionId, chatbotSlug, messagesCount: messagesToSave.length });
      return; // Or throw an error
    }
  
    // Get chatbot_id from slug
    const chatbotId = await getChatbotIdFromSlug(chatbotSlug);
    if (!chatbotId) {
      throw new Error(`Chatbot not found for slug: ${chatbotSlug}`);
    }
  
    const supabase = await createClient();
    console.log(`[Queries] Saving ${messagesToSave.length} messages for session ${sessionId} in chatbot ${chatbotSlug} (ID: ${chatbotId}), user: ${userId || 'anonymous'}`);
  
    try {
      // Step 1: Check if session exists and potentially create it
      const { data: existingSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('chatbot_id', chatbotId)
        .maybeSingle(); // Use maybeSingle to get null if not found, or the object if found
  
      if (sessionError) {
        console.error(`[Queries] Error checking for session ${sessionId}:`, sessionError);
        throw new Error(`Failed to check session existence: ${sessionError.message}`);
      }
  
      if (!existingSession) {
        console.log(`[Queries] Session ${sessionId} not found for chatbot ${chatbotId}. Creating new session...`);
        // Determine a default name (e.g., from the first user message)
        const firstUserMessage = messagesToSave.find(m => m.role === 'user');
        
        let sessionName = 'New Chat'; // Default fallback
        try {
          if (firstUserMessage) {
            sessionName = await generateTitleFromUserMessage({ message: firstUserMessage as Message });
          }
        } catch (titleError) {
          console.warn('[Queries] Failed to generate session title, using fallback:', titleError);
          // Use a simple fallback based on message content if available
          if (firstUserMessage?.content) {
            const content = firstUserMessage.content.substring(0, 50);
            sessionName = content.length < firstUserMessage.content.length ? `${content}...` : content;
          }
        }
  
        const { error: insertSessionError } = await supabase
          .from('chat_sessions')
          .insert({
            id: sessionId,
            user_id: userId, // Can be null for anonymous users
            chatbot_id: chatbotId, // Use chatbot_id instead of slug
            chatbot_slug: chatbotSlug, // Keep for backward compatibility
            name: sessionName,
            source: sessionMetadata?.source || 'full',
            referrer: sessionMetadata?.referrer || null,
            embedded_config: sessionMetadata?.embeddedConfig || null,
            // created_at and updated_at have defaults
          });
  
        if (insertSessionError) {
          // Check if it's a duplicate key error (session was created by another concurrent request)
          if (insertSessionError.code === '23505') {
            console.log(`[Queries] Session ${sessionId} already exists (created concurrently), continuing...`);
            // This is fine, just continue with saving messages
          } else {
          console.error(`[Queries] Error creating session ${sessionId}:`, insertSessionError);
          throw new Error(`Failed to create session: ${insertSessionError.message}`);
          }
        } else {
          console.log(`[Queries] Session ${sessionId} created successfully for chatbot ${chatbotId}.`);
        }
      }
  
      // Step 2: Map SDK Messages to DB Rows
      const dbMessages = messagesToSave.map(msg => ({
        message_id: msg.id,
        chat_session_id: sessionId,
        user_id: userId,
        role: msg.role,
        content: msg.content,
        token_count: tokenCount,
        annotations: msg.annotations ?? null,
        parts: msg.parts ?? null,
        experimental_attachments: msg.experimental_attachments ?? null,
        metadata: (msg as any).metadata ?? null, // Cast to any to access our custom metadata field
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
  
    // Get chatbot_id from slug
    const chatbotId = await getChatbotIdFromSlug(chatbotSlug);
    if (!chatbotId) {
      throw new Error(`Chatbot not found for slug: ${chatbotSlug}`);
    }
  
    // Ensure the new name is either a string or explicitly null.
    // Trim whitespace if it's a string.
    const finalName = typeof newName === 'string' ? newName.trim() : null;
  
    const supabase = await createClient();
    console.log(`[Queries] Attempting update for session ID: '${sessionId}' in chatbot '${chatbotSlug}' (ID: ${chatbotId}) by user ${userId}`); 
    console.log(`[Queries] Updating name for session ${sessionId} by user ${userId} to: \"${finalName}\"`);
  
    try {
      // First, let's check if the session exists with our conditions
      const { data: existingSession, error: lookupError } = await supabase
        .from('chat_sessions')
        .select('id, user_id, chatbot_id, name')
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

      if (existingSession.chatbot_id !== chatbotId) {
        console.warn(`[Queries] Session ${sessionId} belongs to chatbot '${existingSession.chatbot_id}', not '${chatbotId}'`);
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
        .eq('chatbot_id', chatbotId) // Security Check: Ensure session belongs to correct chatbot
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
          console.warn(`[Queries] Conditions were: id='${sessionId}', user_id='${userId}', chatbot_id='${chatbotId}'`);
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
    
    // Get chatbot_id from slug
    const chatbotId = await getChatbotIdFromSlug(chatbotSlug);
    if (!chatbotId) {
      throw new Error(`Chatbot not found for slug: ${chatbotSlug}`);
    }

    const supabase = await createClient();
  
    try {
      const { error, count } = await supabase
        .from('chat_sessions')
        .delete({ count: 'exact' }) // Request count to verify deletion
        .eq('id', sessionId)
        .eq('user_id', userId)
        .eq('chatbot_id', chatbotId);
  
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

// =====================================================
// Message Management Functions
// =====================================================

export async function deleteMessagesAfterTimestamp(
  userId: string,
  sessionId: string, 
  timestamp: string
): Promise<void> {
  const supabase = await createClient();
  console.log(`[Queries] Deleting messages from timestamp ${timestamp} onwards for session ${sessionId}`);
  
  try {
    const { error, count } = await supabase
      .from('messages')
      .delete({ count: 'exact' })
      .eq('chat_session_id', sessionId)
      .eq('user_id', userId)
      .gte('created_at', timestamp); // Delete messages created at or after this timestamp (includes the current message)
    
    if (error) {
      console.error(`[Queries] Error deleting messages:`, error);
      throw new Error(`Failed to delete messages: ${error.message}`);
    }
    
    console.log(`[Queries] Successfully deleted ${count} messages from timestamp ${timestamp} onwards`);
    
  } catch (error) {
    console.error(`[Queries] Exception deleting messages:`, error);
    throw error;
  }
}

export async function getMessageById(messageId: string, userId: string): Promise<DBMessage | null> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error(`[Queries] Error fetching message ${messageId}:`, error);
      throw new Error(`Failed to fetch message: ${error.message}`);
    }
    
    return data;
    
  } catch (error) {
    console.error(`[Queries] Exception fetching message ${messageId}:`, error);
    throw error;
  }
}

/**
 * Interface for chatbot configuration from database
 */
export interface ChatbotConfig {
  ai_model_identifier: string | null;
  system_prompt: string | null;
  temperature: number | null;
  tool_selection_method: 'direct' | 'semantic_retrieval' | null;
}

/**
 * Fetches chatbot configuration (model, system prompt, temperature) from database
 * @param chatbotId - The ID of the chatbot to fetch configuration for
 * @returns Promise containing the chatbot configuration
 */
export async function getChatbotConfig(chatbotId: string): Promise<ChatbotConfig> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('chatbots')
      .select('ai_model_identifier, system_prompt, temperature, tool_selection_method')
      .eq('id', chatbotId)
      .single();

    if (error) {
      console.error('[Queries] Error fetching chatbot config:', error);
      throw new Error(`Failed to fetch chatbot config: ${error.message}`);
    }

    return {
      ai_model_identifier: data.ai_model_identifier,
      system_prompt: data.system_prompt,
      temperature: data.temperature,
      tool_selection_method: data.tool_selection_method
    };
  } catch (error) {
    console.error('[Queries] Error in getChatbotConfig:', error);
    throw error;
  }
}

/**
 * Fetches just the AI model identifier for a chatbot
 * @param chatbotId - The ID of the chatbot
 * @returns Promise containing the model identifier or null
 */
export async function getChatbotModel(chatbotId: string): Promise<string | null> {
  const config = await getChatbotConfig(chatbotId);
  return config.ai_model_identifier;
}

/**
 * Fetches just the system prompt for a chatbot
 * @param chatbotId - The ID of the chatbot
 * @returns Promise containing the system prompt or null
 */
export async function getChatbotSystemPrompt(chatbotId: string): Promise<string | null> {
  const config = await getChatbotConfig(chatbotId);
  return config.system_prompt;
}

/**
 * Fetches just the temperature setting for a chatbot
 * @param chatbotId - The ID of the chatbot
 * @returns Promise containing the temperature or null
 */
export async function getChatbotTemperature(chatbotId: string): Promise<number | null> {
  const config = await getChatbotConfig(chatbotId);
  return config.temperature;
}

