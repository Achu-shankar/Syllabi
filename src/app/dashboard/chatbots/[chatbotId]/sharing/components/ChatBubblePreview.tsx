'use client';

import React, { useState } from 'react';
import { BubbleConfig } from '../types/chatBubble';

interface ChatBubblePreviewProps {
  config: BubbleConfig;
  embeddedUrl?: string;
}

export function ChatBubblePreview({ config, embeddedUrl }: ChatBubblePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Helper functions (same as in template generators)
  const getSizeDimensions = (size: string) => {
    switch (size) {
      case 'small': return { width: '50px', height: '50px', fontSize: '20px' };
      case 'large': return { width: '70px', height: '70px', fontSize: '28px' };
      default: return { width: '60px', height: '60px', fontSize: '24px' }; // medium
    }
  };

  const getBorderRadius = (style: string) => {
    switch (style) {
      case 'square': return '4px';
      case 'rounded': return '16px';
      default: return '50%'; // circular
    }
  };

  const getPositionStyles = (position: string) => {
    switch (position) {
      case 'bottom-left':
        return { bottom: '20px', left: '20px' };
      case 'top-right':
        return { top: '20px', right: '20px' };
      case 'top-left':
        return { top: '20px', left: '20px' };
      default: // bottom-right
        return { bottom: '20px', right: '20px' };
    }
  };

  const getPopoverPositionStyles = (position: string) => {
    const bubbleOffset = 20;
    const bubbleSize = getSizeDimensions(config.size);
    const gap = 10;
    
    // For preview, we'll position popovers more conservatively to stay visible
    switch (position) {
      case 'bottom-left':
        return { top: '50%', left: bubbleOffset + parseInt(bubbleSize.width) + gap, transform: 'translateY(-50%)' };
      case 'top-right':
        return { top: '50%', right: bubbleOffset + parseInt(bubbleSize.width) + gap, transform: 'translateY(-50%)' };
      case 'top-left':
        return { top: '50%', left: bubbleOffset + parseInt(bubbleSize.width) + gap, transform: 'translateY(-50%)' };
      default: // bottom-right
        return { top: '50%', right: bubbleOffset + parseInt(bubbleSize.width) + gap, transform: 'translateY(-50%)' };
    }
  };

  const dimensions = getSizeDimensions(config.size);
  const borderRadius = getBorderRadius(config.style);
  const positionStyles = getPositionStyles(config.position);
  const popoverPositionStyles = getPopoverPositionStyles(config.position);

  const handleBubbleClick = () => {
    setIsOpen(!isOpen);
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
  };

  const handleModalBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative w-full ${isOpen && config.displayMode === 'popover' ? 'h-80 mb-8' : 'h-64'} bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 ${isOpen && config.displayMode === 'popover' ? 'overflow-visible' : 'overflow-hidden'}`}>
      {/* Preview Background */}
      <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
        <div className="text-center">
          <div className="mb-2">🖥️</div>
          <div>Website Preview - Click bubble to test!</div>
        </div>
      </div>

      {/* Chat Bubble */}
      <div
        className="absolute transition-all duration-300 cursor-pointer group"
        style={{
          ...positionStyles,
          width: dimensions.width,
          height: dimensions.height,
          backgroundColor: config.colors.backgroundColor,
          color: config.colors.textColor,
          borderRadius: borderRadius,
          fontSize: dimensions.fontSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          userSelect: 'none',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          zIndex: 10,
        }}
        onClick={handleBubbleClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = config.colors.hoverBackgroundColor;
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = config.colors.backgroundColor;
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {config.icon}
        
        {/* Tooltip */}
        {config.showTooltip && (
          <div
            className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap"
            style={{
              [config.position.includes('right') ? 'right' : 'left']: '100%',
              [config.position.includes('right') ? 'marginRight' : 'marginLeft']: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: '#333',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              zIndex: 20,
            }}
          >
            {config.tooltip}
          </div>
        )}
      </div>

      {/* Modal/Popover Chat Interface */}
      {isOpen && (
        <>
          {config.displayMode === 'modal' ? (
            /* Full Screen Modal */
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={handleModalBackdropClick}
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 50
              }}
            >
              <div
                className="bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden relative"
                style={{
                  width: parseInt(config.modalWidth) > 300 ? config.modalWidth : '300px',
                  height: parseInt(config.modalHeight) > 200 ? config.modalHeight : '200px',
                  maxWidth: '90%',
                  maxHeight: '90%',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  className="absolute top-3 right-3 w-8 h-8 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 z-10"
                  onClick={handleCloseClick}
                >
                  ×
                </button>
                
                {/* Demo Chat Content */}
                <div className="h-full flex flex-col bg-white dark:bg-gray-900">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Chat Preview</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">This is how your chat will appear</p>
                  </div>
                  <div className="flex-1 p-4 space-y-3">
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg max-w-[80%]">
                      <p className="text-sm text-gray-800 dark:text-gray-200">👋 Hello! How can I help you today?</p>
                    </div>
                    <div className="bg-blue-500 text-white p-3 rounded-lg max-w-[80%] ml-auto">
                      <p className="text-sm">This is a preview of your chatbot!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
                         /* Popover */
             <div
               className="absolute bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
               style={{
                 ...popoverPositionStyles,
                 width: '200px',
                 height: '150px',
                 zIndex: 30,
               }}
             >
                             {/* Close Button */}
               <button
                 className="absolute top-2 right-2 w-5 h-5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs z-10"
                 onClick={handleCloseClick}
               >
                 ×
               </button>
               
               {/* Demo Chat Content */}
               <div className="h-full flex flex-col">
                 <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                   <h3 className="font-medium text-xs text-gray-900 dark:text-gray-100">Chat Preview</h3>
                 </div>
                 <div className="flex-1 p-2 space-y-1">
                   <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded text-xs">
                     <p className="text-gray-800 dark:text-gray-200">👋 Hello!</p>
                   </div>
                   <div className="bg-blue-500 text-white p-1.5 rounded text-xs ml-auto w-fit">
                     <p>Preview</p>
                   </div>
                 </div>
               </div>
            </div>
          )}
        </>
      )}

      {/* Position Indicator */}
      <div className="absolute top-2 left-2 bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 shadow-sm">
        {config.displayMode === 'modal' ? 'Modal' : 'Popover'} • {config.position}
      </div>

      {/* Size Indicator */}
      <div className="absolute top-2 right-2 bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 shadow-sm">
        Size: {config.size}
      </div>
    </div>
  );
} 