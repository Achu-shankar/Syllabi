import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { integrationId: string } }
) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const integrationId = params.integrationId; // This is the internal UUID of the integration
    if (!integrationId) {
        return NextResponse.json({ error: 'Integration ID is required.' }, { status: 400 });
    }

    try {
        const serviceClient = createServiceClient();
        
        // First, verify the integration exists and belongs to the user
        const { data: integration, error: fetchError } = await serviceClient
            .from('connected_integrations')
            .select('id, integration_type, metadata')
            .eq('id', integrationId)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !integration) {
            console.error('Integration not found or access denied:', fetchError);
            return NextResponse.json({ error: 'Integration not found or access denied.' }, { status: 404 });
        }

        // Delete the integration
        const { error: deleteError } = await serviceClient
            .from('connected_integrations')
            .delete()
            .eq('id', integrationId)
            .eq('user_id', user.id); // Double-check user ownership

        if (deleteError) {
            console.error('Error deleting integration:', deleteError);
            return NextResponse.json({ error: 'Failed to disconnect integration.' }, { status: 500 });
        }

        // Return success message based on integration type
        const integrationTypeNames = {
            slack: 'Slack workspace',
            discord: 'Discord server',
            alexa: 'Alexa account'
        };

        const integrationName = integrationTypeNames[integration.integration_type as keyof typeof integrationTypeNames] || 'Integration';
        
        return NextResponse.json({ 
            success: true, 
            message: `${integrationName} disconnected successfully.` 
        });

    } catch (error: any) {
        console.error(`API Error disconnecting integration ${integrationId}:`, error);
        return NextResponse.json({ error: error.message || 'Failed to disconnect integration.' }, { status: 500 });
    }
} 