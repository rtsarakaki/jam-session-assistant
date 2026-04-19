"use client";

import { forwardRef, useId, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import {
  validatedFieldErrorClass,
  validatedHintClass,
  validatedInputInvalidClass,
  validatedLabelClass,
  validatedTextareaClass,
} from "./field-styles";

export type TextareaFieldHandle = {
  getValue: () => string;
  validate: () => string | null;
};

type TextareaFieldProps = {
  disabled?: boolean;
  name: string;
  label: string;
  placeholder?: string;
  maxLength: number;
  rows?: number;
  defaultValue?: string;
  hint?: ReactNode;
  validate: (raw: string) => string | null;
};

export const TextareaField = forwardRef<TextareaFieldHandle, TextareaFieldProps>(function TextareaField(
  { disabled, name, label, placeholder, maxLength, rows = 4, defaultValue, hint, validate },
  ref,
) {
  const id = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
        {label}
      </label>
      <textarea
        ref={inputRef}
        id={id}
        name={name}
        rows={rows}
        maxLength={maxLength}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        className={`${validatedTextareaClass} ${error ? validatedInputInvalidClass : ""}`}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errId : undefined}
        onBlur={() => setError(validate(inputRef.current?.value ?? ""))}
        onChange={() => {
          if (error) setError(validate(inputRef.current?.value ?? ""));
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
