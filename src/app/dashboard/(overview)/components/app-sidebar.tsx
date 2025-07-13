"use client"

import * as React from "react"
import {
  ChatTeardropDots,
  CreditCard,
  PuzzlePiece, // New Icon
  User,
} from "@phosphor-icons/react"

import { NavMain } from "@/app/dashboard/(overview)/components/nav-main"
import { NavUser } from "@/app/dashboard/(overview)/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import Image from "next/image"

// Define the navigation structure for the overview dashboard
const navMainItems = [
  {
    title: "Chatbots",
    url: "/dashboard",
    icon: ChatTeardropDots,
    // isActive: true, // This is handled by NavMain now
  },
  {
    title: "Integrations",
    url: "/dashboard/integrations",
    icon: PuzzlePiece,
  },
  {
    title: "Billing",
    icon: CreditCard,
    url: "/dashboard/billing", // Parent URL links to the Plan page
    items: [
      {
        title: "Plan",
        url: "/dashboard/billing",
      },
      {
        title: "Payment Methods",
        url: "/dashboard/billing/payment-methods",
      },
      {
        title: "Receipts",
        url: "/dashboard/billing/receipts",
      },
    ],
  },
  {
    title: "Account",
    url: "/dashboard/account",
    icon: User,
  },
  
  // Add other main navigation items as needed
];

// Mock user data for now, will be replaced by actual user data from Supabase
// const mockUser = {
//   name: "Educator Name",
//   email: "educator@example.com",
//   avatar: "/avatars/default.png", // Replace with actual avatar logic or boringavatars
// };

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // User data will be fetched in NavUser or passed down
  return (
    <Sidebar {...props} className="border-r border-border p-4 bg-sidebar">
      <SidebarHeader className="mb-8">
        {/* You can put a logo or app name here */}
        <div className="flex items-center justify-start gap-2">
            {/* <LayoutDashboard className="h-6 w-6" /> */}
            <Image src="/syllabi_logo.png" alt="logo" width={24} height={24} />
            <span className="font-semibold text-xl uppercase tracking-wide">Syllabi</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Pass the defined navigation items to NavMain */}
        <NavMain items={navMainItems} />
      </SidebarContent>
      <SidebarFooter>
        <hr className="my-4" />
        {/* NavUser will handle fetching/displaying user info and logout */}
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
