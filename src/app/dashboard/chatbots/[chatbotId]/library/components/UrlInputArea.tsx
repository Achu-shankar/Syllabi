"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link as LinkIcon, Plus } from 'lucide-react';

interface UrlInputAreaProps {
  chatbotId: string;
}

export default function UrlInputArea({ chatbotId }: UrlInputAreaProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!url.trim()) {
      console.log('No URL provided');
      return;
    }

    if (!isValidUrl(url)) {
      console.log('Invalid URL format:', url);
      return;
    }

    setIsLoading(true);

    // Phase 1: Just log to console
    console.log('Submitting URL for chatbot:', chatbotId);
    console.log('URL:', url);
    console.log('Title:', title || 'Auto-generated from webpage');

    // TODO Phase 3: Implement actual backend API call
    
    // Simulate processing time
    setTimeout(() => {
      setIsLoading(false);
      setUrl('');
      setTitle('');
      console.log('URL submission completed (simulated)');
    }, 1000);
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Add Website URL
        </CardTitle>
        <CardDescription>
          Add content from a webpage or online resource to your chatbot's knowledge base.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={handleUrlChange}
              disabled={isLoading}
              required
            />
            {url && !isValidUrl(url) && (
              <p className="text-sm text-destructive">
                Please enter a valid URL
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="Custom title for this source"
              value={title}
              onChange={handleTitleChange}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              If not provided, the title will be extracted from the webpage
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !url.trim() || !isValidUrl(url)}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add URL
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground">
            <strong>Supported sites:</strong> Most websites, articles, documentation, blogs, and public pages. 
            Note that some sites may block automated access.
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 