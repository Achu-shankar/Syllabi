import { cn } from '@/lib/utils';

export function GradientSpinner({ className }: { className?: string }) {
    return (
        <div className={cn("relative w-7 h-7", className)}>
            <div className="absolute top-0 left-0 w-full h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 animate-spin" />
            <div className="absolute top-1/2 left-1/2 w-[calc(100%-4px)] h-[calc(100%-4px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />
        </div>
    );
} 