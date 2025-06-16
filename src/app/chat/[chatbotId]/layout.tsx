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
  useSidebar,
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
import './chat.css'; // Import chat-specific CSS overrides
// import { chapters } from './lib/data/ebook-chapters'; // Import chapters for default URL
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Header component that uses sidebar context
function ChatHeader({ 
  themeVars, 
  isEbookPanelOpen, 
  handleToggleEbook, 
  showEbookHint, 
  setShowEbookHint 
}: {
  themeVars: any;
  isEbookPanelOpen: boolean;
  handleToggleEbook: () => void;
  showEbookHint: boolean;
  setShowEbookHint: (show: boolean) => void;
}) {
  const { open, openMobile, isMobile: isMobileSidebar } = useSidebar();

  return (
    <header 
      className="flex justify-between items-center h-12 shrink-0 px-4 transition-colors duration-300"
      style={{ backgroundColor: themeVars.chatWindowBackgroundColor }}
    >
      <div className="flex items-center">
        {(!open || isMobileSidebar) ? (
          <SidebarTrigger 
            className="-ml-1 animate-fade-in" 
            style={{
              color: themeVars.sidebarTextColor,
            }}
          />
        ) : (
          <div className="w-9 h-9" /> // Placeholder to maintain spacing
        )}
      </div>
      <div className="flex items-center gap-3 pr-4">
        <TooltipProvider>
          <Tooltip open={showEbookHint} onOpenChange={(open) => {
            if (!open) setShowEbookHint(false);
          }}>
            <TooltipTrigger asChild>
              <button 
                onClick={handleToggleEbook} 
                className={`relative p-1 px-3 text-sm rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  isEbookPanelOpen 
                    ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md' 
                    : 'bg-secondary hover:bg-secondary/80 text-foreground'
                }`}
              >
                <svg 
                  className={`w-4 h-4 transition-transform duration-200 ${isEbookPanelOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Document Library
                {isEbookPanelOpen && (
                  <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                )}
              </button>
            </TooltipTrigger>
            {showEbookHint && (
              <TooltipContent 
                side="bottom" 
                align="center" 
                className="bg-slate-800 text-white p-2 rounded-md shadow-lg border border-slate-700"
              >
                <p className="text-sm">
                  {isEbookPanelOpen ? 'Close document viewer' : 'View your documents here!'}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        {/* <ChatThemeSwitcher /> */}
        {/* <AuthButton /> */}
      </div>
    </header>
  );
}

// Inner component to access context after Provider
function ChatLayoutContent({ children, slug }: { children: React.ReactNode; slug: string }) {
  const { isEbookPanelOpen, openEbookPanel, closeEbookPanel } = useEbookContext();
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

  const handleToggleEbook = () => {
    if (isEbookPanelOpen) {
      closeEbookPanel();
    } else {
      openEbookPanel(); 
    }
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
          <ChatHeader 
            themeVars={themeVars}
            isEbookPanelOpen={isEbookPanelOpen}
            handleToggleEbook={handleToggleEbook}
            showEbookHint={showEbookHint}
            setShowEbookHint={setShowEbookHint}
          />
          <PanelGroup direction="horizontal" className="flex-grow w-full overflow-hidden">
            <Panel 
              defaultSize={isEbookPanelOpen ? 50 : 100} 
              minSize={30}
            >
              <div className="h-full w-full overflow-y-auto bg-background">
                {children}
              </div>
            </Panel>
            {isEbookPanelOpen && (
              <>
                <PanelResizeHandle 
                  className="w-1 transition-colors duration-200 cursor-col-resize panel-resize-handle"
                  style={{
                    backgroundColor: themeVars.primaryColor + '20', // Primary color with 20% opacity for subtle default
                    '--hover-color': themeVars.primaryColor + '40', // Primary color with 40% opacity on hover
                    '--active-color': themeVars.primaryColor + '60', // Primary color with 60% opacity when dragging
                  } as React.CSSProperties}
                />
                <Panel 
                  defaultSize={50} 
                  minSize={25} 
                  maxSize={80}
                  collapsible={false} 
                  collapsedSize={0}
                >
                  <div className="h-full animate-in slide-in-from-right-3 fade-in-0 duration-300 ease-out">
                    <EbookPanel />
                  </div>
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
