"use server";

import { redirect } from "next/navigation";
import { loginInitialState, type LoginFormState } from "@/lib/form-state/login-state";
import { registerInitialState, type RegisterFormState } from "@/lib/form-state/register-state";
import { safePostAuthPath } from "@/lib/auth/safe-post-auth-path";
import { signInWithPassword, signOutGlobal, signUpWithPassword } from "@/lib/platform";
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
