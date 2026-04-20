export const ONBOARDING_SESSION_PREFIX = "jam-session:onboarding:v2:shown:";
export const ONBOARDING_OPEN_EVENT = "jam-session:onboarding:open";

function sessionKey(userId: string): string {
  return `${ONBOARDING_SESSION_PREFIX}${userId}`;
}

export function wasOnboardingShownInSession(userId: string): boolean {
  if (typeof window === "undefined") return true;
  return window.sessionStorage.getItem(sessionKey(userId)) === "1";
}

export function markOnboardingShownInSession(userId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(sessionKey(userId), "1");
}

export function clearOnboardingShownInSession(userId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(sessionKey(userId));
}

export function clearAllOnboardingSessionFlags(): void {
  if (typeof window === "undefined") return;
  for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
    const key = window.sessionStorage.key(i);
    if (key && key.startsWith(ONBOARDING_SESSION_PREFIX)) {
      window.sessionStorage.removeItem(key);
    }
  }
}
