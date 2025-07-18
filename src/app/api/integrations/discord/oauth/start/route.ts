import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

// Discord OAuth scopes for comprehensive bot functionality
const DISCORD_BOT_SCOPES = [
  'bot',                    // Basic bot functionality
  'applications.commands',  // Slash commands
  'identify',              // Basic user info
  'guilds',                // Access to user's guilds
  'guilds.join',           // Join guilds on behalf of user
  'messages.read',         // Read message history
  'guilds.members.read',   // Read guild member info
].join(' ');

// Bot permissions for comprehensive Discord skills (these are numeric permissions)
const DISCORD_BOT_PERMISSIONS = [
  '1024',      // VIEW_CHANNEL
  '2048',      // SEND_MESSAGES
  '8192',      // MANAGE_MESSAGES
  '16384',     // EMBED_LINKS
  '32768',     // ATTACH_FILES
  '65536',     // READ_MESSAGE_HISTORY
  '262144',    // USE_EXTERNAL_EMOJIS
  '64',        // ADD_REACTIONS
  '268435456', // MANAGE_ROLES
  '16',        // MANAGE_CHANNELS
  '2',         // KICK_MEMBERS
  '4',         // BAN_MEMBERS
  '134217728', // MANAGE_NICKNAMES
  '536870912', // MANAGE_WEBHOOKS
  '2147483648', // USE_SLASH_COMMANDS
  '16777216',  // MOVE_MEMBERS
  '4194304',   // MUTE_MEMBERS
  '8388608',   // DEAFEN_MEMBERS
].reduce((acc, perm) => acc | parseInt(perm), 0).toString();

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
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/discord/oauth/callback`;

  // Discord OAuth URL for bot installation
  const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize');
  discordAuthUrl.searchParams.set('client_id', process.env.DISCORD_CLIENT_ID!);
  discordAuthUrl.searchParams.set('redirect_uri', redirectUri);
  discordAuthUrl.searchParams.set('response_type', 'code');
  discordAuthUrl.searchParams.set('scope', DISCORD_BOT_SCOPES);
  discordAuthUrl.searchParams.set('permissions', DISCORD_BOT_PERMISSIONS);
  discordAuthUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(discordAuthUrl.toString());
  
  // Store state in cookie for security
  response.cookies.set({
    name: 'discord_oauth_state',
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  return response;
} 