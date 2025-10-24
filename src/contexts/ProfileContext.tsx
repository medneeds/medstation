import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  full_name: string | null;
  gender: "M" | "F" | "Outro" | null;
  avatar_url: string | null;
  crm: string | null;
  crm_state: string | null;
  specialty: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
}

interface ProfileContextType {
  profile: ProfileData | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, gender, avatar_url, crm, crm_state, specialty, address, city, state")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile({
        full_name: data.full_name,
        gender: data.gender as "M" | "F" | "Outro" | null,
        avatar_url: data.avatar_url,
        crm: data.crm,
        crm_state: data.crm_state,
        specialty: data.specialty,
        address: data.address,
        city: data.city,
        state: data.state,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        refreshProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, loading, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
