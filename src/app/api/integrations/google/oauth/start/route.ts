import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

// Google OAuth scopes for comprehensive Google Workspace functionality
const GOOGLE_SCOPES = [
  // Google Drive API scopes
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  
  // Gmail API scopes
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  
  // Google Calendar API scopes
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  
  // Google Sheets API scopes (for future expansion)
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  
  // Google Docs API scopes (for future expansion)
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/documents',
  
  // Profile information
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Require login so we know who is installing
  if (!user) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.nextUrl));
  }

  const state = crypto.randomUUID();
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/oauth/callback`;

  // Create Google OAuth URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', GOOGLE_SCOPES);
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('access_type', 'offline'); // Important: gets refresh token
  googleAuthUrl.searchParams.set('prompt', 'consent'); // Forces consent screen to get refresh token

  // Persist state in a secure, httpOnly cookie (10-minute ttl)
  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.cookies.set({
    name: 'google_oauth_state',
    value: state,
    httpOnly: true,
    secure: true,
    maxAge: 600, // 10 minutes
    sameSite: 'lax',
    path: '/',
  });
  
  return response;
} 