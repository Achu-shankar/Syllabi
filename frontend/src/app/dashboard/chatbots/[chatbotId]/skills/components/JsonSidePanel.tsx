import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Copy, AlignLeft, Loader2 } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css'; // Or your preferred theme
import { cn } from '@/lib/utils';

interface JsonSidePanelProps {
  json: string;
  onJsonChange: (value: string) => void;
}

export function JsonSidePanel({ json, onJsonChange }: JsonSidePanelProps) {
  const [editValue, setEditValue] = useState(json);
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    setEditValue(json);
  }, [json]);

  const handleValueChange = (code: string) => {
    setEditValue(code);
    try {
      JSON.parse(code);
      setLocalError(undefined);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Invalid JSON format');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editValue);
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 1000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(editValue);
      const formatted = JSON.stringify(parsed, null, 2);
      setEditValue(formatted);
      setLocalError(undefined);
    } catch (error) {
      // Do nothing, error is already shown
    }
  };

  return (
    <div className="flex-1 p-4 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4 pr-10">
        <div>
          <h3 className="font-medium">Live Preview & Editor</h3>
          <p className="text-sm text-muted-foreground">
            Edit the JSON and apply your changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} title="Copy JSON">
            {isCopying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleFormat} title="Format JSON">
            <AlignLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className={cn("flex-1 border rounded-md overflow-y-auto", localError && "border-destructive")}>
        <Editor
          value={editValue}
          onValueChange={handleValueChange}
          highlight={code => highlight(code, languages.json, 'json')}
          padding={10}
          className="font-mono text-xs bg-background w-full min-h-full"
          style={{
            fontFamily: '"Fira Code", "Fira Mono", monospace',
            fontSize: 12,
          }}
          textareaClassName="outline-none bg-transparent"
        />
      </div>
      {localError && (
        <p className="text-sm text-destructive flex items-center gap-1 mt-2">
          <AlertTriangle className="h-4 w-4" />
          {localError}
        </p>
      )}
      <Button
        className="mt-4 self-end"
        onClick={() => onJsonChange(editValue)}
        disabled={!!localError}
      >
        Apply JSON Changes
      </Button>
    </div>
  );
} 