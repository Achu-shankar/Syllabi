import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../../../utils/supabase/server';
import { ChatbotPermission, ChatbotRole } from '../../../../../dashboard/libs/queries';

interface RouteParams {
  params: {
    chatbotId: string;
  };
}

// GET - List all permissions for a chatbot
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { chatbotId } = await params;
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Verify the user owns this chatbot
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id, user_id')
      .eq('id', chatbotId)
      .eq('user_id', user.id)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json({ error: "Chatbot not found or access denied" }, { status: 404 });
    }

    // Get all permissions for this chatbot with user details
    const { data: permissions, error } = await supabase
      .from('chatbot_permissions')
      .select(`
        id,
        chatbot_id,
        user_id,
        role,
        created_at
      `)
      .eq('chatbot_id', chatbotId);

    if (error) {
      console.error('Error fetching permissions:', error);
      return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
    }

    if (!permissions || permissions.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Manually fetch user details for each permission
    const userIds = permissions.map(p => p.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      return NextResponse.json({ error: "Failed to fetch user details" }, { status: 500 });
    }

    // Create a map of user details
    const userMap = new Map();
    profiles?.forEach(profile => {
      userMap.set(profile.id, profile);
    });

    // Transform the data to include user details
    const permissionsWithUsers = permissions.map(permission => {
      const userProfile = userMap.get(permission.user_id);
      return {
        id: permission.id,
        chatbot_id: permission.chatbot_id,
        user_id: permission.user_id,
        role: permission.role,
        created_at: permission.created_at,
        user: userProfile ? {
          id: userProfile.id,
          full_name: userProfile.full_name,
          avatar_url: userProfile.avatar_url,
          email: userProfile.email
        } : null
      };
    });

    return NextResponse.json(permissionsWithUsers, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching chatbot permissions:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST - Grant permission to a user
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { chatbotId } = await params;
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { user_id, role = 'viewer' }: { user_id: string; role?: ChatbotRole } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    // Verify the user owns this chatbot
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id, user_id')
      .eq('id', chatbotId)
      .eq('user_id', user.id)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json({ error: "Chatbot not found or access denied" }, { status: 404 });
    }

    // Check if user already has permission
    const { data: existingPermission } = await supabase
      .from('chatbot_permissions')
      .select('id')
      .eq('chatbot_id', chatbotId)
      .eq('user_id', user_id)
      .single();

    if (existingPermission) {
      return NextResponse.json({ error: "User already has permission for this chatbot" }, { status: 409 });
    }

    // Grant permission
    const { data: newPermission, error } = await supabase
      .from('chatbot_permissions')
      .insert([{
        chatbot_id: chatbotId,
        user_id: user_id,
        role: role
      }])
      .select()
      .single();

    if (error) {
      console.error('Error granting permission:', error);
      return NextResponse.json({ error: "Failed to grant permission" }, { status: 500 });
    }

    return NextResponse.json(newPermission, { status: 201 });

  } catch (error: any) {
    console.error('Error granting chatbot permission:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
} 