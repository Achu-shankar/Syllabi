import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

// Scopes your app requests. Keep in sync with Slack dashboard.
const SLACK_SCOPES = [
  // Existing scopes
  'commands',
  'app_mentions:read',
  'chat:write',
  'chat:write.public',
  'im:history',
  'channels:history',
  'groups:history',
  
  // New scopes for comprehensive skills
  'channels:read',      // For slack_list_channels, slack_get_conversation_metadata
  'groups:read',        // For private channels
  'im:read',            // For direct messages
  'mpim:read',          // For group messages
  'mpim:history',       // For group message history
  'users:read',         // For slack_list_users, slack_get_user_info
  'users:read.email',   // For email-based user lookups
  'team:read',          // For team information
].join(',');

// User token scopes for personal actions (reminders, status)
const SLACK_USER_SCOPES = [
  'reminders:read',     // For slack_get_reminders
  'reminders:write',    // For slack_create_reminder
  'users.profile:write', // For slack_set_status
].join(',');

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
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/oauth/callback`;

  // Persist state in a secure, httpOnly cookie (10-minute ttl)
  const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
  slackAuthUrl.searchParams.set('client_id', process.env.SLACK_CLIENT_ID!);
  slackAuthUrl.searchParams.set('scope', SLACK_SCOPES);
  slackAuthUrl.searchParams.set('user_scope', SLACK_USER_SCOPES);
  slackAuthUrl.searchParams.set('redirect_uri', redirectUri);
  slackAuthUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(slackAuthUrl.toString());
  response.cookies.set({
    name: 'slack_oauth_state',
    value: state,
    httpOnly: true,
    secure: true,
    maxAge: 600, // 10 minutes
    sameSite: 'lax',
    path: '/',
  });
  return response;
} 