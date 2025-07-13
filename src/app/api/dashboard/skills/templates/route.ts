import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getBuiltinSkillTemplates,
  getBuiltinSkillTemplate,
  getBuiltinSkillCategories,
  getBuiltinSkillsByCategory,
} from '@/services/skills/builtin-skills';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const templateId = searchParams.get('template_id');

    // Return specific template if requested
    if (templateId) {
      const template = getBuiltinSkillTemplate(templateId);
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ template });
    }

    // Return templates by category if requested
    if (category) {
      const templates = getBuiltinSkillsByCategory(category);
      return NextResponse.json({
        templates,
        category,
        total: templates.length,
      });
    }

    // Return all templates and categories
    const templates = getBuiltinSkillTemplates();
    const categories = getBuiltinSkillCategories();

    return NextResponse.json({
      templates,
      categories,
      total: templates.length,
    });

  } catch (error) {
    console.error('Failed to fetch skill templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skill templates' },
      { status: 500 }
    );
  }
} 