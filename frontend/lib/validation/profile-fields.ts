export const PROFILE_BIO_MAX = 500;

export function validateProfileBio(raw: string): string | null {
  if (raw.length > PROFILE_BIO_MAX) {
    return `Bio must be at most ${PROFILE_BIO_MAX} characters.`;
  }
  return null;
}
