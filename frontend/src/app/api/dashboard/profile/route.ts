import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../utils/supabase/server';
import {
  updateUserProfile,
  getUserProfile,
  type UpdateProfilePayload
} from '../../../dashboard/libs/queries';

// GET Handler for fetching user profile
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const profile = await getUserProfile(user.id);
    if (!profile) {
      // If profile is null, it might mean it hasn't been created yet.
      // We can return a default structure or a specific status.
      // For now, let's return an empty profile-like object or handle on client.
      // Or, more simply, the user object's email can be a fallback.
      return NextResponse.json({ id: user.id, email: user.email /* other defaults */ });
    }
    return NextResponse.json(profile);
  } catch (error: any) {
    console.error(`[API GET /profile] Error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error.message },
      { status: 500 }
    );
  }
}


// PATCH Handler for updating user profile
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let updates: UpdateProfilePayload;
  try {
    updates = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
  }
  // Add any specific validation for full_name or avatar_url if needed
  // e.g. if (updates.full_name && updates.full_name.trim() === '') { ... }

  try {
    const updatedProfileData = await updateUserProfile(user.id, updates);
    return NextResponse.json(updatedProfileData);
  } catch (error: any) {
    console.error(`[API PATCH /profile] Error:`, error);
    if (error.message.includes('not found')) { 
        return NextResponse.json({ error: 'Profile not found or access denied' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to update profile', details: error.message },
      { status: 500 }
    );
  }
} 