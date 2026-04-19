"use client";

import { forwardRef, useId, useImperativeHandle, useRef, useState } from "react";
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  validateLoginPassword,
  validatePassword,
} from "@/lib/validation/user-fields";
import {
  validatedFieldErrorClass,
  validatedInputClass,
  validatedInputInvalidClass,
  validatedLabelClass,
} from "./field-styles";

export type PasswordFieldHandle = {
  getValue: () => string;
  validate: () => string | null;
};

type PasswordFieldProps = {
  disabled?: boolean;
  /** `signup`: strength rules. `login`: non-empty + max length only. */
  variant?: "signup" | "login";
};

export const PasswordField = forwardRef<PasswordFieldHandle, PasswordFieldProps>(function PasswordField(
  { disabled, variant = "signup" },
  ref,
) {
  const validate = variant === "login" ? validateLoginPassword : validatePassword;
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      getValue: () => inputRef.current?.value ?? "",
      validate: () => {
        const msg = validate(inputRef.current?.value ?? "");
        setError(msg);
        return msg;
      },
    }),
    [validate],
  );

  const errId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className={validatedLabelClass}>
        Password
      </label>
      <input
        ref={inputRef}
        id={id}
        name="password"
        type="password"
        autoComplete={variant === "login" ? "current-password" : "new-password"}
        minLength={variant === "login" ? undefined : PASSWORD_MIN}
        maxLength={PASSWORD_MAX}
        className={`${validatedInputClass} ${error ? validatedInputInvalidClass : ""}`}
        placeholder={
          variant === "login" ? "Your password" : `At least ${PASSWORD_MIN} characters, letters and numbers`
        }
        disabled={disabled}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errId : undefined}
        onBlur={() => setError(validate(inputRef.current?.value ?? ""))}
        onChange={() => {
          if (error) setError(validate(inputRef.current?.value ?? ""));
        }}
      />
      {error ? (
        <p id={errId} className={validatedFieldErrorClass} role="alert">
          {error}
        </p>
      ) : variant === "signup" ? (
        <p className="mt-1 text-[0.7rem] leading-snug text-[#8b95a8]">
          {PASSWORD_MIN}–{PASSWORD_MAX} characters, at least one letter and one number.
        </p>
      ) : (
        <p className="mt-1 text-[0.7rem] leading-snug text-[#8b95a8]">Use the password for your account.</p>
      )}
    </div>
  );
});
