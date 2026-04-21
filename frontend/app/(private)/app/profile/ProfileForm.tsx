"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { saveProfileAction } from "@/lib/actions/profile-actions";
import { profileFormInitialState, type ProfileFormState } from "@/lib/form-state/profile-form-state";
import { HighlightButton } from "@/components/buttons/HighlightButton";
import { ShowWhen } from "@/components/conditional";
import { FormErrorBanner, FormSuccessBanner } from "@/components/feedback";
import { NameField, type NameFieldHandle } from "@/components/inputs/name-field";
import { UsernameField, type UsernameFieldHandle } from "@/components/inputs/username-field";
import { DEFAULT_APP_LOCALE, type AppLocale } from "@/lib/i18n/locales";
import { ProfileInstrumentsField } from "@/components/inputs/profile-instruments-field";
import { TextareaField, type TextareaFieldHandle } from "@/components/inputs/textarea-field";
import { isOnboardingOptedOut, setOnboardingOptOut } from "@/lib/onboarding/walkthrough-session";
import type { UserProfile } from "@/lib/platform/profile-service";
import { validateProfileBio, PROFILE_BIO_MAX } from "@/lib/validation/profile-fields";
import { presetInstrumentsFromStored } from "@/lib/validation/profile-instruments";

type ProfileFormProps = {
  initial: UserProfile | null;
  userId: string;
  locale: AppLocale;
};

export function ProfileForm({ initial, userId, locale }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    saveProfileAction,
    profileFormInitialState,
  );
  const [tutorialAutoShowDisabled, setTutorialAutoShowDisabled] = useState(false);

  const nameRef = useRef<NameFieldHandle>(null);
  const usernameRef = useRef<UsernameFieldHandle>(null);
  const bioRef = useRef<TextareaFieldHandle>(null);

  const presetSelected = useMemo(() => presetInstrumentsFromStored(initial?.instruments), [initial?.instruments]);
  const preferredLocale: AppLocale = initial?.preferredLocale ?? DEFAULT_APP_LOCALE;

  useEffect(() => {
    startTransition(() => setTutorialAutoShowDisabled(isOnboardingOptedOut(userId)));
  }, [userId]);

  return (
    <main id="app-main" className="mx-auto max-w-2xl py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-bold tracking-tight text-[#6ee7b7]">{locale === "pt" ? "Perfil" : "Profile"}</h1>
        <Link
          href={`/app/user/${userId}`}
          className="rounded-lg border border-[#2a3344] bg-[#1e2533] px-3 py-1.5 text-xs font-semibold text-[#6ee7b7] hover:border-[#6ee7b7]/50 hover:bg-[#232b3a]"
        >
          {locale === "pt" ? "Minhas atividades" : "My activities"}
        </Link>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[#8b95a8]">
        {locale === "pt"
          ? "Atualize como você aparece nas jams. Isso fica salvo no seu perfil da conta."
          : "Update how you appear in jams. This is saved in your account profile."}
      </p>

      <form
        action={formAction}
        className="mt-8 space-y-6"
        onSubmit={(e) => {
          const results = [nameRef.current?.validate(), usernameRef.current?.validate(), bioRef.current?.validate()];
          if (results.some(Boolean)) {
            e.preventDefault();
          }
        }}
      >
        <FormErrorBanner message={state.error} />

        <ShowWhen when={state.success}>
          <FormSuccessBanner message={locale === "pt" ? "Perfil salvo." : "Profile saved."} />
        </ShowWhen>

        <NameField
          ref={nameRef}
          disabled={pending}
          inputName="displayName"
          defaultValue={initial?.displayName ?? ""}
          optional
          placeholder={locale === "pt" ? "Como você quer aparecer (opcional)" : "How you want to appear (optional)"}
          hint={
            locale === "pt"
              ? "Se preenchido, deve incluir pelo menos uma letra (mesmas regras do nome da conta)."
              : "If set, it must include at least one letter (same rules as your account name)."
          }
        />

        <UsernameField
          ref={usernameRef}
          disabled={pending}
          defaultValue={initial?.username ?? ""}
          optional
          placeholder="your_handle"
          hint={
            locale === "pt"
              ? "Identificador único para Amigos e jam (letras minúsculas, números e underscore; 3–30 caracteres). Deixe em branco para limpar."
              : "Unique handle for Friends and jams (lowercase letters, numbers, and underscore; 3-30 chars). Leave blank to clear."
          }
        />

        <TextareaField
          ref={bioRef}
          disabled={pending}
          name="bio"
          label="Bio"
          rows={4}
          maxLength={PROFILE_BIO_MAX}
          defaultValue={initial?.bio ?? ""}
          placeholder={locale === "pt" ? "Conte para os outros sobre seu estilo (opcional)." : "Tell others about your style (optional)."}
          hint={locale === "pt" ? `Até ${PROFILE_BIO_MAX} caracteres.` : `Up to ${PROFILE_BIO_MAX} characters.`}
          validate={validateProfileBio}
        />

        <ProfileInstrumentsField
          disabled={pending}
          defaultSelected={presetSelected}
          hint={locale === "pt" ? "Marque tudo que você toca (lista pré-definida)." : "Check everything you play (preset list)."}
        />

        <div className="space-y-2">
          <label htmlFor="preferred-locale" className="block text-sm font-semibold text-[#d5dbe8]">
            {locale === "pt" ? "Idioma do app" : "App language"}
          </label>
          <select
            id="preferred-locale"
            name="preferredLocale"
            defaultValue={preferredLocale}
            disabled={pending}
            className="w-full rounded-lg border border-[#2a3344] bg-[#171c26] px-3 py-2 text-sm text-[#e8ecf4]"
          >
            <option value="en">English</option>
            <option value="pt">Português</option>
          </select>
          <p className="text-xs text-[#8b95a8]">
            {locale === "pt" ? "Usado nos menus do app e no tutorial." : "Used in app menus and tutorial."}
          </p>
        </div>

        <section className="rounded-lg border border-[#2a3344] bg-[#171c26]/45 p-3">
          <h2 className="text-sm font-semibold text-[#e8ecf4]">
            {locale === "pt" ? "Preferência do tutorial" : "Tutorial preference"}
          </h2>
          <label className="mt-2 flex items-start gap-2 text-xs text-[#aeb8cb]">
            <input
              type="checkbox"
              checked={tutorialAutoShowDisabled}
              onChange={(e) => {
                const next = e.currentTarget.checked;
                setOnboardingOptOut(userId, next);
                startTransition(() => setTutorialAutoShowDisabled(next));
              }}
              className="mt-0.5 h-3.5 w-3.5 rounded border border-[#2a3344] bg-[#0f1218] accent-[#6ee7b7]"
            />
            <span>
              {locale === "pt"
                ? "Não mostrar o tutorial automaticamente após o login."
                : "Do not show the tutorial automatically after login."}
            </span>
          </label>
          <p className="mt-2 text-[0.7rem] text-[#8b95a8]">
            {locale === "pt"
              ? "Você ainda pode abrir quando quiser pelo menu da conta."
              : "You can still open it anytime from the account menu."}
          </p>
        </section>

        <HighlightButton type="submit" disabled={pending} className="mt-2 w-full min-w-0 flex-none">
          {pending ? (locale === "pt" ? "Salvando..." : "Saving...") : locale === "pt" ? "Salvar perfil" : "Save profile"}
        </HighlightButton>
      </form>
    </main>
  );
}
