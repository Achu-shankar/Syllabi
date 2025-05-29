"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  CreditCard,
  UserCircle,
  LayoutDashboard,
  Cog,
  BarChart3,
  FileText,
  CreditCardIcon,
  DollarSign,
  ListChecks,
  Receipt,
} from "lucide-react"

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
    icon: Bot,
    // isActive: true, // This is handled by NavMain now
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
    icon: UserCircle,
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
    <Sidebar collapsible="icon" {...props} variant="inset" className="bg-sidebar">
      <SidebarHeader className="p-2 text-center">
        {/* You can put a logo or app name here */}
        <div className="flex items-center justify-start gap-2 p-2 ">
            {/* <LayoutDashboard className="h-6 w-6" /> */}
            <Image src="/syllabi_logo.png" alt="logo" width={16} height={16} />
            <span className="font-semibold text-xl group-data-[collapsible=icon]:hidden">Syllabi</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Pass the defined navigation items to NavMain */}
        <NavMain items={navMainItems} />
      </SidebarContent>
      <SidebarFooter>
        {/* NavUser will handle fetching/displaying user info and logout */}
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
