import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';

interface GuildLookupRequest {
  guildTableId: string; // Internal UUID from connected_integrations.id
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Guild lookup request body:', body);
    
    const { guildTableId }: GuildLookupRequest = body;

    if (!guildTableId) {
      console.error('Missing guildTableId in request:', body);
      return NextResponse.json(
        { error: 'Missing guildTableId' },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS
    const supabase = createServiceClient();
    
    const { data: integration, error: integrationError } = await supabase
      .from('connected_integrations')
      .select('metadata')
      .eq('id', guildTableId)
      .eq('integration_type', 'discord')
      .single();

    if (integrationError) {
      console.error('Guild lookup error:', integrationError);
      return NextResponse.json(
        { error: `Failed to find Discord integration: ${integrationError.message}` },
        { status: 404 }
      );
    }

    if (!integration || !integration.metadata) {
      return NextResponse.json(
        { error: 'Discord integration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      guild_id: integration.metadata.guild_id,
      name: integration.metadata.guild_name,
    });

  } catch (error) {
    console.error('Guild lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 