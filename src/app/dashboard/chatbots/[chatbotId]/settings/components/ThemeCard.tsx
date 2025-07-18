import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeCardProps {
  name: string;
  onSelect: () => void;
  selected?: boolean;
  colors: string[]; // up to 4
  backgroundColor?: string;
  isFavorite?: boolean;
}

export const ThemeCard: React.FC<ThemeCardProps> = ({ name, onSelect, selected = false, colors, backgroundColor = 'white', isFavorite }) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative rounded-lg border p-3 w-full text-left hover:shadow-md transition-all',
        selected ? 'ring-2 ring-primary border-transparent' : 'border-border'
      )}
    >
      {isFavorite && (
        <Star className="absolute top-2 right-2 h-4 w-4 text-yellow-400 fill-yellow-400" />
      )}
      <div className="flex items-center justify-center h-12 w-full rounded-md" style={{ backgroundColor }}>
        <div className="flex gap-0.5">
          {colors.slice(0,4).map((c, i) => (
            <span key={i} className="inline-block h-6 w-4 rounded" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs font-medium truncate">{name}</p>
    </button>
  );
}; 