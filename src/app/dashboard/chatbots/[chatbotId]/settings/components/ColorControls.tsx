import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ColorControlsProps {
  control: Control<any>;
  mode: 'light' | 'dark';
}

const COLOR_FIELDS: { label: string; name: string }[] = [
  { label: 'Primary Color', name: 'primaryColor' },
  { label: 'Header Text Color', name: 'headerTextColor' },
  { label: 'Chat Background', name: 'chatWindowBackgroundColor' },
  { label: 'Sidebar Background', name: 'sidebarBackgroundColor' },
  { label: 'Input Area Background', name: 'inputAreaBackgroundColor' },
  { label: 'Input Background', name: 'inputBackgroundColor' },
  { label: 'User Bubble Background', name: 'bubbleUserBackgroundColor' },
  { label: 'User Bubble Text', name: 'bubbleUserTextColor' },
  { label: 'Bot Bubble Background', name: 'bubbleBotBackgroundColor' },
  { label: 'Bot Bubble Text', name: 'bubbleBotTextColor' },
  { label: 'Sidebar Text Color', name: 'sidebarTextColor' },
  { label: 'Input Text Color', name: 'inputTextColor' },
  { label: 'Suggestion Chip Background', name: 'suggestedQuestionChipBackgroundColor' },
  { label: 'Suggestion Chip Text', name: 'suggestedQuestionChipTextColor' },
  { label: 'Suggestion Chip Border', name: 'suggestedQuestionChipBorderColor' },
];

export const ColorControls: React.FC<ColorControlsProps> = ({ control, mode }) => {
  return (
    <div className="space-y-4">
      {COLOR_FIELDS.map((field) => (
        <div key={`${mode}-${field.name}`} className="flex flex-col space-y-1.5">
          <Label className="text-xs font-medium">{field.label}</Label>
          <Controller
            name={`theme.${mode}.${field.name}`}
            control={control}
            render={({ field: rhfField }) => (
              <Input type="color" {...rhfField} className="h-8 w-full" />
            )}
          />
        </div>
      ))}
    </div>
  );
}; 