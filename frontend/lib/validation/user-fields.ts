const NAME_HAS_LETTER = /\p{L}/u;

/** Trim, length bounds, and at least one Unicode letter (not digits/symbols only). */
export function validateName(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Please enter your name.";
  if (v.length < 2) return "Name must be at least 2 characters.";
  if (v.length > 120) return "Name must be at most 120 characters.";
  if (!NAME_HAS_LETTER.test(v)) return "Name must include at least one letter.";
  return null;
}

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function validateEmail(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (!v) return "Please enter your email.";
  if (v.length > 254) return "Email is too long.";
  if (!EMAIL_RE.test(v)) return "Enter a valid email address.";
  return null;
}

/** Aligned with server: min 8, max 72 (bcrypt), letter + number required. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

/** Sign-in only: do not enforce signup complexity rules. */
export function validateLoginPassword(raw: string): string | null {
  if (!raw) return "Please enter your password.";
  if (raw.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  return null;
}

export function validatePassword(raw: string): string | null {
  if (!raw) return "Please enter a password.";
  if (raw.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (raw.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  if (!/[a-zA-Z]/.test(raw)) return "Password must include at least one letter.";
  if (!/[0-9]/.test(raw)) return "Password must include at least one number.";
  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (!confirm) return "Please confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}
