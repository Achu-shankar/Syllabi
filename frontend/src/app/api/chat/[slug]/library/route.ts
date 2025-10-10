import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  getFoldersByChatbot, 
  buildFolderTree,
  getContentSourcesByChatbotId
} from '@/app/dashboard/chatbots/[chatbotId]/library/lib/queries';
// import { getContentSourcesByChatbot } from '@/app/dashboard/chatbots/[chatbotId]/library/lib/content-sources';

// This is a read-only endpoint designed for the public chat interface.
// It fetches the entire library structure (folders and files) for a given chatbot slug.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: chatbotSlug } = await params;

    if (!chatbotSlug) {
      return NextResponse.json({ error: 'Chatbot slug is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Get chatbot_id from the shareable_url_slug
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id, visibility')
      .eq('shareable_url_slug', chatbotSlug)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }
    
    // For now, let's assume public access for simplicity, this can be tightened later
    // if (chatbot.visibility === 'private') {
    //   return NextResponse.json({ error: 'This chatbot is private' }, { status: 403 });
    // }

    const chatbotId = chatbot.id;

    // 2. Fetch folders and files in parallel
    const [folders, contentSources] = await Promise.all([
      getFoldersByChatbot(chatbotId),
      getContentSourcesByChatbotId(chatbotId)
    ]);
    
    // 3. Build the hierarchical structure
    const folderTree = buildFolderTree(folders);

    // 4. Return the combined data structure (implementation will be on the client in useLibraryData for now)
    // This can be moved to the server later for optimization.
    return NextResponse.json({
      success: true,
      data: {
        folders: folderTree,
        files: contentSources,
      }
    });

  } catch (error) {
    console.error('Error fetching library structure:', error);
    return NextResponse.json(
      { error: 'Failed to fetch library structure' },
      { status: 500 }
    );
  }
} 