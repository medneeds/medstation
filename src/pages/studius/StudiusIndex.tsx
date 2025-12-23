import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import StudiusLayout from "@/components/studius/StudiusLayout";
import StudiusDashboard from "./StudiusDashboard";
import StudiusChat from "./StudiusChat";
import StudiusOnboarding from "./StudiusOnboarding";
import StudiusGamification from "./StudiusGamification";
import { useStudiusPreferences } from "@/hooks/useStudius";
import { Loader2 } from "lucide-react";

export default function StudiusIndex() {
  const { preferences, loading, savePreferences } = useStudiusPreferences();
  const location = useLocation();

  const handleOnboardingComplete = async (data: { specialty: string; goals: string[] }) => {
    try {
      await savePreferences(data);
    } catch (error) {
      console.error("Error saving onboarding:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-studius-primary" />
          <p className="text-muted-foreground animate-pulse">Carregando Studius...</p>
        </div>
      </div>
    );
  }

  // Show onboarding if not completed and not already on onboarding page
  if (!preferences?.onboarding_completed && !location.pathname.includes("/onboarding")) {
    return <StudiusOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <StudiusLayout>
      <Routes>
        <Route path="/" element={<StudiusDashboard />} />
        <Route path="/chat" element={<StudiusChat />} />
        <Route path="/progress" element={<StudiusGamification />} />
        <Route path="/onboarding" element={<StudiusOnboarding onComplete={handleOnboardingComplete} />} />
        <Route path="*" element={<Navigate to="/studius" replace />} />
      </Routes>
    </StudiusLayout>
  );
}
