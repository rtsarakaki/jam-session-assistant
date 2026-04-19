type FormSuccessBannerProps = {
  message: string;
  className?: string;
};

/** Inline confirmation after a successful form submit (dark theme). */
export function FormSuccessBanner({ message, className = "" }: FormSuccessBannerProps) {
  const text = message.trim();
  if (!text) return null;

  return (
    <p
      className={`rounded-lg border border-[#6ee7b7]/35 bg-[color-mix(in_srgb,#6ee7b7_10%,transparent)] px-3 py-2 text-sm text-[#6ee7b7] ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      {text}
    </p>
  );
}
