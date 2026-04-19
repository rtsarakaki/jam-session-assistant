import Link from "next/link";
import { AuthProviderDivider } from "@/components/auth/auth-provider-divider";
import { GoogleOauthButton } from "@/components/auth/google-oauth-button";
import { ShowWhen } from "@/components/conditional";
import { FormErrorBanner } from "@/components/feedback";
import { safePostAuthPath } from "@/lib/auth/safe-post-auth-path";
import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams: Promise<{ registered?: string; next?: string; error?: string }>;
};

export const metadata = {
  title: "Sign in — Jam Session",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = await searchParams;
  const justRegistered = sp.registered === "1";
  const oauthFailed = sp.error === "oauth";
  const afterLoginPath = safePostAuthPath(sp.next ?? null);
  const googleHref = `/auth/google?next=${encodeURIComponent(afterLoginPath)}`;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0f1218] bg-[radial-gradient(1200px_600px_at_10%_-10%,#1a2435_0%,#0f1218_55%)] px-4 py-10 text-[#e8ecf4]">
      <div className="w-full max-w-md rounded-xl border border-[#2a3344] bg-[#171c26] p-8 shadow-xl">
        <h1 className="text-xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#8b95a8]">
          Sign in with <strong className="text-[#e8ecf4]">Google</strong> or{" "}
          <strong className="text-[#e8ecf4]">email and password</strong>. Your session is stored in secure cookies
          (Supabase Auth).
        </p>

        <ShowWhen when={oauthFailed}>
          <div className="mt-4">
            <FormErrorBanner message="Could not complete Google sign-in. Check the Google provider and redirect URLs in the Supabase dashboard." />
          </div>
        </ShowWhen>

        <ShowWhen when={justRegistered}>
          <div
            className="mt-4 rounded-lg border border-[color-mix(in_srgb,#6ee7b7_35%,#2a3344)] bg-[color-mix(in_srgb,#6ee7b7_8%,#1e2533)] px-3 py-2 text-sm text-[#e8ecf4]"
            role="status"
          >
            Account created. If your project requires email confirmation, check your inbox before signing in.
          </div>
        </ShowWhen>

        <div className="mt-6">
          <GoogleOauthButton href={googleHref} />
        </div>
        <AuthProviderDivider />

        <LoginForm afterLoginPath={afterLoginPath} />

        <p className="mt-6 text-center text-sm text-[#8b95a8]">
          Need an account?{" "}
          <Link href="/auth/signup" className="font-semibold text-[#6ee7b7] underline-offset-2 hover:underline">
            Create account
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-[#8b95a8] underline-offset-2 hover:text-[#e8ecf4] hover:underline"
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
