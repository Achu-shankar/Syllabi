"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";

interface Feedback {
  id: string;
  chatbot_id: string;
  user_id: string | null;
  session_id: string | null;
  feedback_type: 'bug' | 'feature' | 'improvement' | 'question' | 'other';
  rating: number | null;
  subject: string | null;
  message: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  creator_response: string | null;
  responded_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface FeedbackListResponse {
  feedback: Feedback[];
  total: number;
}

interface FeedbackFilters {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

interface UpdateFeedbackData {
  status?: string;
  creator_response?: string | null;
}

// --- Fetch Feedback ---
async function fetchFeedbackAPI(
  chatbotId: string,
  filters: FeedbackFilters = {}
): Promise<FeedbackListResponse> {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.type && filters.type !== 'all') params.append('type', filters.type);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());

  const queryString = params.toString();
  const url = `/api/dashboard/chatbots/${chatbotId}/feedback${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to fetch feedback" }));
    throw new Error(errorData.error || "Failed to fetch feedback");
  }

  return response.json();
}

export function useFeedback(chatbotId: string, filters: FeedbackFilters = {}) {
  return useQuery<FeedbackListResponse, Error>({
    queryKey: ['feedback', chatbotId, filters],
    queryFn: () => fetchFeedbackAPI(chatbotId, filters),
    enabled: !!chatbotId,
    retry: 1,
  });
}

// --- Update Feedback ---
async function updateFeedbackAPI(
  chatbotId: string,
  feedbackId: string,
  data: UpdateFeedbackData
): Promise<Feedback> {
  const response = await fetch(
    `/api/dashboard/chatbots/${chatbotId}/feedback/${feedbackId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to update feedback" }));
    throw new Error(errorData.error || "Failed to update feedback");
  }

  return response.json();
}

export function useUpdateFeedback(chatbotId: string) {
  const queryClient = useQueryClient();

  return useMutation<Feedback, Error, { feedbackId: string; data: UpdateFeedbackData }>({
    mutationFn: ({ feedbackId, data }) => updateFeedbackAPI(chatbotId, feedbackId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback', chatbotId] });
      toast.success("Feedback updated successfully!");
    },
    onError: (error) => {
      toast.error(`Error updating feedback: ${error.message}`);
    },
  });
}

// --- Delete Feedback ---
async function deleteFeedbackAPI(
  chatbotId: string,
  feedbackId: string
): Promise<{ message: string }> {
  const response = await fetch(
    `/api/dashboard/chatbots/${chatbotId}/feedback/${feedbackId}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to delete feedback" }));
    throw new Error(errorData.error || "Failed to delete feedback");
  }

  return response.json();
}

export function useDeleteFeedback(chatbotId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: (feedbackId) => deleteFeedbackAPI(chatbotId, feedbackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback', chatbotId] });
      toast.success("Feedback deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Error deleting feedback: ${error.message}`);
    },
  });
}
