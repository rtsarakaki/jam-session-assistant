"use server";

import { redirect } from "next/navigation";
import { loginInitialState, type LoginFormState } from "@/lib/form-state/login-state";
import {
  forgotPasswordInitialState,
  resetPasswordInitialState,
  type ForgotPasswordState,
  type ResetPasswordState,
} from "@/lib/form-state/password-reset-state";
import { registerInitialState, type RegisterFormState } from "@/lib/form-state/register-state";
import { safePostAuthPath } from "@/lib/auth/safe-post-auth-path";
import { requestPasswordReset, signInWithPassword, signOutGlobal, signUpWithPassword, updatePassword } from "@/lib/platform";
import {
  validateEmail,
  validateLoginPassword,
  validateName,
  validatePassword,
  validatePasswordMatch,
} from "@/lib/validation/user-fields";

export async function loginWithEmailPassword(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const emailErr = validateEmail(email);
  if (emailErr) return { ...loginInitialState, error: emailErr };

  const pwdErr = validateLoginPassword(password);
  if (pwdErr) return { ...loginInitialState, error: pwdErr };

  const { error } = await signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return { ...loginInitialState, error: error.message };
  }

  redirect(safePostAuthPath(formData.get("next")));
}

/**
 * Email/password sign-up via Supabase Auth (server-side).
 * Session is stored in cookies when Supabase returns a session; otherwise the user confirms email first.
 */
export async function registerWithEmailPassword(
  _prev: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const nameErr = validateName(name);
  if (nameErr) return { ...registerInitialState, error: nameErr };

  const emailErr = validateEmail(email);
  if (emailErr) return { ...registerInitialState, error: emailErr };

  const pwdErr = validatePassword(password);
  if (pwdErr) return { ...registerInitialState, error: pwdErr };

  const matchErr = validatePasswordMatch(password, confirm);
  if (matchErr) return { ...registerInitialState, error: matchErr };

  const emailNorm = email.trim().toLowerCase();
  const nameTrim = name.trim();

  const { data, error } = await signUpWithPassword({
    email: emailNorm,
    password,
    metadata: {
      full_name: nameTrim,
      display_name: nameTrim,
    },
  });

  if (error) {
    return { ...registerInitialState, error: error.message };
  }

  if (data.session) {
    redirect(safePostAuthPath(formData.get("next")));
  }

  return {
    error: null,
    success: true,
    needsEmailConfirmation: true,
  };
}

export async function logout() {
  await signOutGlobal();
  redirect("/auth/login");
}

function publicAppOriginForReset(): string {
  const explicit = process.env.APP_ORIGIN?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL?.trim()) return `https://${process.env.VERCEL_URL.trim().replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}

export async function requestPasswordResetAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "");
  const emailErr = validateEmail(email);
  if (emailErr) return { ...forgotPasswordInitialState, error: emailErr };

  const redirectTo = `${publicAppOriginForReset()}/auth/reset-password/confirm`;
  const { error } = await requestPasswordReset({ email: email.trim().toLowerCase(), redirectTo });
  if (error) {
    return { ...forgotPasswordInitialState, error: error.message };
  }
  return { error: null, success: true };
}

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const pwdErr = validatePassword(password);
  if (pwdErr) return { ...resetPasswordInitialState, error: pwdErr };
  const matchErr = validatePasswordMatch(password, confirm);
  if (matchErr) return { ...resetPasswordInitialState, error: matchErr };

  const { error } = await updatePassword(password);
  if (error) {
    return { ...resetPasswordInitialState, error: error.message };
  }
  return { error: null, success: true };
}
