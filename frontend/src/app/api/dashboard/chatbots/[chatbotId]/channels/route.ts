import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  getChatbotChannelLinks,
  createChatbotChannelLink,
  updateChatbotChannelLink,
  deleteChatbotChannelLink
} from '@/app/dashboard/chatbots/[chatbotId]/channels/libs/queries';
import { z } from 'zod';

// Schema for creating/updating channel links
const channelLinkSchema = z.object({
  integrationId: z.string().uuid(),
  config: z.record(z.any()).default({}),
});

const updateChannelLinkSchema = z.object({
  linkId: z.string().uuid(),
  config: z.record(z.any()),
});

// GET /api/dashboard/chatbots/[chatbotId]/channels
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatbotId } = await params;
    const links = await getChatbotChannelLinks(chatbotId, user.id);
    return NextResponse.json(links);

  } catch (error: any) {
    console.error('Error fetching channel links:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch channel links' },
      { status: 500 }
    );
  }
}

// POST /api/dashboard/chatbots/[chatbotId]/channels
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { integrationId, config } = channelLinkSchema.parse(body);
    const { chatbotId } = await params;

    const link = await createChatbotChannelLink({
      chatbotId,
      integrationId,
      config,
      userId: user.id,
    });

    return NextResponse.json(link);

  } catch (error: any) {
    console.error('Error creating channel link:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create channel link' },
      { status: 500 }
    );
  }
}

// PUT /api/dashboard/chatbots/[chatbotId]/channels
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { linkId, config } = updateChannelLinkSchema.parse(body);

    const link = await updateChatbotChannelLink({
      linkId,
      config,
      userId: user.id,
    });

    return NextResponse.json(link);

  } catch (error: any) {
    console.error('Error updating channel link:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update channel link' },
      { status: 500 }
    );
  }
}

// DELETE /api/dashboard/chatbots/[chatbotId]/channels/[linkId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const linkId = url.searchParams.get('linkId');

    if (!linkId) {
      return NextResponse.json({ error: 'linkId parameter required' }, { status: 400 });
    }

    await deleteChatbotChannelLink({
      linkId,
      userId: user.id,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error deleting channel link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete channel link' },
      { status: 500 }
    );
  }
} 