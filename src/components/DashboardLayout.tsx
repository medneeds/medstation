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
            <header className="sticky top-0 z-10 flex h-12 md:h-14 lg:h-16 items-center justify-between border-b bg-background px-2 md:px-4 lg:px-6 shadow-medical">
              <div className="flex items-center gap-1 md:gap-2 lg:gap-4 flex-1 min-w-0">
                <SidebarTrigger className="h-8 w-8 md:h-9 md:w-9" />
                <div className="relative hidden lg:block flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar pacientes, CID, medicamentos..."
                    className="w-full pl-9 h-9"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <NotificationBell />
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-x-hidden bg-muted/30 p-2 md:p-4 lg:p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
      <SupportChat />
    </>
  );
}
