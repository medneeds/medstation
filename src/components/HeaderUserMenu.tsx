import { useNavigate } from "react-router-dom";
import { User, LogOut, CreditCard, Settings as SettingsIcon, Gift } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";

export function HeaderUserMenu() {
  const navigate = useNavigate();
  const { profile } = useProfile();

  const getInitials = () => {
    if (!profile?.full_name) return "?";
    const names = profile.full_name.split(" ");
    if (names.length === 1) return names[0][0].toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const getTitle = () => {
    if (!profile?.gender) return "Dr(a)";
    return profile.gender === "M" ? "Dr." : profile.gender === "F" ? "Dra." : "Dr(a)";
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const displayName = profile?.full_name?.split(" ")[0] || "—";
  const crmLine =
    profile?.crm && profile?.crm_state
      ? `CRM-${profile.crm_state} ${profile.crm}`
      : profile?.specialty || "Médico";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2 rounded-sm border border-hairline pl-1 pr-2 py-1 hover:bg-accent hover:border-foreground/40 transition-colors outline-none focus-visible:border-primary">
        <Avatar className="h-7 w-7 rounded-sm">
          <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} className="rounded-sm" />
          <AvatarFallback className="rounded-sm bg-muted text-foreground font-medium text-2xs">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        <div className="hidden md:flex flex-col leading-none items-start">
          <span className="text-xs font-medium text-foreground truncate max-w-[140px]">
            {getTitle()} {displayName}
          </span>
          <span className="font-mono text-2xs uppercase tracking-mono text-muted-foreground/80 truncate max-w-[140px] mt-0.5">
            {crmLine}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{getTitle()} {displayName}</span>
          <span className="font-mono text-2xs uppercase tracking-mono text-muted-foreground">{crmLine}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <User className="mr-2 h-4 w-4" />
          Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/pricing")}>
          <CreditCard className="mr-2 h-4 w-4" />
          Assinatura
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/indicar")}>
          <Gift className="mr-2 h-4 w-4 text-primary" />
          <span className="flex-1">Indicar e ganhar</span>
          <span className="font-mono text-2xs text-primary/80">+30d</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
