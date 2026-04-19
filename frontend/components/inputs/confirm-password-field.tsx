"use client";

import type { RefObject } from "react";
import { forwardRef, useId, useImperativeHandle, useRef, useState } from "react";
import { validatePasswordMatch } from "@/lib/validation/user-fields";
import type { PasswordFieldHandle } from "@/components/inputs/password-field";
import {
  validatedFieldErrorClass,
  validatedInputClass,
  validatedInputInvalidClass,
  validatedLabelClass,
} from "./field-styles";

export type ConfirmPasswordFieldHandle = {
  getValue: () => string;
  validate: () => string | null;
};

type ConfirmPasswordFieldProps = {
  passwordRef: RefObject<PasswordFieldHandle | null>;
  disabled?: boolean;
};

export const ConfirmPasswordField = forwardRef<ConfirmPasswordFieldHandle, ConfirmPasswordFieldProps>(
  function ConfirmPasswordField({ passwordRef, disabled }, ref) {
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      getValue: () => inputRef.current?.value ?? "",
      validate: () => {
        const pwd = passwordRef.current?.getValue() ?? "";
        const msg = validatePasswordMatch(pwd, inputRef.current?.value ?? "");
        setError(msg);
        return msg;
      },
    }));

    const errId = `${id}-error`;

    return (
      <div>
        <label htmlFor={id} className={validatedLabelClass}>
          Confirm password
        </label>
        <input
          ref={inputRef}
          id={id}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className={`${validatedInputClass} ${error ? validatedInputInvalidClass : ""}`}
          placeholder="Repeat password"
          disabled={disabled}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errId : undefined}
          onBlur={() => {
            const pwd = passwordRef.current?.getValue() ?? "";
            setError(validatePasswordMatch(pwd, inputRef.current?.value ?? ""));
          }}
          onChange={() => {
            if (error) {
              const pwd = passwordRef.current?.getValue() ?? "";
              setError(validatePasswordMatch(pwd, inputRef.current?.value ?? ""));
            }
          }}
        />
        {error ? (
          <p id={errId} className={validatedFieldErrorClass} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
