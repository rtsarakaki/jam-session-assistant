"use client";

import { forwardRef, useId, useImperativeHandle, useRef, useState } from "react";
import { validateName } from "@/lib/validation/user-fields";
import {
  validatedFieldErrorClass,
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
};

export const NameField = forwardRef<NameFieldHandle, NameFieldProps>(function NameField({ disabled }, ref) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => inputRef.current?.value ?? "",
    validate: () => {
      const msg = validateName(inputRef.current?.value ?? "");
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
        name="name"
        type="text"
        autoComplete="name"
        maxLength={120}
        className={`${validatedInputClass} ${error ? validatedInputInvalidClass : ""}`}
        placeholder="How you want to appear"
        disabled={disabled}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errId : undefined}
        onBlur={() => setError(validateName(inputRef.current?.value ?? ""))}
        onChange={() => {
          if (error) setError(validateName(inputRef.current?.value ?? ""));
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
