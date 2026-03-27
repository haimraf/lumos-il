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
const PROFILE_ENRICH_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

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
            console.log("[AuthContext] profile loaded from server fallback, source:", source);
          } else {
            console.warn("[AuthContext] server fallback returned no profile");
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

      const nextProfile = profileData;
      const resolvedProfileId = typeof nextProfile.id === "string" ? nextProfile.id : userId;
      const hydratedProfile = {
        ...nextProfile,
        post_count: typeof nextProfile.post_count === "number" ? nextProfile.post_count : 0,
        profile_lookup_source: source,
      };

      if (source === "email" || source === "server-email") {
        console.warn("[AuthContext] Profile resolved by email fallback for legacy account:", userEmail);
      }

      setProfile(hydratedProfile);
      console.log("[AuthContext] Profile successfully hydrated and set. Source:", source);

      void (async () => {
        let enrichedProfile = nextProfile;
        let derivedPostCount = hydratedProfile.post_count;
        let nextError: string | null = null;

        try {
          const { count, error } = await withTimeout<{ count: number | null; error: { message: string } | null }>(
            supabase
              .from("forum_posts")
              .select("id", { count: "exact", head: true })
              .eq("user_id", resolvedProfileId),
            PROFILE_ENRICH_TIMEOUT_MS,
            "Forum post count",
          );

          if (error) {
            nextError = error.message;
          } else {
            derivedPostCount = count ?? 0;
          }
        } catch (error) {
          nextError = error instanceof Error ? error.message : "Failed to load forum post count";
        }

        try {
          if (
            resolvedProfileId === userId &&
            enrichedProfile?.status === "cooling" &&
            enrichedProfile.ban_expires_at &&
            new Date(enrichedProfile.ban_expires_at).getTime() <= Date.now()
          ) {
            const { data: clearedProfile, error: clearError } = await withTimeout<{ data: any; error: { message: string } | null }>(
              supabase
                .from("profiles")
                .update({
                  status: "active",
                  ban_reason: null,
                  ban_expires_at: null,
                })
                .eq("id", userId)
                .eq("status", "cooling")
                .select("*")
                .single(),
              PROFILE_ENRICH_TIMEOUT_MS,
              "Cooling status refresh",
            );

            if (clearError) {
              nextError = nextError ?? clearError.message;
            } else if (clearedProfile) {
              enrichedProfile = clearedProfile;
            }
          }
        } catch (error) {
          nextError = nextError ?? (error instanceof Error ? error.message : "Failed to refresh cooling status");
        }

        setProfile((currentProfile: any) => {
          if (!currentProfile) return currentProfile;
          const currentProfileId = typeof currentProfile.id === "string" ? currentProfile.id : userId;
          if (currentProfileId !== resolvedProfileId) return currentProfile;

          return {
            ...currentProfile,
            ...enrichedProfile,
            post_count: derivedPostCount,
            profile_lookup_source: source,
          };
        });

        if (nextError) {
          setProfileError(nextError);
        }
      })();

      return hydratedProfile;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load profile";
      setProfile(null);
      setProfileError(message);
      return null;
    }
  }, [fetchProfileFromServer, supabase]);

  const applySessionState = useCallback(async (session: Session | null) => {
    setSession(session);
    setUser(session?.user ?? null);

    if (session?.user) {
      await fetchProfile(session.user.id, session.user.email);
    } else {
      setProfile(null);
      setProfileError(null);
    }

    setIsLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    const getData = async () => {
      console.log("[AuthContext] getData starting (init)...");
      setIsLoading(true);
      try {
        console.log("[AuthContext] calling supabase.auth.getSession()...");
        const { data: { session } } = await supabase.auth.getSession();
        console.log("[AuthContext] getSession returned, session exists:", !!session);
        await applySessionState(session);
      } finally {
        setIsLoading(false);
      }
    };

    void getData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        window.setTimeout(() => {
          void applySessionState(session);
        }, 0);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [applySessionState, supabase]);

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
