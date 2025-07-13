'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ChatbotChannelLink } from '../libs/queries';

interface CreateChannelLinkParams {
  chatbotId: string;
  integrationId: string;
  config: Record<string, any>;
}

interface UpdateChannelLinkParams {
  chatbotId: string;
  linkId: string;
  config: Record<string, any>;
}

interface DeleteChannelLinkParams {
  chatbotId: string;
  linkId: string;
}

// Fetch all channel links for a chatbot
async function fetchChannelLinks(chatbotId: string): Promise<ChatbotChannelLink[]> {
  const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/channels`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch channel links');
  }
  
  return response.json();
}

// Create a new channel link
async function createChannelLink(params: CreateChannelLinkParams): Promise<ChatbotChannelLink> {
  const response = await fetch(`/api/dashboard/chatbots/${params.chatbotId}/channels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      integrationId: params.integrationId,
      config: params.config,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create channel link');
  }
  
  return response.json();
}

// Update an existing channel link
async function updateChannelLink(params: UpdateChannelLinkParams): Promise<ChatbotChannelLink> {
  const response = await fetch(`/api/dashboard/chatbots/${params.chatbotId}/channels`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      linkId: params.linkId,
      config: params.config,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update channel link');
  }
  
  return response.json();
}

// Delete a channel link
async function deleteChannelLink(params: DeleteChannelLinkParams): Promise<void> {
  const response = await fetch(
    `/api/dashboard/chatbots/${params.chatbotId}/channels?linkId=${params.linkId}`,
    { method: 'DELETE' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete channel link');
  }
}

// Main hook for fetching channel links
export function useChatbotChannels(chatbotId: string) {
  return useQuery({
    queryKey: ['chatbot-channels', chatbotId],
    queryFn: () => fetchChannelLinks(chatbotId),
    enabled: !!chatbotId,
  });
}

// Hook for creating channel links
export function useCreateChannelLink() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createChannelLink,
    onSuccess: (data, variables) => {
      // Invalidate and refetch the channel links
      queryClient.invalidateQueries({ 
        queryKey: ['chatbot-channels', variables.chatbotId] 
      });
      
      const integrationTypeName = data.integration_type === 'slack' ? 'Slack' :
                                  data.integration_type === 'discord' ? 'Discord' :
                                  data.integration_type === 'alexa' ? 'Alexa' : 'Channel';
      
      toast.success(`${integrationTypeName} channel linked successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to link channel: ${error.message}`);
    },
  });
}

// Hook for updating channel links
export function useUpdateChannelLink() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateChannelLink,
    onSuccess: (data, variables) => {
      // Invalidate and refetch the channel links
      queryClient.invalidateQueries({ 
        queryKey: ['chatbot-channels', variables.chatbotId] 
      });
      
      const integrationTypeName = data.integration_type === 'slack' ? 'Slack' :
                                  data.integration_type === 'discord' ? 'Discord' :
                                  data.integration_type === 'alexa' ? 'Alexa' : 'Channel';
      
      toast.success(`${integrationTypeName} channel updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update channel: ${error.message}`);
    },
  });
}

// Hook for deleting channel links
export function useDeleteChannelLink() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteChannelLink,
    onSuccess: (_, variables) => {
      // Invalidate and refetch the channel links
      queryClient.invalidateQueries({ 
        queryKey: ['chatbot-channels', variables.chatbotId] 
      });
      
      toast.success('Channel unlinked successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to unlink channel: ${error.message}`);
    },
  });
}

// Utility hook to combine create/update logic for simpler usage
export function useChannelLinkMutation() {
  const createMutation = useCreateChannelLink();
  const updateMutation = useUpdateChannelLink();
  
  return {
    createLink: createMutation.mutate,
    updateLink: updateMutation.mutate,
    isLoading: createMutation.isPending || updateMutation.isPending,
  };
} 