import { Skeleton } from "@/components/ui/skeleton";

export function ChatbotCardSkeleton() {
  return (
    <div className="relative group bg-card rounded-xl shadow-lg overflow-hidden flex flex-col max-w-xs">
      {/* Mimic the gradient background with a simple skeleton or a placeholder color if needed */}
      {/* For simplicity, we'll use the card background */}
      <div className="relative z-10 p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-3">
          {/* Icon Placeholder */}
          <Skeleton className="h-12 w-12 rounded-lg bg-white/30 dark:bg-black/20" />
          {/* Dropdown Trigger Placeholder */}
          <Skeleton className="h-8 w-8 rounded-md bg-white/20 dark:bg-black/10" />
        </div>

        {/* Title Placeholder */}
        <Skeleton className="h-6 w-3/4 mb-2" />
        {/* Subtitle/Name Placeholder (if applicable) */}
        {/* <Skeleton className="h-4 w-1/2 mb-4" /> */}
        
        <div className="flex-grow"></div> {/* Spacer */}
        
        {/* Date Placeholder */}
        <Skeleton className="h-4 w-1/3 mt-auto" />
      </div>
    </div>
  );
} 