"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateChatbot } from "../hooks/useUpdateChatbot";
import { UpdateChatbotPayload, Chatbot } from '@/app/dashboard/libs/queries';
import { Loader2 } from 'lucide-react';
import { toast } from "sonner";

interface EditChatbotDialogProps {
  chatbot: Chatbot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditChatbotDialog({ chatbot, open, onOpenChange }: EditChatbotDialogProps) {
  const [name, setName] = useState("");
  const [studentFacingName, setStudentFacingName] = useState("");

  const updateChatbotMutation = useUpdateChatbot();

  useEffect(() => {
    if (chatbot) {
      setName(chatbot.name || "");
      setStudentFacingName(chatbot.student_facing_name || "");
    } else {
        // Reset if no chatbot is passed (e.g. dialog closed then re-opened for a new edit before state clears)
        setName("");
        setStudentFacingName("");
    }
  }, [chatbot, open]); // Rerun if chatbot changes or dialog opens

  useEffect(() => {
    if (updateChatbotMutation.isError && updateChatbotMutation.error) {
      toast.error(updateChatbotMutation.error.message || "Failed to update chatbot.");
    }
  }, [updateChatbotMutation.isError, updateChatbotMutation.error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatbot) return;
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }

    const payload: UpdateChatbotPayload = {
      name: name.trim(),
      student_facing_name: studentFacingName.trim() || undefined,
    };

    try {
      await updateChatbotMutation.mutateAsync({ chatbotId: chatbot.id, payload });
      toast.success(`Chatbot "${payload.name}" updated successfully!`);
      onOpenChange(false);
    } catch (err: any) {
      // Error is handled by useEffect, but you could add more specific handling here
      console.error("Dialog submission error for update:", err);
      // toast.error(err.message || "Failed to update chatbot. Please try again."); // Already handled by useEffect
    }
  };
  
  const handleDialogClose = (isOpen: boolean) => {
    if (!updateChatbotMutation.isPending) {
        onOpenChange(isOpen);
        if (!isOpen) {
            updateChatbotMutation.reset(); // Reset mutation state on close
        }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Chatbot</DialogTitle>
          <DialogDescription>
            Update the details for your chatbot. Current name: <strong>{chatbot?.name}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="editName" className="text-right">
              Name*
            </Label>
            <Input 
              id="editName" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="col-span-3" 
              disabled={updateChatbotMutation.isPending}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="editStudentFacingName" className="text-right">
              Public Name
            </Label>
            <Input 
              id="editStudentFacingName" 
              value={studentFacingName} 
              onChange={(e) => setStudentFacingName(e.target.value)} 
              className="col-span-3" 
              disabled={updateChatbotMutation.isPending}
            />
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={updateChatbotMutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={updateChatbotMutation.isPending || !name.trim() || !chatbot}>
            {updateChatbotMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 