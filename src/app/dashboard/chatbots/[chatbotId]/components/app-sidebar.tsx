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
  Palette,
  Share2,
  ShieldCheck,
  MessageSquareText,
  ListTree,
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
import Link from "next/link"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  chatbotId: string;
}

export function AppSidebar({ chatbotId, ...props }: AppSidebarProps) {
  const navItems = [
  {
      title: "Overview",
      url: `/dashboard/chatbots/${chatbotId}`,
      icon: LayoutDashboard,
    },
    {
      title: "Library",
      url: `/dashboard/chatbots/${chatbotId}/library`,
      icon: ListTree,
    },
    {
      title: "Analytics",
      url: `/dashboard/chatbots/${chatbotId}/analytics`,
      icon: BarChart3,
  },
  {
      title: "Settings",
      icon: Settings2,
      url: `/dashboard/chatbots/${chatbotId}/settings/general`,
    items: [
      {
          title: "General",
          url: `/dashboard/chatbots/${chatbotId}/settings/general`,
      },
      {
          title: "Appearance",
          url: `/dashboard/chatbots/${chatbotId}/settings/appearance`,
      },
      {
          title: "Behavior",
          url: `/dashboard/chatbots/${chatbotId}/settings/behavior`,
      },
    ],
  },
  {
      title: "Sharing & Embed",
      url: `/dashboard/chatbots/${chatbotId}/sharing`,
      icon: Share2,
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props} variant="inset" className="bg-sidebar">
      <SidebarHeader className="p-2">
        <Link href="/dashboard" className="flex items-center justify-start gap-2 p-2 focus:outline-none focus:ring-2 focus:ring-ring rounded-md">
            <Image src="/syllabi_logo.png" alt="Syllabi.io Logo" width={16} height={16} />
            <span className="font-semibold text-xl group-data-[collapsible=icon]:hidden">Syllabi.io</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} chatbotId={chatbotId} />
      </SidebarContent>
    </Sidebar>
  )
}
