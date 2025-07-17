import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // 1. Validate HTTP Basic Authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      console.error('[Alexa OAuth Token] Missing or invalid Authorization header');
      return NextResponse.json({ 
        error: 'invalid_client',
        error_description: 'Client authentication required' 
      }, { status: 401 });
    }

    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf-8');
    const [client_id, client_secret] = credentials.split(':');

    console.log('[Alexa OAuth Token] Received credentials:', {
      client_id: client_id?.substring(0, 20) + '...',
      client_secret: client_secret?.substring(0, 10) + '...',
      expected_client_id: process.env.ALEXA_CLIENT_ID?.substring(0, 20) + '...',
      expected_client_secret: process.env.ALEXA_CLIENT_SECRET?.substring(0, 10) + '...'
    });

    if (client_id !== process.env.ALEXA_CLIENT_ID || client_secret !== process.env.ALEXA_CLIENT_SECRET) {
      console.error('[Alexa OAuth Token] Invalid client credentials');
      console.error('[Alexa OAuth Token] Expected client_id:', process.env.ALEXA_CLIENT_ID);
      console.error('[Alexa OAuth Token] Received client_id:', client_id);
      return NextResponse.json({ 
        error: 'invalid_client',
        error_description: 'Invalid client credentials' 
      }, { status: 401 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const grant_type = formData.get('grant_type')?.toString();
    const code = formData.get('code')?.toString();
    const redirect_uri = formData.get('redirect_uri')?.toString();

    console.log('[Alexa OAuth Token] Token exchange request:', {
      grant_type,
      code: code?.substring(0, 20) + '...',
      redirect_uri
    });

    // 3. Validate parameters
    if (grant_type !== 'authorization_code') {
      return NextResponse.json({ 
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported' 
      }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({ 
        error: 'invalid_request',
        error_description: 'Missing authorization code' 
      }, { status: 400 });
    }

    // 4. Look up and validate the authorization code
    const serviceSupabase = createServiceClient();
    
    const { data: codeData, error: codeError } = await serviceSupabase
      .from('oauth_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .maybeSingle();

    if (codeError) {
      console.error('[Alexa OAuth Token] Error looking up code:', codeError);
      return NextResponse.json({ 
        error: 'server_error',
        error_description: 'Internal server error' 
      }, { status: 500 });
    }

    if (!codeData) {
      console.error('[Alexa OAuth Token] Invalid or expired authorization code');
      return NextResponse.json({ 
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code' 
      }, { status: 400 });
    }

    // 5. Check if code has expired
    const now = new Date();
    const expiresAt = new Date(codeData.expires_at);
    if (now > expiresAt) {
      console.error('[Alexa OAuth Token] Authorization code has expired');
      return NextResponse.json({ 
        error: 'invalid_grant',
        error_description: 'Authorization code has expired' 
      }, { status: 400 });
    }

    // 6. Validate redirect_uri matches
    if (redirect_uri && redirect_uri !== codeData.redirect_uri) {
      console.error('[Alexa OAuth Token] Redirect URI mismatch');
      return NextResponse.json({ 
        error: 'invalid_grant',
        error_description: 'Redirect URI mismatch' 
      }, { status: 400 });
    }

    // 7. Mark code as used
    const { error: markUsedError } = await serviceSupabase
      .from('oauth_codes')
      .update({ used: true })
      .eq('code', code);

    if (markUsedError) {
      console.error('[Alexa OAuth Token] Error marking code as used:', markUsedError);
      // Continue anyway - the important thing is that we don't reuse it
    }

    // 8. Create or update the Alexa integration connection
    const userId = codeData.user_id;
    
    // Check if this user already has an Alexa integration
    const { data: existingIntegration } = await serviceSupabase
      .from('connected_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('integration_type', 'alexa')
      .maybeSingle();

    const integrationData = {
      user_id: userId,
      integration_type: 'alexa',
      metadata: {
        // amazon_user_id will be filled in later on first skill invocation
      },
      // No credentials to store for Alexa
    };

    let alexaConnection;
    let alexaError;
    if (existingIntegration) {
      // Update existing integration
      const { data, error } = await serviceSupabase
        .from('connected_integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id)
        .select('id')
        .single();
      alexaConnection = data;
      alexaError = error;
    } else {
      // Insert new integration
      const { data, error } = await serviceSupabase
        .from('connected_integrations')
        .insert(integrationData)
        .select('id')
        .single();
      alexaConnection = data;
      alexaError = error;
    }

    if (alexaError || !alexaConnection) {
      console.error('[Alexa OAuth Token] Error creating/updating Alexa integration:', alexaError);
      
      // If table doesn't exist, return helpful error
      if (alexaError?.code === '42P01') {
        return NextResponse.json({ 
          error: 'server_error',
          error_description: 'Database not properly configured. Please run migrations.' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'server_error',
        error_description: 'Failed to create account link' 
      }, { status: 500 });
    }

    // Auto-associate this integration with all of the user's chatbots
    if (alexaConnection?.id) {
      try {
        // Get all chatbots owned by this user
        const { data: userChatbots } = await serviceSupabase
          .from('chatbots')
          .select('id')
          .eq('user_id', userId);

        if (userChatbots && userChatbots.length > 0) {
          // Create associations for all chatbots (ignore conflicts if already exists)
          const associations = userChatbots.map(chatbot => ({
            chatbot_id: chatbot.id,
            integration_id: alexaConnection.id
          }));

          const { error: associationError } = await serviceSupabase
            .from('chatbot_integrations')
            .upsert(associations, { 
              onConflict: 'chatbot_id,integration_id',
              ignoreDuplicates: true 
            });

          if (associationError) {
            console.error('[Alexa OAuth Token] Failed to auto-associate Alexa integration with chatbots:', associationError);
            // Don't fail the entire flow - the integration was successful
          } else {
            console.log(`[Alexa OAuth Token] Auto-associated Alexa integration ${alexaConnection.id} with ${userChatbots.length} chatbots`);
          }
        }
      } catch (autoAssociateError) {
        console.error('[Alexa OAuth Token] Error during auto-association:', autoAssociateError);
        // Don't fail the entire flow
      }
    }

    // 9. Generate access token (JWT)
    const tokenPayload = {
      sub: userId, // Syllabi user ID (standard JWT claim)
      user_id: userId, // Also include for backward compatibility
      client_id: client_id,
      scope: codeData.scope,
      integration_id: alexaConnection.id, // Use the new unified integration ID
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };

    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback-secret-for-development';
    if (!jwtSecret || jwtSecret === 'fallback-secret-for-development') {
      console.warn('[Alexa OAuth Token] Using fallback JWT secret - please set JWT_SECRET in production');
    }

    const accessToken = jwt.sign(tokenPayload, jwtSecret, { algorithm: 'HS256' });

    console.log('[Alexa OAuth Token] Successfully generated access token for user:', userId);

    // 10. Return OAuth 2.0 token response
    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: codeData.scope
      // Note: No refresh_token since Alexa with Basic auth doesn't support it
    });

  } catch (error) {
    console.error('[Alexa OAuth Token] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'server_error',
      error_description: 'Internal server error' 
    }, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ 
    error: 'method_not_allowed',
    error_description: 'Only POST method is supported' 
  }, { status: 405 });
} 