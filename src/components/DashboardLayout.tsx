import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={false} className="w-full">
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top header */}
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              <SidebarTrigger className="flex-shrink-0" />
              <div className="relative hidden sm:block flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar pacientes, CID, medicamentos..."
                  className="w-full pl-9 border-input"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-4 md:p-6 bg-muted/50 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
