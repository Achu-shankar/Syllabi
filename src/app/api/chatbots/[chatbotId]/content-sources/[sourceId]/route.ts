import { NextRequest, NextResponse } from 'next/server';
import { 
  getContentSourceById,
  updateContentSource,
  deleteContentSource,
  ContentSourceUpdateInput 
} from '@/app/dashboard/chatbots/[chatbotId]/library/lib/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: { chatbotId: string; sourceId: string } }
) {
  try {
    const { sourceId } = params;
    
    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    const contentSource = await getContentSourceById(sourceId);
    
    if (!contentSource) {
      return NextResponse.json(
        { error: 'Content source not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: contentSource
    });
    
  } catch (error) {
    console.error('Error fetching content source:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch content source' 
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { chatbotId: string; sourceId: string } }
) {
  try {
    const { sourceId } = params;
    const body = await request.json();
    
    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    const updateInput: ContentSourceUpdateInput = {
      source_type: body.source_type,
      file_name: body.file_name,
      storage_path: body.storage_path,
      source_url: body.source_url,
      title: body.title,
      indexing_status: body.indexing_status,
      error_message: body.error_message,
      metadata: body.metadata,
      processed_at: body.processed_at
    };

    // Remove undefined fields
    Object.keys(updateInput).forEach(key => {
      if (updateInput[key as keyof ContentSourceUpdateInput] === undefined) {
        delete updateInput[key as keyof ContentSourceUpdateInput];
      }
    });

    const updatedContentSource = await updateContentSource(sourceId, updateInput);
    
    return NextResponse.json({
      success: true,
      data: updatedContentSource
    });
    
  } catch (error) {
    console.error('Error updating content source:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update content source' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { chatbotId: string; sourceId: string } }
) {
  try {
    const { sourceId } = params;
    
    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    await deleteContentSource(sourceId);
    
    return NextResponse.json({
      success: true,
      message: 'Content source deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting content source:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete content source' 
      },
      { status: 500 }
    );
  }
} 