import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { BasicInfoStep } from './BasicInfoStep';
import { WebhookStep } from './WebhookStep';
import { ParametersStep } from './ParametersStep';
import { ReviewStep } from './ReviewStep';
import { JsonSidePanel } from './JsonSidePanel';
// import { Stepper } from './Stepper';
import { FooterNav } from './FooterNav';
import { useSkills } from '../hooks/useSkills';
import { Skill } from '@/app/dashboard/libs/skills_db_queries_v2';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

// Placeholder imports for step components (to be implemented)
// import { BasicInfoStep } from './BasicInfoStep';
// import { WebhookStep } from './WebhookStep';
// import { ParametersStep } from './ParametersStep';
// import { ReviewStep } from './ReviewStep';
// import { JsonSidePanel } from './JsonSidePanel';
// import { Stepper } from './Stepper';
// import { FooterNav } from './FooterNav';

interface ActionModalV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatbotId: string;
  mode: 'create' | 'edit';
  action?: Skill | null;
}

interface FormData {
  display_name: string;
  description: string;
  name: string;
  category: string;
}

interface WebhookFormData {
  webhook_url: string;
  method: string;
  timeout_ms: number;
  headers: Record<string, string>;
}

interface Parameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  enum?: string[];
}

export function ActionModalV2({ open, onOpenChange, chatbotId, mode, action }: ActionModalV2Props) {
  // Step state (to be expanded)
  const [currentStep, setCurrentStep] = useState('basic');
  const steps = [
    { key: 'basic', title: 'Basic Info', description: 'Name and description' },
    { key: 'webhook', title: 'Webhook', description: 'URL and configuration' },
    { key: 'parameters', title: 'Parameters', description: 'Function parameters' },
    { key: 'review', title: 'Review', description: 'Final review and save' }
  ];

  // Basic Info state
  const [formData, setFormData] = useState<FormData>({
    display_name: '',
    description: '',
    name: '',
    category: 'custom',
  });
  const [errors, setErrors] = useState<{ display_name?: string; description?: string; webhook_url?: string; category?: string }>({});
  
  // Category state
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Webhook step state
  const [webhookFormData, setWebhookFormData] = useState<WebhookFormData>({
    webhook_url: '',
    method: 'POST',
    timeout_ms: 10000,
    headers: {},
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Parameters step state
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [expandedParameters, setExpandedParameters] = useState<Set<number>>(new Set());
  const [newEnumValue, setNewEnumValue] = useState<Record<number, string>>({});

  // Review step state
  const [isActive, setIsActive] = useState(true);

  // Skills API
  const { createSkill, updateSkill, isCreating, isUpdating } = useSkills(chatbotId);

  // Fetch existing categories
  const { data: existingCategories = [] } = useQuery({
    queryKey: ['skill-categories', chatbotId],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/skills`);
      if (!response.ok) throw new Error('Failed to fetch skills');
      const { skills } = await response.json();
      
      // Extract unique categories
      const categories = new Set<string>();
      skills.forEach((skill: any) => {
        if (skill.category && skill.category !== 'custom') {
          categories.add(skill.category);
        }
      });
      
      // Add some default categories
      ['API', 'Database', 'Notifications', 'Analytics', 'Integration', 'Automation'].forEach(cat => {
        categories.add(cat);
      });
      
      return Array.from(categories).sort();
    },
    enabled: open,
  });

  // Category handlers
  const handleCategoryChange = (value: string) => {
    if (value === 'new') {
      setShowNewCategory(true);
      setFormData({ ...formData, category: '' });
    } else {
      setShowNewCategory(false);
      setFormData({ ...formData, category: value });
      setNewCategoryName('');
    }
  };

  const handleNewCategoryNameChange = (value: string) => {
    setNewCategoryName(value);
    setFormData({ ...formData, category: value });
  };

  // Navigation logic
  const stepIndex = steps.findIndex(step => step.key === currentStep);
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

  // Edit mode: sync state from action
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && action) {
        // Extract config and schema from action
        const config = action.configuration?.webhook_config || {};
        const schema = action.function_schema?.parameters || {};
        // Extract parameters from schema
        const params: Parameter[] = [];
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([name, prop]: [string, any]) => {
            params.push({
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
          category: action.category || 'custom',
        });
        setWebhookFormData({
          webhook_url: config.url || '',
          method: config.method || 'POST',
          headers: config.headers || {},
          timeout_ms: config.timeout_ms || 10000,
        });
        setParameters(params);
        setIsActive(action.is_active);
        setExpandedParameters(new Set());
        setNewEnumValue({});
        setShowAdvanced(false);
      } else if (mode === 'create') {
        setFormData({ display_name: '', description: '', name: '', category: 'custom' });
        setWebhookFormData({ webhook_url: '', method: 'POST', headers: {}, timeout_ms: 10000 });
        setParameters([]);
        setIsActive(true);
        setExpandedParameters(new Set());
        setNewEnumValue({});
        setShowAdvanced(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, action, open]);

  // Step validation
  function validateStep(step: string): boolean {
    if (step === 'basic') {
      return !!formData.display_name.trim() && !!formData.description.trim();
    }
    if (step === 'webhook') {
      if (!webhookFormData.webhook_url.trim()) return false;
      try {
        new URL(webhookFormData.webhook_url);
      } catch {
        return false;
      }
      return true;
    }
    // Parameters: always valid (optional)
    // Review: always valid
    return true;
  }

  const canGoNext = validateStep(currentStep);
  const canGoBack = !isFirstStep;

  const handleNext = () => {
    if (!canGoNext) return;
    if (isLastStep) {
      // For now, just close the modal on save
      onOpenChange(false);
      return;
    }
    setCurrentStep(steps[stepIndex + 1].key);
  };

  const handleBack = () => {
    if (!canGoBack) return;
    setCurrentStep(steps[stepIndex - 1].key);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Handlers for Basic Info step
  const handleDisplayNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      display_name: value,
      name: generateFunctionName(value)
    }));
    if (errors.display_name && value.trim()) {
      setErrors(prev => ({ ...prev, display_name: '' }));
    }
  };

  const handleDescriptionChange = (value: string) => {
    setFormData(prev => ({ ...prev, description: value }));
    if (errors.description && value.trim()) {
      setErrors(prev => ({ ...prev, description: '' }));
    }
  };

  const handleFunctionNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, name: value }));
  };

  // Handlers for Webhook step
  const handleWebhookUrlChange = (value: string) => {
    setWebhookFormData(prev => ({ ...prev, webhook_url: value }));
    if (errors.webhook_url && value.trim()) {
      setErrors(prev => ({ ...prev, webhook_url: '' }));
    }
  };

  const handleMethodChange = (value: string) => {
    setWebhookFormData(prev => ({ ...prev, method: value }));
  };

  const handleTimeoutChange = (value: number) => {
    setWebhookFormData(prev => ({ ...prev, timeout_ms: value }));
  };

  const handleShowAdvancedChange = (open: boolean) => {
    setShowAdvanced(open);
  };

  const handleAddHeader = () => {
    setWebhookFormData(prev => ({
      ...prev,
      headers: { ...prev.headers, Authorization: 'Bearer your-api-key' }
    }));
  };

  const handleUpdateHeader = (oldKey: string, newKey: string, value: string) => {
    setWebhookFormData(prev => {
      const headers = { ...prev.headers };
      if (oldKey !== newKey) {
        delete headers[oldKey];
      }
      headers[newKey] = value;
      return { ...prev, headers };
    });
  };

  const handleRemoveHeader = (key: string) => {
    setWebhookFormData(prev => {
      const headers = { ...prev.headers };
      delete headers[key];
      return { ...prev, headers };
    });
  };

  // Handlers for Parameters step
  const handleAddParameter = () => {
    const newIndex = parameters.length;
    setParameters(prev => ([
      ...prev,
      { name: '', type: 'string', description: '', required: false, enum: undefined }
    ]));
    setExpandedParameters(prev => new Set([...prev, newIndex]));
  };

  const handleUpdateParameter = (index: number, field: string, value: any) => {
    setParameters(prev => prev.map((param, i) =>
      i === index ? { ...param, [field]: value } : param
    ));
  };

  const handleRemoveParameter = (index: number) => {
    setParameters(prev => prev.filter((_, i) => i !== index));
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
    setNewEnumValue(prev => {
      const updated = { ...prev };
      delete updated[index];
      // Shift keys for indices after the removed one
      const result: Record<number, string> = {};
      Object.entries(updated).forEach(([k, v]) => {
        const key = Number(k);
        if (key > index) result[key - 1] = v;
        else if (key < index) result[key] = v;
      });
      return result;
    });
  };

  const handleToggleParameterExpansion = (index: number) => {
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

  const handleToggleEnumMode = (paramIndex: number, hasEnum: boolean) => {
    setParameters(prev => prev.map((param, i) =>
      i === paramIndex ? { ...param, enum: hasEnum ? [] : undefined } : param
    ));
  };

  const handleAddEnumValue = (paramIndex: number, value: string) => {
    if (!value.trim()) return;
    setParameters(prev => prev.map((param, i) =>
      i === paramIndex ? { ...param, enum: [...(param.enum || []), value.trim()] } : param
    ));
    setNewEnumValue(prev => ({ ...prev, [paramIndex]: '' }));
  };

  const handleRemoveEnumValue = (paramIndex: number, enumIndex: number) => {
    setParameters(prev => prev.map((param, i) =>
      i === paramIndex ? { ...param, enum: param.enum?.filter((_, ei) => ei !== enumIndex) || [] } : param
    ));
  };

  const handleEnumKeyPress = (paramIndex: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = newEnumValue[paramIndex] || '';
      handleAddEnumValue(paramIndex, value);
    }
  };

  const handleNewEnumValueChange = (index: number, value: string) => {
    setNewEnumValue(prev => ({ ...prev, [index]: value }));
  };

  // Handler for Review step
  const handleActiveChange = (checked: boolean) => {
    setIsActive(checked);
  };

  function generateFunctionName(displayName: string) {
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  // Build API payload
  function buildApiPayload() {
    // Build parameters schema
    const properties: Record<string, any> = {};
    const required: string[] = [];
    parameters.forEach(param => {
      if (param.name) {
        const paramConfig: any = {
          type: param.type,
          description: param.description || `${param.name} parameter`
        };
        if (param.enum && param.enum.length > 0) {
          paramConfig.enum = param.enum;
        }
        properties[param.name] = paramConfig;
        if (param.required) required.push(param.name);
      }
    });
    return {
      name: formData.name,
      display_name: formData.display_name,
      description: formData.description,
      type: 'custom' as const,
      category: formData.category,
      function_schema: {
        name: formData.name,
        description: formData.description,
        parameters: {
          type: 'object',
          properties,
          required
        }
      },
      configuration: {
        webhook_config: {
          url: webhookFormData.webhook_url,
          method: webhookFormData.method,
          headers: webhookFormData.headers,
          timeout_ms: webhookFormData.timeout_ms
        }
      },
      is_active: isActive
    };
  }

  // Save handler
  const handleSave = () => {
    const payload = buildApiPayload();
    if (mode === 'create') {
      createSkill(payload);
      onOpenChange(false);
    } else if (mode === 'edit' && action) {
      updateSkill({
        skillId: action.id,
        updates: {
          display_name: payload.display_name,
          description: payload.description,
          category: payload.category,
          configuration: payload.configuration,
          function_schema: payload.function_schema,
          is_active: payload.is_active,
        }
      });
      onOpenChange(false);
    }
  };

  // Build API payload (for JSON preview)
  const apiPayload = buildApiPayload();
  const jsonString = JSON.stringify(apiPayload, null, 2);

  // New state for JSON preview
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [jsonValue, setJsonValue] = useState('');

  // Sync form state to JSON
  useEffect(() => {
    setJsonValue(JSON.stringify(buildApiPayload(), null, 2));
  }, [formData, webhookFormData, parameters, isActive]);

  // Handle JSON apply
  const handleJsonChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      // Update all form state from parsed JSON
      if (parsed && typeof parsed === 'object') {
        // Basic info
        if (parsed.display_name && typeof parsed.display_name === 'string') {
          setFormData(prev => ({ ...prev, display_name: parsed.display_name }));
        }
        if (parsed.description && typeof parsed.description === 'string') {
          setFormData(prev => ({ ...prev, description: parsed.description }));
        }
        if (parsed.name && typeof parsed.name === 'string') {
          setFormData(prev => ({ ...prev, name: parsed.name }));
        }
        if (parsed.category && typeof parsed.category === 'string') {
          setFormData(prev => ({ ...prev, category: parsed.category }));
        }
        // Webhook config
        if (parsed.configuration?.webhook_config) {
          const config = parsed.configuration.webhook_config;
          setWebhookFormData(prev => ({
            ...prev,
            webhook_url: config.url || prev.webhook_url,
            method: config.method || prev.method,
            headers: config.headers || prev.headers,
            timeout_ms: config.timeout_ms || prev.timeout_ms
          }));
        }
        // Parameters
        if (parsed.function_schema?.parameters?.properties) {
          const props = parsed.function_schema.parameters.properties;
          const required = parsed.function_schema.parameters.required || [];
          const params: Parameter[] = [];
          Object.entries(props).forEach(([name, prop]: [string, any]) => {
            params.push({
              name,
              type: prop.type || 'string',
              description: prop.description || '',
              required: required.includes(name),
              enum: prop.enum || undefined
            });
          });
          setParameters(params);
        }
        // Status
        if (typeof parsed.is_active === 'boolean') {
          setIsActive(parsed.is_active);
        }
      }
    } catch (error) {
      // This should not happen anymore as panel validates, but as a safeguard:
      console.error("Received invalid JSON from panel:", error);
    }
  };

  // Stepper click navigation
  const canGoToStep = (targetIdx: number) => {
    if (targetIdx <= stepIndex) return true;
    for (let i = 0; i < targetIdx; i++) {
      if (!validateStep(steps[i].key)) return false;
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] h-[90vh] p-0 flex flex-col bg-background shadow-2xl">
        <div className="flex flex-1 min-h-0">
          {/* Main Content Form */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* Header */}
            <DialogHeader className="sticky top-0 rounded-t-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm z-10 px-6 py-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold">
                    {mode === 'create' ? 'Create New Action' : `Edit Action: ${action?.display_name || action?.name}`}
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-base text-muted-foreground">
                    {mode === 'create'
                      ? 'Create a custom webhook action for your chatbot'
                      : 'Update your action configuration and parameters'}
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Tabs value={showJsonPreview ? 'json' : 'form'} onValueChange={v => setShowJsonPreview(v === 'json')}>
                    <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-full h-auto">
                      <TabsTrigger value="form" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground py-1.5">Form View</TabsTrigger>
                      <TabsTrigger value="json" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground py-1.5">JSON View</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {/* Stepper */}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  {steps.map((step, idx) => {
                    const isActive = currentStep === step.key;
                    const isCompleted = stepIndex > idx;
                    const isReachable = isCompleted || isActive || canGoToStep(idx - 1);

                    return (
                      <div key={step.key} className="flex items-center flex-1">
                        <div
                          className={cn(
                            "flex items-center gap-3 transition-all duration-200",
                            idx > 0 && "pl-4",
                            isReachable ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                            "relative"
                          )}
                          onClick={() => isReachable && setCurrentStep(step.key)}
                        >
                          <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200",
                            isActive ? "bg-primary border-primary text-primary-foreground shadow-md"
                              : isCompleted ? "bg-green-500/10 border-green-500/50 text-green-600"
                                : "bg-muted border-border text-muted-foreground"
                          )}>
                            {isCompleted ? <CheckCircle className="h-4 w-4" /> : <span className="text-sm font-medium">{idx + 1}</span>}
                          </div>
                          <div className="min-w-0">
                            <div className={cn(
                              "text-sm font-medium transition-colors",
                              isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {step.title}
                            </div>
                            <div className="text-xs text-muted-foreground hidden sm:block">
                              {step.description}
                            </div>
                          </div>
                          {isActive && (
                            <div className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-orange-400 to-blue-500 animate-[shine_4s_linear_infinite]" />
                          )}
                        </div>
                        {idx < steps.length - 1 && (
                          <div className={cn(
                            "flex-1 h-0.5 mx-4 transition-colors duration-300",
                            isCompleted ? "bg-green-500/20" : "bg-border"
                          )} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </DialogHeader>

            {/* Step Content */}
            <div className="flex-1 px-6 py-8 overflow-y-auto min-h-0 bg-background">
              {currentStep === 'basic' && (
                <BasicInfoStep
                  formData={formData}
                  errors={errors}
                  onDisplayNameChange={handleDisplayNameChange}
                  onDescriptionChange={handleDescriptionChange}
                  onFunctionNameChange={handleFunctionNameChange}
                  onCategoryChange={handleCategoryChange}
                  onNewCategoryNameChange={handleNewCategoryNameChange}
                  existingCategories={existingCategories}
                  showNewCategory={showNewCategory}
                  newCategoryName={newCategoryName}
                />
              )}
              {currentStep === 'webhook' && (
                <WebhookStep
                  formData={webhookFormData}
                  errors={errors}
                  showAdvanced={showAdvanced}
                  onWebhookUrlChange={handleWebhookUrlChange}
                  onMethodChange={handleMethodChange}
                  onTimeoutChange={handleTimeoutChange}
                  onShowAdvancedChange={handleShowAdvancedChange}
                  onAddHeader={handleAddHeader}
                  onUpdateHeader={handleUpdateHeader}
                  onRemoveHeader={handleRemoveHeader}
                />
              )}
              {currentStep === 'parameters' && (
                <ParametersStep
                  parameters={parameters}
                  expandedParameters={expandedParameters}
                  newEnumValue={newEnumValue}
                  onAddParameter={handleAddParameter}
                  onUpdateParameter={handleUpdateParameter}
                  onRemoveParameter={handleRemoveParameter}
                  onToggleParameterExpansion={handleToggleParameterExpansion}
                  onToggleEnumMode={handleToggleEnumMode}
                  onAddEnumValue={handleAddEnumValue}
                  onRemoveEnumValue={handleRemoveEnumValue}
                  onEnumKeyPress={handleEnumKeyPress}
                  onNewEnumValueChange={handleNewEnumValueChange}
                />
              )}
              {currentStep === 'review' && (
                <ReviewStep
                  formData={formData}
                  webhookFormData={webhookFormData}
                  parameters={parameters}
                  is_active={isActive}
                  onActiveChange={handleActiveChange}
                />
              )}
            </div>

            {/* Footer Navigation */}
            <div className="mt-auto bg-background border-t p-6 shadow-lg rounded-b-lg">
              <FooterNav
                onNext={isLastStep ? handleSave : handleNext}
                onBack={handleBack}
                onCancel={handleCancel}
                canGoNext={canGoNext}
                canGoBack={canGoBack}
                isLastStep={isLastStep}
                isLoading={isLastStep && (isCreating || isUpdating)}
                mode={mode}
              />
            </div>
          </div>

          {/* JSON Preview Side Panel */}
          {showJsonPreview && (
            <div className="w-[500px] max-w-full flex-shrink-0 border-l bg-card flex flex-col min-h-0 overflow-hidden rounded-r-lg shadow-inner">
              <JsonSidePanel json={jsonValue} onJsonChange={handleJsonChange} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 