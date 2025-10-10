import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server'; // Your server client for getting user session

export async function POST(request: NextRequest) {
  const supabase = await createClient(); // Standard server client to get current user

  // 1. Get the current authenticated user from the session
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('API delete account: Unauthorized - No user session', userError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Get the user's JWT to pass to the Edge Function
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
      console.error('API delete account: No session found for token', sessionError);
      return NextResponse.json({ error: 'Unauthorized: Could not retrieve session token.' }, { status: 401 });
  }
  const userAuthToken = session.access_token;

  // 3. Invoke the Supabase Edge Function
  const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-user-account`;

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAuthToken}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    });

    // Try to parse JSON regardless of response.ok, as error details might be in body
    let responseData = {};
    try {
        responseData = await response.json();
    } catch (parseError) {
        console.warn('API delete account: Could not parse JSON response from Edge Function', parseError);
        // If JSON parsing fails, and response is not ok, use a generic error
        if (!response.ok) {
            return NextResponse.json(
              { error: 'Failed to delete account: Edge Function returned non-JSON error', details: `Status: ${response.status}` },
              { status: response.status }
            );
        }
        // if JSON parsing fails but response is ok, it might be an empty 200 or 204
        // but our edge function should always return JSON
    }

    if (!response.ok) {
      console.error(`API delete account: Edge function responded with error ${response.status}`, responseData);
      return NextResponse.json(
        { error: (responseData as any).error || 'Failed to delete account via Edge Function', details: responseData },
        { status: response.status }
      );
    }

    console.log('API delete account: Edge function call successful', responseData);
    return NextResponse.json({ message: (responseData as any).message || 'Account deletion initiated' }, { status: 200 });

  } catch (error: any) {
    console.error('API delete account: Error invoking Edge Function', error);
    return NextResponse.json(
      { error: 'Internal server error while calling delete function.', details: error.message },
      { status: 500 }
    );
  }
} 