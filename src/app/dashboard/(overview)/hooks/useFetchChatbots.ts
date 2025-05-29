import { useQuery } from '@tanstack/react-query';
import { Chatbot } from '@/app/dashboard/libs/queries';

const fetchChatbots = async (): Promise<Chatbot[]> => {
  const response = await fetch("/api/dashboard/chatbots");
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to fetch chatbots: ${response.statusText}`);
  }
  return response.json();
};

export function useFetchChatbots() {
  return useQuery<Chatbot[], Error>({
    queryKey: ['chatbots'], // Unique key for this query
    queryFn: fetchChatbots,
    // You can add options like staleTime, cacheTime, refetchOnWindowFocus, etc.
    // staleTime: 5 * 60 * 1000, // 5 minutes
  });
} 