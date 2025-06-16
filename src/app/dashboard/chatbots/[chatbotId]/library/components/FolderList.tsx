"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreHorizontal, Trash2, Edit3, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useChatbotFolderTree, useCreateFolder, useUpdateFolder, useDeleteFolder } from '../lib/hooks';
import type { FolderWithChildren } from '../lib/queries';

interface FolderListProps {
  chatbotId: string;
  selectedFolderId?: string | null;
  onFolderSelect?: (folderId: string | null) => void;
  unsortedCount?: number;
  viewMode?: 'recent' | 'all' | 'unsorted' | 'folder';
  onViewModeChange?: (mode: 'recent' | 'all' | 'unsorted' | 'folder') => void;
}

interface FolderItemProps {
  folder: FolderWithChildren;
  isSelected: boolean;
  isEditing: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onToggleExpand: () => void;
  onRename: (folderId: string, newName: string) => void;
  onDelete: (folderId: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  level?: number;
}

interface DroppableFolderItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

function DroppableFolderItem({ id, children, className = '' }: DroppableFolderItemProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'bg-blue-50 border-blue-200 border-2 border-dashed' : ''} transition-colors duration-200`}
    >
      {children}
    </div>
  );
}

function FolderItem({ folder, isSelected, isEditing, isExpanded, onSelect, onStartEdit, onCancelEdit, onToggleExpand, onRename, onDelete, onCreateSubfolder, level = 0 }: FolderItemProps) {
  const [editName, setEditName] = useState(folder.name);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    // Update editName when folder name changes (in case of external updates)
    setEditName(folder.name);
  }, [folder.name]);

  const handleStartEdit = () => {
    setEditName(folder.name);
    onStartEdit();
  };

  const handleSaveEdit = () => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== folder.name) {
      onRename(folder.id, trimmedName);
    } else {
      onCancelEdit();
    }
  };

  const handleCancelEdit = () => {
    setEditName(folder.name);
    onCancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div 
      className={cn(
        "group flex items-center rounded-md justify-between  bg-primary-foreground py-1 my-1  cursor-pointer transition-colors",
        "hover:bg-gray-50",
        isSelected && "bg-blue-50 border-r-2 border-blue-500 text-blue-700"
      )}
      style={{ paddingLeft: `${level * 20 + 16}px` }}
    >
      <div className="flex items-center flex-1 min-w-0" onClick={onSelect}>
        {/* Folder Icon */}
        <div className="flex items-center mr-3">
          {isSelected ? (
            <FolderOpen className="h-4 w-4 text-blue-600" />
          ) : (
            <Folder className="h-4 w-4 text-gray-400" />
          )}
        </div>

        {/* Folder Name or Edit Input */}
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            className="h-6 px-2 py-1 text-sm border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm font-medium truncate">
            {folder.name}
          </span>
        )}
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-1">
        {!isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 hover:bg-gray-200",
                  isSelected && "opacity-100"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleStartEdit}>
                <Edit3 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateSubfolder(folder.id)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subfolder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(folder.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Expand/Collapse Button - moved to the right */}
        {folder.children.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-gray-200 text-gray-400 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function FolderList({ chatbotId, selectedFolderId, onFolderSelect, unsortedCount = 0, viewMode = 'recent', onViewModeChange }: FolderListProps) {
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const { data: folders = [], isLoading, error } = useChatbotFolderTree(chatbotId);
  
  const createFolderMutation = useCreateFolder(chatbotId, (newFolder) => {
    // Automatically start editing the new folder
    setEditingFolderId(newFolder.id);
  });
  
  const updateFolderMutation = useUpdateFolder(chatbotId);
  const deleteFolderMutation = useDeleteFolder(chatbotId);

  const handleCreateFolder = async () => {
    try {
      await createFolderMutation.mutateAsync({ 
        name: 'Folder',
        parent_id: null 
      });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleCreateSubfolder = async (parentId: string) => {
    try {
      await createFolderMutation.mutateAsync({ 
        name: 'Subfolder',
        parent_id: parentId 
      });
      
      // Expand the parent folder to show the new subfolder
      setExpandedFolders(prev => new Set([...prev, parentId]));
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      await updateFolderMutation.mutateAsync({ folderId, name: newName });
      setEditingFolderId(null);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolderMutation.mutateAsync(folderId);
      // If the deleted folder was selected, switch to Unsorted
      if (selectedFolderId === folderId) {
        onFolderSelect?.(null);
      }
      setEditingFolderId(null);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const renderFolderTree = (folders: FolderWithChildren[], level = 0): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    
    folders.forEach((folder) => {
      result.push(
        <DroppableFolderItem key={folder.id} id={`folder-${folder.id}`}>
          <FolderItem
            folder={folder}
            isSelected={selectedFolderId === folder.id}
            isEditing={editingFolderId === folder.id}
            isExpanded={expandedFolders.has(folder.id)}
            onSelect={() => onFolderSelect?.(folder.id)}
            onStartEdit={() => setEditingFolderId(folder.id)}
            onCancelEdit={() => setEditingFolderId(null)}
            onToggleExpand={() => {
              const newExpandedFolders = new Set(expandedFolders);
              if (newExpandedFolders.has(folder.id)) {
                newExpandedFolders.delete(folder.id);
              } else {
                newExpandedFolders.add(folder.id);
              }
              setExpandedFolders(newExpandedFolders);
            }}
            onRename={handleRenameFolder}
            onDelete={handleDeleteFolder}
            onCreateSubfolder={handleCreateSubfolder}
            level={level}
          />
        </DroppableFolderItem>
      );
      
      // Render children if expanded
      if (folder.children.length > 0 && expandedFolders.has(folder.id)) {
        result.push(...renderFolderTree(folder.children, level + 1));
      }
    });
    
    return result;
  };

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600">
        Error loading folders: {error.message}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Library</h3>
        <Button
          onClick={handleCreateFolder}
          disabled={createFolderMutation.isPending}
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 hover:bg-gray-100 text-gray-500 hover:text-gray-700"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Folder List */}
      <div className="flex-1 overflow-y-auto">
        {/* View Mode Buttons */}
        <div className="border-b border-gray-100 py-2">
          {/* Recent Button */}
          <div 
            className={cn(
              "flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors",
              "hover:bg-gray-50",
              viewMode === 'recent' && "bg-blue-50 border-r-2 border-blue-500 text-blue-700"
            )}
            onClick={() => onViewModeChange?.('recent')}
          >
            <div className="flex items-center flex-1 min-w-0">
              <div className="flex items-center mr-3">
                <Clock className={cn(
                  "h-4 w-4",
                  viewMode === 'recent' ? "text-blue-600" : "text-gray-400"
                )} />
              </div>
              <span className="text-sm font-medium">
                Recent
              </span>
            </div>
          </div>

          {/* All Files Button */}
          <div 
            className={cn(
              "flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors",
              "hover:bg-gray-50",
              viewMode === 'all' && "bg-blue-50 border-r-2 border-blue-500 text-blue-700"
            )}
            onClick={() => onViewModeChange?.('all')}
          >
            <div className="flex items-center flex-1 min-w-0">
              <div className="flex items-center mr-3">
                <FileText className={cn(
                  "h-4 w-4",
                  viewMode === 'all' ? "text-blue-600" : "text-gray-400"
                )} />
              </div>
              <span className="text-sm font-medium">
                All Files
              </span>
            </div>
          </div>
        </div>

        {/* Unsorted items virtual folder */}
        <div className="border-b border-gray-100">
          <DroppableFolderItem id="unsorted">
            <div 
              className={cn(
                "flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors",
                "hover:bg-gray-50",
                viewMode === 'unsorted' && "bg-blue-50 border-r-2 border-blue-500 text-blue-700"
              )}
              onClick={() => onViewModeChange?.('unsorted')}
            >
              <div className="flex items-center flex-1 min-w-0">
                <div className="flex items-center mr-3">
                  {viewMode === 'unsorted' ? (
                    <FolderOpen className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Folder className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <span className="text-sm font-medium">
                  Unsorted
                </span>
                {unsortedCount > 0 && (
                  <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {unsortedCount}
                  </span>
                )}
              </div>
            </div>
          </DroppableFolderItem>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-1 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        )}

        {/* Folders */}
        <div className="py-2 mx-4">
          {renderFolderTree(folders)}
        </div>

        {/* Empty State */}
        {!isLoading && folders.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-500">
            <Folder className="h-8 w-8 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-600">No folders yet</p>
            <p className="text-xs text-gray-400 mt-1">Click the + button to create your first folder</p>
          </div>
        )}
      </div>
    </div>
  );
} 