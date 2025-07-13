"use client";

import React, { useEffect, useRef } from 'react';

// Guard against SSR - only import PDF.js on the client side
let pdfjsLib: typeof import('pdfjs-dist') | null = null;
if (typeof window !== 'undefined') {
  try {
    pdfjsLib = require('pdfjs-dist');
  } catch (error) {
    console.error('Failed to load PDF.js in PageContent:', error);
  }
}

import { SearchOptions } from '../store/pdfViewerStore'; // Import SearchOptions
import AnnotationLayer, { Annotation } from './AnnotationLayer';

interface PageContentProps {
  pdfDocument: any; // Using any since we're handling SSR dynamically
  pageNumber: number;
  zoomScale: number;
  onRenderSuccess?: (pageNumber: number, zoomScale: number) => void;
  onRenderError?: (pageNumber: number, zoomScale: number, error: Error) => void;
  searchText?: string; // Text to highlight
  searchOptions?: SearchOptions; // Options for searching
  activeMatchId?: string; // ID of the currently active search match
  annotations?: Annotation[]; // Annotation data
  onAnnotationClick?: (annotation: Annotation) => void;
  onAnnotationHover?: (annotation: Annotation | null) => void;
}

const PageContentInternal: React.FC<PageContentProps> = ({
  pdfDocument,
  pageNumber,
  zoomScale,
  onRenderSuccess,
  onRenderError,
  searchText,
  searchOptions,
  activeMatchId,
  annotations = [],
  onAnnotationClick,
  onAnnotationHover,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null); // Ref for the text layer div
  const pageContentRef = useRef<HTMLDivElement>(null); // Ref for the main content wrapper

  // Early return for SSR
  if (!pdfjsLib) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading page content...</p>
      </div>
    );
  }

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || !textLayerRef.current || !pageContentRef.current || !pdfjsLib) {
      return;
    }

    let renderTask: any = null;
    let textLayerRenderTask: any = null; // TextLayer instance
    let isCancelled = false;
    let pageProxy: any = null;

    const applyHighlights = (container: HTMLElement, textToSearch: string, options: SearchOptions, currentActiveMatchId?: string) => {
      if (!textToSearch.trim() || !options) return;

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
      let node: Node | null;
      let localMatchIdx = 0; // Counter for matches found on this page, for ID generation

      while (node = walker.nextNode()) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
          const textContent = node.textContent;
          const sourceText = options.caseSensitive ? textContent : textContent.toLowerCase();
          const query = options.caseSensitive ? textToSearch : textToSearch.toLowerCase();
          
          let startIndex = 0;
          let matchFound = false;

          // Regex for whole word if option is enabled
          const regex = options.wholeWord 
            ? new RegExp(`\\b${query.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, options.caseSensitive ? 'g' : 'gi') 
            : null;

          if (regex) {
            let match;
            let lastIndex = 0;
            const newNodes: Node[] = [];

            while ((match = regex.exec(sourceText)) !== null) {
                matchFound = true;
                // Text before match
                if (match.index > lastIndex) {
                    newNodes.push(document.createTextNode(textContent.substring(lastIndex, match.index)));
                }
                // Matched text
                const mark = document.createElement('mark');
                const matchIdOnPage = `page-${pageNumber - 1}-match-${localMatchIdx}`;
                mark.id = matchIdOnPage;
                mark.textContent = textContent.substring(match.index, regex.lastIndex);
                if (matchIdOnPage === currentActiveMatchId) {
                    mark.className = 'pdf-search-active-match';
                }
                newNodes.push(mark);
                localMatchIdx++;
                lastIndex = regex.lastIndex;
            }
            // Text after last match
            if (lastIndex < textContent.length) {
                newNodes.push(document.createTextNode(textContent.substring(lastIndex)));
            }

            if (matchFound && node.parentNode) {
                const parent = node.parentNode;
                newNodes.forEach(newNode => parent.insertBefore(newNode, node));
                parent.removeChild(node);
            }

          } else { // Simple substring search
            let lastIndex = 0;
            const newNodes: Node[] = [];
            while ((startIndex = sourceText.indexOf(query, lastIndex)) !== -1) {
              matchFound = true;
              // Text before match
              if (startIndex > lastIndex) {
                newNodes.push(document.createTextNode(textContent.substring(lastIndex, startIndex)));
              }
              // The matched text itself
              const mark = document.createElement('mark');
              const matchIdOnPage = `page-${pageNumber - 1}-match-${localMatchIdx}`;
              mark.id = matchIdOnPage;
              mark.textContent = textContent.substring(startIndex, startIndex + query.length);
              if (matchIdOnPage === currentActiveMatchId) {
                mark.className = 'pdf-search-active-match';
              }
              newNodes.push(mark);
              localMatchIdx++;
              lastIndex = startIndex + query.length;
            }
            // Remaining text after the last match
            if (lastIndex < textContent.length) {
              newNodes.push(document.createTextNode(textContent.substring(lastIndex)));
            }

            if (matchFound && node.parentNode) {
                const parent = node.parentNode;
                newNodes.forEach(newNode => parent.insertBefore(newNode, node));
                parent.removeChild(node);
            }
          }
        }
      }
    };

    const renderPage = async () => {
      try {
        pageProxy = await pdfDocument.getPage(pageNumber);
        const page = pageProxy;
        const canvas = canvasRef.current;
        const textLayerDiv = textLayerRef.current;
        const contentWrapperDiv = pageContentRef.current;

        if (!canvas || !textLayerDiv || !contentWrapperDiv || isCancelled) {
          if (page) page.cleanup();
          return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
          if (page) page.cleanup();
          throw new Error('Failed to get 2D context from canvas');
        }

        const outputScale = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: zoomScale * outputScale });
        const cssViewport = page.getViewport({ scale: zoomScale }); // For CSS sizing

        // Set canvas actual drawing dimensions (bitmap size)
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        // Set canvas display size (CSS size)
        canvas.style.width = `${Math.floor(cssViewport.width)}px`;
        canvas.style.height = `${Math.floor(cssViewport.height)}px`;

        // Set text layer dimensions and --scale-factor CSS variable
        textLayerDiv.style.width = `${Math.floor(cssViewport.width)}px`;
        textLayerDiv.style.height = `${Math.floor(cssViewport.height)}px`;
        textLayerDiv.style.setProperty('--scale-factor', cssViewport.scale.toString());

        // Set content wrapper dimensions (if needed, though page placeholder div usually handles this)
        contentWrapperDiv.style.width = `${Math.floor(cssViewport.width)}px`;
        contentWrapperDiv.style.height = `${Math.floor(cssViewport.height)}px`;

        // Render Canvas
        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });
        await renderTask.promise;

        if (isCancelled) {
          page.cleanup(); 
          return;
        }

        // Render Text Layer using modern TextLayer API
        const textContent = await page.getTextContent();
        if (isCancelled) {
          page.cleanup();
          return;
        }

        // Clear previous text layer content before rendering new one
        textLayerDiv.innerHTML = ''; 
        
        // Import TextLayer class dynamically
        const { TextLayer } = await import('pdfjs-dist');
        
        // Create TextLayer instance with proper configuration
        textLayerRenderTask = new TextLayer({
          textContentSource: textContent,
          viewport: cssViewport, // Use CSS viewport for proper scaling
          container: textLayerDiv,
        });

        // Render the text layer
        await textLayerRenderTask.render();

        // Apply search highlights if searchText is provided
        if (searchText && searchOptions) {
          setTimeout(() => {
            if (!isCancelled) {
              applyHighlights(textLayerDiv, searchText, searchOptions, activeMatchId);
            }
          }, 10); // Small delay to ensure text layer is rendered
        }

        if (!isCancelled) {
          onRenderSuccess?.(pageNumber, zoomScale);
        }
      } catch (error: any) {
        if (!isCancelled) {
          console.error(`Error rendering page ${pageNumber} content:`, error);
          onRenderError?.(pageNumber, zoomScale, error);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
      
      // Clean up TextLayer if it exists
      if (textLayerRenderTask && textLayerRenderTask.cancel) {
        try {
          textLayerRenderTask.cancel();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      
      // Clear text layer content explicitly on cleanup
      const textLayerDiv = textLayerRef.current;
      if (textLayerDiv) {
        textLayerDiv.innerHTML = '';
      }
      
      if (pageProxy) {
        pageProxy.cleanup();
      }
    };
  }, [pdfDocument, pageNumber, zoomScale, onRenderSuccess, onRenderError, searchText, searchOptions, activeMatchId]);

  // The parent div of canvas and textLayer needs to be position: relative
  // The placeholder div in CorePdfViewerPdfJs already has position: relative.
  return (
    <div 
      ref={pageContentRef}
      className="absolute top-0 left-0 w-full h-full"
    >
      <canvas ref={canvasRef} className="absolute top-0 left-0 block" />
      <div 
        ref={textLayerRef} 
        className="textLayer absolute top-0 left-0"
        style={{ 
          pointerEvents: 'auto',
          userSelect: 'text',
          zIndex: 1
        }}
      />
      {/* Annotation Layer - above text layer */}
      <AnnotationLayer
        pdfDocument={pdfDocument}
        pageNumber={pageNumber}
        zoomScale={zoomScale}
        annotations={annotations}
        onAnnotationClick={onAnnotationClick}
        onAnnotationHover={onAnnotationHover}
      />
    </div>
  );
};

const PageContent = React.memo(PageContentInternal);
PageContent.displayName = 'PageContent';

export default PageContent; 