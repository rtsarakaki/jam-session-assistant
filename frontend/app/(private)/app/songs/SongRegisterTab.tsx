import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { ShowWhen } from "@/components/conditional";
import { SongLanguageSelect, type SongLanguage } from "@/components/inputs/song-language-select";
import { TitleField } from "@/components/inputs/title-field";
import { UrlField } from "@/components/inputs/url-field";
import { validatedHintClass } from "@/components/inputs/field-styles";
import type { AppLocale } from "@/lib/i18n/locales";

type SongRegisterTabProps = {
  locale: AppLocale;
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
  locale,
  artistSuggestions,
  form,
  onChangeForm,
  formError,
  formSuccess,
  onSubmit,
  submitting = false,
}: SongRegisterTabProps) {
  const pt = locale === "pt";
  return (
    <form
      id="songs-panel-register"
      role="tabpanel"
      aria-labelledby="songs-tab-register"
      className="mt-4 space-y-4"
      onSubmit={onSubmit}
    >
      <p className={validatedHintClass}>
        {pt
          ? "Mesmos campos usados no cadastro de repertório. Aqui só adiciona a música ao catálogo."
          : "Same fields used in repertoire registration. This only adds the song to the catalog."}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <TitleField
          label={pt ? "Título" : "Title"}
          value={form.title}
          onChange={(value) => onChangeForm({ title: value })}
          placeholder={pt ? "Título da música" : "Song title"}
        />
        <TitleField
          label={pt ? "Artista" : "Artist"}
          value={form.artist}
          onChange={(value) => onChangeForm({ artist: value })}
          placeholder={pt ? "Artista existente ou novo" : "Existing or new artist"}
          suggestions={artistSuggestions}
        />
        <UrlField
          label={pt ? "Letra (URL)" : "Lyrics (URL)"}
          value={form.lyricsUrl}
          onChange={(value) => onChangeForm({ lyricsUrl: value })}
          placeholder={pt ? "https://... (site de letras)" : "https://... (lyrics website)"}
        />
        <UrlField
          label={pt ? "Ouvir (URL)" : "Listen (URL)"}
          value={form.listenUrl}
          onChange={(value) => onChangeForm({ listenUrl: value })}
          placeholder={pt ? "https://... (YouTube, Spotify...)" : "https://... (YouTube, Spotify...)"}
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
        {submitting ? (pt ? "Adicionando..." : "Adding...") : pt ? "Adicionar ao catálogo" : "Add to catalog"}
      </MintSlatePanelButton>
    </form>
  );
}
