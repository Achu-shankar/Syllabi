"use client";

import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Link as LinkIcon, 
  MoreHorizontal, 
  Trash2, 
  Download,
  RefreshCw,
  AlertCircle,
  Clock,
  Edit2,
  Check,
  X
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useContentSourcesByFolder, useMoveContentSource, useDeleteContentSource, useChatbotFolders } from '../lib/hooks';
import { useUpdateContentSource } from '../hooks/useContentSources';
import { ContentSource } from '../lib/queries';
import ContentViewer from './ContentViewer';
import { toast } from 'sonner';

interface ContentSourcesTableProps {
  chatbotId: string;
  selectedFolderId?: string | null;
  filteredContent?: ContentSource[];
  searchQuery?: string;
  onSelectedItemsChange?: (selectedItems: Set<string>) => void;
}

// Enhanced file icon function with specific icons for different document types
const getFileIcon = (sourceType: string, fileName?: string | null) => {
  switch (sourceType.toLowerCase()) {
    case 'url':
      return <LinkIcon className="h-4 w-4 text-blue-500" />;
    case 'video':
      return <FaFileVideo className="h-4 w-4 text-purple-500" />;
    case 'audio':
      return <FaFileAudio className="h-4 w-4 text-green-500" />;
    case 'document':
      // For documents, check the file extension for specific icons
      if (fileName) {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
          case 'pdf':
            return <FaFilePdf className="h-4 w-4 text-red-500" />;
          case 'txt':
            return <FaFile className="h-4 w-4 text-blue-500" />;
          case 'md':
          case 'markdown':
            return <SiMarkdown className="h-4 w-4 text-blue-600" />;
          case 'doc':
          case 'docx':
            return <FaFileWord className="h-4 w-4 text-blue-700" />;
          case 'xls':
          case 'xlsx':
          case 'csv':
            return <FaFileExcel className="h-4 w-4 text-green-600" />;
          case 'ppt':
          case 'pptx':
            return <FaFilePowerpoint className="h-4 w-4 text-orange-500" />;
          case 'json':
          case 'xml':
          case 'yaml':
          case 'yml':
            return <FaFileCode className="h-4 w-4 text-purple-600" />;
          case 'html':
          case 'htm':
            return <FaFileCode className="h-4 w-4 text-orange-600" />;
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
            return <FaFileCode className="h-4 w-4 text-green-700" />;
          case 'jpg':
          case 'jpeg':
          case 'png':
          case 'gif':
          case 'bmp':
          case 'svg':
          case 'webp':
            return <FaFileImage className="h-4 w-4 text-pink-500" />;
    default:
            return <FaFile className="h-4 w-4 text-gray-600" />;
        }
      }
      return <FaFile className="h-4 w-4 text-gray-600" />;
    default:
      // Fallback: try to detect from filename
      if (fileName) {
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'm4v', 'flv', 'wmv'].includes(extension || '')) {
          return <FaFileVideo className="h-4 w-4 text-purple-500" />;
        }
        if (['mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac', 'wma', 'opus'].includes(extension || '')) {
          return <FaFileAudio className="h-4 w-4 text-green-500" />;
        }
        // Apply the same document type detection as above
        switch (extension) {
          case 'pdf':
            return <FaFilePdf className="h-4 w-4 text-red-500" />;
          case 'txt':
            return <FaFile className="h-4 w-4 text-blue-500" />;
          case 'md':
          case 'markdown':
            return <SiMarkdown className="h-4 w-4 text-blue-600" />;
          case 'doc':
          case 'docx':
            return <FaFileWord className="h-4 w-4 text-blue-700" />;
          case 'xls':
          case 'xlsx':
          case 'csv':
            return <FaFileExcel className="h-4 w-4 text-green-600" />;
          case 'ppt':
          case 'pptx':
            return <FaFilePowerpoint className="h-4 w-4 text-orange-500" />;
          case 'json':
          case 'xml':
          case 'yaml':
          case 'yml':
            return <FaFileCode className="h-4 w-4 text-purple-600" />;
          case 'html':
          case 'htm':
            return <FaFileCode className="h-4 w-4 text-orange-600" />;
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
            return <FaFileCode className="h-4 w-4 text-green-700" />;
          case 'jpg':
          case 'jpeg':
          case 'png':
          case 'gif':
          case 'bmp':
          case 'svg':
          case 'webp':
            return <FaFileImage className="h-4 w-4 text-pink-500" />;
          default:
            return <FaFile className="h-4 w-4 text-gray-600" />;
        }
      }
      return <FaFile className="h-4 w-4 text-gray-600" />;
  }
};

// Enhanced source type display with multimedia support
const getSourceType = (source: ContentSource) => {
  switch (source.source_type?.toLowerCase()) {
    case 'url':
      return 'URL';
    case 'video':
      return 'VIDEO';
    case 'audio':
      return 'AUDIO';
    case 'document':
      if (source.file_name) {
        const extension = source.file_name.split('.').pop()?.toUpperCase();
        return extension || 'DOC';
      }
      return 'DOC';
    default:
      // Fallback: try to detect from filename
      if (source.file_name) {
        const extension = source.file_name.split('.').pop()?.toLowerCase();
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

// Enhanced file size formatting with multimedia metadata
const formatFileSize = (metadata: any, sourceType?: string) => {
  // Try to get size from different metadata fields
  const size = metadata?.size || metadata?.file_size_bytes || metadata?.fileSize;
  
  if (!size) {
    // For multimedia, show duration if available
    if (sourceType?.toLowerCase() === 'video' || sourceType?.toLowerCase() === 'audio') {
      const duration = metadata?.duration_seconds || metadata?.duration;
      if (duration) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    }
    return '-';
  }
  
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  if (size < 1024 * 1024 * 1024) return `${Math.round(size / (1024 * 1024))} MB`;
  return `${Math.round(size / (1024 * 1024 * 1024))} GB`;
};

// Helper to format multimedia duration
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Enhanced status badge with multimedia-specific statuses
const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Indexed</Badge>;
    case 'processing':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">Processing</Badge>;
    case 'failed':
      return <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Failed</Badge>;
    case 'pending':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50">Pending</Badge>;
    case 'in_progress':
      return <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">In Progress</Badge>;
    default:
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">{status}</Badge>;
  }
};

const getDisplayName = (source: ContentSource) => {
  return source.title || source.file_name || source.source_url || 'Untitled';
};

// Helper function to get the URL for content
const getContentUrl = (source: ContentSource) => {
  return source.source_url || source.metadata?.original_url || null;
};

// Utility function to highlight search terms
const highlightSearchTerm = (text: string, searchTerm: string) => {
  if (!searchTerm.trim()) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <span key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
        {part}
      </span>
    ) : part
  );
};

interface DraggableTableRowProps {
  source: ContentSource;
  children: React.ReactNode;
  isSelected: boolean;
  selectedCount: number;
  selectedItems: Set<string>;
  onDoubleClick?: () => void;
  onDownload?: (source: ContentSource) => void;
  onGoToUrl?: (source: ContentSource) => void;
  onDelete?: (source: ContentSource) => void;
  onRename?: (source: ContentSource) => void;
  onMoveToUnsorted?: (source: ContentSource) => void;
  folders?: Array<{ id: string; name: string }>;
  onMoveToFolder?: (source: ContentSource, folderId: string) => void;
  selectedFolderId?: string | null;
  moveContentSource?: any;
  deleteContentSource?: any;
  updateContentSource?: any;
  getContentUrl?: (source: ContentSource) => string | null;
  isRenaming?: boolean;
  renamingValue?: string;
  onRenamingValueChange?: (value: string) => void;
  onRenameConfirm?: () => void;
  onRenameCancel?: () => void;
  // Checkbox visibility props
  isHovered?: boolean;
  isInSelectionMode?: boolean;
  onRowHover?: (sourceId: string | null) => void;
}

function DraggableTableRow({ 
  source, 
  children, 
  isSelected, 
  selectedCount, 
  selectedItems, 
  onDoubleClick,
  onDownload,
  onGoToUrl,
  onDelete,
  onRename,
  onMoveToUnsorted,
  folders = [],
  onMoveToFolder,
  selectedFolderId,
  moveContentSource,
  deleteContentSource,
  updateContentSource,
  getContentUrl,
  isRenaming,
  renamingValue,
  onRenamingValueChange,
  onRenameConfirm,
  onRenameCancel,
  isHovered,
  isInSelectionMode,
  onRowHover
}: DraggableTableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: source.id,
    data: {
      source,
      isMultipleSelection: selectedCount > 1,
      selectedCount,
      selectedItems: Array.from(selectedItems)
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
    <TableRow 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
          className={`
            ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'} 
            ${isDragging ? 'opacity-50' : ''}
            ${selectedCount > 0 && !isSelected ? 'opacity-60' : ''}
            cursor-pointer transition-colors
          `}
          onDoubleClick={onDoubleClick}
          onMouseEnter={() => onRowHover?.(source.id)}
          onMouseLeave={() => onRowHover?.(null)}
    >
      {children}
    </TableRow>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={(e) => { e.preventDefault(); onRename?.(source); }}>
          <Edit2 className="mr-2 h-4 w-4" />
          Rename
        </ContextMenuItem>
        {selectedFolderId !== null && (
          <ContextMenuItem 
            onClick={(e) => { e.preventDefault(); onMoveToUnsorted?.(source); }}
            disabled={moveContentSource?.isPending}
          >
            <FaFile className="mr-2 h-4 w-4" />
            {moveContentSource?.isPending ? 'Moving...' : 'Move to Unsorted'}
          </ContextMenuItem>
        )}
        {source.storage_path && (
          <ContextMenuItem onClick={(e) => { e.preventDefault(); onDownload?.(source); }}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </ContextMenuItem>
        )}
        {getContentUrl && getContentUrl(source) && (
          <ContextMenuItem onClick={(e) => { e.preventDefault(); onGoToUrl?.(source); }}>
            <LinkIcon className="mr-2 h-4 w-4" />
            Go to URL
          </ContextMenuItem>
        )}
        <ContextMenuItem 
          onClick={(e) => { e.preventDefault(); onDelete?.(source); }}
          className="text-red-600 focus:text-red-600"
          disabled={deleteContentSource?.isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleteContentSource?.isPending ? 'Deleting...' : 'Delete'}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default function ContentSourcesTable({ chatbotId, selectedFolderId, filteredContent, searchQuery, onSelectedItemsChange }: ContentSourcesTableProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<ContentSource | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Content viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerContent, setViewerContent] = useState<ContentSource | null>(null);

  // Checkbox visibility state
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [isInSelectionMode, setIsInSelectionMode] = useState(false);

  // Get content sources for the selected folder (or all if no folder is selected)
  const { 
    data: contentSources = [], 
    isLoading, 
    error,
    refetch 
  } = useContentSourcesByFolder(chatbotId, selectedFolderId ?? null);

  // Use filtered content if provided, otherwise use fetched content
  const displayContent = filteredContent || contentSources;

  // Get available folders for bulk move
  const { data: folders = [] } = useChatbotFolders(chatbotId);

  const moveContentSource = useMoveContentSource(chatbotId);
  const deleteContentSource = useDeleteContentSource(chatbotId);
  const updateContentSource = useUpdateContentSource(chatbotId);

  // Rename state
  const [renamingSourceId, setRenamingSourceId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState<string>('');

  // Content viewer handlers
  const handleOpenViewer = (source: ContentSource) => {
    setViewerContent(source);
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setViewerContent(null);
  };

  const handleNavigateViewer = (source: ContentSource) => {
    setViewerContent(source);
  };

  // Download handler
  const handleDownload = async (source: ContentSource) => {
    if (!source.storage_path) {
      alert('This file is not available for download.');
      return;
    }

    try {
      console.log('[ContentSourcesTable] Starting download for:', source.id);
      
      const response = await fetch(`/api/content-sources/${chatbotId}/${source.id}/download`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Download failed: ${errorText}`);
      }
      
      const result = await response.json();
      
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
      
      console.log('[ContentSourcesTable] Download initiated for:', result.fileName);
      
    } catch (err: any) {
      console.error('[ContentSourcesTable] Download error:', err);
      alert(`Download failed: ${err.message}`);
    }
  };

  // Go to URL handler
  const handleGoToUrl = (source: ContentSource) => {
    // Check for URL in multiple places - source_url field or metadata.original_url
    const urlToOpen = source.source_url || source.metadata?.original_url;
    
    if (!urlToOpen) {
      console.log('[ContentSourcesTable] No URL found for content:', {
        id: source.id,
        source_url: source.source_url,
        metadata: source.metadata,
        source_type: source.source_type
      });
      return;
    }
    
    console.log('[ContentSourcesTable] Opening URL:', urlToOpen);
    
    // Open URL in new tab
    window.open(urlToOpen, '_blank', 'noopener,noreferrer');
  };

  // Move to specific folder handler
  const handleMoveToFolder = async (source: ContentSource, folderId: string) => {
    try {
      await moveContentSource.mutateAsync({
        contentSourceId: source.id,
        folderId: folderId
      });
    } catch (error) {
      console.error('Failed to move content source:', error);
    }
  };

  // Update bulk actions visibility when selection changes
  React.useEffect(() => {
    setShowBulkActions(selectedItems.size > 0);
    setIsInSelectionMode(selectedItems.size > 0);
    onSelectedItemsChange?.(selectedItems);
  }, [selectedItems, onSelectedItemsChange]);

  // Clear selection when folder changes
  React.useEffect(() => {
    setSelectedItems(new Set());
    setIsInSelectionMode(false);
  }, [selectedFolderId]);

  // Selection handlers
  const handleSelectItem = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === displayContent.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(displayContent.map(source => source.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedItems(new Set());
  };

  // Bulk action handlers
  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    setBulkDeleteConfirmOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedItems.size === 0) return;
    
    try {
      // Delete all selected items
      await Promise.all(
        Array.from(selectedItems).map(itemId =>
          deleteContentSource.mutateAsync(itemId)
        )
      );
      setSelectedItems(new Set());
      setBulkDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Failed to delete items:', error);
    }
  };

  const handleBulkMoveToUnsorted = async () => {
    if (selectedItems.size === 0) return;
    
    try {
      // Move all selected items to unsorted
      await Promise.all(
        Array.from(selectedItems).map(itemId =>
          moveContentSource.mutateAsync({
            contentSourceId: itemId,
            folderId: null
          })
        )
      );
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Failed to move items:', error);
    }
  };

  const handleBulkMoveToFolder = async (folderId: string) => {
    if (selectedItems.size === 0) return;
    
    try {
      // Move all selected items to the specified folder
      await Promise.all(
        Array.from(selectedItems).map(itemId =>
          moveContentSource.mutateAsync({
            contentSourceId: itemId,
            folderId: folderId
          })
        )
      );
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Failed to move items:', error);
    }
  };

  const handleDeleteClick = (source: ContentSource) => {
    setSourceToDelete(source);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (sourceToDelete) {
      try {
        await deleteContentSource.mutateAsync(sourceToDelete.id);
        setDeleteConfirmOpen(false);
        setSourceToDelete(null);
      } catch (error) {
        // Error handling is done in the hook
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setSourceToDelete(null);
  };

  const handleMoveToUnsorted = async (source: ContentSource) => {
    try {
      await moveContentSource.mutateAsync({
        contentSourceId: source.id,
        folderId: null
      });
    } catch (error) {
      console.error('Failed to move content source:', error);
    }
  };

  const handleRename = (source: ContentSource) => {
    setRenamingSourceId(source.id);
    setRenamingValue(getDisplayName(source));
  };

  const handleRenameConfirm = async () => {
    if (!renamingSourceId || !renamingValue.trim()) {
      handleRenameCancel();
      return;
    }

    const source = displayContent.find(s => s.id === renamingSourceId);
    if (!source) {
      handleRenameCancel();
      return;
    }

    try {
      // Check for duplicates
      const trimmedName = renamingValue.trim();
      const isDuplicate = displayContent.some(s => 
        s.id !== renamingSourceId && 
        (getDisplayName(s).toLowerCase() === trimmedName.toLowerCase())
      );

      if (isDuplicate) {
        toast.error('A file with this name already exists');
        return;
      }

      // Always update the title field as it's the primary display field
      // For documents, also update file_name to preserve the extension if needed
      const updateInput: any = {
        title: trimmedName
      };

      // For documents, also update file_name with proper extension handling
      if (source.source_type !== 'url' && source.file_name) {
        const originalName = source.file_name;
        const lastDotIndex = originalName.lastIndexOf('.');
        if (lastDotIndex > 0) {
          const extension = originalName.substring(lastDotIndex);
          updateInput.file_name = trimmedName.endsWith(extension) ? trimmedName : trimmedName + extension;
        } else {
          updateInput.file_name = trimmedName;
        }
      }

      await updateContentSource.mutateAsync({
        sourceId: renamingSourceId,
        input: updateInput
      });

      toast.success('File renamed successfully');
      setRenamingSourceId(null);
      setRenamingValue('');
    } catch (error) {
      console.error('Error renaming file:', error);
      toast.error('Failed to rename file');
    }
  };

  const handleRenameCancel = () => {
    setRenamingSourceId(null);
    setRenamingValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleRenameCancel();
    }
  };

  // Bulk Actions Toolbar Component
  const BulkActionsToolbar = () => {
    if (!showBulkActions) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-blue-900">
            {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            {/* Move to Folder Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                  disabled={moveContentSource.isPending}
                >
                  Move to Folder
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={handleBulkMoveToUnsorted}>
                  📁 Unsorted
                </DropdownMenuItem>
                {folders.map((folder) => (
                  <DropdownMenuItem 
                    key={folder.id}
                    onClick={() => handleBulkMoveToFolder(folder.id)}
                  >
                    📁 {folder.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              onClick={handleBulkDelete}
              variant="outline"
              size="sm"
              className="h-8 bg-white border-red-200 text-red-600 hover:bg-red-50"
              disabled={deleteContentSource.isPending}
            >
              Delete Selected
            </Button>
          </div>
        </div>
        <Button
          onClick={handleClearSelection}
          variant="ghost"
          size="sm"
          className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
        >
          Clear Selection
        </Button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="h-full rounded-none">
        <CardHeader>
          {/* <CardTitle>Content Sources</CardTitle> */}
          <CardDescription>Loading content sources...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          {/* <CardTitle>Content Sources</CardTitle> */}
          <CardDescription>Failed to load content sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'An error occurred while loading content sources.'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar />

      {/* Content Table - Fill remaining space */}
      <div className="flex-1 min-h-0">
        {displayContent.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-12">
              <FaFile className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 font-medium">
                {filteredContent ? 
                  'No content matches your search or filter criteria.' :
                  'No content sources yet'
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {filteredContent ? 
                  'Try adjusting your search terms or filters.' :
                  'Upload files or add URLs to get started'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full bg-white  overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-gray-50">
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="w-[50px] pl-4 bg-gray-50">
                      <div className="flex items-center justify-center h-8 w-8">
                        <div className={`transition-opacity duration-200 ${isInSelectionMode ? 'opacity-100' : 'opacity-0'}`}>
                      <Checkbox
                        checked={selectedItems.size === displayContent.length && displayContent.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all items"
                      />
                        </div>
                      </div>
                    </TableHead>
                    <TableHead className="w-[50px] bg-gray-50">Type</TableHead>
                    <TableHead className="font-semibold bg-gray-50">Name</TableHead>
                    <TableHead className="font-semibold bg-gray-50">Status</TableHead>
                    <TableHead className="font-semibold bg-gray-50">Size</TableHead>
                    <TableHead className="font-semibold bg-gray-50">Date Added</TableHead>
                    <TableHead className="w-[50px] pr-4 bg-gray-50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayContent.map((source) => (
                    <DraggableTableRow 
                      key={source.id} 
                      source={source} 
                      isSelected={selectedItems.has(source.id)} 
                      selectedCount={selectedItems.size} 
                      selectedItems={selectedItems} 
                      onDoubleClick={() => handleOpenViewer(source)} 
                      onDownload={handleDownload} 
                      onGoToUrl={handleGoToUrl} 
                      onDelete={handleDeleteClick} 
                      onRename={handleRename}
                      onMoveToUnsorted={handleMoveToUnsorted} 
                      folders={folders} 
                      onMoveToFolder={handleMoveToFolder} 
                      selectedFolderId={selectedFolderId} 
                      moveContentSource={moveContentSource} 
                      deleteContentSource={deleteContentSource} 
                      updateContentSource={updateContentSource}
                      getContentUrl={getContentUrl}
                      isRenaming={renamingSourceId === source.id}
                      renamingValue={renamingValue}
                      onRenamingValueChange={setRenamingValue}
                      onRenameConfirm={handleRenameConfirm}
                      onRenameCancel={handleRenameCancel}
                      isHovered={hoveredRowId === source.id}
                      isInSelectionMode={isInSelectionMode}
                      onRowHover={setHoveredRowId}
                    >
                      <TableCell className="pl-4">
                        <div className="flex items-center justify-center h-8 w-8">
                          <div className={`transition-opacity duration-200 ${(isInSelectionMode || hoveredRowId === source.id) ? 'opacity-100' : 'opacity-0'}`}>
                        <Checkbox
                          checked={selectedItems.has(source.id)}
                          onCheckedChange={() => handleSelectItem(source.id)}
                          aria-label={`Select ${getDisplayName(source)}`}
                        />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {getFileIcon(source.source_type, source.file_name)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {renamingSourceId === source.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={renamingValue}
                                onChange={(e) => setRenamingValue(e.target.value)}
                                onKeyDown={handleRenameKeyDown}
                                onBlur={handleRenameConfirm}
                                className="h-8 text-sm"
                                autoFocus
                                disabled={updateContentSource.isPending}
                              />
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={handleRenameConfirm}
                                  disabled={updateContentSource.isPending}
                                >
                                  <Check className="h-3 w-3 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={handleRenameCancel}
                                  disabled={updateContentSource.isPending}
                                >
                                  <X className="h-3 w-3 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                          <span 
                            className="truncate max-w-[300px]" 
                            title={getDisplayName(source)}
                          >
                            {highlightSearchTerm(getDisplayName(source), searchQuery || '')}
                          </span>
                          <Badge variant="outline" className="text-xs px-2 py-1">
                            {getSourceType(source)}
                          </Badge>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(source.indexing_status)}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        <div className="flex flex-col gap-1">
                          <span>{formatFileSize(source.metadata, source.source_type)}</span>
                          {/* Show duration for multimedia content */}
                          {(source.source_type?.toLowerCase() === 'video' || source.source_type?.toLowerCase() === 'audio') && 
                           (source.metadata?.duration_seconds || source.metadata?.duration) && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatDuration(source.metadata?.duration_seconds || source.metadata?.duration)}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {new Date(source.uploaded_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              disabled={deleteContentSource.isPending || moveContentSource.isPending || updateContentSource.isPending}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={(e) => { e.preventDefault(); handleRename(source); }}
                              disabled={updateContentSource.isPending}
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              {updateContentSource.isPending ? 'Renaming...' : 'Rename'}
                            </DropdownMenuItem>
                            {selectedFolderId !== null && (
                              <DropdownMenuItem 
                                onClick={(e) => { e.preventDefault(); handleMoveToUnsorted(source); }}
                                disabled={moveContentSource.isPending}
                              >
                                <FaFile className="mr-2 h-4 w-4" />
                                {moveContentSource.isPending ? 'Moving...' : 'Move to Unsorted'}
                              </DropdownMenuItem>
                            )}
                            {source.indexing_status === 'failed' && (
                              <DropdownMenuItem 
                                onClick={() => alert('Retry functionality will be implemented')}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Retry Indexing
                              </DropdownMenuItem>
                            )}
                            {source.storage_path && (
                              <DropdownMenuItem 
                                onClick={(e) => { e.preventDefault(); handleDownload(source); }}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                            )}
                            {getContentUrl && getContentUrl(source) && (
                            <DropdownMenuItem 
                                onClick={(e) => { e.preventDefault(); handleGoToUrl(source); }}
                              >
                                <LinkIcon className="mr-2 h-4 w-4" />
                                Go to URL
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={(e) => { e.preventDefault(); handleDeleteClick(source); }}
                              className="text-red-600 focus:text-red-600"
                              disabled={deleteContentSource.isPending}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {deleteContentSource.isPending ? 'Deleting...' : 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </DraggableTableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sourceToDelete ? getDisplayName(sourceToDelete) : ''}"?
              <br />
              <br />
              This action cannot be undone and will permanently remove the content from your chatbot's knowledge base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteContentSource.isPending}
            >
              {deleteContentSource.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedItems.size} selected item{selectedItems.size > 1 ? 's' : ''}?
              <br />
              <br />
              This action cannot be undone and will permanently remove all selected content from your chatbot's knowledge base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkDeleteConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteContentSource.isPending}
            >
              {deleteContentSource.isPending ? 'Deleting...' : `Delete ${selectedItems.size} Item${selectedItems.size > 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Content Viewer */}
      {viewerOpen && viewerContent && (
        <ContentViewer
          isOpen={viewerOpen}
          onClose={handleCloseViewer}
          contentSource={viewerContent}
          chatbotId={chatbotId}
          allSources={displayContent}
          onNavigate={handleNavigateViewer}
        />
      )}
    </div>
  );
} 