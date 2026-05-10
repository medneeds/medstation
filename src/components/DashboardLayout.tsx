import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import NotificationBell from "@/components/NotificationBell";
import { HeaderUserMenu } from "@/components/HeaderUserMenu";
import { HeaderThemeToggle } from "@/components/HeaderThemeToggle";
import { SupportChat } from "@/components/SupportChat";

interface DashboardLayoutProps {
  children: ReactNode;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Início",
  clinicus: "Clínicus",
  examinus: "Examinus",
  gasometrus: "Gasometrus",
  scorius: "Scorius",
  numerus: "Numerus",
  prescriptus: "Prescriptus",
  atestus: "Atestus",
  protocolus: "Protocolus",
  orientus: "Orientus",
  codexus: "CODexus",
  settings: "Perfil",
  pricing: "Assinatura",
  patients: "Pacientes",
  cases: "Casos",
  notes: "Notas",
};

function getCrumb(pathname: string) {
  const seg = pathname.split("/").filter(Boolean)[0] || "dashboard";
  return ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { pathname } = useLocation();
  const crumb = getCrumb(pathname);

  return (
    <>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex flex-1 flex-col min-w-0">
            {/* Editorial top bar — hairline only, no shadow */}
            <header className="sticky top-0 z-20 flex h-14 items-center justify-between hairline-b bg-background/85 backdrop-blur-md px-3 md:px-5">
              <div className="flex items-center gap-3 md:gap-5 flex-1 min-w-0">
                <SidebarTrigger
                  className="h-8 w-8 rounded-sm border border-hairline hover:bg-accent hover:border-foreground/40 transition-colors"
                />

                {/* Editorial breadcrumb */}
                <div className="hidden md:flex items-center gap-3 min-w-0">
                  <span className="font-mono text-2xs uppercase tracking-mono text-muted-foreground/70">
                    MedStation
                  </span>
                  <span className="text-muted-foreground/40">/</span>
                  <span className="font-display text-base font-semibold tracking-tight text-foreground truncate">
                    {crumb}
                  </span>
                </div>

                {/* Search */}
                <div className="relative hidden lg:block ml-auto w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    placeholder="Buscar..."
                    className="h-8 pl-8 pr-12 text-sm bg-transparent"
                  />
                  <kbd className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-2xs text-muted-foreground/60 border border-hairline rounded-sm px-1.5 py-0.5 leading-none">
                    ⌘K
                  </kbd>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3 hairline-l pl-2 md:pl-4 ml-2 md:ml-4">
                <HeaderThemeToggle />
                <NotificationBell />
                <HeaderUserMenu />
              </div>
            </header>

            {/* Main */}
            <main className="flex-1 overflow-x-hidden bg-background p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
      <SupportChat />
    </>
  );
}
