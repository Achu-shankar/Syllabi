import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Plus, Trash2, Settings, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebhookStepProps {
  formData: {
    webhook_url: string;
    method: string;
    timeout_ms: number;
    headers: Record<string, string>;
  };
  errors: {
    webhook_url?: string;
  };
  showAdvanced: boolean;
  onWebhookUrlChange: (value: string) => void;
  onMethodChange: (value: string) => void;
  onTimeoutChange: (value: number) => void;
  onShowAdvancedChange: (open: boolean) => void;
  onAddHeader: () => void;
  onUpdateHeader: (oldKey: string, newKey: string, value: string) => void;
  onRemoveHeader: (key: string) => void;
}

export function WebhookStep({
  formData,
  errors,
  showAdvanced,
  onWebhookUrlChange,
  onMethodChange,
  onTimeoutChange,
  onShowAdvancedChange,
  onAddHeader,
  onUpdateHeader,
  onRemoveHeader,
}: WebhookStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Webhook Configuration</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Configure the external API endpoint that will be called when this action is triggered.
          </p>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="webhook_url" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Webhook URL
              </Label>
              <Input
                id="webhook_url"
                value={formData.webhook_url}
                onChange={(e) => onWebhookUrlChange(e.target.value)}
                placeholder="https://api.example.com/webhook"
                className={cn(
                  "font-mono text-sm transition-all focus:ring-2 focus:ring-primary/20",
                  errors.webhook_url ? 'border-destructive focus:ring-destructive/20' : ''
                )}
              />
              {errors.webhook_url && (
                <p className="text-sm text-destructive flex items-center gap-2 mt-1">
                  <AlertTriangle className="h-4 w-4" />
                  {errors.webhook_url}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="method" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  HTTP Method
                </Label>
                <select
                  id="method"
                  value={formData.method}
                  onChange={(e) => onMethodChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Timeout (ms)
                </Label>
                <Input
                  id="timeout"
                  type="number"
                  value={formData.timeout_ms}
                  onChange={(e) => onTimeoutChange(Number(e.target.value))}
                  min={1000}
                  max={30000}
                  className="transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </div>
        <Separator />
        <div>
          <h2 className="text-lg font-semibold mb-2">Advanced Configuration</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Optional headers and advanced settings for your webhook.
          </p>
          <Collapsible open={showAdvanced} onOpenChange={onShowAdvancedChange}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full bg-secondary hover:bg-secondary/80 transition-colors">
                <Settings className="h-4 w-4 mr-2" />
                Advanced Options
                {showAdvanced ? <ChevronDown className="h-4 w-4 ml-2" /> : <ChevronRight className="h-4 w-4 ml-2" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="data-[state=open]:animate-slideDown">
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>HTTP Headers</CardTitle>
                  <CardDescription>
                    Add authentication headers and other HTTP headers required by your API.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  {Object.entries(formData.headers).length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed rounded-lg">
                      <p className="text-muted-foreground mb-3">No headers configured</p>
                      <Button onClick={onAddHeader} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Header
                      </Button>
                    </div>
                  )}
                  {Object.entries(formData.headers).map(([key, value]) => (
                    <div key={key} className="flex gap-2 p-3 border rounded-lg">
                      <Input
                        placeholder="Header name"
                        value={key}
                        onChange={(e) => onUpdateHeader(key, e.target.value, value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Header value"
                        value={value}
                        onChange={(e) => onUpdateHeader(key, key, e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRemoveHeader(key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {Object.entries(formData.headers).length > 0 && (
                    <Button onClick={onAddHeader} variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Header
                    </Button>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
} 