"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from "sonner";
import Image from 'next/image';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useFetchChatbotDetails, useUpdateChatbotSettings } from '../../hooks/useChatbotSettings';
import { UpdateChatbotPayload, Chatbot } from '@/app/dashboard/libs/queries';

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

export default function ChatbotBehaviorPage() {
  const params = useParams();
  const chatbotId = params.chatbotId as string;

  const { data: chatbot, isLoading: isLoadingDetails, error: fetchError } = useFetchChatbotDetails(chatbotId);
  const { mutate: updateSettings, isPending: isUpdating } = useUpdateChatbotSettings(chatbotId);
  
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

  useEffect(() => {
    if (chatbot) {
      reset({
        ai_model_identifier: chatbot.ai_model_identifier || AVAILABLE_AI_MODELS[0].id,
        system_prompt: chatbot.system_prompt || "",
        temperature: chatbot.temperature === null || chatbot.temperature === undefined ? 0.7 : chatbot.temperature, 
      });
    }
  }, [chatbot, reset]);

  const handlePresetSelect = (prompt: string) => {
    setValue("system_prompt", prompt, { shouldDirty: true });
    setIsPresetDialogOpen(false);
    toast.success("System prompt updated from preset");
  };

  const generatePromptFromBuilder = () => {
    const traits = builderState;
    
    // Build prompt based on selected traits
    let prompt = "You are an AI assistant with the following characteristics:\n\n";
    
    // Tone
    const toneMap: Record<string, string> = {
      professional: "Maintain a professional and formal tone",
      friendly: "Use a warm, friendly, and approachable tone", 
      casual: "Keep a relaxed and conversational tone",
      playful: "Be fun, energetic, and engaging",
      authoritative: "Speak with confidence and expertise"
    };
    prompt += `TONE: ${toneMap[traits.tone] || toneMap.friendly}.\n`;

    // Response Style  
    const styleMap: Record<string, string> = {
      concise: "Keep responses brief and to the point",
      detailed: "Provide comprehensive and thorough explanations",
      stepByStep: "Break down information into clear, sequential steps",
      examples: "Use plenty of examples and analogies to illustrate points"
    };
    prompt += `STYLE: ${styleMap[traits.responseStyle] || styleMap.detailed}.\n`;

    // Domain Focus
    const domainMap: Record<string, string> = {
      general: "Draw from broad knowledge across multiple domains",
      academic: "Focus on educational content and scholarly approaches",
      technical: "Emphasize programming, engineering, and technical topics",
      business: "Prioritize professional and commercial perspectives", 
      creative: "Encourage creativity, arts, and innovative thinking"
    };
    prompt += `FOCUS: ${domainMap[traits.domain] || domainMap.general}.\n`;

    // Code Generation
    const codeMap: Record<string, string> = {
      disabled: "Avoid providing code examples",
      minimal: "Only include code when specifically requested",
      preferred: "Include helpful code examples when appropriate",
      extensive: "Provide detailed code examples with thorough explanations"
    };
    prompt += `CODE: ${codeMap[traits.codeGeneration] || codeMap.minimal}.\n`;

    // Emojis
    const emojiMap: Record<string, string> = {
      none: "Use only text without emojis or icons",
      minimal: "Occasionally use emojis for emphasis",
      moderate: "Use emojis regularly to enhance communication",
      frequent: "Use emojis frequently to create an expressive, engaging experience"
    };
    prompt += `EMOJIS: ${emojiMap[traits.emojis] || emojiMap.minimal}.\n`;

    // Teaching Style
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

  const onSubmit: SubmitHandler<BehaviorFormData> = (formData) => {
    const payload: UpdateChatbotPayload = {
      ai_model_identifier: formData.ai_model_identifier,
      system_prompt: formData.system_prompt || undefined,
      temperature: formData.temperature,
    };
    updateSettings(payload);
  };
  
  if (isLoadingDetails) {
    return <div className="max-w-4xl mx-auto p-6"><Skeleton className="h-96 w-full bg-muted" /></div>;
  }

  if (fetchError) {
    return <div className="text-destructive max-w-4xl mx-auto p-6">Error: {fetchError.message}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">AI Behavior & Prompts</h1>
        <p className="text-muted-foreground">
          Configure your chatbot's intelligence, personality, and response patterns
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Model Configuration Section */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="h-6 w-6 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center text-sm">
              🧠
            </div>
            <h2 className="text-lg font-medium text-foreground">Model Configuration</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Select the AI model and configure its creativity level
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="ai_model_identifier" className="text-sm font-medium">AI Model</Label>
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
              <Label htmlFor="temperature" className="text-sm font-medium block mb-2">
                Temperature: <Badge variant="secondary">{currentTemperature?.toFixed(2)}</Badge>
              </Label>
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
              <p className="mt-2 text-xs text-muted-foreground">
                Lower values produce more consistent responses, higher values increase creativity and randomness.
              </p>
              {errors.temperature && (
                <p className="mt-1 text-xs text-destructive">{errors.temperature.message}</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* System Prompt Section */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="h-6 w-6 bg-purple-100 dark:bg-purple-900 rounded flex items-center justify-center text-sm">
              ✨
            </div>
            <h2 className="text-lg font-medium text-foreground">System Prompt</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Define your AI's personality, expertise, and response style
          </p>
          
          <div className="space-y-4">
            <Controller
              name="system_prompt"
              control={control}
              render={({ field }) => (
                <Textarea 
                  {...field} 
                  value={field.value ?? ''} 
                  rows={8} 
                  className="bg-background text-foreground border-border font-mono text-sm"
                  placeholder="e.g., You are an expert tutor specializing in computer science. Provide clear explanations with practical examples..."
                  disabled={isUpdating}
                />
              )}
            />
            
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                {watch("system_prompt")?.length || 0} / 5000 characters
              </p>
              <div className="flex gap-2">
                <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={isUpdating}>
                      📚 Browse Presets
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>System Prompt Presets</DialogTitle>
                      <DialogDescription>
                        Choose from carefully crafted prompts for different use cases
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
                        <TabsContent key={category} value={category} className="max-h-[60vh] overflow-y-auto">
                          <div className="grid gap-3">
                            {presets.map(preset => (
                              <Card 
                                key={preset.id} 
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => handlePresetSelect(preset.prompt)}
                              >
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">{preset.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <p className="text-xs text-muted-foreground">{preset.prompt}</p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsPresetDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isBuilderDialogOpen} onOpenChange={setIsBuilderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={isUpdating}>
                      🔧 Custom Builder
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>System Prompt Builder</DialogTitle>
                      <DialogDescription>
                        Customize your AI's behavior by selecting traits and characteristics
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6">
                      {Object.entries(PROMPT_BUILDER_TRAITS).map(([key, trait]) => (
                        <div key={key} className="space-y-3">
                          <h4 className="font-medium text-sm">{trait.title}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {trait.options.map(option => (
                              <div
                                key={option.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                                  builderState[key as keyof PromptBuilderState] === option.id 
                                    ? 'border-primary bg-primary/10' 
                                    : 'border-border'
                                }`}
                                onClick={() => setBuilderState(prev => ({ ...prev, [key]: option.id }))}
                              >
                                <div className="font-medium text-xs">{option.label}</div>
                                <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Preview:</h4>
                      <p className="text-xs text-muted-foreground font-mono whitespace-pre-line">
                        {generatePromptFromBuilder()}
                      </p>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsBuilderDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleBuilderApply}>Apply Custom Prompt</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            {errors.system_prompt && (
              <p className="mt-1 text-xs text-destructive">{errors.system_prompt.message}</p>
            )}
          </div>
        </div>

        <Separator />

        <div className="flex justify-end pt-4">
          <Button 
            type="submit" 
            disabled={isUpdating || !isDirty} 
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
            size="lg"
          >
            {isUpdating ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </form>
    </div>
  );
} 