'use client';

import { SidebarToggle } from './sidebar/sidebar-toggle';

export function ChatNavbar() {
  return (
    <div className="absolute top-0 left-4 z-50 h-16 flex items-center">
      <SidebarToggle />
    </div>
  );
} 