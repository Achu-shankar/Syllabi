'use client';

import React, { useState, useEffect } from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'; // Assuming standard shadcn path
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Assuming standard shadcn path
import { useEbookContext } from '../../lib/context/ebook-context'; // Import the ebook context hook
import { useContentSources } from '../../lib/hooks/useContentSources';
import { useParams } from 'next/navigation';
import { useChatTheme } from '../../../contexts/ChatbotThemeContext';
import { useCitationChunks } from '../../lib/hooks/useDocumentChunks';
import { usePdfViewerStore } from '../ebook/pdf-viewer/store/pdfViewerStore';
import { Annotation } from '../ebook/pdf-viewer/components/AnnotationLayer';

interface DocumentSource {
  reference_id: string;
  chunk_id: string;
  page_number: number;
}

interface MultimediaSource {
  reference_id: string;
  start_time_seconds: number;
  end_time_seconds?: number;
  speaker?: string;
}

type Source = DocumentSource | MultimediaSource;

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
  const { resolvedTheme } = useChatTheme();
  const params = useParams();
  const chatbotSlug = params.chatbotId as string;
  const [isClicked, setIsClicked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch all content sources once
  const { data: contentSources = [] } = useContentSources(chatbotSlug);

  let parsedSources: Source[] = [];
  try {
    parsedSources = JSON.parse(jsonContent);
    if (!Array.isArray(parsedSources)) {
      throw new Error('Parsed content is not an array');
    }
    // Basic validation of source structure
    if (parsedSources.length > 0) {
      const firstSource = parsedSources[0];
      const hasPageNumber = 'page_number' in firstSource;
      const hasTimestamp = 'start_time_seconds' in firstSource;
      const hasChunkId = 'chunk_id' in firstSource;
      if (!firstSource.reference_id || (!hasPageNumber && !hasTimestamp)) {
        throw new Error('Source object structure is invalid');
      }
      // Additional validation for document sources
      if (hasPageNumber && !hasChunkId) {
        console.warn('Document source missing chunk_id - highlighting may not work properly');
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

  // Helper function to check if source is multimedia
  const isMultimediaSource = (source: Source): source is MultimediaSource => {
    return 'start_time_seconds' in source;
  };

  // Helper function to check if source is document
  const isDocumentSource = (source: Source): source is DocumentSource => {
    return 'chunk_id' in source && 'page_number' in source;
  };

  // Helper function to format timestamp
  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Helper function to find document by reference_id
  const findDocument = (referenceId: string) => {
    return contentSources.find(doc => doc.id === referenceId);
  };

  // Fetch coordinate data for document citations
  const { 
    data: citationChunks, 
    isLoading: isLoadingChunks, 
    error: chunksError 
  } = useCitationChunks(
    chatbotSlug, 
    parsedSources.filter(isDocumentSource).map(source => ({
      reference_id: source.reference_id,
      chunk_id: source.chunk_id,
      page_number: source.page_number
    })),
    { enabled: parsedSources.filter(isDocumentSource).length > 0 } // Fetch automatically when we have citations
  );

  // Debug logging for coordinate fetching
  React.useEffect(() => {
    if (parsedSources.length > 0) {
      console.log('[Citation Debug] Document citations found:', parsedSources.filter(isDocumentSource).map(source => ({
        reference_id: source.reference_id,
        chunk_id: source.chunk_id,
        page_number: source.page_number
      })));
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
      citationChunks.forEach((chunk, index) => {
        console.log(`[Citation Debug] Chunk ${index + 1}:`, {
          chunkId: chunk.chunk_id,
          referenceId: chunk.reference_id,
          pageNumber: chunk.page_number,
          coordinatesCount: chunk.coordinates ? chunk.coordinates.length : 0,
          coordinates: chunk.coordinates?.slice(0, 3) // Show first 3 coordinates as sample
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

  // Convert live citation chunks to annotations
  const convertCitationChunksToAnnotations = (chunks: typeof citationChunks): Annotation[] => {
    if (!chunks || chunks.length === 0) return [];

    const allAnnotations: Annotation[] = [];

    chunks.forEach(citation => {
      if (!citation.coordinates || !Array.isArray(citation.coordinates)) return;

      const chunkAnnotations = convertCoordinatesToAnnotations(
        citation.coordinates, 
        citation.chunk_id,
        undefined // Use default gold color for live citations
      );

      allAnnotations.push(...chunkAnnotations);
    });

    console.log(`[Live Citation] Converted ${chunks.length} citation chunks to ${allAnnotations.length} annotations`);
    return allAnnotations;
  };

  // Handle click on a source pill to navigate to that document and highlight citations
  const handleSourceClick = (source: Source) => {
    setIsClicked(true);
    const document = findDocument(source.reference_id);
    
    if (document) {
      if (isMultimediaSource(source)) {
        console.log(`[Citation] Opening multimedia "${document.file_name}" at ${formatTimestamp(source.start_time_seconds)}`);
        selectDocument(document, source.start_time_seconds);
      } else if (isDocumentSource(source)) {
        console.log(`[Citation] Opening document "${document.file_name}" at page ${source.page_number}, chunk: ${source.chunk_id}`);
        
        // Navigate to document first
        selectDocument(document);
        
        // Set up citation highlighting using coordinated navigation
        if (citationChunks && citationChunks.length > 0) {
          const specificCitation = citationChunks.find(c => 
            c.reference_id === source.reference_id && c.chunk_id === source.chunk_id
          );
          
          if (specificCitation?.coordinates) {
            console.log(`[Citation] Highlighting chunk ${source.chunk_id} with ${specificCitation.coordinates.length} tokens`);
            
            const highlightAnnotations = convertCoordinatesToAnnotations(
              specificCitation.coordinates, 
              source.chunk_id
            );
            
            // Use coordinated navigation to ensure annotations appear on the correct page
            navigateToPageWithAnnotations(source.page_number, highlightAnnotations);
            
            // Also use the store's scrollToPage method to navigate
            setTimeout(() => scrollToPage(source.page_number), 100);
            
            console.log(`[Citation] Set up coordinated navigation to page ${source.page_number} with ${highlightAnnotations.length} annotations`);
          } else {
            console.warn(`[Citation] No coordinates found for chunk ${source.chunk_id}`);
            setCurrentPage(source.page_number);
            scrollToPage(source.page_number);
            setAnnotations([]);
          }
        } else {
          console.warn(`[Citation] No citation chunks available for highlighting`);
          setCurrentPage(source.page_number);
          scrollToPage(source.page_number);
          setAnnotations([]);
        }
      }
    } else {
      console.warn(`[Citation] Document not found for reference: ${source.reference_id}`);
      openEbookPanel(source.reference_id);
    }
    
    // Reset clicked state after a short delay
    setTimeout(() => setIsClicked(false), 2000);
  };

  // Handle clicking directly on the citation number
  const handleCitationClick = () => {
    if (parsedSources.length === 1) {
      // If only one source, directly navigate to it
      handleSourceClick(parsedSources[0]);
    } else if (parsedSources.length > 1) {
      // If multiple sources, navigate to the first one
      handleSourceClick(parsedSources[0]);
    }
  };

  // Generate tooltip text based on source type
  const getTooltipText = () => {
    if (parsedSources.length === 1) {
      const source = parsedSources[0];
      const doc = findDocument(source.reference_id);
      if (isMultimediaSource(source)) {
        return doc 
          ? `Click to view "${doc.file_name}" at ${formatTimestamp(source.start_time_seconds)}`
          : `Click to view multimedia at ${formatTimestamp(source.start_time_seconds)}`;
      } else if (isDocumentSource(source)) {
        return doc 
          ? `Click to view "${doc.file_name}" at page ${source.page_number} (chunk highlight)`
          : `Click to view page ${source.page_number} in document (chunk highlight)`;
      }
    }
    return `Click to view ${parsedSources.length} sources`;
  };

  // Generate a unique ID for ARIA attributes if needed, though HoverCard might handle this
  const triggerId = `citation-trigger-${citationNumber}`;
  const contentId = `citation-content-${citationNumber}`;

  // Debug logging for coordinate fetching
  React.useEffect(() => {
    if (parsedSources.length > 0) {
      console.log('[Citation Debug] Document citations found:', parsedSources.filter(isDocumentSource).map(source => ({
        reference_id: source.reference_id,
        chunk_id: source.chunk_id,
        page_number: source.page_number
      })));
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
      citationChunks.forEach((chunk, index) => {
        console.log(`[Citation Debug] Chunk ${index + 1}:`, {
          chunkId: chunk.chunk_id,
          referenceId: chunk.reference_id,
          pageNumber: chunk.page_number,
          coordinatesCount: chunk.coordinates ? chunk.coordinates.length : 0,
          coordinates: chunk.coordinates?.slice(0, 3) // Show first 3 coordinates as sample
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

  const renderSource = (source: Source, index: number) => {
    if (isMultimediaSource(source)) {
      // ... existing multimedia rendering code ...
    } else {
      // Document source rendering
      const citationData = citationChunks?.find(c => 
        c.reference_id === source.reference_id && c.chunk_id === source.chunk_id
      );
      
      return (
        <div key={index} className="border rounded-lg overflow-hidden">
          <div 
            className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                Document • Page {source.page_number}
                {citationData?.chunk && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({citationData.chunk.token_count} tokens)
                  </span>
                )}
              </span>
              {isLoadingChunks && (
                <span className="text-xs text-gray-400">Loading coordinates...</span>
              )}
            </div>
          </div>
          
          {/* TODO: Integrate EbookReader with annotations once prop interface is fixed */}
          <div className="border-t p-3 text-sm text-gray-600">
            <div className="space-y-2">
              <div>PDF viewer with chunk highlighting will be integrated here.</div>
              
              {/* Debug Information */}
              <div className="text-xs bg-gray-50 p-2 rounded border">
                <div className="font-medium text-gray-800 mb-1">Debug Info:</div>
                <div>• Chunk ID: <code className="bg-gray-200 px-1 rounded">{source.chunk_id}</code></div>
                <div>• Reference ID: <code className="bg-gray-200 px-1 rounded">{source.reference_id}</code></div>
                <div>• Page: {source.page_number}</div>
                
                {isLoadingChunks && (
                  <div className="text-blue-600">🔄 Loading coordinates...</div>
                )}
                
                {chunksError && (
                  <div className="text-red-600">❌ Error: {chunksError.message}</div>
                )}
                
                {citationData?.coordinates ? (
                  <div className="text-green-600">
                    ✅ Found {citationData.coordinates.length} coordinate tokens
                    <details className="mt-1">
                      <summary className="cursor-pointer">View first 3 coordinates</summary>
                      <pre className="mt-1 text-xs bg-white p-1 border rounded overflow-x-auto">
                        {JSON.stringify(citationData.coordinates.slice(0, 3), null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : citationData && !citationData.coordinates ? (
                  <div className="text-yellow-600">⚠️ Chunk found but no coordinates</div>
                ) : !isLoadingChunks ? (
                  <div className="text-gray-500">⏳ No coordinate data yet</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

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
              {parsedSources.map((source, index) => {
                const document = findDocument(source.reference_id);
              const isMultimedia = isMultimediaSource(source);
              const isLast = index === parsedSources.length - 1;
                
                return (
                <div 
                  key={`source-${source.reference_id}-${isDocumentSource(source) ? source.chunk_id : 'multimedia'}`} 
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
                  onClick={() => handleSourceClick(source)}
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
                          handleSourceClick(source);
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
                        {isMultimedia ? (
                          <>
                            <span 
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105"
                              style={{
                                background: `linear-gradient(135deg, var(--chat-primary-color, #3b82f6)18 0%, var(--chat-primary-color, #3b82f6)10 100%)`,
                                color: 'var(--chat-primary-color, #3b82f6)'
                              }}
                            >
                              Timestamp {formatTimestamp(source.start_time_seconds)}
                            </span>
                            {source.speaker && (
                              <span 
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105"
                                style={{
                                  background: `linear-gradient(135deg, var(--chat-sidebar-text-color, rgb(107, 114, 128))18 0%, var(--chat-sidebar-text-color, rgb(107, 114, 128))10 100%)`,
                                  color: 'var(--chat-sidebar-text-color, rgb(107, 114, 128))'
                                }}
                              >
                                {source.speaker}
                              </span>
                            )}
                          </>
                        ) : isDocumentSource(source) ? (
                          <>
                            <span 
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105"
                              style={{
                                background: `linear-gradient(135deg, var(--chat-primary-color, #3b82f6)18 0%, var(--chat-primary-color, #3b82f6)10 100%)`,
                                color: 'var(--chat-primary-color, #3b82f6)'
                              }}
                            >
                              Page {source.page_number}
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
                        {isMultimedia ? 'View timestamp' : 'View & highlight'}
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