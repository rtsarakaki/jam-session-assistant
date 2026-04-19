import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { ShowWhen } from "@/components/conditional";
import { SongLanguageSelect, type SongLanguage } from "@/components/inputs/song-language-select";
import { TitleField } from "@/components/inputs/title-field";
import { UrlField } from "@/components/inputs/url-field";
import { validatedHintClass } from "@/components/inputs/field-styles";

type SongRegisterTabProps = {
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
};

/** Song registration form tab (same fields used by repertoire flow). */
export function SongRegisterTab({
  form,
  onChangeForm,
  formError,
  formSuccess,
  onSubmit,
}: SongRegisterTabProps) {
  return (
    <form
      id="songs-panel-register"
      role="tabpanel"
      aria-labelledby="songs-tab-register"
      className="mt-4 space-y-4"
      onSubmit={onSubmit}
    >
      <p className={validatedHintClass}>Same fields used in repertoire registration. Here it only adds the song to catalog.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <TitleField
          label="Title"
          value={form.title}
          onChange={(value) => onChangeForm({ title: value })}
          placeholder="Song title"
        />
        <TitleField
          label="Artist"
          value={form.artist}
          onChange={(value) => onChangeForm({ artist: value })}
          placeholder="Existing or new artist"
        />
        <UrlField
          label="Lyrics (URL)"
          value={form.lyricsUrl}
          onChange={(value) => onChangeForm({ lyricsUrl: value })}
          placeholder="https://... (lyrics site)"
        />
        <UrlField
          label="Listen (URL)"
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

      <MintSlatePanelButton variant="mint" type="submit">
        Add to catalog
      </MintSlatePanelButton>
    </form>
  );
}
