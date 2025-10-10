import { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface FieldsetBlockProps extends PropsWithChildren {
  title: string;
  className?: string;
  required?: boolean;
  icon?: React.ReactNode;
  index?: number; // for stagger
}

export function FieldsetBlock({ title, children, className, required, icon, index = 0 }: FieldsetBlockProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.3, ease: 'easeOut' }}
      className={cn('relative pt-6 first:pt-0 pl-4', className)}
    >
      <span className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-purple-500 via-pink-500 to-yellow-500 rounded-full" />
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {required && (
          <span className="text-xs font-medium text-destructive">*</span>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </motion.section>
  );
} 