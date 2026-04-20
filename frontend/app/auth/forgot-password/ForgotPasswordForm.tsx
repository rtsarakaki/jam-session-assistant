"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "@/lib/actions/auth-actions";
import { HighlightButton } from "@/components/buttons/HighlightButton";
import { FormErrorBanner } from "@/components/feedback";
import { forgotPasswordInitialState, type ForgotPasswordState } from "@/lib/form-state/password-reset-state";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordResetAction,
    forgotPasswordInitialState,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <FormErrorBanner message={state.error} />

      {state.success ? (
        <p
          className="rounded-lg border border-[color-mix(in_srgb,#6ee7b7_35%,#2a3344)] bg-[color-mix(in_srgb,#6ee7b7_8%,#1e2533)] px-3 py-2 text-sm text-[#e8ecf4]"
          role="status"
        >
          Password reset email sent. Check your inbox and open the link to set a new password.
        </p>
      ) : null}

      <div>
        <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium">
          Email
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          className="w-full rounded-lg border border-[#2a3344] bg-[#0f1218] px-3 py-2 text-sm text-[#e8ecf4] placeholder:text-[#5c6678] focus:border-[#6ee7b7]/50 focus:outline-none disabled:opacity-60"
          placeholder="you@example.com"
        />
      </div>

      <HighlightButton type="submit" disabled={pending} className="w-full">
        {pending ? "Sending..." : "Send reset link"}
      </HighlightButton>
    </form>
  );
}
