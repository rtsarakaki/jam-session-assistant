export const ONBOARDING_SESSION_PREFIX = "jam-session:onboarding:v2:shown:";
export const ONBOARDING_OPEN_EVENT = "jam-session:onboarding:open";
export const ONBOARDING_OPT_OUT_PREFIX = "jam-session:onboarding:v2:opt-out:";

function sessionKey(userId: string): string {
  return `${ONBOARDING_SESSION_PREFIX}${userId}`;
}

function optOutKey(userId: string): string {
  return `${ONBOARDING_OPT_OUT_PREFIX}${userId}`;
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

export function isOnboardingOptedOut(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(optOutKey(userId)) === "1";
}

export function setOnboardingOptOut(userId: string, optedOut: boolean): void {
  if (typeof window === "undefined") return;
  if (optedOut) {
    window.localStorage.setItem(optOutKey(userId), "1");
    return;
  }
  window.localStorage.removeItem(optOutKey(userId));
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
