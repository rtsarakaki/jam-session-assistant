"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction } from "@/lib/actions/auth-actions";
import { HighlightButton } from "@/components/buttons/HighlightButton";
import { FormErrorBanner } from "@/components/feedback";
import { resetPasswordInitialState, type ResetPasswordState } from "@/lib/form-state/password-reset-state";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<ResetPasswordState, FormData>(
    resetPasswordAction,
    resetPasswordInitialState,
  );

  if (state.success) {
    return (
      <div className="mt-6 space-y-4">
        <p
          className="rounded-lg border border-[color-mix(in_srgb,#6ee7b7_35%,#2a3344)] bg-[color-mix(in_srgb,#6ee7b7_8%,#1e2533)] px-3 py-2 text-sm text-[#e8ecf4]"
          role="status"
        >
          Password updated successfully.
        </p>
        <Link
          href="/app"
          className="block w-full rounded-lg border border-[color-mix(in_srgb,#6ee7b7_45%,#2a3344)] bg-[#6ee7b7] px-3 py-2 text-center text-sm font-semibold text-[#0f1218] hover:bg-[#5eead4]"
        >
          Go to app
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <FormErrorBanner message={state.error} />

      <div>
        <label htmlFor="reset-password" className="mb-1.5 block text-sm font-medium">
          New password
        </label>
        <input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          disabled={pending}
          className="w-full rounded-lg border border-[#2a3344] bg-[#0f1218] px-3 py-2 text-sm text-[#e8ecf4] placeholder:text-[#5c6678] focus:border-[#6ee7b7]/50 focus:outline-none disabled:opacity-60"
        />
      </div>

      <div>
        <label htmlFor="reset-confirm" className="mb-1.5 block text-sm font-medium">
          Confirm new password
        </label>
        <input
          id="reset-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          disabled={pending}
          className="w-full rounded-lg border border-[#2a3344] bg-[#0f1218] px-3 py-2 text-sm text-[#e8ecf4] placeholder:text-[#5c6678] focus:border-[#6ee7b7]/50 focus:outline-none disabled:opacity-60"
        />
      </div>

      <HighlightButton type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Save new password"}
      </HighlightButton>
    </form>
  );
}
