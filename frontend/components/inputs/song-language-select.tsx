import { validatedHintClass, validatedInputClass, validatedLabelClass } from "@/components/inputs/field-styles";

export type SongLanguage = "en" | "es" | "pt" | "fr" | "it" | "ja" | "de" | "ko" | "zh" | "hi";

const SONG_LANGUAGE_LABEL: Record<SongLanguage, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  it: "Italian",
  ja: "Japanese",
  de: "German",
  ko: "Korean",
  zh: "Mandarin Chinese",
  hi: "Hindi",
};

const SONG_LANGUAGE_OPTIONS = (Object.keys(SONG_LANGUAGE_LABEL) as SongLanguage[]).map((value) => ({
  value,
  label: SONG_LANGUAGE_LABEL[value],
}));

export function isSongLanguage(value: string): value is SongLanguage {
  return value in SONG_LANGUAGE_LABEL;
}

export function getSongLanguageLabel(language: SongLanguage): string {
  return SONG_LANGUAGE_LABEL[language];
}

type SongLanguageSelectProps = {
  value: SongLanguage;
  onChange: (value: SongLanguage) => void;
};

/** Dropdown for song language; keeps canonical enum in one place. */
export function SongLanguageSelect({ value, onChange }: SongLanguageSelectProps) {
  return (
    <label className={validatedLabelClass}>
      Language
      <select
        className={validatedInputClass}
        value={value}
        onChange={(e) => onChange(isSongLanguage(e.target.value) ? e.target.value : "en")}
      >
        {SONG_LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className={validatedHintClass}>Main language of the song (lyrics/performance).</p>
    </label>
  );
}
