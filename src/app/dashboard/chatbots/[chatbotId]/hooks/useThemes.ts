"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  AvailableThemes, 
  UserCustomTheme, 
  CreateCustomThemePayload, 
  UpdateCustomThemePayload,
  ThemeSource 
} from '@/app/dashboard/libs/queries';
import { toast } from "sonner";

// --- Fetch all available themes (default + custom) ---
async function fetchAvailableThemes(): Promise<AvailableThemes> {
  const response = await fetch('/api/dashboard/themes');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to fetch themes" }));
    throw new Error(errorData.error || "Failed to fetch themes");
  }
  return response.json();
}

export function useAvailableThemes() {
  return useQuery<AvailableThemes, Error>({
    queryKey: ['themes'],
    queryFn: fetchAvailableThemes,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Themes don't change very often, so we can cache them longer
  });
}

// --- Fetch a specific custom theme ---
async function fetchCustomTheme(themeId: string): Promise<UserCustomTheme> {
  if (!themeId) throw new Error("Theme ID is required");
  
  const response = await fetch(`/api/dashboard/themes/custom/${themeId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to fetch theme" }));
    throw new Error(errorData.error || "Failed to fetch theme");
  }
  return response.json();
}

export function useCustomTheme(themeId: string) {
  return useQuery<UserCustomTheme, Error>({
    queryKey: ['customTheme', themeId],
    queryFn: () => fetchCustomTheme(themeId),
    enabled: !!themeId,
    retry: 1,
  });
}

// --- Create a new custom theme ---
async function createCustomThemeAPI(themeData: CreateCustomThemePayload): Promise<UserCustomTheme> {
  const response = await fetch('/api/dashboard/themes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(themeData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to create theme" }));
    throw new Error(errorData.error || "Failed to create theme");
  }
  return response.json();
}

export function useCreateCustomTheme() {
  const queryClient = useQueryClient();

  return useMutation<UserCustomTheme, Error, CreateCustomThemePayload>({
    mutationFn: createCustomThemeAPI,
    onSuccess: (newTheme) => {
      // Invalidate themes to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success(`Theme "${newTheme.name}" created successfully!`);
    },
    onError: (error) => {
      toast.error(`Error creating theme: ${error.message}`);
    },
  });
}

// --- Update a custom theme ---
async function updateCustomThemeAPI(
  themeId: string, 
  updates: UpdateCustomThemePayload
): Promise<UserCustomTheme> {
  const response = await fetch(`/api/dashboard/themes/custom/${themeId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to update theme" }));
    throw new Error(errorData.error || "Failed to update theme");
  }
  return response.json();
}

export function useUpdateCustomTheme(themeId: string) {
  const queryClient = useQueryClient();

  return useMutation<UserCustomTheme, Error, UpdateCustomThemePayload>({
    mutationFn: (updates) => updateCustomThemeAPI(themeId, updates),
    onSuccess: (updatedTheme) => {
      // Update specific theme cache
      queryClient.invalidateQueries({ queryKey: ['customTheme', themeId] });
      // Update themes list
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success(`Theme "${updatedTheme.name}" updated successfully!`);
    },
    onError: (error) => {
      toast.error(`Error updating theme: ${error.message}`);
    },
  });
}

// --- Update any custom theme (flexible version for editing) ---
export function useUpdateAnyCustomTheme() {
  const queryClient = useQueryClient();

  return useMutation<UserCustomTheme, Error, { themeId: string; updates: UpdateCustomThemePayload }>({
    mutationFn: ({ themeId, updates }) => updateCustomThemeAPI(themeId, updates),
    onSuccess: (updatedTheme) => {
      // Update specific theme cache
      queryClient.invalidateQueries({ queryKey: ['customTheme', updatedTheme.id] });
      // Update themes list
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success(`Theme "${updatedTheme.name}" updated successfully!`);
    },
    onError: (error) => {
      toast.error(`Error updating theme: ${error.message}`);
    },
  });
}

// --- Delete a custom theme ---
async function deleteCustomThemeAPI(themeId: string): Promise<void> {
  const response = await fetch(`/api/dashboard/themes/custom/${themeId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to delete theme" }));
    throw new Error(errorData.error || "Failed to delete theme");
  }
}

export function useDeleteCustomTheme() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteCustomThemeAPI,
    onSuccess: () => {
      // Invalidate themes to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success("Theme deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Error deleting theme: ${error.message}`);
    },
  });
}

// --- Duplicate a theme ---
interface DuplicateThemeRequest {
  source: ThemeSource;
  newName: string;
  newDescription?: string;
}

async function duplicateThemeAPI(request: DuplicateThemeRequest): Promise<UserCustomTheme> {
  const response = await fetch('/api/dashboard/themes/duplicate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to duplicate theme" }));
    throw new Error(errorData.error || "Failed to duplicate theme");
  }
  return response.json();
}

export function useDuplicateTheme() {
  const queryClient = useQueryClient();

  return useMutation<UserCustomTheme, Error, DuplicateThemeRequest>({
    mutationFn: duplicateThemeAPI,
    onSuccess: (newTheme) => {
      // Invalidate themes to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success(`Theme "${newTheme.name}" created successfully!`);
    },
    onError: (error) => {
      toast.error(`Error duplicating theme: ${error.message}`);
    },
  });
}

// --- Toggle theme favorite ---
async function toggleThemeFavoriteAPI(themeId: string): Promise<UserCustomTheme> {
  const response = await fetch(`/api/dashboard/themes/custom/${themeId}/favorite`, {
    method: 'POST',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to update favorite status" }));
    throw new Error(errorData.error || "Failed to update favorite status");
  }
  return response.json();
}

export function useToggleThemeFavorite() {
  const queryClient = useQueryClient();

  return useMutation<UserCustomTheme, Error, string>({
    mutationFn: toggleThemeFavoriteAPI,
    onSuccess: (updatedTheme) => {
      // Update specific theme cache
      queryClient.invalidateQueries({ queryKey: ['customTheme', updatedTheme.id] });
      // Update themes list
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      
      const action = updatedTheme.is_favorite ? 'added to' : 'removed from';
      toast.success(`Theme ${action} favorites!`);
    },
    onError: (error) => {
      toast.error(`Error updating favorite: ${error.message}`);
    },
  });
}

// --- Helper hooks for specific use cases ---

// Get only default themes
export function useDefaultThemes() {
  const { data: themes, ...rest } = useAvailableThemes();
  return {
    data: themes?.default || [],
    ...rest
  };
}

// Get only custom themes
export function useCustomThemes() {
  const { data: themes, ...rest } = useAvailableThemes();
  return {
    data: themes?.custom || [],
    ...rest
  };
}

// Get favorite custom themes
export function useFavoriteCustomThemes() {
  const { data: themes, ...rest } = useAvailableThemes();
  return {
    data: themes?.custom?.filter(theme => theme.is_favorite) || [],
    ...rest
  };
} 