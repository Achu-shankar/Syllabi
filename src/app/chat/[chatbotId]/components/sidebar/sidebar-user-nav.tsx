'use client';
import { ChevronsUpDown, User, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import Link from 'next/link';
import { useChatTheme } from '../../../contexts/ChatbotThemeContext';
import { createClient } from '@/utils/supabase/client';
import BoringAvatar from "boring-avatars";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export function SidebarUserNav() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { setTheme, theme } = useChatTheme();
  const { isMobile } = useSidebar();

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error);
        setLoading(false);
        return;
      }
      setUser(data.user as User | null);
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const getThemeIcon = (themeOption: string) => {
    switch (themeOption) {
      case 'light':
        return <Sun className="mr-2 h-4 w-4" />;
      case 'dark':
        return <Moon className="mr-2 h-4 w-4" />;
      case 'system':
        return <Monitor className="mr-2 h-4 w-4" />;
      default:
        return <Sun className="mr-2 h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton 
            size="lg"
            className="animate-pulse data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div className="h-8 w-8 rounded-lg bg-gray-300 dark:bg-gray-700 flex-shrink-0"></div>
            <div className="grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden">
              <div className="h-4 w-20 rounded bg-gray-300 dark:bg-gray-700"></div>
              <div className="h-3 w-24 rounded bg-gray-300 dark:bg-gray-700 mt-1"></div>
            </div>
            <ChevronsUpDown className="ml-auto size-4 transition-all duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Link href="/sign-in" passHref legacyBehavior>
            <SidebarMenuButton size="lg">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden">
                <span className="truncate font-medium">Login / Signup</span>
                <span className="truncate text-xs text-muted-foreground">Sign in to continue</span>
              </div>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const displayName = user.user_metadata?.full_name || user.email || "User";
  const displayEmail = user.email || "";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="h-8 w-8 rounded-lg overflow-hidden flex-shrink-0">
                <BoringAvatar
                  size={32}
                  square={true}
                  name={user.email || user.id}
                  variant="beam"
                  colors={["#5b1d99","#0074b4","#00b34c","#ffd41f","#fc6e3d"]}
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 transition-all duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="h-8 w-8 rounded-lg overflow-hidden">
                  <BoringAvatar
                    size={32}
                    square={true}
                    name={user.email || user.id}
                    variant="beam"
                    colors={["#5b1d99","#0074b4","#00b34c","#ffd41f","#fc6e3d"]}
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Theme Options */}
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => setTheme('light')}
            >
              {getThemeIcon('light')}
              Light
              {theme === 'light' && <div className="ml-auto h-2 w-2 rounded-full bg-primary"></div>}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => setTheme('dark')}
            >
              {getThemeIcon('dark')}
              Dark
              {theme === 'dark' && <div className="ml-auto h-2 w-2 rounded-full bg-primary"></div>}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => setTheme('system')}
            >
              {getThemeIcon('system')}
              System
              {theme === 'system' && <div className="ml-auto h-2 w-2 rounded-full bg-primary"></div>}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                type="button"
                className="w-full cursor-pointer flex items-center"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
