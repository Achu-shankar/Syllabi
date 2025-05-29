"use client";

import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useDeleteChatbot } from "../hooks/useDeleteChatbot";
import { Chatbot } from '@/app/dashboard/libs/queries';
import { Loader2 } from 'lucide-react';
import { toast } from "sonner";

interface DeleteConfirmationDialogProps {
  chatbot: Chatbot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteConfirmationDialog({ chatbot, open, onOpenChange }: DeleteConfirmationDialogProps) {
  const deleteChatbotMutation = useDeleteChatbot();

  useEffect(() => {
    if (deleteChatbotMutation.isError && deleteChatbotMutation.error) {
      toast.error(deleteChatbotMutation.error.message || "Failed to delete chatbot.");
    }
  }, [deleteChatbotMutation.isError, deleteChatbotMutation.error]);

  const handleDelete = async () => {
    if (!chatbot) return;

    try {
      await deleteChatbotMutation.mutateAsync(chatbot.id);
      toast.success(`Chatbot "${chatbot.name}" deleted successfully!`);
      onOpenChange(false);
    } catch (err: any) {
      // Error is handled by useEffect
      console.error("Dialog submission error for delete:", err);
    }
  };
  
  const handleDialogClose = (isOpen: boolean) => {
    if (!deleteChatbotMutation.isPending) {
        onOpenChange(isOpen);
        if (!isOpen) {
            deleteChatbotMutation.reset();
        }
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleDialogClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the chatbot
            <strong className="mx-1">{chatbot?.name}</strong>
            and all of its associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteChatbotMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            disabled={deleteChatbotMutation.isPending || !chatbot}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteChatbotMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
            ) : "Yes, delete chatbot"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 