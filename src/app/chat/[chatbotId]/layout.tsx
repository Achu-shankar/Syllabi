'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { AppSidebar } from "./components/sidebar/app-sidebar";
import { ThemeProvider } from "next-themes";
import { useParams } from 'next/navigation';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import AuthButton from '@/components/header-auth';
import { EbookProvider, useEbookContext } from './lib/context/ebook-context';
import { ChatbotProvider } from '../contexts/ChatbotContext'; // Import ChatbotProvider
import { ChatThemeProvider } from '../contexts/ChatbotThemeContext'; // Import ChatThemeProvider
import { ThemeApplicator, useChatThemeVars } from './components/ThemeApplicator'; // Import ThemeApplicator and theme vars hook
import { ChatbotNotFound } from './components/ChatbotNotFound'; // Import ChatbotNotFound
import { ChatbotLoading } from './components/ChatbotLoading'; // Import ChatbotLoading
import { ChatThemeSwitcher } from './components/ChatThemeSwitcher'; // Import ChatThemeSwitcher
import { useChatConfig } from '../contexts/ChatbotContext'; // Import hook to check chatbot state
import EbookPanel from './components/ebook/EbookPanel';
import { chapters } from './lib/data/ebook-chapters'; // Import chapters for default URL
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Inner component to access context after Provider
function ChatLayoutContent({ children, slug }: { children: React.ReactNode; slug: string }) {
  const { isEbookPanelOpen, openEbookPanel } = useEbookContext();
  const { chatbot, isLoading, error } = useChatConfig(); // Get chatbot state
  const [showEbookHint, setShowEbookHint] = useState(false);
  const themeVars = useChatThemeVars(); // Get theme CSS variables

  useEffect(() => {
    const hintShown = localStorage.getItem('ebookHintShown');
    if (!hintShown) {
      setShowEbookHint(true);
      localStorage.setItem('ebookHintShown', 'true');
    }
  }, []);

  const handleOpenEbook = () => {
    // Open with the first chapter by default if none is set
    openEbookPanel(); 
  };

  // Show loading state
  if (isLoading) {
    return <ChatbotLoading />;
  }

  // Show error state
  if (error || !chatbot) {
    return <ChatbotNotFound slug={slug} error={error} />;
  }

  return (
    <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-screen overflow-hidden">
          <header 
            className="flex justify-between items-center h-14 shrink-0 px-4 transition-colors duration-300"
            style={{ backgroundColor: themeVars.chatWindowBackgroundColor }}
          >
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-3 pr-4">
              <TooltipProvider>
                <Tooltip open={showEbookHint} onOpenChange={(open) => {
                  if (!open) setShowEbookHint(false);
                }}>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={handleOpenEbook} 
                      className="p-1 px-2 text-sm bg-secondary hover:bg-secondary/80 rounded relative"
                    >
                      DSPA Ebook
                    </button>
                  </TooltipTrigger>
                  {showEbookHint && (
                    <TooltipContent 
                      side="bottom" 
                      align="center" 
                      className="bg-slate-800 text-white p-2 rounded-md shadow-lg border border-slate-700"
                    >
                      <p className="text-sm">Check out the DSPA Ebook here!</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <ChatThemeSwitcher />
              <AuthButton />
            </div>
          </header>
          <PanelGroup direction="horizontal" className="flex-grow w-full overflow-hidden">
            <Panel defaultSize={isEbookPanelOpen ? 70 : 100} minSize={30}>
              <div className="h-full w-full overflow-y-auto bg-background">
                {children}
              </div>
            </Panel>
            {isEbookPanelOpen && (
              <>
                <PanelResizeHandle className="w-0.5 bg-transparent hover:bg-muted-foreground/20 transition-colors data-[resize-handle-state=drag]:bg-muted-foreground/30" />
                <Panel defaultSize={70} minSize={20} collapsible={false} collapsedSize={0} >
                  <EbookPanel />
                </Panel>
              </>
            )}
          </PanelGroup>
        </SidebarInset>
    </SidebarProvider>
  );
}

export default function ChatLayout({ children }: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient());
  const params = useParams();
  const chatbotSlug = params.chatbotId as string; // This is actually the slug now
  
  return (
    <QueryClientProvider client={queryClient}>
      <EbookProvider>
        {/* <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        > */}
          <ChatbotProvider slug={chatbotSlug}>
            <ChatThemeProvider>
              <ThemeApplicator />
              <ChatLayoutContent slug={chatbotSlug}>{children}</ChatLayoutContent>
            </ChatThemeProvider>
          </ChatbotProvider>
        {/* </ThemeProvider> */}
      </EbookProvider>
    </QueryClientProvider>
  );
}
