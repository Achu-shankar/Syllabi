"use client";

import React, { useEffect, useCallback, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from "sonner";

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FieldsetBlock } from './FieldsetBlock';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Bot, MessageSquare } from 'lucide-react';
import { useUpdateChatbotSettings } from '../../hooks/useChatbotSettings';
import { UpdateChatbotPayload, Chatbot } from '@/app/dashboard/libs/queries';
import { useSettingsDirty } from './SettingsDirtyContext';

// Zod schema for validation
const generalSettingsSchema = z.object({
  name: z.string().min(1, "Chatbot name is required.").min(3, "Chatbot name must be at least 3 characters long."),
  student_facing_name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  welcome_message: z.string().nullable().optional(),
});

type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;

interface GeneralSettingsSectionProps {
  chatbot: Chatbot | undefined;
  chatbotId: string;
}

export function GeneralSettingsSection({ chatbot, chatbotId }: GeneralSettingsSectionProps) {
  const { mutate: updateSettings, isPending: isUpdating } = useUpdateChatbotSettings(chatbotId);
  const { setDirty, registerSaveHandler, registerResetHandler } = useSettingsDirty();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    watch,
  } = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      name: '',
      student_facing_name: null,
      description: null,
      welcome_message: null,
    }
  });

  const lastSavedFormRef = useRef<GeneralSettingsFormData | null>(null);

  useEffect(() => {
    if (chatbot) {
      const initialForm: GeneralSettingsFormData = {
        name: chatbot.name ?? '',
        student_facing_name: chatbot.student_facing_name ?? null,
        description: chatbot.description ?? null,
        welcome_message: chatbot.welcome_message ?? null,
      };
      reset(initialForm);
      lastSavedFormRef.current = initialForm;
    }
  }, [chatbot, reset]);

  // Watch for dirty state and update context
  useEffect(() => {
    setDirty('general', isDirty);
  }, [isDirty, setDirty]);

  const onSubmit = useCallback<SubmitHandler<GeneralSettingsFormData>>((formData) => {
    const payload: UpdateChatbotPayload = {
      name: formData.name,
      student_facing_name: formData.student_facing_name ?? undefined,
      description: formData.description ?? undefined,
      welcome_message: formData.welcome_message ?? undefined,
    };
    updateSettings(payload, {
      onSuccess: () => {
        lastSavedFormRef.current = formData;
      }
    });
  }, [updateSettings]);

  // Register save handler
  useEffect(() => {
    registerSaveHandler('general', async () => {
      await handleSubmit(onSubmit)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerSaveHandler, handleSubmit, onSubmit]);

  // Register reset handler
  useEffect(() => {
    registerResetHandler('general', async () => {
      if (lastSavedFormRef.current) {
        reset(lastSavedFormRef.current);
      }
    });
  }, [registerResetHandler, reset]);

  return (
    <div className="space-y-6">
        <div>
        <h2 className="text-lg font-semibold text-foreground">General Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
            Manage basic information and initial messages for your chatbot
          </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <FieldsetBlock title="Chatbot Identity" required icon={<Bot className="h-4 w-4" />} index={0}>
              <div>
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="name" className="text-sm font-medium">Internal Name</Label>
                  <span className="text-destructive">*</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>For your internal reference only</TooltipContent>
                  </Tooltip>
                </div>
                <Input 
                  id="name" 
                  {...register("name")} 
                  className="mt-1.5"
                  placeholder="e.g., CS101 Intro Bot" 
                />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="student_facing_name" className="text-sm font-medium">Student-Facing Name</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>Displayed to students in chat</TooltipContent>
                  </Tooltip>
                </div>
                <Input 
                  id="student_facing_name" 
                  {...register("student_facing_name")} 
                  className="mt-1.5"
                  placeholder="e.g., Course Helper" 
                />
                {errors.student_facing_name && <p className="mt-1 text-xs text-destructive">{errors.student_facing_name.message}</p>}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                </div>
                <Textarea 
                  id="description" 
                  {...register("description")} 
                  rows={3}
                  className="mt-1.5 resize-none"
                  placeholder="A brief summary of what this chatbot helps with..."
                />
                {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>}
              </div>
            </FieldsetBlock>
          </div>
          
          <div>
            <FieldsetBlock title="Initial Interaction" icon={<MessageSquare className="h-4 w-4" />} index={1}>
              <div>
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="welcome_message" className="text-sm font-medium">Welcome Message</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>First message users see when they start a conversation</TooltipContent>
                  </Tooltip>
                </div>
                <Textarea 
                  id="welcome_message" 
                  {...register("welcome_message")} 
                  rows={4}
                  className="mt-1.5 resize-none"
                  placeholder="Hello! I'm here to help. Ask me anything about the course." 
                />
                {errors.welcome_message && <p className="mt-1 text-xs text-destructive">{errors.welcome_message.message}</p>}
              </div>
            </FieldsetBlock>
        </div>
        </div>
      </form>

      {/* Preview chip */}
      {watch('welcome_message') ? (
        <p className="text-xs text-muted-foreground mt-1">Students will see: <span className="font-medium">{watch('welcome_message')!.slice(0,40)}{watch('welcome_message')!.length>40?'…':''}</span></p>
      ) : null}
    </div>
  );
} 