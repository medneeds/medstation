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
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          {/* Top header */}
          <header className="sticky top-0 z-10 flex h-14 md:h-16 items-center justify-between border-b bg-background px-3 md:px-6 shadow-medical">
            <div className="flex items-center gap-2 md:gap-4 flex-1">
              <SidebarTrigger className="md:mr-2" />
              <div className="relative hidden sm:block flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar pacientes, CID, medicamentos..."
                  className="w-full pl-9"
                />
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10">
                <Bell className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-3 md:p-6 bg-muted/30 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
