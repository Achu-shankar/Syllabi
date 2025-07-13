import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import {
  getSkillById,
  updateSkill,
  deleteSkill,
  type UpdateSkillInput,
} from '@/app/dashboard/libs/skills_db_queries_v2';

// Validation schema
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
 * GET /api/dashboard/skills/[skillId]
 * Get a specific skill by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { skillId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { skillId } = params;
    const skill = await getSkillById(skillId);

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    // Check if user owns this skill or it's a built-in skill
    if (skill.user_id !== null && skill.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ skill });

  } catch (error) {
    console.error('Failed to fetch skill:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skill' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/dashboard/skills/[skillId]
 * Update a skill
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { skillId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { skillId } = params;

    // Verify skill exists and user owns it
    const existingSkill = await getSkillById(skillId);
    if (!existingSkill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    if (existingSkill.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateSkillSchema.parse(body);

    const skill = await updateSkill(skillId, validatedData as UpdateSkillInput);

    return NextResponse.json({ skill });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to update skill:', error);
    return NextResponse.json(
      { error: 'Failed to update skill' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dashboard/skills/[skillId]
 * Delete a skill (only if user owns it)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { skillId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { skillId } = params;

    // Verify skill exists and user owns it
    const existingSkill = await getSkillById(skillId);
    if (!existingSkill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    if (existingSkill.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await deleteSkill(skillId);

    return NextResponse.json({ message: 'Skill deleted successfully' });

  } catch (error) {
    console.error('Failed to delete skill:', error);
    return NextResponse.json(
      { error: 'Failed to delete skill' },
      { status: 500 }
    );
  }
} 