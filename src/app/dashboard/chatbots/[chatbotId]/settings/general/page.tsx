"use client";

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from "sonner";

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from "@/components/ui/switch";
import { useFetchChatbotDetails, useUpdateChatbotSettings } from '../../hooks/useChatbotSettings';
import { UpdateChatbotPayload, Chatbot, ChatbotVisibility } from '@/app/dashboard/libs/queries';
import { Separator } from "@/components/ui/separator";

// Zod schema for validation
const generalSettingsSchema = z.object({
  name: z.string().min(1, "Chatbot name is required.").min(3, "Chatbot name must be at least 3 characters long."),
  student_facing_name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  welcome_message: z.string().nullable().optional(),
  visibility: z.enum(['private', 'public', 'shared'] as const),
});

type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;

export default function ChatbotGeneralSettingsPage() {
  const params = useParams();
  const chatbotId = params.chatbotId as string;

  const { data: chatbot, isLoading: isLoadingDetails, error: fetchError } = useFetchChatbotDetails(chatbotId);
  const { mutate: updateSettings, isPending: isUpdating } = useUpdateChatbotSettings(chatbotId);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      name: '',
      student_facing_name: null,
      description: null,
      welcome_message: null,
      visibility: 'private',
    }
  });

  const visibilityValue = watch("visibility");

  useEffect(() => {
    if (chatbot) {
      reset({
        name: chatbot.name ?? '',
        student_facing_name: chatbot.student_facing_name ?? null,
        description: chatbot.description ?? null,
        welcome_message: chatbot.welcome_message ?? null,
        visibility: chatbot.visibility ?? 'private',
      });
    }
  }, [chatbot, reset]);

  const handleVisibilityToggle = (newVisibility: ChatbotVisibility) => {
    updateSettings(
      { visibility: newVisibility }, 
      {
        onSuccess: (data) => {
            toast.success(`Chatbot visibility changed to ${newVisibility}.`);
        },
      }
    );
  };

  const onSubmit: SubmitHandler<GeneralSettingsFormData> = (formData) => {
    const payload: UpdateChatbotPayload = {
        name: formData.name,
        student_facing_name: formData.student_facing_name ?? undefined,
        description: formData.description ?? undefined,
        welcome_message: formData.welcome_message ?? undefined,
        visibility: formData.visibility,
    };
    updateSettings(payload);
  };

  if (isLoadingDetails) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto">
        <div>
          <Skeleton className="h-8 w-1/2 mb-2 bg-muted" />
          <Skeleton className="h-4 w-3/4 bg-muted" />
        </div>
        <hr className="my-6 border-border" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/4 mb-1 bg-muted" />
          <Skeleton className="h-10 w-full bg-muted" />
          <Skeleton className="h-4 w-2/3 bg-muted" />
        </div>
         <div className="space-y-4">
          <Skeleton className="h-6 w-1/4 mb-1 bg-muted" />
          <Skeleton className="h-10 w-full bg-muted" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/4 mb-1 bg-muted" />
          <Skeleton className="h-20 w-full bg-muted" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/4 mb-1 bg-muted" />
          <Skeleton className="h-20 w-full bg-muted" />
        </div>
        <div className="flex justify-end">
            <Skeleton className="h-10 w-24 bg-muted" />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return <div className="text-destructive">Error loading chatbot details: {fetchError.message}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-start">
      <div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">General Settings</h1>
        <p className="text-muted-foreground">
            Manage basic information and initial messages for your chatbot
          </p>
        </div>
        <div className="flex items-center space-x-2 pt-1">
          <Controller
            name="visibility"
            control={control}
            render={({ field }) => (
              <Switch
                id="visibilitySwitch"
                checked={field.value === 'public'}
                onCheckedChange={(checked) => {
                  field.onChange(checked ? 'public' : 'private');
                  handleVisibilityToggle(checked ? 'public' : 'private');
                }}
                aria-label="Visibility status"
              />
            )}
          />
          <Label htmlFor="visibilitySwitch" className="text-sm font-medium text-foreground">
            {visibilityValue === 'public' ? "Public" : visibilityValue === 'shared' ? "Shared" : "Private"}
          </Label>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Chatbot Information Section */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="h-6 w-6 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center text-sm">
              🤖
            </div>
            <h2 className="text-lg font-medium text-foreground">Chatbot Identity</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Define the core names and description for your chatbot
          </p>
          
          <div className="space-y-6">
            <div className="md:w-1/2">
              <Label htmlFor="name" className="text-sm font-medium">Internal Name (Required)</Label>
              <Input 
                id="name" 
                {...register("name")} 
                className="mt-2"
                placeholder="e.g., CS101 Intro Bot" 
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
              <p className="mt-1 text-xs text-muted-foreground">This name is for your internal reference and won't be shown to students.</p>
            </div>

            <div className="md:w-1/2">
              <Label htmlFor="student_facing_name" className="text-sm font-medium">Student-Facing Name</Label>
              <Input 
                id="student_facing_name" 
                {...register("student_facing_name")} 
                className="mt-2"
                placeholder="e.g., Course Helper" 
              />
              <p className="mt-1 text-xs text-muted-foreground">The name displayed to students in the chat interface.</p>
              {errors.student_facing_name && <p className="mt-1 text-xs text-destructive">{errors.student_facing_name.message}</p>}
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea 
                id="description" 
                {...register("description")} 
                rows={3}
                className="mt-2"
                placeholder="A short summary of what this chatbot helps with."
              />
              {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>}
            </div>
          </div>
        </div>

        <Separator />
        
        {/* Initial Messages Section */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="h-6 w-6 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center text-sm">
              💬
            </div>
            <h2 className="text-lg font-medium text-foreground">Initial Interaction</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Configure the first message users see
          </p>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="welcome_message" className="text-sm font-medium">Welcome Message</Label>
              <Textarea 
                id="welcome_message" 
                {...register("welcome_message")} 
                rows={3}
                className="mt-2"
                placeholder="Hello! I'm here to help. Ask me anything about the course." 
              />
              <p className="mt-1 text-xs text-muted-foreground">The first message your chatbot sends. Keep it friendly and informative!</p>
              {errors.welcome_message && <p className="mt-1 text-xs text-destructive">{errors.welcome_message.message}</p>}
            </div>
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