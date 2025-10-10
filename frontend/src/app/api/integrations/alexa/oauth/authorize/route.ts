import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { redirect } from 'next/navigation';

// Allowed redirect URIs from Alexa console
const SKILL_ID = process.env.ALEXA_SKILL_ID || 'M2VM9PQGE0G2HF';
const ALLOWED_REDIRECT_URIS = [
  `https://layla.amazon.com/api/skill/link/${SKILL_ID}`,
  `https://pitangui.amazon.com/api/skill/link/${SKILL_ID}`, 
  `https://alexa.amazon.co.jp/api/skill/link/${SKILL_ID}`
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // 1. Validate OAuth parameters
  const client_id = searchParams.get('client_id');
  const redirect_uri = searchParams.get('redirect_uri');
  const response_type = searchParams.get('response_type');
  const state = searchParams.get('state');
  const scope = searchParams.get('scope'); // optional

  console.log('[Alexa OAuth] Authorization request:', {
    client_id: client_id?.substring(0, 20) + '...',
    redirect_uri,
    response_type,
    state,
    scope
  });

  // Validate required parameters
  if (!client_id || client_id !== process.env.ALEXA_CLIENT_ID) {
    console.error('[Alexa OAuth] Invalid client_id');
    return NextResponse.json({ error: 'invalid_client' }, { status: 400 });
  }

  if (!redirect_uri || !ALLOWED_REDIRECT_URIS.includes(redirect_uri)) {
    console.error('[Alexa OAuth] Invalid redirect_uri:', redirect_uri);
    return NextResponse.json({ error: 'invalid_redirect_uri' }, { status: 400 });
  }

  if (response_type !== 'code') {
    console.error('[Alexa OAuth] Invalid response_type:', response_type);
    return NextResponse.json({ error: 'unsupported_response_type' }, { status: 400 });
  }

  // 2. Check if user is logged in
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.log('[Alexa OAuth] User not logged in, redirecting to sign-in');
    
    // Use the correct base URL (ngrok in dev, production domain in prod)
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'https://0a95ee576cb0.ngrok-free.app'  // Your ngrok URL
      : process.env.NEXT_PUBLIC_APP_URL || 'https://syllabi.ai';
    
    const loginUrl = new URL('/sign-in', baseUrl);
    // Fix the redirect_to URL to use the same base URL
    const redirectBackUrl = new URL(new URL(request.url).pathname + new URL(request.url).search, baseUrl);
    loginUrl.searchParams.set('redirect_to', redirectBackUrl.toString());
    
    return redirect(loginUrl.toString());
  }

  // 3. Check if user already has an Alexa account linked
  const { data: existingLink } = await supabase
    .from('alexa_accounts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingLink) {
    console.log('[Alexa OAuth] User already has Alexa linked, generating code for existing account');
  }

  // 4. Generate authorization code (short-lived, single use)
  const authCode = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store the code temporarily (we'll create a proper codes table later, for now use a simple approach)
  const codeData = {
    code: authCode,
    user_id: user.id,
    client_id,
    redirect_uri,
    scope: scope || 'alexa.basic',
    expires_at: expiresAt.toISOString(),
    used: false
  };

  // Use service role client to bypass RLS for oauth_codes table
  const serviceSupabase = createServiceClient();
  const { error: codeError } = await serviceSupabase
    .from('oauth_codes')
    .insert(codeData);

  if (codeError) {
    console.error('[Alexa OAuth] Error storing authorization code:', codeError);
    
    // If table doesn't exist, we'll need to create it, but for now return an error
    if (codeError.code === '42P01') { // table does not exist
      console.error('[Alexa OAuth] oauth_codes table does not exist. Need to run migration first.');
      return NextResponse.json({ 
        error: 'server_error', 
        error_description: 'Database not properly configured. Please contact support.' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'server_error', 
      error_description: 'Failed to generate authorization code' 
    }, { status: 500 });
  }

  console.log('[Alexa OAuth] Generated authorization code for user:', user.id);

  // 5. Redirect back to Alexa with the authorization code
  const callbackUrl = new URL(redirect_uri);
  callbackUrl.searchParams.set('code', authCode);
  if (state) {
    callbackUrl.searchParams.set('state', state);
  }

  console.log('[Alexa OAuth] Redirecting to Alexa with code');
  return redirect(callbackUrl.toString());
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
} 