import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Profile, UpdateProfilePayload } from '../../../libs/queries'; // Adjust path as needed

// --- Fetch User Profile ---_PROFILE
const fetchUserProfile = async (): Promise<Profile> => {
  const response = await fetch('/api/dashboard/profile');
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch user profile');
  }
  return response.json();
};

export const useFetchUserProfile = () => {
  return useQuery<Profile, Error>({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
  });
};

// --- Update User Profile ---
const updateUserProfileAPI = async (updates: UpdateProfilePayload): Promise<Profile> => {
  const response = await fetch('/api/dashboard/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update user profile');
  }
  return response.json();
};

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<Profile, Error, UpdateProfilePayload>({
    mutationFn: updateUserProfileAPI,
    onSuccess: (data) => {
      // Invalidate and refetch the userProfile query to update the UI
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      // Optionally, you can directly update the cache if preferred
      // queryClient.setQueryData(['userProfile'], data);
    },
    // onError, onSettled can be handled here for toast notifications etc.
  });
};

// --- Delete User Account ---
const deleteUserAccountAPI = async (): Promise<{ message: string }> => {
  const response = await fetch('/api/dashboard/account/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  // Try to parse JSON response, even if response is not ok, for error details
  let responseData;
  try {
    responseData = await response.json();
  } catch (e) {
    // If JSON parsing fails, and response not ok, throw a more generic error
    if (!response.ok) {
        throw new Error(`Failed to delete user account. Status: ${response.status}`);
    }
    // If parsing failed but status ok (unlikely for this API), rethrow or handle
    throw new Error('Failed to parse server response after delete attempt.');
  }

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to delete user account');
  }
  return responseData;
};

export const useDeleteUserAccount = () => {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, Error, void>({ 
    mutationFn: deleteUserAccountAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] }); 
      // Further actions like logout & redirect are best handled in the component
      // or via a global state manager subscribed to this mutation's success.
    },
    onError: (error) => {
      // Error already has a message from the API call
      console.error("Delete account mutation error:", error.message);
      // Toast notifications are typically handled in the component calling the mutation
    }
  });
}; 