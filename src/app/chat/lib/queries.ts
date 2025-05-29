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
  // Note: We exclude sensitive fields like system_prompt, user_id, etc.
}

/**
 * Fetches a published chatbot by its shareable URL slug
 * This is used for the public chat interface
 * @param slug - The shareable URL slug
 * @returns The public chatbot data or null if not found/not published
 */
export async function getPublishedChatbotBySlug(slug: string): Promise<PublicChatbot | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chatbots')
    .select(`
      id,
      student_facing_name,
      name,
      logo_url,
      welcome_message,
      theme,
      suggested_questions,
      shareable_url_slug
    `)
    .eq('shareable_url_slug', slug)
    .eq('published', true) // Extra safety check, though RLS policy handles this
    .maybeSingle();

  if (error) {
    console.error('Error fetching published chatbot by slug:', error);
    // Don't throw for PGRST116 (not found) 
    if (error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch chatbot: ${error.message}`);
    }
    return null;
  }

  return data as PublicChatbot | null;
}

/**
 * Checks if a chatbot slug exists and is published
 * Useful for validation without fetching full data
 * @param slug - The shareable URL slug
 * @returns Promise<boolean> - True if exists and published
 */
export async function checkPublishedSlugExists(slug: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chatbots')
    .select('id')
    .eq('shareable_url_slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (error) {
    console.error('Error checking published slug existence:', error);
    return false;
  }

  return data !== null;
} 