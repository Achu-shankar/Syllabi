'use client';

import { usePathname } from 'next/navigation';
import { SidebarToggle } from './sidebar-toggle';

export function SidebarToggleWrapper() {
  const pathname = usePathname();
  const isChatPage = pathname.startsWith('/chat');
  
  // Only show the toggle on chat pages
  if (!isChatPage) {
    return null;
  }
  
  return <SidebarToggle />;
} 