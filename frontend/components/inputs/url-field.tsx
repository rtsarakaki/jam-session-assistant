import { validatedInputClass, validatedLabelClass } from "@/components/inputs/field-styles";

type UrlFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

/** Generic labeled URL input field (lyrics/listen/etc). */
export function UrlField({ label, value, onChange, placeholder }: UrlFieldProps) {
  return (
    <label className={validatedLabelClass}>
      {label}
      <input
        className={validatedInputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode="url"
      />
    </label>
  );
}
