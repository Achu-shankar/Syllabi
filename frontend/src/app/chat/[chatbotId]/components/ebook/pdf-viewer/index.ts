// Export types only - these don't cause runtime evaluation
export type { CorePdfViewerPdfJsRef, CorePdfViewerPdfJsProps } from './components/CorePdfViewerPdfJs';

// Export the store and types (safe for SSR)
export { usePdfViewerStore } from './store/pdfViewerStore';
export type { SearchOptions, SearchMatch } from './store/pdfViewerStore';

// Export all types (safe for SSR)
export type {
  AnnotationType,
  ActiveTool,
  PdfPoint,
  BoundingBox,
  BaseAnnotation,
  TextHighlightAnnotation,
  AreaHighlightAnnotation,
  StickyNoteAnnotation,
  Annotation,
  ProgrammaticHighlight,
  RichNote,
  SearchOptions as CoreSearchOptions
} from './types';

// Dynamic exports for components that use PDF.js to prevent SSR evaluation
export const CorePdfViewerPdfJs = typeof window !== 'undefined' 
  ? require('./components/CorePdfViewerPdfJs').default 
  : null;

export const PdfToolbar = typeof window !== 'undefined' 
  ? require('./components/PdfToolbar').default 
  : null;

export const PageContent = typeof window !== 'undefined' 
  ? require('./components/PageContent').default 
  : null;

// PdfViewer already handles dynamic loading correctly, so we can export it directly
export { default as PdfViewer } from './components/PdfViewer'; 