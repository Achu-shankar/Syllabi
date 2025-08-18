'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PlusIcon, MessageSquareText, AlertCircle, Bell, MessageSquare } from 'lucide-react';
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
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatConfig, useChatbotDisplayName } from '../../../contexts/ChatbotContext';
import { useChatThemeVars } from '../ThemeApplicator';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AppSidebar() {
  const router = useRouter();
  const { state, toggleSidebar } = useSidebar();
  const params = useParams();
  const chatbotSlug = params.chatbotId as string;
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  
  // Get chatbot configuration and theme vars
  const { chatbot, isLoading, error } = useChatConfig();
  const displayName = useChatbotDisplayName();
  const themeVars = useChatThemeVars();

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
            <div className="w-8 h-8 relative rounded-full overflow-hidden bg-white drop-shadow-md border border-gray-200">
              <Image 
                src={chatbot.logo_url} 
                alt={`${displayName} Logo`} 
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <MessageSquareText className="w-4 h-4 text-primary" />
            </div>
          )}
        </div>
        <span
          className="font-bold text-lg whitespace-nowrap transition-all duration-300 ease-in-out group-data-[collapsible=icon]:hidden ml-3"
        >
          {displayName}
        </span>
      </div>
    );
  };

  return (
    <Sidebar 
      collapsible="icon" 
      data-chat-sidebar="true"
      style={{
        '--sidebar-background': themeVars.sidebarBackgroundColor,
        '--sidebar': themeVars.sidebarBackgroundColor,
        '--sidebar-foreground': themeVars.sidebarTextColor,
        backgroundColor: themeVars.sidebarBackgroundColor,
        color: themeVars.sidebarTextColor,
      } as React.CSSProperties}
      className="border-none"
    >
      <SidebarHeader className="flex flex-row justify-between items-center pt-0 pr-1">
         {renderChatbotHeader()}
         <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      
      {/* <SidebarHeader className="pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip="New Chat"
              onClick={() => {
                router.push(`/chat/${chatbotSlug}?newSession=${Date.now()}`);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/20"
            >
              <PlusIcon className="mr-1" />
              <span className="font-medium">New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader> */}
      <div className="px-2">
        <Separator style={{ backgroundColor: themeVars.sidebarTextColor, opacity: 0.05 }} />
      </div>
      
      <SidebarContent>
        <SidebarGroup>
        <SidebarGroupContent>        
          <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  tooltip="New Chat"
                  onClick={() => {
                    router.push(`/chat/${chatbotSlug}?newSession=${Date.now()}`);
                  }}
                  className="hover:opacity-80 transition-opacity"
                  style={{
                    color: themeVars.primaryColor,
                  }}
                >
                  <PlusIcon className="mr-1" />
                  <span className="font-medium">New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroupContent>
        </SidebarGroup>
        {/* <Separator className="px-2"/> */}
          <SidebarHistory />
        {/* <SidebarTrigger className="group-data-[collapsible=icon]:visible" /> */}
      </SidebarContent>
      
        <div className="px-2">
          <Separator style={{ backgroundColor: themeVars.sidebarTextColor, opacity: 0.05 }} />
        </div>
        
        <SidebarFooter className="text-xs text-center p-2 border-none space-y-1">
          {/* Announcement Section */}
          <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
            <DialogTrigger asChild>
              <SidebarMenuButton 
                className="w-full justify-start text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setAnnouncementOpen(true)}
              >
                <Bell className="mr-2 h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Announcements</span>
              </SidebarMenuButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex  items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Announcements
                </DialogTitle>
                <DialogDescription>
                  Stay updated with the latest news and updates.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4 py-2">
                    <h4 className="font-semibold text-sm">New Chat Features</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      We've added new conversation management features to help you organize your chats better.
                    </p>
                    <span className="text-xs text-muted-foreground">2 days ago</span>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4 py-2">
                    <h4 className="font-semibold text-sm">Performance Improvements</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Chat responses are now faster and more reliable across all devices.
                    </p>
                    <span className="text-xs text-muted-foreground">1 week ago</span>
                  </div>
                  <div className="border-l-4 border-purple-500 pl-4 py-2">
                    <h4 className="font-semibold text-sm">Theme Support</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      You can now switch between light, dark, and system themes.
                    </p>
                    <span className="text-xs text-muted-foreground">2 weeks ago</span>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Feedback Section */}
          <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
            <DialogTrigger asChild>
              <SidebarMenuButton 
                className="w-full justify-start text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setFeedbackOpen(true)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Feedback</span>
              </SidebarMenuButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Send Feedback
                </DialogTitle>
                <DialogDescription>
                  Help us improve by sharing your thoughts and suggestions.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="feedback-type" className="text-sm font-medium">
                      Feedback Type
                    </label>
                    <select 
                      id="feedback-type" 
                      className="w-full mt-1 p-2 border border-input rounded-md bg-background"
                    >
                      <option value="">Select feedback type</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="improvement">Improvement</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="feedback-message" className="text-sm font-medium">
                      Message
                    </label>
                    <textarea 
                      id="feedback-message"
                      placeholder="Tell us what's on your mind..."
                      className="w-full mt-1 p-2 border border-input rounded-md bg-background resize-none"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button 
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      onClick={() => {
                        // Handle feedback submission here
                        setFeedbackOpen(false);
                      }}
                    >
                      Send Feedback
                    </button>
                    <button 
                      className="px-4 py-2 border border-input rounded-md text-sm font-medium hover:bg-accent transition-colors"
                      onClick={() => setFeedbackOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <SidebarUserNav />  
      </SidebarFooter>
      
      <SidebarRail 
        style={{
          '--sidebar-border': themeVars.sidebarTextColor,
          opacity: 0.3,
        } as React.CSSProperties}
        className="hover:opacity-50 transition-opacity border-none focus:border-none"
      />
    </Sidebar>
  );
}
