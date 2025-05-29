import { NextRequest, NextResponse } from 'next/server';
import { getPublishedChatbotBySlug } from '@/app/chat/lib/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    const chatbot = await getPublishedChatbotBySlug(slug);

    if (!chatbot) {
      return NextResponse.json(
        { error: 'Chatbot not found or not published' },
        { status: 404 }
      );
    }

    return NextResponse.json({ chatbot });
  } catch (error) {
    console.error('Error fetching chatbot by slug:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chatbot data' },
      { status: 500 }
    );
  }
} 