"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from "sonner";
import Image from 'next/image';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpdateChatbotSettings } from '../../hooks/useChatbotSettings';
import { UpdateChatbotPayload, Chatbot } from '@/app/dashboard/libs/queries';
import { useSettingsDirty } from './SettingsDirtyContext';
import { FieldsetBlock } from './FieldsetBlock';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Cpu, MessageSquareCode } from 'lucide-react';
import { motion } from 'framer-motion';

// Define available AI models
const AVAILABLE_AI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1-mini' },
  { id: 'gpt-4.1', name: 'GPT-4.1' }
];

// Enhanced system prompt presets organized by category
const SYSTEM_PROMPT_PRESETS = {
  general: [
    { 
      id: 'friendly_assistant', 
      name: 'Friendly Assistant', 
      prompt: "You are a helpful and friendly AI assistant. Respond clearly and concisely while maintaining a warm, approachable tone." 
    },
    { 
      id: 'professional', 
      name: 'Professional Assistant', 
      prompt: "You are a professional AI assistant. Provide accurate, well-structured responses with a formal yet approachable tone. Focus on clarity and precision." 
    },
    { 
      id: 'playful_emoji', 
      name: 'Playful with Emojis 🎉', 
      prompt: "You are a fun and engaging AI assistant! 🌟 Use emojis frequently to make conversations lively and enjoyable. Keep responses helpful while adding personality with relevant icons and expressions. ✨" 
    }
  ],
  educational: [
    { 
      id: 'socratic_tutor', 
      name: 'Socratic Tutor', 
      prompt: "You are a Socratic tutor. Guide learning through thoughtful questions rather than direct answers. Help users discover insights by asking probing questions that lead them to understanding." 
    },
    { 
      id: 'patient_teacher', 
      name: 'Patient Teacher', 
      prompt: "You are a patient and encouraging teacher. Break down complex topics into digestible parts. Use analogies and examples to clarify concepts. Always encourage questions and learning." 
    },
    { 
      id: 'academic_researcher', 
      name: 'Academic Researcher', 
      prompt: "You are a knowledgeable academic researcher. Provide well-sourced, analytical responses. Cite relevant theories, studies, and established frameworks. Maintain scholarly rigor while being accessible." 
    }
  ],
  technical: [
    { 
      id: 'code_expert', 
      name: 'Code Expert', 
      prompt: "You are an expert programming assistant. Provide clean, efficient code examples with clear explanations. Include best practices, potential pitfalls, and optimization suggestions. Support multiple programming languages." 
    },
    { 
      id: 'system_architect', 
      name: 'System Architect', 
      prompt: "You are a senior system architect. Focus on scalable, maintainable solutions. Discuss design patterns, architecture decisions, and trade-offs. Consider performance, security, and long-term maintenance." 
    },
    { 
      id: 'debugging_specialist', 
      name: 'Debugging Specialist', 
      prompt: "You are a debugging specialist. Help identify and solve technical problems systematically. Ask clarifying questions, suggest debugging steps, and provide multiple solution approaches." 
    }
  ],
  creative: [
    { 
      id: 'creative_writer', 
      name: 'Creative Writer', 
      prompt: "You are a creative writing assistant. Help with storytelling, character development, and narrative structure. Provide imaginative suggestions while respecting the user's creative vision." 
    },
    { 
      id: 'brainstorm_partner', 
      name: 'Brainstorm Partner', 
      prompt: "You are an enthusiastic brainstorming partner! Generate creative ideas, build on concepts, and encourage out-of-the-box thinking. No idea is too wild - let's explore possibilities together!" 
    }
  ]
};

// System prompt builder traits
const PROMPT_BUILDER_TRAITS = {
  tone: {
    title: 'Tone & Personality',
    options: [
      { id: 'professional', label: 'Professional', description: 'Formal and business-appropriate' },
      { id: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
      { id: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
      { id: 'playful', label: 'Playful', description: 'Fun and energetic' },
      { id: 'authoritative', label: 'Authoritative', description: 'Confident and expert-like' }
    ]
  },
  responseStyle: {
    title: 'Response Style',
    options: [
      { id: 'concise', label: 'Concise', description: 'Brief and to the point' },
      { id: 'detailed', label: 'Detailed', description: 'Comprehensive explanations' },
      { id: 'stepByStep', label: 'Step-by-step', description: 'Structured, sequential guidance' },
      { id: 'examples', label: 'Example-rich', description: 'Heavy use of examples and analogies' }
    ]
  },
  domain: {
    title: 'Domain Focus',
    options: [
      { id: 'general', label: 'General Knowledge', description: 'Broad, cross-domain expertise' },
      { id: 'academic', label: 'Academic', description: 'Educational and scholarly focus' },
      { id: 'technical', label: 'Technical', description: 'Programming and engineering' },
      { id: 'business', label: 'Business', description: 'Professional and commercial' },
      { id: 'creative', label: 'Creative', description: 'Arts, writing, and innovation' }
    ]
  },
  codeGeneration: {
    title: 'Code Generation',
    options: [
      { id: 'disabled', label: 'Disabled', description: 'Avoid code examples' },
      { id: 'minimal', label: 'Minimal', description: 'Only when specifically requested' },
      { id: 'preferred', label: 'Preferred', description: 'Include code examples when helpful' },
      { id: 'extensive', label: 'Extensive', description: 'Detailed code with explanations' }
    ]
  },
  emojis: {
    title: 'Emojis & Icons',
    options: [
      { id: 'none', label: 'None', description: 'Text only' },
      { id: 'minimal', label: 'Minimal', description: 'Occasional use for emphasis' },
      { id: 'moderate', label: 'Moderate', description: 'Regular use to enhance communication' },
      { id: 'frequent', label: 'Frequent', description: 'Expressive and emoji-rich' }
    ]
  },
  teachingStyle: {
    title: 'Teaching Approach',
    options: [
      { id: 'direct', label: 'Direct Answers', description: 'Provide solutions immediately' },
      { id: 'guided', label: 'Guided Discovery', description: 'Lead users to find answers' },
      { id: 'socratic', label: 'Socratic Method', description: 'Questions that promote thinking' },
      { id: 'collaborative', label: 'Collaborative', description: 'Work together to solve problems' }
    ]
  }
};

// Zod schema for behavior settings
const behaviorSettingsSchema = z.object({
  ai_model_identifier: z.string().min(1, "AI Model selection is required."),
  system_prompt: z.string().max(5000, "System prompt cannot exceed 5000 characters.").optional().nullable(),
  temperature: z.number().min(0).max(2).step(0.01),
});

type BehaviorFormData = z.infer<typeof behaviorSettingsSchema>;

interface PromptBuilderState {
  tone: string;
  responseStyle: string;
  domain: string;
  codeGeneration: string;
  emojis: string;
  teachingStyle: string;
}

interface BehaviorSettingsSectionProps {
  chatbot: Chatbot | undefined;
  chatbotId: string;
}

export function BehaviorSettingsSection({ chatbot, chatbotId }: BehaviorSettingsSectionProps) {
  const { mutate: updateSettings, isPending: isUpdating } = useUpdateChatbotSettings(chatbotId);
  const { setDirty, registerSaveHandler, registerResetHandler } = useSettingsDirty();
  
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [isBuilderDialogOpen, setIsBuilderDialogOpen] = useState(false);
  const [builderState, setBuilderState] = useState<PromptBuilderState>({
    tone: 'friendly',
    responseStyle: 'detailed',
    domain: 'general',
    codeGeneration: 'minimal',
    emojis: 'minimal',
    teachingStyle: 'direct'
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<BehaviorFormData>({
    resolver: zodResolver(behaviorSettingsSchema),
    defaultValues: {
      ai_model_identifier: AVAILABLE_AI_MODELS[0].id,
      system_prompt: "", 
      temperature: 0.7,
    }
  });

  const currentTemperature = watch("temperature");

  const lastSavedFormRef = useRef<BehaviorFormData | null>(null);

  useEffect(() => {
    if (chatbot) {
      const initialForm: BehaviorFormData = {
        ai_model_identifier: chatbot.ai_model_identifier || AVAILABLE_AI_MODELS[0].id,
        system_prompt: chatbot.system_prompt || "",
        temperature: chatbot.temperature === null || chatbot.temperature === undefined ? 0.7 : chatbot.temperature, 
      };
      reset(initialForm);
      lastSavedFormRef.current = initialForm;
    }
  }, [chatbot, reset]);

  // Watch for dirty state and update context
  useEffect(() => {
    setDirty('behavior', isDirty);
  }, [isDirty, setDirty]);

  const handlePresetSelect = (prompt: string) => {
    setValue("system_prompt", prompt, { shouldDirty: true });
    setIsPresetDialogOpen(false);
    toast.success("System prompt updated from preset");
  };

  const generatePromptFromBuilder = () => {
    const traits = builderState;
    
    let prompt = "You are an AI assistant with the following characteristics:\n\n";
    
    const toneMap: Record<string, string> = {
      professional: "Maintain a professional and formal tone",
      friendly: "Use a warm, friendly, and approachable tone", 
      casual: "Keep a relaxed and conversational tone",
      playful: "Be fun, energetic, and engaging",
      authoritative: "Speak with confidence and expertise"
    };
    prompt += `TONE: ${toneMap[traits.tone] || toneMap.friendly}.\n`;

    const styleMap: Record<string, string> = {
      concise: "Keep responses brief and to the point",
      detailed: "Provide comprehensive and thorough explanations",
      stepByStep: "Break down information into clear, sequential steps",
      examples: "Use plenty of examples and analogies to illustrate points"
    };
    prompt += `STYLE: ${styleMap[traits.responseStyle] || styleMap.detailed}.\n`;

    const domainMap: Record<string, string> = {
      general: "Draw from broad knowledge across multiple domains",
      academic: "Focus on educational content and scholarly approaches",
      technical: "Emphasize programming, engineering, and technical topics",
      business: "Prioritize professional and commercial perspectives", 
      creative: "Encourage creativity, arts, and innovative thinking"
    };
    prompt += `FOCUS: ${domainMap[traits.domain] || domainMap.general}.\n`;

    const codeMap: Record<string, string> = {
      disabled: "Avoid providing code examples",
      minimal: "Only include code when specifically requested",
      preferred: "Include helpful code examples when appropriate",
      extensive: "Provide detailed code examples with thorough explanations"
    };
    prompt += `CODE: ${codeMap[traits.codeGeneration] || codeMap.minimal}.\n`;

    const emojiMap: Record<string, string> = {
      none: "Use only text without emojis or icons",
      minimal: "Occasionally use emojis for emphasis",
      moderate: "Use emojis regularly to enhance communication",
      frequent: "Use emojis frequently to create an expressive, engaging experience"
    };
    prompt += `EMOJIS: ${emojiMap[traits.emojis] || emojiMap.minimal}.\n`;

    const teachingMap: Record<string, string> = {
      direct: "Provide direct answers and solutions immediately",
      guided: "Guide users toward discovering answers themselves",
      socratic: "Use questions to help users think through problems",
      collaborative: "Work together with users to explore and solve problems"
    };
    prompt += `TEACHING: ${teachingMap[traits.teachingStyle] || teachingMap.direct}.\n`;

    prompt += "\nAlways be helpful, accurate, and adapt your responses to best serve the user's needs.";

    return prompt;
  };

  const handleBuilderApply = () => {
    const generatedPrompt = generatePromptFromBuilder();
    setValue("system_prompt", generatedPrompt, { shouldDirty: true });
    setIsBuilderDialogOpen(false);
    toast.success("Custom system prompt generated and applied");
  };

  const onSubmit = useCallback<SubmitHandler<BehaviorFormData>>((formData) => {
    const payload: UpdateChatbotPayload = {
      ai_model_identifier: formData.ai_model_identifier,
      system_prompt: formData.system_prompt || undefined,
      temperature: formData.temperature,
    };
    updateSettings(payload, {
      onSuccess: () => {
        lastSavedFormRef.current = formData;
      }
    });
  }, [updateSettings]);

  // Register save handler
  useEffect(() => {
    registerSaveHandler('behavior', async () => {
      await handleSubmit(onSubmit)();
    });
     
  }, [registerSaveHandler, handleSubmit, onSubmit]);

  useEffect(() => {
    registerResetHandler('behavior', async () => {
      if (lastSavedFormRef.current) {
        reset(lastSavedFormRef.current);
      }
    });
  }, [registerResetHandler, reset]);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">AI Behavior & Prompts</h2>
        <p className="text-muted-foreground">
          Configure your chatbot's intelligence, personality, and response patterns
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <FieldsetBlock title="Model Configuration" icon={<Cpu className="h-4 w-4" />} required index={0}>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-1.5">
              <Label htmlFor="ai_model_identifier" className="text-sm font-medium">AI Model</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>OpenAI model used for chat completions</TooltipContent>
                </Tooltip>
              </div>
              <Controller
                name="ai_model_identifier"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isUpdating}>
                    <SelectTrigger id="ai_model_identifier" className="mt-2">
                      <SelectValue placeholder="Select an AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_AI_MODELS.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center">
                            <Image 
                              src="/openai.svg" 
                              alt="OpenAI Logo" 
                              width={16} 
                              height={16} 
                              className="mr-2"
                            />
                            {model.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.ai_model_identifier && (
                <p className="mt-1 text-xs text-destructive">{errors.ai_model_identifier.message}</p>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Label htmlFor="temperature" className="text-sm font-medium block mb-2">Temperature</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Controls randomness/creativity of responses</TooltipContent>
                </Tooltip>
                <Badge variant="secondary">{currentTemperature?.toFixed(2)}</Badge>
              </div>
              <Controller
                name="temperature"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <div className="space-y-2">
                    <Slider
                      id="temperature"
                      min={0}
                      max={2}
                      step={0.01}
                      value={[value || 0.7]}
                      onValueChange={(vals) => onChange(vals[0])}
                      className="mt-2"
                      disabled={isUpdating}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Focused (0.0)</span>
                      <span>Balanced (1.0)</span>
                      <span>Creative (2.0)</span>
                    </div>
                  </div>
                )}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Lower values make responses more focused and deterministic, higher values increase creativity and randomness.
              </p>
            </div>
          </div>
        </FieldsetBlock>

        <FieldsetBlock title="System Prompt" icon={<MessageSquareCode className="h-4 w-4" />} index={1}>
            <div className="flex gap-3 mb-4">
            <motion.div whileHover={{ y: -1 }}>
              <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="flex items-center gap-2">
                    ⚡ Browse Presets
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>System Prompt Presets</DialogTitle>
                    <DialogDescription>
                      Choose from curated prompts designed for different use cases
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="educational">Educational</TabsTrigger>
                      <TabsTrigger value="technical">Technical</TabsTrigger>
                      <TabsTrigger value="creative">Creative</TabsTrigger>
                    </TabsList>
                    
                    {Object.entries(SYSTEM_PROMPT_PRESETS).map(([category, presets]) => (
                      <TabsContent key={category} value={category} className="space-y-4 mt-4">
                        {presets.map((preset) => (
                          <Card key={preset.id} className="cursor-pointer hover:bg-accent transition-colors"
                                onClick={() => handlePresetSelect(preset.prompt)}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm">{preset.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-xs text-muted-foreground">{preset.prompt}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </TabsContent>
                    ))}
                  </Tabs>
                </DialogContent>
              </Dialog>
            </motion.div>
            <motion.div whileHover={{ y: -1 }}>
              <Dialog open={isBuilderDialogOpen} onOpenChange={setIsBuilderDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="flex items-center gap-2">
                    🏗️ Prompt Builder
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Custom Prompt Builder</DialogTitle>
                    <DialogDescription>
                      Build a personalized system prompt by selecting characteristics
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {Object.entries(PROMPT_BUILDER_TRAITS).map(([key, trait]) => (
                      <div key={key}>
                        <Label className="text-sm font-semibold">{trait.title}</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {trait.options.map((option) => (
                            <Card 
                              key={option.id}
                              className={`cursor-pointer transition-colors ${
                                builderState[key as keyof PromptBuilderState] === option.id 
                                  ? 'ring-2 ring-primary bg-accent' 
                                  : 'hover:bg-accent/50'
                              }`}
                              onClick={() => setBuilderState(prev => ({ ...prev, [key]: option.id }))}
                            >
                              <CardContent className="p-3">
                                <div className="font-medium text-sm">{option.label}</div>
                                <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsBuilderDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBuilderApply}>
                      Apply Generated Prompt
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </motion.div>
            </div>
            <div>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="system_prompt" className="text-sm font-medium">Custom System Prompt</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Sets the foundation for how your AI behaves</TooltipContent>
              </Tooltip>
            </div>
              <Textarea
                id="system_prompt"
                {...register("system_prompt")}
                rows={8}
                className="mt-2 font-mono text-sm"
                placeholder="You are a helpful AI assistant..."
                disabled={isUpdating}
              />
              {errors.system_prompt && (
                <p className="mt-1 text-xs text-destructive">{errors.system_prompt.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
              {watch('system_prompt') ? `Prompt length: ${watch('system_prompt')!.length} chars` : 'This prompt sets the foundation for how your AI behaves. Be specific about tone, expertise, and style.'}
              </p>
          </div>
        </FieldsetBlock>
      </form>
    </div>
  );
} 