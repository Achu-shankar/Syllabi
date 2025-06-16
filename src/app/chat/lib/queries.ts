'use server';

import 'server-only';
import { createClient } from '../../../utils/supabase/server';
import { ThemeConfig } from '../../dashboard/libs/queries';

// Interface for public chatbot data (subset of full Chatbot interface)
export interface PublicChatbot {
  id: string;
  student_facing_name?: string | null;
  name: string; // Always required for fallback
  logo_url?: string | null;
  welcome_message?: string | null;
  theme: ThemeConfig;
  suggested_questions?: string[] | null;
  shareable_url_slug?: string | null;
  visibility: 'private' | 'public' | 'shared';
  user_id: string; // Include for ownership checks
  // Note: We exclude sensitive fields like system_prompt, etc.
}

/**
 * Fetches a chatbot by its shareable URL slug with proper visibility enforcement
 * @param slug - The shareable URL slug
 * @returns The chatbot data or null if not found/not accessible
 */
export async function getChatbotBySlug(slug: string): Promise<PublicChatbot | null> {
  const supabase = await createClient();
  
  // Get current user (could be null for anonymous users)
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id || null;

  // First, fetch the chatbot data
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select(`
      id,
      student_facing_name,
      name,
      logo_url,
      welcome_message,
      theme,
      suggested_questions,
      shareable_url_slug,
      visibility,
      user_id
    `)
    .eq('shareable_url_slug', slug)
    .maybeSingle();

  if (chatbotError) {
    console.error('Error fetching chatbot by slug:', chatbotError);
    if (chatbotError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch chatbot: ${chatbotError.message}`);
    }
    return null;
  }

  if (!chatbot) {
    return null;
  }

  // Now enforce visibility rules
  switch (chatbot.visibility) {
    case 'private':
      // Only the owner can access private chatbots
      if (!currentUserId || currentUserId !== chatbot.user_id) {
        console.log(`Access denied: Private chatbot ${chatbot.id}, user ${currentUserId} is not owner ${chatbot.user_id}`);
        return null;
      }
      break;

    case 'public':
      // Anyone can access public chatbots (including anonymous users)
      // No additional checks needed
      break;

    case 'shared':
      // Owner or users with permissions can access shared chatbots
      if (!currentUserId) {
        console.log(`Access denied: Shared chatbot ${chatbot.id}, user not authenticated`);
        return null;
      }

      // Check if user is the owner
      if (currentUserId === chatbot.user_id) {
        break; // Owner can access
      }

      // Check if user has permission
      const { data: permission, error: permissionError } = await supabase
        .from('chatbot_permissions')
        .select('id')
        .eq('chatbot_id', chatbot.id)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (permissionError) {
        console.error('Error checking chatbot permission:', permissionError);
        return null;
      }

      if (!permission) {
        console.log(`Access denied: Shared chatbot ${chatbot.id}, user ${currentUserId} has no permission`);
        return null;
      }
      break;

    default:
      console.error(`Unknown visibility setting: ${chatbot.visibility}`);
      return null;
  }

  // Remove sensitive fields before returning
  const { user_id, ...publicChatbot } = chatbot;
  return publicChatbot as PublicChatbot;
}

/**
 * Checks if a chatbot slug exists and is accessible to the current user
 * @param slug - The shareable URL slug
 * @returns Promise<boolean> - True if exists and accessible
 */
export async function checkSlugAccessible(slug: string): Promise<boolean> {
  try {
    const chatbot = await getChatbotBySlug(slug);
    return chatbot !== null;
  } catch (error) {
    console.error('Error checking slug existence:', error);
    return false;
  }
} 