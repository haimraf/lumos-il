"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { fetchProfileWithFallback } from "@/lib/profileAccess";

type ProfileLookupSource = "id" | "email" | "none" | "server" | "server-id" | "server-email";

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

  const fetchProfileFromServer = useCallback(async (): Promise<{ profile: any; source: ProfileLookupSource } | null> => {
    const response = await fetch("/api/auth/profile", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.profile) {
      return null;
    }

    return {
      profile: payload.profile,
      source: typeof payload.source === "string" ? payload.source as ProfileLookupSource : "server",
    };
  }, []);

  const fetchProfile = useCallback(async (userId: string, userEmail?: string | null) => {
    try {
      setProfileError(null);

      const initialResult = await fetchProfileWithFallback<any>(
        supabase,
        { id: userId, email: userEmail },
        "*",
      );
      let profileData = initialResult.data;
      let source: ProfileLookupSource = initialResult.source;
      let profileQueryError = initialResult.error;

      if (!profileData && !initialResult.error) {
        try {
          const serverResult = await fetchProfileFromServer();
          if (serverResult?.profile) {
            profileData = serverResult.profile;
            source = serverResult.source;
            profileQueryError = null;
          }
        } catch (serverError) {
          console.warn("[AuthContext] Server profile fallback failed:", serverError);
        }
      }

      if (profileQueryError || !profileData) {
        setProfile(null);
        setProfileError(profileQueryError instanceof Error ? profileQueryError.message : "Profile not found");
        return null;
      }

      let nextProfile = profileData;
      const resolvedProfileId = typeof nextProfile.id === "string" ? nextProfile.id : userId;

      const { count, error: postsCountError } = await supabase
        .from("forum_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", resolvedProfileId);

      if (
        resolvedProfileId === userId &&
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
        profile_lookup_source: source,
      };

      if (source === "email" || source === "server-email") {
        console.warn("[AuthContext] Profile resolved by email fallback for legacy account:", userEmail);
      }

      setProfile(hydratedProfile);
      return hydratedProfile;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load profile";
      setProfile(null);
      setProfileError(message);
      return null;
    }
  }, [fetchProfileFromServer, supabase]);

  useEffect(() => {
    const getData = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email);
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
            await fetchProfile(session.user.id, session.user.email);
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
      await fetchProfile(user.id, user.email);
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
