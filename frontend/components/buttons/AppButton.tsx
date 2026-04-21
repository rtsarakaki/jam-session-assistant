import type { ButtonHTMLAttributes, ReactNode } from "react";

type AppButtonProps = {
  children: ReactNode;
  className: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

/**
 * Shared native button primitive.
 * Keeps HTML button behavior centralized while allowing visual variants via className.
 */
export function AppButton({ children, className, type = "button", ...rest }: AppButtonProps) {
  return (
    <button type={type} className={className} {...rest}>
      {children}
    </button>
  );
}
