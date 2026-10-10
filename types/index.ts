export type Lang = "vi" | "en" | "es" | "zh";
export type Role = "grandparent" | "parent" | "youth" | "child";
export type Severity = "high" | "medium" | "low";
export type Frequency = "daily" | "weekly";
export type GameId = "quiz" | "memory" | "wheel";

export interface Family {
  id: string;
  family_code: string;
  name: string;
  created_at?: string;
}

export interface Member {
  id: string;
  family_id: string;
  name: string;
  role: Role;
  avatar_emoji: string;
  birth_year: number | null;
  nickname: string | null;
}

export type MemberInput = Omit<Member, "id" | "family_id">;

export interface Profile {
  id: string;
  family_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_premium: boolean;
  usage_count: number;
}

export interface Scam {
  id: "deepfake" | "bank" | "police";
  severity: Severity;
  title: string;
  description: string;
  dos: string[];
  donts: string[];
}

export interface Reminder {
  id: string;
  family_id: string;
  member_id: string | null;
  title: string;
  time: string; // "HH:MM"
  frequency: Frequency;
  is_completed: boolean;
}

export interface Usage {
  count: number;
  limit: number;
  isPremium: boolean;
}

export interface Game {
  id: GameId;
  titleKey: "gameQuiz" | "gameMemory" | "gameWheel";
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
}

export interface MemoryCard {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

export interface SlangText {
  meaning: string;
  example: string;
  tip: string;
}

export interface SlangEntry {
  id: number;
  term: string;
  vi: SlangText;
  en: SlangText;
  es: SlangText;
  zh: SlangText;
}