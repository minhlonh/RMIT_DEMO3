"use client";

import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Search, Volume2, X } from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { useTheme } from "@/components/AdaptiveWrapper";
import { LANGS } from "@/lib/i18n";
import { SLANG } from "@/dictionaries/slang";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().trim();

export default function GenZDictionary() {
  const { t, lang, consumeCredit } = useFamily();
  const { theme } = useTheme();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return SLANG;
    return SLANG.filter(
      (e) => normalize(e.term).includes(q) || normalize(e[lang].meaning).includes(q),
    );
  }, [query, lang]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) { setQuery(""); return; }
    if (!consumeCredit()) return; // each search costs one free action
    setQuery(input);
  };

  const clear = () => { setInput(""); setQuery(""); };

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANGS.find((l) => l.code === lang)?.speech ?? "vi-VN";
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  };

  return (
    <section className="space-y-5">
      <header>
        <h2 className={`text-2xl ${theme.heading}`}>{t("dictTitle")}</h2>
        <p className={theme.muted}>{t("dictSubtitle")}</p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 opacity-60" aria-hidden />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("search")}
            className={`${theme.input} ${theme.touch} w-full pl-12 pr-4 text-lg`}
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className={`${theme.primary} ${theme.touch} px-6`}>{t("search")}</button>
          {(query || input) && (
            <button type="button" onClick={clear} aria-label={t("clear")} className={`${theme.secondary} ${theme.touch} px-4`}>
              <X className="h-5 w-5" aria-hidden />
            </button>
          )}
        </div>
      </form>

      {results.length === 0 ? (
        <p className={`${theme.card} p-6 text-center ${theme.muted}`}>{t("noResults")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((entry, i) => {
            const text = entry[lang];
            return (
              <motion.article
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.4) }}
                className={`${theme.card} space-y-3 p-5`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className={`text-xl ${theme.heading}`}>{entry.term}</h3>
                  <button
                    onClick={() => speak(`${entry.term}. ${text.meaning}`)}
                    aria-label={t("listen")}
                    className={`${theme.secondary} flex h-11 w-11 shrink-0 items-center justify-center`}
                  >
                    <Volume2 className="h-5 w-5" aria-hidden />
                  </button>
                </div>
                <p><span className="font-bold">{t("meaning")}: </span>{text.meaning}</p>
                <p className={theme.muted}><span className="font-bold">{t("example")}: </span>“{text.example}”</p>
                <p className="rounded-xl bg-amber-400/20 p-3 text-sm">
                  <span className="font-bold">💡 {t("tip")}: </span>{text.tip}
                </p>
              </motion.article>
            );
          })}
        </div>
      )}
    </section>
  );
}