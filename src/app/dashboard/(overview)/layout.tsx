import { AppSidebar } from "./components/app-sidebar";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
  } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner";

export default function OverviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
        <AppSidebar className="h-full" />
        <SidebarInset>
            <header className="flex h-12  border-b border-border shrink-0 items-center py-2 px-2 gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                <SidebarTrigger />
            </header>
            <main className="flex-1 overflow-y-auto p-6">
                {children}
            </main>
            <Toaster richColors position="top-right" />
        </SidebarInset>
    </SidebarProvider>
  );
}
