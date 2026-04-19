"use client";

import { forwardRef, useId, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { USERNAME_MAX, normalizeUsername, validateUsername } from "@/lib/validation/username";
import {
  validatedFieldErrorClass,
  validatedHintClass,
  validatedInputInvalidClass,
  validatedLabelClass,
  validatedUsernameInputClass,
} from "./field-styles";

export type UsernameFieldHandle = {
  getValue: () => string;
  validate: () => string | null;
};

type UsernameFieldProps = {
  disabled?: boolean;
  defaultValue?: string;
  /** When true, empty value skips username (clears handle). */
  optional?: boolean;
  placeholder?: string;
  hint?: ReactNode;
};

export const UsernameField = forwardRef<UsernameFieldHandle, UsernameFieldProps>(function UsernameField(
  { disabled, defaultValue, optional = false, placeholder = "your_handle", hint },
  ref,
) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const runValidate = (raw: string) => {
    const v = normalizeUsername(raw);
    if (optional && !v) return null;
    return validateUsername(raw);
  };

  useImperativeHandle(ref, () => ({
    getValue: () => normalizeUsername(inputRef.current?.value ?? ""),
    validate: () => {
      const msg = runValidate(inputRef.current?.value ?? "");
      setError(msg);
      return msg;
    },
  }));

  const errId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className={validatedLabelClass}>
        Username
      </label>
      <input
        ref={inputRef}
        id={id}
        name="username"
        type="text"
        autoComplete="username"
        spellCheck={false}
        maxLength={USERNAME_MAX}
        defaultValue={defaultValue}
        className={`${validatedUsernameInputClass} ${error ? validatedInputInvalidClass : ""}`}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errId : undefined}
        onBlur={() => {
          const el = inputRef.current;
          if (el) {
            el.value = normalizeUsername(el.value);
          }
          setError(runValidate(inputRef.current?.value ?? ""));
        }}
        onChange={() => {
          if (error) setError(runValidate(inputRef.current?.value ?? ""));
        }}
      />
      {hint ? <p className={validatedHintClass}>{hint}</p> : null}
      {error ? (
        <p id={errId} className={validatedFieldErrorClass} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
