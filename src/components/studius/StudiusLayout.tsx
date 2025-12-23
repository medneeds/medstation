import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  MessageSquare, 
  FileText, 
  Layers, 
  Brain, 
  TrendingUp,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StudiusLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: "/studius", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/studius/chat", label: "Chat IA", icon: MessageSquare },
  { path: "/studius/progress", label: "Progresso", icon: TrendingUp },
  { path: "/studius/flashcards", label: "Flashcards", icon: Layers, disabled: true },
  { path: "/studius/quizzes", label: "Quizzes", icon: Brain, disabled: true },
];

export default function StudiusLayout({ children }: StudiusLayoutProps) {
  const location = useLocation();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-studius-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
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

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.disabled ? "#" : item.path}
                  onClick={(e) => item.disabled && e.preventDefault()}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive(item.path, item.exact)
                      ? "bg-studius-primary/10 text-studius-primary"
                      : item.disabled
                      ? "text-muted-foreground/50 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground hover:bg-studius-muted"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-t border-studius-border safe-area-inset-bottom">
        <nav className="flex items-center justify-around py-2 px-2">
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.path}
              to={item.disabled ? "#" : item.path}
              onClick={(e) => item.disabled && e.preventDefault()}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 min-w-[56px]",
                isActive(item.path, item.exact)
                  ? "text-studius-primary"
                  : item.disabled
                  ? "text-muted-foreground/50"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>
    </div>
  );
}
