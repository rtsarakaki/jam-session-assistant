"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ProfileAvatarBubble } from "@/components/avatar/ProfileAvatarBubble";
import { LogoutForm } from "@/components/auth/logout-form";
import type { AppLocale } from "@/lib/i18n/locales";

type AppShellUserMenuProps = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
  locale: AppLocale;
  agendaEnabled: boolean;
};

/** Avatar pequeno abre menu com nome, email e Sair (todos os breakpoints). */
export function AppShellUserMenu({ userId, name, email, avatarUrl, initials, locale, agendaEnabled }: AppShellUserMenuProps) {
  const t = locale === "pt";
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
        className="shrink-0 rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#6ee7b7]"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        title={t ? "Conta" : "Account"}
        aria-label={`${t ? "Abrir menu da conta" : "Open account menu"}: ${name}`}
      >
        <ProfileAvatarBubble url={avatarUrl} initials={initials} size="sm" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-80 mt-1.5 min-w-0 w-[min(18rem,calc(100dvi-2rem))] rounded-xl border border-[#2a3344] bg-[#171c26] p-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        >
          <p className="truncate text-sm font-semibold text-[#e8ecf4]">{name}</p>
          {email ? <p className="mt-1 truncate text-xs text-[#8b95a8]">{email}</p> : null}
          <div className="mt-3 border-t border-[#2a3344] pt-3">
            <Link
              href="/app/profile"
              role="menuitem"
              className="block w-full rounded-lg border border-[#2a3344] bg-[#1e2533] px-3 py-2 text-center text-xs font-semibold text-[#e8ecf4] hover:border-[#3d4a60] hover:bg-[#232b3a]"
              onClick={() => setOpen(false)}
            >
              {t ? "Perfil" : "Profile"}
            </Link>
            <Link
              href={`/app/user/${userId}`}
              role="menuitem"
              className="mt-2 block w-full rounded-lg border border-[#2a3344] bg-[#1e2533] px-3 py-2 text-center text-xs font-semibold text-[#e8ecf4] hover:border-[#3d4a60] hover:bg-[#232b3a]"
              onClick={() => setOpen(false)}
            >
              {t ? "Minhas atividades" : "My activities"}
            </Link>
            {agendaEnabled ? (
              <Link
                href="/app/agenda"
                role="menuitem"
                className="mt-2 block w-full rounded-lg border border-[#2a3344] bg-[#1e2533] px-3 py-2 text-center text-xs font-semibold text-[#e8ecf4] hover:border-[#3d4a60] hover:bg-[#232b3a]"
                onClick={() => setOpen(false)}
              >
                {t ? "Agenda" : "Agenda"}
              </Link>
            ) : null}
            <div className="mt-2">
              <LogoutForm
                locale={locale}
                className="w-full justify-center border-[#2a3344] px-3 py-2 text-xs font-semibold text-[#e8ecf4] hover:border-[color-mix(in_srgb,#f87171_45%,#2a3344)] hover:bg-[#1e2533] hover:text-[#fca5a5]"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
