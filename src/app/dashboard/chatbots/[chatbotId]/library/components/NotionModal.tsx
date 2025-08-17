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
  FileText, 
  Search,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Database,
  Calendar,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface NotionPage {
  id: string;
  title: string;
  url?: string;
  created_time: string;
  last_edited_time: string;
  parent: {
    type: string;
    id?: string;
  };
  archived: boolean;
  icon?: any;
  cover?: any;
  can_process: boolean;
  source_type: string;
}

interface NotionIntegration {
  id: string;
  type: string;
  name: string;
  connectedAt: string;
  metadata: {
    email?: string;
    name?: string;
    workspace_name?: string;
  };
}

interface NotionModalProps {
  chatbotId: string;
  onPagesSelected: (pages: NotionPage[], integrationId: string) => void;
  trigger?: React.ReactNode;
}

export default function NotionModal({ chatbotId, onPagesSelected, trigger }: NotionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [integrations, setIntegrations] = useState<NotionIntegration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string>('');
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('search');
  
  // Load Notion integrations
  useEffect(() => {
    if (isOpen) {
      loadIntegrations();
    }
  }, [isOpen]);

  // Load pages when integration changes or search tab is activated
  useEffect(() => {
    if (selectedIntegration && activeTab === 'search') {
      searchPages();
    }
  }, [selectedIntegration, activeTab]);

  const loadIntegrations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[NotionModal] Loading Notion integrations...');
      
      const response = await fetch('/api/dashboard/integrations');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[NotionModal] Integrations response:', data);
      
      // The API returns a flat array, not data.integrations
      const allIntegrations = Array.isArray(data) ? data : [];
      const notionIntegrations = allIntegrations.filter(
        (integration: any) => integration.type === 'notion'
      ) || [];
      
      console.log('[NotionModal] Found Notion integrations:', notionIntegrations);
      
      setIntegrations(notionIntegrations);
      
      if (notionIntegrations.length === 0) {
        setError('No Notion workspace connected. Please connect Notion in the integrations page first.');
      } else if (notionIntegrations.length === 1) {
        setSelectedIntegration(notionIntegrations[0].id);
        console.log('[NotionModal] Auto-selected integration:', notionIntegrations[0].id);
      }
    } catch (error) {
      console.error('[NotionModal] Error loading integrations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load Notion integrations');
    } finally {
      setIsLoading(false);
    }
  };

  const searchPages = async (query: string = searchQuery) => {
    if (!selectedIntegration) return;
    
    try {
      setIsSearching(true);
      setError(null);
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/notion/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integration_id: selectedIntegration,
          query: query,
          page_size: 50,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle authentication errors specially
        if (response.status === 401 && errorData.detail?.error === 'authentication_required') {
          throw new Error('Notion access expired. Please reconnect your Notion account in the integrations page to continue.');
        }
        
        throw new Error(errorData.detail?.message || errorData.detail || 'Failed to search pages');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setPages(data.pages || []);
      } else {
        throw new Error(data.error || 'Failed to search pages');
      }
    } catch (error) {
      console.error('Error searching Notion pages:', error);
      setError(error instanceof Error ? error.message : 'Failed to search pages in Notion');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePageSelection = (pageId: string, selected: boolean) => {
    const newSelected = new Set(selectedPages);
    if (selected) {
      newSelected.add(pageId);
    } else {
      newSelected.delete(pageId);
    }
    setSelectedPages(newSelected);
  };

  const handleImport = () => {
    const selectedPageObjects = pages.filter(page => selectedPages.has(page.id));
    onPagesSelected(selectedPageObjects, selectedIntegration);
    setIsOpen(false);
    setSelectedPages(new Set());
  };

  const getPageIcon = (page: NotionPage) => {
    if (page.parent?.type === 'database') {
      return <Database className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const getPageTypeColor = (page: NotionPage) => {
    if (page.parent?.type === 'database') {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return formatDate(dateString);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.459 4.208c0-.456.137-.799.41-1.029.274-.23.662-.345 1.164-.345h4.933c.502 0 .89.115 1.164.345.273.23.41.573.41 1.029v15.584c0 .456-.137.799-.41 1.029-.274.23-.662.345-1.164.345H6.033c-.502 0-.89-.115-1.164-.345-.273-.23-.41-.573-.41-1.029V4.208zM2.459 4.208c0-.955.325-1.731.975-2.329C4.084 1.282 4.93.875 6.033.875h4.933c1.103 0 1.949.407 2.539 1.004.65.598.975 1.374.975 2.329v15.584c0 .955-.325 1.731-.975 2.329-.59.597-1.436 1.004-2.539 1.004H6.033c-1.103 0-1.949-.407-2.539-1.004C2.784 21.523 2.459 20.747 2.459 19.792V4.208z"/>
            </svg>
            Import from Notion
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Import from Notion</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Integration Selection */}
          {integrations.length > 1 && (
            <div className="mb-4 flex-shrink-0">
              <label className="text-sm font-medium mb-2 block">Select Notion Workspace</label>
              <select 
                value={selectedIntegration} 
                onChange={(e) => setSelectedIntegration(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select a workspace...</option>
                {integrations.map((integration) => (
                  <option key={integration.id} value={integration.id}>
                    {integration.metadata.workspace_name || integration.name} ({integration.metadata.name || 'Notion Workspace'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedIntegration && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-1 flex-shrink-0">
                <TabsTrigger value="search">Search Pages</TabsTrigger>
              </TabsList>
              
              <TabsContent value="search" className="flex-1 flex flex-col min-h-0 mt-4">
                {/* Search */}
                <div className="flex gap-2 mb-4 flex-shrink-0">
                  <Input
                    placeholder="Search pages and databases..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchPages()}
                  />
                  <Button 
                    onClick={() => searchPages()} 
                    disabled={isSearching}
                  >
                    <Search className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => searchPages('')}
                    disabled={isSearching}
                  >
                    <RefreshCw className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {/* Pages List */}
                <ScrollArea className="h-[400px] border rounded-md">
                  {isSearching ? (
                    <div className="p-4 space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="w-4 h-4" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="w-16 h-4" />
                        </div>
                      ))}
                    </div>
                  ) : pages.length > 0 ? (
                    <div className="p-2">
                      {pages.map((page) => (
                        <div 
                          key={page.id} 
                          className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <Checkbox
                            checked={selectedPages.has(page.id)}
                            onCheckedChange={(checked) => 
                              handlePageSelection(page.id, checked as boolean)
                            }
                            disabled={!page.can_process || page.archived}
                          />
                          
                          <div className="flex items-center gap-2 flex-1">
                            {getPageIcon(page)}
                            <div className="flex-1">
                              <div className="font-medium">{page.title || 'Untitled'}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                <span>Last edited {formatRelativeTime(page.last_edited_time)}</span>
                                {page.parent?.type === 'database' && (
                                  <>
                                    <span>•</span>
                                    <Database className="w-3 h-3" />
                                    <span>Database item</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${getPageTypeColor(page)}`}
                            >
                              {page.source_type}
                            </Badge>
                            {page.archived && (
                              <Badge variant="destructive" className="text-xs">
                                Archived
                              </Badge>
                            )}
                            {!page.can_process && !page.archived && (
                              <Badge variant="destructive" className="text-xs">
                                Cannot process
                              </Badge>
                            )}
                            {page.url && (
                              <a 
                                href={page.url} 
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
                        <p>No pages found matching "{searchQuery}"</p>
                        <p className="text-sm">Try a different search term or browse all pages</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      <div className="text-center">
                        <FileText className="w-8 h-8 mx-auto mb-2" />
                        <p>Search for pages in your Notion workspace</p>
                        <p className="text-sm">Enter keywords or leave empty to see all accessible pages</p>
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
              {selectedPages.size > 0 && (
                <span>{selectedPages.size} page(s) selected</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport}
                disabled={selectedPages.size === 0}
              >
                Import Selected Pages
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}