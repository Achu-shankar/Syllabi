import { AppSidebar } from "./components/app-sidebar"; // Sidebar specific to this [chatbotId] section
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
  } from "@/components/ui/sidebar"; // Assuming these are general UI components
import { Toaster } from "@/components/ui/sonner"; // General UI component
import { Suspense } from "react";

// You might want a breadcrumb or header component here too eventually
// import ChatbotHeader from "./components/chatbot-header"; 

export default function ChatbotDetailLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { chatbotId: string };
}) {
  return (
    <SidebarProvider>
        {/* Pass chatbotId to AppSidebar if it needs it for context/links */}
        <AppSidebar chatbotId={params.chatbotId} className="h-full" /> 
        <SidebarInset>
            {/* 
            Future: Consider a header specific to the chatbot, showing its name, etc.
            <ChatbotHeader chatbotId={params.chatbotId} /> 
            Could include a SidebarTrigger if the main trigger is not global 
            */} 
            <header className="flex h-12 shrink-0 items-center px-2 gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                <SidebarTrigger /> {/* Assuming this is a global trigger or adaptable */}
            </header>
            <main className="flex-1 overflow-y-auto p-6">
                <Suspense fallback={<div>Loading chatbot details...</div>}> {/* Basic suspense fallback */}
                    {children}
                </Suspense>
            </main>
            <Toaster richColors position="top-right" />
        </SidebarInset>
    </SidebarProvider>
  );
}

