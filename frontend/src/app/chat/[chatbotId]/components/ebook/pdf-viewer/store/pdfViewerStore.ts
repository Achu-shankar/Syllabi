import { create } from 'zustand';
import { ProgrammaticHighlight, ActiveTool, SearchOptions as CoreSearchOptions } from '../types';
import { Annotation as AnnotationLayerAnnotation } from '../components/AnnotationLayer';
import type { CorePdfViewerPdfJsRef } from '../components/CorePdfViewerPdfJs';

// Define SearchOptions locally by extending CoreSearchOptions or creating a new one
export interface SearchOptions extends CoreSearchOptions {
  // matchCase is already in CoreSearchOptions from the user's provided file, let's assume it's caseSensitive
  caseSensitive?: boolean; // User wants this name
  wholeWord?: boolean; // Already there
  matchDiacritics?: boolean; // New option
  // findPrevious is removed as per plan
  // highlightAll is already there
}

export interface SearchMatch {
  pageIndex: number; // 0-indexed (corresponds to PDF page number - 1)
  matchIndexOnPage: number; // 0-indexed, the Nth match on this specific page
  id: string; // Unique ID, e.g., `page-${pageIndex}-match-${matchIndexOnPage}`
  // Potentially add boundingBox if needed later for precise scrolling within a page
  // boundingBox?: { x1: number, y1: number, x2: number, y2: number }; 
  originalStartCharOffset?: number; // Character offset in the raw concatenated text of the page
  originalMatchLength?: number; // Length of the match in the raw concatenated text
}

interface PdfViewerState {
  fileUrl: string | null;
  numPages: number;
  currentPage: number;
  zoomScale: number;
  searchText: string; // Text currently being searched for (set by executeSearch)
  searchQuery: string; // Query input by the user in the toolbar
  searchOptions: SearchOptions;
  searchResults: SearchMatch[];
  currentSearchResultIndex: number; // -1 if no match selected or no results
  searchStatus: 'IDLE' | 'PENDING' | 'NO_RESULTS' | 'RESULTS_FOUND' | 'ERROR';

  // Annotation related state - using AnnotationLayer types for compatibility
  annotations: AnnotationLayerAnnotation[];
  programmaticHighlights: ProgrammaticHighlight[];
  activeTool: ActiveTool;
  annotationUserColor: string;
  annotationsVisible: boolean; // Toggle for showing/hiding annotations

  // Navigation coordination state
  pendingNavigationPage: number | null; // Page we're trying to navigate to
  pendingAnnotations: AnnotationLayerAnnotation[]; // Annotations to apply when target page is ready

  // PDF viewer ref for imperative actions
  _pdfViewerRef: React.RefObject<CorePdfViewerPdfJsRef | null> | null;

  // Actions
  setFileUrl: (url: string | null) => void;
  setNumPages: (numPages: number) => void;
  setCurrentPage: (page: number) => void;
  setZoomScale: (scale: number) => void;
  setSearchText: (text: string) => void; // This might be deprecated or re-purposed
  setSearchQuery: (query: string) => void;
  setSearchOptions: (options: Partial<SearchOptions>) => void;
  resetSearch: () => void;

  // New search actions
  executeSearch: () => void; // Takes query from state.searchQuery
  navigateToNextMatch: () => void;
  navigateToPrevMatch: () => void;
  clearSearch: () => void; // Clears query, text, results, status

  // Internal actions for CorePdfViewer to update store
  _setSearchResults: (results: SearchMatch[]) => void;
  _setSearchStatus: (status: PdfViewerState['searchStatus']) => void;
  _setCurrentSearchResultIndex: (index: number) => void; // For direct setting if needed

  // Annotation actions - using AnnotationLayer types
  setAnnotations: (annotations: AnnotationLayerAnnotation[]) => void;
  addAnnotation: (annotation: AnnotationLayerAnnotation) => void;
  updateAnnotation: (annotation: AnnotationLayerAnnotation) => void;
  deleteAnnotation: (annotationId: string) => void;
  setProgrammaticHighlights: (highlights: ProgrammaticHighlight[]) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setAnnotationUserColor: (color: string) => void;
  toggleAnnotationsVisibility: () => void; // Toggle annotation visibility

  // Navigation coordination actions
  navigateToPageWithAnnotations: (page: number, annotations: AnnotationLayerAnnotation[]) => void;
  scrollToPage: (page: number) => void; // Exposed method to scroll to page
  _setPdfViewerRef: (ref: React.RefObject<CorePdfViewerPdfJsRef | null> | null) => void;
  _onPageRendered: (page: number) => void; // Called by PDF viewer when a page is rendered
  clearPendingNavigation: () => void;
}

export const usePdfViewerStore = create<PdfViewerState>()((set, get) => ({
  fileUrl: null,
  numPages: 0,
  currentPage: 1,
  zoomScale: 1.0,
  searchText: '', // Term actively being searched
  searchQuery: '', // Content of the search input box
  searchOptions: {
    highlightAll: true,
    caseSensitive: false, // Renamed from matchCase
    wholeWord: false,
    matchDiacritics: false, // New
  },
  searchResults: [],
  currentSearchResultIndex: -1,
  searchStatus: 'IDLE',

  // Initial annotation state
  annotations: [],
  programmaticHighlights: [],
  activeTool: 'SELECTION',
  annotationUserColor: '#FFD700', // Default gold
  annotationsVisible: true,

  // Navigation coordination state
  pendingNavigationPage: null,
  pendingAnnotations: [],

  // PDF viewer ref for imperative actions
  _pdfViewerRef: null,

  setFileUrl: (url) => set({ 
    fileUrl: url, 
    numPages: 0, 
    currentPage: 1, 
    searchText: '', 
    searchQuery: '', 
    searchResults: [],
    currentSearchResultIndex: -1,
    searchStatus: 'IDLE',
    annotations: [], // Reset annotations when file changes
    programmaticHighlights: [] // Reset highlights when file changes
  }),
  setNumPages: (numPages) => set({ numPages }),
  setCurrentPage: (page) => {
    const { numPages } = get();
    if (page > 0 && page <= numPages) {
      set({ currentPage: page });
    }
  },
  setZoomScale: (scale) => set({ zoomScale: scale }),
  setSearchText: (text) => set({ searchText: text }), // Consider if this is still needed or if executeSearch handles it
  setSearchQuery: (query) => set({ searchQuery: query, searchStatus: query ? get().searchStatus : 'IDLE' }), // If query cleared, reset status
  setSearchOptions: (options) => set((state) => {
    const newOptions = { ...state.searchOptions, ...options };
    // If searchText is active, changing options should trigger a new search
    if (state.searchText) {
      return { 
        searchOptions: newOptions,
        searchStatus: 'PENDING', // Set to PENDING to indicate a new search will run
        searchResults: [],
        currentSearchResultIndex: -1,
      };
    }
    return { searchOptions: newOptions };
  }),
  resetSearch: () => set({ 
    searchText: '', 
    searchQuery: '', 
    searchResults: [], 
    currentSearchResultIndex: -1, 
    searchStatus: 'IDLE' 
  }),

  // New search actions
  executeSearch: () => set((state) => {
    if (!state.searchQuery.trim()) {
      return { // Clear results if search query is empty/whitespace
        searchText: '',
        searchResults: [],
        currentSearchResultIndex: -1,
        searchStatus: 'IDLE',
      };
    }
    return {
      searchText: state.searchQuery, // Set the active search term
      searchStatus: 'PENDING',
      searchResults: [], // Clear previous results
      currentSearchResultIndex: -1,
    };
  }),

  navigateToNextMatch: () => set((state) => {
    if (state.searchResults.length === 0) return {};
    const nextIndex = state.currentSearchResultIndex + 1;
    if (nextIndex < state.searchResults.length) {
      return { currentSearchResultIndex: nextIndex };
    }
    // Wrap around to the first result
    return { currentSearchResultIndex: 0 }; 
  }),

  navigateToPrevMatch: () => set((state) => {
    if (state.searchResults.length === 0) return {};
    const prevIndex = state.currentSearchResultIndex - 1;
    if (prevIndex >= 0) {
      return { currentSearchResultIndex: prevIndex };
    }
    // Wrap around to the last result
    return { currentSearchResultIndex: state.searchResults.length - 1 };
  }),
  
  clearSearch: () => set({
    searchQuery: '',
    searchText: '',
    searchResults: [],
    currentSearchResultIndex: -1,
    searchStatus: 'IDLE',
  }),

  _setSearchResults: (results) => set(state => ({
    searchResults: results,
    currentSearchResultIndex: results.length > 0 ? 0 : -1,
    searchStatus: results.length > 0 ? 'RESULTS_FOUND' : (state.searchText ? 'NO_RESULTS' : 'IDLE'),
  })),
  _setSearchStatus: (status) => set({ searchStatus: status }),
  _setCurrentSearchResultIndex: (index) => set((state) => {
    if (index >= -1 && index < state.searchResults.length) {
        return { currentSearchResultIndex: index };
    }
    return {};
  }),

  // Annotation actions implementation
  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) => set((state) => ({ 
    annotations: [...state.annotations, annotation] 
  })),
  updateAnnotation: (updatedAnnotation) => set((state) => ({
    annotations: state.annotations.map((ann) => 
      ann.id === updatedAnnotation.id ? updatedAnnotation : ann
    ),
  })),
  deleteAnnotation: (annotationId) => set((state) => ({
    annotations: state.annotations.filter((ann) => ann.id !== annotationId),
  })),
  setProgrammaticHighlights: (highlights) => set({ programmaticHighlights: highlights }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setAnnotationUserColor: (color) => set({ annotationUserColor: color }),
  toggleAnnotationsVisibility: () => set((state) => ({
    annotationsVisible: !state.annotationsVisible,
  })),

  // Navigation coordination actions
  navigateToPageWithAnnotations: (page, annotations) => set((state) => {
    console.log(`[Store] Setting up navigation to page ${page} with ${annotations.length} annotations`);
    return {
      currentPage: page, // Set current page immediately for UI feedback
      pendingNavigationPage: page,
      pendingAnnotations: annotations,
      annotations: annotations, // Apply annotations immediately - they'll be filtered by page in the viewer
    };
  }),
  scrollToPage: (page) => set((state) => {
    if (state._pdfViewerRef) {
      const pdfViewer = state._pdfViewerRef.current;
      if (pdfViewer) {
        pdfViewer.scrollToPage(page);
      }
    }
    return { currentPage: page }; // Update current page and return state update
  }),
  _setPdfViewerRef: (ref) => set({ _pdfViewerRef: ref }),
  _onPageRendered: (page) => set((state) => {
    // If this is the page we were waiting for, apply pending annotations
    if (state.pendingNavigationPage === page && state.pendingAnnotations.length > 0) {
      console.log(`[Store] Page ${page} rendered, applying ${state.pendingAnnotations.length} pending annotations`);
      return {
        annotations: state.pendingAnnotations,
        pendingNavigationPage: null,
        pendingAnnotations: [],
      };
    }
    return {};
  }),
  clearPendingNavigation: () => set({
    pendingNavigationPage: null,
    pendingAnnotations: [],
  }),
}));

// Example of how to use in a component:
// const { currentPage, setCurrentPage, numPages } = usePdfViewerStore(); 