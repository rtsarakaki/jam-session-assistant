"use client";

import { useActionState, useRef } from "react";
import { registerWithEmailPassword } from "@/app/auth/actions";
import { registerInitialState, type RegisterFormState } from "@/app/auth/register-state";
import { HighlightButton } from "@/components/buttons/HighlightButton";
import { ShowWhen } from "@/components/conditional";
import { FormErrorBanner } from "@/components/feedback";
import { ConfirmPasswordField, type ConfirmPasswordFieldHandle } from "@/components/inputs/confirm-password-field";
import { EmailField, type EmailFieldHandle } from "@/components/inputs/email-field";
import { NameField, type NameFieldHandle } from "@/components/inputs/name-field";
import { PasswordField, type PasswordFieldHandle } from "@/components/inputs/password-field";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<RegisterFormState, FormData>(
    registerWithEmailPassword,
    registerInitialState,
  );

  const nameRef = useRef<NameFieldHandle>(null);
  const emailRef = useRef<EmailFieldHandle>(null);
  const passwordRef = useRef<PasswordFieldHandle>(null);
  const confirmRef = useRef<ConfirmPasswordFieldHandle>(null);

  const showEmailConfirmation = state.success && state.needsEmailConfirmation;

  return (
    <>
      <ShowWhen when={showEmailConfirmation}>
        <div
          className="mt-6 rounded-lg border border-[color-mix(in_srgb,#6ee7b7_35%,#2a3344)] bg-[color-mix(in_srgb,#6ee7b7_8%,#1e2533)] px-4 py-3 text-sm leading-relaxed text-[#e8ecf4]"
          role="status"
        >
          <p className="font-semibold text-[#6ee7b7]">Check your email</p>
          <p className="mt-2 text-[#8b95a8]">
            We sent a confirmation link to your address. After you confirm, you can{" "}
            <a href="/auth/login" className="font-medium text-[#6ee7b7] underline-offset-2 hover:underline">
              sign in
            </a>
            .
          </p>
        </div>
      </ShowWhen>

      <ShowWhen when={!showEmailConfirmation}>
        <form
          action={formAction}
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            const results = [
              nameRef.current?.validate(),
              emailRef.current?.validate(),
              passwordRef.current?.validate(),
              confirmRef.current?.validate(),
            ];
            if (results.some(Boolean)) {
              e.preventDefault();
            }
          }}
        >
          <FormErrorBanner message={state.error} />

          <NameField ref={nameRef} disabled={pending} />
          <EmailField ref={emailRef} disabled={pending} />
          <PasswordField ref={passwordRef} disabled={pending} />
          <ConfirmPasswordField ref={confirmRef} passwordRef={passwordRef} disabled={pending} />

          <HighlightButton type="submit" disabled={pending} className="mt-2 w-full flex-none min-w-0">
            {pending ? "Creating account…" : "Create account"}
          </HighlightButton>
        </form>
      </ShowWhen>
    </>
  );
}
