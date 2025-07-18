import { createClient as createUserClient } from "./server";      // cookie based
import { createServiceClient } from "./service";               // service role

interface ChatbotContext {
  visibility: 'public' | 'private' | 'shared';
}

/**
 * Resolves the appropriate Supabase client based on chatbot visibility
 * - Public chatbots: Use service client (bypasses RLS, works anonymously)
 * - Private/Shared chatbots: Use user client (requires authentication)
 */
export const resolveClient = async (chatbot: ChatbotContext) => {
  if (chatbot.visibility === 'public') {
    // Use service client for public chatbots - bypasses RLS and works anonymously
    return createServiceClient();
  }
  
  // Use user client for private/shared chatbots - requires authentication
  return await createUserClient();
};

/**
 * For cases where we need to check chatbot visibility first
 */
export const resolveClientBySlug = async (chatbotSlug: string) => {
  // First, get chatbot with service client to check visibility
  const serviceClient = createServiceClient();
  
  const { data: chatbot, error } = await serviceClient
    .from('chatbots')
    .select('visibility')
    .eq('shareable_url_slug', chatbotSlug)
    .single();

  if (error || !chatbot) {
    throw new Error(`Chatbot not found: ${chatbotSlug}`);
  }

  // Now resolve the appropriate client based on visibility
  return resolveClient({ visibility: chatbot.visibility });
}; 