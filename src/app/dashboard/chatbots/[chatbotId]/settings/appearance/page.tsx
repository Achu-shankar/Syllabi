"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm, Controller, SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useFetchChatbotDetails, useUpdateChatbotSettings } from '../../hooks/useChatbotSettings';
import { UpdateChatbotPayload, ThemeConfig, ThemeColors, Chatbot } from '@/app/dashboard/libs/queries';
import { predefinedThemes } from './themes';
import { ImagePicker } from './ImagePicker';
import { aiMessageAvatarPresets, userMessageAvatarPresets, brandingLogoPresets } from './avatarPresets';
import { ChatPreview } from './ChatPreview';
import { Sun, Moon } from 'lucide-react';

// Zod schema for ThemeColors
const themeColorsSchema = z.object({
  primaryColor: z.string().optional(),
  headerTextColor: z.string().optional(),
  chatWindowBackgroundColor: z.string().optional(),
  bubbleUserBackgroundColor: z.string().optional(),
  bubbleBotBackgroundColor: z.string().optional(),
  inputBackgroundColor: z.string().optional(),
  inputTextColor: z.string().optional(),
  sidebarBackgroundColor: z.string().optional(),
  sidebarTextColor: z.string().optional(),
  inputAreaBackgroundColor: z.string().optional(),
  bubbleUserTextColor: z.string().optional(),
  bubbleBotTextColor: z.string().optional(),
  suggestedQuestionChipBackgroundColor: z.string().optional(),
  suggestedQuestionChipTextColor: z.string().optional(),
  suggestedQuestionChipBorderColor: z.string().optional(),
}).catchall(z.any());

// Updated Zod schema for ThemeConfig, using themeColorsSchema for light/dark
const themeConfigSchema = z.object({
  fontFamily: z.string().optional(),
  aiMessageAvatarUrl: z.string().url({ message: "Invalid URL for AI avatar." }).optional().nullable(),
  userMessageAvatarUrl: z.string().url({ message: "Invalid URL for User avatar." }).optional().nullable(),
  light: themeColorsSchema,
  dark: themeColorsSchema,
}).catchall(z.any());

const appearanceSettingsSchema = z.object({
  student_facing_name: z.string().optional().nullable(),
  branding_logo_url: z.string()
    .optional()
    .nullable()
    .refine(value => {
      if (value === null || value === undefined || value === "") return true;
      return z.string().url().safeParse(value).success;
    }, { message: "Please enter a valid URL for branding logo or leave it empty." }),
  theme: themeConfigSchema,
  selectedThemeId: z.string().optional(), 
  suggested_questions: z.array(z.object({ text: z.string().min(1, "Suggestion cannot be empty.") })).optional(),
});

type AppearanceFormData = z.infer<typeof appearanceSettingsSchema>;

const defaultThemeConfig = predefinedThemes[0].config;

export default function ChatbotAppearancePage() {
  const params = useParams();
  const chatbotId = params.chatbotId as string;

  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');

  const { data: chatbot, isLoading: isLoadingDetails, error: fetchError } = useFetchChatbotDetails(chatbotId);
  const { mutate: updateSettings, isPending: isUpdating } = useUpdateChatbotSettings(chatbotId);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<AppearanceFormData>({
    resolver: zodResolver(appearanceSettingsSchema),
    defaultValues: {
      student_facing_name: null,
      branding_logo_url: null,
      theme: defaultThemeConfig,
      selectedThemeId: predefinedThemes[0].id, 
      suggested_questions: [],
    }
  });

  const { fields, append, remove } = useFieldArray<AppearanceFormData, "suggested_questions", "id">({
    control,
    name: "suggested_questions",
  });

  const watchedFormValues = watch();

  useEffect(() => {
    if (chatbot) {
      let initialThemeConf = chatbot.theme as ThemeConfig | null;
      // Check if the fetched theme is in the old flat format or null/incomplete
      if (!initialThemeConf || !initialThemeConf.light || !initialThemeConf.dark) {
        console.warn("Chatbot theme is in old format or missing. Initializing with default structure.");
        const baseForMigration: any = initialThemeConf || {}; // Use any for migration flexibility
        initialThemeConf = {
          fontFamily: baseForMigration.fontFamily || defaultThemeConfig.fontFamily,
          aiMessageAvatarUrl: baseForMigration.aiMessageAvatarUrl !== undefined ? baseForMigration.aiMessageAvatarUrl : defaultThemeConfig.aiMessageAvatarUrl,
          userMessageAvatarUrl: baseForMigration.userMessageAvatarUrl !== undefined ? baseForMigration.userMessageAvatarUrl : defaultThemeConfig.userMessageAvatarUrl,
          light: {
            ...defaultThemeConfig.light,
            primaryColor: baseForMigration.primaryColor || defaultThemeConfig.light.primaryColor,
            headerTextColor: baseForMigration.headerTextColor || defaultThemeConfig.light.headerTextColor,
            chatWindowBackgroundColor: baseForMigration.chatWindowBackgroundColor || defaultThemeConfig.light.chatWindowBackgroundColor,
            bubbleUserBackgroundColor: baseForMigration.bubbleUserBackgroundColor || defaultThemeConfig.light.bubbleUserBackgroundColor,
            bubbleBotBackgroundColor: baseForMigration.bubbleBotBackgroundColor || defaultThemeConfig.light.bubbleBotBackgroundColor,
            inputBackgroundColor: baseForMigration.inputBackgroundColor || defaultThemeConfig.light.inputBackgroundColor,
            inputTextColor: baseForMigration.inputTextColor || defaultThemeConfig.light.inputTextColor,
          },
          dark: {
            ...defaultThemeConfig.dark,
            // Example: if old themes had specific dark flat props, map them here
            // primaryColor: baseForMigration.darkPrimaryColor || defaultThemeConfig.dark.primaryColor, 
          },
        };
      }

      const initialSelectedThemeId = predefinedThemes.find(pt => 
        pt.config.fontFamily === initialThemeConf?.fontFamily && 
        JSON.stringify(pt.config.light) === JSON.stringify(initialThemeConf?.light) &&
        JSON.stringify(pt.config.dark) === JSON.stringify(initialThemeConf?.dark)
      )?.id || 'custom';
      
      reset({
        student_facing_name: chatbot.student_facing_name ?? '',
        branding_logo_url: chatbot.logo_url ?? '',
        theme: initialThemeConf as ThemeConfig,
        selectedThemeId: initialSelectedThemeId,
        suggested_questions: chatbot.suggested_questions?.map(q => ({ text: q })) ?? [],
      });
    }
  }, [chatbot, reset]);

  const handleThemeChange = (themeId: string) => {
    const selectedPredefined = predefinedThemes.find(t => t.id === themeId);
    if (selectedPredefined) {
      const currentStudentFacingName = getValues("student_facing_name");
      const currentBrandingLogo = getValues("branding_logo_url");
      const currentAiAvatar = getValues("theme.aiMessageAvatarUrl");
      const currentUserAvatar = getValues("theme.userMessageAvatarUrl");

      const newThemeConfig: ThemeConfig = {
        ...selectedPredefined.config,
        aiMessageAvatarUrl: currentAiAvatar ?? selectedPredefined.config.aiMessageAvatarUrl,
        userMessageAvatarUrl: currentUserAvatar ?? selectedPredefined.config.userMessageAvatarUrl,
      };
      
      setValue("theme", newThemeConfig, { shouldDirty: true });
      setValue("selectedThemeId", selectedPredefined.id);
    }
  };

  const onSubmit: SubmitHandler<AppearanceFormData> = (formData) => {
    const finalBrandingLogoUrl = (formData.branding_logo_url === "" || formData.branding_logo_url === undefined) 
                                 ? null 
                                 : formData.branding_logo_url;
    const finalStudentFacingName = (formData.student_facing_name === "" || formData.student_facing_name === undefined) 
                                 ? null 
                                 : formData.student_facing_name;

    const payload: UpdateChatbotPayload = {
        student_facing_name: finalStudentFacingName,
        logo_url: finalBrandingLogoUrl, 
        theme: formData.theme,
        suggested_questions: formData.suggested_questions?.map(q => q.text),
    };
    updateSettings(payload);
  };

  // Prepare error messages for cleaner JSX - adjust paths if needed for nested theme errors
  const aiAvatarError = errors.theme?.aiMessageAvatarUrl; 
  const userAvatarError = errors.theme?.userMessageAvatarUrl;

  const previewTheme = watchedFormValues.theme || defaultThemeConfig;
  const previewSuggestedQuestions = watchedFormValues.suggested_questions?.map(q => q.text) || (chatbot?.suggested_questions || []);
  const previewBrandingLogoUrl = watchedFormValues.branding_logo_url || chatbot?.logo_url;
  const previewStudentFacingName = watchedFormValues.student_facing_name || chatbot?.student_facing_name;

  if (isLoadingDetails) {
    return <div className="max-w-7xl mx-auto p-6"><Skeleton className="h-96 w-full bg-muted" /></div>;
  }

  if (fetchError) {
    return <div className="text-destructive max-w-7xl mx-auto p-6">Error: {fetchError.message}</div>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-7xl mx-auto">
      <div className="flex-grow space-y-8 md:max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Appearance & Interface</h1>
          <p className="text-muted-foreground">
            Customize how your chatbot looks and suggest initial questions
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Theme Selection */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-6 w-6 bg-indigo-100 dark:bg-indigo-900 rounded flex items-center justify-center text-sm">
                🎨
              </div>
              <h2 className="text-lg font-medium text-foreground">Theme</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Choose a visual theme for your chatbot (light and dark modes will be configured within)
            </p>
            
            <Controller
              name="selectedThemeId"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value); 
                    handleThemeChange(value); 
                  }}
                  value={field.value || predefinedThemes[0].id}
                >
                  <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {predefinedThemes.map(theme => (
                      <SelectItem key={theme.id} value={theme.id}>{theme.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.selectedThemeId?.message && <p className="mt-1 text-xs text-destructive">{errors.selectedThemeId.message}</p>}
            {/* Simplified theme error display */}
            {errors.theme && errors.theme.message && typeof errors.theme.message === 'string' && (
              <p className="mt-1 text-xs text-destructive">Theme error: {errors.theme.message}</p>
            )}
            {errors.theme && !errors.theme.message && (
                (errors.theme.light && typeof (errors.theme.light as any).message === 'string' && <p className="mt-1 text-xs text-destructive">Light theme error: {(errors.theme.light as any).message}</p>)
                || (errors.theme.dark && typeof (errors.theme.dark as any).message === 'string' && <p className="mt-1 text-xs text-destructive">Dark theme error: {(errors.theme.dark as any).message}</p>)
                || (errors.theme.fontFamily && typeof (errors.theme.fontFamily as any).message === 'string' && <p className="mt-1 text-xs text-destructive">Font family error: {(errors.theme.fontFamily as any).message}</p>)
                || (!errors.selectedThemeId && <p className="mt-1 text-xs text-destructive">Invalid theme configuration. Check theme fields.</p>)
            )}
          </div>
          
          <Separator />
          
          {/* Branding & Naming Section */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-6 w-6 bg-orange-100 dark:bg-orange-900 rounded flex items-center justify-center text-sm">
                🏷️
              </div>
              <h2 className="text-lg font-medium text-foreground">Branding & Naming</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Define your chatbot's public identity
            </p>
            
            <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0 md:items-start">
              <div className="md:flex-1 space-y-1.5">
                <Label htmlFor="student_facing_name" className="text-sm font-medium">Chatbot Display Name</Label>
                <Input 
                  id="student_facing_name" 
                  {...register("student_facing_name")} 
                  className="mt-2"
                  placeholder="e.g., Helpful Course Assistant" 
                />
                {errors.student_facing_name && <p className="mt-1 text-xs text-destructive">{errors.student_facing_name.message}</p>}
              </div>

              <div className="md:w-auto">
                <Controller
                  name="branding_logo_url"
                  control={control}
                  render={({ field }) => (
                    <ImagePicker 
                      label="Chatbot Branding Logo"
                      value={field.value}
                      onChange={field.onChange}
                      presets={brandingLogoPresets}
                      pickerId="brandingLogo"
                    />
                  )}
                />
                {errors.branding_logo_url && <p className="mt-1.5 text-xs text-destructive">{errors.branding_logo_url.message}</p>}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              The display name is shown in the chat header. The branding logo can be used in shared pages or embeds.
            </p>
          </div>

          <Separator />

          {/* Chat Interface Avatars Section */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-6 w-6 bg-cyan-100 dark:bg-cyan-900 rounded flex items-center justify-center text-sm">
                👤
              </div>
              <h2 className="text-lg font-medium text-foreground">Chat Interface Avatars</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Customize the avatars shown next to messages in the chat window (applies to all theme modes)
            </p>
            
            <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
              <div className="md:flex-1">
                <Controller
                  name="theme.aiMessageAvatarUrl"
                  control={control}
                  render={({ field }) => (
                    <ImagePicker
                      label="AI Message Avatar"
                      value={field.value}
                      onChange={field.onChange}
                      presets={aiMessageAvatarPresets}
                      pickerId="aiAvatar"
                    />
                  )}
                />
                {aiAvatarError && typeof aiAvatarError.message === 'string' && (
                  <p className="mt-1.5 text-xs text-destructive">{aiAvatarError.message}</p>
                )}
              </div>

              <div className="md:flex-1">
                <Controller
                  name="theme.userMessageAvatarUrl"
                  control={control}
                  render={({ field }) => (
                    <ImagePicker
                      label="Default User Message Avatar"
                      value={field.value}
                      onChange={field.onChange}
                      presets={userMessageAvatarPresets}
                      pickerId="userAvatar"
                    />
                  )}
                />
                {userAvatarError && typeof userAvatarError.message === 'string' && (
                  <p className="mt-1.5 text-xs text-destructive">{userAvatarError.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Suggested Messages Section */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-6 w-6 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center text-sm">
                💭
              </div>
              <h2 className="text-lg font-medium text-foreground">Suggested Messages</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Offer users quick questions to start the conversation
            </p>
            
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Input
                    {...register(`suggested_questions.${index}.text` as const)}
                    defaultValue={field.text}
                    className="flex-grow"
                    placeholder={`Suggested message ${index + 1}`}
                  />
                  <Button type="button" variant="outline" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10 border-destructive/50">
                    Remove
                  </Button>
                </div>
              ))}
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => append({ text: "" })} 
                className="border-dashed"
              >
                + Add Suggested Message
              </Button>
              {errors.suggested_questions?.message && <p className="mt-1 text-xs text-destructive">{errors.suggested_questions.message}</p>} 
              {errors.suggested_questions?.root?.message && <p className="mt-1 text-xs text-destructive">{errors.suggested_questions.root.message}</p>}
              {Array.isArray(errors.suggested_questions) && errors.suggested_questions.map((err, i) => {
                if (err?.text?.message) {
                  return <p key={i} className="mt-1 text-xs text-destructive">Suggestion {i+1}: {err.text.message}</p>;
                }
                return null;
              })}
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

      {/* Right Side: Chat Preview (Sticky) */}
      <aside className="md:w-1/3 lg:w-2/5 sticky top-24 h-[calc(100vh-12rem)]">
        <div className="h-full flex flex-col">
          {/* Preview Mode Toggle */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground">Live Preview</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-muted-foreground" />
                <span className={`text-sm font-medium transition-colors ${previewMode === 'light' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Light
                </span>
              </div>
              <Switch
                checked={previewMode === 'dark'}
                onCheckedChange={(checked) => setPreviewMode(checked ? 'dark' : 'light')}
                aria-label="Toggle preview mode"
              />
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium transition-colors ${previewMode === 'dark' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Dark
                </span>
                <Moon className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
          
          {/* Chat Preview */}
          <div className="flex-grow">
            <ChatPreview 
              studentFacingName={previewStudentFacingName}
              brandingLogoUrl={previewBrandingLogoUrl}
              theme={previewTheme}
              welcomeMessage={chatbot?.welcome_message}
              suggestedQuestions={previewSuggestedQuestions}
              previewMode={previewMode}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
