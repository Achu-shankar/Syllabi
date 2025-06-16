"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link as LinkIcon, Plus, Loader2, AlertTriangle } from 'lucide-react';

interface UrlInputAreaProps {
  chatbotId: string;
  userId: string | null;
  onUrlAdded?: () => void;
  startUrlIngestion: (url: string, title?: string) => Promise<void>;
}

export default function UrlInputArea({ chatbotId, userId, onUrlAdded, startUrlIngestion }: UrlInputAreaProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    if (!userId) {
        console.warn("Cannot submit URL: userId not available.");
        return;
    }

    if (!url.trim() || !isValidUrl(url)) {
      console.log('Invalid URL provided for submission.');
      return;
    }

    setIsSubmitting(true);

    await startUrlIngestion(url, title || undefined); 

    setUrl('');
    setTitle('');
    setIsSubmitting(false);

    if (onUrlAdded) {
      onUrlAdded();
    }
  };

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Add Website URL
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" />
            <p className="text-muted-foreground">User information is not available. Please ensure you are logged in.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">Website URL *</Label>
          <Input
            id="url"
            type="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isSubmitting || !userId}
            required
          />
          {url && !isValidUrl(url) && (
            <p className="text-sm text-destructive">
              Please enter a valid URL (e.g., https://example.com)
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
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting || !userId}
          />
          <p className="text-xs text-muted-foreground">
            If not provided, the title might be auto-extracted from the webpage.
          </p>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !url.trim() || !isValidUrl(url) || !userId}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Submit URL for Processing
            </>
          )}
        </Button>
      </form>

      <div className="p-3 bg-muted/50 rounded-md border">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Webpage scraping success depends on site structure and permissions. Content will be processed and indexed.
        </p>
      </div>
    </div>
  );
} 