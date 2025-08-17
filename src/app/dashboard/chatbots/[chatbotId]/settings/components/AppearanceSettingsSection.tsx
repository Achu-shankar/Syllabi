"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useForm, Controller, SubmitHandler, useFieldArray, UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useUpdateChatbotSettings } from '../../hooks/useChatbotSettings';
import { useAvailableThemes, useCreateCustomTheme, useUpdateCustomTheme, useDuplicateTheme, useToggleThemeFavorite, useDeleteCustomTheme, useUpdateAnyCustomTheme } from '../../hooks/useThemes';
import { UpdateChatbotPayload, ThemeConfig, ThemeColors, Chatbot, EnhancedThemeConfig, DefaultTheme, UserCustomTheme, CreateCustomThemePayload } from '@/app/dashboard/libs/queries';
import { extractThemeConfig, isEnhancedThemeConfig } from '@/app/dashboard/libs/theme-utils';
import { ImagePicker } from './ImagePicker';
import { aiMessageAvatarPresets, userMessageAvatarPresets, brandingLogoPresets } from './avatarPresets';
import { ChatPreview } from './ChatPreview';
import { Sun, Moon, Plus, X, Star, Copy, Trash2, Palette, Save, Edit, UserCircle2, MessageSquareText, BadgeDollarSign, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useSettingsDirty } from './SettingsDirtyContext';
import { FieldsetBlock } from './FieldsetBlock';
import { motion } from 'framer-motion';
import { ThemeCard } from './ThemeCard';
import { ThemePopover } from './ThemePopover';
import { ThemeCustomizationDrawer } from './ThemeCustomizationDrawer';
import { ColorControls } from './ColorControls';
import { TypographyControls } from './TypographyControls';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

const themeConfigSchema = z.object({
  fontFamily: z.string().optional(),
  aiMessageAvatarUrl: z.string()
    .optional()
    .nullable()
    .refine(value => {
      if (value === null || value === undefined || value === "") return true;
      return z.string().url().safeParse(value).success;
    }, { message: "Please enter a valid URL for AI avatar or leave it empty." }),
  userMessageAvatarUrl: z.string()
    .optional()
    .nullable()
    .refine(value => {
      if (value === null || value === undefined || value === "") return true;
      return z.string().url().safeParse(value).success;
    }, { message: "Please enter a valid URL for user avatar or leave it empty." }),
  light: themeColorsSchema,
  dark: themeColorsSchema,
}).catchall(z.any());

const appearanceSettingsSchema = z.object({
  student_facing_name: z.string().max(50, 'Max 50 characters').optional().nullable(),
  branding_logo_url: z.string()
    .optional()
    .nullable()
    .refine(value => {
      if (value === null || value === undefined || value === "") return true;
      return z.string().url().safeParse(value).success;
    }, { message: "Please enter a valid URL for branding logo or leave it empty." }),
  theme: themeConfigSchema,
  selectedThemeId: z.string().optional(), 
  selectedThemeType: z.enum(['default', 'custom']).optional(),
  selectedCustomThemeId: z.string().optional(), 
  suggested_questions: z.array(
    z.object({ text: z.string().min(3, 'Min 3 characters') })
  ).max(6, 'Max 6 suggestions').optional(),
});

type AppearanceFormData = z.infer<typeof appearanceSettingsSchema>;

// Helper function to extract theme source info
function extractThemeSource(theme: EnhancedThemeConfig | ThemeConfig | any): { type: 'default' | 'custom'; themeId?: string; customThemeId?: string } {
  // If it's the new enhanced format
  if (isEnhancedThemeConfig(theme)) {
    return {
      type: theme.source.type,
      themeId: theme.source.themeId,
      customThemeId: theme.source.customThemeId
    };
  }
  // Legacy format - try to extract themeId from config
  const config = theme as ThemeConfig;
  return {
    type: 'default',
    themeId: config?.themeId
  };
}

// Helper function to create enhanced theme config
function createEnhancedThemeConfig(
  source: { type: 'default' | 'custom'; themeId?: string; customThemeId?: string },
  themeConfig: ThemeConfig,
  existingAvatars?: { ai?: string | null; user?: string | null }
): EnhancedThemeConfig {
  return {
    source: {
      type: source.type,
      themeId: source.themeId,
      customThemeId: source.customThemeId,
      lastSyncedAt: new Date().toISOString()
    },
    config: {
      ...themeConfig,
      aiMessageAvatarUrl: existingAvatars?.ai !== undefined ? existingAvatars.ai : themeConfig.aiMessageAvatarUrl,
      userMessageAvatarUrl: existingAvatars?.user !== undefined ? existingAvatars.user : themeConfig.userMessageAvatarUrl,
    },
    customizations: {
      hasCustomColors: false,
      hasCustomAvatars: !!(existingAvatars?.ai || existingAvatars?.user),
      hasCustomFonts: false
    }
  };
}

interface AppearanceSettingsSectionProps {
  chatbot: Chatbot | undefined;
  chatbotId: string;
}

export function AppearanceSettingsSection({ chatbot, chatbotId }: AppearanceSettingsSectionProps) {
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentThemeSource, setCurrentThemeSource] = useState<{ type: 'default' | 'custom'; themeId?: string; customThemeId?: string } | null>(null);
  const [saveThemeDialogOpen, setSaveThemeDialogOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeDescription, setNewThemeDescription] = useState('');
  const [editThemeDialogOpen, setEditThemeDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<UserCustomTheme | null>(null);
  const [editThemeName, setEditThemeName] = useState('');
  const [editThemeDescription, setEditThemeDescription] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'light'|'dark'>('light');

  const { mutate: updateSettings, isPending: isUpdating } = useUpdateChatbotSettings(chatbotId);
  
  // Use the comprehensive theme hook
  const { data: availableThemes, isLoading: themesLoading, error: themesError } = useAvailableThemes();
  const { mutate: createCustomTheme, isPending: isCreatingTheme } = useCreateCustomTheme();
  const { mutate: updateCustomTheme, isPending: isUpdatingTheme } = useUpdateCustomTheme(currentThemeSource?.customThemeId || '');
  const { mutate: duplicateTheme, isPending: isDuplicatingTheme } = useDuplicateTheme();
  const { mutate: toggleFavorite } = useToggleThemeFavorite();
  const { mutate: deleteTheme } = useDeleteCustomTheme();
  const { mutate: updateAnyCustomTheme, isPending: isUpdatingAnyTheme } = useUpdateAnyCustomTheme();

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
      student_facing_name: '',
      branding_logo_url: '',
      theme: {} as ThemeConfig,
      selectedThemeId: '',
      selectedThemeType: 'default',
      selectedCustomThemeId: '',
      suggested_questions: [],
    }
  });

  const { fields, append, remove, move } = useFieldArray<AppearanceFormData, "suggested_questions", "id">({
    control,
    name: "suggested_questions",
  });

  const watchedFormValues = watch();

  const { setDirty, registerSaveHandler, registerResetHandler } = useSettingsDirty();

  // Persisted (last saved) theme identifier like "custom:uuid" or "default:themeId"
  const savedThemeRef = useRef<string>('');
  const lastSavedFormRef = useRef<AppearanceFormData | null>(null);

  // dnd-kit sensors (must be declared unconditionally)
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    if (chatbot && availableThemes) {
      const currentTheme = extractThemeConfig(chatbot.theme);
      const themeSource = extractThemeSource(chatbot.theme);
      setCurrentThemeSource(themeSource);
      
      // Find the matching theme
      let initialSelectedThemeType: 'default' | 'custom' = 'default';
      let initialSelectedThemeId = '';
      let initialSelectedCustomThemeId = '';
      
      if (themeSource.type === 'custom' && themeSource.customThemeId) {
        const matchingCustomTheme = availableThemes.custom.find(ct => ct.id === themeSource.customThemeId);
        if (matchingCustomTheme) {
          initialSelectedThemeType = 'custom';
          initialSelectedCustomThemeId = matchingCustomTheme.id;
        }
      } else if (themeSource.themeId) {
        const matchingDefaultTheme = availableThemes.default.find(dt => dt.theme_id === themeSource.themeId);
        if (matchingDefaultTheme) {
          initialSelectedThemeType = 'default';
          initialSelectedThemeId = matchingDefaultTheme.theme_id;
        }
      }
      
      // If no match found, default to first default theme
      if (!initialSelectedThemeId && !initialSelectedCustomThemeId && availableThemes.default.length > 0) {
        initialSelectedThemeType = 'default';
        initialSelectedThemeId = availableThemes.default[0].theme_id;
      }
      
      const initialSavedThemeId = initialSelectedThemeType === 'custom'
        ? `custom:${initialSelectedCustomThemeId}`
        : `default:${initialSelectedThemeId}`;

      savedThemeRef.current = initialSavedThemeId;
      
      const initialForm: AppearanceFormData = {
        student_facing_name: chatbot.student_facing_name ?? '',
        branding_logo_url: chatbot.logo_url ?? '',
        theme: currentTheme || (availableThemes.default[0]?.theme_config as ThemeConfig) || {},
        selectedThemeType: initialSelectedThemeType,
        selectedThemeId: initialSelectedThemeId,
        selectedCustomThemeId: initialSelectedCustomThemeId,
        suggested_questions: chatbot.suggested_questions?.map(q => ({ text: q })) ?? [],
      };

      reset(initialForm);
      lastSavedFormRef.current = initialForm;
    }
  }, [chatbot, availableThemes, reset]);

  // Watch for changes to detect unsaved customizations
  useEffect(() => {
    if (isDirty && currentThemeSource) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [isDirty, currentThemeSource]);

  const handleThemeChange = (themeIdentifier: string) => {
    // Parse the theme identifier (format: "default:theme_id" or "custom:custom_id")
    const [type, id] = themeIdentifier.split(':') as ['default' | 'custom', string];
    
    let selectedTheme: DefaultTheme | UserCustomTheme | undefined;
    
    if (type === 'default') {
      selectedTheme = availableThemes?.default.find(t => t.theme_id === id);
      if (selectedTheme) {
        const currentAiAvatar = getValues("theme.aiMessageAvatarUrl");
        const currentUserAvatar = getValues("theme.userMessageAvatarUrl");

        const newThemeConfig: ThemeConfig = {
          ...selectedTheme.theme_config,
          aiMessageAvatarUrl: currentAiAvatar ?? selectedTheme.theme_config.aiMessageAvatarUrl,
          userMessageAvatarUrl: currentUserAvatar ?? selectedTheme.theme_config.userMessageAvatarUrl,
        };
        
        setValue("theme", newThemeConfig, { shouldDirty: true });
        setValue("selectedThemeType", 'default');
        setValue("selectedThemeId", selectedTheme.theme_id);
        setValue("selectedCustomThemeId", '');
        
        setCurrentThemeSource({ type: 'default' as const, themeId: selectedTheme.theme_id });
      }
    } else if (type === 'custom') {
      selectedTheme = availableThemes?.custom.find(t => t.id === id);
      if (selectedTheme) {
      const currentAiAvatar = getValues("theme.aiMessageAvatarUrl");
      const currentUserAvatar = getValues("theme.userMessageAvatarUrl");

      const newThemeConfig: ThemeConfig = {
          ...selectedTheme.theme_config,
          aiMessageAvatarUrl: currentAiAvatar ?? selectedTheme.theme_config.aiMessageAvatarUrl,
          userMessageAvatarUrl: currentUserAvatar ?? selectedTheme.theme_config.userMessageAvatarUrl,
      };
      
      setValue("theme", newThemeConfig, { shouldDirty: true });
        setValue("selectedThemeType", 'custom');
        setValue("selectedThemeId", '');
        setValue("selectedCustomThemeId", selectedTheme.id);
        
        setCurrentThemeSource({ type: 'custom' as const, customThemeId: selectedTheme.id });
      }
    }
  };

  const handleDuplicateTheme = (theme: DefaultTheme | UserCustomTheme, isCustom: boolean) => {
    const baseName = `${theme.name} Copy`;
    const source = isCustom 
      ? { type: 'custom' as const, customThemeId: (theme as UserCustomTheme).id }
      : { type: 'default' as const, themeId: (theme as DefaultTheme).theme_id };
    
    duplicateTheme({
      source,
      newName: baseName,
      newDescription: `Copy of ${theme.name}`
    });
  };

  const handleSaveAsNewTheme = () => {
    if (!newThemeName.trim()) {
      toast.error('Please enter a theme name');
      return;
    }

    const currentThemeConfig = getValues('theme');
    
    // Get the actual UUID of the default theme if we're basing on one
    let basedOnThemeUuid: string | undefined;
    if (currentThemeSource?.type === 'default' && currentThemeSource.themeId) {
      const defaultTheme = availableThemes?.default.find(dt => dt.theme_id === currentThemeSource.themeId);
      basedOnThemeUuid = defaultTheme?.id;
    }
    
    const payload: CreateCustomThemePayload = {
      name: newThemeName.trim(),
      description: newThemeDescription.trim() || undefined,
      theme_config: currentThemeConfig,
      based_on_default_theme_id: basedOnThemeUuid,
      is_favorite: false
    };

    createCustomTheme(payload, {
      onSuccess: (newTheme) => {
        setSaveThemeDialogOpen(false);
        setNewThemeName('');
        setNewThemeDescription('');
        setHasUnsavedChanges(false);
        
        // Switch to the new custom theme
        setValue("selectedThemeType", 'custom');
        setValue("selectedCustomThemeId", newTheme.id);
        setValue("selectedThemeId", '');
        setCurrentThemeSource({ type: 'custom' as const, customThemeId: newTheme.id });
        
        // Update the chatbot's theme field with the new custom theme
        const enhancedTheme = createEnhancedThemeConfig(
          { type: 'custom' as const, customThemeId: newTheme.id },
          currentThemeConfig,
          {
            ai: currentThemeConfig.aiMessageAvatarUrl,
            user: currentThemeConfig.userMessageAvatarUrl
          }
        );
        
        const chatbotPayload: UpdateChatbotPayload = {
          theme: enhancedTheme,
        };
        
        updateSettings(chatbotPayload);
      }
    });
  };

  const handleUpdateExistingTheme = () => {
    if (currentThemeSource?.type !== 'custom' || !currentThemeSource.customThemeId) return;

    const currentThemeConfig = getValues('theme');
    
    updateCustomTheme({
      theme_config: currentThemeConfig
    }, {
      onSuccess: () => {
        setHasUnsavedChanges(false);
        
        // Update the chatbot's theme field with the updated custom theme
        const enhancedTheme = createEnhancedThemeConfig(
          { type: 'custom' as const, customThemeId: currentThemeSource.customThemeId },
          currentThemeConfig,
          {
            ai: currentThemeConfig.aiMessageAvatarUrl,
            user: currentThemeConfig.userMessageAvatarUrl
          }
        );
        
        const chatbotPayload: UpdateChatbotPayload = {
          theme: enhancedTheme,
        };
        
        updateSettings(chatbotPayload);
      }
    });
  };

  const handleEditTheme = (theme: UserCustomTheme) => {
    setEditingTheme(theme);
    setEditThemeName(theme.name);
    setEditThemeDescription(theme.description || '');
    setEditThemeDialogOpen(true);
  };

  const handleUpdateThemeName = () => {
    if (!editingTheme || !editThemeName.trim()) {
      toast.error('Please enter a theme name');
      return;
    }

    updateAnyCustomTheme({
      themeId: editingTheme.id,
      updates: {
        name: editThemeName.trim(),
        description: editThemeDescription.trim() || undefined
      }
    }, {
      onSuccess: () => {
        setEditThemeDialogOpen(false);
        setEditingTheme(null);
        setEditThemeName('');
        setEditThemeDescription('');
      }
    });
  };

  const onSubmit = useCallback<SubmitHandler<AppearanceFormData>>((formData) => {
    const finalBrandingLogoUrl = (formData.branding_logo_url === "" || formData.branding_logo_url === undefined) 
                                 ? null 
                                 : formData.branding_logo_url;
    const finalStudentFacingName = (formData.student_facing_name === "" || formData.student_facing_name === undefined) 
                                 ? null 
                                 : formData.student_facing_name;

    // Create enhanced theme config based on current selection
    const source = formData.selectedThemeType === 'custom' 
      ? { type: 'custom' as const, customThemeId: formData.selectedCustomThemeId }
      : { type: 'default' as const, themeId: formData.selectedThemeId };

    const enhancedTheme = createEnhancedThemeConfig(
      source,
      formData.theme,
      {
        ai: formData.theme.aiMessageAvatarUrl,
        user: formData.theme.userMessageAvatarUrl
      }
    );

    const payload: UpdateChatbotPayload = {
      student_facing_name: finalStudentFacingName,
      logo_url: finalBrandingLogoUrl,
      theme: enhancedTheme,
      suggested_questions: formData.suggested_questions?.map(q => q.text),
    };

    updateSettings(payload, {
      onSuccess: () => {
        setHasUnsavedChanges(false);
        // Persist the newly saved theme
        const newSavedThemeId = formData.selectedThemeType === 'custom'
          ? `custom:${formData.selectedCustomThemeId}`
          : `default:${formData.selectedThemeId}`;
        savedThemeRef.current = newSavedThemeId;
        lastSavedFormRef.current = formData;
      }
    });
  }, [updateSettings]);

  // Watch for dirty state and update context
  useEffect(() => {
    setDirty('appearance', isDirty);
  }, [isDirty, setDirty]);

  // Register save handler
  useEffect(() => {
    registerSaveHandler('appearance', async () => {
      await handleSubmit(onSubmit)();
    });
     
  }, [registerSaveHandler, handleSubmit, onSubmit]);

  // Register reset handler
  useEffect(() => {
    registerResetHandler('appearance', async () => {
      if (lastSavedFormRef.current) {
        reset(lastSavedFormRef.current);
      }
    });
  }, [registerResetHandler, reset]);

  // Show loading state
  if (themesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading themes...</div>
      </div>
    );
  }

  // Show error state
  if (themesError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-destructive">Error loading themes: {themesError.message}</div>
      </div>
    );
  }

  // Prepare error messages for cleaner JSX
  const aiAvatarError = errors.theme?.aiMessageAvatarUrl; 
  const userAvatarError = errors.theme?.userMessageAvatarUrl;

  const previewTheme = watchedFormValues.theme || (availableThemes?.default[0]?.theme_config as ThemeConfig) || {};
  const previewSuggestedQuestions = watchedFormValues.suggested_questions?.map(q => q.text) || (chatbot?.suggested_questions || []);
  const previewBrandingLogoUrl = watchedFormValues.branding_logo_url || chatbot?.logo_url;
  const previewStudentFacingName = watchedFormValues.student_facing_name || chatbot?.student_facing_name;

  // Get current theme value for dropdown
  const currentThemeValue = watchedFormValues.selectedThemeType === 'custom' 
    ? `custom:${watchedFormValues.selectedCustomThemeId}`
    : `default:${watchedFormValues.selectedThemeId}`;

  const allThemeMeta = [
    ...(availableThemes?.default.map(t => ({
      id: `default:${t.theme_id}`,
      name: t.name,
      colors: [
        t.theme_config.light?.primaryColor,
        t.theme_config.light?.bubbleUserBackgroundColor,
        t.theme_config.light?.bubbleBotBackgroundColor,
        t.theme_config.light?.inputBackgroundColor,
      ].filter(Boolean) as string[],
      isFavorite: false,
      source: 'default' as const,
    })) || []),
    ...(availableThemes?.custom.map(t => ({
      id: `custom:${t.id}`,
      name: t.name,
      isFavorite: t.is_favorite,
      colors: [
        t.theme_config.light?.primaryColor,
        t.theme_config.light?.bubbleUserBackgroundColor,
        t.theme_config.light?.bubbleBotBackgroundColor,
        t.theme_config.light?.inputBackgroundColor,
      ].filter(Boolean) as string[],
      source: 'custom' as const,
    })) || [])
  ];

  const featuredThemes = allThemeMeta.filter(m => m.isFavorite);
  const customThemes = allThemeMeta.filter(m => m.source === 'custom');
  const defaultThemes = allThemeMeta.filter(m => m.source === 'default');

  const savedThemeMeta = allThemeMeta.find(m => m.id === savedThemeRef.current);

  // Build quick-card list: always show saved theme first. If no unsaved changes, saved === current.
  const metaCandidates = [
    ...(savedThemeMeta ? [savedThemeMeta] : []),
    ...featuredThemes,
    ...customThemes,
    ...defaultThemes,
  ];

  const metaForCard = metaCandidates.filter((m, idx, arr) => arr.findIndex(x => x.id === m.id) === idx).slice(0,4);

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-7xl">
      {/* Left Column - Configuration */}
      <div className="flex-grow space-y-8 md:max-w-2xl">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Appearance & Interface</h2>
          <p className="text-muted-foreground">
            Customize how your chatbot looks and suggest initial questions
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Theme Section */}
          <FieldsetBlock title="Theme" icon={<Palette className="h-4 w-4" />} index={0}>
            <p className="text-sm text-muted-foreground mb-6">
              Choose a visual theme for your chatbot (light and dark modes will be configured within)
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
              <Label className="text-sm font-medium">Select Theme</Label>
                  {savedThemeMeta && (
                    <span className="text-xs text-muted-foreground mt-1">
                      Active theme: {savedThemeMeta.name}
                    </span>
                  )}
                  {savedThemeMeta && currentThemeValue !== savedThemeRef.current && (
                    <span className="text-[10px] font-medium text-yellow-600 mt-0.5">(Unsaved changes)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDrawerOpen(true)}
                    className="text-xs"
                  >
                    <Palette className="w-3 h-3 mr-1" />
                    Customize
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {metaForCard.map(meta => (
                  <ThemeCard
                    key={meta.id}
                    name={meta.name}
                    colors={meta.colors.length ? meta.colors : ['#ddd']}
                    backgroundColor="#f9f9f9"
                    selected={currentThemeValue === meta.id}
                    onSelect={() => handleThemeChange(meta.id)}
                    isFavorite={!!meta.isFavorite}
                  />
                ))}
                      </div>

              {/* Toolbar: Browse + Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <ThemePopover
                  trigger={<Button variant="outline" size="sm">Browse all themes</Button>}
                  themes={allThemeMeta}
                  value={currentThemeValue}
                  onSelect={handleThemeChange}
              />

              {/* Theme Actions */}
                <div className="flex items-center gap-2 justify-end">
                {currentThemeSource && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const theme = currentThemeSource.type === 'custom' 
                          ? availableThemes?.custom.find(t => t.id === currentThemeSource.customThemeId)
                          : availableThemes?.default.find(t => t.theme_id === currentThemeSource.themeId);
                        if (theme) {
                          handleDuplicateTheme(theme, currentThemeSource.type === 'custom');
                        }
                      }}
                      disabled={isDuplicatingTheme}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Duplicate
                    </Button>
                    
                    {currentThemeSource.type === 'custom' && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const theme = availableThemes?.custom.find(t => t.id === currentThemeSource.customThemeId);
                            if (theme) {
                              handleEditTheme(theme);
                            }
                          }}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const theme = availableThemes?.custom.find(t => t.id === currentThemeSource.customThemeId);
                            if (theme) {
                              toggleFavorite(theme.id);
                            }
                          }}
                        >
                          <Star className={`w-3 h-3 mr-1 ${
                            availableThemes?.custom.find(t => t.id === currentThemeSource.customThemeId)?.is_favorite 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : ''
                          }`} />
                          Favorite
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (currentThemeSource.customThemeId) {
                              deleteTheme(currentThemeSource.customThemeId);
                            }
                          }}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
                              </div>
          </FieldsetBlock>

          <Separator />

          {/* Branding & Naming Section */}
          <FieldsetBlock title="Branding & Naming" icon={<BadgeDollarSign className="h-4 w-4" />} index={1}>
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
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {(watchedFormValues.student_facing_name || '').length} / 50
                </p>
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
          </FieldsetBlock>

          <Separator />

          {/* Chat Interface Avatars */}
          <FieldsetBlock title="Chat Interface Avatars" icon={<UserCircle2 className="h-4 w-4" />} index={2}>
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
                      round
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
                      round
                    />
                  )}
                />
                {userAvatarError && typeof userAvatarError.message === 'string' && (
                  <p className="mt-1.5 text-xs text-destructive">{userAvatarError.message}</p>
                )}
              </div>
            </div>
          </FieldsetBlock>

          <Separator />

          {/* Suggested Questions */}
          <FieldsetBlock title={`Suggested Messages (${fields.length} / 6)`} icon={<MessageSquareText className="h-4 w-4" />} index={3}>
            <p className="text-sm text-muted-foreground mb-6">
              Offer users quick questions to start the conversation
            </p>
            
            <div className="space-y-4">
              {/* Drag-and-drop context */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={({ active, over }) => {
                  if (over && active.id !== over.id) {
                    const oldIndex = fields.findIndex(f => f.id === active.id);
                    const newIndex = fields.findIndex(f => f.id === over.id);
                    move(oldIndex, newIndex);
                  }
                }}
              >
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  {fields.map((field, index) => (
                    <SortableSuggestedItem
                      key={field.id}
                      id={field.id}
                      index={index}
                      formRegister={register}
                      remove={() => remove(index)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  if (fields.length < 6) append({ text: "" });
                }} 
                className="border-dashed"
                disabled={fields.length >= 6}
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
          </FieldsetBlock>

          <Separator />
        </form>
      </div>

      {/* Edit Theme Dialog */}
      <Dialog open={editThemeDialogOpen} onOpenChange={setEditThemeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Theme</DialogTitle>
            <DialogDescription>
              Update the name and description of your custom theme.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-theme-name">Theme Name</Label>
              <Input
                id="edit-theme-name"
                value={editThemeName}
                onChange={(e) => setEditThemeName(e.target.value)}
                placeholder="My Custom Theme"
              />
            </div>
            <div>
              <Label htmlFor="edit-theme-description">Description (Optional)</Label>
              <Textarea
                id="edit-theme-description"
                value={editThemeDescription}
                onChange={(e) => setEditThemeDescription(e.target.value)}
                placeholder="A brief description of this theme..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditThemeDialogOpen(false);
                setEditingTheme(null);
                setEditThemeName('');
                setEditThemeDescription('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateThemeName}
              disabled={isUpdatingAnyTheme}
            >
              {isUpdatingAnyTheme ? 'Updating...' : 'Update Theme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Custom Theme Dialog (moved from deprecated section) */}
      <Dialog open={saveThemeDialogOpen} onOpenChange={setSaveThemeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Custom Theme</DialogTitle>
            <DialogDescription>
              Create a new custom theme with your current settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-theme-name">Theme Name</Label>
              <Input
                id="new-theme-name"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="My Custom Theme"
              />
            </div>
            <div>
              <Label htmlFor="new-theme-description">Description (Optional)</Label>
              <Textarea
                id="new-theme-description"
                value={newThemeDescription}
                onChange={(e) => setNewThemeDescription(e.target.value)}
                placeholder="A brief description of this theme..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveThemeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveAsNewTheme}
              disabled={isCreatingTheme}
            >
              {isCreatingTheme ? 'Creating...' : 'Create Theme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Theme Customization Drawer */}
      <ThemeCustomizationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        setMode={setDrawerMode}
        hasUnsavedChanges={hasUnsavedChanges}
        isCustomTheme={currentThemeSource?.type === 'custom'}
        onSaveAsNew={() => setSaveThemeDialogOpen(true)}
        onUpdateExisting={handleUpdateExistingTheme}
        isCreatingTheme={isCreatingTheme}
        isUpdatingTheme={isUpdatingTheme}
        onCancel={() => {
          if (lastSavedFormRef.current) {
            reset(lastSavedFormRef.current);
            setDrawerOpen(false);
            setHasUnsavedChanges(false);
          } else {
            setDrawerOpen(false);
          }
        }}
      >
        <div className="space-y-8">
          <TypographyControls control={control} />
          <ColorControls control={control} mode={drawerMode} />
        </div>
      </ThemeCustomizationDrawer>
    </div>
  );
}

// Sortable item component for suggested messages
interface SortableItemProps {
  id: string;
  index: number;
  formRegister: UseFormRegister<AppearanceFormData>;
  remove: () => void;
}

function SortableSuggestedItem({ id, index, formRegister, remove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center space-x-2 py-1">
      <button type="button" className="cursor-grab text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4" />
      </button>
      <Input
        {...formRegister(`suggested_questions.${index}.text` as const)}
        className="flex-grow"
        placeholder={`Suggested message ${index + 1}`}
      />
      <Button type="button" variant="ghost" size="icon" onClick={remove} className="text-destructive hover:bg-destructive/20">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
} 