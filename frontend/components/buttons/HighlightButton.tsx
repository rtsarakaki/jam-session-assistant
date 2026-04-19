import Link from "next/link";

const highlightButtonStyles =
  "inline-flex min-w-34 flex-1 items-center justify-center rounded-[10px] bg-linear-to-br from-[#34d399] to-[#059669] px-4 py-2.5 text-sm font-semibold text-[#042f1f] transition-[filter] hover:brightness-110";

export type HighlightButtonProps = {
  children: React.ReactNode;
  /** Used when rendering a link (default). Ignored for native buttons. */
  href?: string;
  className?: string;
  /** Renders `<button>` with the same styles (e.g. form submit). */
  type?: "submit" | "button";
  disabled?: boolean;
};

/** Primary / highlighted control: link by default, or `type="submit"` / `type="button"`. */
export function HighlightButton({
  children,
  href = "/auth/signup",
  className,
  type,
  disabled,
}: HighlightButtonProps) {
  const combined = className ? `${highlightButtonStyles} ${className}` : highlightButtonStyles;

  if (type === "submit" || type === "button") {
    return (
      <button
        type={type}
        disabled={disabled}
        className={`${combined} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {children}
      </button>
    );
  }

  return (
    <Link href={href} className={combined}>
      {children}
    </Link>
  );
}
