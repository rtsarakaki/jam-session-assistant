"use client";

import { forwardRef, useId, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { validateName } from "@/lib/validation/user-fields";
import {
  validatedFieldErrorClass,
  validatedHintClass,
  validatedInputClass,
  validatedInputInvalidClass,
  validatedLabelClass,
} from "./field-styles";

export type NameFieldHandle = {
  getValue: () => string;
  validate: () => string | null;
};

type NameFieldProps = {
  disabled?: boolean;
  /** HTML `name` for form POST (default `name`, e.g. signup). */
  inputName?: string;
  defaultValue?: string;
  /** When true, empty value is valid; otherwise `validateName` requires a name. */
  optional?: boolean;
  placeholder?: string;
  hint?: ReactNode;
};

export const NameField = forwardRef<NameFieldHandle, NameFieldProps>(function NameField(
  { disabled, inputName = "name", defaultValue, optional = false, placeholder = "How you want to appear", hint },
  ref,
) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const runValidate = (raw: string) => {
    if (optional && !raw.trim()) return null;
    return validateName(raw);
  };

  useImperativeHandle(ref, () => ({
    getValue: () => inputRef.current?.value ?? "",
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
        Display name
      </label>
      <input
        ref={inputRef}
        id={id}
        name={inputName}
        type="text"
        autoComplete="name"
        maxLength={120}
        defaultValue={defaultValue}
        className={`${validatedInputClass} ${error ? validatedInputInvalidClass : ""}`}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errId : undefined}
        onBlur={() => setError(runValidate(inputRef.current?.value ?? ""))}
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
