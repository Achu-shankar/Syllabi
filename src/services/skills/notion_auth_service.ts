import { Client } from '@notionhq/client';
import { createServiceClient } from '@/utils/supabase/service';

/**
 * Decrypt the Notion access token from Supabase for the given integrationId
 */
export async function getNotionAccessToken(integrationId: string): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('decrypt_notion_access_token', {
    integration_id_in: integrationId,
  });
  if (error || !data) {
    throw new Error('Failed to decrypt Notion access token');
  }
  return data;
}

/**
 * Create an authenticated Notion client for the given integrationId
 */
export async function createNotionClient(integrationId: string): Promise<Client> {
  const accessToken = await getNotionAccessToken(integrationId);
  return new Client({ auth: accessToken });
} 