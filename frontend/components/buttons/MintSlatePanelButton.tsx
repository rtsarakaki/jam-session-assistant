const baseClass =
  "w-full rounded-lg border py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const mintClass =
  "border-[#6ee7b7]/45 bg-[color-mix(in_srgb,#6ee7b7_12%,transparent)] text-[#6ee7b7]";

const slateClass =
  "border-[#2a3344] bg-[#1e2533] text-[#e8ecf4] hover:border-[#3d4a60] hover:bg-[#232b3a]";

export type MintSlatePanelButtonProps = {
  /** `mint` = accent follow state; `slate` = neutral secondary panel. */
  variant: "mint" | "slate";
  children: React.ReactNode;
  type?: "submit" | "button";
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
  onClick?: () => void;
};

/** Full-width bordered control matching Friends / dark panel chrome (mint tint vs slate). */
export function MintSlatePanelButton({
  variant,
  children,
  type = "button",
  disabled,
  "aria-label": ariaLabel,
  className,
  onClick,
}: MintSlatePanelButtonProps) {
  const tone = variant === "mint" ? mintClass : slateClass;
  const combined = className ? `${baseClass} ${tone} ${className}` : `${baseClass} ${tone}`;

  return (
    <button type={type} disabled={disabled} className={combined} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </button>
  );
}
