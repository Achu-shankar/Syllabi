'use client';

import { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from "react-resizable-panels";
import { AppSidebar } from "./components/sidebar/app-sidebar";
import { useParams } from 'next/navigation';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { EbookProvider, useEbookContext } from './lib/context/ebook-context';
import { ChatbotProvider } from '../contexts/ChatbotContext'; // Import ChatbotProvider
import { ChatThemeProvider } from '../contexts/ChatbotThemeContext'; // Import ChatThemeProvider
import { ThemeApplicator, useChatThemeVars } from './components/ThemeApplicator'; // Import ThemeApplicator and theme vars hook
import { ChatbotNotFound } from './components/ChatbotNotFound'; // Import ChatbotNotFound
import { ChatbotLoading } from './components/ChatbotLoading'; // Import ChatbotLoading
// Import ChatThemeSwitcher
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Header component that uses sidebar context
function ChatHeader({ 
  themeVars, 
  isEbookPanelOpen, 
  handleToggleEbook, 
  showEbookHint, 
  setShowEbookHint,
  applyPreset 
}: {
  themeVars: any;
  isEbookPanelOpen: boolean;
  handleToggleEbook: () => void;
  showEbookHint: boolean;
  setShowEbookHint: (show: boolean) => void;
  applyPreset: (chatSize: number, documentSize: number) => void;
}) {
  const { open, openMobile, isMobile: isMobileSidebar } = useSidebar();
  const { isChatHidden, toggleChatVisibility } = useEbookContext();

  // Quick preset configurations with visual representations
  const presets = [
    { 
      label: "30:70", 
      chat: 30, 
      doc: 70, 
      tooltip: "Chat 30%, Document 70% (Ctrl+1)",
      icon: "chat-small"
    },
    { 
      label: "50:50", 
      chat: 50, 
      doc: 50, 
      tooltip: "Equal split (Ctrl+2)",
      icon: "equal"
    },
    { 
      label: "70:30", 
      chat: 70, 
      doc: 30, 
      tooltip: "Chat 70%, Document 30% (Ctrl+3)",
      icon: "chat-large"
    }
  ];

  // Function to render preset icon (two rectangles showing the split)
  const renderPresetIcon = (preset: typeof presets[0]) => {
    const chatWidth = (preset.chat / 100) * 12; // Scale to 12px total width for more subtle appearance
    const docWidth = (preset.doc / 100) * 12;
    
    return (
      <svg className="w-4 h-3" viewBox="0 0 14 8" fill="none">
        <rect 
          x="1" 
          y="1" 
          width={chatWidth} 
          height="6" 
          rx="0.5" 
          fill="currentColor" 
          opacity="0.6"
        />
        <rect 
          x={1 + chatWidth + 0.5} 
          y="1" 
          width={docWidth} 
          height="6" 
          rx="0.5" 
          fill="currentColor" 
          opacity="0.3"
        />
      </svg>
    );
  };

  return (
    <header 
      className="flex justify-between items-center h-12 shrink-0 px-4 transition-colors duration-300"
      style={{ backgroundColor: themeVars.chatWindowBackgroundColor }}
    >
      <div className="flex items-center gap-2">
        {(!open || isMobileSidebar) ? (
          <SidebarTrigger 
            className="-ml-1 animate-fade-in" 
            style={{
              color: themeVars.primaryColor,
            }}
          />
        ) : (
          <div className="w-9 h-9" /> // Placeholder to maintain spacing
        )}
        
        {/* Chat Toggle Button - Only show when ebook panel is open */}
        {isEbookPanelOpen && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleChatVisibility}
                  className="p-2 rounded-md hover:bg-secondary/80 transition-colors duration-200"
                  style={{
                    color: themeVars.sidebarTextColor,
                  }}
                  aria-label={isChatHidden ? "Show chat panel" : "Hide chat panel"}
                >
                  {isChatHidden ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6" opacity="0.6" />
                    </svg>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start">
                <p className="text-sm">
                  {isChatHidden ? 'Show chat panel (Ctrl+H)' : 'Hide chat panel (Ctrl+H)'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Layout Presets Dropdown - Only show when both panels are visible */}
        {isEbookPanelOpen && !isChatHidden && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 rounded-md hover:bg-secondary/80 transition-colors duration-200"
                style={{
                  color: themeVars.sidebarTextColor,
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6v12" />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {presets.map((preset) => (
                <DropdownMenuItem
                  key={preset.label}
                  onClick={() => applyPreset(preset.chat, preset.doc)}
                  className="flex items-center justify-between px-3 py-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {renderPresetIcon(preset)}
                    <span className="text-sm">{preset.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {preset.label === "30:70" ? "Ctrl+1" : preset.label === "50:50" ? "Ctrl+2" : "Ctrl+3"}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
  const { isEbookPanelOpen, isChatHidden, openEbookPanel, closeEbookPanel, toggleChatVisibility } = useEbookContext();
  const { chatbot, isLoading, error } = useChatConfig(); // Get chatbot state
  const [showEbookHint, setShowEbookHint] = useState(false);
  const themeVars = useChatThemeVars(); // Get theme CSS variables
  
  // Panel refs for programmatic control
  const chatPanelRef = useRef<ImperativePanelHandle>(null);
  const documentPanelRef = useRef<ImperativePanelHandle>(null);
  
  // State to preserve user's preferred panel sizes
  const [lastChatSize, setLastChatSize] = useState(50);
  const [lastDocumentSize, setLastDocumentSize] = useState(50);
  const [hasUserResized, setHasUserResized] = useState(false);
  const [isProgrammaticResize, setIsProgrammaticResize] = useState(false);

  useEffect(() => {
    const hintShown = localStorage.getItem('ebookHintShown');
    if (!hintShown) {
      setShowEbookHint(true);
      localStorage.setItem('ebookHintShown', 'true');
    }
  }, []);

  // Load saved panel sizes from localStorage on mount
  useEffect(() => {
    const savedChatSize = localStorage.getItem('chatPanelSize');
    const savedDocumentSize = localStorage.getItem('documentPanelSize');
    const savedHasResized = localStorage.getItem('hasUserResizedPanels');
    
    if (savedChatSize && savedDocumentSize && savedHasResized === 'true') {
      const chatSize = parseFloat(savedChatSize);
      const docSize = parseFloat(savedDocumentSize);
      setLastChatSize(chatSize);
      setLastDocumentSize(docSize);
      setHasUserResized(true);
      console.log(`[Layout] Restored saved panel sizes - Chat: ${chatSize}%, Document: ${docSize}%`);
    }
  }, []);

  // Function to handle panel resize events
  const handlePanelResize = (chatSize: number, documentSize: number) => {
    console.log(`[Layout] User resized panels - Chat: ${chatSize}%, Document: ${documentSize}%`);
    setLastChatSize(chatSize);
    setLastDocumentSize(documentSize);
    setHasUserResized(true);
    
    // Save to localStorage for persistence
    localStorage.setItem('chatPanelSize', chatSize.toString());
    localStorage.setItem('documentPanelSize', documentSize.toString());
    localStorage.setItem('hasUserResizedPanels', 'true');
  };

  // Function to apply quick presets
  const applyPreset = (chatSize: number, documentSize: number) => {
    console.log(`[Layout] Applying preset - Chat: ${chatSize}%, Document: ${documentSize}%`);
    if (chatPanelRef.current && documentPanelRef.current) {
      setIsProgrammaticResize(true);
      chatPanelRef.current.resize(chatSize);
      documentPanelRef.current.resize(documentSize);
      handlePanelResize(chatSize, documentSize);
      // Reset the flag after a short delay
      setTimeout(() => setIsProgrammaticResize(false), 200);
    }
  };

  // Effect to handle chat panel collapse/expand
  useEffect(() => {
    if (isEbookPanelOpen && chatPanelRef.current && documentPanelRef.current) {
      console.log(`[Layout] Panel control effect - isChatHidden: ${isChatHidden}, hasUserResized: ${hasUserResized}`);
      setIsProgrammaticResize(true);
      
      if (isChatHidden) {
        // Collapse chat panel and expand document panel
        console.log('[Layout] Collapsing chat panel and expanding document panel');
        chatPanelRef.current.collapse();
        documentPanelRef.current.resize(100);
      } else {
        // Expand chat panel and resize document panel
        console.log('[Layout] Expanding chat panel');
        chatPanelRef.current.expand();
        
        // Use saved sizes if user has resized before, otherwise use 50:50 default
        const chatSize = hasUserResized ? lastChatSize : 50;
        const docSize = hasUserResized ? lastDocumentSize : 50;
        
        console.log(`[Layout] Restoring panel sizes - Chat: ${chatSize}%, Document: ${docSize}%`);
        
        setTimeout(() => {
          chatPanelRef.current?.resize(chatSize);
          documentPanelRef.current?.resize(docSize);
        }, 100);
      }
      
      // Reset the programmatic flag after operations complete
      setTimeout(() => setIsProgrammaticResize(false), 300);
    } else {
      console.log(`[Layout] Panel control skipped - isEbookPanelOpen: ${isEbookPanelOpen}, chatPanelRef: ${!!chatPanelRef.current}, documentPanelRef: ${!!documentPanelRef.current}`);
    }
  }, [isChatHidden, isEbookPanelOpen, hasUserResized, lastChatSize, lastDocumentSize]);

  // Keyboard shortcuts for quick presets
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when both panels are visible and ebook panel is open
      if (!isEbookPanelOpen || isChatHidden) return;
      
      // Check for Ctrl+Number combinations
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            applyPreset(30, 70);
            console.log('[Layout] Keyboard shortcut: Applied 30:70 preset');
            break;
          case '2':
            event.preventDefault();
            applyPreset(50, 50);
            console.log('[Layout] Keyboard shortcut: Applied 50:50 preset');
            break;
          case '3':
            event.preventDefault();
            applyPreset(70, 30);
            console.log('[Layout] Keyboard shortcut: Applied 70:30 preset');
            break;
          case 'h':
          case 'H':
            event.preventDefault();
            toggleChatVisibility();
            console.log('[Layout] Keyboard shortcut: Toggled chat visibility');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEbookPanelOpen, isChatHidden, applyPreset, toggleChatVisibility]);

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
            applyPreset={applyPreset}
          />
          <PanelGroup 
            direction="horizontal" 
            className="flex-grow w-full overflow-hidden"
            onLayout={(sizes) => {
              // Only track manual resizes when both panels are visible and not during programmatic changes
              if (!isChatHidden && isEbookPanelOpen && sizes.length === 2 && !isProgrammaticResize) {
                const [chatSize, documentSize] = sizes;
                
                // Only save if this is a significant change from our stored values (not just noise)
                const chatDiff = Math.abs(chatSize - lastChatSize);
                const docDiff = Math.abs(documentSize - lastDocumentSize);
                
                // Only update if the change is significant (>5%) and seems intentional
                if (chatDiff > 5 || docDiff > 5) {
                  console.log(`[Layout] Manual resize detected - Chat: ${chatSize.toFixed(1)}%, Document: ${documentSize.toFixed(1)}%`);
                  handlePanelResize(Math.round(chatSize * 10) / 10, Math.round(documentSize * 10) / 10);
                }
              }
            }}
          >
            <Panel 
              ref={chatPanelRef}
              defaultSize={isEbookPanelOpen ? 50 : 100} 
              minSize={isChatHidden ? 0 : 30}
              maxSize={isChatHidden ? 0 : 100}
              collapsible={true}
              collapsedSize={0}
            >
              <div className="h-full w-full overflow-y-auto bg-background">
                {children}
              </div>
            </Panel>
            {isEbookPanelOpen && (
              <PanelResizeHandle 
                className="w-1 transition-colors duration-200 cursor-col-resize panel-resize-handle"
                style={{
                  backgroundColor: themeVars.primaryColor + '20', // Primary color with 20% opacity for subtle default
                  '--hover-color': themeVars.primaryColor + '40', // Primary color with 40% opacity on hover
                  '--active-color': themeVars.primaryColor + '60', // Primary color with 60% opacity when dragging
                  display: isChatHidden ? 'none' : 'block', // Hide resize handle when chat is hidden
                } as React.CSSProperties}
              />
            )}
            {isEbookPanelOpen && (
              <Panel 
                ref={documentPanelRef}
                defaultSize={isChatHidden ? 100 : 50} 
                minSize={25} 
                maxSize={isChatHidden ? 100 : 80}
                collapsible={false} 
                collapsedSize={0}
              >
                <div className="h-full animate-in slide-in-from-right-3 fade-in-0 duration-300 ease-out">
                  <EbookPanel />
                </div>
              </Panel>
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
