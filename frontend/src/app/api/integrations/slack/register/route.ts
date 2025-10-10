import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const registerSchema = z.object({
    team_id: z.string(),
    team_name: z.string().optional(),
    bot_token: z.string(),
    signing_secret: z.string(),
    chatbot_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    
    // Ensure the user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { team_id, team_name, bot_token, signing_secret, chatbot_id } = registerSchema.parse(body);

        // Check if the user owns the chatbot they are trying to link
        const { data: chatbotOwner } = await supabase
            .from('chatbots')
            .select('user_id')
            .eq('id', chatbot_id)
            .single();

        if (chatbotOwner?.user_id !== user.id) {
             return NextResponse.json({ error: 'You do not have permission to configure this chatbot.' }, { status: 403 });
        }

        // Use a Supabase Edge Function or RPC to encrypt the data securely on the server
        const { data: encryptedData, error: encryptionError } = await supabase.rpc('encrypt_slack_credentials', {
            bot_token_in: bot_token,
            signing_secret_in: signing_secret
        }).single<{ bot_token_out: string; signing_secret_out: string }>();

        if (encryptionError) throw new Error(`Encryption failed: ${encryptionError.message}`);

        // Check if integration already exists
        const { data: existingIntegration } = await supabase
            .from('connected_integrations')
            .select('id')
            .eq('user_id', user.id)
            .eq('integration_type', 'slack')
            .eq('metadata->>team_id', team_id)
            .maybeSingle();

        const integrationData = {
            user_id: user.id,
            integration_type: 'slack',
            metadata: {
                team_id: team_id,
                team_name: team_name,
                default_chatbot_id: chatbot_id
            },
            credentials: {
                bot_token: encryptedData.bot_token_out,
                signing_secret: encryptedData.signing_secret_out
            }
        };

        let integration;
        if (existingIntegration) {
            // Update existing integration
            const { data, error } = await supabase
                .from('connected_integrations')
                .update(integrationData)
                .eq('id', existingIntegration.id)
                .select('id')
                .single();
            if (error) throw error;
            integration = data;
        } else {
            // Insert new integration
            const { data, error } = await supabase
                .from('connected_integrations')
                .insert(integrationData)
                .select('id')
                .single();
            if (error) throw error;
            integration = data;
        }

        // TODO: Update chatbot linking when we create new tables
        // For now, we'll keep the old table structure working
        const { error: linkError } = await supabase
            .from('slack_workspace_chatbots')
            .upsert({
                workspace_id: integration.id, // Use the new integration ID
                chatbot_id: chatbot_id
            }, { onConflict: 'workspace_id, chatbot_id' });
        
        if (linkError) console.warn('Warning: Could not update old linking table:', linkError);

        return NextResponse.json({ success: true, message: 'Slack workspace configured successfully.' });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid input.', details: error.errors }, { status: 400 });
        }
        console.error('Error configuring Slack workspace:', error);
        return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
    }
} 