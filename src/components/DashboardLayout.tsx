import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import NotificationBell from "@/components/NotificationBell";
import { SupportChat } from "@/components/SupportChat";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            {/* Top header */}
            <header className="sticky top-0 z-10 flex h-14 md:h-16 items-center justify-between border-b bg-background px-3 md:px-6 shadow-medical">
              <div className="flex items-center gap-2 md:gap-4">
                <SidebarTrigger />
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar pacientes, CID, medicamentos..."
                    className="w-[300px] pl-9"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell />
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-x-hidden bg-muted/30 p-3 md:p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
      <SupportChat />
    </>
  );
}
