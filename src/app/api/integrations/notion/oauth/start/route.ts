import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

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
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/notion/oauth/callback`;

  // Create Notion OAuth URL
  const notionAuthUrl = new URL('https://api.notion.com/v1/oauth/authorize');
  notionAuthUrl.searchParams.set('client_id', process.env.NOTION_CLIENT_ID!);
  notionAuthUrl.searchParams.set('redirect_uri', redirectUri);
  notionAuthUrl.searchParams.set('response_type', 'code');
  notionAuthUrl.searchParams.set('owner', 'user');
  notionAuthUrl.searchParams.set('state', state);

  // Persist state in a secure, httpOnly cookie (10-minute ttl)
  const response = NextResponse.redirect(notionAuthUrl.toString());
  response.cookies.set({
    name: 'notion_oauth_state',
    value: state,
    httpOnly: true,
    secure: true,
    maxAge: 600, // 10 minutes
    sameSite: 'lax',
    path: '/',
  });
  
  return response;
} 