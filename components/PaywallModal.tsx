"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Crown, Gamepad2, Infinity as InfinityIcon, ShieldCheck } from "lucide-react";
import { useFamily } from "@/context/FamilyContext";

export default function PaywallModal() {
  const { paywallOpen, closePaywall, upgrade, t } = useFamily();

  const perks = [
    { icon: InfinityIcon, text: t("paywallPerk1") },
    { icon: Gamepad2, text: t("paywallPerk2") },
    { icon: ShieldCheck, text: t("paywallPerk3") },
  ];

  return (
    <AnimatePresence>
      {paywallOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="paywall-title"
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white text-slate-900 shadow-2xl"
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-6 text-center text-white">
              <motion.div
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ repeat: Infinity, duration: 2.4 }}
                className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/25"
              >
                <Crown className="h-9 w-9" aria-hidden />
              </motion.div>
              <h2 id="paywall-title" className="text-2xl font-extrabold">{t("paywallTitle")}</h2>
            </div>

            <div className="space-y-4 p-6">
              <p className="text-base text-slate-700">{t("paywallBody")}</p>
              <ul className="space-y-3">
                {perks.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm font-medium">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
              <button
                onClick={upgrade}
                className="min-h-[52px] w-full rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-3 text-base font-extrabold text-white shadow-lg transition hover:brightness-110"
              >
                {t("paywallCta")}
              </button>
              <button
                onClick={closePaywall}
                className="min-h-[44px] w-full rounded-2xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
              >
                {t("paywallLater")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}