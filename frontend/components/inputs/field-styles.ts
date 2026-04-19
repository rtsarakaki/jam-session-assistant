export const validatedLabelClass =
  "block text-xs font-semibold uppercase tracking-wide text-[#8b95a8]";

export const validatedInputClass =
  "mt-1 w-full rounded-lg border border-[#2a3344] bg-[#1e2533] px-3 py-2 text-sm text-[#e8ecf4] placeholder:text-[#8b95a8] outline-none ring-[#6ee7b7]/40 focus:border-[#6ee7b7]/50 focus:ring-2";

export const validatedInputInvalidClass = "border-[color-mix(in_srgb,#f87171_55%,#2a3344)] ring-[#f87171]/25";

export const validatedFieldErrorClass = "mt-1 text-xs text-[#fca5a5]";

/** Hint / helper text under labels or fields (shared tone). */
export const validatedHintClass = "mt-1 text-xs leading-relaxed text-[#8b95a8]";

/** Multiline control; matches input chrome with vertical resize. */
export const validatedTextareaClass = `${validatedInputClass} min-h-[5.5rem] resize-y`;
