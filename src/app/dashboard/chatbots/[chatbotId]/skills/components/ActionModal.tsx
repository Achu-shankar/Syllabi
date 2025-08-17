'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';


import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Save, 
  Loader2, 
  AlertTriangle, 
  Plus,
  Trash2,
  Settings,
  ChevronDown,
  ChevronRight,
  X,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Info,
  Copy,
  AlignLeft
} from 'lucide-react';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';
import { useSkills } from '../hooks/useSkills';
import { type Skill } from '@/app/dashboard/libs/skills_db_queries_v2';
import { cn } from '@/lib/utils';
import { RainbowButton } from '@/components/magicui/rainbow-button';

interface ActionModalProps {
  mode: 'create' | 'edit';
  action?: Skill;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatbotId: string;
}

interface FormData {
  display_name: string;
  description: string;
  name: string;
  webhook_url: string;
  method: string;
  headers: Record<string, string>;
  timeout_ms: number;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    enum?: string[];
  }>;
  is_active: boolean;
}

type WizardStep = 'basic' | 'webhook' | 'parameters' | 'review';

// Simple JSON code editor with syntax highlighting
function CodeEditor({ 
  value, 
  onChange, 
  placeholder,
  error 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
  error?: string;
}) {
  const overlayRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Debug onChange
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    console.log('Editor onChange called with:', newValue);
    onChange(newValue);
    
    // Restore cursor position after React re-render
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = cursorPos;
        textareaRef.current.selectionEnd = cursorPos;
      }
    }, 0);
  };

  // Sync scrolling from textarea to overlay
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = e.currentTarget.scrollTop;
      overlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  return (
    <div className="w-full">
      <div className={cn(
        "w-full border rounded-md overflow-hidden",
        error ? "border-destructive" : "border-border"
      )}>
        <div className="relative h-[400px] bg-background">
          {/* Syntax highlighted overlay */}
          <pre
            ref={overlayRef}
            className="absolute top-0 left-0 p-3 font-mono text-xs pointer-events-none h-full w-full overflow-hidden"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 12,
              lineHeight: '1.5rem',
              whiteSpace: 'pre',
              overflowWrap: 'normal',
              wordBreak: 'normal'
            }}
            dangerouslySetInnerHTML={{ 
              __html: highlight(value || placeholder || '', languages.json) 
            }}
          />
          
          {/* Editable textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onScroll={handleScroll}
            placeholder={placeholder || "Enter JSON here..."}
            className="absolute top-0 left-0 w-full h-full p-3 font-mono text-xs bg-transparent resize-none focus:outline-none overflow-auto"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 12,
              lineHeight: '1.5rem',
              whiteSpace: 'pre',
              overflowWrap: 'normal',
              wordBreak: 'normal',
              color: 'transparent',
              caretColor: 'var(--foreground)',
              WebkitTextFillColor: 'transparent'
            }}
            spellCheck={false}
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1 mt-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}

export function ActionModal({ 
  mode,
  action,
  open, 
  onOpenChange, 
  chatbotId 
}: ActionModalProps) {
  const { createSkill, updateSkill, isCreating, isUpdating } = useSkills(chatbotId);
  
  // Form data state
  const [formData, setFormData] = useState<FormData>({
    display_name: '',
    description: '',
    name: '',
    webhook_url: '',
    method: 'POST',
    headers: {},
    timeout_ms: 10000,
    parameters: [],
    is_active: true,
  });
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  
  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedParameters, setExpandedParameters] = useState<Set<number>>(new Set());
  const [newEnumValue, setNewEnumValue] = useState<Record<number, string>>({});
  const [isCopying, setIsCopying] = useState(false);
  
  // JSON Editor state - completely independent
  const [jsonValue, setJsonValue] = useState<string>('');
  const [jsonError, setJsonError] = useState<string>('');

  const steps: Array<{ key: WizardStep; title: string; description: string }> = [
    { key: 'basic', title: 'Basic Info', description: 'Name and description' },
    { key: 'webhook', title: 'Webhook', description: 'URL and configuration' },
    { key: 'parameters', title: 'Parameters', description: 'Function parameters' },
    { key: 'review', title: 'Review', description: 'Final review and save' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  // Initialize form data when action changes or modal opens
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && action) {
        const config = action.configuration?.webhook_config || {};
        const schema = action.function_schema?.parameters || {};
        
        // Extract parameters from schema
        const parameters: Array<{name: string; type: string; description: string; required: boolean; enum?: string[]}> = [];
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([name, prop]: [string, any]) => {
            parameters.push({
              name,
              type: prop.type || 'string',
              description: prop.description || '',
              required: (schema.required || []).includes(name),
              enum: prop.enum || undefined
            });
          });
        }

        setFormData({
          display_name: action.display_name || action.name,
          description: action.description,
          name: action.name,
          webhook_url: config.url || '',
          method: config.method || 'POST',
          headers: config.headers || {},
          timeout_ms: config.timeout_ms || 10000,
          parameters,
          is_active: action.is_active,
        });
        
        // Mark all steps as completed for edit mode
        setCompletedSteps(new Set(['basic', 'webhook', 'parameters']));
        setCurrentStep('basic');
      } else {
        // Reset for create mode
        const defaultFormData = {
          display_name: '',
          description: '',
          name: '',
          webhook_url: '',
          method: 'POST',
          headers: {},
          timeout_ms: 10000,
          parameters: [],
          is_active: true,
        };
        setFormData(defaultFormData);
        setCompletedSteps(new Set());
        setCurrentStep('basic');
      }
      
      setErrors({});
      setExpandedParameters(new Set());
      setNewEnumValue({});
      setShowAdvanced(false);
      setShowJsonPreview(false);
      setJsonError('');
    }
  }, [mode, action, open]);

  // Sync JSON editor with form data
  useEffect(() => {
    if (open) {
      const jsonString = JSON.stringify(buildUniversalJson(formData), null, 2);
      setJsonValue(jsonString);
    }
  }, [formData, open]);

  // Handle JSON editor changes
  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    setJsonError('');
    
    try {
      const parsed = JSON.parse(value);
      
      // Try to update form data if JSON is valid and has expected structure
      if (parsed && typeof parsed === 'object') {
        // Update basic info
        if (parsed.display_name && typeof parsed.display_name === 'string') {
          setFormData(prev => ({ ...prev, display_name: parsed.display_name }));
        }
        if (parsed.description && typeof parsed.description === 'string') {
          setFormData(prev => ({ ...prev, description: parsed.description }));
        }
        if (parsed.name && typeof parsed.name === 'string') {
          setFormData(prev => ({ ...prev, name: parsed.name }));
        }
        
        // Update webhook config
        if (parsed.configuration?.webhook_config) {
          const config = parsed.configuration.webhook_config;
          setFormData(prev => ({
            ...prev,
            webhook_url: config.url || prev.webhook_url,
            method: config.method || prev.method,
            headers: config.headers || prev.headers,
            timeout_ms: config.timeout_ms || prev.timeout_ms
          }));
        }
        
        // Update parameters
        if (parsed.function_schema?.parameters?.properties) {
          const props = parsed.function_schema.parameters.properties;
          const required = parsed.function_schema.parameters.required || [];
          
          const parameters: Array<{name: string; type: string; description: string; required: boolean; enum?: string[]}> = [];
          Object.entries(props).forEach(([name, prop]: [string, any]) => {
            parameters.push({
              name,
              type: prop.type || 'string',
              description: prop.description || '',
              required: required.includes(name),
              enum: prop.enum || undefined
            });
          });
          
          setFormData(prev => ({ ...prev, parameters }));
        }
        
        // Update status
        if (typeof parsed.is_active === 'boolean') {
          setFormData(prev => ({ ...prev, is_active: parsed.is_active }));
        }
      }
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  // Helper function to build universal JSON from form data
  const buildUniversalJson = (data: FormData) => {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    data.parameters.forEach(param => {
      if (param.name) {
        const paramConfig: any = {
          type: param.type,
          description: param.description || `${param.name} parameter`
        };
        
        // Add enum if it exists
        if (param.enum && param.enum.length > 0) {
          paramConfig.enum = param.enum;
        }
        
        properties[param.name] = paramConfig;
        if (param.required) {
          required.push(param.name);
        }
      }
    });

    return {
      name: data.name,
      display_name: data.display_name,
      description: data.description,
      skill_type: 'webhook',
      function_schema: {
        name: data.name,
        description: data.description,
        parameters: {
          type: 'object',
          properties,
          required
        }
      },
      configuration: {
        webhook_config: {
          url: data.webhook_url,
          method: data.method,
          headers: data.headers,
          timeout_ms: data.timeout_ms
        }
      },
      is_active: data.is_active
    };
  };

  const generateFunctionName = (displayName: string) => {
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleDisplayNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      display_name: value,
      name: generateFunctionName(value)
    }));
    
    // Clear validation error when user starts typing
    if (errors.display_name && value.trim()) {
      setErrors(prev => ({ ...prev, display_name: '' }));
    }
  };

  // Parameter management
  const addParameter = () => {
    const newIndex = formData.parameters.length;
    setFormData(prev => ({
      ...prev,
      parameters: [
        ...prev.parameters,
        { name: '', type: 'string', description: '', required: false, enum: undefined }
      ]
    }));
    setExpandedParameters(prev => new Set([...prev, newIndex]));
  };

  const updateParameter = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.map((param, i) => 
        i === index ? { ...param, [field]: value } : param
      )
    }));
  };

  const removeParameter = (index: number) => {
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index)
    }));
    setExpandedParameters(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      // Adjust indices for remaining parameters
      const adjustedSet = new Set<number>();
      newSet.forEach(i => {
        if (i > index) adjustedSet.add(i - 1);
        else if (i < index) adjustedSet.add(i);
      });
      return adjustedSet;
    });
  };

  const toggleParameterExpansion = (index: number) => {
    setExpandedParameters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Enum management
  const toggleEnumMode = (paramIndex: number, hasEnum: boolean) => {
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.map((param, i) => 
        i === paramIndex 
          ? { 
              ...param, 
              enum: hasEnum ? [] : undefined
            }
          : param
      )
    }));
  };

  const handleAddEnumValue = (paramIndex: number, value: string) => {
    if (!value.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.map((param, i) => 
        i === paramIndex 
          ? { 
              ...param, 
              enum: [...(param.enum || []), value.trim()]
            }
          : param
      )
    }));
    
    setNewEnumValue(prev => ({ ...prev, [paramIndex]: '' }));
  };

  const removeEnumValue = (paramIndex: number, enumIndex: number) => {
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.map((param, i) => 
        i === paramIndex 
          ? { 
              ...param, 
              enum: param.enum?.filter((_, ei) => ei !== enumIndex) || []
            }
          : param
      )
    }));
  };

  const handleEnumKeyPress = (paramIndex: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = newEnumValue[paramIndex] || '';
      handleAddEnumValue(paramIndex, value);
    }
  };

  // Header management
  const addHeader = () => {
    const headerName = `Authorization`;
    setFormData(prev => ({
      ...prev,
      headers: { ...prev.headers, [headerName]: 'Bearer your-api-key' }
    }));
  };

  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    setFormData(prev => {
      const headers = { ...prev.headers };
      if (oldKey !== newKey) {
        delete headers[oldKey];
      }
      headers[newKey] = value;
      return { ...prev, headers };
    });
  };

  const removeHeader = (key: string) => {
    setFormData(prev => {
      const headers = { ...prev.headers };
      delete headers[key];
      return { ...prev, headers };
    });
  };

  // Step validation
  const validateStep = (step: WizardStep): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 'basic':
        if (!formData.display_name.trim()) {
          newErrors.display_name = 'Display name is required';
        }
        if (!formData.description.trim()) {
          newErrors.description = 'Description is required';
        }
        break;
      
      case 'webhook':
        if (!formData.webhook_url.trim()) {
          newErrors.webhook_url = 'Webhook URL is required';
        } else {
          try {
            new URL(formData.webhook_url);
          } catch {
            newErrors.webhook_url = 'Invalid URL format';
          }
        }
        break;
      
      case 'parameters':
        // Parameters are optional, so no validation needed
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goToStep = (step: WizardStep) => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    const stepIndex = steps.findIndex(s => s.key === currentStep);
    if (stepIndex < steps.length - 1) {
      goToStep(steps[stepIndex + 1].key);
    }
  };

  const prevStep = () => {
    const stepIndex = steps.findIndex(s => s.key === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].key);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep('review')) return;

    const properties: Record<string, any> = {};
    const required: string[] = [];

    formData.parameters.forEach(param => {
      if (param.name) {
        const paramConfig: any = {
          type: param.type,
          description: param.description || `${param.name} parameter`
        };
        
        if (param.enum && param.enum.length > 0) {
          paramConfig.enum = param.enum;
        }
        
        properties[param.name] = paramConfig;
        if (param.required) {
          required.push(param.name);
        }
      }
    });

    const function_schema = {
      name: formData.name,
      description: formData.description,
      parameters: {
        type: 'object',
        properties,
        required
      }
    };

    const configuration = {
      webhook_config: {
        url: formData.webhook_url,
        method: formData.method,
        headers: formData.headers,
        timeout_ms: formData.timeout_ms,
        retry_attempts: 3
      }
    };

    if (mode === 'create') {
      await createSkill({
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description,
        skill_type: 'webhook',
        configuration,
        function_schema,
        is_active: formData.is_active
      });
    } else if (mode === 'edit' && action) {
      await updateSkill({
        skillId: action.id,
        updates: {
          display_name: formData.display_name,
          description: formData.description,
          configuration,
          function_schema,
          is_active: formData.is_active,
        }
      });
    }

    onOpenChange(false);
  };

  const isLoading = mode === 'create' ? isCreating : isUpdating;

  // Copy handler with animation
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonValue);
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 1000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] h-[90vh] p-0 flex flex-col bg-background shadow-2xl">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm z-10 px-6 py-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold">
                    {mode === 'create' ? 'Create New Action' : `Edit Action: ${action?.display_name || action?.name}`}
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-base text-muted-foreground">
                    {mode === 'create' 
                      ? 'Create a custom webhook action for your chatbot'
                      : 'Update your action configuration and parameters'
                    }
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Tabs value={showJsonPreview ? "json" : "form"} onValueChange={(value) => setShowJsonPreview(value === "json")}>
                    <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-full h-auto">
                      <TabsTrigger value="form" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground py-1.5">Form View</TabsTrigger>
                      <TabsTrigger value="json" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground py-1.5">JSON View</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
              
              {/* Progress Stepper */}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  {steps.map((step, index) => {
                    const isCompleted = completedSteps.has(step.key);
                    const isActive = currentStep === step.key;
                    const isReachable = isCompleted || isActive || (mode === 'edit') || (index > 0 && completedSteps.has(steps[index-1].key));

                    return (
                    <div key={step.key} className="flex items-center flex-1">
                      <div 
                        className={cn(
                          "flex items-center gap-3 transition-all duration-200",
                          index > 0 && "pl-4",
                          isReachable ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                        )}
                        onClick={() => isReachable && goToStep(step.key)}
                      >
                        {/* Step Number/Status */}
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200",
                          isActive
                            ? "bg-primary border-primary text-primary-foreground shadow-md" 
                            : isCompleted
                              ? "bg-green-500/10 border-green-500/50 text-green-600"
                              : "bg-muted border-border text-muted-foreground"
                        )}>
                          {isCompleted && !isActive ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <span className="text-sm font-medium">{index + 1}</span>
                          )}
                        </div>
                        
                        {/* Step Labels */}
                        <div className="min-w-0">
                          <div className={cn(
                            "text-sm font-medium transition-colors",
                            isActive
                              ? "text-primary" 
                              : isCompleted
                                ? "text-foreground"
                                : "text-muted-foreground"
                          )}>
                            {step.title}
                          </div>
                          <div className="text-xs text-muted-foreground hidden sm:block">
                            {step.description}
                          </div>
                        </div>
                      </div>
                      
                      {/* Connector Line */}
                      {index < steps.length - 1 && (
                        <div className={cn(
                          "flex-1 h-0.5 mx-4 transition-colors duration-300",
                          isCompleted ? "bg-green-500/20" : "bg-border"
                        )} />
                      )}
                    </div>
                  )})}
                </div>
              </div>
            </DialogHeader>

            {/* Step Content */}
            <div className="flex-1 px-6 py-8 overflow-y-auto min-h-0 bg-background">
              {currentStep === 'basic' && (
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold mb-2">Metadata</h2>
                      {/* <p className="text-sm text-muted-foreground mb-6">
                        Give your action a clear name and description that explains what it does.
                      </p> */}
                      
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="display_name" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Action name (shown to users)
                          </Label>
                          <Input
                            id="display_name"
                            value={formData.display_name}
                            onChange={(e) => handleDisplayNameChange(e.target.value)}
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
                            onChange={(e) => {
                              const value = e.target.value;
                              setFormData(prev => ({ ...prev, description: value }));
                              // Clear validation error when user starts typing
                              if (errors.description && value.trim()) {
                                setErrors(prev => ({ ...prev, description: '' }));
                              }
                            }}
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
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Auto-generated from action name"
                            className="font-mono text-sm transition-all focus:ring-2 focus:ring-primary/20"
                          />
                          <p className="text-xs text-muted-foreground">
                            Used by your system for internal referencing. Lowercase letters, numbers, and underscores only.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* <div>
                      <h2 className="text-lg font-semibold mb-2">Backend Hook</h2> */}
                      {/* <p className="text-sm text-muted-foreground mb-6">
                        Internal identifier used by your system for referencing.
                      </p> */}
                      
                      {/* <div className="space-y-2">
                        <Label htmlFor="function_name" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Function name
                        </Label>
                        <Input
                          id="function_name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Auto-generated from action name"
                          className="font-mono text-sm transition-all focus:ring-2 focus:ring-primary/20"
                        />
                        <p className="text-xs text-muted-foreground">
                          Used by your system for internal referencing. Lowercase letters, numbers, and underscores only.
                        </p>
                      </div> */}
                    {/* </div> */}
                  </div>
                </div>
              )}

              {currentStep === 'webhook' && (
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
                            onChange={(e) => {
                              const value = e.target.value;
                              setFormData(prev => ({ ...prev, webhook_url: value }));
                              // Clear validation error when user starts typing
                              if (errors.webhook_url && value.trim()) {
                                setErrors(prev => ({ ...prev, webhook_url: '' }));
                              }
                            }}
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
                              onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value }))}
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
                              onChange={(e) => setFormData(prev => ({ ...prev, timeout_ms: parseInt(e.target.value) }))}
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

                      {/* Advanced Options */}
                  <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
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
                              <Button onClick={addHeader} variant="outline">
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
                                onChange={(e) => updateHeader(key, e.target.value, value)}
                                className="flex-1"
                              />
                              <Input
                                placeholder="Header value"
                                value={value}
                                onChange={(e) => updateHeader(key, key, e.target.value)}
                                className="flex-1"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeHeader(key)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          
                          {Object.entries(formData.headers).length > 0 && (
                            <Button onClick={addHeader} variant="outline" className="w-full">
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
              )}

              {currentStep === 'parameters' && (
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold mb-2">Function Parameters</h2>
                      <p className="text-sm text-muted-foreground mb-6">
                        Define the parameters that users can provide when calling this action. These will be sent to your webhook.
                      </p>
                      
                      <div className="space-y-4">
                    {formData.parameters.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg">
                        <div className="flex flex-col items-center gap-3">
                          <Info className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium">No parameters yet</p>
                            <p className="text-sm text-muted-foreground">
                              Parameters are optional. Your action can work without any parameters.
                            </p>
                          </div>
                          <Button onClick={addParameter} className="mt-2">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Parameter
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {formData.parameters.map((param, index) => (
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
                          onClick={() => toggleParameterExpansion(index)}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                removeParameter(index);
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
                                    onChange={(e) => updateParameter(index, 'name', e.target.value)}
                                    placeholder="e.g., email, priority, amount"
                                    className="transition-all focus:ring-2 focus:ring-primary/20"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</Label>
                                                                      <select
                                      value={param.type}
                                      onChange={(e) => updateParameter(index, 'type', e.target.value)}
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
                                  onChange={(e) => updateParameter(index, 'description', e.target.value)}
                                  placeholder="Describe what this parameter is used for..."
                                  rows={2}
                                  className="transition-all focus:ring-2 focus:ring-primary/20"
                                />
                              </div>
                              
                              <div className="flex items-center space-x-2 pt-2">
                                <Switch
                                  checked={param.required}
                                  onCheckedChange={(checked) => updateParameter(index, 'required', checked)}
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
                                          onCheckedChange={(checked) => toggleEnumMode(index, checked)}
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
                                                    onClick={() => removeEnumValue(index, enumIndex)}
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
                                              onChange={(e) => setNewEnumValue(prev => ({ ...prev, [index]: e.target.value }))}
                                              onKeyPress={(e) => handleEnumKeyPress(index, e)}
                                              placeholder="Type a value and press Enter"
                                              className="flex-1 transition-all focus:ring-2 focus:ring-primary/20"
                                            />
                                            <Button
                                              type="button"
                                              variant="secondary"
                                              size="sm"
                                              className="px-3"
                                              onClick={() => handleAddEnumValue(index, newEnumValue[index] || '')}
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
                    
                    {formData.parameters.length > 0 && (
                      <Button onClick={addParameter} variant="outline" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Parameter
                      </Button>
                    )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 'review' && (
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
                            <p className="font-mono break-all">{formData.webhook_url}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Method:</span>
                            <Badge variant="outline">{formData.method}</Badge>
                          </div>
                        </div>
                        {Object.keys(formData.headers).length > 0 && (
                          <div className="mt-2">
                            <span className="text-muted-foreground">Headers:</span>
                            <div className="mt-1 space-y-1">
                              {Object.entries(formData.headers).map(([key, value]) => (
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
                        <h4 className="font-medium mb-3">Parameters ({formData.parameters.length})</h4>
                        {formData.parameters.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No parameters defined</p>
                        ) : (
                          <div className="space-y-2">
                            {formData.parameters.map((param, index) => (
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
                            {formData.is_active ? 'Active and ready to use' : 'Inactive'}
                          </p>
                        </div>
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                        />
                      </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Footer */}
            <div className="mt-auto bg-background border-t p-6 shadow-lg rounded-b-lg">
              <div className="flex items-center justify-between">
                {/* Back Button */}
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 'basic'}
                  className="min-w-[100px]"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                
                {/* Cancel and Next/Save Group */}
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    onClick={() => onOpenChange(false)}
                    className="min-w-[80px]"
                  >
                    Cancel
                  </Button>
                  
                  {currentStep === 'review' ? (
                    <RainbowButton 
                      onClick={handleSubmit} 
                      disabled={isLoading}
                      className="min-w-[140px]"
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      {mode === 'create' ? 'Create Action' : 'Update Action'}
                    </RainbowButton>
                  ) : (
                    <RainbowButton 
                      onClick={nextStep}
                      className="min-w-[100px]"
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </RainbowButton>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* JSON Preview Side Panel */}
          {showJsonPreview && (
            <div className="w-[500px] border-l bg-card flex flex-col rounded-r-lg shadow-lg">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Live Preview & Editor</h3>
                    <p className="text-sm text-muted-foreground">
                      Edit or copy the JSON representation
                    </p>
                  </div>
                  <div className="flex gap-1 mr-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      title="Copy JSON"
                    >
                      {isCopying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(jsonValue);
                          const formatted = JSON.stringify(parsed, null, 2);
                          setJsonValue(formatted);
                          setJsonError('');
                        } catch (error) {
                          setJsonError('Cannot format invalid JSON');
                        }
                      }}
                      title="Format JSON"
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-4 flex flex-col min-h-0">
                <CodeEditor
                  value={jsonValue}
                  onChange={handleJsonChange}
                  placeholder='{\n  "name": "my_action",\n  "display_name": "My Action",\n  ...\n}'
                  error={jsonError}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 