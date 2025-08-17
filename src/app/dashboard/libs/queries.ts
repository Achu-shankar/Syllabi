'use server';

import 'server-only';
import { createClient } from '../../../utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
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
  themeId?: string; // NEW: Unique identifier for predefined themes
  fontFamily?: string;
  aiMessageAvatarUrl?: string | null;
  userMessageAvatarUrl?: string | null;
  light: ThemeColors; // NEW: Light mode specific colors
  dark: ThemeColors;  // NEW: Dark mode specific colors
  // Allow other global (non-color mode specific) string keys with any value for flexibility
  [key: string]: any; 
}

// NEW: Enhanced theme structure for chatbots
export interface EnhancedThemeConfig {
  source: {
    type: 'default' | 'custom';
    themeId?: string; // For default themes
    customThemeId?: string; // For custom themes
    lastSyncedAt?: string;
  };
  config: ThemeConfig;
  customizations?: {
    hasCustomColors?: boolean;
    hasCustomAvatars?: boolean;
    hasCustomFonts?: boolean;
    [key: string]: any;
  };
}

// Enum types matching the database
export type ChatbotVisibility = 'private' | 'public' | 'shared';
export type ChatbotRole = 'viewer' | 'editor';

// Define the types based on your Supabase chatbots table
export interface Chatbot {
  id: string; // UUID
  user_id: string; // UUID, FK to auth.users(id)
  name: string; // Renamed from internal_name
  description?: string | null; // NEW
  student_facing_name?: string | null;
  logo_url?: string | null; // This is the AI Assistant Logo
  welcome_message?: string | null;
  theme: EnhancedThemeConfig | ThemeConfig; // Updated to support both old and new formats
  ai_model_identifier?: string | null; // NEW
  system_prompt?: string | null; // NEW
  temperature?: number | null; // NEW, e.g., 0.7
  suggested_questions?: string[] | null; // Updated from any
  visibility: ChatbotVisibility; // NEW: replaces published boolean
  is_active: boolean; // System status
  shareable_url_slug?: string | null;
  rate_limit_config?: any | null; // JSONB
  access_control_config?: any | null; // JSONB
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

// New interface for chatbot permissions
export interface ChatbotPermission {
  id: string;
  chatbot_id: string;
  user_id: string;
  role: ChatbotRole;
  created_at: string;
}

// New interface for user data (for search results)
export interface UserSearchResult {
  id: string;
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
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
  visibility?: ChatbotVisibility; // Default will be 'private' in DB
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
  // `visibility` might be handled by a separate function/endpoint for clarity, or included here
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
  theme?: EnhancedThemeConfig | ThemeConfig; // Updated to support both formats
  ai_model_identifier?: string;
  system_prompt?: string;
  temperature?: number;
  suggested_questions?: string[]; // Updated
  visibility?: ChatbotVisibility; // Updated from published
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
        visibility: chatbotData.visibility === undefined ? 'private' : chatbotData.visibility,
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
 * Fetches all integrations for a specific user from the unified connected_integrations table.
 * This is used for the main Integrations Hub page.
 * @param userId - The UUID of the user.
 * @returns A promise that resolves to an array of all integration connections.
 */
export async function getIntegrationsForUser(userId: string) {
  const supabase = createServiceClient();
  
  const { data, error } = await supabase
    .from('connected_integrations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching integrations:', error);
    throw new Error('Could not fetch integrations.');
  }

  return data || [];
}

/**
 * Legacy function for Slack connections - now uses unified table
 * @deprecated Use getIntegrationsForUser instead
 */
export async function getSlackConnectionsForUser(userId: string) {
  const allIntegrations = await getIntegrationsForUser(userId);
  return allIntegrations
    .filter(integration => integration.integration_type === 'slack')
    .map(integration => ({
      id: integration.id,
      team_id: integration.metadata?.team_id || '',
      team_name: integration.metadata?.team_name || '',
      created_at: integration.created_at,
      bot_user_id: integration.metadata?.bot_user_id || null
    }));
}

/**
 * Legacy function for Discord connections - now uses unified table
 * @deprecated Use getIntegrationsForUser instead
 */
export async function getDiscordConnectionsForUser(userId: string) {
  const allIntegrations = await getIntegrationsForUser(userId);
  return allIntegrations
    .filter(integration => integration.integration_type === 'discord')
    .map(integration => ({
      id: integration.id,
      guild_id: integration.metadata?.guild_id || '',
      guild_name: integration.metadata?.guild_name || '',
      created_at: integration.created_at
    }));
}

/**
 * Disconnects a Discord guild for a user.
 * Verifies that the user owns chatbots linked to this guild before deleting.
 * @param guildId - The internal UUID of the guild to disconnect.
 * @param userId - The UUID of the user requesting the disconnection.
 * @returns A promise that resolves when the operation is complete.
 */
export async function disconnectDiscordGuild(guildId: string, userId: string) {
    const supabase = createServiceClient();

    // Fetch guild details
    const { data: guildRow, error: guildFetchError } = await supabase
        .from('discord_guilds')
        .select('id, installed_by_user_id')
        .eq('id', guildId)
        .single();

    if (guildFetchError || !guildRow) {
        throw new Error('Discord guild not found.');
    }

    // If the current user installed the bot, allow immediate disconnect
    if (guildRow.installed_by_user_id === userId) {
        const { error: deleteErr } = await supabase
            .from('discord_guilds')
            .delete()
            .eq('id', guildId);
        if (deleteErr) {
            throw new Error('Could not disconnect Discord guild.');
        }
        return { success: true };
    }

    // Fallback: verify ownership via linked chatbots
    const { data: linkedChatbots, error: ownerError } = await supabase
        .from('discord_guild_chatbots')
        .select('id, chatbots ( user_id )')
        .eq('guild_id', guildId);

    if (ownerError || !linkedChatbots || linkedChatbots.length === 0) {
        throw new Error('You are not authorized to disconnect this guild.');
    }

    const userOwnsLinkedChatbot = linkedChatbots.some((link: any) => link.chatbots && link.chatbots.user_id === userId);

    if (!userOwnsLinkedChatbot) {
        throw new Error('You are not authorized to disconnect this guild.');
    }

    const { error: deleteError } = await supabase
        .from('discord_guilds')
        .delete()
        .eq('id', guildId);

    if (deleteError) {
        console.error('Error disconnecting Discord guild:', deleteError);
        throw new Error('Could not disconnect Discord guild.');
    }

    return { success: true };
}

/**
 * Disconnects a Slack workspace for a user.
 * Verifies that the user initiated the original connection before deleting.
 * @param workspaceId - The internal UUID of the workspace to disconnect.
 * @param userId - The UUID of the user requesting the disconnection.
 * @returns A promise that resolves when the operation is complete.
 */
export async function disconnectSlackWorkspace(workspaceId: string, userId: string) {
    const supabase = createServiceClient();

    // 1. Verify ownership of the workspace by internal UUID (id)
    const { data: workspace, error: ownerError } = await supabase
        .from('slack_workspaces')
        .select('id, installed_by')
        .eq('id', workspaceId)
        .single();

    if (ownerError || !workspace) {
        throw new Error('Slack workspace not found or you do not have permission to disconnect it.');
    }

    if (workspace.installed_by !== userId) {
        throw new Error('You are not authorized to disconnect this workspace.');
    }

    // 2. Proceed with deletion (ON DELETE CASCADE will clean up linked chatbots)
    const { error: deleteError } = await supabase
        .from('slack_workspaces')
        .delete()
        .eq('id', workspace.id);
    
    if (deleteError) {
        console.error('Error disconnecting Slack workspace:', deleteError);
        throw new Error('Could not disconnect Slack workspace.');
    }

    return { success: true };
}

/**
 * Legacy function for Alexa connections - now uses unified table
 * @deprecated Use getIntegrationsForUser instead
 */
export async function getAlexaConnectionsForUser(userId: string) {
  const allIntegrations = await getIntegrationsForUser(userId);
  return allIntegrations
    .filter(integration => integration.integration_type === 'alexa')
    .map(integration => ({
      id: integration.id,
      amazon_user_id: integration.metadata?.amazon_user_id || '',
      created_at: integration.created_at
    }));
}

/**
 * Disconnects an Alexa account for a user
 * @param accountId - The ID of the Alexa account to disconnect
 * @param userId - The ID of the user (for ownership verification)
 * @returns Success confirmation or throws an error
 */
export async function disconnectAlexaAccount(accountId: string, userId: string) {
  const supabase = await createClient();

  // First verify the user owns this account
  const { data: account, error: accountError } = await supabase
    .from('alexa_accounts')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();

  if (accountError || !account) {
    throw new Error('Alexa account not found or access denied');
  }

  // Delete the account and all its linked chatbots (cascade delete via FK)
  const { error: deleteError } = await supabase
    .from('alexa_accounts')
    .delete()
    .eq('id', accountId)
    .eq('user_id', userId);

  if (deleteError) {
    throw new Error(`Failed to disconnect Alexa account: ${deleteError.message}`);
  }

  return { success: true };
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
  
    const payload = { ...updates }; // No need to manually set updated_at if DB trigger is reliable

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

// --- Analytics Functions ---

export interface AnalyticsData {
  totalConversations: number;
  totalMessages: number;
  activeUsers: number;
  anonymousSessions: number;
  averageMessagesPerConversation: number;
  conversationCompletionRate: number;
  contentSources: {
    total: number;
    processed: number;
    processing: number;
    failed: number;
  };
  dailyStats: Array<{
    date: string;
    conversations: number;
    messages: number;
  }>;
  userTypes: {
    registered: number;
    anonymous: number;
  };
  technicalMetrics: {
    averageResponseTime: number; // in seconds
    errorRate: number; // percentage
    totalResponses: number;
    failedResponses: number;
  };
  contentUtilization: {
    totalChunks: number;
    utilizedChunks: number;
    utilizationRate: number; // percentage
    topSources: Array<{
      title: string;
      usage_count: number;
    }>;
  };
}

export type TimeRange = '24h' | '7d' | '30d' | 'all';

// Helper function to get date range filter
function getDateFilter(timeRange: TimeRange): string | null {
  const now = new Date();
  switch (timeRange) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case 'all':
      return null;
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}

// Helper function to generate daily stats
function generateDailyStats(
  sessions: any[], 
  messages: any[], 
  timeRange: TimeRange
): Array<{ date: string; conversations: number; messages: number }> {
  const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 30;
  const stats: Array<{ date: string; conversations: number; messages: number }> = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayConversations = sessions.filter((session: any) => {
      const sessionDate = new Date(session.created_at);
      return sessionDate >= dayStart && sessionDate <= dayEnd;
    }).length;
    
    const dayMessages = messages.filter((message: any) => {
      const messageDate = new Date(message.created_at);
      return messageDate >= dayStart && messageDate <= dayEnd;
    }).length;
    
    stats.push({
      date: dateStr,
      conversations: dayConversations,
      messages: dayMessages,
    });
  }
  
  return stats;
}

/**
 * Fetches comprehensive analytics data for a chatbot
 * @param chatbotId - The ID of the chatbot
 * @param userId - The ID of the user (for RLS)
 * @param timeRange - The time range for the analytics
 * @returns Analytics data or throws an error
 */
export async function getChatbotAnalytics(
  chatbotId: string, 
  userId: string, 
  timeRange: TimeRange
): Promise<AnalyticsData> {
  const supabase = await createClient();
  const dateFilter = getDateFilter(timeRange);
  
  // First verify the user owns this chatbot
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('id')
    .eq('id', chatbotId)
    .eq('user_id', userId)
    .single();
    
  if (chatbotError || !chatbot) {
    throw new Error('Chatbot not found or access denied');
  }
  
  // Build the base query for chat sessions
  let sessionsQuery = supabase
    .from('chat_sessions')
    .select('id, user_id, created_at')
    .eq('chatbot_id', chatbotId);
  
  if (dateFilter) {
    sessionsQuery = sessionsQuery.gte('created_at', dateFilter);
  }
  
  const { data: sessions, error: sessionsError } = await sessionsQuery;
  
  if (sessionsError) {
    throw new Error(`Failed to fetch chat sessions: ${sessionsError.message}`);
  }
  
  // Build the base query for messages with more details for technical metrics
  let messagesQuery = supabase
    .from('messages')
    .select('id, chat_session_id, user_id, role, created_at, token_count')
    .in('chat_session_id', sessions?.map((s: any) => s.id) || []);
  
  if (dateFilter) {
    messagesQuery = messagesQuery.gte('created_at', dateFilter);
  }
  
  const { data: messages, error: messagesError } = await messagesQuery;
  
  if (messagesError) {
    throw new Error(`Failed to fetch messages: ${messagesError.message}`);
  }
  
  // Fetch content sources
  const { data: contentSources, error: contentError } = await supabase
    .from('chatbot_content_sources')
    .select('id, indexing_status, title')
    .eq('chatbot_id', chatbotId);
  
  if (contentError) {
    throw new Error(`Failed to fetch content sources: ${contentError.message}`);
  }
  
  // Fetch document chunks for content utilization
  const { data: documentChunks, error: chunksError } = await supabase
    .from('document_chunks')
    .select('id, content_source_id, usage_count')
    .in('content_source_id', contentSources?.map((cs: any) => cs.id) || []);
  
  if (chunksError) {
    console.warn('Failed to fetch document chunks:', chunksError.message);
    // Don't throw error, just log warning as this is supplementary data
  }
  
  // Calculate basic metrics
  const totalConversations = sessions?.length || 0;
  const totalMessages = messages?.length || 0;
  
  // Count unique registered users and anonymous sessions
  const registeredUsers = new Set(
    sessions?.filter((s: any) => s.user_id).map((s: any) => s.user_id) || []
  ).size;
  
  const anonymousSessions = sessions?.filter((s: any) => !s.user_id).length || 0;
  
  // Calculate average messages per conversation
  const averageMessagesPerConversation = totalConversations > 0 
    ? totalMessages / totalConversations 
    : 0;
  
  // Calculate completion rate (sessions with more than 1 message)
  const sessionsWithMessages = sessions?.filter((session: any) => 
    messages?.some((msg: any) => msg.chat_session_id === session.id)
  ).length || 0;
  
  const conversationCompletionRate = totalConversations > 0 
    ? (sessionsWithMessages / totalConversations) * 100 
    : 0;
  
  // Content sources status
  const contentSourcesStatus = {
    total: contentSources?.length || 0,
    processed: contentSources?.filter((cs: any) => cs.indexing_status === 'completed').length || 0,
    processing: contentSources?.filter((cs: any) => cs.indexing_status === 'processing').length || 0,
    failed: contentSources?.filter((cs: any) => cs.indexing_status === 'failed').length || 0,
  };
  
  // Calculate technical metrics
  const technicalMetrics = calculateTechnicalMetrics(messages || []);
  
  // Calculate content utilization
  const contentUtilization = calculateContentUtilization(contentSources || [], documentChunks || []);
  
  // Generate daily stats
  const dailyStats = generateDailyStats(sessions || [], messages || [], timeRange);
  
  return {
    totalConversations,
    totalMessages,
    activeUsers: registeredUsers,
    anonymousSessions,
    averageMessagesPerConversation,
    conversationCompletionRate,
    contentSources: contentSourcesStatus,
    dailyStats,
    userTypes: {
      registered: registeredUsers,
      anonymous: anonymousSessions,
    },
    technicalMetrics,
    contentUtilization,
  };
}

/**
 * Calculate technical performance metrics from messages
 */
function calculateTechnicalMetrics(messages: any[]) {
  if (!messages || messages.length === 0) {
    return {
      averageResponseTime: 0,
      errorRate: 0,
      totalResponses: 0,
      failedResponses: 0,
    };
  }
  
  // Group messages by session to calculate response times
  const sessionMessages = messages.reduce((acc: any, msg: any) => {
    if (!acc[msg.chat_session_id]) {
      acc[msg.chat_session_id] = [];
    }
    acc[msg.chat_session_id].push(msg);
    return acc;
  }, {});
  
  let totalResponseTime = 0;
  let responseCount = 0;
  let totalBotResponses = 0;
  
  // Calculate response times for each session
  Object.values(sessionMessages).forEach((sessionMsgs: any) => {
    // Sort messages by created_at
    sessionMsgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    for (let i = 0; i < sessionMsgs.length - 1; i++) {
      const currentMsg = sessionMsgs[i];
      const nextMsg = sessionMsgs[i + 1];
      
      // If current is user message and next is assistant message
      if (currentMsg.role === 'user' && nextMsg.role === 'assistant') {
        const responseTime = (new Date(nextMsg.created_at).getTime() - new Date(currentMsg.created_at).getTime()) / 1000;
        
        // Only count reasonable response times (between 0.1s and 300s)
        if (responseTime > 0.1 && responseTime < 300) {
          totalResponseTime += responseTime;
          responseCount++;
        }
        
        totalBotResponses++;
      }
    }
  });
  
  const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
  
  // For now, we'll set error rate to 0 since we don't have reliable error tracking
  // This can be enhanced later when proper error logging is implemented
  const errorRate = 0;
  const failedResponses = 0;
  
  return {
    averageResponseTime: Math.round(averageResponseTime * 10) / 10, // Round to 1 decimal
    errorRate,
    totalResponses: totalBotResponses,
    failedResponses,
  };
}

/**
 * Calculate content utilization metrics
 */
function calculateContentUtilization(contentSources: any[], documentChunks: any[]) {
  if (!documentChunks || documentChunks.length === 0) {
    return {
      totalChunks: 0,
      utilizedChunks: 0,
      utilizationRate: 0,
      topSources: [],
    };
  }
  
  const totalChunks = documentChunks.length;
  const utilizedChunks = documentChunks.filter((chunk: any) => (chunk.usage_count || 0) > 0).length;
  const utilizationRate = totalChunks > 0 ? (utilizedChunks / totalChunks) * 100 : 0;
  
  // Calculate usage by source
  const sourceUsage = documentChunks.reduce((acc: any, chunk: any) => {
    const sourceId = chunk.content_source_id;
    if (!acc[sourceId]) {
      acc[sourceId] = 0;
    }
    acc[sourceId] += chunk.usage_count || 0;
    return acc;
  }, {});
  
  // Get top sources with their titles
  const topSources = Object.entries(sourceUsage)
    .map(([sourceId, usageCount]: [string, any]) => {
      const source = contentSources.find((cs: any) => cs.id === sourceId);
      return {
        title: source?.title || 'Unknown Source',
        usage_count: usageCount,
      };
    })
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 5); // Top 5 sources
  
  return {
    totalChunks,
    utilizedChunks,
    utilizationRate: Math.round(utilizationRate * 10) / 10,
    topSources,
  };
}

/**
 * Fetches content sources analytics for a chatbot
 * @param chatbotId - The ID of the chatbot
 * @param userId - The ID of the user (for RLS)
 * @returns Content sources data or throws an error
 */
export async function getChatbotContentAnalytics(chatbotId: string, userId: string) {
  const supabase = await createClient();
  
  // First verify the user owns this chatbot
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('id')
    .eq('id', chatbotId)
    .eq('user_id', userId)
    .single();
    
  if (chatbotError || !chatbot) {
    throw new Error('Chatbot not found or access denied');
  }
  
  const { data: contentSources, error } = await supabase
    .from('chatbot_content_sources')
    .select('id, source_type, indexing_status, title, created_at, processed_at')
    .eq('chatbot_id', chatbotId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to fetch content sources: ${error.message}`);
  }
  
  return contentSources || [];
}

/**
 * Fetches recent activity for a chatbot
 * @param chatbotId - The ID of the chatbot
 * @param userId - The ID of the user (for RLS)
 * @param limit - Number of recent activities to fetch
 * @returns Recent activity data or throws an error
 */
export async function getChatbotRecentActivity(chatbotId: string, userId: string, limit: number = 10) {
  const supabase = await createClient();
  
  // First verify the user owns this chatbot
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('id')
    .eq('id', chatbotId)
    .eq('user_id', userId)
    .single();
    
  if (chatbotError || !chatbot) {
    throw new Error('Chatbot not found or access denied');
  }
  
  const { data: recentSessions, error } = await supabase
    .from('chat_sessions')
    .select(`
      id,
      name,
      created_at,
      updated_at,
      user_id
    `)
    .eq('chatbot_id', chatbotId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    throw new Error(`Failed to fetch recent activity: ${error.message}`);
  }
  
  return recentSessions || [];
}

// We can add more query functions here later, e.g.:
// export async function getChatbotById(chatbotId: string, userId: string): Promise<Chatbot | null> { ... }
// export async function updateChatbot(chatbotId: string, userId: string, updates: Partial<Chatbot>): Promise<Chatbot> { ... }
// export async function deleteChatbot(chatbotId: string, userId: string): Promise<void> { ... }

// --- Theme Management ---

export interface DefaultTheme {
  id: string;
  theme_id: string;
  name: string;
  description?: string | null;
  category: string;
  theme_config: ThemeConfig;
  preview_image_url?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserCustomTheme {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  theme_config: ThemeConfig;
  based_on_default_theme_id?: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomThemePayload {
  name: string;
  description?: string;
  theme_config: ThemeConfig;
  based_on_default_theme_id?: string;
  is_favorite?: boolean;
}

export interface UpdateCustomThemePayload {
  name?: string;
  description?: string;
  theme_config?: ThemeConfig;
  based_on_default_theme_id?: string;
  is_favorite?: boolean;
}

export type ThemeSource = 
  | { type: 'default'; themeId: string }
  | { type: 'custom'; customThemeId: string };

export interface AvailableThemes {
  default: DefaultTheme[];
  custom: UserCustomTheme[];
}

/**
 * Fetches all active default themes
 * @returns List of default themes or throws an error
 */
export async function getDefaultThemes(): Promise<DefaultTheme[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('default_themes')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching default themes:', error);
    throw new Error(`Failed to fetch default themes: ${error.message}`);
  }

  return (data as DefaultTheme[]) || [];
}

/**
 * Fetches all custom themes for a specific user
 * @param userId - The ID of the user
 * @returns List of user's custom themes or throws an error
 */
export async function getUserCustomThemes(userId: string): Promise<UserCustomTheme[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_custom_themes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user custom themes:', error);
    throw new Error(`Failed to fetch custom themes: ${error.message}`);
  }

  return (data as UserCustomTheme[]) || [];
}

/**
 * Fetches all available themes (default + custom) for a user
 * @param userId - The ID of the user
 * @returns Object containing default and custom themes
 */
export async function getAvailableThemes(userId: string): Promise<AvailableThemes> {
  const [defaultThemes, customThemes] = await Promise.all([
    getDefaultThemes(),
    getUserCustomThemes(userId)
  ]);

  return {
    default: defaultThemes,
    custom: customThemes
  };
}

/**
 * Fetches a specific default theme by theme_id
 * @param themeId - The theme_id of the default theme
 * @returns Default theme or null if not found
 */
export async function getDefaultTheme(themeId: string): Promise<DefaultTheme | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('default_themes')
    .select('*')
    .eq('theme_id', themeId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching default theme:', error);
    if (error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch default theme: ${error.message}`);
    }
  }

  return data as DefaultTheme | null;
}

/**
 * Fetches a specific custom theme by ID, ensuring user ownership
 * @param themeId - The ID of the custom theme
 * @param userId - The ID of the user (for ownership check)
 * @returns Custom theme or null if not found/not owned
 */
export async function getCustomTheme(themeId: string, userId: string): Promise<UserCustomTheme | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_custom_themes')
    .select('*')
    .eq('id', themeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching custom theme:', error);
    if (error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch custom theme: ${error.message}`);
    }
  }

  return data as UserCustomTheme | null;
}

/**
 * Gets complete theme data for chatbot application
 * @param source - Theme source information
 * @param userId - The ID of the user (for custom theme access)
 * @returns Complete theme configuration
 */
export async function getThemeForChatbot(source: ThemeSource, userId: string): Promise<ThemeConfig | null> {
  if (source.type === 'default') {
    const theme = await getDefaultTheme(source.themeId);
    return theme?.theme_config || null;
  } else {
    const theme = await getCustomTheme(source.customThemeId, userId);
    return theme?.theme_config || null;
  }
}

/**
 * Creates a new custom theme for a user
 * @param userId - The ID of the user creating the theme
 * @param themeData - The theme data to create
 * @returns The newly created custom theme
 */
export async function createCustomTheme(
  userId: string,
  themeData: CreateCustomThemePayload
): Promise<UserCustomTheme> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_custom_themes')
    .insert([{
      user_id: userId,
      ...themeData,
      is_favorite: themeData.is_favorite ?? false
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating custom theme:', error);
    throw new Error(`Failed to create custom theme: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to create custom theme: No data returned.');
  }

  return data as UserCustomTheme;
}

/**
 * Updates an existing custom theme
 * @param themeId - The ID of the custom theme to update
 * @param userId - The ID of the user (for ownership check)
 * @param updates - The updates to apply
 * @returns The updated custom theme
 */
export async function updateCustomTheme(
  themeId: string,
  userId: string,
  updates: UpdateCustomThemePayload
): Promise<UserCustomTheme> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_custom_themes')
    .update(updates)
    .eq('id', themeId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating custom theme:', error);
    throw new Error(`Failed to update custom theme: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to update custom theme or theme not found for user.');
  }

  return data as UserCustomTheme;
}

/**
 * Deletes a custom theme
 * @param themeId - The ID of the custom theme to delete
 * @param userId - The ID of the user (for ownership check)
 * @returns void or throws an error
 */
export async function deleteCustomTheme(themeId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('user_custom_themes')
    .delete()
    .eq('id', themeId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting custom theme:', error);
    throw new Error(`Failed to delete custom theme: ${error.message}`);
  }
}

/**
 * Duplicates an existing theme (default or custom) as a new custom theme
 * @param userId - The ID of the user creating the duplicate
 * @param source - The source theme to duplicate
 * @param newName - The name for the new theme
 * @param newDescription - Optional description for the new theme
 * @returns The newly created custom theme
 */
export async function duplicateTheme(
  userId: string,
  source: ThemeSource,
  newName: string,
  newDescription?: string
): Promise<UserCustomTheme> {
  // First get the source theme config
  let sourceThemeConfig: ThemeConfig;
  let basedOnThemeId: string | undefined;

  if (source.type === 'default') {
    const defaultTheme = await getDefaultTheme(source.themeId);
    if (!defaultTheme) {
      throw new Error('Source default theme not found');
    }
    sourceThemeConfig = defaultTheme.theme_config;
    basedOnThemeId = defaultTheme.id;
  } else {
    const customTheme = await getCustomTheme(source.customThemeId, userId);
    if (!customTheme) {
      throw new Error('Source custom theme not found or access denied');
    }
    sourceThemeConfig = customTheme.theme_config;
    basedOnThemeId = customTheme.based_on_default_theme_id || undefined;
  }

  // Create the new custom theme
  return createCustomTheme(userId, {
    name: newName,
    description: newDescription,
    theme_config: sourceThemeConfig,
    based_on_default_theme_id: basedOnThemeId,
    is_favorite: false
  });
}

/**
 * Toggles the favorite status of a custom theme
 * @param themeId - The ID of the custom theme
 * @param userId - The ID of the user (for ownership check)
 * @returns The updated custom theme
 */
export async function toggleThemeFavorite(themeId: string, userId: string): Promise<UserCustomTheme> {
  const supabase = await createClient();

  // First get the current favorite status
  const currentTheme = await getCustomTheme(themeId, userId);
  if (!currentTheme) {
    throw new Error('Custom theme not found or access denied');
  }

  // Toggle the favorite status
  return updateCustomTheme(themeId, userId, {
    is_favorite: !currentTheme.is_favorite
  });
}

/**
 * Checks if a custom theme name already exists for a user
 * @param userId - The ID of the user
 * @param name - The theme name to check
 * @param excludeId - Optional ID to exclude from check (for updates)
 * @returns True if name exists, false otherwise
 */
export async function checkCustomThemeNameExists(
  userId: string, 
  name: string, 
  excludeId?: string
): Promise<boolean> {
  const supabase = await createClient();

  let query = supabase
    .from('user_custom_themes')
    .select('id')
    .eq('user_id', userId)
    .eq('name', name);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Error checking theme name existence:', error);
    // If there's an error, assume it exists to be safe
    return true;
  }

  return data !== null;
}
