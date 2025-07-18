import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import {
  getAvailableSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  isSkillNameUnique,
  type CreateSkillInput,
  type UpdateSkillInput,
} from '@/app/dashboard/libs/skills_db_queries_v2';

// Validation schemas
const createSkillSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Name must contain only letters, numbers, and underscores'),
  display_name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.string().min(1).max(50).optional(),
  type: z.enum(['custom', 'builtin']).optional(),
  function_schema: z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.object({
      type: z.literal('object'),
      properties: z.record(z.any()).optional(),
      required: z.array(z.string()).optional(),
    }).optional(),
  }),
  configuration: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
});

const updateSkillSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  category: z.string().min(1).max(50).optional(),
  function_schema: z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.object({
      type: z.literal('object'),
      properties: z.record(z.any()).optional(),
      required: z.array(z.string()).optional(),
    }).optional(),
  }).optional(),
  configuration: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET /api/dashboard/skills
 * Get all skills available to the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let skills;
    if (category) {
      const { getSkillsByCategory } = await import('@/app/dashboard/libs/skills_db_queries_v2');
      skills = await getSkillsByCategory(user.id, category);
    } else {
      skills = await getAvailableSkills(user.id);
    }

    return NextResponse.json({ skills });

  } catch (error) {
    console.error('Failed to fetch skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/skills
 * Create a new custom skill
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createSkillSchema.parse(body);

    // Check if skill name is unique for this user
    const isUnique = await isSkillNameUnique(user.id, validatedData.name);
    if (!isUnique) {
      return NextResponse.json(
        { error: 'A skill with this name already exists' },
        { status: 400 }
      );
    }

    const skill = await createSkill(validatedData as CreateSkillInput, user.id);

    return NextResponse.json({ skill }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to create skill:', error);
    return NextResponse.json(
      { error: 'Failed to create skill' },
      { status: 500 }
    );
  }
} 