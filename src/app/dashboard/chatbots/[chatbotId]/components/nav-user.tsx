"use client"

import * as React from "react";
import Link from 'next/link';
import { createClient } from "@/utils/supabase/client"; // Client-side Supabase
import { signOutAction } from "@/app/actions"; // Ensure this path is correct
import {
  CreditCard,
  LogOut,
  UserCircle as AccountIcon, // Renamed for clarity if UserCircle is also a nav icon
  ChevronsUpDown,
  Settings2 as SettingsIcon, // Example if you have a general settings page too
  Bell // For Notifications if needed
} from "lucide-react";
import BoringAvatar from "boring-avatars"; // Assuming this is correctly installed and available

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
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
  // const { isMobile } = useSidebar(); // Keep if needed for DropdownMenu side prop

  React.useEffect(() => {
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
              <BoringAvatar
                size={32} // Adjusted size for sidebar
                name={user.email || user.id} // Use email or ID for consistent avatar
                variant="beam"
                colors={["#5b1d99","#0074b4","#00b34c","#ffd41f","#fc6e3d"]}
              />
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{displayName}</span>
                {displayEmail && <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>}
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            // side={isMobile ? "top" : "right"} // Adjust side based on your layout needs
            align="end"
            sideOffset={10} // Adjust as needed
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                 <BoringAvatar
                    size={32}
                    name={user.email || user.id}
                    variant="beam"
                    colors={["#5b1d99","#0074b4","#00b34c","#ffd41f","#fc6e3d"]}
                  />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  {displayEmail && <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/account">
                  <AccountIcon className="mr-2 h-4 w-4" />
                  Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </Link>
              </DropdownMenuItem>
              {/* Add other items like Notifications if needed */}
              {/* <DropdownMenuItem asChild>
                <Link href="/dashboard/notifications">
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </Link>
              </DropdownMenuItem> */}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={signOutAction} className="w-full">
                <button type="submit" className="flex items-center w-full text-sm p-2 hover:bg-accent rounded-sm">
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
