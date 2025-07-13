import React, { useState, useEffect, useRef, useCallback, ChangeEvent, KeyboardEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { XIcon, Disc3, FileText, ChevronsDown, Play, Download, ChevronLeftIcon, ChevronRightIcon, ZoomInIcon, ZoomOutIcon, Highlighter } from "lucide-react";
import { useEbookContext } from '../../lib/context/ebook-context';
import { usePdfUrl } from '../../lib/hooks/usePdfUrl';
import { useParams } from 'next/navigation';
import { LibraryPopover } from './LibraryPopover';
import { LibraryFile } from '../../lib/hooks/useLibraryData';
import { useContentSources } from '../../lib/hooks/useContentSources'; // Keep for now to get total count
import { ContentSource } from '../../lib/db/content_queries';
import MediaPlayer from './MediaPlayer';
import { useChatTheme } from '../../../contexts/ChatbotThemeContext';
import { PdfViewer } from './pdf-viewer';
import type { CorePdfViewerPdfJsRef } from './pdf-viewer';
import { usePdfViewerStore } from './pdf-viewer/store/pdfViewerStore';

const ZOOM_LEVELS = [
  { value: '0.5', label: '50%' },
  { value: '0.75', label: '75%' },
  { value: '1.0', label: '100%' },
  { value: '1.25', label: '125%' },
  { value: '1.5', label: '150%' },
  { value: '2.0', label: '200%' },
  { value: 'auto', label: 'Zoom Auto' },
  { value: 'page-fit', label: 'Page Fit' },
  { value: 'page-width', label: 'Page Width' },
];

export default function EbookReader() {
    const { resolvedTheme } = useChatTheme();
    const { 
        currentDocument, 
        currentTimestamp,
        selectDocument, 
        navigateToTimestamp,
        closeEbookPanel, 
        isLoading: isLoadingEbook, 
        setIsLoadingEbook 
    } = useEbookContext();
    
    const params = useParams();
    const chatbotSlug = params.chatbotId as string;
    const [isHeaderVisible, setIsHeaderVisible] = useState(false);
    const headerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pdfViewerRef = useRef<CorePdfViewerPdfJsRef | null>(null);
    
    // PDF Store state for controls
    const currentPage = usePdfViewerStore(state => state.currentPage);
    const numPages = usePdfViewerStore(state => state.numPages);
    const zoomScale = usePdfViewerStore(state => state.zoomScale);
    const setZoomScale = usePdfViewerStore(state => state.setZoomScale);
    const scrollToPage = usePdfViewerStore(state => state.scrollToPage);
    const _setPdfViewerRef = usePdfViewerStore(state => state._setPdfViewerRef);
    const annotationsVisible = usePdfViewerStore(state => state.annotationsVisible);
    const toggleAnnotationsVisibility = usePdfViewerStore(state => state.toggleAnnotationsVisibility);
    
    // Local state for page input
    const [pageInput, setPageInput] = useState<string>(currentPage.toString());
    
    // We still fetch content sources here just to know if there are any documents at all.
    // The LibraryPopover will handle fetching the full structured list.
    const { 
        data: contentSources = [], 
        isLoading: isLoadingDocuments, 
        error: documentsError 
    } = useContentSources(chatbotSlug);

    const { 
        data: pdfUrl, 
        isLoading: isLoadingPdfUrl, 
        error: pdfUrlError 
    } = usePdfUrl(chatbotSlug, currentDocument?.id || null);

    // Helper function to detect multimedia content
    const isMultimediaContent = (document: ContentSource | null): boolean => {
        if (!document || !document.file_name) return false;
        const fileName = document.file_name.toLowerCase();
        return fileName.match(/\.(mp4|webm|ogg|mov|avi|mp3|wav|m4a|aac)$/) !== null;
    };

    // Current document is multimedia
    const isCurrentDocumentMultimedia = isMultimediaContent(currentDocument);
    
    // Update page input when currentPage changes
    useEffect(() => {
        setPageInput(currentPage.toString());
    }, [currentPage]);

    // PDF Navigation handlers
    const handleNextPage = useCallback(() => {
        const { currentPage, numPages } = usePdfViewerStore.getState(); 
        if (currentPage < numPages) {
            scrollToPage(currentPage + 1);
        }
    }, [scrollToPage]);

    const handlePrevPage = useCallback(() => {
        const { currentPage } = usePdfViewerStore.getState();
        if (currentPage > 1) {
            scrollToPage(currentPage - 1);
        }
    }, [scrollToPage]);

    const handlePageInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setPageInput(e.target.value);
    };

    const handlePageInputSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const pageNum = parseInt(pageInput, 10);
            if (!isNaN(pageNum) && pageNum > 0 && pageNum <= numPages) {
                scrollToPage(pageNum);
            } else {
                setPageInput(currentPage.toString());
            }
        }
    };

    const handleDocumentSelection = (file: LibraryFile) => {
        // Cast the file to ContentSource to satisfy the context's type requirement.
        // This is safe because our useLibraryData hook ensures all properties are present.
        selectDocument(file as unknown as ContentSource);
    };

    const handleMouseEnterHeader = () => {
        if (headerTimeoutRef.current) {
            clearTimeout(headerTimeoutRef.current);
        }
        setIsHeaderVisible(true);
    };
        
    const handleMouseLeaveHeader = () => {
        headerTimeoutRef.current = setTimeout(() => {
            setIsHeaderVisible(false);
        }, 300); // 300ms delay before hiding
    };

    useEffect(() => {
        if (pdfUrl) {
            setIsLoadingEbook(false);
        }
        if (pdfUrlError) {
            console.error('[EbookReader] PDF URL error:', pdfUrlError);
            setIsLoadingEbook(false);
        }
    }, [pdfUrl, pdfUrlError, setIsLoadingEbook]);

    const handleIframeLoad = () => {
        setIsLoadingEbook(false);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (headerTimeoutRef.current) {
                clearTimeout(headerTimeoutRef.current);
            }
        };
    }, []);

    const handleDownload = async () => {
        if (!currentDocument) return;
        
        try {
            // First, get the signed URL from the API (same as PDF viewer)
            const apiUrl = `/api/content-sources/${chatbotSlug}/${currentDocument.id}/view`;
            const apiResponse = await fetch(apiUrl);
            
            if (!apiResponse.ok) {
                throw new Error(`Failed to get download URL: ${apiResponse.status} ${apiResponse.statusText}`);
            }
            
            const result = await apiResponse.json();
            
            if (!result.success || !result.url) {
                throw new Error('Invalid response from server');
            }
            
            // Now download the file from the signed URL
            const fileResponse = await fetch(result.url);
            
            if (!fileResponse.ok) {
                throw new Error(`Failed to download file: ${fileResponse.status} ${fileResponse.statusText}`);
            }
            
            // Get the file as a blob
            const blob = await fileResponse.blob();
            
            // Create download URL and trigger download
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = result.fileName || currentDocument.file_name || 'document';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the blob URL
            window.URL.revokeObjectURL(blobUrl);
            
            console.log(`[EbookReader] Successfully downloaded: ${result.fileName || currentDocument.file_name}`);
        } catch (error) {
            console.error('[EbookReader] Download failed:', error);
            alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Register PDF viewer ref with store
    useEffect(() => {
        _setPdfViewerRef(pdfViewerRef);
        return () => _setPdfViewerRef(null);
    }, [_setPdfViewerRef]);

    if (isLoadingDocuments) {
        return (
            <div 
                className="flex flex-col h-full items-center justify-center"
                style={{ 
                    backgroundColor: 'var(--chat-chat-window-background-color, rgb(249, 250, 251))',
                    color: 'var(--chat-sidebar-text-color, rgb(75, 85, 99))'
                }}
            >
                <Disc3 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p>Loading Library...</p>
            </div>
        );
    }

    if (documentsError) {
        return (
            <div 
                className="flex flex-col h-full items-center justify-center p-4 text-center"
                style={{ 
                    backgroundColor: 'var(--chat-chat-window-background-color, rgb(249, 250, 251))',
                    color: 'var(--chat-sidebar-text-color, rgb(75, 85, 99))'
                }}
            >
                <p className="text-red-500 mb-2">Failed to load library</p>
                <p className="text-sm opacity-70">Please try again later.</p>
            </div>
        );
    }

    return (
        <div 
            className="flex flex-col h-full relative overflow-hidden"
            style={{ 
                backgroundColor: 'var(--chat-chat-window-background-color, rgb(249, 250, 251))',
                color: 'var(--chat-sidebar-text-color, rgb(75, 85, 99))'
            }}
        >
            {/* Header Trigger Zone - Invisible area at the top, only active when header is hidden */}
            {!isHeaderVisible && (
                <div 
                    className="absolute top-0 left-0 right-0 h-12 z-20"
                    onMouseEnter={handleMouseEnterHeader}
                />
            )}

            {/* Header */}
            <div 
                className={`absolute top-0 left-0 right-0 z-30 transition-transform duration-300 ease-in-out ${
                    isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
                }`}
                onMouseEnter={handleMouseEnterHeader}
                onMouseLeave={handleMouseLeaveHeader}
            >
                <div 
                    className="flex items-center justify-between px-4 py-2 gap-4 backdrop-blur-sm shadow-sm"
                    style={{ 
                        backgroundColor: 'var(--chat-sidebar-background-color, rgba(255, 255, 255, 0.95))',
                        borderColor: 'var(--chat-suggested-question-chip-border-color, rgb(229, 231, 235))',
                        color: 'var(--chat-sidebar-text-color, rgb(75, 85, 99))'
                    }}
                >
                    {/* Left: Document Selector Popover */}
                    <div className="flex-1 min-w-0">
                        <LibraryPopover 
                            onFileSelect={handleDocumentSelection} 
                            currentDocumentId={currentDocument?.id || null}
                        />
                    </div>

                    {/* Center: Controls based on content type */}
                    {currentDocument && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {isCurrentDocumentMultimedia ? (
                                // Multimedia timestamp display
                                <div 
                                    className="flex items-center gap-2 text-xs font-medium"
                                    style={{ color: 'var(--chat-sidebar-text-color, rgb(107, 114, 128))' }}
                                >
                                    <Play className="h-3 w-3" />
                                    <span>
                                        {currentTimestamp ? `${Math.floor(currentTimestamp / 60)}:${(currentTimestamp % 60).toFixed(0).padStart(2, '0')}` : 'Media'}
                                    </span>
                                </div>
                            ) : pdfUrl ? (
                                // PDF navigation and zoom controls
                                <div className="flex items-center gap-2">
                                    {/* Page Navigation */}
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handlePrevPage}
                                            disabled={currentPage <= 1}
                                            className="h-7 w-7 p-0"
                                            aria-label="Previous Page"
                                        >
                                            <ChevronLeftIcon className="h-4 w-4" />
                                        </Button>
                                        <div className="flex items-center">
                                            <Input
                                                type="text"
                                                value={pageInput}
                                                onChange={handlePageInputChange}
                                                onKeyDown={handlePageInputSubmit}
                                                className="w-8 text-center h-7 text-xs"
                                                aria-label="Current Page"
                                            />
                                            <span className="mx-1 text-xs">/ {numPages > 0 ? numPages : '-'}</span>
                </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleNextPage}
                                            disabled={currentPage >= numPages || numPages === 0}
                                            className="h-7 w-7 p-0"
                                            aria-label="Next Page"
                                        >
                                            <ChevronRightIcon className="h-4 w-4" />
                                        </Button>
            </div>

                                    {/* Zoom Controls */}
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const currentZoom = usePdfViewerStore.getState().zoomScale;
                                                const newZoom = Math.max(0.25, currentZoom - 0.25);
                                                setZoomScale(newZoom);
                                            }}
                                            className="h-7 w-7 p-0"
                                            aria-label="Zoom Out"
                                        >
                                            <ZoomOutIcon className="h-4 w-4" />
                                        </Button>
                            <Select
                                            value={zoomScale.toString()}
                                            onValueChange={(value) => {
                                                const numValue = parseFloat(value);
                                                if (!isNaN(numValue)) {
                                                    setZoomScale(numValue);
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="w-16 h-7 text-xs" aria-label="Select Zoom Level">
                                                <SelectValue placeholder="Zoom">
                                                    {zoomScale > 0 ? `${Math.round(zoomScale * 100)}%` : "Zoom"}
                                                </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                                {ZOOM_LEVELS.map(level => (
                                                    <SelectItem key={level.value} value={level.value}>
                                                        {level.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                            onClick={() => {
                                                const currentZoom = usePdfViewerStore.getState().zoomScale;
                                                const newZoom = Math.min(3.0, currentZoom + 0.25);
                                                setZoomScale(newZoom);
                                            }}
                                            className="h-7 w-7 p-0"
                                            aria-label="Zoom In"
                                        >
                                            <ZoomInIcon className="h-4 w-4" />
                                </Button>
                                    </div>
                                    
                                    {/* Annotation Toggle */}
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={toggleAnnotationsVisibility}
                                            className={`h-7 w-7 p-0 ${annotationsVisible ? 'bg-yellow-100 text-yellow-700' : ''}`}
                                            aria-label={annotationsVisible ? "Hide Annotations" : "Show Annotations"}
                                            title={annotationsVisible ? "Hide Annotations" : "Show Annotations"}
                                        >
                                            <Highlighter className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    
                                    {/* TODO: Search controls will be added here later */}
                                    {/* <div className="flex items-center gap-1">
                                        <SearchIcon className="h-4 w-4" />
                                        <Input placeholder="Search..." className="w-24 h-7 text-xs" />
                                    </div> */}
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Right: Download and Close Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Download Button */}
                        {currentDocument && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                onClick={handleDownload} 
                                className="h-8 w-8 p-0 bg-blue-50 hover:bg-blue-100" 
                                aria-label={`Download ${currentDocument.file_name}`}
                                title={`Download ${currentDocument.file_name}`}
                                style={{
                                    backgroundColor: 'var(--chat-primary-color, #3b82f6)' + '10',
                                    color: 'var(--chat-primary-color, #3b82f6)'
                                }}
                            >
                                <Download className="h-4 w-4" />
                                </Button>
                        )}
                        
                        {/* Close Button */}
                        <Button variant="ghost" size="sm" onClick={closeEbookPanel} className="h-8 w-8 p-0" aria-label="Close document viewer">
                            <XIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Header Hint - Shows when header is hidden */}
            {!isHeaderVisible && (
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
                    <div className="bg-black/20 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
                        <ChevronsDown className="h-3 w-3" />
                        <span>Hover to show controls</span>
                    </div>
                </div>
            )}

            {/* Content Viewer Area */}
            <div className="flex-grow relative">
                {currentDocument ? (
                    <div className="w-full h-full">
                        {isCurrentDocumentMultimedia ? (
                            // Multimedia Player
                            <div className="w-full h-full p-4 overflow-auto">
                                <MediaPlayer 
                                    document={currentDocument}
                                    timestamp={currentTimestamp}
                                    onTimeUpdate={(time) => {
                                        // Optional: Update context with current playback time
                                        // navigateToTimestamp(time);
                                    }}
                                />
                            </div>
                        ) : (
                            // PDF Viewer for documents
                            <>
                                {isLoadingEbook || isLoadingPdfUrl ? (
                                    <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center">
                                            <Disc3 className="h-8 w-8 animate-spin text-primary" />
                                            <p 
                                                className="mt-2"
                                                style={{ color: 'var(--chat-sidebar-text-color, rgb(107, 114, 128))' }}
                                            >
                                                Loading Document...
                                            </p>
                                </div>
                            </div>
                        ) : pdfUrlError ? (
                                    <div className="w-full h-full flex items-center justify-center p-4 text-center">
                                        <div>
                                            <p className="text-red-500 mb-2">Failed to load document</p>
                                            <p 
                                                className="text-sm"
                                                style={{ color: 'var(--chat-sidebar-text-color, rgb(107, 114, 128))' }}
                                            >
                                                Please try selecting the document again.
                                    </p>
                                </div>
                            </div>
                        ) : pdfUrl ? (
                                    <div className="w-full h-full  flex flex-col">
                                        <div className="flex-1 min-h-0 overflow-hidden">
                                            <PdfViewer 
                                                ref={pdfViewerRef}
                                                fileUrl={pdfUrl}
                                                onDocumentLoadSuccess={() => {
                                                    setIsLoadingEbook(false);
                                                }}
                                                onDocumentLoadError={(error) => {
                                                    console.error('[EbookReader] PDF load error:', error);
                                                    setIsLoadingEbook(false);
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center p-4 text-center">
                                        <p style={{ color: 'var(--chat-sidebar-text-color, rgb(107, 114, 128))' }}>
                                            Could not generate a view for this document.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ color: 'var(--chat-sidebar-text-color, rgb(107, 114, 128))' }}
                    >
                        {contentSources.length > 0 ? (
                            <div className="text-center">
                                <FileText 
                                    className="h-12 w-12 mx-auto mb-3"
                                    style={{ color: 'var(--chat-sidebar-text-color, rgb(209, 213, 219))', opacity: 0.5 }}
                                />
                                <p>Select a document to view its content.</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <FileText 
                                    className="h-12 w-12 mx-auto mb-3"
                                    style={{ color: 'var(--chat-sidebar-text-color, rgb(209, 213, 219))', opacity: 0.5 }}
                                />
                                <p>No documents in this chatbot's library.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}