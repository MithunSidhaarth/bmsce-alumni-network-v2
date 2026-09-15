"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

// Trimmed to just what Nav/AuthMenu render: name/avatar/role for the menu,
// user_type/verification_status for the "Student" / "Verified alum" /
// "Not approved" / "Pending review" badge. Not the full Profile row.
export type AuthProfile = Pick<
  Profile,
  "full_name" | "photo_url" | "role" | "user_type" | "verification_status"
>;

type AuthContextValue = {
  user: User | null;
  signedIn: boolean;
  profile: AuthProfile | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  signedIn: false,
  profile: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

// Single source of truth for auth state: one getUser() call and one
// onAuthStateChange subscription for the whole app, shared via context so
// Nav/AuthMenu (and anything else) don't each fetch their own copy.
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const load = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!active) return;

      if (!authUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(authUser);
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name, photo_url, role, user_type, verification_status")
        .eq("id", authUser.id)
        .single<AuthProfile>();
      if (!active) return;
      setProfile(profileRow ?? null);
      setLoading(false);
    };

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, signedIn: Boolean(user), profile, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}
