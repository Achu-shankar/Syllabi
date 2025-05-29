'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { MaximizeIcon, MinimizeIcon, ZoomInIcon, ZoomOutIcon, XIcon } from 'lucide-react'; // Assuming you have lucide-react

interface MermaidDisplayProps {
  mermaidCode: string;
  idSuffix?: string; // Optional suffix to ensure unique IDs if multiple diagrams are on a page
}

const DEBOUNCE_DELAY = 1200; // milliseconds - Increased delay

let diagramCount = 0;
const generateUniqueId = (prefix: string, suffix?: string) => `${prefix}-${diagramCount++}${suffix ? '-' + suffix : ''}`;

export const MermaidDisplay: React.FC<MermaidDisplayProps> = ({ mermaidCode, idSuffix }) => {
  const mermaidContentRef = useRef<HTMLDivElement>(null); // Ref for the INNER div for normal view
  const fullscreenMermaidContentRef = useRef<HTMLDivElement>(null); // Ref for the INNER div for fullscreen view
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uniqueContentId, setUniqueContentId] = useState('');
  const [uniqueFullscreenContentId, setUniqueFullscreenContentId] = useState('');
  const [actualSvgLength, setActualSvgLength] = useState(0);

  const [debouncedMermaidCode, setDebouncedMermaidCode] = useState("");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fullscreen and Zoom state
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // Initial base zoom level
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    try {
      mermaid.initialize({
        startOnLoad: false,
        logLevel: 'debug', 
        theme: 'base',
      });
    } catch (e) {}
  }, []);
  
  useEffect(() => {
    setUniqueContentId(generateUniqueId('mermaid-content', idSuffix));
    setUniqueFullscreenContentId(generateUniqueId('mermaid-fullscreen-content', idSuffix));
  }, [idSuffix]);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedMermaidCode(mermaidCode);
    }, DEBOUNCE_DELAY);
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [mermaidCode]);

  const renderMermaidToDiv = useCallback(async (targetRef: React.RefObject<HTMLDivElement>, svgId: string, code: string) => {
    if (!targetRef.current || !code.trim() || !svgId) {
      return { success: false, svgLen: 0 };
    }
    
    const currentDiv = targetRef.current;
    currentDiv.innerHTML = '';

    const lines = code.split('\n');
    let tempProcessedCode = lines.length > 0 
      ? lines[0] + '\n' + lines.slice(1).filter(line => line.trim() !== '').join('\n')
      : code;
    const finalCode = tempProcessedCode.replace(/\[([^\]]+)\]/g, (match, innerContent) => {
      const sanitizedInnerContent = innerContent.replace(/[()]/g, ' ');
      return `[${sanitizedInnerContent}]`;
    });

    try {
      const { svg, bindFunctions } = await mermaid.render(svgId, finalCode);
      if (currentDiv) {
        currentDiv.innerHTML = svg;
        if (bindFunctions) bindFunctions(currentDiv);
      }
      return { success: true, svgLen: svg?.length || 0 };
    } catch (renderError: any) {
      console.error(`[MermaidDisplay] Failed to render Mermaid diagram (ID: ${svgId}):`, renderError);
      if (currentDiv) currentDiv.innerHTML = ''; // Clear on error
      return { success: false, svgLen: 0, errorMsg: renderError.message || 'Unknown error' };
    }
  }, []);

  // Effect for normal view rendering
  useEffect(() => {
    const renderNormalView = async () => {
      if (!mermaidContentRef.current || !debouncedMermaidCode.trim() || !uniqueContentId) {
        setIsLoading(false); setActualSvgLength(0); return;
      }
      setIsLoading(true); setError(null);
      const result = await renderMermaidToDiv(mermaidContentRef as React.RefObject<HTMLDivElement>, uniqueContentId + '-svg', debouncedMermaidCode);
      setActualSvgLength(result.svgLen);
      if (!result.success) {
        // Not setting error state to hide it, as per previous request for normal view
      }
      setIsLoading(false);
    };
    if (!isFullScreen) { // Only render normal view if not in fullscreen
        renderNormalView();
    }
  }, [debouncedMermaidCode, uniqueContentId, renderMermaidToDiv, isFullScreen]);

  // Effect for fullscreen view rendering
  useEffect(() => {
    const renderFullscreenView = async () => {
      if (isFullScreen && fullscreenMermaidContentRef.current && debouncedMermaidCode.trim() && uniqueFullscreenContentId) {
        await renderMermaidToDiv(fullscreenMermaidContentRef as React.RefObject<HTMLDivElement>, uniqueFullscreenContentId + '-svg', debouncedMermaidCode);
      } else if (isFullScreen && !fullscreenMermaidContentRef.current) {
        console.warn("[MermaidDisplay] Fullscreen render attempted but ref is not yet available.");
      }
    };
    renderFullscreenView();
  }, [isFullScreen, debouncedMermaidCode, uniqueFullscreenContentId, renderMermaidToDiv]);

  // Handlers for fullscreen and zoom
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 9)); // Max zoom 9x
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 1)); // Min zoom 1x
  const toggleFullScreen = () => {
    setIsFullScreen(prevIsFullScreen => {
      if (prevIsFullScreen) { // Modal is currently open and will be closed
        setZoomLevel(1); // Reset zoom to base for next time or non-fullscreen context
        setPanOffset({ x: 0, y: 0 }); 
      } else { // Modal is about to be opened
        setZoomLevel(3); // Set default zoom for fullscreen to 3x
        setPanOffset({ x: 0, y: 0 }); // Ensure pan is reset when opening
      }
      return !prevIsFullScreen;
    });
  };

  // Panning handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!fullscreenMermaidContentRef.current) return;
    // Prevent default drag behavior (e.g., image dragging)
    e.preventDefault();
    panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    setIsPanning(true);
    // Add cursor style to indicate panning is active
    fullscreenMermaidContentRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !fullscreenMermaidContentRef.current) return;
    // No need to prevent default for mousemove usually, unless specific text selection issues
    setPanOffset({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handleMouseUpOrLeave = () => {
    if (!fullscreenMermaidContentRef.current) return;
    setIsPanning(false);
    fullscreenMermaidContentRef.current.style.cursor = 'grab';
  };

  // Apply grab cursor style when not panning and diagram is loaded
  useEffect(() => {
    if (fullscreenMermaidContentRef.current && isFullScreen && debouncedMermaidCode.trim()) {
      fullscreenMermaidContentRef.current.style.cursor = 'grab';
    }
  }, [isFullScreen, debouncedMermaidCode]);

  // Scroll-to-zoom handler for the fullscreen modal content area
  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent page scrolling
    if (e.deltaY < 0) {
      // Scroll up - Zoom in
      setZoomLevel(prev => Math.min(prev * 1.1, 9)); // Max zoom 9x
    } else {
      // Scroll down - Zoom out
      setZoomLevel(prev => Math.max(prev / 1.1, 1)); // Min zoom 1x
    }
    // For true cursor-centric zoom, we would also adjust panOffset here
    // based on e.clientX, e.clientY and the zoom change.
  };

  return (
    <div 
      className="mermaid-container-wrapper my-4 p-1 relative" 
      style={{ 
        backgroundColor: 'rgba(0, 255, 0, 0.05)', // Very subtle green background
        border: '1px solid #e0e0e0', // Lighter border
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div className="absolute top-1 right-1 z-10">
        {debouncedMermaidCode.trim() && (
          <button 
            onClick={toggleFullScreen} 
            className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
            title="Toggle Fullscreen"
          >
            {isFullScreen ? <MinimizeIcon size={16} /> : <MaximizeIcon size={16} />}
          </button>
        )}
      </div>

      {isLoading && <p style={{color: 'blue', fontSize: 'small', textAlign: 'center', padding: '20px'}}>Loading Diagram...</p>}
      {/* Error display is intentionally suppressed for normal view based on previous request */}
      {!isLoading && actualSvgLength === 0 && debouncedMermaidCode.trim() && 
        <p style={{color: 'orange', fontSize: 'small', textAlign: 'center', padding: '20px'}}>Rendered empty diagram. Check code.</p>}
      
      <div 
        ref={mermaidContentRef} 
        id={uniqueContentId} 
        className="mermaid-content-host flex justify-center min-h-[100px] p-2"
        style={{ display: isFullScreen ? 'none' : 'flex' }} // Hide normal view when fullscreen
      >
        {/* Mermaid will inject SVG here for normal view */}
      </div>

      {/* Fullscreen Modal */}
      {isFullScreen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave} /* Attach mouse move/up/leave to the overlay for smoother panning when cursor leaves the diagram div */ >
          <div className="bg-white dark:bg-gray-900 shadow-2xl rounded-lg w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-3 border-b dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <button onClick={handleZoomOut} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Zoom Out"><ZoomOutIcon size={20}/></button>
                <button onClick={handleZoomIn} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Zoom In"><ZoomInIcon size={20}/></button>
                <span className="text-sm text-gray-600 dark:text-gray-400">{(zoomLevel * 100).toFixed(0)}%</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Diagram Fullscreen</h3>
              <button onClick={toggleFullScreen} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Close Fullscreen"><XIcon size={20}/></button>
            </div>
            {/* Modal Content - SVG will go here */}
            <div 
              className="flex-grow p-4 overflow-auto flex items-center justify-center"
              style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
              onWheel={handleWheelZoom} // Attach wheel zoom handler here
            >
              <div 
                ref={fullscreenMermaidContentRef} 
                id={uniqueFullscreenContentId} 
                className="mermaid-fullscreen-content-host transform transition-transform duration-150 ease-in-out"
                style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`, touchAction: 'none' /* Important for touch devices if we add touch panning */ }}
                onMouseDown={handleMouseDown}
                // onMouseMove, onMouseUp, onMouseLeave are now on the overlay for better experience
              >
                {/* Fullscreen Mermaid SVG will be injected here by its useEffect */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

MermaidDisplay.displayName = 'MermaidDisplay'; 