import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

async function fetchIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    return data?.role === "admin";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // loading HANYA true saat pertama kali — tidak pernah balik ke true setelahnya
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const mountedRef = useRef(true);
  // Ref ini memastikan setLoading(false) hanya dipanggil SEKALI
  const initializedRef = useRef(false);
  // Simpan userId terakhir agar tidak re-fetch isAdmin saat TOKEN_REFRESHED
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mountedRef.current) return;

      // ⚠️ KUNCI FIX: TOKEN_REFRESHED terjadi setiap kali pindah tab kembali.
      // Kita TIDAK perlu ubah apapun selain session — user & isAdmin tetap sama.
      if (event === "TOKEN_REFRESHED") {
        setSession(newSession);
        // Pastikan loading sudah false (safety)
        if (!initializedRef.current) {
          initializedRef.current = true;
          setLoading(false);
        }
        return; // ← Berhenti di sini, jangan lanjut ke bawah
      }

      // Untuk event lain (INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, USER_UPDATED):
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // Hanya fetch isAdmin jika userId benar-benar berubah (bukan sekadar refresh)
        if (lastUserIdRef.current !== newSession.user.id) {
          lastUserIdRef.current = newSession.user.id;
          const adminStatus = await fetchIsAdmin(newSession.user.id);
          if (mountedRef.current) {
            setIsAdmin(adminStatus);
          }
        }
      } else {
        lastUserIdRef.current = null;
        setIsAdmin(false);
      }

      // Set loading false HANYA SEKALI saat inisialisasi pertama
      if (!initializedRef.current && mountedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    });

    // Fallback: jika onAuthStateChange tidak terpanggil dalam 3 detik
    const fallbackTimer = setTimeout(() => {
      if (mountedRef.current && !initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    }, 3000);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  const signOut = async () => {
    try {
      // Reset lokal DULU agar UI langsung responsif
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      lastUserIdRef.current = null;
      await supabase.auth.signOut();
    } catch (err) {
      console.error("SignOut error:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}