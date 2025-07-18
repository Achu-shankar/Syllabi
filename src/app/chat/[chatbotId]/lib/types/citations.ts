import { DocumentChunk } from '../db/content_queries';

/**
 * Simple citation format that LLM will return
 * Only requires reference_id and chunk_id, all other data is looked up from database
 */
export interface CitationInput {
  reference_id: string;
  chunk_id: string;
}

/**
 * Unified citation data structure after database lookup
 * Contains all information needed for display and navigation
 */
export interface UnifiedCitation {
  reference_id: string;
  chunk_id: string;
  chunk: DocumentChunk | null;
  
  // Content type detection
  isDocument: boolean;
  isMultimedia: boolean;
  
  // Document-specific fields
  page_number: number;
  coordinates: any[] | null; // from constituent_elements_data
  
  // Multimedia-specific fields  
  start_time_seconds: number | null;
  end_time_seconds: number | null;
  speaker: string | null;
  confidence_score: number | null;
  
  // Common fields
  content_type: 'document' | 'url' | 'video' | 'audio';
  chunk_text: string;
  token_count: number;
}

/**
 * Response from citation lookup API
 */
export interface CitationLookupResponse {
  success: boolean;
  data: UnifiedCitation[];
  count: number;
  found_count: number;
  requested_count: number;
}

/**
 * Helper function to determine if citation is multimedia
 */
export function isMultimediaCitation(citation: UnifiedCitation): boolean {
  return citation.content_type === 'video' || citation.content_type === 'audio';
}

/**
 * Helper function to determine if citation is document
 */
export function isDocumentCitation(citation: UnifiedCitation): boolean {
  return citation.content_type === 'document' || citation.content_type === 'url';
}

/**
 * Helper function to format timestamp for display
 */
export function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Helper function to transform DocumentChunk to UnifiedCitation
 */
export function transformChunkToCitation(
  referenceId: string,
  chunkId: string,
  chunk: DocumentChunk | null
): UnifiedCitation {
  const contentType = chunk?.content_type as 'document' | 'url' | 'video' | 'audio' || 'document';
  const isMultimedia = contentType === 'video' || contentType === 'audio';
  
  return {
    reference_id: referenceId,
    chunk_id: chunkId,
    chunk,
    isDocument: !isMultimedia,
    isMultimedia,
    page_number: chunk?.page_number || 0,
    coordinates: chunk?.constituent_elements_data ? 
      (Array.isArray(chunk.constituent_elements_data) ? chunk.constituent_elements_data : null) : null,
    start_time_seconds: chunk?.start_time_seconds || null,
    end_time_seconds: chunk?.end_time_seconds || null,
    speaker: chunk?.speaker || null,
    confidence_score: chunk?.confidence_score || null,
    content_type: contentType,
    chunk_text: chunk?.chunk_text || '',
    token_count: chunk?.token_count || 0,
  };
}