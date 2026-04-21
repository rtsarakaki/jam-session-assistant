"use client";

import { useState } from "react";
import { createAgendaEventAction, deleteAgendaEventAction, loadMyAgendaEventsAction } from "@/lib/actions/agenda-actions";
import type { AgendaEventItem, AgendaEventKind } from "@/lib/platform/agenda-service";
import type { AppLocale } from "@/lib/i18n/locales";
import { FeedPostLinkPreview } from "../feed/FeedPostLinkPreview";

function mapEmbedUrl(addressText: string): string {
  return `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=&q=${encodeURIComponent(addressText)}`;
}

type Props = {
  locale: AppLocale;
  initialItems: AgendaEventItem[];
};

export function AgendaPanel({ locale, initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [kind, setKind] = useState<AgendaEventKind>("show");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [addressText, setAddressText] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [eventAtLocal, setEventAtLocal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshList() {
    const res = await loadMyAgendaEventsAction();
    if (!res.error) setItems(res.items ?? []);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const iso = eventAtLocal ? new Date(eventAtLocal).toISOString() : "";
    const res = await createAgendaEventAction({
      kind,
      title,
      details,
      addressText,
      eventAtIso: iso,
      videoUrl,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setTitle("");
    setDetails("");
    setAddressText("");
    setVideoUrl("");
    setEventAtLocal("");
    await refreshList();
  }

  async function remove(item: AgendaEventItem) {
    const ok = window.confirm(
      locale === "pt" ? `Excluir evento "${item.title}" da agenda?` : `Delete "${item.title}" from agenda?`,
    );
    if (!ok) return;
    const res = await deleteAgendaEventAction(item.id);
    if (res.error) {
      setError(res.error);
      return;
    }
    setItems((prev) => prev.filter((row) => row.id !== item.id));
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="rounded-xl border border-[#2a3344] bg-[#111722] p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as AgendaEventKind)}
            className="rounded-lg border border-[#2a3344] bg-[#0f1218] px-2.5 py-2 text-sm text-[#e8ecf4]"
          >
            <option value="show">{locale === "pt" ? "Vou me apresentar" : "I will perform"}</option>
            <option value="attending">{locale === "pt" ? "Vou participar/ir" : "I will attend"}</option>
            <option value="recommendation">{locale === "pt" ? "Recomendação" : "Recommendation"}</option>
          </select>
          <input
            type="datetime-local"
            value={eventAtLocal}
            onChange={(e) => setEventAtLocal(e.target.value)}
            className="rounded-lg border border-[#2a3344] bg-[#0f1218] px-2.5 py-2 text-sm text-[#e8ecf4]"
            required
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={locale === "pt" ? "Título do evento" : "Event title"}
            className="rounded-lg border border-[#2a3344] bg-[#0f1218] px-2.5 py-2 text-sm text-[#e8ecf4] md:col-span-2"
            required
          />
          <input
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            placeholder={locale === "pt" ? "Endereço completo" : "Full address"}
            className="rounded-lg border border-[#2a3344] bg-[#0f1218] px-2.5 py-2 text-sm text-[#e8ecf4] md:col-span-2"
            required
          />
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder={locale === "pt" ? "Link de vídeo (opcional)" : "Video link (optional)"}
            className="rounded-lg border border-[#2a3344] bg-[#0f1218] px-2.5 py-2 text-sm text-[#e8ecf4] md:col-span-2"
          />
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            placeholder={locale === "pt" ? "Detalhes do evento (opcional)" : "Event details (optional)"}
            className="rounded-lg border border-[#2a3344] bg-[#0f1218] px-2.5 py-2 text-sm text-[#e8ecf4] md:col-span-2"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-[#6ee7b7]/45 bg-[#6ee7b7] px-4 py-2 text-sm font-semibold text-[#0f1218] disabled:opacity-60"
          >
            {busy ? (locale === "pt" ? "Salvando..." : "Saving...") : locale === "pt" ? "Salvar evento" : "Save event"}
          </button>
          {error ? <p className="text-xs text-[#fca5a5]">{error}</p> : null}
        </div>
      </form>

      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-[#2a3344] bg-[#111722] p-4">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[#6ee7b7]">{item.kind}</p>
            <p className="mt-1 text-sm font-semibold text-[#e8ecf4]">{item.title}</p>
            <p className="mt-1 text-xs text-[#8b95a8]">{new Date(item.eventAt).toLocaleString()}</p>
            <p className="mt-1 text-xs text-[#c8cedd]">{item.addressText}</p>
            {item.details ? <p className="mt-2 text-xs text-[#8b95a8]">{item.details}</p> : null}
            <iframe title={`map-${item.id}`} src={mapEmbedUrl(item.addressText)} className="mt-3 h-32 w-full rounded-lg border border-[#2a3344]" loading="lazy" />
            {item.videoUrl ? (
              <div className="mt-3">
                <FeedPostLinkPreview url={item.videoUrl} locale={locale} />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => void remove(item)}
              className="mt-3 rounded-md px-2 py-1 text-xs font-semibold text-[#fca5a5] hover:bg-[#1e2533]"
            >
              {locale === "pt" ? "Excluir" : "Delete"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
