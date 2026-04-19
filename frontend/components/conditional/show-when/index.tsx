import type { ReactNode } from "react";

type ShowWhenProps = {
  when: boolean;
  children: ReactNode;
};

/** Renders children only when `when` is true; otherwise renders nothing. */
export function ShowWhen({ when, children }: ShowWhenProps) {
  if (!when) return null;
  return <>{children}</>;
}
