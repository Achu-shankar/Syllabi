'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PlusIcon, MessageSquareText, AlertCircle } from 'lucide-react';
import { SidebarHistory } from './sidebar-history';
import { SidebarUserNav } from './sidebar-user-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/utils/supabase/client';
import { useChatConfig, useChatbotDisplayName } from '../../../contexts/ChatbotContext';
import Image from 'next/image';
import { useParams } from 'next/navigation';

export function AppSidebar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { state, toggleSidebar } = useSidebar();
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const params = useParams();
  const chatbotSlug = params.chatbotId as string;
  
  // Get chatbot configuration
  const { chatbot, isLoading, error } = useChatConfig();
  const displayName = useChatbotDisplayName();

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
  }, []);

  const renderChatbotHeader = () => {
    if (isLoading) {
      return (
        <div className={`flex items-center py-2`}>
          <Skeleton className="w-6 h-6 rounded-full" />
          <div
            className={`transition-all duration-300 ease-in-out ${
              state === "collapsed"
                ? 'opacity-0 max-w-0 overflow-hidden'
                : 'opacity-100 max-w-full ml-2'
            }`}
          >
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={`flex items-center py-2`}>
          <div className="flex rounded-full items-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <span
            className={`text-xl font-bold whitespace-nowrap transition-all duration-300 ease-in-out text-destructive ${
              state === "collapsed"
                ? 'opacity-0 max-w-0 overflow-hidden'
                : 'opacity-100 max-w-full ml-2'
            }`}
          >
            Error
          </span>
        </div>
      );
    }

    return (
      <div className={`flex items-center py-2`}>
        <div className="flex rounded-full items-center">
          {chatbot?.logo_url ? (
            <div className="w-6 h-6 relative rounded-full overflow-hidden bg-white drop-shadow-md border border-gray-200">
              <Image 
                src={chatbot.logo_url} 
                alt={`${displayName} Logo`} 
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
              <MessageSquareText className="w-4 h-4 text-primary" />
            </div>
          )}
        </div>
        <span
          className="text-xl font-bold whitespace-nowrap transition-all durati  on-300 ease-in-out group-data-[collapsible=icon]:hidden ml-2"
        >
          {displayName}
        </span>
      </div>
    );
  };

  return (
    <Sidebar 
      collapsible="icon" 
      className=""
      style={{
        backgroundColor: 'var(--chat-sidebar-background-color, #f8f9fa)',
        color: 'var(--chat-sidebar-text-color, #212529)',
      }}
    >
      <SidebarHeader className="pb-0">
        {renderChatbotHeader()}
      </SidebarHeader>
      
      <SidebarHeader className="pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip="New Chat"
              onClick={() => {
                router.push(`/chat/${chatbotSlug}`);
                router.refresh();
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/20"
            >
              <PlusIcon className="mr-1" />
              <span className="font-medium">New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarHistory user={user} sidebarState={state} />
      </SidebarContent>
      
      <SidebarFooter className="text-xs text-center p-2 border-none">
        <div className="flex items-center justify-center">
          <span className="group-data-[collapsible=icon]:hidden">Powered by Syllabi.io</span>
        </div>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}
