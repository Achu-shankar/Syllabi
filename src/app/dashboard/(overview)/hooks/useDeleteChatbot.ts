import { useMutation, useQueryClient } from '@tanstack/react-query';

const deleteChatbotAPI = async (chatbotId: string): Promise<void> => {
  const response = await fetch(`/api/dashboard/chatbots/${chatbotId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    // For DELETE, response might be empty or have an error structure
    let errorMsg = `Failed to delete chatbot: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorMsg;
    } catch (e) {
      // Response was not JSON or empty
    }
    throw new Error(errorMsg);
  }
  // DELETE often returns 204 No Content, so no JSON to parse on success
};

export function useDeleteChatbot() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({ // string is chatbotId
    mutationFn: deleteChatbotAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
    },
  });
} 