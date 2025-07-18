import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export interface BubbleStyle {
  id: string;
  name: string;
  description: string;
  preview: React.ReactNode;
  tags?: string[];
  config: any; // BubbleConfig
}

interface BubbleStyleSelectorProps {
  styles: BubbleStyle[];
  selectedId: string;
  onSelect: (style: BubbleStyle) => void;
}

export const BubbleStyleSelector: React.FC<BubbleStyleSelectorProps> = ({ styles, selectedId, onSelect }) => {
  return (
    <div className="space-y-2">
      <RadioGroup value={selectedId} onValueChange={(val)=>{
        const st = styles.find(s=>s.id===val);
        if (st) onSelect(st);
      }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {styles.map(style => (
          <BubbleStyleCard key={style.id} style={style} selected={selectedId===style.id} />
        ))}
      </RadioGroup>
    </div>
  );
};

function BubbleStyleCard({ style, selected }: { style: BubbleStyle; selected: boolean }) {
  return (
    <Card className={cn('relative p-4 border-2 transition-colors cursor-pointer', selected ? 'border-primary bg-muted' : 'border-border hover:border-accent')}
    >
      <label htmlFor={`bubble-style-${style.id}`} className="block cursor-pointer">
        <RadioGroupItem value={style.id} id={`bubble-style-${style.id}`} className="absolute top-3 right-3" />
        <div className="flex flex-col gap-3">
          {/* preview icon */}
          <div className="w-8 h-8 flex items-center justify-center">{style.preview}</div>
          <div>
            <h4 className="font-medium text-sm mb-1">{style.name}</h4>
            <p className="text-xs text-muted-foreground leading-snug">{style.description}</p>
          </div>
          {style.tags && (
            <div className="flex flex-wrap gap-1">
              {style.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
            </div>
          )}
        </div>
      </label>
    </Card>
  );
} 