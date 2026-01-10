import { motion } from "framer-motion";
import { Trophy, Medal, Award, User, Settings, Eye, EyeOff } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

interface LeaderboardProps {
  className?: string;
}

export function Leaderboard({ className }: LeaderboardProps) {
  const { leaderboard, userProgress, togglePublic, updateDisplayName } = useGamification();
  const [displayName, setDisplayName] = useState(userProgress?.display_name || "");
  const [dialogOpen, setDialogOpen] = useState(false);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{index + 1}</span>;
    }
  };

  const handleSaveSettings = () => {
    if (displayName.trim()) {
      updateDisplayName(displayName.trim());
    }
    setDialogOpen(false);
  };

  const userRank = leaderboard?.findIndex((entry) => entry.id === userProgress?.id);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Ranking
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurações do Ranking</DialogTitle>
              <DialogDescription>
                Configure como você aparece no ranking público
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="public-toggle">Participar do Ranking</Label>
                  <p className="text-sm text-muted-foreground">
                    Seu perfil será visível para outros usuários
                  </p>
                </div>
                <Switch
                  id="public-toggle"
                  checked={userProgress?.is_public ?? true}
                  onCheckedChange={(checked) => togglePublic(checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="display-name">Nome de Exibição</Label>
                <Input
                  id="display-name"
                  placeholder="Como você quer ser chamado?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Este nome aparecerá no ranking ao invés do seu email
                </p>
              </div>

              <Button onClick={handleSaveSettings} className="w-full">
                Salvar Configurações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {userProgress && !userProgress.is_public && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <EyeOff className="h-4 w-4" />
          <span>Você está oculto do ranking</span>
          <Button
            variant="link"
            size="sm"
            className="ml-auto p-0 h-auto"
            onClick={() => togglePublic(true)}
          >
            Mostrar
          </Button>
        </div>
      )}

      {userRank !== undefined && userRank >= 0 && userProgress?.is_public && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm">
            Sua posição: <span className="font-bold text-primary">#{userRank + 1}</span>
          </p>
        </div>
      )}

      <div className="space-y-2">
        {leaderboard?.slice(0, 20).map((entry, index) => {
          const isCurrentUser = entry.id === userProgress?.id;
          
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                isCurrentUser
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-muted/30 hover:bg-muted/50"
              )}
            >
              <div className="w-6 flex justify-center">
                {getRankIcon(index)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className={cn(
                    "text-sm font-medium truncate",
                    isCurrentUser && "text-primary"
                  )}>
                    {entry.display_name || "Anônimo"}
                    {isCurrentUser && " (você)"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                {entry.current_streak > 0 && (
                  <span className="flex items-center gap-1 text-orange-500">
                    🔥 {entry.current_streak}
                  </span>
                )}
                <div className="text-right">
                  <p className="font-medium">{entry.total_xp.toLocaleString()} XP</p>
                  <p className="text-xs text-muted-foreground">Nível {entry.current_level}</p>
                </div>
              </div>
            </motion.div>
          );
        })}

        {!leaderboard?.length && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum participante no ranking ainda
          </div>
        )}
      </div>
    </div>
  );
}
