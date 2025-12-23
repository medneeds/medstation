import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Users } from "lucide-react";
import StudiusLayout from "@/components/studius/StudiusLayout";
import { XPProgress } from "@/components/studius/XPProgress";
import { AchievementsList } from "@/components/studius/AchievementsList";
import { Leaderboard } from "@/components/studius/Leaderboard";

export default function StudiusGamification() {
  return (
    <StudiusLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Seu Progresso</h1>
          <p className="text-muted-foreground">
            Acompanhe seu XP, conquistas e posição no ranking
          </p>
        </div>

        <XPProgress />

        <Tabs defaultValue="achievements" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Conquistas
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Ranking
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="achievements" className="mt-6">
            <AchievementsList />
          </TabsContent>
          
          <TabsContent value="leaderboard" className="mt-6">
            <Leaderboard />
          </TabsContent>
        </Tabs>
      </div>
    </StudiusLayout>
  );
}
