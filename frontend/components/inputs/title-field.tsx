import { validatedInputClass, validatedLabelClass } from "@/components/inputs/field-styles";

type TitleFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  suggestions?: string[];
};

/** Generic labeled text field for title-like inputs (e.g. title, artist). */
export function TitleField({ label, value, onChange, placeholder, autoComplete = "off", suggestions }: TitleFieldProps) {
  const listId = suggestions?.length ? `${label.toLowerCase().replace(/\s+/g, "-")}-suggestions` : undefined;
  return (
    <label className={validatedLabelClass}>
      {label}
      <input
        className={validatedInputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        list={listId}
      />
      {suggestions?.length ? (
        <datalist id={listId}>
          {suggestions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ) : null}
    </label>
  );
}
