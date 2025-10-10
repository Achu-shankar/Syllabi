import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import {
  updateSkillAssociation,
  deleteSkillAssociation,
} from '@/app/dashboard/libs/skills_db_queries_v2';

// Validation schema
const updateAssociationSchema = z.object({
  is_active: z.boolean().optional(),
  custom_config: z.record(z.any()).optional(),
});

/**
 * PATCH /api/dashboard/chatbots/[chatbotId]/skills/[associationId]
 * Update a skill association
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string; associationId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatbotId, associationId } = await params;
    const body = await request.json();
    const validatedData = updateAssociationSchema.parse(body);

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

    // Verify association exists and belongs to this chatbot
    const { data: association, error: associationError } = await supabase
      .from('chatbot_skill_associations')
      .select('id')
      .eq('id', associationId)
      .eq('chatbot_id', chatbotId)
      .single();

    if (associationError || !association) {
      return NextResponse.json({ error: 'Skill association not found' }, { status: 404 });
    }

    const updatedAssociation = await updateSkillAssociation(associationId, validatedData);

    return NextResponse.json({ association: updatedAssociation });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to update skill association:', error);
    return NextResponse.json(
      { error: 'Failed to update skill association' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dashboard/chatbots/[chatbotId]/skills/[associationId]
 * Remove a skill association from a chatbot
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string; associationId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatbotId, associationId } = await params;
    
    console.log('DELETE association request:', { chatbotId, associationId, userId: user.id });

    // Verify user owns this chatbot
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id')
      .eq('id', chatbotId)
      .eq('user_id', user.id)
      .single();

    if (chatbotError || !chatbot) {
      console.error('Chatbot not found:', { chatbotId, userId: user.id, error: chatbotError });
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    // Verify association exists and belongs to this chatbot
    const { data: association, error: associationError } = await supabase
      .from('chatbot_skill_associations')
      .select('id')
      .eq('id', associationId)
      .eq('chatbot_id', chatbotId)
      .single();

    if (associationError || !association) {
      console.error('Association not found:', { 
        associationId, 
        chatbotId, 
        error: associationError 
      });
      return NextResponse.json({ error: 'Skill association not found' }, { status: 404 });
    }

    await deleteSkillAssociation(associationId);

    console.log('Successfully deleted association:', associationId);
    return NextResponse.json({ message: 'Skill association removed successfully' });

  } catch (error) {
    console.error('Failed to delete skill association:', error);
    return NextResponse.json(
      { error: 'Failed to delete skill association' },
      { status: 500 }
    );
  }
} 