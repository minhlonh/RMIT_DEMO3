"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, BellRing, Check, HeartPulse, Landmark, Pill, Plus, ShieldAlert, Trash2, Users, Video, X,
} from "lucide-react";
import { readLS, useFamily, writeLS } from "@/context/FamilyContext";
import { useTheme } from "@/components/AdaptiveWrapper";
import type { Frequency, Reminder, Scam } from "@/types";

const REMINDERS_KEY = "gds_reminders";
const SCAM_ICONS: Record<Scam["id"], typeof Video> = { deepfake: Video, bank: Landmark, police: ShieldAlert };

const hhmm = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function beep(): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.75);
    osc.onended = () => void ctx.close();
  } catch { /* audio not available */ }
}

export default function ScamAlertsAndReminders() {
  const { t, dict, family, members, activeMember, consumeCredit } = useFamily();
  const { theme } = useTheme();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("08:00");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [memberId, setMemberId] = useState("");
  const [nowHM, setNowHM] = useState(hhmm());
  const rung = useRef<Set<string>>(new Set());

  useEffect(() => { setReminders(readLS<Reminder[]>(REMINDERS_KEY, [])); setLoaded(true); }, []);
  useEffect(() => { if (loaded) writeLS(REMINDERS_KEY, reminders); }, [loaded, reminders]);
  useEffect(() => {
    const id = window.setInterval(() => setNowHM(hhmm()), 20000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    reminders.forEach((r) => {
      if (!r.is_completed && r.time === nowHM && !rung.current.has(`${r.id}-${nowHM}`)) {
        rung.current.add(`${r.id}-${nowHM}`);
        beep();
      }
    });
  }, [reminders, nowHM]);

  const familyReminders = useMemo(
    () => reminders.filter((r) => r.family_id === family?.id).sort((a, b) => a.time.localeCompare(b.time)),
    [reminders, family],
  );

  const add = (text: string, at: string, freq: Frequency, mid: string | null) => {
    if (!family || !text.trim()) return;
    if (!consumeCredit()) return; // creating a reminder costs one free action
    setReminders((prev) => [
      ...prev,
      { id: crypto.randomUUID(), family_id: family.id, member_id: mid, title: text.trim(), time: at, frequency: freq, is_completed: false },
    ]);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    add(title, time, frequency, memberId || activeMember?.id || null);
    setTitle("");
  };

  const toggle = (id: string) =>
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, is_completed: !r.is_completed } : r)));
  const remove = (id: string) => setReminders((prev) => prev.filter((r) => r.id !== id));

  const presets = [
    { label: t("presetMedication"), at: "08:00", icon: Pill },
    { label: t("presetBp"), at: "09:00", icon: HeartPulse },
    { label: t("presetGathering"), at: "19:30", icon: Users },
  ];

  return (
    <div className="space-y-10">
      {/* ---------- SCAM WARNINGS ---------- */}
      <section className="space-y-4">
        <header>
          <h2 className={`text-2xl ${theme.heading}`}>{t("scamTitle")}</h2>
          <p className={theme.muted}>{t("scamSubtitle")}</p>
        </header>
        <div className="grid gap-4 lg:grid-cols-3">
          {dict.scams.map((scam) => {
            const Icon = SCAM_ICONS[scam.id];
            return (
              <article key={scam.id} className={`${theme.card} space-y-4 p-5`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <span className="inline-block rounded-full bg-red-600 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                      {scam.severity === "high" ? t("severityHigh") : t("severityMedium")}
                    </span>
                    <h3 className={`mt-1 text-lg leading-snug ${theme.heading}`}>{scam.title}</h3>
                  </div>
                </div>
                <p className={theme.muted}>{scam.description}</p>
                <div className="rounded-2xl bg-emerald-500/15 p-3">
                  <p className="mb-1 font-bold text-emerald-700 dark:text-emerald-300">✅ {t("doLabel")}</p>
                  <ul className="space-y-1 text-sm">
                    {scam.dos.map((d) => (
                      <li key={d} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />{d}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl bg-red-500/15 p-3">
                  <p className="mb-1 font-bold text-red-700 dark:text-red-300">⛔ {t("dontLabel")}</p>
                  <ul className="space-y-1 text-sm">
                    {scam.donts.map((d) => (
                      <li key={d} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />{d}</li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ---------- REMINDERS ---------- */}
      <section className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={`text-2xl ${theme.heading}`}>{t("remindersTitle")}</h2>
          <button onClick={beep} className={`${theme.secondary} ${theme.touch} flex items-center gap-2 px-4`}>
            <Bell className="h-5 w-5" aria-hidden /> {t("testSound")}
          </button>
        </header>

        <div className={`${theme.card} space-y-4 p-5`}>
          <div>
            <p className="mb-2 text-sm font-bold">{t("quickAdd")}</p>
            <div className="flex flex-wrap gap-2">
              {presets.map(({ label, at, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => add(label, at, "daily", activeMember?.id ?? null)}
                  className={`${theme.secondary} ${theme.touch} flex items-center gap-2 px-4`}
                >
                  <Icon className="h-5 w-5" aria-hidden /> {label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <input
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={t("reminderTitle")} aria-label={t("reminderTitle")}
              className={`${theme.input} ${theme.touch}`} required
            />
            <input
              type="time" value={time} onChange={(e) => setTime(e.target.value)}
              aria-label={t("time")} className={`${theme.input} ${theme.touch}`} required
            />
            <select
              value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}
              aria-label={t("frequency")} className={`${theme.input} ${theme.touch}`}
            >
              <option value="daily" className="text-slate-900">{t("freqDaily")}</option>
              <option value="weekly" className="text-slate-900">{t("freqWeekly")}</option>
            </select>
            <select
              value={memberId} onChange={(e) => setMemberId(e.target.value)}
              aria-label={t("forMember")} className={`${theme.input} ${theme.touch}`}
            >
              <option value="" className="text-slate-900">{t("forMember")}: {activeMember?.name ?? "—"}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id} className="text-slate-900">{m.avatar_emoji} {m.name}</option>
              ))}
            </select>
            <button type="submit" className={`${theme.primary} ${theme.touch} flex items-center justify-center gap-2 px-5`}>
              <Plus className="h-5 w-5" aria-hidden /> {t("addReminder")}
            </button>
          </form>
        </div>

        {familyReminders.length === 0 ? (
          <p className={`${theme.card} p-6 text-center ${theme.muted}`}>{t("noReminders")}</p>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {familyReminders.map((r) => {
                const owner = members.find((m) => m.id === r.member_id);
                const isDue = !r.is_completed && r.time <= nowHM;
                return (
                  <motion.li
                    key={r.id} layout
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className={`${theme.card} flex items-center gap-3 p-4 ${r.is_completed ? "opacity-60" : ""}`}
                  >
                    <button
                      onClick={() => toggle(r.id)}
                      aria-pressed={r.is_completed}
                      aria-label={r.title}
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${
                        r.is_completed ? "border-emerald-600 bg-emerald-600 text-white" : "border-current"
                      }`}
                    >
                      {r.is_completed && <Check className="h-6 w-6" aria-hidden />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-lg font-bold ${r.is_completed ? "line-through" : ""}`}>{r.title}</p>
                      <p className={`text-sm ${theme.muted}`}>
                        {r.time} · {r.frequency === "daily" ? t("freqDaily") : t("freqWeekly")}
                        {owner ? ` · ${owner.avatar_emoji} ${owner.name}` : ""}
                      </p>
                    </div>
                    {isDue && (
                      <span className="flex animate-pulse items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-sm font-bold text-white">
                        <BellRing className="h-4 w-4" aria-hidden /> {t("due")}
                      </span>
                    )}
                    <button onClick={() => remove(r.id)} aria-label={t("remove")} className={`${theme.secondary} flex h-11 w-11 items-center justify-center`}>
                      <Trash2 className="h-5 w-5" aria-hidden />
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </div>
  );
}