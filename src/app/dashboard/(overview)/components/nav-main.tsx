"use client"

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, type LucideIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from '@/lib/utils';

export interface NavMainSubItemType {
  title: string;
  url: string;
}

export interface NavMainItemType {
  title: string;
  url: string;
  icon?: LucideIcon;
  items?: NavMainSubItemType[];
}

export function NavMain({ items }: { items: NavMainItemType[] }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const isParentActive = item.url === pathname || 
                                 (item.url !== "/dashboard" && pathname.startsWith(item.url)) || 
                                 (item.items && item.items.some(subItem => pathname.startsWith(subItem.url)));

          if (item.items && item.items.length > 0) {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={isParentActive}
                className="group/collapsible"
              >
                <SidebarMenuItem className={cn(isParentActive && "bg-sidebar-accent text-sidebar-accent-foreground")}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} className="w-full">
                      {item.icon && <item.icon className="h-5 w-5" />}
                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                      <ChevronRight className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
                    <SidebarMenuSub>
                      {item.items.map((subItem) => {
                        const isSubItemActive = pathname === subItem.url || pathname.startsWith(subItem.url);
                        return (
                          <SidebarMenuSubItem key={subItem.title} className={cn(isSubItemActive && "bg-sidebar-accent/80 text-sidebar-accent-foreground")}>
                            <Link href={subItem.url} passHref>
                              <SidebarMenuSubButton asChild>
                                <a >
                                  <span>{subItem.title}</span>
                                </a>
                              </SidebarMenuSubButton>
                            </Link>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          } else {
            const isActive = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url));
            return (
              <SidebarMenuItem key={item.title}>
                <Link href={item.url} passHref>
                  <SidebarMenuButton 
                    tooltip={item.title} 
                    className={cn(isActive && "bg-sidebar-accent text-sidebar-accent-foreground")}
                  >
                    {item.icon && <item.icon className="h-5 w-5" />}
                    <span className="group-data-[collapsible=icon]:hidden">
                      {item.title}
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          }
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
