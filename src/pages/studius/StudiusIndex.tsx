import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StudiusLayout from "@/components/studius/StudiusLayout";
import StudiusDashboard from "./StudiusDashboard";
import StudiusChat from "./StudiusChat";
import StudiusOnboarding from "./StudiusOnboarding";

export default function StudiusIndex() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasCompletedOnboarding(false);
        setIsLoading(false);
        return;
      }

      // Check localStorage for onboarding completion
      const onboardingKey = `studius_onboarding_${user.id}`;
      const completed = localStorage.getItem(onboardingKey);
      setHasCompletedOnboarding(completed === "true");
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      setHasCompletedOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async (data: { specialty: string; goals: string[] }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const onboardingKey = `studius_onboarding_${user.id}`;
        localStorage.setItem(onboardingKey, "true");
        localStorage.setItem(`studius_specialty_${user.id}`, data.specialty);
        localStorage.setItem(`studius_goals_${user.id}`, JSON.stringify(data.goals));
      }
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-studius-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-studius-primary/30 border-t-studius-primary animate-spin" />
          <p className="text-studius-muted animate-pulse">Carregando Studius...</p>
        </div>
      </div>
    );
  }

  // Show onboarding if not completed and not already on onboarding page
  if (!hasCompletedOnboarding && !location.pathname.includes("/onboarding")) {
    return <StudiusOnboarding onComplete={completeOnboarding} />;
  }

  return (
    <StudiusLayout>
      <Routes>
        <Route path="/" element={<StudiusDashboard />} />
        <Route path="/chat" element={<StudiusChat />} />
        <Route path="/onboarding" element={<StudiusOnboarding onComplete={completeOnboarding} />} />
        <Route path="*" element={<Navigate to="/studius" replace />} />
      </Routes>
    </StudiusLayout>
  );
}
