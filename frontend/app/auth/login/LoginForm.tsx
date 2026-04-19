"use client";

import { useActionState, useRef } from "react";
import { loginWithEmailPassword } from "@/lib/actions/auth-actions";
import { loginInitialState, type LoginFormState } from "@/lib/form-state/login-state";
import { HighlightButton } from "@/components/buttons/HighlightButton";
import { FormErrorBanner } from "@/components/feedback";
import { EmailField, type EmailFieldHandle } from "@/components/inputs/email-field";
import { PasswordField, type PasswordFieldHandle } from "@/components/inputs/password-field";

type LoginFormProps = {
  /** Sanitized server-side; posted as `next` for post-login redirect. */
  afterLoginPath: string;
};

export function LoginForm({ afterLoginPath }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    loginWithEmailPassword,
    loginInitialState,
  );

  const emailRef = useRef<EmailFieldHandle>(null);
  const passwordRef = useRef<PasswordFieldHandle>(null);

  return (
    <form
      action={formAction}
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        const results = [emailRef.current?.validate(), passwordRef.current?.validate()];
        if (results.some(Boolean)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="next" value={afterLoginPath} />

      <FormErrorBanner message={state.error} />

      <EmailField ref={emailRef} disabled={pending} />
      <PasswordField ref={passwordRef} variant="login" disabled={pending} />

      <HighlightButton type="submit" disabled={pending} className="mt-2 w-full flex-none min-w-0">
        {pending ? "Signing in…" : "Sign in"}
      </HighlightButton>
    </form>
  );
}
