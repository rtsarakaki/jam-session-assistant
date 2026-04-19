import { validatedInputClass, validatedLabelClass } from "@/components/inputs/field-styles";

type TitleFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
};

/** Generic labeled text field for title-like inputs (e.g. title, artist). */
export function TitleField({ label, value, onChange, placeholder, autoComplete = "off" }: TitleFieldProps) {
  return (
    <label className={validatedLabelClass}>
      {label}
      <input
        className={validatedInputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </label>
  );
}
