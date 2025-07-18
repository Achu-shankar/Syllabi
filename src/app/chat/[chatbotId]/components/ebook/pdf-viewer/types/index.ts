export type AnnotationType  = 'TEXT_HIGHLIGHT'| 'AREA_HIGHLIGHT' | 'STICKY_NOTE';

export type ActiveTool = 'SELECTION' | AnnotationType

export interface PdfPoint {
    x:number;
    y:number;
}

export interface BoundingBox{
    x1:number;
    y1:number;
    x2:number;
    y2:number;
    width?: number;
    height?:number;
    pageIndex:number;
}

// Base interface for all stored annotations
export interface BaseAnnotation {
  id: string; // UUID from the database
  type: AnnotationType;
  color: string; // e.g., hex code or predefined color name like 'yellow'
  userId: string; // Identifier for the user who created the annotation
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  // comments?: Comment[]; // Future: for discussion threads on annotations
}

// Specific type for Text Highlights
export interface TextHighlightAnnotation extends BaseAnnotation {
  type: 'TEXT_HIGHLIGHT';
  boundingBoxes: BoundingBox[]; // Array of bounding boxes, as text highlights can span multiple lines/rects
  selectedText: string; // The actual highlighted text content
}

// Specific type for Area Highlights (e.g., image snippets)
export interface AreaHighlightAnnotation extends BaseAnnotation {
  type: 'AREA_HIGHLIGHT';
  boundingBox: BoundingBox; // Single bounding box for the selected area
  snippetImageBase64?: string; // Base64 encoded image of the snippet (stored in DB for now)
}

// Specific type for Sticky Notes
export interface StickyNoteAnnotation extends BaseAnnotation {
  type: 'STICKY_NOTE';
  position: PdfPoint; // The (x,y) point on the page where the note is anchored
  noteContent: string; // The text content of the sticky note
}

// Union type for any kind of stored annotation
export type Annotation =
  | TextHighlightAnnotation
  | AreaHighlightAnnotation
  | StickyNoteAnnotation;

// Interface for programmatic highlights (e.g., from RAG citations)
// These are for display only and might not be stored in the same way as user annotations.
export interface ProgrammaticHighlight {
  id?: string; // Optional ID for React keys or specific interaction
  pageIndex: number; // 0-indexed page number
  boundingBoxes: BoundingBox[]; // Using BoundingBox[] to be flexible, can be a single BoundingBox by convention.
  color?: string; // Optional color, can default in the viewer
  dataAttributes?: Record<string, string>; // For attaching arbitrary data, e.g., citation_id
}

// Interface for rich text notes associated with a PDF document
export interface RichNote {
  id: string; // UUID
  fileId: string; // Foreign key linking to the specific file/document
  userId: string; // Identifier for the user who created the note
  contentJson: string; // JSON string output from a rich text editor like TipTap
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Search options for the PDF viewer
export interface SearchOptions {
  highlightAll?: boolean;
  matchCase?: boolean;
  wholeWord?: boolean;
  findPrevious?: boolean; // This could drive the direction of search execution
}