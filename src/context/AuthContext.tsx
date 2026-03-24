"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [supabase] = useState(() => createClient());

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      setProfileError(null);

      const [
        { data: profileData, error: profileQueryError },
        { count, error: postsCountError },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("forum_posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);

      if (profileQueryError) {
        setProfile(null);
        setProfileError(profileQueryError.message);
        return null;
      }

      let nextProfile = profileData;

      if (
        nextProfile?.status === "cooling" &&
        nextProfile.ban_expires_at &&
        new Date(nextProfile.ban_expires_at).getTime() <= Date.now()
      ) {
        const { data: clearedProfile, error: clearError } = await supabase
          .from("profiles")
          .update({
            status: "active",
            ban_reason: null,
            ban_expires_at: null,
          })
          .eq("id", userId)
          .eq("status", "cooling")
          .select("*")
          .single();

        if (!clearError && clearedProfile) {
          nextProfile = clearedProfile;
        }
      }

      if (!nextProfile) {
        setProfile(null);
        setProfileError("Profile not found");
        return null;
      }

      if (postsCountError) {
        setProfileError(postsCountError.message);
      }

      const hydratedProfile = {
        ...nextProfile,
        post_count: postsCountError ? 0 : count ?? 0,
      };

      setProfile(hydratedProfile);
      return hydratedProfile;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load profile";
      setProfile(null);
      setProfileError(message);
      return null;
    }
  }, [supabase]);

  useEffect(() => {
    const getData = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setProfileError(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void getData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void (async () => {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setProfile(null);
            setProfileError(null);
          }

          setIsLoading(false);
        })();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    } else {
      setProfile(null);
      setProfileError(null);
    }
  }, [fetchProfile, user]);

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, profileError, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
