import { useEffect, useRef, type RefObject } from 'react';

export function useScrollToBottom<T extends HTMLElement>(
  dependency: any // Dependency that triggers scroll (e.g., messages.length)
): [RefObject<T>, RefObject<T>] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);

  useEffect(() => {
    const end = endRef.current;
    if (end) {
      // Scroll smoothly when the dependency changes
      end.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    // Add dependency to the effect's dependency array
  }, [dependency]); 

  return [containerRef as RefObject<T>, endRef as RefObject<T>];
}
