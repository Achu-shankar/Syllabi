"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import FileUploadModal from './components/FileUploadModal';
import UrlInputModal from './components/UrlInputModal';
import ContentSourcesTable from './components/ContentSourcesTable';
import TaskProgressGlobalDisplay from './components/TaskProgressGlobalDisplay';
import FolderList from './components/FolderList';
import SSEConnectionManager from './components/SSEConnectionManager';
import { useContentIngestionProcess } from './hooks/useContentIngestionProcess';
import { Button } from '@/components/ui/button';
import { Upload, Link, Plus, Search, Filter, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useContentSourcesByFolder, useMoveContentSource, useChatbotFolders } from './lib/hooks';
import { useContentSources } from './hooks/useContentSources';
import type { ContentSource } from './lib/queries';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import { GlowEffect } from '@/components/ui/glow-effect';

export default function ChatbotLibraryPage() {
  const params = useParams();
  const chatbotId = params.chatbotId as string;
  
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingUserId, setIsLoadingUserId] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isFileUploadModalOpen, setIsFileUploadModalOpen] = useState(false);
  const [isUrlInputModalOpen, setIsUrlInputModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedContent, setDraggedContent] = useState<ContentSource | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [dragData, setDragData] = useState<any>(null);
  
  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // View mode state - 'recent' is the default
  const [viewMode, setViewMode] = useState<'recent' | 'all' | 'unsorted' | 'folder'>('recent');
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'document' | 'url' | 'video' | 'audio'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'failed' | 'pending'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  const supabase = createClient();

  // SSE Connection Management at page level to persist through modal closures
  const { 
    startDocumentIngestion, 
    startUrlIngestion,
    startMultimediaIngestion,
    activeConnections,
    handleSSEUpdate,
    handleSSEComplete,
    handleSSEError,
    sseOnCloseHandler
  } = useContentIngestionProcess({ chatbotId, userId: userId || '' });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get content sources for the selected folder to show counts
  const { data: contentSources = [] } = useContentSourcesByFolder(chatbotId, selectedFolderId);
  
  // Get all content sources for "All Files" and "Recent" views
  const { data: allContentSources = [] } = useContentSources(chatbotId);
  
  // Calculate unsorted count
  const { data: unsortedSources = [] } = useContentSourcesByFolder(chatbotId, null);
  const unsortedCount = unsortedSources.length;

  // Get folders for drag/drop handling
  const { data: folders = [] } = useChatbotFolders(chatbotId);
  
  // Move content source hook
  const moveContentSource = useMoveContentSource(chatbotId);

  // Get the appropriate content based on view mode
  const getContentForView = () => {
    switch (viewMode) {
      case 'recent':
        // Get all sources, sort by upload date, take first 20
        return allContentSources
          .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
          .slice(0, 20);
      
      case 'all':
        // Return all sources from all folders
        return allContentSources;
      
      case 'unsorted':
        // Return only unsorted sources (folder_id is null)
        return unsortedSources;
      
      case 'folder':
        // Return sources from selected folder
        return contentSources;
      
      default:
        return [];
    }
  };

  const currentContent = getContentForView();

  // Filter and search functions
  const getFilteredContent = () => {
    let filtered = currentContent;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(source => {
        const title = (source.title || '').toLowerCase();
        const fileName = (source.file_name || '').toLowerCase();
        const url = (source.source_url || '').toLowerCase();
        return title.includes(query) || fileName.includes(query) || url.includes(query);
      });
    }

    // Apply content type filter
    if (contentTypeFilter !== 'all') {
      filtered = filtered.filter(source => source.source_type === contentTypeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(source => source.indexing_status === statusFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(source => new Date(source.uploaded_at) >= cutoffDate);
    }

    return filtered;
  };

  const filteredContent = getFilteredContent();
  const hasActiveFilters = searchQuery.trim() || contentTypeFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setContentTypeFilter('all');
    setStatusFilter('all');
    setDateFilter('all');
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching user session:", error);
        setIsLoadingUserId(false);
        return;
      }
      if (session?.user?.id) {
        setUserId(session.user.id);
      } else {
        console.warn("User not logged in or session not found.");
      }
      setIsLoadingUserId(false);
    };

    fetchUser();
  }, [supabase]);

  if (isLoadingUserId) {
  return (
      <div className="h-full flex bg-background">
        {/* Left sidebar skeleton */}
        <div className="w-80 bg-card border-r border-border p-4 space-y-4 transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-6 flex-1" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col">
          {/* Header skeleton */}
          <div className="bg-card border-b border-border px-6 py-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-3">
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-9 w-24" />
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-9 w-80" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Content skeleton */}
          <div className="flex-1 px-6 py-6 bg-background">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-96 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getFolderName = () => {
    switch (viewMode) {
      case 'recent':
        return 'Recent';
      case 'all':
        return 'All Files';
      case 'unsorted':
        return 'Unsorted';
      case 'folder':
        if (selectedFolderId === null) return 'Unsorted';
        const folder = folders.find(f => f.id === selectedFolderId);
        return folder ? folder.name : 'Folder Content';
      default:
        return 'Recent';
    }
  };

  const buildBreadcrumbs = () => {
    switch (viewMode) {
      case 'recent':
        return [{ name: 'Recent', id: null }];
      case 'all':
        return [{ name: 'All Files', id: null }];
      case 'unsorted':
        return [{ name: 'Unsorted', id: null }];
      case 'folder':
        if (selectedFolderId === null) return [{ name: 'Unsorted', id: null }];
        
        const breadcrumbs: { name: string; id: string | null }[] = [];
        let currentId: string | null = selectedFolderId;
        
        while (currentId) {
          const folder = folders.find(f => f.id === currentId);
          if (!folder) break;
          
          breadcrumbs.unshift({ name: folder.name, id: folder.id });
          currentId = folder.parent_id;
        }
        
        return breadcrumbs;
      default:
        return [{ name: 'Recent', id: null }];
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setDragData(active.data.current);
    
    // Find the dragged content source
    const allSources = [...currentContent];
    const draggedItem = allSources.find(source => source.id === active.id);
    setDraggedContent(draggedItem || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setDraggedContent(null);
    setDragData(null);

    if (!over) return;

    const contentId = active.id as string;
    const targetId = over.id as string;
    const dragData = active.data.current;

    // Determine target folder ID
    let targetFolderId: string | null = null;
    
    if (targetId === 'unsorted') {
      targetFolderId = null;
    } else if (targetId.startsWith('folder-')) {
      targetFolderId = targetId.replace('folder-', '');
    } else {
      return; // Invalid drop target
    }

    // Check if this is a multiple selection drag
    if (dragData?.isMultipleSelection && dragData?.selectedCount > 1) {
      // Handle multiple item drag - move all selected items
      console.log(`Moving ${dragData.selectedCount} items to folder ${targetFolderId}`);
      
      try {
        // Move all selected items
        const selectedItemsArray = Array.from(selectedItems);
        await Promise.all(
          selectedItemsArray.map(itemId =>
            moveContentSource.mutateAsync({
              contentSourceId: itemId,
              folderId: targetFolderId
            })
          )
        );
        
        console.log(`Successfully moved ${selectedItemsArray.length} items to folder ${targetFolderId}`);
        return; // Don't move the single item again
      } catch (error) {
        console.error('Failed to move selected content sources:', error);
        return;
      }
    }

    // Move the content source(s)
    try {
      await moveContentSource.mutateAsync({
        contentSourceId: contentId,
        folderId: targetFolderId
      });
    } catch (error) {
      console.error('Failed to move content source:', error);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full border-t flex">
        {/* Left Sidebar - Folder List */}
        <div className={`bg-card border-r border-border flex-shrink-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'
        }`}>
          <FolderList
            chatbotId={chatbotId}
            selectedFolderId={selectedFolderId}
            onFolderSelect={(folderId) => {
              setSelectedFolderId(folderId);
              setViewMode('folder');
            }}
            unsortedCount={unsortedCount}
            viewMode={viewMode}
            onViewModeChange={(mode) => {
              setViewMode(mode);
              if (mode !== 'folder') {
                setSelectedFolderId(null);
              }
            }}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with Breadcrumbs and Search */}
          <div className="bg-card border-b border-border">
            {/* Breadcrumbs Row */}
            <div className="px-6 py-4">
              <div className="flex items-center text-sm text-muted-foreground">
                {/* Sidebar Toggle Button */}
                <Button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  variant="ghost"
                  size="sm"
                  className="mr-4 h-8 w-8 p-0 hover:bg-secondary"
                  title={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                >
                  {isSidebarCollapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>

                {/* Breadcrumbs */}
                {buildBreadcrumbs().map((crumb, index, array) => (
                  <React.Fragment key={crumb.id || 'unsorted'}>
                    <button
                      onClick={() => {
                        if (viewMode === 'folder' && crumb.id) {
                          setSelectedFolderId(crumb.id);
                        } else {
                          // For non-folder views, clicking breadcrumb doesn't change anything
                          // since they're single-level views
                        }
                      }}
                      className="hover:text-foreground transition-colors"
                    >
                      {crumb.name}
                    </button>
                    {index < array.length - 1 && (
                      <span className="mx-2 text-border">/</span>
                    )}
                  </React.Fragment>
                ))}
                <span className="ml-auto text-sm text-muted-foreground">
                  {filteredContent.length} {filteredContent.length === 1 ? 'item' : 'items'}
                  {hasActiveFilters && ` (filtered from ${currentContent.length})`}
                </span>
              </div>
            </div>

            {/* Actions and Search Row */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                {/* Left side - Action buttons */}
                <div className="flex gap-3">
                  <div className="relative group">
                    <GlowEffect
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      colors={['#9c40ff', '#ffaa40', '#3357FF']}
                      mode='rotate'
                      blur='strong'
                      duration={5}
                      scale={1.1}
                    />
                    <RainbowButton
                    onClick={() => setIsFileUploadModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Files
                    </RainbowButton>
                  </div>
                  <Button
                    onClick={() => setIsUrlInputModalOpen(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Link className="h-4 w-4" />
                    Add URL
        </Button>
      </div>

                {/* Right side - Search and Filter */}
                <div className="flex items-center gap-4">
                  {/* Search Input */}
                  <div className="relative w-80">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10 h-9 border-border focus:border-primary focus:ring-primary"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Filter Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 h-9">
                        <Filter className="h-4 w-4" />
                        Filters
                        {hasActiveFilters && (
                          <span className="ml-1 px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                            Active
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">Filters</h3>
                          {hasActiveFilters && (
                            <Button
                              onClick={clearAllFilters}
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                            >
                              Clear All
                            </Button>
                          )}
                        </div>

                        {/* Content Type Filter */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">Content Type</label>
                          <Select value={contentTypeFilter} onValueChange={(value: any) => setContentTypeFilter(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="document">Documents</SelectItem>
                              <SelectItem value="url">URLs</SelectItem>
                              <SelectItem value="video">Videos</SelectItem>
                              <SelectItem value="audio">Audio</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Status Filter */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">Status</label>
                          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Date Filter */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">Date Added</label>
                          <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Any Time</SelectItem>
                              <SelectItem value="today">Today</SelectItem>
                              <SelectItem value="week">Past Week</SelectItem>
                              <SelectItem value="month">Past Month</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>

          {/* Content Sources Table */}
          <div className="flex-1 min-h-0">
            <ContentSourcesTable 
              chatbotId={chatbotId}
              selectedFolderId={selectedFolderId}
              filteredContent={filteredContent}
              searchQuery={searchQuery}
              onSelectedItemsChange={setSelectedItems}
            />
          </div>
        </div>

        {/* Floating Task Progress Overlay */}
        <TaskProgressGlobalDisplay chatbotId={chatbotId} />

        {/* Modals */}
        <FileUploadModal
          isOpen={isFileUploadModalOpen}
          onClose={() => setIsFileUploadModalOpen(false)}
          chatbotId={chatbotId}
          userId={userId}
          startDocumentIngestion={startDocumentIngestion}
          startMultimediaIngestion={startMultimediaIngestion}
        />

        <UrlInputModal
          isOpen={isUrlInputModalOpen}
          onClose={() => setIsUrlInputModalOpen(false)}
          chatbotId={chatbotId}
          userId={userId}
          startUrlIngestion={startUrlIngestion}
        />

        {/* SSE Connection Manager at page level - persists through modal closures */}
        <SSEConnectionManager
          activeConnections={activeConnections}
          onUpdate={handleSSEUpdate}
          onComplete={handleSSEComplete}
          onError={handleSSEError}
          onClose={sseOnCloseHandler}
        />

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId && draggedContent ? (
            <div className="bg-card shadow-lg rounded-md border border-border p-3 opacity-90 max-w-[300px]">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-primary rounded flex-shrink-0"></div>
                <span className="text-sm font-medium truncate">
                  {draggedContent.title || draggedContent.file_name || draggedContent.source_url || 'Untitled'}
                </span>
                {/* Show count if multiple items are being dragged */}
                {dragData?.isMultipleSelection && dragData?.selectedCount > 1 && (
                  <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full ml-auto flex-shrink-0">
                    {dragData.selectedCount}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DragOverlay>
    </div>
    </DndContext>
  );
}