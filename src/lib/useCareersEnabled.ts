"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Nav and Footer both need this flag on every page. Fetch it once per page
// load and share the result, instead of two requests on every navigation.
let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

function load(): Promise<boolean> {
  inflight ??= Promise.resolve(
    createClient()
      .from("site_settings")
      .select("careers_enabled")
      .limit(1)
      .maybeSingle()
  ).then(({ data }) => (cached = data?.careers_enabled === true));
  return inflight;
}

export function useCareersEnabled(): boolean {
  const [enabled, setEnabled] = useState(cached ?? false);
  useEffect(() => {
    let active = true;
    load().then((v) => active && setEnabled(v));
    return () => {
      active = false;
    };
  }, []);
  return enabled;
}
