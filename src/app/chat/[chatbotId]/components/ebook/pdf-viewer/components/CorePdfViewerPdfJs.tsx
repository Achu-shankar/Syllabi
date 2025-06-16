"use client";

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// If using a specific worker, import it like this, otherwise pdf.mjs should handle it.
// import * as PdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

import { Annotation, ProgrammaticHighlight, ActiveTool, SearchOptions as ViewerSearchOptions, BoundingBox, PdfPoint } from '../types/'; // Assuming all types are in one place
import PageContent from './PageContent'; // <-- Import PageContent
import { Loader2 } from 'lucide-react';
import { usePdfViewerStore, SearchMatch, SearchOptions } from '../store/pdfViewerStore'; // <-- Import from store
import { Annotation as AnnotationLayerAnnotation } from './AnnotationLayer';

// Configure the worker source
if (typeof window !== 'undefined') {
    // In Next.js, the worker file should be in the /public directory
    // and the path should be relative to the public directory e.g. /pdf.worker.min.js
    // Make sure to copy `node_modules/pdfjs-dist/build/pdf.worker.min.js` to your `public` folder.
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}


export interface CorePdfViewerPdfJsProps {
  fileUrl: string | null;
  
  zoomScale?: number; // This is now primarily controlled by the store
  searchText?: string; // Removed, will come from store
  searchOptions?: SearchOptions; // Removed, will come from store
  initialAnnotations?: Annotation[];
  programmaticHighlights?: ProgrammaticHighlight[];
  activeTool?: ActiveTool;
  annotationUserColor?: string;
  overscanCount?: number; // <-- Add overscanCount prop
  annotations?: AnnotationLayerAnnotation[]; // Add annotations prop

  onDocumentLoadSuccess?: (document: { numPages: number, pdfDocument: pdfjsLib.PDFDocumentProxy }) => void;
  onDocumentLoadError?: (error: Error) => void;
  onVisiblePageChange?: (pageNumber: number) => void; // Page number is 1-indexed
  onZoomChange?: (scale: number) => void; // Placeholder, zoom controlled externally for now
  
  // Annotation callbacks (placeholders for now)
  onAnnotationCreate?: (annotationData: Omit<Annotation, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onAnnotationClick?: (annotation: AnnotationLayerAnnotation) => void;
  onAnnotationHover?: (annotation: AnnotationLayerAnnotation | null) => void;
  onTextSelect?: (text: string, selectionRects: { pageIndex: number, rects: BoundingBox[] }[]) => void;
}

export interface CorePdfViewerPdfJsRef {
  scrollToPage: (pageNumber: number) => void;
  scrollToHighlight: (highlightId: string) => void;
  // setZoom: (scale: number | 'auto' | 'page-actual' | 'page-width' | 'page-fit') => void; // TODO
  // zoomIn: (factor?: number) => void; // TODO
  // zoomOut: (factor?: number) => void; // TODO
  // executeSearch: (query: string, options: SearchOptions) => void; // TODO
}

const CorePdfViewerPdfJsInternal = forwardRef<CorePdfViewerPdfJsRef, CorePdfViewerPdfJsProps>(
  (props, ref) => {
    const {
      fileUrl,
      // zoomScale = 1.0, // Comes from store, direct prop can be a default or removed
      overscanCount = 3, 
      // searchText = '', // From store
      // searchOptions = {}, // From store
      // initialAnnotations = [],
      // programmaticHighlights = [],
      // activeTool = 'SELECTION',
      // annotationUserColor = 'yellow',
      annotations = [],
      onDocumentLoadSuccess,
      onDocumentLoadError,
      onVisiblePageChange: onVisiblePageChangeProp, // Rename to avoid conflict
      // onZoomChange,
      // onAnnotationCreate,
      onAnnotationClick,
      onAnnotationHover,
      // onTextSelect,
      // overscanCount = 3, // Default overscan // -- Remove duplicate from here
    } = props;

    const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number; }[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingProgress, setLoadingProgress] = useState<string>('');
    const [error, setError] = useState<Error | null>(null);
    const [currentVisiblePage, setCurrentVisiblePage] = useState<number>(1);
    const activeRenderSet = useRef<Set<number>>(new Set()); // Use ref for activeRenderSet to avoid it in IO dep array
    const [activeRenderSetTrigger, setActiveRenderSetTrigger] = useState(0); // To trigger re-renders when activeRenderSet changes

    // Zustand store integration for search and zoom
    const storeZoomScale = usePdfViewerStore(state => state.zoomScale);
    const searchText = usePdfViewerStore(state => state.searchText);
    const searchOptions = usePdfViewerStore(state => state.searchOptions);
    const searchResults = usePdfViewerStore(state => state.searchResults);
    const currentSearchResultIndex = usePdfViewerStore(state => state.currentSearchResultIndex);
    const _setSearchResults = usePdfViewerStore(state => state._setSearchResults);
    const _setSearchStatus = usePdfViewerStore(state => state._setSearchStatus);
    const _onPageRendered = usePdfViewerStore(state => state._onPageRendered);
    const annotationsVisible = usePdfViewerStore(state => state.annotationsVisible);

    const viewerContainerRef = useRef<HTMLDivElement>(null);
    const pagePlaceholderRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Stable callbacks for PageContent
    const handlePageRenderSuccess = useCallback((pageNumber: number, zoom: number) => {
      console.log(`Page ${pageNumber} rendered successfully with zoom ${zoom}`);
      // Notify store that page has been rendered for navigation coordination
      _onPageRendered(pageNumber);
    }, [_onPageRendered]);

    const handlePageRenderError = useCallback((pageNumber: number, zoom: number, error: Error) => {
      console.error(`Error rendering page ${pageNumber} at zoom ${zoom}`, error);
    }, []);

    // Effect to reset state if fileUrl changes (including pagePlaceholderRefs)
    useEffect(() => {
      // console.log('[FileUrl Effect] fileUrl changed:', fileUrl);
      if (!fileUrl) {
        setPdfDocument(null);
        setNumPages(0);
        setPageDimensions([]);
        pagePlaceholderRefs.current = []; // Reset placeholder refs
        setCurrentVisiblePage(1); 
        activeRenderSet.current.clear();
        setActiveRenderSetTrigger(prev => prev + 1);
        setIsLoading(false); 
        setError(null);
        return;
      }
      // For a new fileUrl, reset key states before loading new document
      // This ensures the IntersectionObserver re-evaluates correctly with new page count
      // and refs from the new document, not stale ones.
      setNumPages(0); 
      setPageDimensions([]);
      pagePlaceholderRefs.current = [];
      setCurrentVisiblePage(1);
      activeRenderSet.current.clear();
      setActiveRenderSetTrigger(prev => prev + 1);
      // setIsLoading and setError will be handled by loadDocument
    }, [fileUrl]);

    // --- Document Loading Effect ---
    useEffect(() => {
      if (!fileUrl) {
        // State is reset by the fileUrl effect if fileUrl becomes null
        return;
      }
      // If fileUrl is present, proceed to load. Component state (numPages etc.) 
      // should have been reset by the fileUrl effect if it was a *change* of file.
      // ... (rest of loadDocument logic, ensure it doesn't prematurely set numPages to 0 here if already reset)
      const loadDocument = async () => {
        setIsLoading(true);
        setError(null);
        setLoadingProgress('Downloading PDF...');
        try {
          const loadingTask = pdfjsLib.getDocument(fileUrl);
          
          // Add progress listener
          loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
            if (progress.total > 0) {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              setLoadingProgress(`Downloading PDF... ${percent}%`);
            }
          };
          
          const doc = await loadingTask.promise;
          setLoadingProgress('Processing document...');
          
          setPdfDocument(doc);
          setNumPages(doc.numPages);

          setLoadingProgress(`Loading page dimensions... (${doc.numPages} pages)`);
          const dimensions = [];
          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 1.0 }); // Natural scale
            dimensions.push({ width: viewport.width, height: viewport.height });
            
            // Update progress for page dimension loading
            if (i % 5 === 0 || i === doc.numPages) {
              setLoadingProgress(`Loading page dimensions... (${i}/${doc.numPages})`);
            }
          }
          setPageDimensions(dimensions);
          setLoadingProgress('');
          
          if (onDocumentLoadSuccess) {
            onDocumentLoadSuccess({ numPages: doc.numPages, pdfDocument: doc });
          }
        } catch (e: any) {
          console.error("Failed to load PDF document:", e);
          setError(e);
          setLoadingProgress('');
          if (onDocumentLoadError) {
            onDocumentLoadError(e);
          }
        } finally {
          setIsLoading(false);
        }
      };

      loadDocument();

      // Cleanup: Destroy document object if component unmounts or fileUrl changes
      return () => {
        // pdfDocument?.destroy(); // Consider implications carefully
      };
    }, [fileUrl, onDocumentLoadSuccess, onDocumentLoadError]);

    // --- Search Logic Effect ---
    useEffect(() => {
      if (!searchText || !pdfDocument || numPages === 0) {
        if (searchText === '') _setSearchResults([]); // Clear results if search text is empty
        return;
      }

      const performSearch = async () => {
        _setSearchStatus('PENDING');
        const allMatches: SearchMatch[] = [];
        let overallMatchCount = 0;

        try {
          for (let i = 0; i < numPages; i++) {
            const pageNumber = i + 1;
            const page = await pdfDocument.getPage(pageNumber);
            const textContent = await page.getTextContent();
            let matchesOnPage = 0;

            // Simple text search logic (can be enhanced with regex for whole word, etc.)
            // Consider diacritics normalization if searchOptions.matchDiacritics is true
            const pageText = textContent.items.map(item => (item as any).str).join('');
            const query = searchOptions.caseSensitive ? searchText : searchText.toLowerCase();
            const sourceText = searchOptions.caseSensitive ? pageText : pageText.toLowerCase();
            
            // More robust search using textContent.items to get individual item positions later if needed
            // For now, a simpler approach to find occurrences:
            textContent.items.forEach(itemObj => {
              const item = itemObj as any;
              let itemText = item.str;
              let sourceItemText = searchOptions.caseSensitive ? itemText : itemText.toLowerCase();
              const queryToUse = searchOptions.caseSensitive ? searchText : searchText.toLowerCase();

              if (searchOptions.wholeWord) {
                // Basic whole word search using regex for this item's text
                const regex = new RegExp(`\\b${queryToUse.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'g' + (searchOptions.caseSensitive ? '' : 'i'));
                let match;
                while ((match = regex.exec(itemText)) !== null) {
                  allMatches.push({
                    pageIndex: i,
                    matchIndexOnPage: matchesOnPage++,
                    id: `page-${i}-match-${matchesOnPage -1}`,
                  });
                  overallMatchCount++;
                }
              } else {
                // Simple substring search within this item
                let startIndex = 0;
                while ((startIndex = sourceItemText.indexOf(queryToUse, startIndex)) !== -1) {
                  allMatches.push({
                    pageIndex: i,
                    matchIndexOnPage: matchesOnPage++,
                    id: `page-${i}-match-${matchesOnPage - 1}`,
                  });
                  overallMatchCount++;
                  startIndex += queryToUse.length; // Move past the current match
                }
              }
            });
          }
          _setSearchResults(allMatches);
        } catch (e) {
          console.error("Error during PDF search:", e);
          _setSearchStatus('ERROR');
        }
      };

      performSearch();
    }, [searchText, searchOptions, pdfDocument, numPages, _setSearchResults, _setSearchStatus]);

    // --- Intersection Observer for Visible Page Tracking ---
    const currentVisiblePageRef = useRef(currentVisiblePage);
    useEffect(() => {
      currentVisiblePageRef.current = currentVisiblePage;
    }, [currentVisiblePage]);

    useEffect(() => {
      const effectTimestamp = Date.now();

      const scrollContainer = viewerContainerRef.current;
      
      if (!scrollContainer) {
        return;
      }
      if (numPages === 0) {
        return;
      }
      if (pagePlaceholderRefs.current.length !== numPages) {
        return;
      }

      const observerOptions = {
        root: scrollContainer,
        rootMargin: '0px',
        threshold: 0.5,
      };

      const observerCallback: IntersectionObserverCallback = (entries) => {
        let newMostVisiblePage = -1;
        let maxRatio = -1;

        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const pageNumStr = (entry.target as HTMLElement).dataset.pageNumber;
            if (pageNumStr) {
              const pageNum = parseInt(pageNumStr, 10);
              if (entry.intersectionRatio > maxRatio) {
                maxRatio = entry.intersectionRatio;
                newMostVisiblePage = pageNum;
              }
            }
          }
        });

        if (newMostVisiblePage !== -1 && newMostVisiblePage !== currentVisiblePageRef.current) {
            setCurrentVisiblePage(newMostVisiblePage);
            if (onVisiblePageChangeProp) {
              onVisiblePageChangeProp(newMostVisiblePage);
            }
        }
      };

      const observer = new IntersectionObserver(observerCallback, observerOptions);

      const currentPlaceholderDOMRefs = pagePlaceholderRefs.current;
      currentPlaceholderDOMRefs.forEach((p, index) => {
        if (p) {
          observer.observe(p);
        }
      });

      return () => {
        currentPlaceholderDOMRefs.forEach(p => {
          if (p) {
            observer.unobserve(p);
          }
        });
        observer.disconnect();
      };
    }, [numPages, pageDimensions.length, onVisiblePageChangeProp]);

    // --- Update Active Render Set based on Visible Page and Overscan ---
    useEffect(() => {
      if (numPages === 0) {
        activeRenderSet.current.clear();
        setActiveRenderSetTrigger(prev => prev + 1);
        return;
      }

      const newSet = new Set<number>();
      const startPage = Math.max(1, currentVisiblePage - overscanCount);
      const endPage = Math.min(numPages, currentVisiblePage + overscanCount);

      for (let i = startPage; i <= endPage; i++) {
        newSet.add(i);
      }
      activeRenderSet.current = newSet;
      setActiveRenderSetTrigger(prev => prev + 1);
    }, [currentVisiblePage, numPages, overscanCount]);

    // --- Imperative Handle for Parent Interaction ---
    useImperativeHandle(ref, () => ({
      scrollToPage: (pageNumber: number) => {
        // Adjust pageNumber to be 0-indexed for pagePlaceholderRefs.current access
        const pageIndex = pageNumber - 1;
        if (pageIndex >= 0 && pageIndex < numPages && pagePlaceholderRefs.current[pageIndex]) {
          pagePlaceholderRefs.current[pageIndex]?.scrollIntoView({
            behavior: 'smooth', 
            block: 'start',    
          });
          // setCurrentPage(pageNumber); // Update store if IO doesn't catch it fast enough or for immediate feedback
        } else {
          console.warn(`CorePdfViewerPdfJs: Attempted to scroll to invalid page ${pageNumber} or refs not ready.`);
        }
      },
      scrollToHighlight: (highlightId: string) => {
        const element = document.getElementById(highlightId);
        element?.scrollIntoView({
          behavior: 'smooth',
          block: 'center', // Or 'nearest'
          inline: 'nearest'
        });
      }
      // TODO: Implement other ref methods (zoom, search)
    }), [numPages]); 

    // Effect to scroll to the active search result when it changes
    useEffect(() => {
      if (currentSearchResultIndex !== -1 && searchResults.length > 0) {
        const activeMatch = searchResults[currentSearchResultIndex];
        if (activeMatch) {
          // Scroll to the page of the active match if it's not already visible
          // (or rely on IntersectionObserver to eventually make it visible and renderable)
          // For immediate jump, we can call scrollToPage
          const targetPageForScroll = activeMatch.pageIndex + 1;
          if (targetPageForScroll !== currentVisiblePage) {
            // Check if page is in activeRenderSet before trying to scroll to highlight
            // This ensures the page (and thus the highlight element) might exist
            if (activeRenderSet.current.has(targetPageForScroll)) {
                 // If page is already rendered or in overscan, try to scroll to highlight directly
                 // This might still race if PageContent hasn't finished its own render cycle
                document.getElementById(activeMatch.id)?.scrollIntoView({
                    behavior: 'auto', // 'smooth' can be too slow if page also needs to scroll
                    block: 'center',
                    inline: 'nearest'
                });
            } else {
                // If page is not rendered, scroll to the page first.
                // The highlight scroll might need to happen in a subsequent effect or after PageContent renders it.
                pagePlaceholderRefs.current[activeMatch.pageIndex]?.scrollIntoView({
                    behavior: 'auto',
                    block: 'start'
                });
            }
          } else {
             // Page is already visible, attempt to scroll to highlight
            document.getElementById(activeMatch.id)?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
          }
          // Consider calling setCurrentPage from store here if direct navigation is desired
          // onVisiblePageChangeProp(activeMatch.pageIndex + 1); // This might fight with IO
        }
      }
    }, [currentSearchResultIndex, searchResults, currentVisiblePage]); // activeRenderSet not added to avoid too many runs

    // --- Render Logic ---
    if (isLoading) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">
              {loadingProgress || 'Parsing PDF document...'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">This may take a moment for large files</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center p-4">
            <div className="text-red-500 mb-2">
              <svg className="h-8 w-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-red-600 mb-1">Failed to load PDF</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
          </div>
        </div>
      );
    }

    if (!pdfDocument || numPages === 0 || pageDimensions.length === 0) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center">
            <div className="text-muted-foreground mb-2">
              <svg className="h-8 w-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">No PDF content available</p>
          </div>
        </div>
      );
    }

    return (
      <div 
        ref={viewerContainerRef} 
        className="absolute inset-0 overflow-auto"
      >
        {Array.from({ length: numPages }, (_, i) => {
          const pageNumber = i + 1;
          const dimensions = pageDimensions[i];
          if (!dimensions) return null;

          const pageWidth = dimensions.width * storeZoomScale;
          const pageHeight = dimensions.height * storeZoomScale;
          
          const isPageActive = pdfDocument && activeRenderSet.current.has(pageNumber);
          const activeMatchId = (currentSearchResultIndex !== -1 && searchResults[currentSearchResultIndex]?.pageIndex === i) 
                                ? searchResults[currentSearchResultIndex].id 
                                : undefined;

          return (
            <div
              key={`page-placeholder-${pageNumber}`}
              ref={el => { pagePlaceholderRefs.current[i] = el; }}
              data-page-number={pageNumber}
              className={`mx-auto my-2.5 border border-border relative overflow-hidden ${
                isPageActive ? 'bg-white' : 'bg-gray-100' 
              }`}
              style={{
                width: `${pageWidth}px`,
                height: `${pageHeight}px`,
              }}
            >
              {/* Show placeholder text only if page content is not active */}
              {!isPageActive && (
                <div className="text-center pt-5">
                  <div className="flex justify-center items-center h-full">
                    <span className="text-gray-400 text-sm">Page {pageNumber}</span>
                  </div>
                </div>
              )}
              
              {/* Conditionally render PageContent */}
              {isPageActive && (
                <PageContent
                  pdfDocument={pdfDocument} 
                  pageNumber={pageNumber}
                  zoomScale={storeZoomScale}
                  onRenderSuccess={handlePageRenderSuccess} 
                  onRenderError={handlePageRenderError}     
                  searchText={searchText}
                  searchOptions={searchOptions}
                  activeMatchId={activeMatchId}
                  annotations={annotationsVisible ? annotations : []}
                  onAnnotationClick={onAnnotationClick}
                  onAnnotationHover={onAnnotationHover}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

CorePdfViewerPdfJsInternal.displayName = 'CorePdfViewerPdfJsInternal';

const CorePdfViewerPdfJs = React.memo(CorePdfViewerPdfJsInternal);
CorePdfViewerPdfJs.displayName = 'CorePdfViewerPdfJs (Memoized)';

export default CorePdfViewerPdfJs; 