import type { Lang, Role } from "@/types";
import { vi, type Dictionary, type UiKey } from "@/dictionaries/vi";
import { en } from "@/dictionaries/en";
import { es } from "@/dictionaries/es";
import { zh } from "@/dictionaries/zh";

export const DEFAULT_LANG: Lang = "vi";

export const LANGS: { code: Lang; label: string; speech: string }[] = [
  { code: "vi", label: "Tiếng Việt", speech: "vi-VN" },
  { code: "en", label: "English", speech: "en-US" },
  { code: "es", label: "Español", speech: "es-ES" },
  { code: "zh", label: "中文", speech: "zh-CN" },
];

export const dictionaries: Record<Lang, Dictionary> = { vi, en, es, zh };

export const ROLE_KEY: Record<Role, UiKey> = {
  grandparent: "roleGrandparent",
  parent: "roleParent",
  youth: "roleYouth",
  child: "roleChild",
};

export function isLang(value: unknown): value is Lang {
  return value === "vi" || value === "en" || value === "es" || value === "zh";
}

export function fmt(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

export function translate(lang: Lang, key: UiKey, vars?: Record<string, string | number>): string {
  return fmt(dictionaries[lang].ui[key] ?? key, vars);
}