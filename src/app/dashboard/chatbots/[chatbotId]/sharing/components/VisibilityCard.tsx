import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Lock, Globe, Users } from 'lucide-react';

interface VisibilityCardProps {
  value: 'private' | 'public' | 'shared';
  selected: boolean;
  label: string;
  description: string;
}

const iconMap = {
  private: Lock,
  public: Globe,
  shared: Users,
};

export const VisibilityCard: React.FC<VisibilityCardProps> = ({ value, selected, label, description }) => {
  const Icon = iconMap[value];
  let selectedClass = 'border-primary bg-muted';
  if (selected) {
    if (value === 'public') selectedClass = 'border-success bg-success/10';
    else if (value === 'shared') selectedClass = 'border-info bg-info/10';
    else selectedClass = 'border-border bg-muted';
  }
  const borderClass = selected ? selectedClass : 'border-border hover:border-accent';
  return (
    <Card
      className={cn(
        'relative p-3 transition-all cursor-pointer border-2',
        borderClass
      )}
    >
      <RadioGroupItem value={value} id={`visibility-${value}`} className="absolute top-3 right-3" />
      <Label htmlFor={`visibility-${value}`} className="cursor-pointer block">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
            <Icon className="h-3 w-3 text-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm capitalize">{label}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </Label>
    </Card>
  );
}; 