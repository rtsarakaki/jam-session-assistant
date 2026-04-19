"use client";

import { forwardRef, useId, useImperativeHandle, useRef, useState } from "react";
import { validateEmail } from "@/lib/validation/user-fields";
import {
  validatedFieldErrorClass,
  validatedInputClass,
  validatedInputInvalidClass,
  validatedLabelClass,
} from "./field-styles";

export type EmailFieldHandle = {
  getValue: () => string;
  validate: () => string | null;
};

type EmailFieldProps = {
  disabled?: boolean;
};

export const EmailField = forwardRef<EmailFieldHandle, EmailFieldProps>(function EmailField({ disabled }, ref) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => inputRef.current?.value?.trim().toLowerCase() ?? "",
    validate: () => {
      const msg = validateEmail(inputRef.current?.value ?? "");
      setError(msg);
      return msg;
    },
  }));

  const errId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className={validatedLabelClass}>
        Email
      </label>
      <input
        ref={inputRef}
        id={id}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        maxLength={254}
        className={`${validatedInputClass} ${error ? validatedInputInvalidClass : ""}`}
        placeholder="you@example.com"
        disabled={disabled}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errId : undefined}
        onBlur={() => setError(validateEmail(inputRef.current?.value ?? ""))}
        onChange={() => {
          if (error) setError(validateEmail(inputRef.current?.value ?? ""));
        }}
      />
      {error ? (
        <p id={errId} className={validatedFieldErrorClass} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
