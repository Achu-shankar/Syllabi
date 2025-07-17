import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';

interface DiscordOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  guild?: {
    id: string;
    name: string;
  };
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== Discord OAuth Callback ===');
    console.log('Full URL:', request.url);

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const guildId = searchParams.get('guild_id');
    const error = searchParams.get('error');
    const returnedState = searchParams.get('state');

    console.log('Code:', code);
    console.log('Guild ID:', guildId);
    console.log('Error:', error);
    console.log('State:', returnedState);

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

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0a95ee576cb0.ngrok-free.app';

    // 1. Validate state via cookie
    const stateCookie = request.cookies.get('discord_oauth_state');
    if (!stateCookie || stateCookie.value !== returnedState) {
      return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=invalid_state`);
    }

    if (error) {
      return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=discord_auth_failed`);
    }

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=no_code`);
    }

    // 2. Exchange code for token
    const tokenResp = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/discord/oauth/callback`,
      }).toString(),
    });

    if (!tokenResp.ok) {
      console.error('Discord token exchange failed:', await tokenResp.text());
      return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=token_exchange_failed`);
    }

    const tokenJson = (await tokenResp.json()) as DiscordOAuthResponse;
    console.log('Discord OAuth response:', { ...tokenJson, access_token: '[REDACTED]' });

    const { access_token, refresh_token, scope, guild } = tokenJson;

    // 3. Get guild information if not provided in callback
    let guildInfo = guild;
    if (!guildInfo && guildId) {
      try {
        const guildResp = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
          headers: {
            Authorization: `Bot ${access_token}`,
          },
        });
        if (guildResp.ok) {
          const guildData = await guildResp.json();
          guildInfo = { id: guildData.id, name: guildData.name };
        }
      } catch (err) {
        console.warn('Error fetching guild details:', err);
      }
    }

    if (!guildInfo) {
      return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=no_guild_info`);
    }

    // 4. For Discord, we need to store the guild info but use the bot token from environment
    // The access_token from OAuth is a USER token, not what we need for bot operations
    
    // Get the bot token from environment (this is the static bot token for API operations)
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      console.error('DISCORD_BOT_TOKEN not configured in environment');
      return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=bot_token_missing`);
    }

    // Encrypt and store the bot token (not the user access token)
    const { data: encrypted, error: encError } = await supabaseAdminClient.rpc('encrypt_discord_credentials', {
      bot_token_in: botToken,
      user_token_in: access_token, // Store user token separately if needed
    }).single<{ bot_token_out: string; user_token_out: string }>();

    if (encError) {
      console.error('Encrypt RPC failed:', encError);
      return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=encryption_failed`);
    }

    // 5. Check if this Discord guild is already connected by this user
    const { data: existingIntegration } = await supabaseAdminClient
      .from('connected_integrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('integration_type', 'discord')
      .eq('metadata->>guild_id', guildInfo.id)
      .maybeSingle();

    const integrationData = {
      user_id: user.id,
      integration_type: 'discord',
      metadata: {
        guild_id: guildInfo.id,
        guild_name: guildInfo.name,
        scope,
      },
      credentials: {
        bot_token: encrypted!.bot_token_out,
        user_token: encrypted!.user_token_out, // Store user token separately
        refresh_token: refresh_token, // Store refresh token for user token renewal
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
      console.error('Error upserting Discord integration:', upsertError);
      return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=db_error`);
    }

    // 6. Auto-associate this integration with all of the user's chatbots
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
            console.error('Failed to auto-associate Discord integration with chatbots:', associationError);
            // Don't fail the entire flow - the integration was successful
          } else {
            console.log(`Auto-associated Discord integration ${integrationId} with ${userChatbots.length} chatbots`);
          }
        }
      } catch (autoAssociateError) {
        console.error('Error during auto-association:', autoAssociateError);
        // Don't fail the entire flow
      }
    }

    // 7. Clean cookie and redirect to dashboard
    const response = NextResponse.redirect(`${baseUrl}/dashboard/integrations?connected=discord`);
    response.cookies.set({ name: 'discord_oauth_state', value: '', maxAge: 0 });
    return response;

  } catch (error) {
    console.error('Discord OAuth callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0a95ee576cb0.ngrok-free.app';
    return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=internal_error`);
  }
} 