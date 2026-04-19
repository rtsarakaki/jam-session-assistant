import Link from "next/link";

const highlightButtonStyles =
  "inline-flex min-w-34 flex-1 items-center justify-center rounded-[10px] bg-linear-to-br from-[#34d399] to-[#059669] px-4 py-2.5 text-sm font-semibold text-[#042f1f] transition-[filter] hover:brightness-110";

export type HighlightButtonProps = {
  children: React.ReactNode;
  href?: string;
  className?: string;
};

/** Primary / highlighted link button (e.g. sign up). */
export function HighlightButton({ children, href = "/auth/signup", className }: HighlightButtonProps) {
  const combined = className ? `${highlightButtonStyles} ${className}` : highlightButtonStyles;
  return (
    <Link href={href} className={combined}>
      {children}
    </Link>
  );
}
