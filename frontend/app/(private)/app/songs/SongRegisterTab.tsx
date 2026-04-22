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
    karaokeUrl: string;
    language: SongLanguage;
  };
  onChangeForm: (patch: Partial<SongRegisterTabProps["form"]>) => void;
  formError: string;
  formSuccess: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitting?: boolean;
  /** When true, skip catalog tab semantics (e.g. repertoire modal). */
  embedded?: boolean;
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
  embedded = false,
}: SongRegisterTabProps) {
  const pt = locale === "pt";
  return (
    <form
      id={embedded ? "repertoire-register-song-form" : "songs-panel-register"}
      role={embedded ? undefined : "tabpanel"}
      aria-labelledby={embedded ? undefined : "songs-tab-register"}
      aria-label={embedded ? (pt ? "Cadastrar música no catálogo" : "Register song in catalog") : undefined}
      className={embedded ? "space-y-4" : "mt-4 space-y-4"}
      onSubmit={onSubmit}
    >
      <p className={validatedHintClass}>
        {embedded
          ? pt
            ? "A música entra no catálogo global. Depois selecione-a na lista acima e use «Adicionar ao repertório»."
            : "The song is added to the global catalog. Then pick it in the list above and use “Add to repertoire”."
          : pt
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
        <UrlField
          label={pt ? "Karaoke (URL)" : "Karaoke (URL)"}
          value={form.karaokeUrl}
          onChange={(value) => onChangeForm({ karaokeUrl: value })}
          placeholder={pt ? "https://... (karaoke, playback...)" : "https://... (karaoke, backing track...)"}
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
