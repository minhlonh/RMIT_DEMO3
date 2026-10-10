import { createClient } from "@supabase/supabase-js";

export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const FREE_LIMIT = 5;

export const PACKAGES: Record<string, { credits: number; amount: number }> = {
  p20: { credits: 20, amount: 20000 },
  p100: { credits: 100, amount: 80000 },
};

export async function getUser(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user ?? null;
}