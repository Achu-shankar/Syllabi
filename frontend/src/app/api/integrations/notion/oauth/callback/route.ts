import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

interface NotionOAuthTokenResponse {
  access_token: string;
  token_type: string;
  bot_id: string;
  workspace_name: string;
  workspace_icon: string;
  workspace_id: string;
  owner: {
    type: string;
    user?: {
      object: string;
      id: string;
      name: string;
      avatar_url: string;
      type: string;
      person: {
        email: string;
      };
    };
  };
  duplicated_template_id?: string;
  request_id: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const returnedState = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('Notion OAuth error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=notion_oauth_denied', process.env.NEXT_PUBLIC_APP_URL!)
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
  const stateCookie = request.cookies.get('notion_oauth_state');
  if (!stateCookie || stateCookie.value !== returnedState) {
    return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing OAuth code' }, { status: 400 });
  }

  try {
    // 2. Exchange code for tokens
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64')}`,
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/notion/oauth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = (await tokenResponse.json()) as NotionOAuthTokenResponse;

    if (!tokenData.access_token) {
      throw new Error('No access token received from Notion');
    }

    // 3. Encrypt and store credentials
    const { data: encrypted, error: encError } = await supabaseAdminClient
      .rpc('encrypt_notion_credentials', {
        access_token_in: tokenData.access_token,
        bot_id_in: tokenData.bot_id,
      })
      .single<{ access_token_out: string; bot_id_out: string }>();

    if (encError) {
      console.error('Notion credential encryption failed:', encError);
      return NextResponse.json({ error: 'Credential encryption failed' }, { status: 500 });
    }

    // 4. Check if this Notion workspace is already connected by this user
    const { data: existingIntegration } = await supabaseAdminClient
      .from('connected_integrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('integration_type', 'notion')
      .eq('metadata->>workspace_id', tokenData.workspace_id)
      .maybeSingle();

    const integrationData = {
      user_id: user.id,
      integration_type: 'notion',
      metadata: {
        workspace_id: tokenData.workspace_id,
        workspace_name: tokenData.workspace_name,
        workspace_icon: tokenData.workspace_icon,
        bot_id: tokenData.bot_id,
        owner_type: tokenData.owner.type,
        owner_user: tokenData.owner.user ? {
          id: tokenData.owner.user.id,
          name: tokenData.owner.user.name,
          email: tokenData.owner.user.person?.email,
          avatar_url: tokenData.owner.user.avatar_url,
        } : null,
        request_id: tokenData.request_id,
      },
      credentials: {
        access_token: encrypted!.access_token_out,
        bot_id: encrypted!.bot_id_out,
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
      console.error('Failed to upsert Notion integration:', upsertError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // 5. Auto-associate this integration with all of the user's chatbots
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
            console.error('Failed to auto-associate Notion integration with chatbots:', associationError);
            // Don't fail the entire flow - the integration was successful
          } else {
            console.log(`Auto-associated Notion integration ${integrationId} with ${userChatbots.length} chatbots`);
          }
        }
      } catch (autoAssociateError) {
        console.error('Error during auto-association:', autoAssociateError);
        // Don't fail the entire flow
      }
    }

    // 6. Clean cookie and redirect to dashboard
    const response = NextResponse.redirect(
      new URL('/dashboard/integrations?connected=notion', process.env.NEXT_PUBLIC_APP_URL!),
    );
    response.cookies.set({ name: 'notion_oauth_state', value: '', maxAge: 0 });
    return response;

  } catch (error) {
    console.error('Notion OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=notion_oauth_failed', process.env.NEXT_PUBLIC_APP_URL!)
    );
  }
} 