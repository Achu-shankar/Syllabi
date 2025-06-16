// Export the main PDF viewer components
export { default as CorePdfViewerPdfJs } from './components/CorePdfViewerPdfJs';
export type { CorePdfViewerPdfJsRef, CorePdfViewerPdfJsProps } from './components/CorePdfViewerPdfJs';

export { default as PdfToolbar } from './components/PdfToolbar';

export { default as PageContent } from './components/PageContent';

export { default as PdfViewer } from './components/PdfViewer';

// Export the store
export { usePdfViewerStore } from './store/pdfViewerStore';
export type { SearchOptions, SearchMatch } from './store/pdfViewerStore';

// Export all types
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