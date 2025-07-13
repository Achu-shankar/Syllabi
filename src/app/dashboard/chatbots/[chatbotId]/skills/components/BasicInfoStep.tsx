import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BasicInfoStepProps {
  formData: {
    display_name: string;
    description: string;
    name: string;
  };
  errors: {
    display_name?: string;
    description?: string;
  };
  onDisplayNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onFunctionNameChange: (value: string) => void;
}

export function BasicInfoStep({ formData, errors, onDisplayNameChange, onDescriptionChange, onFunctionNameChange }: BasicInfoStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Metadata</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="display_name" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Action name (shown to users)
              </Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                placeholder="e.g., Send Email, Create Task, Get Weather"
                className={cn(
                  "transition-all focus:ring-2 focus:ring-primary/20",
                  errors.display_name ? 'border-destructive focus:ring-destructive/20' : ''
                )}
              />
              {errors.display_name && (
                <p className="text-sm text-destructive flex items-center gap-2 mt-1">
                  <AlertTriangle className="h-4 w-4" />
                  {errors.display_name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Short description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="Describe what this action does and when it should be used..."
                className={cn(
                  "transition-all focus:ring-2 focus:ring-primary/20 min-h-[80px]",
                  errors.description ? 'border-destructive focus:ring-destructive/20' : ''
                )}
                rows={3}
                maxLength={200}
              />
              <div className="flex justify-between items-center">
                {errors.description ? (
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {errors.description}
                  </p>
                ) : (
                  <div />
                )}
                <span className="text-xs text-muted-foreground">
                  {formData.description.length}/200
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="function_name" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Function name
              </Label>
              <Input
                id="function_name"
                value={formData.name}
                onChange={(e) => onFunctionNameChange(e.target.value)}
                placeholder="Auto-generated from action name"
                className="font-mono text-sm transition-all focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                Used by your system for internal referencing. Lowercase letters, numbers, and underscores only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 