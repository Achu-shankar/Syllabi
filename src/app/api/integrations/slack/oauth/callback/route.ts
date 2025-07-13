import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { WebClient } from '@slack/web-api';
import { v4 as uuidv4 } from 'uuid';

interface SlackOAuthResponse {
  ok: boolean;
  access_token: string;
  scope: string;
  bot_user_id: string;
  team: {
    id: string;
    name: string;
  };
  authed_user: {
    id: string;
  };
  error?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const returnedState = searchParams.get('state');

  // We need two clients: one to get the user, one with admin rights to upsert.
  const supabaseUserClient = await createClient();
  const supabaseAdminClient = createServiceClient();

  // Get installing user from active session
  const {
    data: { user },
  } = await supabaseUserClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required to install integrations.' }, { status: 401 });
  }


  // 1. Validate state via cookie
  const stateCookie = request.cookies.get('slack_oauth_state');
  if (!stateCookie || stateCookie.value !== returnedState) {
    return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing OAuth code' }, { status: 400 });
  }

  // 2. Exchange code for token
  const tokenResp = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/oauth/callback`,
    }).toString(),
  });

  const tokenJson = (await tokenResp.json()) as SlackOAuthResponse;
  if (!tokenJson.ok) {
    console.error('Slack OAuth error:', tokenJson.error);
    return NextResponse.json({ error: 'Slack OAuth failed' }, { status: 502 });
  }

  const { access_token, scope, bot_user_id, team, authed_user } = tokenJson;

  // 3. Encrypt and store in DB
  const { data: encrypted, error: encError } = await supabaseAdminClient.rpc('encrypt_slack_credentials', {
    bot_token_in: access_token,
    signing_secret_in: process.env.SLACK_SIGNING_SECRET!, // Non-null assertion
  }).single<{ bot_token_out: string; signing_secret_out: string }>();

  if (encError) {
    console.error('Encrypt RPC failed:', encError);
    return NextResponse.json({ error: 'Encryption failed' }, { status: 500 });
  }

  // Check if this Slack workspace is already connected by this user
  const { data: existingIntegration } = await supabaseAdminClient
    .from('connected_integrations')
    .select('id')
    .eq('user_id', user.id)
    .eq('integration_type', 'slack')
    .eq('metadata->>team_id', team.id)
    .maybeSingle();

  const integrationData = {
    user_id: user.id,
    integration_type: 'slack',
    metadata: {
      team_id: team.id,
      team_name: team.name,
      scope,
      bot_user_id,
      authed_user_id: authed_user.id,
    },
    credentials: {
      bot_token: encrypted!.bot_token_out,
    },
  };

  let upsertError;
  if (existingIntegration) {
    // Update existing integration
    const { error } = await supabaseAdminClient
      .from('connected_integrations')
      .update(integrationData)
      .eq('id', existingIntegration.id);
    upsertError = error;
  } else {
    // Insert new integration
    const { error } = await supabaseAdminClient
      .from('connected_integrations')
      .insert(integrationData);
    upsertError = error;
  }

  if (upsertError) {
    console.error('Failed to upsert Slack integration:', upsertError);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  // 4. Clean cookie and redirect to dashboard
  const response = NextResponse.redirect(
    new URL('/dashboard/integrations?connected=slack', process.env.NEXT_PUBLIC_APP_URL!),
  );
  response.cookies.set({ name: 'slack_oauth_state', value: '', maxAge: 0 });
  return response;
} 