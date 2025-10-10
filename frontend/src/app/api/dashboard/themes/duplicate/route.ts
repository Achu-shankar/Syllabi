import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../../utils/supabase/server';
import { 
  duplicateTheme,
  ThemeSource,
  checkCustomThemeNameExists 
} from '../../../../dashboard/libs/queries';

interface DuplicateThemeRequest {
  source: ThemeSource;
  newName: string;
  newDescription?: string;
}

// POST - Duplicate an existing theme (default or custom) as a new custom theme
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { source, newName, newDescription }: DuplicateThemeRequest = await request.json();

    // Validate required fields
    if (!source || !newName) {
      return NextResponse.json({ 
        error: "Source theme and new name are required" 
      }, { status: 400 });
    }

    // Validate source structure
    if (!source.type || (source.type !== 'default' && source.type !== 'custom')) {
      return NextResponse.json({ 
        error: "Invalid source type. Must be 'default' or 'custom'" 
      }, { status: 400 });
    }

    if (source.type === 'default' && !source.themeId) {
      return NextResponse.json({ 
        error: "themeId is required for default themes" 
      }, { status: 400 });
    }

    if (source.type === 'custom' && !source.customThemeId) {
      return NextResponse.json({ 
        error: "customThemeId is required for custom themes" 
      }, { status: 400 });
    }

    // Check if theme name already exists for this user
    const nameExists = await checkCustomThemeNameExists(user.id, newName);
    if (nameExists) {
      return NextResponse.json({ 
        error: "A theme with this name already exists" 
      }, { status: 409 });
    }

    const duplicatedTheme = await duplicateTheme(user.id, source, newName, newDescription);
    return NextResponse.json(duplicatedTheme, { status: 201 });

  } catch (error: any) {
    console.error('Error duplicating theme:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
} 