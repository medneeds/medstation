import { ReactNode, useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Layers, 
  Brain, 
  TrendingUp,
  Sparkles,
  ArrowLeft,
  Settings,
  FileText,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StudiusLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: "/studius", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/studius/chat", label: "Chat IA", icon: MessageSquare },
  { path: "/studius/articles", label: "Artigos", icon: FileText },
  { path: "/studius/flashcards", label: "Flashcards", icon: Layers },
  { path: "/studius/quizzes", label: "Quizzes", icon: Brain },
  { path: "/studius/progress", label: "Progresso", icon: TrendingUp },
];

export default function StudiusLayout({ children }: StudiusLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Check for mobile and collapse sidebar by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleBackToMedStation = () => {
    navigate("/dashboard");
  };

  const handleReconfigurePreferences = () => {
    navigate("/studius/onboarding");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "hidden lg:flex flex-col fixed left-0 top-0 h-full bg-card border-r border-border z-50 transition-all duration-300 ease-in-out",
            sidebarOpen ? "w-64" : "w-20"
          )}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center w-full")}>
              <div className="p-2 rounded-xl bg-gradient-to-br from-studius-primary via-studius-secondary to-studius-accent shadow-lg shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              {sidebarOpen && (
                <div className="overflow-hidden">
                  <h1 className="text-lg font-bold bg-gradient-to-r from-studius-primary to-studius-accent bg-clip-text text-transparent whitespace-nowrap">
                    Studius
                  </h1>
                  <p className="text-[10px] text-muted-foreground -mt-0.5">Premium Edition</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive(item.path, item.exact)
                        ? "bg-studius-primary text-white shadow-lg shadow-studius-primary/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      !sidebarOpen && "justify-center px-0"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </NavLink>
                </TooltipTrigger>
                {!sidebarOpen && (
                  <TooltipContent side="right" className="bg-popover border-border">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-border space-y-2">
            {/* Theme Toggle */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={sidebarOpen ? "default" : "icon"}
                  onClick={toggleTheme}
                  className={cn(
                    "w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted",
                    !sidebarOpen && "justify-center"
                  )}
                >
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5 shrink-0" />
                  ) : (
                    <Moon className="h-5 w-5 shrink-0" />
                  )}
                  {sidebarOpen && (theme === "dark" ? "Modo Claro" : "Modo Escuro")}
                </Button>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right" className="bg-popover border-border">
                  {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                </TooltipContent>
              )}
            </Tooltip>

            {/* Settings */}
            <DropdownMenu>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size={sidebarOpen ? "default" : "icon"}
                      className={cn(
                        "w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted",
                        !sidebarOpen && "justify-center"
                      )}
                    >
                      <Settings className="h-5 w-5 shrink-0" />
                      {sidebarOpen && "Configurações"}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                {!sidebarOpen && (
                  <TooltipContent side="right" className="bg-popover border-border">
                    Configurações
                  </TooltipContent>
                )}
              </Tooltip>
              <DropdownMenuContent side="right" align="end" className="w-56 bg-popover border-border">
                <DropdownMenuItem onClick={handleReconfigurePreferences}>
                  <Settings className="h-4 w-4 mr-2" />
                  Reconfigurar Preferências
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBackToMedStation}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para MedStation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Back to MedStation */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={sidebarOpen ? "default" : "icon"}
                  onClick={handleBackToMedStation}
                  className={cn(
                    "w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted",
                    !sidebarOpen && "justify-center"
                  )}
                >
                  <ArrowLeft className="h-5 w-5 shrink-0" />
                  {sidebarOpen && "Voltar ao MedStation"}
                </Button>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right" className="bg-popover border-border">
                  Voltar ao MedStation
                </TooltipContent>
              )}
            </Tooltip>
          </div>

          {/* Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-border bg-background shadow-md hover:bg-muted"
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </aside>

        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-studius-primary via-studius-secondary to-studius-accent">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold bg-gradient-to-r from-studius-primary to-studius-accent bg-clip-text text-transparent">
                Studius
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-foreground"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={cn(
            "lg:hidden fixed left-0 top-0 h-full w-72 bg-card border-r border-border z-50 transform transition-transform duration-300 ease-in-out",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Mobile Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-studius-primary via-studius-secondary to-studius-accent shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-studius-primary to-studius-accent bg-clip-text text-transparent">
                  Studius
                </h1>
                <p className="text-[10px] text-muted-foreground -mt-0.5">Premium Edition</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive(item.path, item.exact)
                    ? "bg-studius-primary text-white shadow-lg shadow-studius-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Mobile Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border space-y-2">
            <Button
              variant="ghost"
              onClick={toggleTheme}
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleReconfigurePreferences}
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Settings className="h-5 w-5" />
              Configurações
            </Button>
            <Button
              variant="ghost"
              onClick={handleBackToMedStation}
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar ao MedStation
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <main
          className={cn(
            "flex-1 min-h-screen transition-all duration-300 ease-in-out",
            "lg:ml-64",
            !sidebarOpen && "lg:ml-20",
            "pt-14 lg:pt-0"
          )}
        >
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
