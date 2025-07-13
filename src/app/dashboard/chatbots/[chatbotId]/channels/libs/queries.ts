'use server';

import 'server-only';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

export interface ChatbotChannelLink {
  id: string;
  chatbot_id: string;
  integration_id: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined fields from connected_integrations
  integration_type?: string;
  integration_name?: string;
  integration_metadata?: Record<string, any>;
}

/**
 * Get all channel links for a specific chatbot
 */
export async function getChatbotChannelLinks(chatbotId: string, userId: string): Promise<ChatbotChannelLink[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chatbot_channels')
    .select(`
      *,
      connected_integrations!inner(
        integration_type,
        metadata
      )
    `)
    .eq('chatbot_id', chatbotId)
    .eq('connected_integrations.user_id', userId);

  if (error) {
    console.error('Error fetching chatbot channel links:', error);
    throw new Error(`Failed to fetch channel links: ${error.message}`);
  }

  return (data || []).map((link: any) => ({
    id: link.id,
    chatbot_id: link.chatbot_id,
    integration_id: link.integration_id,
    config: link.config,
    created_at: link.created_at,
    updated_at: link.updated_at,
    integration_type: link.connected_integrations?.integration_type,
    integration_metadata: link.connected_integrations?.metadata,
  }));
}

/**
 * Create a new chatbot channel link
 */
export async function createChatbotChannelLink(params: {
  chatbotId: string;
  integrationId: string;
  config: Record<string, any>;
  userId: string;
}): Promise<ChatbotChannelLink> {
  const supabase = await createClient();
  
  // First verify the user owns both the chatbot and the integration
  const { data: chatbot } = await supabase
    .from('chatbots')
    .select('user_id')
    .eq('id', params.chatbotId)
    .eq('user_id', params.userId)
    .single();

  if (!chatbot) {
    throw new Error('Chatbot not found or access denied');
  }

  const { data: integration } = await supabase
    .from('connected_integrations')
    .select('user_id')
    .eq('id', params.integrationId)
    .eq('user_id', params.userId)
    .single();

  if (!integration) {
    throw new Error('Integration not found or access denied');
  }

  const { data, error } = await supabase
    .from('chatbot_channels')
    .insert({
      chatbot_id: params.chatbotId,
      integration_id: params.integrationId,
      config: params.config,
    })
    .select(`
      *,
      connected_integrations!inner(
        integration_type,
        metadata
      )
    `)
    .single();

  if (error) {
    console.error('Error creating chatbot channel link:', error);
    throw new Error(`Failed to create channel link: ${error.message}`);
  }

  return {
    id: data.id,
    chatbot_id: data.chatbot_id,
    integration_id: data.integration_id,
    config: data.config,
    created_at: data.created_at,
    updated_at: data.updated_at,
    integration_type: data.connected_integrations?.integration_type,
    integration_metadata: data.connected_integrations?.metadata,
  };
}

/**
 * Update an existing chatbot channel link
 */
export async function updateChatbotChannelLink(params: {
  linkId: string;
  config: Record<string, any>;
  userId: string;
}): Promise<ChatbotChannelLink> {
  const supabase = await createClient();
  
  // First verify the user owns a chatbot linked to this channel
  const { data: channelLink, error: fetchError } = await supabase
    .from('chatbot_channels')
    .select(`
      id,
      chatbot_id,
      chatbots!inner(user_id)
    `)
    .eq('id', params.linkId)
    .eq('chatbots.user_id', params.userId)
    .single();

  if (fetchError || !channelLink) {
    console.error('Error verifying channel link ownership:', fetchError);
    throw new Error('Channel link not found or access denied');
  }

  // Now update the channel link
  const { data, error } = await supabase
    .from('chatbot_channels')
    .update({ config: params.config })
    .eq('id', params.linkId)
    .select(`
      *,
      connected_integrations!inner(
        integration_type,
        metadata
      )
    `)
    .single();

  if (error) {
    console.error('Error updating chatbot channel link:', error);
    throw new Error(`Failed to update channel link: ${error.message}`);
  }

  return {
    id: data.id,
    chatbot_id: data.chatbot_id,
    integration_id: data.integration_id,
    config: data.config,
    created_at: data.created_at,
    updated_at: data.updated_at,
    integration_type: data.connected_integrations?.integration_type,
    integration_metadata: data.connected_integrations?.metadata,
  };
}

/**
 * Delete a chatbot channel link
 */
export async function deleteChatbotChannelLink(params: {
  linkId: string;
  userId: string;
}): Promise<void> {
  const supabase = await createClient();
  
  // First verify the user owns a chatbot linked to this channel
  const { data: channelLink, error: fetchError } = await supabase
    .from('chatbot_channels')
    .select(`
      id,
      chatbot_id,
      chatbots!inner(user_id)
    `)
    .eq('id', params.linkId)
    .eq('chatbots.user_id', params.userId)
    .single();

  if (fetchError || !channelLink) {
    console.error('Error verifying channel link ownership:', fetchError);
    throw new Error('Channel link not found or access denied');
  }

  // Now delete the channel link
  const { error } = await supabase
    .from('chatbot_channels')
    .delete()
    .eq('id', params.linkId);

  if (error) {
    console.error('Error deleting chatbot channel link:', error);
    throw new Error(`Failed to delete channel link: ${error.message}`);
  }
}

/**
 * Find a chatbot for a Slack command (used by integration endpoints)
 */
export async function findSlackChatbotForCommand(params: {
  integrationId: string;
  command?: string;
}): Promise<{ chatbotId: string; isMatch: boolean } | null> {
  const supabase = createServiceClient();
  
  // First try to find a chatbot with matching slash command
  if (params.command) {
    const { data: commandMatch } = await supabase
      .from('chatbot_channels')
      .select('chatbot_id, config')
      .eq('integration_id', params.integrationId)
      .eq('config->>slash_command', params.command)
      .maybeSingle();

    if (commandMatch) {
      return { chatbotId: commandMatch.chatbot_id, isMatch: true };
    }
  }

  // Fall back to default chatbot for this integration
  const { data: defaultMatch } = await supabase
    .from('chatbot_channels')
    .select('chatbot_id, config')
    .eq('integration_id', params.integrationId)
    .eq('config->>is_default', true)
    .maybeSingle();

  if (defaultMatch) {
    return { chatbotId: defaultMatch.chatbot_id, isMatch: false };
  }

  return null;
}
