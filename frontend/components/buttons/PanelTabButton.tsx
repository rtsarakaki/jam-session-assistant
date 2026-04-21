import { AppButton } from "@/components/buttons/AppButton";

type PanelTabButtonProps = {
  children: React.ReactNode;
  id?: string;
  selected: boolean;
  onClick: () => void;
  controlsId?: string;
};

const baseClass = "rounded-lg px-3 py-2 text-sm font-semibold transition-colors";
const selectedClass = "bg-[color-mix(in_srgb,#6ee7b7_14%,transparent)] text-[#6ee7b7]";
const idleClass = "text-[#8b95a8] hover:bg-[#1e2533] hover:text-[#e8ecf4]";

/** Reusable tab trigger for dark panel sections (Catalog/Register style). */
export function PanelTabButton({ children, id, selected, onClick, controlsId }: PanelTabButtonProps) {
  const className = `${baseClass} ${selected ? selectedClass : idleClass}`;
  return (
    <AppButton
      id={id}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={controlsId}
      onClick={onClick}
      className={className}
    >
      {children}
    </AppButton>
  );
}
