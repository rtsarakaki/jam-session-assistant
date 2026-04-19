type AlphabetFilterProps = {
  letters: string[];
  selected: string;
  enabledLetters: ReadonlySet<string>;
  onSelect: (letter: string) => void;
  allLabel?: string;
};

/** Compact A-Z toolbar with disabled letters and an "all" option. */
export function AlphabetFilter({
  letters,
  selected,
  enabledLetters,
  onSelect,
  allLabel = "ALL",
}: AlphabetFilterProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5" role="toolbar" aria-label="Alphabet filter">
      <button
        type="button"
        onClick={() => onSelect(allLabel)}
        className={`rounded-md border px-2 py-1 text-xs font-semibold ${
          selected === allLabel
            ? "border-[#6ee7b7]/55 text-[#6ee7b7]"
            : "border-[#2a3344] text-[#8b95a8] hover:text-[#e8ecf4]"
        }`}
      >
        {allLabel}
      </button>

      {letters.map((letter) => (
        <button
          key={letter}
          type="button"
          disabled={!enabledLetters.has(letter)}
          onClick={() => onSelect(letter)}
          className={`rounded-md border px-2 py-1 text-xs font-semibold ${
            selected === letter
              ? "border-[#6ee7b7]/55 text-[#6ee7b7]"
              : "border-[#2a3344] text-[#8b95a8] hover:text-[#e8ecf4] disabled:opacity-35"
          }`}
        >
          {letter}
        </button>
      ))}
    </div>
  );
}
