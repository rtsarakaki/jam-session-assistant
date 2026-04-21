import {
  validatedFieldErrorClass,
  validatedInputClass,
  validatedInputInvalidClass,
  validatedLabelClass,
} from "@/components/inputs/field-styles";

type AddressFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
};

export function validateAddressText(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return "Address is required.";
  if (normalized.length < 10 || !normalized.includes(" ")) {
    return "Please provide a fuller address (street, number, city and state).";
  }
  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 3) {
    return "Please include city and state (e.g. Street, Number, City, State).";
  }
  return null;
}

/** Generic address field with consistent validation styling. */
export function AddressField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error = null,
}: AddressFieldProps) {
  return (
    <label className={validatedLabelClass}>
      {label}
      <input
        className={`${validatedInputClass}${error ? ` ${validatedInputInvalidClass}` : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="street-address"
        required={required}
        aria-invalid={error ? true : undefined}
      />
      {error ? <p className={validatedFieldErrorClass}>{error}</p> : null}
    </label>
  );
}
