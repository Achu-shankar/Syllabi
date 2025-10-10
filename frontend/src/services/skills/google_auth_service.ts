import { google } from 'googleapis';
import { createServiceClient } from '@/utils/supabase/service';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/oauth/callback`;

/**
 * Decrypt the Google refresh token from Supabase for the given integrationId
 */
async function getGoogleRefreshToken(integrationId: string): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('decrypt_google_refresh_token', {
    integration_id_in: integrationId,
  });
  if (error || !data) {
    throw new Error('Failed to decrypt Google refresh token');
  }
  return data;
}

/**
 * Create an authenticated Google Drive client for the given integrationId
 */
export async function createGoogleDriveClient(integrationId: string) {
  const refreshToken = await getGoogleRefreshToken(integrationId);
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  // This will automatically refresh the access token if needed
  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Create an authenticated Gmail client for the given integrationId
 */
export async function createGoogleGmailClient(integrationId: string) {
  const refreshToken = await getGoogleRefreshToken(integrationId);
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  // This will automatically refresh the access token if needed
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Create an authenticated Google Calendar client for the given integrationId
 */
export async function createGoogleCalendarClient(integrationId: string) {
  const refreshToken = await getGoogleRefreshToken(integrationId);
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  // This will automatically refresh the access token if needed
  return google.calendar({ version: 'v3', auth: oauth2Client });
} 