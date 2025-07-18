import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../../../utils/supabase/server';
import { 
  getCustomTheme,
  updateCustomTheme, 
  deleteCustomTheme,
  UpdateCustomThemePayload,
  checkCustomThemeNameExists 
} from '../../../../../dashboard/libs/queries';

interface RouteParams {
  params: {
    themeId: string;
  };
}

// GET - Fetch a specific custom theme
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { themeId } = await params;
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const theme = await getCustomTheme(themeId, user.id);
    
    if (!theme) {
      return NextResponse.json({ error: "Theme not found or access denied" }, { status: 404 });
    }

    return NextResponse.json(theme, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching custom theme:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update a custom theme
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { themeId } = await params;
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const updates: UpdateCustomThemePayload = await request.json();

    // If updating name, check for conflicts
    if (updates.name) {
      const nameExists = await checkCustomThemeNameExists(user.id, updates.name, themeId);
      if (nameExists) {
        return NextResponse.json({ 
          error: "A theme with this name already exists" 
        }, { status: 409 });
      }
    }

    const updatedTheme = await updateCustomTheme(themeId, user.id, updates);
    return NextResponse.json(updatedTheme, { status: 200 });

  } catch (error: any) {
    console.error('Error updating custom theme:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete a custom theme
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { themeId } = await params;
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    await deleteCustomTheme(themeId, user.id);
    return NextResponse.json({ message: "Theme deleted successfully" }, { status: 200 });

  } catch (error: any) {
    console.error('Error deleting custom theme:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
} 