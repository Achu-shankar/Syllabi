import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

interface ReviewStepProps {
  formData: {
    display_name: string;
    description: string;
    name: string;
    category: string;
  };
  webhookFormData: {
    webhook_url: string;
    method: string;
    timeout_ms: number;
    headers: Record<string, string>;
  };
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    enum?: string[];
  }>;
  is_active: boolean;
  onActiveChange: (checked: boolean) => void;
}

export function ReviewStep({ formData, webhookFormData, parameters, is_active, onActiveChange }: ReviewStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Review & Save</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Review your action configuration before saving. You can always edit it later.
          </p>
          <div className="space-y-6">
            {/* Basic Info Summary */}
            <div>
              <h4 className="font-medium mb-3">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Display Name:</span>
                  <p className="font-medium">{formData.display_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Function Name:</span>
                  <p className="font-mono">{formData.name}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-medium">{formData.category}</p>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-muted-foreground">Description:</span>
                <p>{formData.description}</p>
              </div>
            </div>
            <Separator />
            {/* Webhook Summary */}
            <div>
              <h4 className="font-medium mb-3">Webhook Configuration</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">URL:</span>
                  <p className="font-mono break-all">{webhookFormData.webhook_url}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Method:</span>
                  <Badge variant="outline">{webhookFormData.method}</Badge>
                </div>
              </div>
              {Object.keys(webhookFormData.headers).length > 0 && (
                <div className="mt-2">
                  <span className="text-muted-foreground">Headers:</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(webhookFormData.headers).map(([key, value]) => (
                      <p key={key} className="text-xs font-mono bg-accent text-accent-foreground p-2 rounded">
                        {key}: {value}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Separator />
            {/* Parameters Summary */}
            <div>
              <h4 className="font-medium mb-3">Parameters ({parameters.length})</h4>
              {parameters.length === 0 ? (
                <p className="text-muted-foreground text-sm">No parameters defined</p>
              ) : (
                <div className="space-y-2">
                  {parameters.map((param, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="font-mono">{param.name}</span>
                      <Badge variant="secondary">{param.type}</Badge>
                      {param.required && <Badge variant="default" className="text-xs">Required</Badge>}
                      {param.enum && (
                        <Badge variant="outline" className="text-xs">
                          {param.enum.length} values
                        </Badge>
                      )}
                      <span className="text-muted-foreground">- {param.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Separator />
            {/* Status */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Action Status</h4>
                <p className="text-sm text-muted-foreground">
                  {is_active ? 'Active and ready to use' : 'Inactive'}
                </p>
              </div>
              <Switch
                checked={is_active}
                onCheckedChange={onActiveChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 