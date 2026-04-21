import type { User } from "@supabase/supabase-js";
import { AppShellHelpButton } from "@/components/app-shell/app-shell-help-button";
import { AppNotificationsBell } from "@/components/app-shell/app-notifications-bell";
import { AppShellUserMenu } from "@/components/app-shell/app-shell-user-menu";
import { getAvatarImageUrl, getAvatarInitials, getDisplayName } from "@/lib/auth/user-display";
import type { AppLocale } from "@/lib/i18n/locales";
import { listMyNotifications } from "@/lib/platform";

type AppShellHeaderProps = {
  user: User;
  locale: AppLocale;
};

/** Authenticated shell header: brand + avatar (account menu on all breakpoints). */
export async function AppShellHeader({ user, locale }: AppShellHeaderProps) {
  const name = getDisplayName(user);
  const email = user.email?.trim() ?? "";
  const imgUrl = getAvatarImageUrl(user);
  const initials = getAvatarInitials(name, email || undefined);
  const notifications = await listMyNotifications(20);

  const subtitle =
    locale === "pt"
      ? "Sessões de jam, repertório e catálogo de músicas (protótipo)."
      : "Jam sessions, repertoire, and song catalog (prototype).";

  return (
    <header className="mb-4 border-b border-[#2a3344] pb-4">
      <div className="header-top flex min-w-0 flex-row items-start justify-between gap-2 sm:gap-3">
        <div className="brand min-w-0 flex-1 pr-1">
          <h1 className="m-0 truncate text-[1.05rem] font-semibold leading-snug tracking-tight text-[#e8ecf4] min-[400px]:text-[1.1rem] min-[480px]:text-xl">
            Jam Session
          </h1>
          <p className="mt-1 max-w-[min(100%,28rem)] text-[0.72rem] leading-snug text-[#8b95a8] min-[400px]:text-[0.8125rem]">{subtitle}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <AppShellHelpButton locale={locale} />
          <AppNotificationsBell
            initialItems={notifications.items}
            initialUnreadCount={notifications.unreadCount}
            locale={locale}
          />
          <AppShellUserMenu
            userId={user.id}
            name={name}
            email={email}
            avatarUrl={imgUrl}
            initials={initials}
            locale={locale}
          />
        </div>
      </div>
    </header>
  );
}
