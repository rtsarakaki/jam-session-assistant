"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LogoutForm } from "@/components/auth/logout-form";

type AppShellUserMenuProps = {
  name: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
};

/** Avatar pequeno abre menu com nome, email e Sair (todos os breakpoints). */
export function AppShellUserMenu({ name, email, avatarUrl, initials }: AppShellUserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative z-70 shrink-0">
      <button
        type="button"
        className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[color-mix(in_srgb,#6ee7b7_35%,#2a3344)] bg-[#1e2533] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#6ee7b7]"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        title="Conta"
        aria-label={`Abrir menu da conta: ${name}`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- OAuth avatar URLs
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" width={32} height={32} />
        ) : (
          <span className="text-[0.65rem] font-bold leading-none text-[#6ee7b7]" aria-hidden>
            {initials}
          </span>
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-80 mt-1.5 min-w-52 max-w-[min(calc(100vw-2rem),18rem)] rounded-xl border border-[#2a3344] bg-[#171c26] p-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        >
          <p className="truncate text-sm font-semibold text-[#e8ecf4]">{name}</p>
          {email ? <p className="mt-1 truncate text-xs text-[#8b95a8]">{email}</p> : null}
          <div className="mt-3 border-t border-[#2a3344] pt-3">
            <LogoutForm className="w-full justify-center border-[#2a3344] px-3 py-2 text-xs font-semibold text-[#e8ecf4] hover:border-[color-mix(in_srgb,#f87171_45%,#2a3344)] hover:bg-[#1e2533] hover:text-[#fca5a5]" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
