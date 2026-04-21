"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import type { AppLocale } from "@/lib/i18n/locales";
import {
  isOnboardingOptedOut,
  markOnboardingShownInSession,
  ONBOARDING_OPEN_EVENT,
  setOnboardingOptOut,
  wasOnboardingShownInSession,
} from "@/lib/onboarding/walkthrough-session";

type WalkthroughStep = {
  id: string;
  title: string;
  description: string;
  bullets: string[];
  videoEmbeds?: Array<{
    label: string;
    src: string;
  }>;
  ctaLabel?: string;
  ctaHref?: string;
};

const stepsByLocale: Record<AppLocale, WalkthroughStep[]> = {
  en: [
  {
    id: "welcome",
    title: "Welcome to Jam Session",
    description:
      "This app helps musicians quickly discover what they can play together, avoid setup delays, and keep live sessions flowing.",
    bullets: [
      "Follow this sequence to get useful jam suggestions fast.",
      "Start with your profile, then build your repertoire.",
      "Use Jam after setup to match songs with friends.",
    ],
    videoEmbeds: [
      {
        label: "Product walkthrough",
        src: "https://www.youtube.com/embed/T55kLFCeSkg",
      },
    ],
    ctaLabel: "Start with Profile",
    ctaHref: "/app/profile",
  },
  {
    id: "profile",
    title: "Step 1: Set your instruments in Profile",
    description:
      "Open Profile and tell the app what you play. This improves who can find you and how your jam context is interpreted.",
    bullets: [
      "Select your instruments in the preset list.",
      "If you can adapt to anything, include the 'Any song (full repertoire)' option.",
      "Save profile before moving to repertoire.",
    ],
    ctaLabel: "Open Profile",
    ctaHref: "/app/profile",
  },
  {
    id: "repertoire",
    title: "Step 2: Build your playable repertoire",
    description:
      "In Repertoire, choose the songs you can actually play today. This is the core signal for jam matching.",
    bullets: [
      "Pick songs you are ready to perform now.",
      "If a song is missing, you can add it directly from Repertoire.",
      "Keep this list current so match scores stay accurate.",
    ],
    ctaLabel: "Open Repertoire",
    ctaHref: "/app/repertoire",
  },
  {
    id: "songs",
    title: "Step 3: Add missing songs when needed",
    description:
      "If you cannot find a song in Repertoire, add it either there or in the Songs catalog with the key references.",
    bullets: [
      "Songs is your shared catalog layer.",
      "Register title, artist, language, lyrics URL, and listen URL.",
      "Then return to Repertoire and mark that song as playable.",
    ],
    ctaLabel: "Open Songs",
    ctaHref: "/app/songs",
  },
  {
    id: "jam",
    title: "Step 4: Create or join a jam with friends",
    description:
      "After profile and repertoire are ready, open Jam to start sessions and get overlap-based suggestions for what to play.",
    bullets: [
      "Use Friends to follow people you play with.",
      "Open Jam and start a session with your group.",
      "Use the ranked suggestions to pick songs faster.",
      "Audience members can also join a jam and request songs through the app.",
    ],
    ctaLabel: "Open Jam",
    ctaHref: "/app/jam",
  },
  {
    id: "agenda",
    title: "Step 5: Add your events to Agenda",
    description:
      "Use Agenda to announce where and when you will perform, events you will attend, or recommendations for friends.",
    bullets: [
      "Create an event with date, address, and optional video link.",
      "Your friends can see upcoming events in Feed up to 30 days before the date.",
      "Events in the final week appear with extra highlight and notifications.",
    ],
    ctaLabel: "Open Agenda",
    ctaHref: "/app/agenda",
  },
  {
    id: "feed",
    title: "Step 6: Share on Feed",
    description:
      "After playing, use Feed to share performances, references, and songs you like so your friends keep discovering new ideas.",
    bullets: [
      "Post clips, links, and updates from your sessions.",
      "Share songs you enjoy to inspire your network.",
      "Use comments and likes to keep the musical conversation active.",
    ],
    ctaLabel: "Open Feed",
    ctaHref: "/app/feed",
  },
  ],
  pt: [
    {
      id: "welcome",
      title: "Bem-vindo ao Jam Session",
      description:
        "Este app ajuda músicos a descobrirem rapidamente o que podem tocar juntos, reduzindo o tempo de preparação.",
      bullets: [
        "Siga esta sequência para receber sugestões úteis de jam mais rápido.",
        "Comece pelo perfil e depois monte seu repertório.",
        "Use Jam após a configuração para combinar músicas com amigos.",
      ],
      videoEmbeds: [
        {
          label: "Tour do produto",
          src: "https://www.youtube.com/embed/KtWcGcpNkVg",
        },
      ],
      ctaLabel: "Começar no Perfil",
      ctaHref: "/app/profile",
    },
    {
      id: "profile",
      title: "Passo 1: Defina seus instrumentos no Perfil",
      description:
        "Abra o Perfil e informe quais instrumentos você toca. Isso melhora quem consegue te encontrar e como a jam é calculada.",
      bullets: [
        "Selecione seus instrumentos na lista de opções.",
        "Se você toca de tudo, inclua a opção 'Any song (full repertoire)'.",
        "Salve o perfil antes de ir para o repertório.",
      ],
      ctaLabel: "Abrir Perfil",
      ctaHref: "/app/profile",
    },
    {
      id: "repertoire",
      title: "Passo 2: Monte seu repertório tocável",
      description:
        "No Repertoire, escolha as músicas que você realmente consegue tocar hoje. Esse é o principal sinal para as sugestões de jam.",
      bullets: [
        "Marque músicas que você está pronto para tocar agora.",
        "Se uma música estiver faltando, adicione direto pelo Repertoire.",
        "Mantenha a lista atualizada para preservar a precisão do score.",
      ],
      ctaLabel: "Abrir Repertório",
      ctaHref: "/app/repertoire",
    },
    {
      id: "songs",
      title: "Passo 3: Adicione músicas ausentes quando precisar",
      description:
        "Se uma música não existir no Repertoire, adicione por lá ou no catálogo de Songs com as referências principais.",
      bullets: [
        "Songs é a camada de catálogo compartilhado.",
        "Cadastre título, artista, idioma, link de letra e link para ouvir.",
        "Depois volte ao Repertoire e marque a música como tocável.",
      ],
      ctaLabel: "Abrir Songs",
      ctaHref: "/app/songs",
    },
    {
      id: "jam",
      title: "Passo 4: Crie ou entre em uma jam com amigos",
      description:
        "Com perfil e repertório prontos, abra Jam para iniciar sessões e receber sugestões por sobreposição de repertório.",
      bullets: [
        "Use Friends para seguir quem você toca junto.",
        "Abra Jam e inicie uma sessão com o grupo.",
        "Use as sugestões ranqueadas para escolher músicas mais rápido.",
        "Quem está na plateia também pode entrar e pedir músicas pelo app.",
      ],
      ctaLabel: "Abrir Jam",
      ctaHref: "/app/jam",
    },
    {
      id: "agenda",
      title: "Passo 5: Adicione eventos na Agenda",
      description:
        "Use a Agenda para avisar onde e quando vai tocar, eventos que vai participar ou recomendações para seus amigos.",
      bullets: [
        "Cadastre evento com data, endereço e link de vídeo opcional.",
        "Seus amigos veem eventos no Feed nos 30 dias antes da data.",
        "Na última semana o evento ganha destaque e pode gerar notificação.",
      ],
      ctaLabel: "Abrir Agenda",
      ctaHref: "/app/agenda",
    },
    {
      id: "feed",
      title: "Passo 6: Compartilhe no Feed",
      description:
        "Depois de tocar, use o Feed para compartilhar apresentações, referências e músicas que você gosta.",
      bullets: [
        "Publique vídeos, links e atualizações das suas sessões.",
        "Compartilhe músicas para inspirar sua rede.",
        "Use comentários e curtidas para manter a conversa musical ativa.",
      ],
      ctaLabel: "Abrir Feed",
      ctaHref: "/app/feed",
    },
  ],
};

/** Friendly walkthrough for core app workflows. */
export function AppOnboardingWalkthrough({
  userId,
  locale,
  agendaEnabled,
}: {
  userId: string;
  locale: AppLocale;
  agendaEnabled: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const steps = useMemo(() => {
    const base = stepsByLocale[locale] ?? stepsByLocale.en;
    if (agendaEnabled) return base;
    return base.filter((step) => step.id !== "agenda");
  }, [locale, agendaEnabled]);
  const step = steps[stepIdx] ?? steps[0];
  const isLast = stepIdx === steps.length - 1;

  useEffect(() => {
    const optedOut = isOnboardingOptedOut(userId);
    startTransition(() => setDontShowAgain(optedOut));
    if (!wasOnboardingShownInSession(userId) && !optedOut) {
      markOnboardingShownInSession(userId);
      startTransition(() => setOpen(true));
    }
    function onOpenRequest() {
      startTransition(() => setDontShowAgain(isOnboardingOptedOut(userId)));
      startTransition(() => setOpen(true));
    }
    window.addEventListener(ONBOARDING_OPEN_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener(ONBOARDING_OPEN_EVENT, onOpenRequest);
    };
  }, [userId]);

  const routeHint = useMemo(() => {
    if (pathname.startsWith("/app/jam")) return locale === "pt" ? "Você está em Jam." : "You are currently in Jam.";
    if (pathname.startsWith("/app/songs")) return locale === "pt" ? "Você está em Songs." : "You are currently in Songs.";
    if (pathname.startsWith("/app/repertoire")) return locale === "pt" ? "Você está em Repertoire." : "You are currently in Repertoire.";
    if (pathname.startsWith("/app/friends")) return locale === "pt" ? "Você está em Friends." : "You are currently in Friends.";
    if (pathname.startsWith("/app/feed")) return locale === "pt" ? "Você está em Feed." : "You are currently in Feed.";
    if (pathname.startsWith("/app/agenda")) return locale === "pt" ? "Você está em Agenda." : "You are currently in Agenda.";
    return locale === "pt" ? "Use o dock inferior para navegar." : "Use the bottom dock to navigate each area.";
  }, [pathname, locale]);

  function closeWalkthrough() {
    setOpen(false);
    setStepIdx(0);
  }

  function finishWalkthrough() {
    closeWalkthrough();
  }

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-onboarding-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-[#2a3344] bg-[#171c26] p-4 text-[#e8ecf4] shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 text-[0.65rem] font-semibold uppercase tracking-wide text-[#6ee7b7]/85">
                  {locale === "pt" ? "Passo" : "Step"} {stepIdx + 1} {locale === "pt" ? "de" : "of"} {steps.length}
                </p>
                <h3 id="app-onboarding-title" className="mt-1 text-base font-semibold leading-snug">
                  {step.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeWalkthrough}
                className="rounded-md px-2 py-1 text-[0.72rem] font-semibold text-[#8b95a8] hover:bg-[#1e2533] hover:text-[#e8ecf4]"
              >
                {locale === "pt" ? "Fechar" : "Close"}
              </button>
            </div>

            <p className="mt-3 text-[0.78rem] leading-snug text-[#cfd5e3]">{step.description}</p>
            <ul className="mt-3 space-y-1.5 pl-4 text-[0.74rem] leading-snug text-[#aeb8cb]">
              {step.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {step.videoEmbeds?.length ? (
              <div className="mt-3 space-y-2.5">
                {step.videoEmbeds.map((video) => (
                  <div key={video.src} className="rounded-lg border border-[#2a3344] bg-[#111722] p-2">
                    <p className="mb-1.5 text-[0.68rem] font-semibold text-[#cfd5e3]">{video.label}</p>
                    <div className="relative overflow-hidden rounded-md border border-[#2a3344] pb-[56.25%]">
                      <iframe
                        src={video.src}
                        title={video.label}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <p className="mt-3 text-[0.68rem] text-[#8b95a8]">{routeHint}</p>
            <label className="mt-2 flex items-start gap-2 text-[0.7rem] leading-snug text-[#aeb8cb]">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => {
                  const next = e.currentTarget.checked;
                  setOnboardingOptOut(userId, next);
                  startTransition(() => setDontShowAgain(next));
                }}
                className="mt-0.5 h-3.5 w-3.5 rounded border border-[#2a3344] bg-[#0f1218] accent-[#6ee7b7]"
              />
              <span>
                {locale === "pt"
                  ? "Não mostrar automaticamente novamente (você pode mudar isso no Perfil)."
                  : "Do not show automatically again (you can change this in Profile)."}
              </span>
            </label>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStepIdx((idx) => Math.max(0, idx - 1))}
                  disabled={stepIdx === 0}
                  className="rounded-md border border-[#2a3344] px-2.5 py-1.5 text-[0.72rem] font-semibold text-[#c7cfde] hover:bg-[#1e2533] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {locale === "pt" ? "Voltar" : "Back"}
                </button>
                {!isLast ? (
                  <button
                    type="button"
                    onClick={() => setStepIdx((idx) => Math.min(steps.length - 1, idx + 1))}
                    className="rounded-md border border-[color-mix(in_srgb,#6ee7b7_45%,#2a3344)] bg-[#6ee7b7] px-2.5 py-1.5 text-[0.72rem] font-semibold text-[#0f1218] hover:bg-[#5eead4]"
                  >
                    {locale === "pt" ? "Próximo" : "Next"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={finishWalkthrough}
                    className="rounded-md border border-[color-mix(in_srgb,#6ee7b7_45%,#2a3344)] bg-[#6ee7b7] px-2.5 py-1.5 text-[0.72rem] font-semibold text-[#0f1218] hover:bg-[#5eead4]"
                  >
                    {locale === "pt" ? "Finalizar" : "Finish"}
                  </button>
                )}
              </div>

              {step.ctaHref && step.ctaLabel ? (
                <Link
                  href={step.ctaHref}
                  onClick={closeWalkthrough}
                  className="rounded-md border border-[#2a3344] px-2.5 py-1.5 text-[0.72rem] font-semibold text-[#6ee7b7] hover:bg-[#1e2533]"
                >
                  {step.ctaLabel}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
