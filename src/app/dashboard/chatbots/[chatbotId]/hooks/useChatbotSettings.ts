"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Chatbot, UpdateChatbotPayload } from '@/app/dashboard/libs/queries'; // Assuming types are exported from queries.ts
import { toast } from "sonner";

// --- Fetch a specific chatbot's details ---
async function fetchChatbotDetails(chatbotId: string): Promise<Chatbot | null> {
  if (!chatbotId) return null;
  const response = await fetch(`/api/dashboard/chatbots/${chatbotId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to fetch chatbot details" }));
    throw new Error(errorData.error || "Failed to fetch chatbot details");
  }
  return response.json();
}

export function useFetchChatbotDetails(chatbotId: string) {
  return useQuery<Chatbot | null, Error>({
    queryKey: ['chatbotDetails', chatbotId],
    queryFn: () => fetchChatbotDetails(chatbotId),
    enabled: !!chatbotId, // Only run if chatbotId is available
    retry: 1,
    // You might want to add staleTime or cacheTime configurations here
  });
}

// --- Update a chatbot's settings ---
async function updateChatbotSettingsAPI(
    chatbotId: string, 
    updates: UpdateChatbotPayload
): Promise<Chatbot> {
  const response = await fetch(`/api/dashboard/chatbots/${chatbotId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to update chatbot" }));
    throw new Error(errorData.error || "Failed to update chatbot");
  }
  return response.json();
}

export function useUpdateChatbotSettings(chatbotId: string) {
  const queryClient = useQueryClient();

  return useMutation<Chatbot, Error, UpdateChatbotPayload>({
    mutationFn: (updates) => updateChatbotSettingsAPI(chatbotId, updates),
    onSuccess: (data) => {
      // Invalidate and refetch the specific chatbot's details to update the UI
      queryClient.invalidateQueries({ queryKey: ['chatbotDetails', chatbotId] });
      // Optionally, update the list of all chatbots if that query is active
      queryClient.invalidateQueries({ queryKey: ['chatbots'] }); 
      toast.success("Chatbot settings updated successfully!");
    },
    onError: (error) => {
      toast.error(`Error updating settings: ${error.message}`);
    },
  });
} 