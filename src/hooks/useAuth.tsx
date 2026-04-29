import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { jwtDecode } from "jwt-decode";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: { full_name: string; email: string; avatar_url: string | null; office_location?: string | null } | null;
  role: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, profile: null, role: null, loading: true, signOut: async () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; email: string; avatar_url: string | null; office_location?: string | null } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    console.log(`[Auth] Fetching user data for: ${userId}`);
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("full_name, email, avatar_url, office_location").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (roleRes.data) setRole(roleRes.data.role);
    } catch (error) {
      console.error("[Auth] Error fetching user data:", error);
    }
  }, []);

  const isTokenExpired = (token: string) => {
    try {
      const decoded: any = jwtDecode(token);
      if (!decoded.exp) return false;
      const now = Date.now() / 1000;
      return decoded.exp < now;
    } catch (e) {
      return true;
    }
  };

  useEffect(() => {
    console.log("[Auth] Initializing authentication state...");
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // 1. Check for manual token first
        const manualToken = localStorage.getItem("token");
        console.log("[Auth] Manual token in localStorage:", manualToken ? "Exists" : "Missing");

        if (manualToken && isTokenExpired(manualToken)) {
          console.warn("[Auth] Manual token is expired. Clearing...");
          localStorage.removeItem("token");
        }

        // 2. Get session from Supabase
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[Auth] Error getting session:", error.message);
        }

        if (mounted) {
          if (initialSession) {
            console.log("[Auth] Valid session found on initialization");
            setSession(initialSession);
            setUser(initialSession.user);
            localStorage.setItem("token", initialSession.access_token);
            await fetchUserData(initialSession.user.id);
          } else {
            console.log("[Auth] No session found on initialization");
          }
          // Only set loading to false after we've attempted to get the session
          setLoading(false);
        }
      } catch (err) {
        console.error("[Auth] Critical initialization error:", err);
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[Auth] Auth state changed: ${event}`);
      
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        localStorage.setItem("token", currentSession.access_token);
        await fetchUserData(currentSession.user.id);
      } else {
        // If we are signed out, clear everything
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
           console.log("[Auth] User signed out, clearing storage");
           localStorage.removeItem("token");
           setSession(null);
           setUser(null);
           setProfile(null);
           setRole(null);
        }
      }
      
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signOut = async () => {
    console.log("[Auth] Signing out...");
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("token");
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
    } catch (error) {
      console.error("[Auth] Error during sign out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
