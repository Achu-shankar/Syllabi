import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../../utils/supabase/server';
import { UserSearchResult } from '../../../../dashboard/libs/queries';

// GET - Search users by email
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "Search query must be at least 2 characters" }, { status: 400 });
    }

    const searchTerm = query.trim().toLowerCase();

    // Query profiles directly by email (since emails are stored in profiles table)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .neq('id', user.id) // Exclude current user
      .ilike('email', `%${searchTerm}%`); // Case-insensitive email search

    if (profileError) {
      console.error('Error searching profiles:', profileError);
      return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
    }

    console.log('=== SEARCH RESULTS ===');
    console.log('Search term:', searchTerm);
    console.log('Found profiles:', profiles?.length || 0);
    profiles?.forEach((profile, index) => {
      console.log(`Result ${index + 1}:`, {
        id: profile.id.slice(0, 8),
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url
      });
    });
    console.log('=== END SEARCH RESULTS ===');

    // Transform to UserSearchResult format
    const searchResults: UserSearchResult[] = profiles?.map(profile => ({
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      email: profile.email
    })) || [];

    return NextResponse.json(searchResults, { status: 200 });

  } catch (error: any) {
    console.error('Error in user search:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
} 