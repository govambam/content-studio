import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

// ENV.validateEnv has already thrown at boot if these are missing, so the
// client is never null at runtime.
export const supabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey);
