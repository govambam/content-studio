// Fail loudly at boot when Vite env vars are missing. The trap this
// closes is pushing a build with the wrong `VITE_SUPABASE_*` names and
// only finding out when realtime silently stops working.
export interface AppEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiUrl: string;
  releaseSha: string | null;
}

export function validateEnv(): AppEnv {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const apiUrl = import.meta.env.VITE_API_URL ?? "/api";
  const releaseSha = (import.meta.env.VITE_RELEASE_SHA ?? null) as
    | string
    | null;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("VITE_SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("VITE_SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    // Throwing synchronously at module init is intentional: the app
    // cannot function without these, and a visible crash is better than
    // a silent realtime-subscriptions-never-fire surprise in prod.
    throw new Error(
      `Missing required env vars: ${missing.join(", ")}. ` +
        `Set them in the Railway web service before deploying.`
    );
  }

  return {
    supabaseUrl: supabaseUrl!,
    supabaseAnonKey: supabaseAnonKey!,
    apiUrl,
    releaseSha,
  };
}

export const ENV: AppEnv = validateEnv();
