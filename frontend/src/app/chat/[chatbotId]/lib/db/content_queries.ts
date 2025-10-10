import "server-only";
import { createClient } from '@/utils/supabase/server';

export interface ContentSource {
    id: string;
    chatbot_id: string;
    source_type: string;
    file_name: string | null;
    storage_path: string | null;
    source_url: string | null;
    title: string | null;
    indexing_status: string;
    error_message: string | null;
    metadata: any; // jsonb
    uploaded_at: string;
    processed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Chatbot {
    id: string;
    name: string;
    shareable_url_slug: string;
}

/**
 * Interface for document chunks with coordinate data
 */
export interface DocumentChunk {
    chunk_id: string;
    reference_id: string;
    user_id: string | null;
    chatbot_id: string;
    page_number: number;
    chunk_text: string;
    token_count: number;
    embedding: any; // vector type
    constituent_elements_data: any; // jsonb - contains coordinate information
    content_type: string; // 'document', 'url', 'video', 'audio'
    start_time_seconds: number | null; // for multimedia
    end_time_seconds: number | null; // for multimedia
    speaker: string | null; // for multimedia
    confidence_score: number | null; // for multimedia
    chunk_type: string | null; // 'page_text', 'transcript', etc.
    created_at: string;
    updated_at: string;
}

/**
 * Get chatbot by slug - helper function to get chatbot_id from slug
 */
export async function getChatbotBySlug(chatbotSlug: string): Promise<Chatbot | null> {
    const supabase = await createClient();
    try {
        console.log(`[ContentQueries] Looking up chatbot with slug: ${chatbotSlug}`);
        
        const { data, error } = await supabase
            .from('chatbots')
            .select('id, name, shareable_url_slug')
            .eq('shareable_url_slug', chatbotSlug)
            .single();
        
        if (error) {
            console.error('Error fetching chatbot by slug:', error);
            throw new Error(`Failed to fetch chatbot: ${error.message}`);
        }
        
        console.log(`[ContentQueries] Found chatbot:`, data);
        return data as Chatbot;
    } catch (error) {
        console.error('Error fetching chatbot by slug:', error);
        throw error;
    }
}

/**
 * Get all content sources for a chatbot by chatbot_id
 */
export async function getContentSourcesByChatbotId(chatbotId: string): Promise<ContentSource[]> {
    const supabase = await createClient();
    try {
        console.log(`[ContentQueries] Fetching content sources for chatbot_id: ${chatbotId}`);
        
        const { data, error } = await supabase
            .from('chatbot_content_sources')
            .select('id, chatbot_id, source_type, file_name, storage_path, source_url, title, indexing_status, error_message, metadata, uploaded_at, processed_at, created_at, updated_at')
            .eq('chatbot_id', chatbotId)
            .order('uploaded_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching content sources:', error);
            throw new Error(`Failed to fetch content sources: ${error.message}`);
        }
        
        console.log(`[ContentQueries] Found ${data?.length || 0} content sources:`, data);
        return data as ContentSource[] || [];
    } catch (error) {
        console.error('Error fetching content sources:', error);
        throw error;
    }
}

/**
 * Get all content sources for a chatbot by chatbot slug
 */
export async function getContentSourcesBySlug(chatbotSlug: string): Promise<ContentSource[]> {
    // First get the chatbot_id from the slug
    const chatbot = await getChatbotBySlug(chatbotSlug);
    if (!chatbot) {
        throw new Error('Chatbot not found');
    }
    
    // Then get the content sources
    return await getContentSourcesByChatbotId(chatbot.id);
}

/**
 * Get a specific content source by reference_id (which is the id field)
 */
export async function getContentSourceById(referenceId: string): Promise<ContentSource | null> {
    const supabase = await createClient();
    try {
        console.log(`[ContentQueries] Fetching content source by ID: ${referenceId}`);
        
        const { data, error } = await supabase
            .from('chatbot_content_sources')
            .select('id, chatbot_id, source_type, file_name, storage_path, source_url, title, indexing_status, error_message, metadata, uploaded_at, processed_at, created_at, updated_at')
            .eq('id', referenceId)
            .single();
        
        if (error) {
            console.error('Error fetching content source by id:', error);
            throw new Error(`Failed to fetch content source: ${error.message}`);
        }
        
        console.log(`[ContentQueries] Found content source:`, data);
        return data as ContentSource;
    } catch (error) {
        console.error('Error fetching content source by id:', error);
        throw error;
    }
}

/**
 * Get a specific document chunk by chunk_id
 */
export async function getDocumentChunkById(chunkId: string): Promise<DocumentChunk | null> {
    const supabase = await createClient();
    try {
        console.log(`[ContentQueries] Fetching document chunk by ID: ${chunkId}`);
        
        const { data, error } = await supabase
            .from('document_chunks')
            .select(`
                chunk_id,
                reference_id,
                user_id,
                chatbot_id,
                page_number,
                chunk_text,
                token_count,
                embedding,
                constituent_elements_data,
                content_type,
                start_time_seconds,
                end_time_seconds,
                speaker,
                confidence_score,
                chunk_type,
                created_at,
                updated_at
            `)
            .eq('chunk_id', chunkId)
            .single();
        
        if (error) {
            console.error('Error fetching document chunk by id:', error);
            throw new Error(`Failed to fetch document chunk: ${error.message}`);
        }
        
        console.log(`[ContentQueries] Found document chunk:`, data);
        return data as DocumentChunk;
    } catch (error) {
        console.error('Error fetching document chunk by id:', error);
        throw error;
    }
}

/**
 * Get document chunks by reference_id (document) and optional page_number
 */
export async function getDocumentChunksByReference(
    referenceId: string, 
    pageNumber?: number
): Promise<DocumentChunk[]> {
    const supabase = await createClient();
    try {
        console.log(`[ContentQueries] Fetching document chunks for reference_id: ${referenceId}${pageNumber ? `, page: ${pageNumber}` : ''}`);
        
        let query = supabase
            .from('document_chunks')
            .select(`
                chunk_id,
                reference_id,
                user_id,
                chatbot_id,
                page_number,
                chunk_text,
                token_count,
                embedding,
                constituent_elements_data,
                content_type,
                start_time_seconds,
                end_time_seconds,
                speaker,
                confidence_score,
                chunk_type,
                created_at,
                updated_at
            `)
            .eq('reference_id', referenceId)
            .order('page_number', { ascending: true })
            .order('created_at', { ascending: true });
        
        // Add page filter if specified
        if (pageNumber !== undefined) {
            query = query.eq('page_number', pageNumber);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Error fetching document chunks by reference:', error);
            throw new Error(`Failed to fetch document chunks: ${error.message}`);
        }
        
        console.log(`[ContentQueries] Found ${data?.length || 0} document chunks for reference ${referenceId}${pageNumber ? ` on page ${pageNumber}` : ''}`);
        return data as DocumentChunk[] || [];
    } catch (error) {
        console.error('Error fetching document chunks by reference:', error);
        throw error;
    }
}

/**
 * Get document chunks by chatbot slug and reference_id
 */
export async function getDocumentChunksBySlugAndReference(
    chatbotSlug: string,
    referenceId: string,
    pageNumber?: number
): Promise<DocumentChunk[]> {
    // First get the chatbot_id from the slug for security validation
    const chatbot = await getChatbotBySlug(chatbotSlug);
    if (!chatbot) {
        throw new Error('Chatbot not found');
    }
    
    const supabase = await createClient();
    try {
        console.log(`[ContentQueries] Fetching document chunks for chatbot: ${chatbotSlug}, reference_id: ${referenceId}${pageNumber ? `, page: ${pageNumber}` : ''}`);
        
        let query = supabase
            .from('document_chunks')
            .select(`
                chunk_id,
                reference_id,
                user_id,
                chatbot_id,
                page_number,
                chunk_text,
                token_count,
                embedding,
                constituent_elements_data,
                content_type,
                start_time_seconds,
                end_time_seconds,
                speaker,
                confidence_score,
                chunk_type,
                created_at,
                updated_at
            `)
            .eq('chatbot_id', chatbot.id) // Security: ensure chunks belong to this chatbot
            .eq('reference_id', referenceId)
            .order('page_number', { ascending: true })
            .order('created_at', { ascending: true });
        
        // Add page filter if specified
        if (pageNumber !== undefined) {
            query = query.eq('page_number', pageNumber);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Error fetching document chunks by slug and reference:', error);
            throw new Error(`Failed to fetch document chunks: ${error.message}`);
        }
        
        console.log(`[ContentQueries] Found ${data?.length || 0} document chunks for chatbot ${chatbotSlug}, reference ${referenceId}${pageNumber ? ` on page ${pageNumber}` : ''}`);
        return data as DocumentChunk[] || [];
    } catch (error) {
        console.error('Error fetching document chunks by slug and reference:', error);
        throw error;
    }
}

/**
 * Get multiple document chunks by their chunk_ids (for citation highlighting)
 */
export async function getDocumentChunksByIds(chunkIds: string[]): Promise<DocumentChunk[]> {
    if (chunkIds.length === 0) {
        return [];
    }
    
    const supabase = await createClient();
    try {
        console.log(`[ContentQueries] Fetching ${chunkIds.length} document chunks by IDs:`, chunkIds);
        
        const { data, error } = await supabase
            .from('document_chunks')
            .select(`
                chunk_id,
                reference_id,
                user_id,
                chatbot_id,
                page_number,
                chunk_text,
                token_count,
                embedding,
                constituent_elements_data,
                content_type,
                start_time_seconds,
                end_time_seconds,
                speaker,
                confidence_score,
                chunk_type,
                created_at,
                updated_at
            `)
            .in('chunk_id', chunkIds)
            .order('page_number', { ascending: true })
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Error fetching document chunks by IDs:', error);
            throw new Error(`Failed to fetch document chunks: ${error.message}`);
        }
        
        console.log(`[ContentQueries] Found ${data?.length || 0} document chunks out of ${chunkIds.length} requested`);
        return data as DocumentChunk[] || [];
    } catch (error) {
        console.error('Error fetching document chunks by IDs:', error);
        throw error;
    }
} 