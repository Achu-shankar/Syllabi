"use client";

import React, { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from "sonner";

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdateChatbotSettings } from '../../hooks/useChatbotSettings';
import { UpdateChatbotPayload, Chatbot } from '@/app/dashboard/libs/queries';
import { Bot, MessageSquare } from 'lucide-react';

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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      name: '',
      student_facing_name: null,
      description: null,
      welcome_message: null,
    }
  });

  useEffect(() => {
    if (chatbot) {
      reset({
        name: chatbot.name ?? '',
        student_facing_name: chatbot.student_facing_name ?? null,
        description: chatbot.description ?? null,
        welcome_message: chatbot.welcome_message ?? null,
      });
    }
  }, [chatbot, reset]);

  const onSubmit: SubmitHandler<GeneralSettingsFormData> = (formData) => {
    const payload: UpdateChatbotPayload = {
      name: formData.name,
      student_facing_name: formData.student_facing_name ?? undefined,
      description: formData.description ?? undefined,
      welcome_message: formData.welcome_message ?? undefined,
    };
    updateSettings(payload);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage basic information and initial messages for your chatbot
          </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chatbot Identity Card */}
          <Card className="shadow-none border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                Chatbot Identity
              </CardTitle>
              <CardDescription>
                Define the core names and description for your chatbot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-900">Internal Name *</Label>
                <Input 
                  id="name" 
                  {...register("name")} 
                  className="mt-1.5"
                  placeholder="e.g., CS101 Intro Bot" 
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
                <p className="mt-1 text-xs text-gray-500">For your internal reference only</p>
              </div>

              <div>
                <Label htmlFor="student_facing_name" className="text-sm font-medium text-gray-900">Student-Facing Name</Label>
                <Input 
                  id="student_facing_name" 
                  {...register("student_facing_name")} 
                  className="mt-1.5"
                  placeholder="e.g., Course Helper" 
                />
                <p className="mt-1 text-xs text-gray-500">Displayed to students in chat</p>
                {errors.student_facing_name && <p className="mt-1 text-xs text-red-600">{errors.student_facing_name.message}</p>}
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-900">Description</Label>
                <Textarea 
                  id="description" 
                  {...register("description")} 
                  rows={3}
                  className="mt-1.5 resize-none"
                  placeholder="A brief summary of what this chatbot helps with..."
                />
                {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
              </div>
            </CardContent>
          </Card>
          
          {/* Initial Interaction Card */}
          <Card className="shadow-none border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                </div>
                Initial Interaction
              </CardTitle>
              <CardDescription>
                Configure the first message users see when they start a conversation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="welcome_message" className="text-sm font-medium text-gray-900">Welcome Message</Label>
                <Textarea 
                  id="welcome_message" 
                  {...register("welcome_message")} 
                  rows={4}
                  className="mt-1.5 resize-none"
                  placeholder="Hello! I'm here to help. Ask me anything about the course." 
                />
                <p className="mt-1 text-xs text-gray-500">Keep it friendly and informative!</p>
                {errors.welcome_message && <p className="mt-1 text-xs text-red-600">{errors.welcome_message.message}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <Button 
            type="submit" 
            disabled={isUpdating || !isDirty} 
            className="bg-gray-900 text-white hover:bg-gray-800 px-6 h-10 font-medium"
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
} 