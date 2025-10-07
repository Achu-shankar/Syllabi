"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";

interface Announcement {
  id: string;
  chatbot_id: string;
  user_id: string;
  title: string;
  content: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateAnnouncementData {
  title: string;
  content: string;
  is_published?: boolean;
}

interface UpdateAnnouncementData {
  title?: string;
  content?: string;
  is_published?: boolean;
}

// --- Fetch Announcements ---
async function fetchAnnouncementsAPI(chatbotId: string): Promise<Announcement[]> {
  const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/announcements`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to fetch announcements" }));
    throw new Error(errorData.error || "Failed to fetch announcements");
  }

  return response.json();
}

export function useAnnouncements(chatbotId: string) {
  return useQuery<Announcement[], Error>({
    queryKey: ['announcements', chatbotId],
    queryFn: () => fetchAnnouncementsAPI(chatbotId),
    enabled: !!chatbotId,
    retry: 1,
  });
}

// --- Create Announcement ---
async function createAnnouncementAPI(
  chatbotId: string,
  data: CreateAnnouncementData
): Promise<Announcement> {
  const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/announcements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to create announcement" }));
    throw new Error(errorData.error || "Failed to create announcement");
  }

  return response.json();
}

export function useCreateAnnouncement(chatbotId: string) {
  const queryClient = useQueryClient();

  return useMutation<Announcement, Error, CreateAnnouncementData>({
    mutationFn: (data) => createAnnouncementAPI(chatbotId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', chatbotId] });
      toast.success("Announcement created successfully!");
    },
    onError: (error) => {
      toast.error(`Error creating announcement: ${error.message}`);
    },
  });
}

// --- Update Announcement ---
async function updateAnnouncementAPI(
  chatbotId: string,
  announcementId: string,
  data: UpdateAnnouncementData
): Promise<Announcement> {
  const response = await fetch(
    `/api/dashboard/chatbots/${chatbotId}/announcements/${announcementId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to update announcement" }));
    throw new Error(errorData.error || "Failed to update announcement");
  }

  return response.json();
}

export function useUpdateAnnouncement(chatbotId: string) {
  const queryClient = useQueryClient();

  return useMutation<Announcement, Error, { announcementId: string; data: UpdateAnnouncementData }>({
    mutationFn: ({ announcementId, data }) => updateAnnouncementAPI(chatbotId, announcementId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', chatbotId] });
      toast.success("Announcement updated successfully!");
    },
    onError: (error) => {
      toast.error(`Error updating announcement: ${error.message}`);
    },
  });
}

// --- Delete Announcement ---
async function deleteAnnouncementAPI(
  chatbotId: string,
  announcementId: string
): Promise<{ message: string }> {
  const response = await fetch(
    `/api/dashboard/chatbots/${chatbotId}/announcements/${announcementId}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to delete announcement" }));
    throw new Error(errorData.error || "Failed to delete announcement");
  }

  return response.json();
}

export function useDeleteAnnouncement(chatbotId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: (announcementId) => deleteAnnouncementAPI(chatbotId, announcementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', chatbotId] });
      toast.success("Announcement deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Error deleting announcement: ${error.message}`);
    },
  });
}
