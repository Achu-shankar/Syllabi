'use server';

import 'server-only';
import { createClient } from '../../../utils/supabase/server';
import { cookies } from 'next/headers';
import { generateSlugFromText, generateRandomSuffix } from './slug-utils';

// Define a more specific (though still flexible) type for theme configurations

// NEW: Interface for color-specific properties for light/dark modes
export interface ThemeColors {
  primaryColor?: string;
  headerTextColor?: string;
  chatWindowBackgroundColor?: string;
  bubbleUserBackgroundColor?: string;
  bubbleBotBackgroundColor?: string;
  inputBackgroundColor?: string;
  inputTextColor?: string;

  // New explicit properties
  sidebarBackgroundColor?: string;
  sidebarTextColor?: string;
  inputAreaBackgroundColor?: string;
  bubbleUserTextColor?: string;
  bubbleBotTextColor?: string;
  suggestedQuestionChipBackgroundColor?: string;
  suggestedQuestionChipTextColor?: string;
  suggestedQuestionChipBorderColor?: string;

  // Allow other color-related string keys with any value for flexibility
  [key: string]: any;
}

export interface ThemeConfig {
  fontFamily?: string;
  aiMessageAvatarUrl?: string | null;
  userMessageAvatarUrl?: string | null;
  light: ThemeColors; // NEW: Light mode specific colors
  dark: ThemeColors;  // NEW: Dark mode specific colors
  // Allow other global (non-color mode specific) string keys with any value for flexibility
  [key: string]: any; 
}

// Define the types based on your Supabase chatbots table
export interface Chatbot {
  id: string; // UUID
  user_id: string; // UUID, FK to auth.users(id)
  name: string; // Renamed from internal_name
  description?: string | null; // NEW
  student_facing_name?: string | null;
  logo_url?: string | null; // This is the AI Assistant Logo
  welcome_message?: string | null;
  theme: ThemeConfig; // Updated from any
  ai_model_identifier?: string | null; // NEW
  system_prompt?: string | null; // NEW
  temperature?: number | null; // NEW, e.g., 0.7
  suggested_questions?: string[] | null; // Updated from any
  published: boolean; // NEW, default false
  is_active: boolean; // System status
  shareable_url_slug?: string | null;
  rate_limit_config?: any | null; // JSONB
  access_control_config?: any | null; // JSONB
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface CreateChatbotPayload {
  user_id: string;
  name: string; // Renamed from internal_name
  description?: string;
  student_facing_name?: string;
  logo_url?: string;
  welcome_message?: string;
  theme?: ThemeConfig; // Updated
  ai_model_identifier?: string;
  system_prompt?: string;
  temperature?: number;
  suggested_questions?: string[]; // Updated
  published?: boolean; // Default will be false in DB
  is_active?: boolean; // Default will be true in DB
  shareable_url_slug?: string;
  // Other config JSONB fields can be added if needed at creation
}

// Payload for updating general chatbot settings. More specific payloads can be created for other setting groups.
export interface UpdateChatbotGeneralSettingsPayload {
  name?: string;
  description?: string;
  welcome_message?: string;
  student_facing_name?: string; // If it's considered general
  logo_url?: string; // If it's considered general
  // `published` might be handled by a separate function/endpoint for clarity, or included here
  // `theme`, `ai_model_identifier`, `system_prompt`, `temperature`, `suggested_questions` would be in their own update payloads
}

// Broader update payload, similar to old UpdateChatbotPayloadDB but matching new schema
// This can be used by a more generic updateChatbot function if needed,
// or we can have more specific update functions like updateChatbotGeneralSettings.
export interface UpdateChatbotPayload {
  name?: string;
  description?: string;
  student_facing_name?: string | null;
  logo_url?: string | null;
  welcome_message?: string;
  theme?: ThemeConfig; // Updated
  ai_model_identifier?: string;
  system_prompt?: string;
  temperature?: number;
  suggested_questions?: string[]; // Updated
  published?: boolean;
  is_active?: boolean;
  shareable_url_slug?: string;
  rate_limit_config?: any;
  access_control_config?: any;
}

/**
 * Creates a new chatbot entry in the database.
 * @param chatbotData - The data for the new chatbot.
 * @returns The newly created chatbot data or throws an error.
 */
export async function createChatbot(
  chatbotData: CreateChatbotPayload
): Promise<Chatbot> {
  const cookieStore = cookies();
  const supabase = await createClient();

  // Generate a unique slug if not provided
  let shareableUrlSlug = chatbotData.shareable_url_slug;
  if (!shareableUrlSlug) {
    // Use student_facing_name if available, otherwise fall back to name
    const nameForSlug = chatbotData.student_facing_name || chatbotData.name;
    shareableUrlSlug = await generateUniqueSlug(nameForSlug, undefined);
  }

  const { data, error } = await supabase
    .from('chatbots')
    .insert([
      {
        ...chatbotData,
        shareable_url_slug: shareableUrlSlug, // Ensure slug is always set
        // Ensure default values are handled by db or explicitly set if needed
        is_active: chatbotData.is_active === undefined ? true : chatbotData.is_active,
        published: chatbotData.published === undefined ? false : chatbotData.published,
        theme: chatbotData.theme === undefined ? {} : chatbotData.theme,
      },
    ])
    .select()
    .single(); // Assuming you want the created object back

  if (error) {
    console.error('Error creating chatbot:', error);
    throw new Error(`Failed to create chatbot: ${error.message}`);
  }
  if (!data) {
    throw new Error('Failed to create chatbot: No data returned.');
  }
  return data as Chatbot;
}

/**
 * Fetches all chatbots associated with a given user ID.
 * @param userId - The ID of the user whose chatbots to fetch.
 * @returns A list of chatbots or throws an error.
 */
export async function getChatbotsByUserId(userId: string): Promise<Chatbot[]> {
  const cookieStore = cookies();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('chatbots')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching chatbots by user ID:', error);
    throw new Error(`Failed to fetch chatbots: ${error.message}`);
  }

  return (data as Chatbot[]) || [];
}

/**
 * Fetches a single chatbot by its ID, ensuring the user owns it.
 * @param chatbotId - The ID of the chatbot to fetch.
 * @param userId - The ID of the user making the request (for RLS).
 * @returns The chatbot data or null if not found/not authorized, or throws an error for other issues.
 */
export async function getChatbotById(chatbotId: string, userId: string): Promise<Chatbot | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('chatbots')
    .select('*')
    .eq('id', chatbotId)
    .eq('user_id', userId) // Ensure user ownership
    .maybeSingle(); // Use maybeSingle to return null if not found, instead of erroring

  if (error) {
    console.error('Error fetching chatbot by ID:', error);
    // Don't throw for PGRST116 (not found) if maybeSingle is used correctly
    // but throw for other unexpected errors.
    if (error.code !== 'PGRST116') { 
        throw new Error(`Failed to fetch chatbot: ${error.message}`);
    }
  }
  return data as Chatbot | null;
}

/**
* Updates an existing chatbot for a given user.
* @param chatbotId - The ID of the chatbot to update.
* @param userId - The ID of the user who owns the chatbot (for RLS).
* @param updates - An object containing the fields to update (using the broad UpdateChatbotPayload).
* @returns The updated chatbot data or throws an error.
*/
export async function updateChatbot(
    chatbotId: string,
    userId: string, 
    updates: UpdateChatbotPayload // Use the broader payload for general updates
  ): Promise<Chatbot> {
    const supabase = await createClient();
  
    let payload = { ...updates }; // No need to manually set updated_at if DB trigger is reliable

    // If updating name/student_facing_name and no explicit slug update, regenerate slug
    const isNameUpdating = updates.student_facing_name !== undefined || updates.name !== undefined;
    const hasExplicitSlugUpdate = updates.shareable_url_slug !== undefined;
    
    if (isNameUpdating && !hasExplicitSlugUpdate) {
      // Fetch current data to get the current name for slug generation
      const currentData = await getChatbotById(chatbotId, userId);
      if (currentData) {
        // Use updated name if provided, otherwise current name
        const newStudentFacingName = updates.student_facing_name !== undefined ? updates.student_facing_name : currentData.student_facing_name;
        const newName = updates.name !== undefined ? updates.name : currentData.name;
        const nameForSlug = newStudentFacingName || newName;
        
        if (nameForSlug) {
          payload.shareable_url_slug = await generateUniqueSlug(nameForSlug, chatbotId);
        }
      }
    }

    const { data, error } = await supabase
      .from('chatbots')
      .update(payload)
      .eq('id', chatbotId)
      .eq('user_id', userId) 
      .select()
      .single();
  
    if (error) {
      console.error('Error updating chatbot:', error);
      throw new Error(`Failed to update chatbot: ${error.message}`);
    }
    if (!data) {
      throw new Error('Failed to update chatbot or chatbot not found for user.');
    }
    return data as Chatbot;
  }
  
  /**
  * Deletes a chatbot for a given user.
  * @param chatbotId - The ID of the chatbot to delete.
  * @param userId - The ID of the user who owns the chatbot (for RLS).
  * @returns void or throws an error.
  */
  export async function deleteChatbot(
    chatbotId: string, 
    userId: string
  ): Promise<void> {
    const supabase = await createClient();
  
    const { error } = await supabase
      .from('chatbots')
      .delete()
      .eq('id', chatbotId)
      .eq('user_id', userId); // Important: Ensure user owns the chatbot
  
    if (error) {
      console.error('Error deleting chatbot:', error);
      throw new Error(`Failed to delete chatbot: ${error.message}`);
    }
    // No data is typically returned on a successful delete operation that returns 204 No Content
  }

// --- Profile Management ---
export interface Profile {
  id: string; // Matches auth.users.id
  updated_at?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  // Add other profile fields as needed, e.g., subscription_tier, etc.
}

export interface UpdateProfilePayload {
  full_name?: string;
  avatar_url?: string;
  // Only include fields that are user-updatable
}

/**
 * Fetches the profile for a given user ID.
 * @param userId - The ID of the user whose profile to fetch.
 * @returns The user's profile data or throws an error.
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // PGRST116: Row to be updated was not found
      // This can happen if the profile row doesn't exist yet, which is fine for a fetch.
      return null;
    }
    console.error('Error fetching user profile:', error);
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }
  return data as Profile | null;
}


/**
 * Updates an existing user profile.
 * @param userId - The ID of the user whose profile to update.
 * @param updates - An object containing the fields to update.
 * @returns The updated profile data or throws an error.
 */
export async function updateUserProfile(
  userId: string,
  updates: UpdateProfilePayload
): Promise<Profile> {
  const supabase = await createClient();

  // Prepare the data for upsert. Include the userId as 'id' for conflict detection.
  const profileDataToUpsert = {
    id: userId, // This is the column Supabase will use for onConflict
    ...updates,
    updated_at: new Date().toISOString(), // Explicitly set updated_at
  };

  // Remove email from upsert payload if it's present in 'updates' 
  // as email is usually not directly updatable or comes from auth.users
  // Or, ensure your 'profiles' table RLS/triggers handle email consistency if it is updatable.
  // For simplicity, if 'email' could be in 'updates', ensure it's handled correctly:
  // delete (profileDataToUpsert as any).email; // Example if email is not meant to be set here

  const { data, error } = await supabase
    .from('profiles')
    .upsert(profileDataToUpsert, {
      onConflict: 'id', // Specify the column that defines a conflict (your primary key)
      // ignoreDuplicates: false, // Default is false, meaning it will perform an UPDATE on conflict.
    })
    .select() // Select the data after upsert
    .single(); // Expect one row (the upserted one)

  if (error) {
    console.error('Error upserting user profile:', error);
    throw new Error(`Failed to upsert user profile: ${error.message} ${userId}`);
  }
  // The explicit !data check might be redundant if .single() is used, as .single() errors if no data.
  // However, it's good for clarity if .single() were ever removed.
  if (!data) {
    throw new Error('Failed to upsert user profile: No data returned after upsert.');
  }
  return data as Profile;
}

// --- Slug Generation Utilities ---

/**
 * Checks if a shareable URL slug already exists in the database
 * @param slug - The slug to check
 * @param excludeId - Optional: ID of chatbot to exclude from the check (useful for updates)
 * @returns Promise<boolean> - True if slug exists, false otherwise
 */
export async function checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
  const supabase = await createClient();
  
  let query = supabase
    .from('chatbots')
    .select('id')
    .eq('shareable_url_slug', slug);
  
  // If excludeId is provided, exclude that chatbot from the check
  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Error checking slug existence:', error);
    // If there's an error, assume it exists to be safe
    return true;
  }

  return data !== null;
}

/**
 * Generates a unique shareable URL slug for a chatbot
 * @param chatbotName - The name to base the slug on (student_facing_name or name)
 * @param excludeId - Optional: ID of chatbot to exclude from uniqueness check (useful for updates)
 * @param maxAttempts - Maximum attempts to find a unique slug
 * @returns Promise<string> - A unique slug
 */
export async function generateUniqueSlug(chatbotName: string, excludeId?: string, maxAttempts?: number): Promise<string> {
  const attempts = maxAttempts || 5;
  const baseSlug = generateSlugFromText(chatbotName);
  
  // If the base name is empty or too short, use a default
  if (!baseSlug || baseSlug.length < 3) {
    return `chatbot-${generateRandomSuffix()}`;
  }

  // First, try the base slug without any suffix
  const slugExists = await checkSlugExists(baseSlug, excludeId);
  if (!slugExists) {
    return baseSlug;
  }

  // If base slug exists, try with random suffixes
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const slugWithSuffix = `${baseSlug}-${generateRandomSuffix()}`;
    const suffixSlugExists = await checkSlugExists(slugWithSuffix, excludeId);
    
    if (!suffixSlugExists) {
      return slugWithSuffix;
    }
  }

  // Fallback: use timestamp + random suffix (virtually guaranteed to be unique)
  const timestamp = Date.now().toString(36); // Base36 for shorter representation
  return `${baseSlug}-${timestamp}`;
}

/**
 * Backfills missing shareable_url_slug for existing chatbots
 * This is a utility function for data migration
 * @param userId - Optional: Only backfill for a specific user
 * @returns Promise<number> - Number of chatbots updated
 */
export async function backfillMissingSlugs(userId?: string): Promise<number> {
  const supabase = await createClient();
  
  // Find chatbots without slugs
  let query = supabase
    .from('chatbots')
    .select('id, name, student_facing_name')
    .or('shareable_url_slug.is.null,shareable_url_slug.eq.');
    
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data: chatbotsWithoutSlugs, error: fetchError } = await query;
  
  if (fetchError) {
    console.error('Error fetching chatbots without slugs:', fetchError);
    throw new Error(`Failed to fetch chatbots: ${fetchError.message}`);
  }
  
  if (!chatbotsWithoutSlugs || chatbotsWithoutSlugs.length === 0) {
    return 0;
  }
  
  let updatedCount = 0;
  
  // Process each chatbot
  for (const chatbot of chatbotsWithoutSlugs) {
    try {
      const nameForSlug = chatbot.student_facing_name || chatbot.name;
      const newSlug = await generateUniqueSlug(nameForSlug, undefined);
      
      const { error: updateError } = await supabase
        .from('chatbots')
        .update({ shareable_url_slug: newSlug })
        .eq('id', chatbot.id);
        
      if (updateError) {
        console.error(`Error updating slug for chatbot ${chatbot.id}:`, updateError);
      } else {
        updatedCount++;
      }
    } catch (error) {
      console.error(`Error processing chatbot ${chatbot.id}:`, error);
    }
  }
  
  return updatedCount;
}

// We can add more query functions here later, e.g.:
// export async function getChatbotById(chatbotId: string, userId: string): Promise<Chatbot | null> { ... }
// export async function updateChatbot(chatbotId: string, userId: string, updates: Partial<Chatbot>): Promise<Chatbot> { ... }
// export async function deleteChatbot(chatbotId: string, userId: string): Promise<void> { ... }
