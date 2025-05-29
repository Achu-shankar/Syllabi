import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Chatbot, UpdateChatbotPayload } from '@/app/dashboard/libs/queries';

// Assuming Chatbot types are defined similarly or imported
// export interface UpdateChatbotPayload {
//   internal_name?: string;
//   student_facing_name?: string;
//   // Add other fields that can be updated
// }

// interface Chatbot { /* ... same Chatbot interface as in useCreateChatbot ... */
//   id: string;
//   internal_name: string;
//   student_facing_name?: string | null;
//   created_at: string;
//   user_id: string;
//   // other fields...
// }

const updateChatbotAPI = async (variables: { chatbotId: string; payload: UpdateChatbotPayload }): Promise<Chatbot> => {
  const { chatbotId, payload } = variables;
  const response = await fetch(`/api/dashboard/chatbots/${chatbotId}`, {
    method: "PATCH", // Or PUT, depending on your API design
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to update chatbot: ${response.statusText}`);
  }
  return response.json();
};

export function useUpdateChatbot() {
  const queryClient = useQueryClient();

  return useMutation<Chatbot, Error, { chatbotId: string; payload: UpdateChatbotPayload }>({
    mutationFn: updateChatbotAPI,
    onSuccess: (updatedChatbot) => {
      // Invalidate and refetch the chatbots list
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
      
      // Optionally, update the specific chatbot query if you have one for individual chatbots
      // queryClient.setQueryData(['chatbot', updatedChatbot.id], updatedChatbot);
    },
  });
} 