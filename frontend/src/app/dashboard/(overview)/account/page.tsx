"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFetchUserProfile, useUpdateUserProfile, useDeleteUserAccount } from './hooks/useUserProfile';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

const profileFormSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100, "Full name must be 100 characters or less"),
  email: z.string().email("Invalid email address").optional(), // Email is typically not changed here
  avatar_url: z.string().url("Invalid URL format").optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function AccountPage() {
  const { data: userProfile, isLoading: isLoadingProfile, error: fetchError } = useFetchUserProfile();
  const { mutate: updateUser, isPending: isUpdatingProfile } = useUpdateUserProfile();
  const { mutate: deleteAccount, isPending: isDeletingAccount } = useDeleteUserAccount();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const deleteTriggerText = "DELETE";

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: '',
      email: '',
      avatar_url: '',
    },
  });

  const router = useRouter();
  const supabaseClient = createClient();

  useEffect(() => {
    if (userProfile) {
      form.reset({
        full_name: userProfile.full_name || '',
        email: (userProfile as any).email || 'Loading...',
        avatar_url: userProfile.avatar_url || '',
      });
    }
  }, [userProfile, form]);

  const onSubmit = (values: ProfileFormValues) => {
    const payload: { full_name?: string; avatar_url?: string | null } = {};
    if (values.full_name !== (userProfile?.full_name || '')) {
      payload.full_name = values.full_name;
    }
    const originalAvatarUrl = userProfile?.avatar_url || '';
    if (values.avatar_url !== originalAvatarUrl) {
      payload.avatar_url = values.avatar_url === '' ? null : values.avatar_url;
    }
    if (Object.keys(payload).length === 0) {
      toast.info("No changes detected.");
      return;
    }
    updateUser(payload as { full_name?: string; avatar_url?: string }, {
      onSuccess: () => {
        toast.success("Profile updated successfully!");
      },
      onError: (error) => {
        toast.error(`Failed to update profile: ${error.message}`);
      },
    });
  };

  const handleDeleteAccount = async () => {
    console.log("Attempting to delete account via API route...");
    deleteAccount(undefined, {
      onSuccess: async (data) => {
        toast.success(data.message || "Account deletion successful. Logging out...");
        setIsDeleteDialogOpen(false);
        setDeleteConfirmationText("");
        try {
          await supabaseClient.auth.signOut();
          router.push('/');
          router.refresh();
        } catch (signOutError) {
          console.error("Error during sign out after account deletion:", signOutError);
          toast.error("Account deleted, but failed to sign out automatically. Please sign out manually.");
          router.push('/');
          router.refresh();
        }
      },
      onError: (error) => {
        toast.error(`Failed to delete account: ${error.message}`);
      },
    });
  };

  if (isLoadingProfile) {
    return (
      <div className="mx-32 space-y-8">
        <div>
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="space-y-6 pt-6 border-t">
          <div> 
            <Skeleton className="h-6 w-1/4 mb-4" />
            <div className="space-y-1 mb-4">
              <Skeleton className="h-4 w-1/6 mb-1" />
              <Skeleton className="h-10 w-full max-w-md" />
            </div>
            <div className="space-y-1 mb-4">
              <Skeleton className="h-4 w-1/6 mb-1" />
              <Skeleton className="h-10 w-full max-w-md" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-1/6 mb-1" />
              <Skeleton className="h-10 w-full max-w-md" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 mt-4" />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return <p className="text-red-500">Error loading profile: {fetchError.message}</p>;
  }

  return (
    <div className="mx-32 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your account details and preferences.
        </p>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-xl font-semibold mb-1">Profile Information</h2>
        <p className="text-sm text-muted-foreground mb-6">Update your personal details.</p>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              {...form.register("email")} 
              disabled 
              className="bg-muted/50"
            />
            {form.formState.errors.email && <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" {...form.register("full_name")} />
            {form.formState.errors.full_name && <p className="text-sm text-red-500">{form.formState.errors.full_name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="avatar_url">Avatar URL (Optional)</Label>
            <Input id="avatar_url" {...form.register("avatar_url")} placeholder="https://example.com/avatar.png" />
            {form.formState.errors.avatar_url && <p className="text-sm text-red-500">{form.formState.errors.avatar_url.message}</p>}
          </div>

          <div>
            <Button type="submit" disabled={isUpdatingProfile || !form.formState.isDirty} className="mt-2">
              {isUpdatingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>

      {/* Delete Account Section */}
      <div className="border-t pt-6">
        <h2 className="text-xl font-semibold mb-1 text-destructive">Delete Account</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account, chatbots, and all associated data. This action is irreversible.
        </p>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete Account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  This action cannot be undone. This will permanently delete your account, 
                  all your chatbots, and remove all your data from our servers.
                </p>
                <p>
                  Please type "<strong>{deleteTriggerText}</strong>" to confirm.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input 
              type="text"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder={`Type "${deleteTriggerText}" here`}
              className="my-2"
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setDeleteConfirmationText(''); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteAccount} 
                disabled={deleteConfirmationText !== deleteTriggerText || isDeletingAccount || isUpdatingProfile}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeletingAccount ? "Deleting..." : "Delete My Account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
    