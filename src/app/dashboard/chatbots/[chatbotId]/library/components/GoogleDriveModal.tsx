"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Folder, 
  File, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio,
  Search,
  Upload,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  FolderOpen,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime: string;
  parents?: string[];
  webViewLink?: string;
  iconLink?: string;
  can_process: boolean;
  source_type: string;
}

interface GoogleDriveIntegration {
  id: string;
  type: string;
  name: string;
  connectedAt: string;
  metadata: {
    email?: string;
    name?: string;
    picture?: string;
  };
}

interface GoogleDriveModalProps {
  chatbotId: string;
  onFilesSelected: (files: GoogleDriveFile[], integrationId: string) => void;
  trigger?: React.ReactNode;
}

export default function GoogleDriveModal({ chatbotId, onFilesSelected, trigger }: GoogleDriveModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [integrations, setIntegrations] = useState<GoogleDriveIntegration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string>('');
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [folderPath, setFolderPath] = useState<string>('/');
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('browse');
  

  // Load Google Drive integrations
  useEffect(() => {
    if (isOpen) {
      loadIntegrations();
    }
  }, [isOpen]);

  // Load files when integration or folder changes
  useEffect(() => {
    if (selectedIntegration && activeTab === 'browse') {
      loadFiles();
    }
  }, [selectedIntegration, currentFolder, activeTab]);

  const loadIntegrations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[GoogleDriveModal] Loading Google integrations...');
      
      const response = await fetch('/api/dashboard/integrations');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[GoogleDriveModal] Integrations response:', data);
      
      // The API returns a flat array, not data.integrations
      const allIntegrations = Array.isArray(data) ? data : [];
      const googleIntegrations = allIntegrations.filter(
        (integration: any) => integration.type === 'google'
      ) || [];
      
      console.log('[GoogleDriveModal] Found Google integrations:', googleIntegrations);
      
      setIntegrations(googleIntegrations);
      
      if (googleIntegrations.length === 0) {
        setError('No Google Drive account connected. Please connect Google Drive in the integrations page first.');
      } else if (googleIntegrations.length === 1) {
        setSelectedIntegration(googleIntegrations[0].id);
        console.log('[GoogleDriveModal] Auto-selected integration:', googleIntegrations[0].id);
      }
    } catch (error) {
      console.error('[GoogleDriveModal] Error loading integrations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load Google Drive integrations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFiles = async () => {
    if (!selectedIntegration) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/google-drive/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integration_id: selectedIntegration,
          folder_id: currentFolder,
          page_size: 100,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle authentication errors specially
        if (response.status === 401 && errorData.detail?.error === 'authentication_required') {
          throw new Error('Google Drive access expired. Please reconnect your Google account in the integrations page to continue.');
        }
        
        throw new Error(errorData.detail?.message || errorData.detail || 'Failed to load files');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setFiles(data.files || []);
        // Update folder path
        if (currentFolder !== 'root') {
          updateFolderPath();
        } else {
          setFolderPath('/');
        }
      } else {
        throw new Error(data.error || 'Failed to load files');
      }
    } catch (error) {
      console.error('Error loading files:', error);
      setError(error instanceof Error ? error.message : 'Failed to load files from Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFolderPath = async () => {
    if (!selectedIntegration || currentFolder === 'root') return;
    
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/google-drive/folders/${currentFolder}/path?integration_id=${selectedIntegration}`);
      const data = await response.json();
      
      if (data.success) {
        setFolderPath(data.path);
      }
    } catch (error) {
      console.error('Error getting folder path:', error);
    }
  };

  const searchFiles = async () => {
    if (!selectedIntegration || !searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      setError(null);
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/google-drive/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integration_id: selectedIntegration,
          query: `name contains '${searchQuery}'`,
          page_size: 100,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle authentication errors specially
        if (response.status === 401 && errorData.detail?.error === 'authentication_required') {
          throw new Error('Google Drive access expired. Please reconnect your Google account in the integrations page to continue.');
        }
        
        throw new Error(errorData.detail?.message || errorData.detail || 'Failed to search files');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setFiles(data.files || []);
      } else {
        throw new Error(data.error || 'Failed to search files');
      }
    } catch (error) {
      console.error('Error searching files:', error);
      setError(error instanceof Error ? error.message : 'Failed to search files');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileSelection = (fileId: string, selected: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (selected) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleFolderNavigation = (folderId: string) => {
    setCurrentFolder(folderId);
    setSelectedFiles(new Set());
  };

  const handleBack = () => {
    // Navigate back to parent folder
    // This is a simplified implementation - in production you'd maintain a proper folder history
    setCurrentFolder('root');
  };

  const handleImport = () => {
    const selectedFileObjects = files.filter(file => selectedFiles.has(file.id));
    onFilesSelected(selectedFileObjects, selectedIntegration);
    setIsOpen(false);
    setSelectedFiles(new Set());
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('folder')) return <Folder className="w-4 h-4" />;
    if (mimeType.includes('document') || mimeType.includes('text')) return <FileText className="w-4 h-4" />;
    if (mimeType.includes('image')) return <FileImage className="w-4 h-4" />;
    if (mimeType.includes('video')) return <FileVideo className="w-4 h-4" />;
    if (mimeType.includes('audio')) return <FileAudio className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType.includes('document')) return 'bg-blue-100 text-blue-800';
    if (mimeType.includes('spreadsheet')) return 'bg-green-100 text-green-800';
    if (mimeType.includes('presentation')) return 'bg-orange-100 text-orange-800';
    if (mimeType.includes('pdf')) return 'bg-red-100 text-red-800';
    if (mimeType.includes('image')) return 'bg-purple-100 text-purple-800';
    if (mimeType.includes('video')) return 'bg-pink-100 text-pink-800';
    if (mimeType.includes('audio')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6zm0 2h7v5h5v11H6V4z"/>
            </svg>
            Import from Google Drive
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Import from Google Drive</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Integration Selection */}
          {integrations.length > 1 && (
            <div className="mb-4 flex-shrink-0">
              <label className="text-sm font-medium mb-2 block">Select Google Account</label>
              <select 
                value={selectedIntegration} 
                onChange={(e) => setSelectedIntegration(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select an account...</option>
                {integrations.map((integration) => (
                  <option key={integration.id} value={integration.id}>
                    {integration.metadata.name || integration.name} ({integration.metadata.email || 'Google Account'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedIntegration && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                <TabsTrigger value="browse">Browse Files</TabsTrigger>
                <TabsTrigger value="search">Search</TabsTrigger>
              </TabsList>
              
              <TabsContent value="browse" className="flex-1 flex flex-col min-h-0 mt-4">
                {/* Navigation */}
                <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                  {currentFolder !== 'root' && (
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      ← Back
                    </Button>
                  )}
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <FolderOpen className="w-4 h-4" />
                    <span>{folderPath}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={loadFiles}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {/* Files List */}
                <ScrollArea className="h-[400px] border rounded-md">
                  {isLoading ? (
                    <div className="p-4 space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="w-4 h-4" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="w-16 h-4" />
                        </div>
                      ))}
                    </div>
                  ) : files.length > 0 ? (
                    <div className="p-2">
                      {files.map((file) => (
                        <div 
                          key={file.id} 
                          className={`flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer ${
                            file.mimeType.includes('folder') ? 'border-b' : ''
                          }`}
                          onClick={() => {
                            if (file.mimeType.includes('folder')) {
                              handleFolderNavigation(file.id);
                            }
                          }}
                        >
                          {!file.mimeType.includes('folder') && (
                            <Checkbox
                              checked={selectedFiles.has(file.id)}
                              onCheckedChange={(checked) => 
                                handleFileSelection(file.id, checked as boolean)
                              }
                              disabled={!file.can_process}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          
                          <div className="flex items-center gap-2 flex-1">
                            {getFileIcon(file.mimeType)}
                            <span className="font-medium">{file.name}</span>
                            {file.mimeType.includes('folder') && (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!file.mimeType.includes('folder') && (
                              <>
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${getFileTypeColor(file.mimeType)}`}
                                >
                                  {file.source_type}
                                </Badge>
                                {!file.can_process && (
                                  <Badge variant="destructive" className="text-xs">
                                    Not supported
                                  </Badge>
                                )}
                                {file.size && (
                                  <span className="text-sm text-gray-500">
                                    {formatFileSize(parseInt(file.size.toString()))}
                                  </span>
                                )}
                              </>
                            )}
                            <span className="text-sm text-gray-500">
                              {formatDate(file.modifiedTime)}
                            </span>
                            {file.webViewLink && (
                              <a 
                                href={file.webViewLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      <div className="text-center">
                        <Folder className="w-8 h-8 mx-auto mb-2" />
                        <p>No files found in this folder</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="search" className="flex-1 flex flex-col min-h-0 mt-4">
                <div className="flex gap-2 mb-4 flex-shrink-0">
                  <Input
                    placeholder="Search files and folders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchFiles()}
                  />
                  <Button 
                    onClick={searchFiles} 
                    disabled={isSearching || !searchQuery.trim()}
                  >
                    <Search className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                <ScrollArea className="h-[400px] border rounded-md">
                  {isSearching ? (
                    <div className="p-4 space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="w-4 h-4" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="w-16 h-4" />
                        </div>
                      ))}
                    </div>
                  ) : files.length > 0 ? (
                    <div className="p-2">
                      {files.map((file) => (
                        <div 
                          key={file.id} 
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50"
                        >
                          {!file.mimeType.includes('folder') && (
                            <Checkbox
                              checked={selectedFiles.has(file.id)}
                              onCheckedChange={(checked) => 
                                handleFileSelection(file.id, checked as boolean)
                              }
                              disabled={!file.can_process}
                            />
                          )}
                          
                          <div className="flex items-center gap-2 flex-1">
                            {getFileIcon(file.mimeType)}
                            <span className="font-medium">{file.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!file.mimeType.includes('folder') && (
                              <>
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${getFileTypeColor(file.mimeType)}`}
                                >
                                  {file.source_type}
                                </Badge>
                                {!file.can_process && (
                                  <Badge variant="destructive" className="text-xs">
                                    Not supported
                                  </Badge>
                                )}
                              </>
                            )}
                            {file.webViewLink && (
                              <a 
                                href={file.webViewLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery && !isSearching ? (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      <div className="text-center">
                        <Search className="w-8 h-8 mx-auto mb-2" />
                        <p>No files found matching "{searchQuery}"</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      <div className="text-center">
                        <Search className="w-8 h-8 mx-auto mb-2" />
                        <p>Enter search terms to find files</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}

          {error && (
            <Alert className="mt-4 flex-shrink-0">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t flex-shrink-0">
            <div className="text-sm text-gray-600">
              {selectedFiles.size > 0 && (
                <span>{selectedFiles.size} file(s) selected</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport}
                disabled={selectedFiles.size === 0}
              >
                Import Selected Files
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}