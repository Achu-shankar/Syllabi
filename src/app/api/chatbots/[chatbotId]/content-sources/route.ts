import { NextRequest, NextResponse } from 'next/server';
import { 
  getContentSourcesByChatbotId, 
  createContentSource,
  ContentSourceCreateInput 
} from '@/app/dashboard/chatbots/[chatbotId]/library/lib/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params;
    
    if (!chatbotId) {
      return NextResponse.json(
        { error: 'Chatbot ID is required' },
        { status: 400 }
      );
    }

    const contentSources = await getContentSourcesByChatbotId(chatbotId);
    
    return NextResponse.json({
      success: true,
      data: contentSources
    });
    
  } catch (error) {
    console.error('Error fetching content sources:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch content sources' 
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params;
    const body = await request.json();
    
    if (!chatbotId) {
      return NextResponse.json(
        { error: 'Chatbot ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.source_type) {
      return NextResponse.json(
        { error: 'source_type is required' },
        { status: 400 }
      );
    }

    if (body.source_type === 'document' && !body.file_name) {
      return NextResponse.json(
        { error: 'file_name is required for document sources' },
        { status: 400 }
      );
    }

    if (body.source_type === 'url' && !body.source_url) {
      return NextResponse.json(
        { error: 'source_url is required for URL sources' },
        { status: 400 }
      );
    }

    const createInput: ContentSourceCreateInput = {
      chatbot_id: chatbotId,
      source_type: body.source_type,
      file_name: body.file_name,
      storage_path: body.storage_path,
      source_url: body.source_url,
      title: body.title,
      indexing_status: body.indexing_status || 'pending',
      metadata: body.metadata
    };

    const newContentSource = await createContentSource(createInput);
    
    return NextResponse.json({
      success: true,
      data: newContentSource
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating content source:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create content source' 
      },
      { status: 500 }
    );
  }
} 