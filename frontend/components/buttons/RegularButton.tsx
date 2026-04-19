import Link from "next/link";

const regularButtonStyles =
  "inline-flex min-w-34 flex-1 items-center justify-center rounded-lg border border-[#2a3344] bg-transparent px-4 py-2.5 text-sm font-semibold text-[#e8ecf4] transition-colors hover:bg-[#1e2533]";

export type RegularButtonProps = {
  children: React.ReactNode;
  href?: string;
  className?: string;
};

/** Secondary / outline link button (e.g. log in). */
export function RegularButton({ children, href = "/auth/login", className }: RegularButtonProps) {
  const combined = className ? `${regularButtonStyles} ${className}` : regularButtonStyles;
  return (
    <Link href={href} className={combined}>
      {children}
    </Link>
  );
}
