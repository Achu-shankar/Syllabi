"use client";

import React, { useRef, useEffect } from 'react';

// Guard against SSR - only import PDF.js on the client side
let pdfjsLib: typeof import('pdfjs-dist') | null = null;
if (typeof window !== 'undefined') {
  try {
    pdfjsLib = require('pdfjs-dist');
  } catch (error) {
    console.error('Failed to load PDF.js in AnnotationLayer:', error);
  }
}

// Types for annotation data
export interface AnnotationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotationQuadPoints {
  quadPoints: number[]; // Array of 8 numbers representing 4 points (x1,y1,x2,y2,x3,y3,x4,y4)
}

export interface BaseAnnotation {
  id: string;
  pageNumber: number;
  type: 'highlight' | 'note' | 'underline' | 'strikethrough';
  color?: string;
  opacity?: number;
  content?: string; // For notes
}

export interface RectAnnotation extends BaseAnnotation {
  rect: AnnotationRect;
}

export interface QuadPointAnnotation extends BaseAnnotation {
  quadPoints: number[];
}

export type Annotation = RectAnnotation | QuadPointAnnotation;

interface AnnotationLayerProps {
  pdfDocument: any; // Using any since we're handling SSR dynamically
  pageNumber: number;
  zoomScale: number;
  annotations: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
  onAnnotationHover?: (annotation: Annotation | null) => void;
}

const AnnotationLayerInternal: React.FC<AnnotationLayerProps> = ({
  pdfDocument,
  pageNumber,
  zoomScale,
  annotations,
  onAnnotationClick,
  onAnnotationHover,
}) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const pageProxyRef = useRef<any | null>(null);

  // Filter annotations for current page
  const pageAnnotations = annotations.filter(ann => ann.pageNumber === pageNumber);

  // Early return for SSR
  if (!pdfjsLib) {
    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* Empty annotation layer for SSR */}
      </div>
    );
  }

  useEffect(() => {
    if (!pdfDocument || !layerRef.current || !pdfjsLib) {
      return;
    }

    let isCancelled = false;

    const renderAnnotations = async () => {
      try {
        const page = await pdfDocument.getPage(pageNumber);
        pageProxyRef.current = page;
        
        if (isCancelled) {
          page.cleanup();
          return;
        }

        const viewport = page.getViewport({ scale: zoomScale });
        const container = layerRef.current;
        
        if (!container) {
          page.cleanup();
          return;
        }

        // Clear existing annotations
        container.innerHTML = '';

        // Set container dimensions
        container.style.width = `${Math.floor(viewport.width)}px`;
        container.style.height = `${Math.floor(viewport.height)}px`;

        // Render each annotation
        pageAnnotations.forEach((annotation) => {
          const annotationElement = createAnnotationElement(annotation, viewport, zoomScale);
          if (annotationElement) {
            container.appendChild(annotationElement);
          }
        });

      } catch (error) {
        console.error(`Error rendering annotations for page ${pageNumber}:`, error);
      }
    };

    renderAnnotations();

    return () => {
      isCancelled = true;
      if (pageProxyRef.current) {
        pageProxyRef.current.cleanup();
        pageProxyRef.current = null;
      }
    };
  }, [pdfDocument, pageNumber, zoomScale, pageAnnotations]);

  const createAnnotationElement = (
    annotation: Annotation,
    viewport: any,
    scale: number
  ): HTMLElement | null => {
    const element = document.createElement('div');
    element.className = `pdf-annotation pdf-annotation-${annotation.type}`;
    element.dataset.annotationId = annotation.id;

    // Set base styles
    element.style.position = 'absolute';
    element.style.pointerEvents = 'auto';
    element.style.cursor = 'pointer';
    element.style.zIndex = '2';

    // Set annotation-specific styles
    const color = annotation.color || getDefaultColor(annotation.type);
    const opacity = annotation.opacity || getDefaultOpacity(annotation.type);

    switch (annotation.type) {
      case 'highlight':
        element.style.backgroundColor = color;
        element.style.opacity = opacity.toString();
        element.style.borderRadius = '2px';
        break;
      case 'underline':
        element.style.borderBottom = `2px solid ${color}`;
        element.style.opacity = opacity.toString();
        break;
      case 'strikethrough':
        element.style.borderTop = `1px solid ${color}`;
        element.style.opacity = opacity.toString();
        element.style.top = '50%';
        element.style.transform = 'translateY(-50%)';
        break;
      case 'note':
        element.style.backgroundColor = color;
        element.style.opacity = opacity.toString();
        element.style.border = '2px solid #ff6b35';
        element.style.borderRadius = '4px';
        // Add note icon
        element.innerHTML = '<span style="font-size: 12px; color: #fff;">📝</span>';
        break;
    }

    // Position the annotation based on coordinate type
    if ('rect' in annotation) {
      // Rectangle-based annotation
      positionRectAnnotation(element, annotation.rect, viewport, scale);
    } else if ('quadPoints' in annotation) {
      // Quad points-based annotation
      positionQuadPointAnnotation(element, annotation.quadPoints, viewport, scale);
    }

    // Add event listeners
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      onAnnotationClick?.(annotation);
    });

    element.addEventListener('mouseenter', () => {
      onAnnotationHover?.(annotation);
    });

    element.addEventListener('mouseleave', () => {
      onAnnotationHover?.(null);
    });

    // Add tooltip for notes
    if (annotation.type === 'note' && annotation.content) {
      element.title = annotation.content;
    }

    return element;
  };

  const positionRectAnnotation = (
    element: HTMLElement,
    rect: AnnotationRect,
    viewport: any,
    scale: number
  ) => {
    // Convert PDF coordinates to viewport coordinates
    const [x1, y1] = viewport.convertToViewportPoint(rect.x, rect.y);
    const [x2, y2] = viewport.convertToViewportPoint(rect.x + rect.width, rect.y + rect.height);

    // Set position and size
    element.style.left = `${Math.min(x1, x2)}px`;
    element.style.top = `${Math.min(y1, y2)}px`;
    element.style.width = `${Math.abs(x2 - x1)}px`;
    element.style.height = `${Math.abs(y2 - y1)}px`;
  };

  const positionQuadPointAnnotation = (
    element: HTMLElement,
    quadPoints: number[],
    viewport: any,
    scale: number
  ) => {
    if (quadPoints.length !== 8) {
      console.warn('Invalid quadPoints array, expected 8 values');
      return;
    }

    // QuadPoints represent 4 corners: [x1,y1, x2,y2, x3,y3, x4,y4]
    // Convert all points to viewport coordinates
    const points: [number, number][] = [];
    for (let i = 0; i < quadPoints.length; i += 2) {
      const [x, y] = viewport.convertToViewportPoint(quadPoints[i], quadPoints[i + 1]);
      points.push([x, y]);
    }

    // Find bounding box
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // For complex shapes, we'll use a bounding box for now
    // TODO: Could implement actual polygon rendering using SVG or canvas
    element.style.left = `${minX}px`;
    element.style.top = `${minY}px`;
    element.style.width = `${maxX - minX}px`;
    element.style.height = `${maxY - minY}px`;

    // Optional: Add data attribute with actual quad points for advanced rendering
    element.dataset.quadPoints = quadPoints.join(',');
  };

  const getDefaultColor = (type: Annotation['type']): string => {
    switch (type) {
      case 'highlight':
        return 'rgba(255, 235, 59, 0.6)'; // Yellow
      case 'underline':
        return '#2196F3'; // Blue
      case 'strikethrough':
        return '#F44336'; // Red
      case 'note':
        return 'rgba(255, 107, 53, 0.8)'; // Orange
      default:
        return 'rgba(255, 235, 59, 0.6)';
    }
  };

  const getDefaultOpacity = (type: Annotation['type']): number => {
    switch (type) {
      case 'highlight':
        return 0.3;
      case 'underline':
      case 'strikethrough':
        return 0.8;
      case 'note':
        return 0.9;
      default:
        return 0.5;
    }
  };

  return (
    <div
      ref={layerRef}
      className="absolute inset-0 pointer-events-none annotation-layer"
      style={{
        zIndex: 2,
      }}
    />
  );
};

const AnnotationLayer = React.memo(AnnotationLayerInternal);
AnnotationLayer.displayName = 'AnnotationLayer';

export default AnnotationLayer; 