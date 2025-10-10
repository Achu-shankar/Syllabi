import { CheckCircle2, Info, XCircle } from 'lucide-react';

export type Message =
  | { success: string }
  | { error: string }
  | { message: string };

export function FormMessage({ message }: { message: Message }) {
  if ("success" in message) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800/50 dark:bg-green-950/20 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        <span>{message.success}</span>
      </div>
    );
  }

  if ("error" in message) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800/50 dark:bg-red-950/20 dark:text-red-400">
        <XCircle className="h-4 w-4 flex-shrink-0" />
        <span>{message.error}</span>
      </div>
    );
  }

  if ("message" in message) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/20 dark:text-blue-400">
        <Info className="h-4 w-4 flex-shrink-0" />
        <span>{message.message}</span>
      </div>
    );
  }

  return null;
}
