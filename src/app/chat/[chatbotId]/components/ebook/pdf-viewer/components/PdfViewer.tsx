"use client";

import React, { useRef, useEffect, useCallback, memo, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';

import { CorePdfViewerPdfJsRef } from './CorePdfViewerPdfJs';
import { usePdfViewerStore } from '../store/pdfViewerStore';
import { Annotation } from './AnnotationLayer';
import * as pdfjsLib from 'pdfjs-dist';

const CorePdfViewerPdfJsWithNoSSR = dynamic(
  () => import('./CorePdfViewerPdfJs'),
  { ssr: false }
);

interface PdfViewerProps {
  fileUrl: string | null;
  onDocumentLoadSuccess?: (document: { numPages: number, pdfDocument: pdfjsLib.PDFDocumentProxy }) => void;
  onDocumentLoadError?: (error: Error) => void;
}

const PdfViewerComponent = forwardRef<CorePdfViewerPdfJsRef, PdfViewerProps>(({ 
  fileUrl,
  onDocumentLoadSuccess,
  onDocumentLoadError,
}, ref) => {
  const viewerRef = useRef<CorePdfViewerPdfJsRef | null>(null);

  // Get state and actions from store
  const setFileUrl = usePdfViewerStore(state => state.setFileUrl);
  const setNumPages = usePdfViewerStore(state => state.setNumPages);
  const setCurrentPage = usePdfViewerStore(state => state.setCurrentPage);
  
  // Get annotations from store instead of local state
  const annotations = usePdfViewerStore(state => state.annotations);
  const setAnnotations = usePdfViewerStore(state => state.setAnnotations);

  // Forward the ref to parent
  useImperativeHandle(ref, () => ({
    scrollToPage: (pageNumber: number) => {
      viewerRef.current?.scrollToPage(pageNumber);
    },
    scrollToHighlight: (highlightId: string) => {
      viewerRef.current?.scrollToHighlight(highlightId);
    }
  }), []);

  // Set file URL in store when it changes
  useEffect(() => {
    if (fileUrl) {
      setFileUrl(fileUrl);
    }
  }, [fileUrl, setFileUrl]);

  const handleDocumentLoadSuccess = useCallback(({
    numPages: newNumPages,
    pdfDocument,
  }: {
    numPages: number;
    pdfDocument: pdfjsLib.PDFDocumentProxy;
  }) => {
    setNumPages(newNumPages);
    setCurrentPage(1); 
    console.log('PdfViewer: Document loaded, pages:', newNumPages);
    onDocumentLoadSuccess?.({ numPages: newNumPages, pdfDocument });
  }, [setNumPages, setCurrentPage, onDocumentLoadSuccess]);

  const handleVisiblePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, [setCurrentPage]);

  // Annotation event handlers
  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    console.log('Annotation clicked:', annotation);
    // TODO: Implement annotation click behavior (e.g., show details, edit, etc.)
  }, []);

  const handleAnnotationHover = useCallback((annotation: Annotation | null) => {
    if (annotation) {
      console.log('Annotation hovered:', annotation.id);
    }
    // TODO: Implement annotation hover behavior (e.g., show tooltip, highlight, etc.)
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-muted">
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <CorePdfViewerPdfJsWithNoSSR
          ref={viewerRef}
          fileUrl={fileUrl || ''} 
          onDocumentLoadSuccess={handleDocumentLoadSuccess}
          onDocumentLoadError={onDocumentLoadError}
          onVisiblePageChange={handleVisiblePageChange}
          annotations={annotations}
          onAnnotationClick={handleAnnotationClick}
          onAnnotationHover={handleAnnotationHover}
        />
      </div>
    </div>
  );
});

// Memoize the component to prevent unnecessary re-renders
const PdfViewer = memo(PdfViewerComponent, (prevProps, nextProps) => {
  // Only re-render if fileUrl changes
  return prevProps.fileUrl === nextProps.fileUrl;
});

PdfViewer.displayName = 'PdfViewer';
PdfViewerComponent.displayName = 'PdfViewerComponent';

// Export the ref type for use in EbookReader
export type { CorePdfViewerPdfJsRef };

export default PdfViewer; 