import React, { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ThemeMeta {
  id: string; // "default:id" | "custom:id"
  name: string;
  isFavorite?: boolean;
  colors: string[]; // up to 4 swatches
  source: 'default' | 'custom';
}

interface ThemePopoverProps {
  trigger: React.ReactNode;
  themes: ThemeMeta[];
  value: string;
  onSelect: (id: string) => void;
}

export const ThemePopover: React.FC<ThemePopoverProps> = ({ trigger, themes, value, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return themes.filter(t => t.name.toLowerCase().includes(q));
  }, [themes, query]);

  const custom = filtered.filter(t => t.source === 'custom');
  const builtIn = filtered.filter(t => t.source === 'default');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-3 border-b">
          <Input
            placeholder="Search themes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-64">
          {filtered.length === 0 && (
            <p className="p-3 text-xs text-muted-foreground">No themes found.</p>
          )}
          {custom.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">Your Themes</p>
              <ul className="p-1">
                {custom.map(theme => (
                  <ThemeRow key={theme.id} theme={theme} value={value} onSelect={onSelect} />
                ))}
              </ul>
              <Separator />
            </>
          )}

          <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">Built-in Themes</p>
          <ul className="p-1">
            {builtIn.map(theme => (
              <li key={theme.id}>
                <ThemeRow theme={theme} value={value} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

function ThemeRow({ theme, value, onSelect }: { theme: ThemeMeta; value: string; onSelect: (id:string)=>void }) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/50 text-sm',
        value === theme.id && 'bg-accent'
      )}
      onClick={() => onSelect(theme.id)}
    >
      <div className="flex gap-0.5">
        {theme.colors.slice(0,4).map((c,i)=>(
          <span key={i} className="inline-block h-3 w-3 rounded" style={{ backgroundColor: c }} />
        ))}
      </div>
      <span className="flex-1 truncate text-left">{theme.name}</span>
      {theme.isFavorite && <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />}
    </button>
  );
} 