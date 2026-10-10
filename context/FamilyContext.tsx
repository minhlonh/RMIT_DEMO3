"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { DEFAULT_LANG, dictionaries, isLang, translate } from "@/lib/i18n";
import type { Dictionary, UiKey } from "@/dictionaries/vi";
import type { Family, Lang, Member, MemberInput, Profile, Usage } from "@/types";

export const FREE_LIMIT = 5;

const KEYS = {
  lang: "gds_lang",
  family: "gds_family",
  members: "gds_members",
  active: "gds_active",
  usage: "gds_usage",
  premium: "gds_premium",
} as const;

export function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeLS(key: string, value: unknown): void {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}
function removeLS(key: string): void {
  try { window.localStorage.removeItem(key); } catch { /* ignore */ }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateFamilyCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return (data as T | null) ?? null;
}

const SEED_MEMBERS: MemberInput[] = [
  { name: "Bà Lan", role: "grandparent", avatar_emoji: "👵", birth_year: 1955, nickname: "Bà Ngoại" },
  { name: "Minh", role: "parent", avatar_emoji: "👨", birth_year: 1984, nickname: "Anh Hai" },
  { name: "Mai", role: "youth", avatar_emoji: "🧑‍🎤", birth_year: 2008, nickname: "Mai Mèo" },
  { name: "Bin", role: "child", avatar_emoji: "🧒", birth_year: 2016, nickname: "Bin Bin" },
];

export type ActionResult = { ok: true } | { ok: false; error: "invalidCode" | "genericError" };

interface FamilyContextValue {
  ready: boolean;
  hasBackend: boolean;
  synced: boolean;
  // i18n
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: UiKey, vars?: Record<string, string | number>) => string;
  dict: Dictionary;
  // auth
  user: User | null;
  signInWithEmail: (email: string) => Promise<ActionResult>;
  signOut: () => Promise<void>;
  // family
  family: Family | null;
  members: Member[];
  activeMember: Member | null;
  setActiveMember: (id: string) => void;
  createFamily: (name: string) => Promise<ActionResult>;
  joinFamily: (code: string) => Promise<ActionResult>;
  leaveFamily: () => Promise<void>;
  addMember: (input: MemberInput) => Promise<void>;
  updateMember: (id: string, input: MemberInput) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  // usage / paywall
  usage: Usage;
  consumeCredit: () => boolean;
  paywallOpen: boolean;
  closePaywall: () => void;
  upgrade: () => void;
}

const Ctx = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [synced, setSynced] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [premium, setPremium] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const usageRef = useRef(0);
  const premiumRef = useRef(false);

  // ---- hydrate from localStorage (client only) ----
  useEffect(() => {
    const storedLang = readLS<string>(KEYS.lang, DEFAULT_LANG);
    setLangState(isLang(storedLang) ? storedLang : DEFAULT_LANG);
    setFamily(readLS<Family | null>(KEYS.family, null));
    setMembers(readLS<Member[]>(KEYS.members, []));
    setActiveId(readLS<string | null>(KEYS.active, null));
    const u = readLS<number>(KEYS.usage, 0);
    usageRef.current = u;
    setUsageCount(u);
    const p = readLS<boolean>(KEYS.premium, false);
    premiumRef.current = p;
    setPremium(p);
    setReady(true);
  }, []);

  // ---- persist ----
  useEffect(() => { if (ready) writeLS(KEYS.lang, lang); document.documentElement.lang = lang; }, [ready, lang]);
  useEffect(() => { if (!ready) return; if (family) writeLS(KEYS.family, family); else removeLS(KEYS.family); }, [ready, family]);
  useEffect(() => { if (ready) writeLS(KEYS.members, members); }, [ready, members]);
  useEffect(() => { if (!ready) return; if (activeId) writeLS(KEYS.active, activeId); else removeLS(KEYS.active); }, [ready, activeId]);

  // ---- auth session ----
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    void sb.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = sb.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const loadRemoteFamily = useCallback(async (familyId: string) => {
    const sb = supabase;
    if (!sb) return;
    const [famRes, memRes] = await Promise.all([
      sb.from("families").select("*").eq("id", familyId).maybeSingle(),
      sb.from("family_members").select("*").eq("family_id", familyId).order("created_at", { ascending: true }),
    ]);
    if (famRes.data) {
      setFamily(famRes.data as Family);
      setMembers((memRes.data as Member[] | null) ?? []);
      setSynced(true);
    }
  }, []);

  // ---- load profile (usage, premium, family) once a user exists ----
  const userId = user?.id ?? null;
  useEffect(() => {
    const sb = supabase;
    if (!sb || !userId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (cancelled || !data) return;
      const profile = data as Profile;
      if (profile.usage_count > usageRef.current) {
        usageRef.current = profile.usage_count;
        setUsageCount(profile.usage_count);
        writeLS(KEYS.usage, profile.usage_count);
      }
      if (profile.is_premium) {
        premiumRef.current = true;
        setPremium(true);
      }
      if (profile.family_id) await loadRemoteFamily(profile.family_id);
    })();
    return () => { cancelled = true; };
  }, [userId, loadRemoteFamily]);

  const ensureSession = useCallback(async (): Promise<boolean> => {
    const sb = supabase;
    if (!sb) return false;
    if (user) return true;
    const { data, error } = await sb.auth.signInAnonymously();
    if (error || !data.user) return false;
    setUser(data.user);
    return true;
  }, [user]);

  // ---- i18n ----
  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const t = useCallback(
    (key: UiKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );

  // ---- family ----
  const createFamily = useCallback(async (name: string): Promise<ActionResult> => {
    const clean = name.trim();
    if (!clean) return { ok: false, error: "genericError" };
    const sb = supabase;
    if (sb && (await ensureSession())) {
      const { data, error } = await sb.rpc("create_family", { p_name: clean });
      const fam = firstRow<Family>(data);
      if (!error && fam) {
        const { data: inserted } = await sb
          .from("family_members")
          .insert(SEED_MEMBERS.map((m) => ({ ...m, family_id: fam.id })))
          .select();
        setFamily(fam);
        setMembers((inserted as Member[] | null) ?? []);
        setSynced(true);
        return { ok: true };
      }
    }
    // Local demo fallback
    const fam: Family = { id: crypto.randomUUID(), family_code: generateFamilyCode(), name: clean };
    setFamily(fam);
    setMembers(SEED_MEMBERS.map((m) => ({ ...m, id: crypto.randomUUID(), family_id: fam.id })));
    setSynced(false);
    return { ok: true };
  }, [ensureSession]);

  const joinFamily = useCallback(async (rawCode: string): Promise<ActionResult> => {
    const code = rawCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) return { ok: false, error: "invalidCode" };
    const sb = supabase;
    if (sb && (await ensureSession())) {
      const { data, error } = await sb.rpc("join_family_by_code", { p_code: code });
      const fam = firstRow<Family>(data);
      if (!error && fam) {
        await loadRemoteFamily(fam.id);
        return { ok: true };
      }
    }
    const local = readLS<Family | null>(KEYS.family, null);
    if (local && local.family_code === code) {
      setFamily(local);
      return { ok: true };
    }
    return { ok: false, error: "invalidCode" };
  }, [ensureSession, loadRemoteFamily]);

  const resetFamilyState = useCallback(() => {
    setFamily(null);
    setMembers([]);
    setActiveId(null);
    setSynced(false);
  }, []);

  const leaveFamily = useCallback(async () => {
    const sb = supabase;
    if (sb && synced) await sb.rpc("leave_family");
    resetFamilyState();
  }, [synced, resetFamilyState]);

  // ---- members CRUD ----
  const addMember = useCallback(async (input: MemberInput) => {
    if (!family) return;
    const sb = supabase;
    if (sb && synced) {
      const { data, error } = await sb.from("family_members").insert({ ...input, family_id: family.id }).select().single();
      if (!error && data) setMembers((prev) => [...prev, data as Member]);
      return;
    }
    setMembers((prev) => [...prev, { ...input, id: crypto.randomUUID(), family_id: family.id }]);
  }, [family, synced]);

  const updateMember = useCallback(async (id: string, input: MemberInput) => {
    const sb = supabase;
    if (sb && synced) {
      const { data, error } = await sb.from("family_members").update(input).eq("id", id).select().single();
      if (!error && data) setMembers((prev) => prev.map((m) => (m.id === id ? (data as Member) : m)));
      return;
    }
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...input } : m)));
  }, [synced]);

  const removeMember = useCallback(async (id: string) => {
    const sb = supabase;
    if (sb && synced) {
      const { error } = await sb.from("family_members").delete().eq("id", id);
      if (error) return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  }, [synced]);

  // ---- auth actions ----
  const signInWithEmail = useCallback(async (email: string): Promise<ActionResult> => {
    const sb = supabase;
    if (!sb) return { ok: false, error: "genericError" };
    const redirect = window.location.origin;
    // A guest (anonymous) user links the email to the same account; otherwise send a magic link.
    const { error } = user?.is_anonymous
      ? await sb.auth.updateUser({ email }, { emailRedirectTo: redirect })
      : await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    return error ? { ok: false, error: "genericError" } : { ok: true };
  }, [user]);

  const signOut = useCallback(async () => {
    const sb = supabase;
    if (sb) await sb.auth.signOut();
    setUser(null);
    resetFamilyState();
  }, [resetFamilyState]);

  // ---- usage / freemium ----
  const consumeCredit = useCallback((): boolean => {
    if (premiumRef.current) return true;
    if (usageRef.current >= FREE_LIMIT) {
      setPaywallOpen(true);
      return false;
    }
    const next = usageRef.current + 1;
    usageRef.current = next;
    setUsageCount(next);
    writeLS(KEYS.usage, next);
    const sb = supabase;
    if (sb && user) void sb.rpc("increment_usage");
    return true;
  }, [user]);

  const closePaywall = useCallback(() => setPaywallOpen(false), []);

  const upgrade = useCallback(() => {
    const checkout = process.env.NEXT_PUBLIC_CHECKOUT_URL;
    if (checkout) {
      window.location.href = checkout; // is_premium must be set server-side by your payment webhook
      return;
    }
    premiumRef.current = true; // demo unlock when no checkout is configured
    setPremium(true);
    writeLS(KEYS.premium, true);
    setPaywallOpen(false);
  }, []);

  const activeMember = useMemo(
    () => members.find((m) => m.id === activeId) ?? members[0] ?? null,
    [members, activeId],
  );

  const value = useMemo<FamilyContextValue>(() => ({
    ready, hasBackend: supabase !== null, synced,
    lang, setLang, t, dict: dictionaries[lang],
    user, signInWithEmail, signOut,
    family, members, activeMember, setActiveMember: setActiveId,
    createFamily, joinFamily, leaveFamily, addMember, updateMember, removeMember,
    usage: { count: usageCount, limit: FREE_LIMIT, isPremium: premium },
    consumeCredit, paywallOpen, closePaywall, upgrade,
  }), [
    ready, synced, lang, setLang, t, user, signInWithEmail, signOut, family, members, activeMember,
    createFamily, joinFamily, leaveFamily, addMember, updateMember, removeMember,
    usageCount, premium, consumeCredit, paywallOpen, closePaywall, upgrade,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFamily(): FamilyContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFamily must be used inside <FamilyProvider>");
  return ctx;
}