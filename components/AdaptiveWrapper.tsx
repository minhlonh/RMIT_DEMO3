"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useFamily } from "@/context/FamilyContext";
import type { Role } from "@/types";

export interface Theme {
  page: string;
  card: string;
  muted: string;
  input: string;
  primary: string;
  secondary: string;
  tabActive: string;
  tabIdle: string;
  heading: string;
  touch: string;
  /** Root font-size in %, so every rem-based Tailwind size scales with the role. */
  rootFontPercent: number;
}

const THEMES: Record<Role, Theme> = {
  grandparent: {
    page: "bg-amber-50 text-stone-900",
    card: "bg-white border-2 border-stone-800 rounded-3xl shadow-md",
    muted: "text-stone-700",
    input: "bg-white border-2 border-stone-800 text-stone-900 placeholder:text-stone-500 rounded-2xl px-4",
    primary: "bg-orange-700 text-white hover:bg-orange-800 font-bold rounded-2xl",
    secondary: "bg-white text-stone-900 border-2 border-stone-800 hover:bg-amber-100 font-semibold rounded-2xl",
    tabActive: "bg-stone-900 text-amber-50 rounded-2xl font-bold",
    tabIdle: "bg-white text-stone-900 border-2 border-stone-800 rounded-2xl font-semibold",
    heading: "font-extrabold tracking-tight",
    touch: "min-h-[56px]",
    rootFontPercent: 125,
  },
  parent: {
    page: "bg-slate-50 text-slate-900",
    card: "bg-white border border-slate-200 rounded-2xl shadow-sm",
    muted: "text-slate-600",
    input: "bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl px-3",
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 font-semibold rounded-xl",
    secondary: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 font-medium rounded-xl",
    tabActive: "bg-indigo-600 text-white rounded-xl font-semibold",
    tabIdle: "bg-white text-slate-700 border border-slate-200 rounded-xl font-medium",
    heading: "font-bold tracking-tight",
    touch: "min-h-[44px]",
    rootFontPercent: 100,
  },
  youth: {
    page: "bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-800 text-white",
    card: "bg-white/10 backdrop-blur border border-white/25 rounded-3xl shadow-lg",
    muted: "text-white/75",
    input: "bg-white/10 border border-white/30 text-white placeholder:text-white/50 rounded-2xl px-4",
    primary: "bg-gradient-to-r from-pink-500 to-yellow-400 text-slate-900 hover:brightness-110 font-extrabold rounded-2xl",
    secondary: "bg-white/10 text-white border border-white/30 hover:bg-white/20 font-semibold rounded-2xl",
    tabActive: "bg-white text-purple-800 rounded-2xl font-extrabold",
    tabIdle: "bg-white/10 text-white border border-white/25 rounded-2xl font-semibold",
    heading: "font-black tracking-tight",
    touch: "min-h-[44px]",
    rootFontPercent: 100,
  },
  child: {
    page: "bg-gradient-to-b from-sky-200 to-emerald-100 text-slate-900",
    card: "bg-white border-4 border-yellow-300 rounded-[2rem] shadow-lg",
    muted: "text-slate-600",
    input: "bg-white border-4 border-sky-300 text-slate-900 placeholder:text-slate-400 rounded-2xl px-4",
    primary: "bg-emerald-500 text-white hover:bg-emerald-600 font-extrabold rounded-full",
    secondary: "bg-white text-slate-800 border-4 border-sky-300 hover:bg-sky-50 font-bold rounded-full",
    tabActive: "bg-emerald-500 text-white rounded-full font-extrabold",
    tabIdle: "bg-white text-slate-700 border-4 border-yellow-300 rounded-full font-bold",
    heading: "font-black tracking-tight",
    touch: "min-h-[52px]",
    rootFontPercent: 112.5,
  },
};

interface ThemeContextValue { role: Role; theme: Theme }
const ThemeContext = createContext<ThemeContextValue>({ role: "parent", theme: THEMES.parent });

export function AdaptiveWrapper({ children }: { children: ReactNode }) {
  const { activeMember } = useFamily();
  const role: Role = activeMember?.role ?? "parent";
  const theme = THEMES[role];

  useEffect(() => {
    const el = document.documentElement;
    el.style.fontSize = `${theme.rootFontPercent}%`;
    el.dataset.role = role;
    return () => { el.style.fontSize = ""; };
  }, [theme.rootFontPercent, role]);

  return (
    <ThemeContext.Provider value={{ role, theme }}>
      <div data-role={role} className={`min-h-screen transition-colors duration-500 ${theme.page}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}