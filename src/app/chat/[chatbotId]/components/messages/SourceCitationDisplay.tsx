'use client';

import React, { useState } from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'; // Assuming standard shadcn path
import { useEbookContext } from '../../lib/context/ebook-context'; // Import the ebook context hook
import { useContentSources } from '../../lib/hooks/useContentSources';
import { useParams } from 'next/navigation';
import { useCitationChunks } from '../../lib/hooks/useDocumentChunks';
import { usePdfViewerStore } from '../ebook/pdf-viewer/store/pdfViewerStore';
import { Annotation } from '../ebook/pdf-viewer/components/AnnotationLayer';
import { CitationInput, UnifiedCitation, formatTimestamp } from '../../lib/types/citations';

// Using unified citation types from imports

interface SourceCitationDisplayProps {
  jsonContent: string;
  citationNumber: number;
}

const SourceCitationDisplay: React.FC<SourceCitationDisplayProps> = ({
  jsonContent,
  citationNumber,
}) => {
  // Get the navigation function from the context
  const { selectDocument, openEbookPanel } = useEbookContext();
  const params = useParams();
  const chatbotSlug = params.chatbotId as string;
  const [isClicked, setIsClicked] = useState(false);

  // Fetch all content sources once
  const { data: contentSources = [] } = useContentSources(chatbotSlug);

  let parsedSources: CitationInput[] = [];
  try {
    parsedSources = JSON.parse(jsonContent);
    if (!Array.isArray(parsedSources)) {
      throw new Error('Parsed content is not an array');
    }
    // Basic validation of unified citation structure
    if (parsedSources.length > 0) {
      const firstSource = parsedSources[0];
      if (!firstSource.reference_id || !firstSource.chunk_id) {
        throw new Error('Citation must have both reference_id and chunk_id');
      }
    }
  } catch (error) {
    console.error('Error parsing source citation JSON:', error, 'Content:', jsonContent);
    // Render nothing or an error indicator if parsing fails
    // return <span className="text-red-500">[Invalid Citation Data]</span>; 
  }

  // Ensure we have sources to display
  if (parsedSources.length === 0) {
    return <span className="text-gray-500"></span>;
  }

  // Helper functions are now imported from citations.ts

  // Helper function to find document by reference_id
  const findDocument = (referenceId: string) => {
    return contentSources.find(doc => doc.id === referenceId);
  };

  // Fetch unified citation data for all citations
  const { 
    data: citationChunks, 
    isLoading: isLoadingChunks, 
    error: chunksError 
  } = useCitationChunks(
    chatbotSlug, 
    parsedSources,
    { enabled: parsedSources.length > 0 } // Fetch automatically when we have citations
  );

  // Debug logging for citation fetching
  React.useEffect(() => {
    if (parsedSources.length > 0) {
      console.log('[Citation Debug] Citations found:', parsedSources);
    }
  }, [parsedSources]);

  React.useEffect(() => {
    if (isLoadingChunks) {
      console.log('[Citation Debug] Loading chunks for citations...');
    }
  }, [isLoadingChunks]);

  React.useEffect(() => {
    if (citationChunks) {
      console.log('[Citation Debug] Citation chunks received:', citationChunks);
      citationChunks.forEach((citation, index) => {
        console.log(`[Citation Debug] Citation ${index + 1}:`, {
          chunkId: citation.chunk_id,
          referenceId: citation.reference_id,
          contentType: citation.content_type,
          isMultimedia: citation.isMultimedia,
          pageNumber: citation.page_number,
          startTime: citation.start_time_seconds,
          coordinatesCount: Array.isArray(citation.coordinates) ? citation.coordinates.length : 0,
          coordinates: Array.isArray(citation.coordinates) ? citation.coordinates.slice(0, 3) : citation.coordinates // Show first 3 coordinates as sample
        });
      });
    }
  }, [citationChunks]);

  React.useEffect(() => {
    if (chunksError) {
      console.error('[Citation Debug] Error fetching chunks:', chunksError);
    }
  }, [chunksError]);

  // Transform coordinate data for annotation layer
  const annotationData = React.useMemo(() => {
    if (!citationChunks || citationChunks.length === 0) return {};

    const annotationsByReference: Record<string, any[]> = {};

    citationChunks.forEach(citation => {
      if (!citation.coordinates || !Array.isArray(citation.coordinates)) return;

      const referenceId = citation.reference_id;
      if (!annotationsByReference[referenceId]) {
        annotationsByReference[referenceId] = [];
      }

      // Convert token coordinates to annotations
      const tokenAnnotations = citation.coordinates.map((token: any, index: number) => ({
        id: `${citation.chunk_id}-token-${index}`,
        type: 'highlight' as const,
        pageNumber: token.page_number,
        rect: {
          x: token.x0,
          y: token.y0,
          width: token.x1 - token.x0,
          height: token.y1 - token.y0
        },
        color: '#FFD700', // Gold color for citations
        opacity: 0.3,
        content: `Citation: ${citation.chunk_id}`,
        // Store additional metadata
        metadata: {
          chunkId: citation.chunk_id,
          tokenText: token.text,
          tokenIndex: index
        }
      }));

      annotationsByReference[referenceId].push(...tokenAnnotations);
    });

    return annotationsByReference;
  }, [citationChunks]);

  // Store integration for PDF annotations
  const setAnnotations = usePdfViewerStore(state => state.setAnnotations);
  const setCurrentPage = usePdfViewerStore(state => state.setCurrentPage);
  const navigateToPageWithAnnotations = usePdfViewerStore(state => state.navigateToPageWithAnnotations);
  const scrollToPage = usePdfViewerStore(state => state.scrollToPage);

  // Function to convert coordinates to AnnotationLayer format
  const convertCoordinatesToAnnotations = (coordinates: any[], chunkId: string, customColors?: string[]): Annotation[] => {
    if (!Array.isArray(coordinates)) {
      console.warn('[Citation] Coordinates is not an array:', coordinates);
      return [];
    }
    return coordinates.map((token, index) => {
      // Convert from stored coordinate system to PDF coordinate system
      // Stored coordinates appear to use top-left origin, PDF uses bottom-left origin
      // So we need to flip the Y coordinates: pdf_y = page_height - stored_y
      const pdfY0 = token.page_height - token.y1; // Bottom of text (was top in stored coords)
      const pdfY1 = token.page_height - token.y0; // Top of text (was bottom in stored coords)

      const rect = {
        x: token.x0,
        y: pdfY0, // Flipped Y coordinate for bottom of text
        width: token.x1 - token.x0,
        height: pdfY1 - pdfY0 // Height remains positive
      };

      return {
        id: `citation-${chunkId}-token-${index}`,
        pageNumber: token.page_number,
        type: 'highlight' as const,
        rect: rect,
        color: customColors?.[index] || '#FFD700', // Use custom color if provided
        opacity: 0.3,
        content: `Citation chunk: ${chunkId} | Token: ${token.text}`
      };
    });
  };


  // Handle click on a source pill to navigate to that document and highlight citations
  const handleSourceClick = (citation: UnifiedCitation) => {
    setIsClicked(true);
    const document = findDocument(citation.reference_id);
    
    if (document) {
      if (citation.isMultimedia) {
        console.log(`[Citation] Opening multimedia "${document.file_name}" at ${formatTimestamp(citation.start_time_seconds || 0)}`);
        selectDocument(document, citation.start_time_seconds || 0);
      } else if (citation.isDocument) {
        console.log(`[Citation] Opening document "${document.file_name}" at page ${citation.page_number}, chunk: ${citation.chunk_id}`);
        
        // Navigate to document first
        selectDocument(document);
        
        // Set up citation highlighting using coordinated navigation
        if (citation.coordinates && Array.isArray(citation.coordinates)) {
          console.log(`[Citation] Highlighting chunk ${citation.chunk_id} with ${citation.coordinates.length} tokens`);
          
          const highlightAnnotations = convertCoordinatesToAnnotations(
            citation.coordinates, 
            citation.chunk_id
          );
          
          // Use coordinated navigation to ensure annotations appear on the correct page
          navigateToPageWithAnnotations(citation.page_number, highlightAnnotations);
          
          // Also use the store's scrollToPage method to navigate
          setTimeout(() => scrollToPage(citation.page_number), 100);
          
          console.log(`[Citation] Set up coordinated navigation to page ${citation.page_number} with ${highlightAnnotations.length} annotations`);
        } else {
          console.warn(`[Citation] No coordinates found for chunk ${citation.chunk_id}`);
          setCurrentPage(citation.page_number);
          scrollToPage(citation.page_number);
          setAnnotations([]);
        }
      }
    } else {
      console.warn(`[Citation] Document not found for reference: ${citation.reference_id}`);
      openEbookPanel(citation.reference_id);
    }
    
    // Reset clicked state after a short delay
    setTimeout(() => setIsClicked(false), 2000);
  };

  // Handle clicking directly on the citation number
  const handleCitationClick = () => {
    if (citationChunks && citationChunks.length > 0) {
      // Navigate to the first citation
      handleSourceClick(citationChunks[0]);
    }
  };

  // Generate tooltip text based on source type
  const getTooltipText = () => {
    if (citationChunks && citationChunks.length === 1) {
      const citation = citationChunks[0];
      const doc = findDocument(citation.reference_id);
      if (citation.isMultimedia) {
        return doc 
          ? `Click to view "${doc.file_name}" at ${formatTimestamp(citation.start_time_seconds || 0)}`
          : `Click to view multimedia at ${formatTimestamp(citation.start_time_seconds || 0)}`;
      } else if (citation.isDocument) {
        return doc 
          ? `Click to view "${doc.file_name}" at page ${citation.page_number} (chunk highlight)`
          : `Click to view page ${citation.page_number} in document (chunk highlight)`;
      }
    }
    return `Click to view ${parsedSources.length} sources`;
  };

  // Generate a unique ID for ARIA attributes if needed, though HoverCard might handle this
  const triggerId = `citation-trigger-${citationNumber}`;
  const contentId = `citation-content-${citationNumber}`;

  // Debug logging for citation fetching
  React.useEffect(() => {
    if (parsedSources.length > 0) {
      console.log('[Citation Debug] Citations found:', parsedSources);
    }
  }, [parsedSources]);

  React.useEffect(() => {
    if (isLoadingChunks) {
      console.log('[Citation Debug] Loading chunks for citations...');
    }
  }, [isLoadingChunks]);

  React.useEffect(() => {
    if (citationChunks) {
      console.log('[Citation Debug] Citation chunks received:', citationChunks);
      citationChunks.forEach((citation, index) => {
        console.log(`[Citation Debug] Citation ${index + 1}:`, {
          chunkId: citation.chunk_id,
          referenceId: citation.reference_id,
          contentType: citation.content_type,
          isMultimedia: citation.isMultimedia,
          pageNumber: citation.page_number,
          startTime: citation.start_time_seconds,
          coordinatesCount: Array.isArray(citation.coordinates) ? citation.coordinates.length : 0,
          coordinates: Array.isArray(citation.coordinates) ? citation.coordinates.slice(0, 3) : citation.coordinates // Show first 3 coordinates as sample
        });
      });
    }
  }, [citationChunks]);

  React.useEffect(() => {
    if (chunksError) {
      console.error('[Citation Debug] Error fetching chunks:', chunksError);
    }
  }, [chunksError]);

  React.useEffect(() => {
    if (Object.keys(annotationData).length > 0) {
      console.log('[Citation Debug] Annotation data processed:', annotationData);
      Object.entries(annotationData).forEach(([refId, annotations]) => {
        console.log(`[Citation Debug] Reference ${refId}: ${annotations.length} annotations`);
      });
    }
  }, [annotationData]);


  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {/* Display citation number like [1], [2], etc. */}
        <button 
          className={`inline-block align-super text-xs px-1.5 py-0.5 rounded-full mx-0.5 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
            isClicked 
              ? 'focus:ring-green-400' 
              : 'focus:ring-blue-400'
          }`}
          style={{
            backgroundColor: isClicked 
              ? 'var(--chat-primary-color, #3b82f6)' + '20'
              : 'var(--chat-primary-color, #3b82f6)' + '15',
            color: 'var(--chat-primary-color, #3b82f6)',
            borderColor: 'var(--chat-primary-color, #3b82f6)' + '30',
            border: '1px solid'
          }}
          id={triggerId}
          aria-describedby={contentId}
          onClick={handleCitationClick}
          title={getTooltipText()}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--chat-primary-color, #3b82f6)' + '25';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isClicked 
              ? 'var(--chat-primary-color, #3b82f6)' + '20'
              : 'var(--chat-primary-color, #3b82f6)' + '15';
          }}
        >
          [{citationNumber}]
        </button>
      </HoverCardTrigger>
      <HoverCardContent 
        side="top"
        className="w-80 p-0 shadow-lg"
        id={contentId}
        role="tooltip"
      >
        <div 
          className="overflow-hidden"
          style={{
            background: 'var(--chat-chat-window-background-color, white)',
            borderRadius: '12px',
            color: 'var(--chat-primary-color, rgb(75, 85, 99))'
          }}
        > 
          {/* Header */}
          <div 
            className="px-4 py-2.5"
            style={{
              backgroundColor: 'var(--chat-sidebar-background-color, rgb(249, 250, 251))',
              borderBottom: '1px solid var(--chat-suggested-question-chip-border-color, rgb(229, 231, 235))' + '30'
            }}
          >
            <div 
              className="text-sm font-semibold flex items-center gap-2"
              style={{ color: 'var(--chat-sidebar-text-color, rgb(75, 85, 99))' }}
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: 'var(--chat-primary-color, #3b82f6)' }}
              ></div>
              {parsedSources.length > 1 ? `${parsedSources.length} Sources` : 'Source'}
            </div>
          </div>

          {/* Content */}
          <div>
              {citationChunks?.map((citation, index) => {
                const document = findDocument(citation.reference_id);
                const isLast = index === (citationChunks?.length || 0) - 1;
                
                return (
                <div 
                  key={`citation-${citation.reference_id}-${citation.chunk_id}`} 
                  className="px-4 py-3 cursor-pointer transition-all duration-200 hover:scale-[1.01]"
                  style={{
                    borderBottom: !isLast ? '1px solid var(--chat-suggested-question-chip-border-color, rgb(229, 231, 235))' + '20' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--chat-sidebar-background-color, rgb(249, 250, 251))' + '40';
                    e.currentTarget.style.transform = 'scale(1.01) translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  onClick={() => handleSourceClick(citation)}
                >
                  <div className="space-y-2.5">
                    {/* Document name - Primary hierarchy */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--chat-primary-color, rgb(75, 85, 99))' }}
                        >
                            {document?.file_name || 'Unknown Document'}
                          </h4>
                      </div>
                      
                      {/* Open button with gradient */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSourceClick(citation);
                        }}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
                        style={{
                          background: `linear-gradient(135deg, var(--chat-primary-color, #3b82f6)15 0%, var(--chat-primary-color, #3b82f6)08 100%)`,
                          color: 'var(--chat-primary-color, #3b82f6)',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = `linear-gradient(135deg, var(--chat-primary-color, #3b82f6)25 0%, var(--chat-primary-color, #3b82f6)15 100%)`;
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = `linear-gradient(135deg, var(--chat-primary-color, #3b82f6)15 0%, var(--chat-primary-color, #3b82f6)08 100%)`;
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                        }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open
                      </button>
                    </div>
                    
                    {/* Page/timestamp info - Secondary hierarchy */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {citation.isMultimedia ? (
                          <>
                            <span 
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105"
                              style={{
                                background: `linear-gradient(135deg, var(--chat-primary-color, #3b82f6)18 0%, var(--chat-primary-color, #3b82f6)10 100%)`,
                                color: 'var(--chat-primary-color, #3b82f6)'
                              }}
                            >
                              Timestamp {formatTimestamp(citation.start_time_seconds || 0)}
                            </span>
                            {citation.speaker && (
                              <span 
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105"
                                style={{
                                  background: `linear-gradient(135deg, var(--chat-sidebar-text-color, rgb(107, 114, 128))18 0%, var(--chat-sidebar-text-color, rgb(107, 114, 128))10 100%)`,
                                  color: 'var(--chat-sidebar-text-color, rgb(107, 114, 128))'
                                }}
                              >
                                {citation.speaker}
                              </span>
                            )}
                          </>
                        ) : citation.isDocument ? (
                          <>
                            <span 
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105"
                              style={{
                                background: `linear-gradient(135deg, var(--chat-primary-color, #3b82f6)18 0%, var(--chat-primary-color, #3b82f6)10 100%)`,
                                color: 'var(--chat-primary-color, #3b82f6)'
                              }}
                            >
                              Page {citation.page_number}
                            </span>
                            <span 
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105"
                              style={{
                                background: `linear-gradient(135deg, var(--chat-sidebar-text-color, rgb(107, 114, 128))18 0%, var(--chat-sidebar-text-color, rgb(107, 114, 128))10 100%)`,
                                color: 'var(--chat-sidebar-text-color, rgb(107, 114, 128))'
                              }}
                            >
                              📍 Chunk
                            </span>
                          </>
                        ) : null}
                      </div>
                      
                      {/* Description - Tertiary hierarchy */}
                      <p 
                        className="text-xs"
                        style={{ color: 'var(--chat-sidebar-text-color, rgb(107, 114, 128))' + '80' }}
                      >
                        {citation.isMultimedia ? 'View timestamp' : 'View & highlight'}
                      </p>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default SourceCitationDisplay; 