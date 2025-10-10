import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getIntegrationsForUser } from '@/app/dashboard/libs/queries';

// Define a common structure for integrations to be returned to the client
type IntegrationConnection = {
    id: string;              // Our internal UUID
    type: string;            // Integration type: 'slack', 'discord', 'alexa', etc.
    name: string;            // Human-readable display name
    connectedAt: string;     // ISO timestamp
    metadata: Record<string, any>;  // Integration-specific data (teamId, guildId, botUserId, etc.)
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const integrationsData = await getIntegrationsForUser(user.id);
    
    const allConnections: IntegrationConnection[] = integrationsData.map((integration) => {
      // Extract display name based on integration type
      let displayName: string;
      switch (integration.integration_type) {
        case 'slack':
          displayName = integration.metadata?.team_name || 'Slack Workspace';
          break;
        case 'discord':
          displayName = integration.metadata?.guild_name || 'Discord Server';
          break;
        case 'alexa':
          displayName = 'Amazon Alexa Account';
          break;
        default:
          displayName = `${integration.integration_type} Integration`;
      }

      return {
        id: integration.id,
        type: integration.integration_type,
        name: displayName,
        connectedAt: integration.created_at,
        metadata: integration.metadata || {}
      };
    });
    
    console.log("All integrations from unified table: ", allConnections);

    return NextResponse.json(allConnections);
  } catch (error) {
    console.error('API Error fetching integrations:', error);
    return NextResponse.json({ error: 'Failed to fetch integration connections' }, { status: 500 });
  }
} 