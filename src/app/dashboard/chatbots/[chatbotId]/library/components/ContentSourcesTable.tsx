"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  FileText, 
  Link as LinkIcon, 
  MoreHorizontal, 
  Trash2, 
  Download,
  RefreshCw 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContentSourcesTableProps {
  chatbotId: string;
}

// Mock data for Phase 1 demonstration
const mockContentSources = [
  {
    id: '1',
    name: 'Introduction to AI.pdf',
    type: 'PDF',
    status: 'Indexed',
    dateAdded: '2024-01-15',
    size: '2.4 MB',
    indexingStatus: 'completed'
  },
  {
    id: '2', 
    name: 'Machine Learning Basics',
    type: 'URL',
    status: 'Processing',
    dateAdded: '2024-01-14',
    size: '-',
    indexingStatus: 'in_progress'
  },
  {
    id: '3',
    name: 'project_notes.txt',
    type: 'TXT',
    status: 'Failed',
    dateAdded: '2024-01-13',
    size: '156 KB',
    indexingStatus: 'failed'
  }
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Indexed':
      return <Badge variant="default" className="bg-green-500">Indexed</Badge>;
    case 'Processing':
      return <Badge variant="secondary">Processing</Badge>;
    case 'Failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'Pending':
      return <Badge variant="outline">Pending</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getFileIcon = (type: string) => {
  switch (type) {
    case 'URL':
      return <LinkIcon className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

export default function ContentSourcesTable({ chatbotId }: ContentSourcesTableProps) {
  const handleAction = (action: string, sourceId: string, sourceName: string) => {
    console.log(`${action} action for source:`, { sourceId, sourceName, chatbotId });
    
    // Phase 1: Just log to console
    // TODO Phase 5: Implement actual actions (delete, reindex, download)
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Sources</CardTitle>
        <CardDescription>
          {mockContentSources.length > 0 
            ? `${mockContentSources.length} source${mockContentSources.length > 1 ? 's' : ''} added to this chatbot's knowledge base.`
            : 'No content sources have been added yet.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mockContentSources.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Upload files or add URLs above to see them listed here.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockContentSources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        {getFileIcon(source.type)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[200px]">{source.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {source.type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(source.status)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {source.size}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(source.dateAdded).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {source.status === 'Failed' && (
                            <DropdownMenuItem 
                              onClick={() => handleAction('reindex', source.id, source.name)}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Retry Indexing
                            </DropdownMenuItem>
                          )}
                          {source.type !== 'URL' && (
                            <DropdownMenuItem 
                              onClick={() => handleAction('download', source.id, source.name)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleAction('delete', source.id, source.name)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 