import { cn } from '@/lib/utils';

export function TypingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center', className)}>
      <style jsx>{`
        @keyframes typingDot {
          0% { opacity: 0.2; }
          50% { opacity: 1; }
          100% { opacity: 0.2; }
        }
        .dot {
          width: 6px;
          height: 6px;
          margin-right: 4px;
          border-radius: 50%;
          background-color: rgb(59 130 246); /* Tailwind blue-500 */
          animation: typingDot 1s infinite ease-in-out;
        }
        .dot:nth-of-type(2) { animation-delay: 0.2s; }
        .dot:nth-of-type(3) { animation-delay: 0.4s; margin-right: 0; }
      `}</style>
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
  );
} 