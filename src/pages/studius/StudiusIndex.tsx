import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import StudiusDashboard from "./StudiusDashboard";
import StudiusChat from "./StudiusChat";
import StudiusOnboarding from "./StudiusOnboarding";
import StudiusGamification from "./StudiusGamification";
import StudiusFlashcards from "./StudiusFlashcards";
import StudiusQuizzes from "./StudiusQuizzes";
import StudiusArticles from "./StudiusArticles";
import StudiusLanding from "./StudiusLanding";
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

  // Show landing page for the /studius/landing route
  if (location.pathname === "/studius/landing") {
    return <StudiusLanding />;
  }

  if (!preferences?.onboarding_completed && !location.pathname.includes("/onboarding")) {
    return <StudiusOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <Routes>
      <Route path="/" element={<StudiusDashboard />} />
      <Route path="/chat" element={<StudiusChat />} />
      <Route path="/flashcards" element={<StudiusFlashcards />} />
      <Route path="/quizzes" element={<StudiusQuizzes />} />
      <Route path="/articles" element={<StudiusArticles />} />
      <Route path="/progress" element={<StudiusGamification />} />
      <Route path="/landing" element={<StudiusLanding />} />
      <Route path="/onboarding" element={<StudiusOnboarding onComplete={handleOnboardingComplete} />} />
      <Route path="*" element={<Navigate to="/studius" replace />} />
    </Routes>
  );
}