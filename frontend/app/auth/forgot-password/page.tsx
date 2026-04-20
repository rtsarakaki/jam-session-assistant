import Link from "next/link";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = {
  title: "Reset password — Jam Session",
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const sp = await searchParams;
  const invalidLink = sp.error === "invalid_reset_link";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0f1218] bg-[radial-gradient(1200px_600px_at_10%_-10%,#1a2435_0%,#0f1218_55%)] px-4 py-10 text-[#e8ecf4]">
      <div className="w-full max-w-md rounded-xl border border-[#2a3344] bg-[#171c26] p-8 shadow-xl">
        <h1 className="text-xl font-bold tracking-tight">Reset password</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#8b95a8]">
          Enter your account email and we will send a secure link so you can set a new password.
        </p>
        {invalidLink ? (
          <p className="mt-3 rounded-lg border border-[color-mix(in_srgb,#f87171_40%,#2a3344)] bg-[color-mix(in_srgb,#f87171_10%,#171c26)] px-3 py-2 text-sm text-[#fca5a5]">
            That reset link is invalid or expired. Request a new one below.
          </p>
        ) : null}

        <ForgotPasswordForm />

        <p className="mt-6 text-center text-sm text-[#8b95a8]">
          Remembered your password?{" "}
          <Link href="/auth/login" className="font-semibold text-[#6ee7b7] underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
