import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TypographyControlsProps {
  control: Control<any>;
}

export const TypographyControls: React.FC<TypographyControlsProps> = ({ control }) => {
  return (
    <div className="space-y-4">
      <div>
        <h5 className="text-sm font-medium mb-3">Typography</h5>
        <Label className="text-xs">Font Family</Label>
        <Controller
          name="theme.fontFamily"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value || 'default'}
              onValueChange={(value) => field.onChange(value === 'default' ? undefined : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select font family" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (System Font)</SelectItem>
                <SelectItem value="var(--font-sans)">Syllabi Default</SelectItem>
                <SelectItem value="'Inter', 'SF Pro Display', system-ui, sans-serif">Inter</SelectItem>
                <SelectItem value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica Neue</SelectItem>
                <SelectItem value="'Nunito', 'Open Sans', sans-serif">Nunito</SelectItem>
                <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
                <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
                <SelectItem value="'Lato', sans-serif">Lato</SelectItem>
                <SelectItem value="'Source Sans Pro', sans-serif">Source Sans Pro</SelectItem>
                <SelectItem value="Georgia, 'Times New Roman', serif">Georgia</SelectItem>
                <SelectItem value="'Crimson Text', serif">Crimson Text</SelectItem>
                <SelectItem value="'JetBrains Mono', monospace">JetBrains Mono</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </div>
  );
}; 