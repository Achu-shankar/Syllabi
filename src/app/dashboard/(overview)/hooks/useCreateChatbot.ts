import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateChatbotPayload, Chatbot } from '@/app/dashboard/libs/queries';

// Assuming CreateChatbotPayload and Chatbot types are defined similarly to your queries.ts or a shared types file
// Ideally, import these from a central location.

const createChatbotAPI = async (payload: CreateChatbotPayload): Promise<Chatbot> => {
  const response = await fetch("/api/dashboard/chatbots", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to create chatbot: ${response.statusText}`);
  }
  return response.json();
};

export function useCreateChatbot() {
  const queryClient = useQueryClient();

  return useMutation<Chatbot, Error, CreateChatbotPayload>({
    mutationFn: createChatbotAPI,
    onSuccess: () => {
      // Invalidate and refetch the chatbots query to show the new chatbot
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
    },
    // onError: (error) => { ... handle specific error side-effects ... }
    // onSettled: () => { ... do something after mutation, regardless of success/error ... }
  });
} 