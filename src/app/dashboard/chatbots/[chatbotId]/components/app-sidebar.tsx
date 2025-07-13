"use client"

import * as React from "react"
import {
  Brain,
  ChartBar,
  Database,
  Gear,
  Layout,
  ShareNetwork,
  ChatCircleDots, // New Icon
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
import Link from "next/link"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  chatbotId: string;
}

export function AppSidebar({ chatbotId, ...props }: AppSidebarProps) {
  const navItems = [
  {
      title: "Overview",
      url: `/dashboard/chatbots/${chatbotId}`,
      icon: Layout,
    },
    {
      title: "Knowledge Base",
      url: `/dashboard/chatbots/${chatbotId}/library`,
      icon: Database,
    },
    {
      title: "Skills",
      url: `/dashboard/chatbots/${chatbotId}/skills`,
      icon: Brain,
    },
    {
      title: "Analytics",
      url: `/dashboard/chatbots/${chatbotId}/analytics`,
      icon: ChartBar,
  },
  {
      title: "Settings",
      icon: Gear,
      url: `/dashboard/chatbots/${chatbotId}/settings`,
    // items: [
    //   {
    //       title: "General",
    //       url: `/dashboard/chatbots/${chatbotId}/settings/general`,
    //   },
    //   {
    //       title: "Appearance",
    //       url: `/dashboard/chatbots/${chatbotId}/settings/appearance`,
    //   },
    //   {
    //       title: "Behavior",
    //       url: `/dashboard/chatbots/${chatbotId}/settings/behavior`,
    //   },
    // ],
  },
  {
      title: "Sharing & Embed",
      url: `/dashboard/chatbots/${chatbotId}/sharing`,
      icon: ShareNetwork,
    },
    {
      title: "Channels",
      url: `/dashboard/chatbots/${chatbotId}/channels`,
      icon: ChatCircleDots,
    },
  ];

  return (
    <Sidebar {...props} className="border-r border-border p-4 bg-sidebar">
      <SidebarHeader className="mb-8">
        <Link href="/dashboard" className="flex items-center justify-start gap-2 focus:outline-none focus:ring-2 focus:ring-ring rounded-md">
            <Image src="/syllabi_logo.png" alt="Syllabi Logo" width={24} height={24} />
            <span className="font-semibold text-xl uppercase tracking-wide">Syllabi</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems}  />
      </SidebarContent>
      <SidebarFooter>
        <hr className="my-4" />
        {/* NavUser will handle fetching/displaying user info and logout */}
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
