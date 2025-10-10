import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

interface GoogleOAuthTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const returnedState = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=google_oauth_denied', process.env.NEXT_PUBLIC_APP_URL!)
    );
  }

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
  const stateCookie = request.cookies.get('google_oauth_state');
  if (!stateCookie || stateCookie.value !== returnedState) {
    return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing OAuth code' }, { status: 400 });
  }

  try {
    // 2. Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/oauth/callback`,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = (await tokenResponse.json()) as GoogleOAuthTokenResponse;

    if (!tokenData.access_token) {
      throw new Error('No access token received from Google');
    }

    // 3. Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

    // 4. Encrypt and store credentials
    const { data: encrypted, error: encError } = await supabaseAdminClient
      .rpc('encrypt_google_credentials', {
        access_token_in: tokenData.access_token,
        refresh_token_in: tokenData.refresh_token || null,
      })
      .single<{ access_token_out: string; refresh_token_out: string | null }>();

    if (encError) {
      console.error('Google credential encryption failed:', encError);
      return NextResponse.json({ error: 'Credential encryption failed' }, { status: 500 });
    }

    // 5. Calculate token expiry
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // 6. Check if we got a refresh token
    if (!tokenData.refresh_token) {
      console.warn('No refresh token received from Google OAuth - user may need to re-authenticate');
    }

    // 6. Check if this Google account is already connected by this user
    const { data: existingIntegration } = await supabaseAdminClient
      .from('connected_integrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('integration_type', 'google')
      .eq('metadata->>google_user_id', userInfo.id)
      .maybeSingle();

    const integrationData = {
      user_id: user.id,
      integration_type: 'google',
      metadata: {
        google_user_id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        scope: tokenData.scope,
        verified_email: userInfo.verified_email,
      },
      credentials: {
        access_token: encrypted!.access_token_out,
        ...(encrypted!.refresh_token_out && { refresh_token: encrypted!.refresh_token_out }),
        token_expiry: expiresAt.toISOString(),
        client_id: process.env.GOOGLE_CLIENT_ID!,
        token_uri: 'https://oauth2.googleapis.com/token',
        scopes: tokenData.scope?.split(' ') || [],
      },
    };

    let upsertError;
    let integrationId;

    if (existingIntegration) {
      // Update existing integration
      const { error } = await supabaseAdminClient
        .from('connected_integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id);
      upsertError = error;
      integrationId = existingIntegration.id;
    } else {
      // Insert new integration
      const { data, error } = await supabaseAdminClient
        .from('connected_integrations')
        .insert(integrationData)
        .select('id')
        .single();
      upsertError = error;
      integrationId = data?.id;
    }

    if (upsertError) {
      console.error('Failed to upsert Google integration:', upsertError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // 7. Auto-associate this integration with all of the user's chatbots
    if (integrationId) {
      try {
        // Get all chatbots owned by this user
        const { data: userChatbots } = await supabaseAdminClient
          .from('chatbots')
          .select('id')
          .eq('user_id', user.id);

        if (userChatbots && userChatbots.length > 0) {
          // Create associations for all chatbots (ignore conflicts if already exists)
          const associations = userChatbots.map(chatbot => ({
            chatbot_id: chatbot.id,
            integration_id: integrationId
          }));

          const { error: associationError } = await supabaseAdminClient
            .from('chatbot_integrations')
            .upsert(associations, { 
              onConflict: 'chatbot_id,integration_id',
              ignoreDuplicates: true 
            });

          if (associationError) {
            console.error('Failed to auto-associate Google integration with chatbots:', associationError);
            // Don't fail the entire flow - the integration was successful
          } else {
            console.log(`Auto-associated Google integration ${integrationId} with ${userChatbots.length} chatbots`);
          }
        }
      } catch (autoAssociateError) {
        console.error('Error during auto-association:', autoAssociateError);
        // Don't fail the entire flow
      }
    }

    // 8. Clean cookie and redirect to dashboard
    const response = NextResponse.redirect(
      new URL('/dashboard/integrations?connected=google', process.env.NEXT_PUBLIC_APP_URL!),
    );
    response.cookies.set({ name: 'google_oauth_state', value: '', maxAge: 0 });
    return response;

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=google_oauth_failed', process.env.NEXT_PUBLIC_APP_URL!)
    );
  }
} 