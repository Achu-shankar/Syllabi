import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../utils/supabase/server';
import { 
  getAvailableThemes, 
  createCustomTheme, 
  CreateCustomThemePayload,
  checkCustomThemeNameExists 
} from '../../../dashboard/libs/queries';

// GET - Fetch all available themes (default + custom) for a user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const themes = await getAvailableThemes(user.id);
    return NextResponse.json(themes, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching themes:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new custom theme
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const themeData: CreateCustomThemePayload = await request.json();

    // Validate required fields
    if (!themeData.name || !themeData.theme_config) {
      return NextResponse.json({ 
        error: "Name and theme_config are required" 
      }, { status: 400 });
    }

    // Check if theme name already exists for this user
    const nameExists = await checkCustomThemeNameExists(user.id, themeData.name);
    if (nameExists) {
      return NextResponse.json({ 
        error: "A theme with this name already exists" 
      }, { status: 409 });
    }

    const newTheme = await createCustomTheme(user.id, themeData);
    return NextResponse.json(newTheme, { status: 201 });

  } catch (error: any) {
    console.error('Error creating custom theme:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
} 