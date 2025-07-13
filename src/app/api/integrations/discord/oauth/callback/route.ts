import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

export async function GET(request: NextRequest) {
  try {
    console.log('=== Discord OAuth Callback ===');
    console.log('Full URL:', request.url);

    const { searchParams } = new URL(request.url);
    const guildId = searchParams.get('guild_id');
    const error = searchParams.get('error');

    console.log('Guild ID:', guildId);
    console.log('Error:', error);
    console.log('All params:', Object.fromEntries(searchParams.entries()));

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0a95ee576cb0.ngrok-free.app';

    if (error) {
      return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=discord_auth_failed`);
    }

    if (!guildId) {
      return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=no_guild_id`);
    }

    // Fetch the current user (who started the OAuth flow)
    const supabaseServer = await createClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      console.error('No user in session during Discord OAuth callback');
      return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=unauthenticated`);
    }

    // Fetch guild details from Discord API to get the server name
    let guildName: string | null = null;
    try {
      const guildResp = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      });
      if (guildResp.ok) {
        const guildJson = await guildResp.json();
        guildName = guildJson?.name || null;
      } else {
        console.warn('Failed to fetch guild details:', await guildResp.text());
      }
    } catch (err) {
      console.warn('Error fetching guild details:', err);
    }

    const serviceClient = createServiceClient();

    // Check if this Discord guild is already connected by this user
    const { data: existingIntegration } = await serviceClient
      .from('connected_integrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('integration_type', 'discord')
      .eq('metadata->>guild_id', guildId)
      .maybeSingle();

    const integrationData = {
      user_id: user.id,
      integration_type: 'discord',
      metadata: {
        guild_id: guildId,
        guild_name: guildName,
      },
      // No credentials to store for Discord bot installation
    };

    let upsertError;
    if (existingIntegration) {
      // Update existing integration
      const { error } = await serviceClient
        .from('connected_integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id);
      upsertError = error;
    } else {
      // Insert new integration
      const { error } = await serviceClient
        .from('connected_integrations')
        .insert(integrationData);
      upsertError = error;
    }

    if (upsertError) {
      console.error('Error upserting Discord integration:', upsertError);
      return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=db_error`);
    }

    console.log('Guild upserted successfully');

    // Redirect to dashboard with success message so frontend refreshes list
    return NextResponse.redirect(`${baseUrl}/dashboard/integrations?connected=discord`);

  } catch (error) {
    console.error('Discord OAuth callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0a95ee576cb0.ngrok-free.app';
    return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=unknown`);
  }
} 