import { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { jwtDecode } from "jwt-decode";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: { full_name: string; email: string; avatar_url: string | null; office_location?: string | null } | null;
  role: string | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, 
  session: null, 
  profile: null, 
  role: null, 
  loading: true, 
  profileLoading: false,
  signOut: async () => {},
  refreshProfile: async () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; email: string; avatar_url: string | null; office_location?: string | null } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const initialized = useRef(false);

  const fetchUserData = useCallback(async (userId: string) => {
    if (!userId) return;
    
    console.log(`[Auth] Fetching user profile data for: ${userId}`);
    setProfileLoading(true);
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("full_name, email, avatar_url, office_location").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      ]);
      
      if (profileRes.error) console.error("[Auth] Profile fetch error:", profileRes.error);
      if (roleRes.error) console.error("[Auth] Role fetch error:", roleRes.error);

      if (profileRes.data) {
        console.log("[Auth] Profile data loaded:", profileRes.data.full_name);
        setProfile(profileRes.data);
      }
      if (roleRes.data) {
        console.log("[Auth] User role loaded:", roleRes.data.role);
        setRole(roleRes.data.role);
      }
    } catch (error) {
      console.error("[Auth] Critical error fetching user data:", error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  }, [user, fetchUserData]);

  const isTokenExpired = (token: string) => {
    try {
      const decoded: any = jwtDecode(token);
      if (!decoded.exp) return false;
      const now = Math.floor(Date.now() / 1000);
      const buffer = 10; // 10 second buffer
      return decoded.exp < (now + buffer);
    } catch (e) {
      return true;
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    console.log("[Auth] Initializing session...");
    
    const initializeAuth = async () => {
      try {
        // 1. Check for manual token in localStorage for persistence
        const manualToken = localStorage.getItem("token");
        if (manualToken) {
          if (isTokenExpired(manualToken)) {
            console.warn("[Auth] Stored token expired, clearing...");
            localStorage.removeItem("token");
          } else {
            console.log("[Auth] Found valid manual token, awaiting Supabase session sync...");
          }
        }

        // 2. Get session from Supabase
        // Note: getSession() is fast as it primarily checks local storage managed by Supabase client
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[Auth] getSession error:", error.message);
        }

        if (initialSession) {
          console.log("[Auth] Active session found:", initialSession.user.email);
          setSession(initialSession);
          setUser(initialSession.user);
          localStorage.setItem("token", initialSession.access_token);
          
          // CRITICAL: Fetch profile data in the background - DO NOT AWAIT
          fetchUserData(initialSession.user.id);
        } else {
          console.log("[Auth] No active session found on init");
          // If we had a manual token but Supabase says no session, it might be a sync issue or browser clearing
          if (manualToken && !isTokenExpired(manualToken)) {
            console.warn("[Auth] Manual token exists but Supabase session is null. Device might be clearing storage.");
          }
        }
      } catch (err) {
        console.error("[Auth] Unexpected initialization error:", err);
      } finally {
        // Always set loading to false so the UI can render
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[Auth] Event triggered: ${event}`);
      
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        localStorage.setItem("token", currentSession.access_token);
        
        // Fetch/refresh profile data on login or token refresh
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          fetchUserData(currentSession.user.id);
        }
      } else {
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
           console.log("[Auth] User signed out or deleted, clearing local state");
           localStorage.removeItem("token");
           setSession(null);
           setUser(null);
           setProfile(null);
           setRole(null);
        }
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signOut = async () => {
    console.log("[Auth] Manual sign out initiated");
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("token");
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
    } catch (error) {
      console.error("[Auth] Sign out error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      role, 
      loading, 
      profileLoading, 
      signOut, 
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

