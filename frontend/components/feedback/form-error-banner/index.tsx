type FormErrorBannerProps = {
  /** When null, undefined, or only whitespace, nothing is rendered. */
  message?: string | null;
  className?: string;
};

/** Inline alert for form-level or server action errors (dark theme). */
export function FormErrorBanner({ message, className = "" }: FormErrorBannerProps) {
  const text = message?.trim();
  if (!text) return null;

  return (
    <div
      className={`rounded-lg border border-[color-mix(in_srgb,#f87171_40%,#2a3344)] bg-[color-mix(in_srgb,#f87171_10%,#1e2533)] px-3 py-2 text-sm text-[#fca5a5] ${className}`.trim()}
      role="alert"
    >
      {text}
    </div>
  );
}
