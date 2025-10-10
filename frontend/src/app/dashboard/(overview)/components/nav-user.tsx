"use client"

import * as React from "react";
import Link from 'next/link';
import { createClient } from "@/utils/supabase/client";
import { signOutAction } from "@/app/actions";
import {
  CaretUpDown,
  CreditCard,
  User as AccountIcon,
  SignOut as LogOut,
} from "@phosphor-icons/react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "next-themes";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  // useSidebar, // Not actively used in this simplified version for now
} from "@/components/ui/sidebar";

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    // Add other metadata fields you might use
  };
  // Add other user fields from Supabase auth if needed
}

export function NavUser() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);
  const { theme, setTheme } = useTheme();
  // const { isMobile } = useSidebar(); // Keep if needed for DropdownMenu side prop

  React.useEffect(() => {
    setMounted(true);
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

  if (loading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="animate-pulse">
            <div className="h-8 w-8 rounded-lg bg-gray-300 dark:bg-gray-700"></div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <div className="h-4 w-20 rounded bg-gray-300 dark:bg-gray-700"></div>
              <div className="mt-1 h-3 w-24 rounded bg-gray-300 dark:bg-gray-700"></div>
            </div>
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
                Login / Signup
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const userInitial = user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || "U";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start items-center gap-2 px-2 py-6">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || ""} />
                <AvatarFallback>{userInitial}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground truncate">
                {user.email}
              </span>
              <CaretUpDown className="ml-auto h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            // side={isMobile ? "top" : "right"} // Adjust side based on your layout needs
            align="end"
            sideOffset={10} // Adjust as needed
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3 p-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || ""} />
                  <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
                <div className="grid">
                  <span className="font-semibold">{user.user_metadata?.full_name || "User"}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/account" className="flex items-center w-full">
                  <AccountIcon className="mr-2 h-4 w-4" />
                  Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing" className="flex items-center w-full">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {mounted && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
                  Theme
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center">
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                    {theme === "light" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center">
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                    {theme === "dark" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center">
                    <Laptop className="mr-2 h-4 w-4" />
                    System
                    {theme === "system" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}
            
            <DropdownMenuItem asChild>
              <form action={signOutAction} className="w-full">
                <button type="submit" className="flex items-center w-full text-left p-0 m-0 bg-transparent border-none text-sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
