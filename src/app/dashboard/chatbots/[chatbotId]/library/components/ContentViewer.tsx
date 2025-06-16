"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Download, 
  Maximize2, 
  Minimize2, 
  Link as LinkIcon,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileImage,
  FaFileVideo,
  FaFileAudio,
  FaFileCode,
  FaFile
} from 'react-icons/fa6';
import { SiMarkdown } from 'react-icons/si';
import { ContentSource } from '../lib/queries';
import { cn } from '@/lib/utils';

interface ContentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  contentSource: ContentSource | null;
  chatbotId: string;
  allSources?: ContentSource[];
  onNavigate?: (source: ContentSource) => void;
}

interface PdfUrlResponse {
  success: boolean;
  url: string;
  fileName: string;
  contentType?: string;
  expiresAt: string;
}

interface DownloadResponse {
  success: boolean;
  downloadUrl: string;
  fileName: string;
  contentType: string;
  expiresAt: string;
}

export default function ContentViewer({ 
  isOpen, 
  onClose, 
  contentSource, 
  chatbotId,
  allSources = [],
  onNavigate 
}: ContentViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Find current index for navigation
  const currentIndex = allSources.findIndex(source => source.id === contentSource?.id);
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < allSources.length - 1;

  // Reset state when content source changes
  useEffect(() => {
    if (contentSource) {
      setError(null);
      setContentUrl(null);
      
      // Fetch content URL for all types that might need it
      // Include PDFs regardless of source_type classification
      const sourceType = contentSource.source_type?.toLowerCase();
      const isPdf = contentSource.file_name && contentSource.file_name.toLowerCase().endsWith('.pdf');
      
      if (['document', 'url', 'video', 'audio'].includes(sourceType || '') || isPdf) {
        fetchContentUrl();
      }
    }
  }, [contentSource]);

  const fetchContentUrl = async () => {
    if (!contentSource || !chatbotId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/content-sources/${chatbotId}/${contentSource.id}/view`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.url) {
        setContentUrl(data.url);
      } else {
        throw new Error('Invalid response from content API');
      }
    } catch (err) {
      console.error('[ContentViewer] Error fetching content URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigation = (direction: 'prev' | 'next') => {
    if (!onNavigate) return;
    
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < allSources.length) {
      onNavigate(allSources[newIndex]);
    }
  };

  const handleDownload = async () => {
    if (!contentSource) return;
    
    // Check if this content has a downloadable file
    if (!contentSource.storage_path) {
      alert('This file is not available for download.');
      return;
    }

    setIsDownloading(true);
    
    try {
      console.log('[ContentViewer] Starting download for:', contentSource.id);
      
      const response = await fetch(`/api/content-sources/${chatbotId}/${contentSource.id}/download`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Download failed: ${errorText}`);
      }
      
      const result: DownloadResponse = await response.json();
      
      if (!result.success || !result.downloadUrl) {
        throw new Error('Failed to get download URL');
      }

      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = result.fileName || 'download';
      link.style.display = 'none';
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('[ContentViewer] Download initiated for:', result.fileName);
      
    } catch (err: any) {
      console.error('[ContentViewer] Download error:', err);
      alert(`Download failed: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGoToUrl = () => {
    if (!contentSource) return;
    
    // Check for URL in multiple places - source_url field or metadata.original_url
    const urlToOpen = contentSource.source_url || contentSource.metadata?.original_url;
    
    if (!urlToOpen) {
      console.log('[ContentViewer] No URL found for content:', {
        id: contentSource.id,
        source_url: contentSource.source_url,
        metadata: contentSource.metadata,
        source_type: contentSource.source_type
      });
      return;
    }
    
    console.log('[ContentViewer] Opening URL:', urlToOpen);
    
    // Open URL in new tab
    window.open(urlToOpen, '_blank', 'noopener,noreferrer');
  };

  // Helper function to get the URL for this content
  const getContentUrl = (source: ContentSource | null) => {
    if (!source) return null;
    return source.source_url || source.metadata?.original_url || null;
  };

  const getContentIcon = () => {
    if (!contentSource) return <FaFile className="h-5 w-5 text-gray-600" />;
    
    switch (contentSource.source_type?.toLowerCase()) {
      case 'url':
        return <LinkIcon className="h-5 w-5 text-blue-500" />;
      case 'video':
        return <FaFileVideo className="h-5 w-5 text-purple-500" />;
      case 'audio':
        return <FaFileAudio className="h-5 w-5 text-green-500" />;
      case 'document':
        // For documents, check the file extension for specific icons
        if (contentSource.file_name) {
          const extension = contentSource.file_name.split('.').pop()?.toLowerCase();
          switch (extension) {
            case 'pdf':
              return <FaFilePdf className="h-5 w-5 text-red-500" />;
            case 'txt':
              return <FaFile className="h-5 w-5 text-blue-500" />;
            case 'md':
            case 'markdown':
              return <SiMarkdown className="h-5 w-5 text-blue-600" />;
            case 'doc':
            case 'docx':
              return <FaFileWord className="h-5 w-5 text-blue-700" />;
            case 'xls':
            case 'xlsx':
            case 'csv':
              return <FaFileExcel className="h-5 w-5 text-green-600" />;
            case 'ppt':
            case 'pptx':
              return <FaFilePowerpoint className="h-5 w-5 text-orange-500" />;
            case 'json':
            case 'xml':
            case 'yaml':
            case 'yml':
              return <FaFileCode className="h-5 w-5 text-purple-600" />;
            case 'html':
            case 'htm':
              return <FaFileCode className="h-5 w-5 text-orange-600" />;
            case 'js':
            case 'ts':
            case 'jsx':
            case 'tsx':
            case 'py':
            case 'java':
            case 'cpp':
            case 'c':
            case 'cs':
            case 'php':
            case 'rb':
            case 'go':
            case 'rs':
              return <FaFileCode className="h-5 w-5 text-green-700" />;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'bmp':
            case 'svg':
            case 'webp':
              return <FaFileImage className="h-5 w-5 text-pink-500" />;
            default:
              return <FaFile className="h-5 w-5 text-gray-600" />;
          }
        }
        return <FaFile className="h-5 w-5 text-gray-600" />;
      default:
        // Fallback: try to detect from filename
        if (contentSource.file_name) {
          const extension = contentSource.file_name.split('.').pop()?.toLowerCase();
          if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'm4v', 'flv', 'wmv'].includes(extension || '')) {
            return <FaFileVideo className="h-5 w-5 text-purple-500" />;
          }
          if (['mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac', 'wma', 'opus'].includes(extension || '')) {
            return <FaFileAudio className="h-5 w-5 text-green-500" />;
          }
          // Apply the same document type detection as above
          switch (extension) {
            case 'pdf':
              return <FaFilePdf className="h-5 w-5 text-red-500" />;
            case 'txt':
              return <FaFile className="h-5 w-5 text-blue-500" />;
            case 'md':
            case 'markdown':
              return <SiMarkdown className="h-5 w-5 text-blue-600" />;
            case 'doc':
            case 'docx':
              return <FaFileWord className="h-5 w-5 text-blue-700" />;
            case 'xls':
            case 'xlsx':
            case 'csv':
              return <FaFileExcel className="h-5 w-5 text-green-600" />;
            case 'ppt':
            case 'pptx':
              return <FaFilePowerpoint className="h-5 w-5 text-orange-500" />;
            case 'json':
            case 'xml':
            case 'yaml':
            case 'yml':
              return <FaFileCode className="h-5 w-5 text-purple-600" />;
            case 'html':
            case 'htm':
              return <FaFileCode className="h-5 w-5 text-orange-600" />;
            case 'js':
            case 'ts':
            case 'jsx':
            case 'tsx':
            case 'py':
            case 'java':
            case 'cpp':
            case 'c':
            case 'cs':
            case 'php':
            case 'rb':
            case 'go':
            case 'rs':
              return <FaFileCode className="h-5 w-5 text-green-700" />;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'bmp':
            case 'svg':
            case 'webp':
              return <FaFileImage className="h-5 w-5 text-pink-500" />;
            default:
              return <FaFile className="h-5 w-5 text-gray-600" />;
          }
        }
        return <FaFile className="h-5 w-5 text-gray-600" />;
    }
  };

  const getContentTitle = () => {
    if (!contentSource) return 'Content Viewer';
    return contentSource.title || contentSource.file_name || contentSource.source_url || 'Untitled';
  };

  const getContentType = () => {
    if (!contentSource) return '';
    
    switch (contentSource.source_type?.toLowerCase()) {
      case 'url':
        return 'URL';
      case 'video':
        return 'VIDEO';
      case 'audio':
        return 'AUDIO';
      case 'document':
        if (contentSource.file_name) {
          const extension = contentSource.file_name.split('.').pop()?.toUpperCase();
          return extension || 'DOC';
        }
        return 'DOC';
      default:
        // Fallback: try to detect from filename
        if (contentSource.file_name) {
          const extension = contentSource.file_name.split('.').pop()?.toLowerCase();
          if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'm4v', 'flv', 'wmv'].includes(extension || '')) {
            return 'VIDEO';
          }
          if (['mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac', 'wma', 'opus'].includes(extension || '')) {
            return 'AUDIO';
          }
          return extension?.toUpperCase() || 'FILE';
        }
        return 'FILE';
    }
  };

  const renderContent = () => {
    if (!contentSource) return null;

    const sourceType = contentSource.source_type?.toLowerCase();
    
    // Debug logging to see what we're getting
    console.log('[ContentViewer] Rendering content:', {
      sourceType,
      originalSourceType: contentSource.source_type,
      fileName: contentSource.file_name,
      contentUrl,
      isLoading,
      error
    });

    // Loading state
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">Loading content...</p>
          </div>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 mb-2">Failed to load content</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button 
              onClick={fetchContentUrl} 
              variant="outline" 
              size="sm" 
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    // Enhanced type detection - check for PDF files specifically
    const isPdf = sourceType === 'document' || 
                  sourceType === 'url' || 
                  (contentSource.file_name && contentSource.file_name.toLowerCase().endsWith('.pdf'));

    if (isPdf) {
      if (!contentUrl) {
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className="text-center">
              <FaFile className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-muted-foreground">No preview available</p>
            </div>
          </div>
        );
      }
      
      return (
        <iframe
          src={contentUrl}
          className="w-full h-full border-0 block"
          title={`PDF Viewer - ${getContentTitle()}`}
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none',
            margin: 0,
            padding: 0,
            display: 'block'
          }}
        />
      );
    }

    switch (sourceType) {
      case 'video':
        if (!contentUrl) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FaFileVideo className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="text-muted-foreground">Video file not available</p>
              </div>
            </div>
          );
        }
        
        return (
          <div className="w-full h-full bg-black flex items-center justify-center">
            <video
              src={contentUrl}
              controls
              className="max-w-full max-h-full"
              style={{ width: 'auto', height: 'auto' }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'audio':
        if (!contentUrl) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FaFileAudio className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="text-muted-foreground">Audio file not available</p>
              </div>
            </div>
          );
        }
        
        return (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-50 to-green-50">
            <div className="text-center w-full max-w-md px-8">
              <FaFileAudio className="h-16 w-16 text-green-500 mx-auto mb-6" />
              <h3 className="text-lg font-medium mb-2">{getContentTitle()}</h3>
              <audio
                src={contentUrl}
                controls
                className="w-full"
              >
                Your browser does not support the audio tag.
              </audio>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FaFile className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-muted-foreground">Preview not available for this file type</p>
              <p className="text-xs text-gray-500 mt-2">Source type: {sourceType || 'unknown'}</p>
            </div>
          </div>
        );
    }
  };

  if (!contentSource) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className={cn(
          "!p-0 !gap-0 overflow-hidden [&>button]:hidden flex flex-col", // Added flex flex-col and removed debug color
          isFullscreen 
            ? "max-w-[100vw] max-h-[100vh] w-[100vw] h-[100vh] rounded-none" 
            : "max-w-[90vw] max-h-[90vh] w-[90vw] h-[90vh]"
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-4 py-1 border-b bg-gray-50 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {getContentIcon()}
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-medium truncate">
                  <Badge variant="outline" className="text-xs px-1.5 mx-2 py-0.5">
                    {getContentType()}
                  </Badge>
                  {getContentTitle()}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  {/* <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    {getContentType()}
                  </Badge> */}
                  {contentSource.metadata?.size && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(contentSource.metadata.size / (1024 * 1024))} MB
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Navigation buttons */}
              {allSources.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigation('prev')}
                    disabled={!canNavigatePrev}
                    title="Previous file"
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-1">
                    {currentIndex + 1} of {allSources.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigation('next')}
                    disabled={!canNavigateNext}
                    title="Next file"
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </>
              )}
              
              {/* Action buttons */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading || !contentSource.storage_path}
                title={
                  !contentSource.storage_path 
                    ? "File not available for download"
                    : isDownloading 
                    ? "Downloading..." 
                    : "Download"
                }
                className="h-7 w-7 p-0"
              >
                {isDownloading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoToUrl}
                disabled={!getContentUrl(contentSource)}
                title={getContentUrl(contentSource) ? "Go to URL" : "URL not available"}
                className="h-7 w-7 p-0"
              >
                <LinkIcon className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                className="h-7 w-7 p-0"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3 w-3" />
                ) : (
                  <Maximize2 className="h-3 w-3" />
                )}
              </Button>
              
              {/* Custom close button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                title="Close"
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 min-h-0 w-full">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
} 