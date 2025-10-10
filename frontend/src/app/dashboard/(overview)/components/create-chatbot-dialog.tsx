"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateChatbot } from "../hooks/useCreateChatbot";
import { CreateChatbotPayload } from '@/app/dashboard/libs/queries';
import { predefinedThemes } from '@/app/dashboard/chatbots/[chatbotId]/settings/appearance/themes';
import { Loader2 } from 'lucide-react'; // For loading spinner
import { toast } from "sonner"; // Import toast from sonner

interface CreateChatbotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void; // Optional: Callback on successful creation
}

/**
 * Default values for new chatbots to ensure a good out-of-the-box experience.
 * These values provide:
 * - Cost-effective AI model (gpt-4o-mini)
 * - Balanced creativity (temperature 0.7)
 * - Professional, accessible theme (uses default from themes.ts)
 * - Friendly default system prompt
 * - Helpful suggested questions
 * - Private visibility for safety (user can change to public/shared later)
 */
const getDefaultChatbotValues = (): Partial<CreateChatbotPayload> => ({
  ai_model_identifier: 'gpt-4o-mini', // Default to the most cost-effective model
  system_prompt: 'You are a helpful and friendly AI assistant. Respond clearly and concisely while maintaining a warm, approachable tone.',
  temperature: 0.7, // Balanced creativity
  theme: predefinedThemes[0].config, // Use the first predefined theme (Syllabi Default)
  welcome_message: "Hello! I'm here to help you with any questions you might have. How can I assist you today?",
  suggested_questions: [
    "How can you help me?",
    "What topics can you assist with?",
    "Tell me more about your capabilities"
  ],
  visibility: 'private', // Start as private - user can change later
  is_active: true, // Active by default
});

export function CreateChatbotDialog({ open, onOpenChange, onSuccess }: CreateChatbotDialogProps) {
  const [name, setName] = useState("");
  const [studentFacingName, setStudentFacingName] = useState("");

  const createChatbotMutation = useCreateChatbot();

  useEffect(() => {
    // Show toast if mutation results in an error that wasn't caught by local submit handler
    if (createChatbotMutation.isError && createChatbotMutation.error) {
      toast.error(createChatbotMutation.error.message || "Failed to create chatbot.");
      // Optionally reset mutation if you want the user to be able to try again without re-opening
      // createChatbotMutation.reset(); 
    }
  }, [createChatbotMutation.isError, createChatbotMutation.error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required."); // Use toast for form validation error
      return;
    }

    const payload: CreateChatbotPayload = {
      user_id: '', // This will be set on the server
      name: name.trim(),
      student_facing_name: studentFacingName.trim() || undefined,
      ...getDefaultChatbotValues(),
    };

    try {
      await createChatbotMutation.mutateAsync(payload);
      toast.success(`Chatbot "${payload.name}" created with intelligent defaults! You can customize it in the settings.`);
      setName("");
      setStudentFacingName("");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      // mutateAsync throws error, so it will be caught here.
      // The useEffect above also handles createChatbotMutation.error for more general mutation errors.
      // This local catch is good if the error needs to be handled specifically within the dialog before closing.
      console.error("Dialog submission error:", err);
      toast.error(err.message || "Failed to create chatbot. Please try again.");
    }
  };

  const handleDialogValidClose = (isOpen: boolean) => {
    if (!createChatbotMutation.isPending) {
        onOpenChange(isOpen);
        if (!isOpen) {
            setName("");
            setStudentFacingName("");
            createChatbotMutation.reset();
        }
      }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogValidClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Chatbot</DialogTitle>
          <DialogDescription>
            Give your new chatbot a name to get started. We'll set up intelligent defaults for AI model, theme, and behavior that you can customize later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name*
            </Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="col-span-3" 
              placeholder="e.g., Fall 2024 - CS101 Intro"
              disabled={createChatbotMutation.isPending}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="studentFacingName" className="text-right">
              Public Name
            </Label>
            <Input 
              id="studentFacingName" 
              value={studentFacingName} 
              onChange={(e) => setStudentFacingName(e.target.value)} 
              className="col-span-3" 
              placeholder="(Optional) e.g., CS101 Course Helper"
              disabled={createChatbotMutation.isPending}
            />
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={createChatbotMutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={createChatbotMutation.isPending || !name.trim()}>
            {createChatbotMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
            ) : "Create Chatbot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 