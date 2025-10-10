"use client";

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateChatbotSettings } from '../../hooks/useChatbotSettings';
import { Chatbot } from '@/app/dashboard/libs/queries';
import { useSettingsDirty } from './SettingsDirtyContext';
import { FieldsetBlock } from './FieldsetBlock';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Timer, Users } from 'lucide-react';

// Rate limit configuration schema
const rateLimitSchema = z.object({
  enabled: z.boolean(),
  authenticated_users: z.object({
    messages_per_hour: z.number().min(1).max(1000),
    messages_per_day: z.number().min(1).max(10000),
  }),
  anonymous_visitors: z.object({
    messages_per_hour: z.number().min(1).max(1000),
    messages_per_day: z.number().min(1).max(10000),
  }),
  custom_message: z.string().optional(),
});

type RateLimitFormData = z.infer<typeof rateLimitSchema>;

// Preset configurations
const RATE_LIMIT_PRESETS = {
  strict: {
    authenticated: { messages_per_hour: 30, messages_per_day: 100 },
    anonymous: { messages_per_hour: 10, messages_per_day: 25 }
  },
  moderate: {
    authenticated: { messages_per_hour: 60, messages_per_day: 200 },
    anonymous: { messages_per_hour: 20, messages_per_day: 50 }
  },
  generous: {
    authenticated: { messages_per_hour: 120, messages_per_day: 500 },
    anonymous: { messages_per_hour: 40, messages_per_day: 100 }
  }
};

interface RateLimitSettingsSectionProps {
  chatbot?: Chatbot;
  chatbotId: string;
}

export function RateLimitSettingsSection({ chatbot, chatbotId }: RateLimitSettingsSectionProps) {
  const { mutate: updateSettings } = useUpdateChatbotSettings(chatbotId);
  const { setDirty, registerSaveHandler, registerResetHandler } = useSettingsDirty();

  // Initialize form with chatbot's current rate limit config or defaults
  const form = useForm<RateLimitFormData>({
    resolver: zodResolver(rateLimitSchema),
    defaultValues: chatbot?.rate_limit_config || {
      enabled: false,
      authenticated_users: {
        messages_per_hour: 60,
        messages_per_day: 200,
      },
      anonymous_visitors: {
        messages_per_hour: 20,
        messages_per_day: 50,
      },
      custom_message: '',
    },
  });

  const { watch, setValue, formState: { isDirty }, reset } = form;
  const isEnabled = watch('enabled');

  // Update dirty state when form changes
  useEffect(() => {
    setDirty('behavior', isDirty);
  }, [isDirty, setDirty]);

  // Register save and reset handlers
  useEffect(() => {
    const save = async () => {
      const formData = form.getValues();
      updateSettings(
        { rate_limit_config: formData },
        {
          onSuccess: () => {
            reset(formData);
          },
        }
      );
    };

    const resetFn = async () => {
      const defaultValues = chatbot?.rate_limit_config || {
        enabled: false,
        authenticated_users: { messages_per_hour: 60, messages_per_day: 200 },
        anonymous_visitors: { messages_per_hour: 20, messages_per_day: 50 },
        custom_message: '',
      };
      reset(defaultValues);
    };

    registerSaveHandler('behavior', save);
    registerResetHandler('behavior', resetFn);
  }, [registerSaveHandler, registerResetHandler, updateSettings, reset, chatbot?.rate_limit_config, form]);

  // Apply preset
  const applyPreset = (preset: keyof typeof RATE_LIMIT_PRESETS) => {
    const presetValues = RATE_LIMIT_PRESETS[preset];
    setValue('authenticated_users.messages_per_hour', presetValues.authenticated.messages_per_hour, { shouldDirty: true });
    setValue('authenticated_users.messages_per_day', presetValues.authenticated.messages_per_day, { shouldDirty: true });
    setValue('anonymous_visitors.messages_per_hour', presetValues.anonymous.messages_per_hour, { shouldDirty: true });
    setValue('anonymous_visitors.messages_per_day', presetValues.anonymous.messages_per_day, { shouldDirty: true });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Rate Limiting
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control how many messages users can send to prevent abuse and manage costs
        </p>
      </div>

      {/* Enable/Disable Rate Limiting */}
      <FieldsetBlock title="Enable Rate Limiting">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label htmlFor="rate-limit-enabled" className="text-sm font-medium">
              Rate Limiting
            </Label>
            <p className="text-sm text-muted-foreground">
              Limit the number of messages users can send per hour and per day
            </p>
          </div>
          <Controller
            name="enabled"
            control={form.control}
            render={({ field }) => (
              <Switch
                id="rate-limit-enabled"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>
      </FieldsetBlock>

      {/* Rate Limit Configuration (only shown when enabled) */}
      {isEnabled && (
        <>
          {/* Preset Buttons */}
          <FieldsetBlock title="Quick Presets">
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset('strict')}
              >
                Strict
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset('moderate')}
              >
                Moderate (Recommended)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset('generous')}
              >
                Generous
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Quick presets to get started. You can customize individual limits below.
            </p>
          </FieldsetBlock>

          {/* Authenticated Users Limits */}
          <FieldsetBlock
            title="Logged-in Users"
            icon={<Users className="h-4 w-4" />}
          >
            <p className="text-sm text-muted-foreground -mt-2 mb-2">
              Limits applied across all sessions for authenticated users
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="auth-hourly" className="text-sm font-medium flex items-center gap-1">
                  Messages per Hour
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Maximum messages a logged-in user can send in any 60-minute window</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Controller
                  name="authenticated_users.messages_per_hour"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="auth-hourly"
                      type="number"
                      min="1"
                      max="1000"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-daily" className="text-sm font-medium flex items-center gap-1">
                  Messages per Day
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Maximum messages a logged-in user can send in any 24-hour period</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Controller
                  name="authenticated_users.messages_per_day"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="auth-daily"
                      type="number"
                      min="1"
                      max="10000"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  )}
                />
              </div>
            </div>
          </FieldsetBlock>

          {/* Anonymous Visitors Limits */}
          <FieldsetBlock
            title="Anonymous Visitors"
            icon={<Users className="h-4 w-4" />}
          >
            <p className="text-sm text-muted-foreground -mt-2 mb-2">
              Limits applied per conversation session for non-logged-in users
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="anon-hourly" className="text-sm font-medium flex items-center gap-1">
                  Messages per Hour
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Maximum messages per conversation in any 60-minute window</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Controller
                  name="anonymous_visitors.messages_per_hour"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="anon-hourly"
                      type="number"
                      min="1"
                      max="1000"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="anon-daily" className="text-sm font-medium flex items-center gap-1">
                  Messages per Day
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Maximum messages per conversation in any 24-hour period</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Controller
                  name="anonymous_visitors.messages_per_day"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="anon-daily"
                      type="number"
                      min="1"
                      max="10000"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  )}
                />
              </div>
            </div>

            {/* Info callout */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-900">
                <strong>Note:</strong> Anonymous limits are per conversation session. Users can start new conversations,
                but each session is limited independently. Logged-in users have limits across all their sessions.
              </p>
            </div>
          </FieldsetBlock>

          {/* Custom Error Message */}
          <FieldsetBlock
            title="Custom Error Message"
          >
            <p className="text-sm text-muted-foreground -mt-2 mb-2">
              Optional custom message shown when users hit the rate limit
            </p>
            <Controller
              name="custom_message"
              control={form.control}
              render={({ field }) => (
                <Textarea
                  placeholder="e.g., You've reached your message limit. Please upgrade to Premium for unlimited access!"
                  className="min-h-[80px]"
                  {...field}
                />
              )}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Leave empty to use the default message. You can use this to promote upgrades or provide alternative contact methods.
            </p>
          </FieldsetBlock>
        </>
      )}

      {/* Info Banner when disabled */}
      {!isEnabled && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Timer className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="font-medium text-sm text-foreground">Rate Limiting Disabled</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Users can send unlimited messages. Enable rate limiting to control usage and manage costs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
