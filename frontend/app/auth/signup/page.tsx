import Link from "next/link";
import { AuthProviderDivider } from "@/components/auth/auth-provider-divider";
import { GoogleOauthButton } from "@/components/auth/google-oauth-button";
import { ShowWhen } from "@/components/conditional";
import { FormErrorBanner } from "@/components/feedback";
import { safePostAuthPath } from "@/lib/auth/safe-post-auth-path";
import { SignupForm } from "./SignupForm";

export const metadata = {
  title: "Create account — Jam Session",
};

type SignupPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const sp = await searchParams;
  const oauthFailed = sp.error === "oauth";
  const afterSignupPath = safePostAuthPath("/app");
  const googleHref = `/auth/google?next=${encodeURIComponent(afterSignupPath)}&source=signup`;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0f1218] bg-[radial-gradient(1200px_600px_at_10%_-10%,#1a2435_0%,#0f1218_55%)] px-4 py-10 text-[#e8ecf4]">
      <div className="w-full max-w-md rounded-xl border border-[#2a3344] bg-[#171c26] p-8 shadow-xl">
        <h1 className="text-xl font-bold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#8b95a8]">
          Crie conta com <strong className="text-[#e8ecf4]">Google</strong> ou com{" "}
          <strong className="text-[#e8ecf4]">email e palavra-passe</strong> (Supabase Auth).
        </p>

        <ShowWhen when={oauthFailed}>
          <div className="mt-4">
            <FormErrorBanner message="Não foi possível concluir o registo com o Google. Confirme o provider Google e os URLs de redireção no painel do Supabase." />
          </div>
        </ShowWhen>

        <div className="mt-6">
          <GoogleOauthButton href={googleHref} />
        </div>
        <AuthProviderDivider />

        <SignupForm />

        <p className="mt-6 text-center text-sm text-[#8b95a8]">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-[#6ee7b7] underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link href="/" className="text-sm font-medium text-[#8b95a8] underline-offset-2 hover:text-[#e8ecf4] hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
