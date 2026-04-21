"use client";

import { useMemo, useState } from "react";
import { setFollowStateAction } from "@/lib/actions/friends-actions";
import { ProfileAvatarBubble } from "@/components/avatar/ProfileAvatarBubble";
import type { AppLocale } from "@/lib/i18n/locales";
import type { AgendaEventItem } from "@/lib/platform/agenda-service";
import { FeedPostLinkPreview } from "../feed/FeedPostLinkPreview";

type Props = {
  locale: AppLocale;
  myUserId: string;
  initialItems: AgendaEventItem[];
  initialFollowingIds: string[];
};

const NEARBY_RADIUS_KM = 15;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function splitSignificantWords(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/g)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4);
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const sa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
}

function mapEmbedUrl(addressText: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(addressText)}&output=embed`;
}

export function EventsPanel({ locale, myUserId, initialItems, initialFollowingIds }: Props) {
  const pt = locale === "pt";
  const [scope, setScope] = useState<"friends" | "all">("friends");
  const [nearMe, setNearMe] = useState(false);
  const [followingIds, setFollowingIds] = useState(new Set(initialFollowingIds));
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [nearHint, setNearHint] = useState<string | null>(null);
  const [myCoords, setMyCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [eventDistanceById, setEventDistanceById] = useState<Record<string, number>>({});
  const [nearCityToken, setNearCityToken] = useState<string | null>(null);
  const [nearStateToken, setNearStateToken] = useState<string | null>(null);
  const [nearCityWords, setNearCityWords] = useState<string[]>([]);

  async function requestNearMe() {
    if (!navigator.geolocation) {
      setNearHint(pt ? "Geolocalização não suportada no navegador." : "Geolocation is not supported.");
      return;
    }
    setNearHint(
      pt
        ? `Ative a geolocalização para filtrar em ${NEARBY_RADIUS_KM} km.`
        : `Enable geolocation to filter within ${NEARBY_RADIUS_KM} km.`,
    );
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const current = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setMyCoords(current);
          const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${current.lat}&lon=${current.lon}`;
          const reverseRes = await fetch(reverseUrl);
          const reverseData = (await reverseRes.json()) as { address?: { city?: string; town?: string; state?: string } };
          const city = reverseData.address?.city || reverseData.address?.town || "";
          const state = reverseData.address?.state || "";
          setNearCityToken(city ? normalizeText(city) : null);
          setNearStateToken(state ? normalizeText(state) : null);
          setNearCityWords(city ? splitSignificantWords(city) : []);
          const entries = await Promise.all(
            initialItems.map(async (item) => {
              const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(item.addressText)}`;
              const res = await fetch(url);
              const list = (await res.json()) as Array<{ lat: string; lon: string }>;
              const hit = list[0];
              if (!hit) return [item.id, Number.POSITIVE_INFINITY] as const;
              const lat = Number(hit.lat);
              const lon = Number(hit.lon);
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [item.id, Number.POSITIVE_INFINITY] as const;
              return [item.id, haversineKm(current.lat, current.lon, lat, lon)] as const;
            }),
          );
          const map: Record<string, number> = {};
          for (const [id, distance] of entries) map[id] = distance;
          setEventDistanceById(map);
          setNearHint(
            pt
              ? `Mostrando eventos em até ${NEARBY_RADIUS_KM} km.`
              : `Showing events within ${NEARBY_RADIUS_KM} km.`,
          );
        } catch {
          setNearHint(pt ? "Não foi possível resolver sua localização." : "Could not resolve your location.");
        }
      },
      () => {
        setNearHint(pt ? "Permita geolocalização para usar 'Perto de mim'." : "Allow geolocation to use 'Near me'.");
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  async function toggleFollow(authorId: string) {
    if (busyUserId || authorId === myUserId) return;
    const nextFollow = !followingIds.has(authorId);
    setBusyUserId(authorId);
    const res = await setFollowStateAction({ targetUserId: authorId, follow: nextFollow });
    setBusyUserId(null);
    if (res.error) return;
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (nextFollow) next.add(authorId);
      else next.delete(authorId);
      return next;
    });
  }

  const visibleItems = useMemo(() => {
    const base = scope === "friends" ? initialItems.filter((item) => followingIds.has(item.authorId) || item.authorId === myUserId) : initialItems;
    if (!nearMe || !myCoords) return base;
    return base
      .filter((item) => {
        const distance = eventDistanceById[item.id] ?? Number.POSITIVE_INFINITY;
        if (distance <= NEARBY_RADIUS_KM) return true;
        const normalizedAddress = normalizeText(item.addressText);
        const cityMatch = nearCityToken ? normalizedAddress.includes(nearCityToken) : false;
        const stateMatch = nearStateToken ? normalizedAddress.includes(nearStateToken) : false;
        const cityWordMatch =
          nearCityWords.length > 0 ? nearCityWords.some((w) => normalizedAddress.includes(w)) : false;
        return cityMatch || stateMatch || cityWordMatch;
      })
      .sort((a, b) => (eventDistanceById[a.id] ?? 999999) - (eventDistanceById[b.id] ?? 999999));
  }, [initialItems, followingIds, myUserId, scope, nearMe, myCoords, eventDistanceById, nearCityToken, nearStateToken, nearCityWords]);

  return (
    <main className="w-full min-w-0 max-w-full overflow-x-hidden">
      <h2 className="m-0 text-lg font-semibold text-[#e8ecf4]">{pt ? "Eventos" : "Events"}</h2>
      <p className="mt-1 text-[0.7rem] leading-snug text-[#8b95a8]">
        {pt ? "Eventos futuros da agenda com filtros por amigos, geral e proximidade." : "Upcoming agenda events with friends, general, and near-me filters."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setScope("friends")} className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${scope === "friends" ? "border-[#6ee7b7]/60 bg-[color-mix(in_srgb,#6ee7b7_14%,#1e2533)] text-[#e8ecf4]" : "border-[#2a3344] bg-[#1e2533] text-[#8b95a8]"}`}>{pt ? "Amigos" : "Friends"}</button>
        <button type="button" onClick={() => setScope("all")} className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${scope === "all" ? "border-[#6ee7b7]/60 bg-[color-mix(in_srgb,#6ee7b7_14%,#1e2533)] text-[#e8ecf4]" : "border-[#2a3344] bg-[#1e2533] text-[#8b95a8]"}`}>{pt ? "Geral" : "General"}</button>
        <button
          type="button"
          onClick={() => {
            const next = !nearMe;
            setNearMe(next);
            if (next) void requestNearMe();
          }}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${nearMe ? "border-[#6ee7b7]/60 bg-[color-mix(in_srgb,#6ee7b7_14%,#1e2533)] text-[#e8ecf4]" : "border-[#2a3344] bg-[#1e2533] text-[#8b95a8]"}`}
        >
          {pt ? "Perto de mim" : "Near me"}
        </button>
      </div>
      {nearHint ? <p className="mt-2 text-xs text-[#8b95a8]">{nearHint}</p> : null}
      <ul className="mt-4 m-0 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-3">
        {visibleItems.map((item) => (
          <li id={`event-${item.id}`} key={item.id} className="rounded-xl border border-[#2a3344] bg-[#111722] p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <ProfileAvatarBubble url={item.authorAvatarUrl} initials={(item.authorDisplayName || item.authorUsername || "?").slice(0, 2).toUpperCase()} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#e8ecf4]">{item.authorDisplayName || item.authorUsername || item.authorId}</p>
                  <p className="truncate text-[10px] text-[#8b95a8]">@{item.authorUsername || "user"}</p>
                </div>
              </div>
              {item.authorId !== myUserId ? (
                <button
                  type="button"
                  onClick={() => void toggleFollow(item.authorId)}
                  disabled={busyUserId === item.authorId}
                  className="rounded-md border border-[#2a3344] px-2 py-1 text-[10px] font-semibold text-[#8b95a8] hover:text-[#e8ecf4] disabled:opacity-70"
                >
                  {busyUserId === item.authorId ? "..." : followingIds.has(item.authorId) ? (pt ? "Seguindo" : "Following") : pt ? "Seguir" : "Follow"}
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-sm font-semibold text-[#e8ecf4]">{item.title}</p>
            <p className="mt-1 text-xs text-[#8b95a8]">{new Date(item.eventAt).toLocaleString()}</p>
            <p className="mt-1 text-xs text-[#c8cedd]">{item.addressText}</p>
            {nearMe && Number.isFinite(eventDistanceById[item.id]) ? (
              <p className="mt-1 text-[11px] font-semibold text-[#6ee7b7]">
                {pt ? `${eventDistanceById[item.id].toFixed(1)} km de você` : `${eventDistanceById[item.id].toFixed(1)} km from you`}
              </p>
            ) : null}
            <iframe title={`events-map-${item.id}`} src={mapEmbedUrl(item.addressText)} className="mt-3 h-32 w-full rounded-lg border border-[#2a3344]" loading="lazy" />
            {item.videoUrl ? (
              <div className="mt-3">
                <FeedPostLinkPreview url={item.videoUrl} locale={locale} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
