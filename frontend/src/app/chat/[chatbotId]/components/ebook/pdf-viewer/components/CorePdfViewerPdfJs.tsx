"use client";

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';

// Guard against SSR - only import PDF.js on the client side
let pdfjsLib: typeof import('pdfjs-dist') | null = null;
if (typeof window !== 'undefined') {
  try {
    pdfjsLib = require('pdfjs-dist');
    // Configure the worker source only on client side
    if (pdfjsLib?.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }
  } catch (error) {
    console.error('Failed to load PDF.js:', error);
  }
}

// Assuming all types are in one place
import PageContent from './PageContent'; // <-- Import PageContent
import { Loader2 } from 'lucide-react';
import { usePdfViewerStore } from '../store/pdfViewerStore'; // <-- Import from store
import { Annotation as AnnotationLayerAnnotation } from './AnnotationLayer';

export interface CorePdfViewerPdfJsProps {
  fileUrl: string;
  // zoomScale?: number; // Managed by store
  overscanCount?: number;
  // searchText?: string; // Managed by store
  // searchOptions?: SearchOptions; // Managed by store
  // initialAnnotations?: Annotation[];
  // programmaticHighlights?: ProgrammaticHighlight[];
  // activeTool?: ActiveTool;
  // annotationUserColor?: string;
  annotations?: AnnotationLayerAnnotation[];
  onDocumentLoadSuccess?: (document: { numPages: number, pdfDocument: any }) => void;
  onDocumentLoadError?: (error: Error) => void;
  onVisiblePageChange?: (page: number) => void;
  // onZoomChange?: (zoom: number) => void;
  // onAnnotationCreate?: (annotation: Annotation) => void;
  onAnnotationClick?: (annotation: AnnotationLayerAnnotation) => void;
  onAnnotationHover?: (annotation: AnnotationLayerAnnotation | null) => void;
  // onTextSelect?: (text: string, boundingBox: BoundingBox) => void;
}

export interface CorePdfViewerPdfJsRef {
  scrollToPage: (pageNumber: number) => void;
  scrollToHighlight: (highlightId: string) => void;
  // TODO: Add more methods as needed
  // searchText: (query: string, options?: SearchOptions) => void;
  // zoomIn: () => void;
  // zoomOut: () => void;
  // setZoom: (scale: number) => void;
  // addAnnotation: (annotation: Annotation) => void;
  // removeAnnotation: (annotationId: string) => void;
}

const CorePdfViewerPdfJsInternal = forwardRef<CorePdfViewerPdfJsRef, CorePdfViewerPdfJsProps>(
  (props, ref) => {
    // Early return for SSR
    if (!pdfjsLib) {
      useImperativeHandle(ref, () => ({
        scrollToPage: () => {},
        scrollToHighlight: () => {},
      }), []);

      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2">Loading PDF Viewer...</p>
          </div>
        </div>
      );
    }

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

    const [pdfDocument, setPdfDocument] = useState<any | null>(null);
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

    // Load PDF Document
    useEffect(() => {
      if (!fileUrl || !pdfjsLib) {
        return;
      }

      let isCancelled = false;

      const loadDocument = async () => {
        setIsLoading(true);
        setError(null);
        setLoadingProgress('Loading PDF...');

        try {
          const loadingTask = pdfjsLib!.getDocument(fileUrl);
          
          loadingTask.onProgress = (progressData: any) => {
            if (progressData.total > 0) {
              const percent = Math.round((progressData.loaded / progressData.total) * 100);
              setLoadingProgress(`Loading PDF... ${percent}%`);
            }
          };
          
          const pdf = await loadingTask.promise;

          if (isCancelled) {
            pdf.destroy();
            return;
          }

          setPdfDocument(pdf);
          setNumPages(pdf.numPages);
          onDocumentLoadSuccess?.({
            numPages: pdf.numPages,
            pdfDocument: pdf
          });

          // Preload page dimensions for layout calculation
          const dimensions: { width: number; height: number; }[] = [];
          for (let pageNum = 1; pageNum <= Math.min(5, pdf.numPages); pageNum++) {
            try {
              const page = await pdf.getPage(pageNum);
              const viewport = page.getViewport({ scale: 1.0 });
              dimensions[pageNum - 1] = {
                width: viewport.width,
                height: viewport.height,
              };
              page.cleanup();
            } catch (pageError) {
              console.warn(`Failed to get dimensions for page ${pageNum}:`, pageError);
              dimensions[pageNum - 1] = { width: 612, height: 792 }; // Default letter size
            }
          }

          // For remaining pages, use the first page's dimensions as estimate
          if (pdf.numPages > 5 && dimensions.length > 0) {
            const firstPageDimensions = dimensions[0];
            for (let i = 5; i < pdf.numPages; i++) {
              dimensions[i] = firstPageDimensions;
            }
          }

          setPageDimensions(dimensions);
          setIsLoading(false);
          setLoadingProgress('');
          
        } catch (loadError: any) {
          if (!isCancelled) {
            console.error('Error loading PDF:', loadError);
            setError(loadError);
            setIsLoading(false);
          setLoadingProgress('');
            onDocumentLoadError?.(loadError);
          }
        }
      };

      loadDocument();

      return () => {
        isCancelled = true;
        if (pdfDocument) {
          pdfDocument.destroy();
        }
      };
    }, [fileUrl, onDocumentLoadSuccess, onDocumentLoadError]);

    // Reset page refs when document changes
    // useEffect(() => {
    //   pagePlaceholderRefs.current = Array(numPages).fill(null);
    // }, [numPages]);

    // --- Intersection Observer for Page Visibility Detection ---
    useEffect(() => {
      if (numPages === 0 || pageDimensions.length === 0) {
        return;
      }

      const currentPlaceholderDOMRefs = pagePlaceholderRefs.current.filter(Boolean);
      if (currentPlaceholderDOMRefs.length === 0) {
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          let newVisiblePage = currentVisiblePage;
          let maxIntersectionRatio = 0;

          entries.forEach((entry) => {
          if (entry.isIntersecting) {
              const pageNumber = parseInt(entry.target.getAttribute('data-page-number') || '1', 10);
              if (entry.intersectionRatio > maxIntersectionRatio) {
                maxIntersectionRatio = entry.intersectionRatio;
                newVisiblePage = pageNumber;
            }
          }
        });

          if (newVisiblePage !== currentVisiblePage) {
            setCurrentVisiblePage(newVisiblePage);
            onVisiblePageChangeProp?.(newVisiblePage);
            }
        },
        {
          root: viewerContainerRef.current,
          threshold: [0.1, 0.25, 0.5, 0.75, 1.0], // Multiple thresholds for better detection
          rootMargin: '-10px 0px -10px 0px', // Slight negative margin to avoid edge cases
        }
      );

      currentPlaceholderDOMRefs.forEach(placeholder => {
        if (placeholder) {
          observer.observe(placeholder);
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
    }, [numPages, pageDimensions.length, onVisiblePageChangeProp, currentVisiblePage]);

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
        if (pageIndex >= 0 && pageIndex < numPages && pagePlaceholderRefs.current[pageIndex] && viewerContainerRef.current) {
          const pageElement = pagePlaceholderRefs.current[pageIndex];
          const container = viewerContainerRef.current;
          
          if (pageElement && container) {
            // Get the offset of the page element relative to the container
            const pageOffsetTop = pageElement.offsetTop;
            
            // Scroll the container to show the page
            container.scrollTo({
              top: pageOffsetTop - 20, // Small offset for padding
              behavior: 'smooth'
            });
            
            // Update the current visible page immediately for faster feedback
            setCurrentVisiblePage(pageNumber);
          }
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

    // --- Search functionality ---
    const currentMatch = useMemo(() => {
      if (searchResults.length === 0 || currentSearchResultIndex === -1) {
        return null;
      }
      return searchResults[currentSearchResultIndex] || null;
    }, [searchResults, currentSearchResultIndex]);

    const activeMatchId = currentMatch ? `search-match-${currentMatch.pageIndex + 1}-${currentMatch.matchIndexOnPage}` : undefined;

    // --- Loading and Error States ---
    if (isLoading) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2">{loadingProgress}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
          <p className="text-red-500 mb-2">Failed to load PDF</p>
          <p className="text-sm text-gray-600">{error.message}</p>
        </div>
      );
    }

    if (!pdfDocument || numPages === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <p>No document loaded</p>
        </div>
      );
    }

    // --- Main PDF Viewer Render ---
    return (
      <div 
        ref={viewerContainerRef} 
        className="w-full h-full overflow-auto relative pdf-viewer-container"
        style={{
          backgroundColor: '#f5f5f5',
          padding: '20px',
        }}
      >
        {/* Main content container */}
        <div className="flex flex-col items-center space-y-4">
        {Array.from({ length: numPages }, (_, i) => {
          const pageNumber = i + 1;
            const isPageActive = activeRenderSet.current.has(pageNumber);
            const pageDimension = pageDimensions[i] || { width: 612, height: 792 };
            const actualWidth = pageDimension.width * storeZoomScale;
            const actualHeight = pageDimension.height * storeZoomScale;

          return (
            <div
                key={pageNumber}
                ref={(el) => {
                  pagePlaceholderRefs.current[i] = el;
                }}
              data-page-number={pageNumber}
                className="relative border shadow-md bg-white page-placeholder"
              style={{
                  width: `${Math.floor(actualWidth)}px`,
                  height: `${Math.floor(actualHeight)}px`,
                  minHeight: `${Math.floor(actualHeight)}px`, // Ensure consistent height even when content loads
                }}
              >
                {/* Page number indicator */}
                <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded z-10">
                  Page {pageNumber}
                </div>
              
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
      </div>
    );
  }
);

CorePdfViewerPdfJsInternal.displayName = 'CorePdfViewerPdfJsInternal';

const CorePdfViewerPdfJs = React.memo(CorePdfViewerPdfJsInternal);
CorePdfViewerPdfJs.displayName = 'CorePdfViewerPdfJs (Memoized)';

export default CorePdfViewerPdfJs; 