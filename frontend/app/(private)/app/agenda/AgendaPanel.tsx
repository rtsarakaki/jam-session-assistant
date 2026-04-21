"use client";

import { useMemo, useRef, useState } from "react";
import {
  createAgendaEventAction,
  deleteAgendaEventAction,
  loadMyAgendaEventsAction,
  updateAgendaEventAction,
} from "@/lib/actions/agenda-actions";
import { AddressField, validateAddressText } from "@/components/inputs/address-field";
import { TitleField } from "@/components/inputs/title-field";
import { UrlField } from "@/components/inputs/url-field";
import type { AgendaEventItem, AgendaEventKind } from "@/lib/platform/agenda-service";
import type { AppLocale } from "@/lib/i18n/locales";
import { FeedPostLinkPreview } from "../feed/FeedPostLinkPreview";

function mapEmbedUrl(addressText: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(addressText)}&output=embed`;
}

type Props = {
  locale: AppLocale;
  myUserId: string;
  initialItems: AgendaEventItem[];
};

export function AgendaPanel({ locale, myUserId, initialItems }: Props) {
  const pt = locale === "pt";
  const [tab, setTab] = useState<"form" | "list">("list");
  const [items, setItems] = useState(initialItems);
  const [kind, setKind] = useState<AgendaEventKind>("show");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [addressText, setAddressText] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("20:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<"upcoming" | "past">("upcoming");
  const [nowTs] = useState<number>(() => Date.now());
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  async function refreshList() {
    const res = await loadMyAgendaEventsAction();
    if (!res.error) setItems(res.items ?? []);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setAddressError(null);
    const normalizedAddress = addressText.trim();
    const invalidAddressError = validateAddressText(normalizedAddress);
    if (invalidAddressError) {
      setBusy(false);
      setAddressError(
        pt
          ? "Informe endereço completo com rua, número, cidade e estado (ex.: Rua X, 123, Cidade, UF)."
          : invalidAddressError,
      );
      return;
    }
    const iso = eventDate ? new Date(`${eventDate}T${eventTime || "00:00"}`).toISOString() : "";
    const res = editingEventId
      ? await updateAgendaEventAction({
          eventId: editingEventId,
          kind,
          title,
          details,
          addressText: normalizedAddress,
          eventAtIso: iso,
          videoUrl,
        })
      : await createAgendaEventAction({
          kind,
          title,
          details,
          addressText: normalizedAddress,
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
    setEventDate("");
    setEventTime("20:00");
    setEditingEventId(null);
    await refreshList();
    setTab("list");
  }

  async function remove(item: AgendaEventItem) {
    if (item.authorId !== myUserId) return;
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

  function edit(item: AgendaEventItem) {
    if (item.authorId !== myUserId) return;
    const d = new Date(item.eventAt);
    const dateIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const timeIso = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    setKind(item.kind);
    setTitle(item.title);
    setDetails(item.details ?? "");
    setAddressText(item.addressText);
    setVideoUrl(item.videoUrl ?? "");
    setEventDate(dateIso);
    setEventTime(timeIso);
    setEditingEventId(item.id);
    setTab("form");
  }

  const itemsByMonth = useMemo(() => {
    const filtered = items.filter((item) => {
      const t = new Date(item.eventAt).getTime();
      if (!Number.isFinite(t)) return false;
      return listFilter === "upcoming" ? t >= nowTs : t < nowTs;
    });
    const sorted = [...filtered].sort((a, b) =>
      listFilter === "upcoming" ? a.eventAt.localeCompare(b.eventAt) : b.eventAt.localeCompare(a.eventAt),
    );
    const groups: Array<{ key: string; label: string; items: AgendaEventItem[] }> = [];
    for (const item of sorted) {
      const d = new Date(item.eventAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      let group = groups.find((g) => g.key === key);
      if (!group) {
        group = {
          key,
          label: d.toLocaleDateString(pt ? "pt-BR" : "en-US", { month: "long", year: "numeric" }),
          items: [],
        };
        groups.push(group);
      }
      group.items.push(item);
    }
    return groups;
  }, [items, pt, listFilter, nowTs]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("list")}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${tab === "list" ? "border-[#6ee7b7]/60 bg-[color-mix(in_srgb,#6ee7b7_14%,#1e2533)] text-[#e8ecf4]" : "border-[#2a3344] bg-[#1e2533] text-[#8b95a8]"}`}
        >
          {pt ? "Meus eventos" : "My events"}
        </button>
        <button
          type="button"
          onClick={() => setTab("form")}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${tab === "form" ? "border-[#6ee7b7]/60 bg-[color-mix(in_srgb,#6ee7b7_14%,#1e2533)] text-[#e8ecf4]" : "border-[#2a3344] bg-[#1e2533] text-[#8b95a8]"}`}
        >
          {pt ? "Registrar novo evento" : "Register new event"}
        </button>
      </div>

      {tab === "form" ? (
      <form onSubmit={submit} className="rounded-xl border border-[#2a3344] bg-[#111722] p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as AgendaEventKind)}
            className="rounded-lg border border-[#2a3344] bg-[#0f1218] px-2.5 py-2 text-sm text-[#e8ecf4]"
          >
            <option value="show">{pt ? "Vou me apresentar" : "I will perform"}</option>
            <option value="attending">{pt ? "Vou participar/ir" : "I will attend"}</option>
            <option value="recommendation">{pt ? "Recomendação" : "Recommendation"}</option>
          </select>
          <input
            ref={dateInputRef}
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            onFocus={() => dateInputRef.current?.showPicker?.()}
            onClick={() => dateInputRef.current?.showPicker?.()}
            className="rounded-lg border border-[#2a3344] bg-[#0f1218] px-2.5 py-2 text-sm text-[#e8ecf4]"
            required
          />
          <input
            type="time"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            className="rounded-lg border border-[#2a3344] bg-[#0f1218] px-2.5 py-2 text-sm text-[#e8ecf4]"
            required
          />
          <div className="md:col-span-2">
            <TitleField
              label={pt ? "Título do evento" : "Event title"}
              value={title}
              onChange={setTitle}
              placeholder={pt ? "Ex.: Show no Centro Cultural" : "e.g. Live show at Downtown Hall"}
            />
          </div>
          <div className="md:col-span-2">
            <AddressField
              label={pt ? "Endereço completo" : "Full address"}
              value={addressText}
              onChange={(next) => {
                setAddressText(next);
                if (addressError) setAddressError(null);
              }}
              placeholder={pt ? "Rua, número, bairro, cidade, estado..." : "Street, number, district, city, state..."}
              required
              error={addressError}
            />
          </div>
          {addressText.trim() ? (
            <div className="md:col-span-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8b95a8]">
                {pt ? "Pré-visualização do mapa" : "Map preview"}
              </p>
              <iframe
                title="agenda-form-map-preview"
                src={mapEmbedUrl(addressText.trim())}
                className="h-36 w-full rounded-lg border border-[#2a3344]"
                loading="lazy"
              />
            </div>
          ) : null}
          <div className="md:col-span-2">
            <UrlField
              label={pt ? "Link de vídeo (opcional)" : "Video link (optional)"}
              value={videoUrl}
              onChange={setVideoUrl}
              placeholder={pt ? "https://..." : "https://..."}
            />
          </div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            placeholder={pt ? "Detalhes do evento (opcional)" : "Event details (optional)"}
            className="rounded-lg border border-[#2a3344] bg-[#0f1218] px-2.5 py-2 text-sm text-[#e8ecf4] md:col-span-2"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-[#6ee7b7]/45 bg-[#6ee7b7] px-4 py-2 text-sm font-semibold text-[#0f1218] disabled:opacity-60"
          >
            {busy ? (pt ? "Salvando..." : "Saving...") : editingEventId ? (pt ? "Salvar edição" : "Save changes") : pt ? "Salvar evento" : "Save event"}
          </button>
          {editingEventId ? (
            <button
              type="button"
              onClick={() => {
                setEditingEventId(null);
                setKind("show");
                setTitle("");
                setDetails("");
                setAddressText("");
                setVideoUrl("");
                setEventDate("");
                setEventTime("20:00");
              }}
              className="rounded-lg border border-[#2a3344] px-4 py-2 text-sm font-semibold text-[#8b95a8]"
            >
              {pt ? "Cancelar edição" : "Cancel edit"}
            </button>
          ) : null}
          {error ? <p className="text-xs text-[#fca5a5]">{error}</p> : null}
        </div>
      </form>
      ) : (
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setListFilter("upcoming")}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${listFilter === "upcoming" ? "border-[#6ee7b7]/60 bg-[color-mix(in_srgb,#6ee7b7_14%,#1e2533)] text-[#e8ecf4]" : "border-[#2a3344] bg-[#1e2533] text-[#8b95a8]"}`}
          >
            {pt ? "Próximos" : "Upcoming"}
          </button>
          <button
            type="button"
            onClick={() => setListFilter("past")}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${listFilter === "past" ? "border-[#6ee7b7]/60 bg-[color-mix(in_srgb,#6ee7b7_14%,#1e2533)] text-[#e8ecf4]" : "border-[#2a3344] bg-[#1e2533] text-[#8b95a8]"}`}
          >
            {pt ? "Passado" : "Past"}
          </button>
        </div>
        {itemsByMonth.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#2a3344] bg-[#111722] p-4 text-sm text-[#8b95a8]">
            {listFilter === "upcoming"
              ? pt
                ? "Nenhum evento próximo."
                : "No upcoming events."
              : pt
                ? "Nenhum evento passado."
                : "No past events."}
          </p>
        ) : null}
        {itemsByMonth.map((group) => (
          <section key={group.key}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8b95a8]">{group.label}</h3>
            <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-3">
              {group.items.map((item) => (
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
              onClick={() => edit(item)}
              className={`mt-3 rounded-md px-2 py-1 text-xs font-semibold ${item.authorId === myUserId ? "text-[#8b95a8] hover:bg-[#1e2533]" : "text-[#5f6b80] cursor-not-allowed"}`}
              disabled={item.authorId !== myUserId}
            >
              {pt ? "Editar" : "Edit"}
            </button>
            <button
              type="button"
              onClick={() => void remove(item)}
              className={`mt-3 rounded-md px-2 py-1 text-xs font-semibold ${item.authorId === myUserId ? "text-[#fca5a5] hover:bg-[#1e2533]" : "text-[#5f6b80] cursor-not-allowed"}`}
              disabled={item.authorId !== myUserId}
            >
              {pt ? "Excluir" : "Delete"}
            </button>
          </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      )}
    </div>
  );
}
