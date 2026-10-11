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
  activatePremium: () => void;
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
    // Có backend: Premium chỉ tin vào server (profiles.is_premium), không tin localStorage.
    const p = supabase ? false :
