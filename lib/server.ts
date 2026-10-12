import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase environment variables");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export const admin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = getAdmin(); 
    const value = (c as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(c) : value;
  },
});

export async function getUser(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user ?? null;
}