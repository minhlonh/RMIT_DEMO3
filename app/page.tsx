"use client";

import { useState, type FormEvent } from "react";
import { Crown, Gamepad2, Globe, Heart, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { AdaptiveWrapper, useTheme } from "@/components/AdaptiveWrapper";
import { FamilyProvider, useFamily } from "@/context/FamilyContext";
import PaywallModal from "@/components/PaywallModal";
import GenZDictionary from "@/components/GenZDictionary";
import ScamAlertsAndReminders from "@/components/ScamAlertsAndReminders";
import FamilyGames from "@/components/games/FamilyGames";
import { FamilySetup, MemberManager } from "@/components/FamilySetup";
import { LANGS, isLang } from "@/lib/i18n";
import type { UiKey } from "@/dictionaries/vi";

type TabId = "dictionary" | "safety" | "games";
const TABS: { id: TabId; labelKey: UiKey; icon: typeof Sparkles }[] = [
  { id: "dictionary", labelKey: "tabDictionary", icon: Sparkles },
  { id: "safety", labelKey: "tabSafety", icon: ShieldCheck },
  { id: "games", labelKey: "tabGames", icon: Gamepad2 },
];

function AuthBar() {
  const { t, hasBackend, user, signInWithEmail, signOut } = useFamily();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  if (!hasBackend) return <span className={`text-xs ${theme.muted}`}>{t("demoMode")}</span>;

  if (user && !user.is_anonymous) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="max-w-[180px] truncate">{user.email}</span>
        <button onClick={() => void signOut()} aria-label={t("signOut")} className={`${theme.secondary} flex h-10 w-10 items-center justify-center`}>
          <LogOut className="h-4 w-4" aria-hidden />
        </button>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await signInWithEmail(email);
    setStatus(res.ok ? "sent" : "error");
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder={t("emailPlaceholder")} aria-label={t("emailPlaceholder")}
        className={`${theme.input} h-10 w-44 text-sm`}
      />
      <button type="submit" className={`${theme.secondary} h-10 px-3 text-sm`}>{t("sendLink")}</button>
      {status === "sent" && <span className="text-xs font-semibold">{t("linkSent")}</span>}
      {status === "error" && <span className="text-xs font-semibold text-red-500">{t("genericError")}</span>}
    </form>
  );
}

function Dashboard() {
  const { ready, t, lang, setLang, family, activeMember, usage } = useFamily();
  const { theme } = useTheme();
  const [tab, setTab] = useState<TabId>("dictionary");

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-5xl" aria-busy="true">🏡</div>;
  }

  const creditsLeft = Math.max(0, usage.limit - usage.count);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-black/10 bg-inherit/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500 text-white">
              <Heart className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h1 className={`text-xl leading-tight ${theme.heading}`}>{t("appName")}</h1>
              <p className={`hidden text-xs sm:block ${theme.muted}`}>{t("tagline")}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AuthBar />
            <span
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold ${
                usage.isPremium ? "bg-amber-400 text-slate-900" : creditsLeft === 0 ? "bg-red-600 text-white" : "bg-black/10"
              }`}
            >
              {usage.isPremium && <Crown className="h-4 w-4" aria-hidden />}
              {usage.isPremium ? t("premiumBadge") : t("creditsLeft", { n: creditsLeft })}
            </span>
            <label className="flex items-center gap-2">
              <Globe className="h-5 w-5" aria-hidden />
              <span className="sr-only">{t("language")}</span>
              <select
                value={lang}
                onChange={(e) => { if (isLang(e.target.value)) setLang(e.target.value); }}
                className={`${theme.input} h-11 pr-2`}
              >
                {LANGS.map((l) => <option key={l.code} value={l.code} className="text-slate-900">{l.label}</option>)}
              </select>
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {!family ? (
          <FamilySetup />
        ) : (
          <>
            <MemberManager />

            <nav role="tablist" className="flex flex-wrap gap-2" aria-label={activeMember?.name}>
              {TABS.map(({ id, labelKey, icon: Icon }) => (
                <button
                  key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                  className={`${tab === id ? theme.tabActive : theme.tabIdle} ${theme.touch} flex items-center gap-2 px-5`}
                >
                  <Icon className="h-5 w-5" aria-hidden /> {t(labelKey)}
                </button>
              ))}
            </nav>

            <div role="tabpanel">
              {tab === "dictionary" && <GenZDictionary />}
              {tab === "safety" && <ScamAlertsAndReminders />}
              {tab === "games" && <FamilyGames />}
            </div>
          </>
        )}
      </main>

      <PaywallModal />
    </>
  );
}

export default function Page() {
  return (
    <FamilyProvider>
      <AdaptiveWrapper>
        <Dashboard />
      </AdaptiveWrapper>
    </FamilyProvider>
  );
}
