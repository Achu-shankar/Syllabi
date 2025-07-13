import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

// Scopes your app requests. Keep in sync with Slack dashboard.
const SLACK_SCOPES = [
  'commands',
  'app_mentions:read',
  'chat:write',
  'chat:write.public',
  'im:history',
  'channels:history',
  'groups:history',
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