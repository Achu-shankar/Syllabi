import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, ChevronDown, ChevronRight, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Parameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  enum?: string[];
}

interface ParametersStepProps {
  parameters: Parameter[];
  expandedParameters: Set<number>;
  newEnumValue: Record<number, string>;
  onAddParameter: () => void;
  onUpdateParameter: (index: number, field: string, value: any) => void;
  onRemoveParameter: (index: number) => void;
  onToggleParameterExpansion: (index: number) => void;
  onToggleEnumMode: (index: number, hasEnum: boolean) => void;
  onAddEnumValue: (index: number, value: string) => void;
  onRemoveEnumValue: (paramIndex: number, enumIndex: number) => void;
  onEnumKeyPress: (paramIndex: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onNewEnumValueChange: (index: number, value: string) => void;
}

export function ParametersStep({
  parameters,
  expandedParameters,
  newEnumValue,
  onAddParameter,
  onUpdateParameter,
  onRemoveParameter,
  onToggleParameterExpansion,
  onToggleEnumMode,
  onAddEnumValue,
  onRemoveEnumValue,
  onEnumKeyPress,
  onNewEnumValueChange,
}: ParametersStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Function Parameters</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Define the parameters that users can provide when calling this action. These will be sent to your webhook.
          </p>
          <div className="space-y-4">
            {parameters.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <div className="flex flex-col items-center gap-3">
                  <Info className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">No parameters yet</p>
                    <p className="text-sm text-muted-foreground">
                      Parameters are optional. Your action can work without any parameters.
                    </p>
                  </div>
                  <Button onClick={onAddParameter} className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Parameter
                  </Button>
                </div>
              </div>
            )}
            {parameters.map((param, index) => (
              <Card
                key={index}
                className={cn(
                  "transition-all hover:scale-[1.01] hover:shadow-md",
                  expandedParameters.has(index) ? "ring-2 ring-border shadow-sm" : "bg-card",
                  !expandedParameters.has(index) ? 'bg-accent' : ''
                )}
              >
                <CardHeader
                  className="cursor-pointer hover:bg-accent/50 transition-colors p-4"
                  onClick={() => onToggleParameterExpansion(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedParameters.has(index) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {param.name || `Parameter ${index + 1}`}
                        </span>
                        <Badge variant="secondary" className="transition-colors hover:bg-primary/10">{param.type}</Badge>
                        {param.required && <Badge variant="default">Required</Badge>}
                        {param.enum && param.enum.length > 0 && (
                          <Badge variant="outline">{param.enum.length} values</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        onRemoveParameter(index);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                {expandedParameters.has(index) && (
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Parameter Name</Label>
                          <Input
                            value={param.name}
                            onChange={e => onUpdateParameter(index, 'name', e.target.value)}
                            placeholder="e.g., email, priority, amount"
                            className="transition-all focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</Label>
                          <select
                            value={param.type}
                            onChange={e => onUpdateParameter(index, 'type', e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="array">Array</option>
                            <option value="object">Object</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</Label>
                        <Textarea
                          value={param.description}
                          onChange={e => onUpdateParameter(index, 'description', e.target.value)}
                          placeholder="Describe what this parameter is used for..."
                          rows={2}
                          className="transition-all focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          checked={param.required}
                          onCheckedChange={checked => onUpdateParameter(index, 'required', checked)}
                        />
                        <Label>Required parameter</Label>
                      </div>
                      {/* Enum Configuration */}
                      {param.type === 'string' && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={param.enum !== undefined}
                                  onCheckedChange={checked => onToggleEnumMode(index, checked)}
                                />
                                <Label>Use predefined values (enum)</Label>
                              </div>
                              {param.enum !== undefined && (
                                <Badge variant="outline" className="text-xs">
                                  AI will only use these exact values
                                </Badge>
                              )}
                            </div>
                            {param.enum !== undefined && (
                              <Card className="bg-background">
                                <CardContent className="p-4 space-y-3">
                                  <Label className="text-sm">Allowed Values</Label>
                                  {param.enum.length > 0 && (
                                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto scrollbar-thin">
                                      {param.enum.map((enumValue, enumIndex) => (
                                        <Badge
                                          key={enumIndex}
                                          variant="secondary"
                                          className="pl-3 pr-1 py-1 flex items-center gap-1 transition-colors hover:bg-accent"
                                        >
                                          {enumValue}
                                          <button
                                            type="button"
                                            onClick={() => onRemoveEnumValue(index, enumIndex)}
                                            className="ml-1 rounded-full hover:bg-destructive/20 text-destructive p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                    <Input
                                      value={newEnumValue[index] || ''}
                                      onChange={e => onNewEnumValueChange(index, e.target.value)}
                                      onKeyPress={e => onEnumKeyPress(index, e)}
                                      placeholder="Type a value and press Enter"
                                      className="flex-1 transition-all focus:ring-2 focus:ring-primary/20"
                                    />
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      className="px-3"
                                      onClick={() => onAddEnumValue(index, newEnumValue[index] || '')}
                                    >
                                      + Add
                                    </Button>
                                  </div>
                                  {param.enum.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      Add at least one allowed value
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
            {parameters.length > 0 && (
              <Button onClick={onAddParameter} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Parameter
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 