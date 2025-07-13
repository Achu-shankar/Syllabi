"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ChatbotVisibility, 
  ChatbotPermission, 
  UserSearchResult,
  UpdateChatbotPayload 
} from '@/app/dashboard/libs/queries';
import { toast } from "sonner";
import { getProductionBaseUrl } from '@/utils/url';

// --- Update Chatbot Visibility ---
async function updateChatbotVisibilityAPI(
  chatbotId: string, 
  visibility: ChatbotVisibility
): Promise<any> {
  const response = await fetch(`/api/dashboard/chatbots/${chatbotId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ visibility }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to update visibility" }));
    throw new Error(errorData.error || "Failed to update visibility");
  }
  return response.json();
}

export function useUpdateChatbotVisibility(chatbotId: string) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, ChatbotVisibility>({
    mutationFn: (visibility) => updateChatbotVisibilityAPI(chatbotId, visibility),
    onSuccess: (data, visibility) => {
      queryClient.invalidateQueries({ queryKey: ['chatbotDetails', chatbotId] });
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
      toast.success(`Chatbot visibility updated to ${visibility}`);
    },
    onError: (error) => {
      toast.error(`Error updating visibility: ${error.message}`);
    },
  });
}

// --- Search Users ---
async function searchUsersAPI(searchQuery: string): Promise<UserSearchResult[]> {
  if (!searchQuery || searchQuery.trim().length < 2) {
    return [];
  }

  const response = await fetch(`/api/dashboard/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to search users" }));
    throw new Error(errorData.error || "Failed to search users");
  }
  
  return response.json();
}

export function useSearchUsers(searchQuery: string) {
  return useQuery<UserSearchResult[], Error>({
    queryKey: ['userSearch', searchQuery],
    queryFn: () => searchUsersAPI(searchQuery),
    enabled: !!searchQuery && searchQuery.trim().length >= 2,
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

// --- Grant Chatbot Permission ---
async function grantChatbotPermissionAPI(
  chatbotId: string,
  userId: string,
  role: 'viewer' | 'editor' = 'viewer'
): Promise<ChatbotPermission> {
  const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/permissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId, role }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to grant permission" }));
    throw new Error(errorData.error || "Failed to grant permission");
  }
  
  return response.json();
}

export function useGrantChatbotPermission(chatbotId: string) {
  const queryClient = useQueryClient();

  return useMutation<ChatbotPermission, Error, { userId: string; role?: 'viewer' | 'editor' }>({
    mutationFn: ({ userId, role = 'viewer' }) => grantChatbotPermissionAPI(chatbotId, userId, role),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chatbotPermissions', chatbotId] });
      toast.success("User access granted successfully!");
    },
    onError: (error) => {
      toast.error(`Error granting access: ${error.message}`);
    },
  });
}

// --- Fetch Chatbot Permissions ---
async function fetchChatbotPermissionsAPI(chatbotId: string): Promise<any[]> {
  const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/permissions`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to fetch permissions" }));
    throw new Error(errorData.error || "Failed to fetch permissions");
  }
  
  return response.json();
}

export function useChatbotPermissions(chatbotId: string) {
  return useQuery<any[], Error>({
    queryKey: ['chatbotPermissions', chatbotId],
    queryFn: () => fetchChatbotPermissionsAPI(chatbotId),
    enabled: !!chatbotId,
    retry: 1,
  });
}

// --- Remove Chatbot Permission ---
async function removeChatbotPermissionAPI(
  chatbotId: string,
  userId: string
): Promise<{ message: string }> {
  const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/permissions/${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to remove permission" }));
    throw new Error(errorData.error || "Failed to remove permission");
  }
  
  return response.json();
}

export function useRemoveChatbotPermission(chatbotId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: (userId) => removeChatbotPermissionAPI(chatbotId, userId),
    onSuccess: (data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['chatbotPermissions', chatbotId] });
      toast.success("User access removed successfully!");
    },
    onError: (error) => {
      toast.error(`Error removing access: ${error.message}`);
    },
  });
}

// --- Generate Shareable URL ---
export function generateShareableUrl(chatbotId: string, slug?: string): string {
  // For now, use the chatbot ID if no slug is available
  const urlPath = slug || chatbotId;
  return `${getProductionBaseUrl()}/chat/${urlPath}`;
} 