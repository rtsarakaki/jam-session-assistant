import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { ShowWhen } from "@/components/conditional";
import { SongLanguageSelect, type SongLanguage } from "@/components/inputs/song-language-select";
import { TitleField } from "@/components/inputs/title-field";
import { UrlField } from "@/components/inputs/url-field";
import { validatedHintClass } from "@/components/inputs/field-styles";

type SongRegisterTabProps = {
  artistSuggestions: string[];
  form: {
    title: string;
    artist: string;
    lyricsUrl: string;
    listenUrl: string;
    language: SongLanguage;
  };
  onChangeForm: (patch: Partial<SongRegisterTabProps["form"]>) => void;
  formError: string;
  formSuccess: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitting?: boolean;
};

/** Song registration form tab (same fields used by repertoire flow). */
export function SongRegisterTab({
  artistSuggestions,
  form,
  onChangeForm,
  formError,
  formSuccess,
  onSubmit,
  submitting = false,
}: SongRegisterTabProps) {
  return (
    <form
      id="songs-panel-register"
      role="tabpanel"
      aria-labelledby="songs-tab-register"
      className="mt-4 space-y-4"
      onSubmit={onSubmit}
    >
      <p className={validatedHintClass}>Mesmos campos usados no cadastro de repertório. Aqui só adiciona a música ao catálogo.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <TitleField
          label="Título"
          value={form.title}
          onChange={(value) => onChangeForm({ title: value })}
          placeholder="Título da música"
        />
        <TitleField
          label="Artista"
          value={form.artist}
          onChange={(value) => onChangeForm({ artist: value })}
          placeholder="Artista existente ou novo"
          suggestions={artistSuggestions}
        />
        <UrlField
          label="Letra (URL)"
          value={form.lyricsUrl}
          onChange={(value) => onChangeForm({ lyricsUrl: value })}
          placeholder="https://... (site de letras)"
        />
        <UrlField
          label="Ouvir (URL)"
          value={form.listenUrl}
          onChange={(value) => onChangeForm({ listenUrl: value })}
          placeholder="https://... (YouTube, Spotify...)"
        />
      </div>

      <SongLanguageSelect value={form.language} onChange={(value) => onChangeForm({ language: value })} />

      <ShowWhen when={!!formError}>
        <p className="text-xs text-[#fca5a5]">{formError}</p>
      </ShowWhen>
      <ShowWhen when={!!formSuccess}>
        <p className="text-xs text-[#86efac]">{formSuccess}</p>
      </ShowWhen>

      <MintSlatePanelButton variant="mint" type="submit" disabled={submitting}>
        {submitting ? "Adicionando..." : "Adicionar ao catálogo"}
      </MintSlatePanelButton>
    </form>
  );
}
