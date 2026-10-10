"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Brain, Dices, RotateCcw, Trophy, Puzzle } from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { useTheme } from "@/components/AdaptiveWrapper";
import { fmt, ROLE_KEY } from "@/lib/i18n";
import type { Dictionary } from "@/dictionaries/vi";
import type { Game, GameId, MemoryCard, Member, QuizQuestion } from "@/types";

const GAMES: Game[] = [
  { id: "quiz", titleKey: "gameQuiz" },
  { id: "memory", titleKey: "gameMemory" },
  { id: "wheel", titleKey: "gameWheel" },
];
const GAME_ICONS: Record<GameId, typeof Brain> = { quiz: Brain, memory: Puzzle, wheel: Dices };

const celebrate = () =>
  confetti({ particleCount: 160, spread: 85, startVelocity: 40, origin: { y: 0.6 } });

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* =========================================================
   GAME 1 - FAMILY TRIVIA QUIZ
   ========================================================= */
const PAD_NAMES = ["Minh", "Lan", "Hùng", "Mai", "Tú", "Hoa"];

function buildQuiz(members: Member[], dict: Dictionary): QuizQuestion[] {
  const names = members.map((m) => m.name);
  const nameOptions = (correct: string) => {
    const pool = shuffle([
      ...names.filter((n) => n !== correct),
      ...PAD_NAMES.filter((n) => !names.includes(n)),
    ]);
    return shuffle([correct, ...pool.slice(0, 3)]);
  };
  const pool: QuizQuestion[] = [];
  members.forEach((m) => {
    if (m.birth_year) {
      pool.push({ id: `b-${m.id}`, prompt: fmt(dict.ui.qBirth, { year: m.birth_year }), options: nameOptions(m.name), answer: m.name });
    }
    if (m.nickname) {
      pool.push({ id: `n-${m.id}`, prompt: fmt(dict.ui.qNick, { nick: m.nickname }), options: nameOptions(m.name), answer: m.name });
    }
    pool.push({ id: `a-${m.id}`, prompt: fmt(dict.ui.qAvatar, { emoji: m.avatar_emoji }), options: nameOptions(m.name), answer: m.name });
    pool.push({
      id: `r-${m.id}`,
      prompt: fmt(dict.ui.qRole, { name: m.name }),
      options: shuffle(Object.values(ROLE_KEY).map((k) => dict.ui[k])),
      answer: dict.ui[ROLE_KEY[m.role]],
    });
  });
  return shuffle(pool).slice(0, 5);
}

function QuizGame() {
  const { members, dict, t, consumeCredit } = useFamily();
  const { theme } = useTheme();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const start = () => {
    if (!consumeCredit()) return;
    setQuestions(buildQuiz(members, dict));
    setIndex(0); setPicked(null); setScore(0); setFinished(false);
  };

  const choose = (option: string) => {
    if (picked !== null) return;
    setPicked(option);
    if (option === questions[index].answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      if (score === questions.length) celebrate();
    } else {
      setIndex((i) => i + 1);
      setPicked(null);
    }
  };

  if (members.length === 0) return <p className={theme.muted}>{t("needMembers")}</p>;

  if (questions.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-6xl" aria-hidden>🧠</p>
        <button onClick={start} className={`${theme.primary} ${theme.touch} px-8 text-lg`}>{t("start")}</button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="space-y-4 text-center">
        <Trophy className="mx-auto h-14 w-14 text-amber-500" aria-hidden />
        <p className="text-2xl font-extrabold">{t("quizResult", { score, total: questions.length })}</p>
        <button onClick={start} className={`${theme.primary} ${theme.touch} inline-flex items-center gap-2 px-8`}>
          <RotateCcw className="h-5 w-5" aria-hidden /> {t("playAgain")}
        </button>
      </div>
    );
  }

  const q = questions[index];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm font-bold">
        <span>{t("quizProgress", { i: index + 1, n: questions.length })}</span>
        <span>{t("score")}: {score}</span>
      </div>
      <h3 className={`text-2xl ${theme.heading}`}>{q.prompt}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {q.options.map((opt) => {
          const isAnswer = opt === q.answer;
          const isPicked = opt === picked;
          const state =
            picked === null ? theme.secondary
            : isAnswer ? "border-2 border-emerald-600 bg-emerald-500 font-bold text-white rounded-2xl"
            : isPicked ? "border-2 border-red-600 bg-red-500 font-bold text-white rounded-2xl"
            : `${theme.secondary} opacity-50`;
          return (
            <motion.button
              key={opt} whileTap={{ scale: 0.97 }} onClick={() => choose(opt)}
              disabled={picked !== null}
              className={`${state} ${theme.touch} px-4 py-3 text-lg`}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg font-bold">
            {picked === q.answer ? t("quizCorrect") : t("quizWrong", { answer: q.answer })}
          </p>
          <button onClick={next} className={`${theme.primary} ${theme.touch} px-6`}>
            {index + 1 >= questions.length ? t("quizFinish") : t("quizNext")}
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   GAME 2 - MEMORY FLIP CARD
   ========================================================= */
const PAIRS = 6;
const PAD_EMOJI = ["🏡", "🍲", "🎂", "🌸", "🎈", "🧧"];

function MemoryGame() {
  const { members, t, consumeCredit } = useFamily();
  const { theme } = useTheme();
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [won, setWon] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const start = () => {
    if (!consumeCredit()) return;
    const faces = Array.from(new Set(members.map((m) => m.avatar_emoji))).slice(0, PAIRS);
    for (const e of PAD_EMOJI) {
      if (faces.length >= PAIRS) break;
      if (!faces.includes(e)) faces.push(e);
    }
    setCards(shuffle([...faces, ...faces]).map((emoji, id) => ({ id, emoji, flipped: false, matched: false })));
    setMoves(0); setLock(false); setWon(false);
  };

  const flip = (i: number) => {
    if (lock || cards[i].flipped || cards[i].matched) return;
    const next = cards.map((c, k) => (k === i ? { ...c, flipped: true } : c));
    const open = next.map((c, k) => ({ c, k })).filter((x) => x.c.flipped && !x.c.matched);
    if (open.length < 2) { setCards(next); return; }

    setMoves((m) => m + 1);
    const [a, b] = open;
    if (a.c.emoji === b.c.emoji) {
      setCards(next.map((c, k) => (k === a.k || k === b.k ? { ...c, matched: true } : c)));
    } else {
      setCards(next);
      setLock(true);
      timer.current = window.setTimeout(() => {
        setCards((cs) => cs.map((c, k) => (k === a.k || k === b.k ? { ...c, flipped: false } : c)));
        setLock(false);
      }, 800);
    }
  };

  useEffect(() => {
    if (cards.length > 0 && !won && cards.every((c) => c.matched)) {
      setWon(true);
      celebrate();
    }
  }, [cards, won]);

  const matchedPairs = cards.filter((c) => c.matched).length / 2;
  const score = Math.max(0, matchedPairs * 100 - Math.max(0, moves - matchedPairs) * 10);

  if (cards.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-6xl" aria-hidden>🃏</p>
        <p className={theme.muted}>{t("memoryHint")}</p>
        <button onClick={start} className={`${theme.primary} ${theme.touch} px-8 text-lg`}>{t("start")}</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm font-bold">
        <span>{t("moves")}: {moves}</span>
        <span>{t("score")}: {score}</span>
      </div>
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-3">
        {cards.map((card, i) => {
          const show = card.flipped || card.matched;
          return (
            <motion.button
              key={card.id} whileTap={{ scale: 0.92 }}
              animate={{ scale: card.matched ? 1.04 : 1 }}
              onClick={() => flip(i)}
              aria-label={show ? card.emoji : "?"}
              className={`flex aspect-square items-center justify-center rounded-2xl text-4xl shadow-md transition-colors ${
                card.matched ? "bg-emerald-200 text-slate-900"
                : show ? "bg-white text-slate-900"
                : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
              }`}
            >
              {show ? card.emoji : "❓"}
            </motion.button>
          );
        })}
      </div>
      {won && (
        <div className="space-y-3 text-center">
          <p className="text-xl font-extrabold">{t("memoryWin", { pairs: PAIRS, moves })}</p>
          <button onClick={start} className={`${theme.primary} ${theme.touch} inline-flex items-center gap-2 px-8`}>
            <RotateCcw className="h-5 w-5" aria-hidden /> {t("playAgain")}
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   GAME 3 - WHEEL OF CHORES (SVG)
   ========================================================= */
const WHEEL_COLORS = ["#f97316", "#8b5cf6", "#10b981", "#ec4899", "#0ea5e9", "#eab308", "#ef4444", "#14b8a6"];

const polar = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: 200 + r * Math.sin(rad), y: 200 - r * Math.cos(rad) };
};
const slicePath = (i: number, seg: number) => {
  const a = polar(i * seg, 190);
  const b = polar((i + 1) * seg, 190);
  return `M200 200 L${a.x} ${a.y} A190 190 0 ${seg > 180 ? 1 : 0} 1 ${b.x} ${b.y} Z`;
};

function WheelGame() {
  const { members, dict, t, consumeCredit } = useFamily();
  const { theme } = useTheme();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<{ idx: number; chore: string } | null>(null);
  const pending = useRef<{ idx: number; chore: string } | null>(null);

  const n = members.length;
  const seg = useMemo(() => (n > 0 ? 360 / n : 360), [n]);

  if (n < 2) return <p className={theme.muted}>{t("needMembers")}</p>;

  const spin = () => {
    if (spinning) return;
    if (!consumeCredit()) return;
    const idx = Math.floor(Math.random() * n);
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const center = idx * seg + seg / 2 + jitter;
    const delta = (360 - ((rotation + center) % 360)) % 360;
    pending.current = { idx, chore: dict.chores[Math.floor(Math.random() * dict.chores.length)] };
    setWinner(null);
    setSpinning(true);
    setRotation(rotation + 360 * 5 + delta);
  };

  const onDone = () => {
    if (!pending.current) return;
    setWinner(pending.current);
    pending.current = null;
    setSpinning(false);
    celebrate();
  };

  const winnerMember = winner ? members[winner.idx] : null;

  return (
    <div className="space-y-5 text-center">
      <p className={theme.muted}>{t("wheelHint")}</p>

      <div className="relative mx-auto w-full max-w-sm">
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-2 text-4xl drop-shadow" aria-hidden>▼</div>
        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 4.5, ease: [0.17, 0.67, 0.12, 1] }}
          onAnimationComplete={onDone}
        >
          <svg viewBox="0 0 400 400" className="w-full" role="img" aria-label={t("gameWheel")}>
            {members.map((m, i) => {
              const mid = i * seg + seg / 2;
              return (
                <g key={m.id}>
                  <path d={slicePath(i, seg)} fill={WHEEL_COLORS[i % WHEEL_COLORS.length]} stroke="#fff" strokeWidth="3" />
                  <g transform={`rotate(${mid} 200 200)`}>
                    <text x="200" y="78" textAnchor="middle" fontSize="30">{m.avatar_emoji}</text>
                    <text x="200" y="108" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff">
                      {m.name.length > 9 ? `${m.name.slice(0, 8)}…` : m.name}
                    </text>
                  </g>
                </g>
              );
            })}
            <circle cx="200" cy="200" r="26" fill="#fff" stroke="#334155" strokeWidth="4" />
          </svg>
        </motion.div>
      </div>

      <button onClick={spin} disabled={spinning} className={`${theme.primary} ${theme.touch} px-10 text-lg disabled:opacity-60`}>
        {spinning ? t("spinning") : t("spin")}
      </button>

      {winner && winnerMember && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`${theme.card} mx-auto max-w-md space-y-1 p-5`}>
          <p className="text-5xl" aria-hidden>{winnerMember.avatar_emoji}</p>
          <p className={`text-2xl ${theme.heading}`}>{t("winnerIs", { name: winnerMember.name })}</p>
          <p className={`text-lg ${theme.muted}`}>{t("chorePrefix", { chore: winner.chore })}</p>
        </motion.div>
      )}
    </div>
  );
}

/* =========================================================
   TABS
   ========================================================= */
export default function FamilyGames() {
  const { t } = useFamily();
  const { theme } = useTheme();
  const [active, setActive] = useState<GameId>("quiz");

  return (
    <section className="space-y-5">
      <h2 className={`text-2xl ${theme.heading}`}>{t("gamesTitle")}</h2>

      <div role="tablist" className="flex flex-wrap gap-2">
        {GAMES.map((g) => {
          const Icon = GAME_ICONS[g.id];
          return (
            <button
              key={g.id} role="tab" aria-selected={active === g.id}
              onClick={() => setActive(g.id)}
              className={`${active === g.id ? theme.tabActive : theme.tabIdle} ${theme.touch} flex items-center gap-2 px-5`}
            >
              <Icon className="h-5 w-5" aria-hidden /> {t(g.titleKey)}
            </button>
          );
        })}
      </div>

      <div className={`${theme.card} p-6`}>
        {active === "quiz" && <QuizGame />}
        {active === "memory" && <MemoryGame />}
        {active === "wheel" && <WheelGame />}
      </div>
    </section>
  );
}