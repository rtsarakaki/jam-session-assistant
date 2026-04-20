export const APP_LOCALES = ["en", "pt"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_APP_LOCALE: AppLocale = "pt";

export function normalizeAppLocale(value: unknown): AppLocale {
  if (typeof value !== "string") return DEFAULT_APP_LOCALE;
  const normalized = value.trim().toLowerCase();
  if (normalized === "en") return "en";
  return "pt";
}
