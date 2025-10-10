import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../../../../utils/supabase/server';
import { toggleThemeFavorite } from '../../../../../../dashboard/libs/queries';

interface RouteParams {
  params: Promise<{
    themeId: string;
  }>;
}

// POST - Toggle favorite status of a custom theme
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { themeId } = await params;
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const updatedTheme = await toggleThemeFavorite(themeId, user.id);
    return NextResponse.json(updatedTheme, { status: 200 });

  } catch (error: any) {
    console.error('Error toggling theme favorite:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
} 