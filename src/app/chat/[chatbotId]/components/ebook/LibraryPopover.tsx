import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Folder, FolderOpen, ChevronDown, ChevronRight, BookOpen, Loader2, Search, X } from 'lucide-react';
import { useLibraryData, LibraryItem, LibraryFolder, LibraryFile } from '../../lib/hooks/useLibraryData';
import { FileIcon } from './FileIcon';

interface LibraryPopoverProps {
  onFileSelect: (file: LibraryFile) => void;
  currentDocumentId: string | null;
}

const FolderTreeView: React.FC<{
  items: LibraryItem[];
  onFileSelect: (file: LibraryFile) => void;
  onFolderSelect: (folderId: string) => void;
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  onToggleExpand: (folderId: string) => void;
  level?: number;
}> = ({ items, onFileSelect, onFolderSelect, selectedFolderId, expandedFolders, onToggleExpand, level = 0 }) => {
  return (
    <div className="space-y-0.5">
      {items.map(item => (
        <React.Fragment key={item.id}>
          {item.type === 'folder' ? (
            <>
              <div className="group">
                <div
                  className={`flex items-center gap-1 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedFolderId === item.id 
                      ? 'bg-blue-50 text-blue-700 shadow-sm' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                  style={{ paddingLeft: `${level * 0.75 + 0.5}rem` }}
                >
                  {/* Expand/Collapse Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand(item.id);
                    }}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {item.children.some(child => child.type === 'folder') ? (
                      expandedFolders.has(item.id) ? (
                        <ChevronDown className="h-3 w-3 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-gray-500" />
                      )
                    ) : (
                      <div className="h-3 w-3" />
                    )}
                  </button>
                  
                  {/* Folder Content */}
                  <div
                    className="flex items-center gap-2 py-2 pr-3 flex-1 min-w-0"
                    onClick={() => onFolderSelect(item.id)}
                  >
                    {selectedFolderId === item.id ? (
                      <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <Folder className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">{item.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {item.children.filter(child => child.type === 'file').length}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Recursively render nested subfolders if expanded */}
              {expandedFolders.has(item.id) && item.children.length > 0 && (
                <FolderTreeView
                  items={item.children.filter(child => child.type === 'folder')}
                  onFileSelect={onFileSelect}
                  onFolderSelect={onFolderSelect}
                  selectedFolderId={selectedFolderId}
                  expandedFolders={expandedFolders}
                  onToggleExpand={onToggleExpand}
                  level={level + 1}
                />
              )}
            </>
          ) : null}
        </React.Fragment>
      ))}
    </div>
  );
};

export const LibraryPopover: React.FC<LibraryPopoverProps> = ({ onFileSelect, currentDocumentId }) => {
  const { data: libraryData, isLoading } = useLibraryData();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleFileSelect = (file: LibraryFile) => {
    onFileSelect(file);
    setIsOpen(false); // Close popover when file is selected
  };

  const selectedFolder = selectedFolderId
    ? findFolderById(libraryData || [], selectedFolderId)
    : null;

  const filesToShow = selectedFolder 
    ? getFilesFromFolder(selectedFolder) 
    : (libraryData || []).filter(item => item.type === 'file') as LibraryFile[];

  const totalFiles = (libraryData || []).reduce((count, item) => {
    if (item.type === 'file') return count + 1;
    if (item.type === 'folder') return count + countFilesInFolder(item);
    return count;
  }, 0);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="h-9 border-gray-200 bg-white hover:bg-gray-50 text-sm min-w-[200px] max-w-[300px] flex justify-between items-center shadow-sm transition-all duration-200"
        >
          <div className="flex items-center gap-2.5 truncate">
            <BookOpen className="h-4 w-4 text-gray-600" />
            <span className="truncate font-medium">Browse Library</span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[600px] h-[500px] p-0 flex shadow-xl border-0 bg-white rounded-xl overflow-hidden relative" 
        align="start"
      >
        {/* Close Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="absolute top-3 right-3 z-10 h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
        >
          <X className="h-4 w-4 text-gray-500" />
        </Button>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
            <p className="text-sm text-gray-600">Loading library...</p>
          </div>
        ) : (
          <>
            {/* Left Pane: Folder Tree */}
            <div className="w-2/5 border-r border-gray-100 bg-gray-50/30 flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-100 bg-white pr-12">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Folders</h3>
                <p className="text-xs text-gray-500">{totalFiles} files total</p>
              </div>
              
              {/* Folder Tree */}
              <div className="flex-1 overflow-y-auto p-2">
                <div 
                  className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all duration-200 mb-2 ${
                    selectedFolderId === null 
                      ? 'bg-blue-50 text-blue-700 shadow-sm font-medium' 
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                  onClick={() => setSelectedFolderId(null)}
                >
                  <Search className="h-4 w-4" />
                  <span className="text-sm">All Files</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {(libraryData || []).filter(item => item.type === 'file').length}
                  </span>
                </div>
                
                <FolderTreeView
                  items={libraryData || []}
                  onFileSelect={handleFileSelect}
                  onFolderSelect={setSelectedFolderId}
                  selectedFolderId={selectedFolderId}
                  expandedFolders={expandedFolders}
                  onToggleExpand={handleToggleExpand}
                />
              </div>
            </div>

            {/* Right Pane: File List */}
            <div className="w-3/5 flex flex-col bg-white">
              {/* Header */}
              <div className="p-4 border-b border-gray-100 pr-12">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {selectedFolder?.name || 'All Files'}
                </h3>
                <p className="text-xs text-gray-500">
                  {filesToShow.length} {filesToShow.length === 1 ? 'file' : 'files'}
                </p>
              </div>
              
              {/* File List */}
              <div className="flex-1 overflow-y-auto p-2">
                {filesToShow.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <BookOpen className="h-12 w-12 mb-3 text-gray-300" />
                    <p className="text-sm">No files in this folder</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filesToShow.map(file => (
                      <div
                        key={file.id}
                        onClick={() => handleFileSelect(file)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 group ${
                          currentDocumentId === file.id 
                            ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200' 
                            : 'hover:bg-gray-50 hover:shadow-sm'
                        }`}
                      >
                        <FileIcon sourceType={file.source_type} className="h-5 w-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${
                            currentDocumentId === file.id ? 'font-semibold' : 'font-medium'
                          }`}>
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {file.source_type} document
                          </p>
                        </div>
                        {currentDocumentId === file.id && (
                          <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

// Helper functions to navigate the library data
function findFolderById(items: LibraryItem[], id: string): LibraryFolder | null {
  for (const item of items) {
    if (item.type === 'folder') {
      if (item.id === id) return item;
      const found = findFolderById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

function getFilesFromFolder(folder: LibraryFolder): LibraryFile[] {
  const files: LibraryFile[] = [];
  folder.children.forEach(child => {
    if (child.type === 'file') {
      files.push(child);
    }
  });
  return files;
}

function countFilesInFolder(folder: LibraryFolder): number {
  let count = 0;
  folder.children.forEach(child => {
    if (child.type === 'file') {
      count++;
    } else if (child.type === 'folder') {
      count += countFilesInFolder(child);
    }
  });
  return count;
} 