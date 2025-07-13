import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import {
  getSkillsForChatbot,
  createSkillAssociation,
  updateSkillAssociation,
  deleteSkillAssociation,
  type CreateAssociationInput,
} from '@/app/dashboard/libs/skills_db_queries_v2';

// Validation schemas
const createAssociationSchema = z.object({
  skill_id: z.string().uuid(),
  is_active: z.boolean().optional(),
  custom_config: z.record(z.any()).optional(),
});

const updateAssociationSchema = z.object({
  is_active: z.boolean().optional(),
  custom_config: z.record(z.any()).optional(),
});

/**
 * GET /api/dashboard/chatbots/[chatbotId]/skills
 * Get all skills associated with a chatbot
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { chatbotId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatbotId } = params;

    // Verify user owns this chatbot
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id')
      .eq('id', chatbotId)
      .eq('user_id', user.id)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    const skills = await getSkillsForChatbot(chatbotId);

    // Use new schema only - old schema has been migrated and removed
    return NextResponse.json({ skills });

  } catch (error) {
    console.error('Failed to fetch chatbot skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chatbot skills' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/chatbots/[chatbotId]/skills
 * Associate a skill with a chatbot
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { chatbotId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatbotId } = params;

    // Verify user owns this chatbot
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id')
      .eq('id', chatbotId)
      .eq('user_id', user.id)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createAssociationSchema.parse(body);

    // Verify user has access to this skill (either owns it or it's a built-in skill)
    const { data: skill, error: skillError } = await supabase
      .from('skills')
      .select('id, user_id')
      .eq('id', validatedData.skill_id)
      .single();

    if (skillError || !skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    if (skill.user_id !== null && skill.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied to this skill' }, { status: 403 });
    }

    // Check if association already exists
    const { data: existingAssociation } = await supabase
      .from('chatbot_skill_associations')
      .select('id')
      .eq('chatbot_id', chatbotId)
      .eq('skill_id', validatedData.skill_id)
      .single();

    if (existingAssociation) {
      return NextResponse.json(
        { error: 'Skill is already associated with this chatbot' },
        { status: 400 }
      );
    }

    const association = await createSkillAssociation({
      chatbot_id: chatbotId,
      skill_id: validatedData.skill_id,
      is_active: validatedData.is_active,
      custom_config: validatedData.custom_config,
    });

    return NextResponse.json({ association }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to create skill association:', error);
    return NextResponse.json(
      { error: 'Failed to create skill association' },
      { status: 500 }
    );
  }
} 