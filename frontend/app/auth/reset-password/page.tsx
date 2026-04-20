import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = {
  title: "Set new password — Jam Session",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0f1218] bg-[radial-gradient(1200px_600px_at_10%_-10%,#1a2435_0%,#0f1218_55%)] px-4 py-10 text-[#e8ecf4]">
      <div className="w-full max-w-md rounded-xl border border-[#2a3344] bg-[#171c26] p-8 shadow-xl">
        <h1 className="text-xl font-bold tracking-tight">Set a new password</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#8b95a8]">
          This page is opened from your email reset link. Choose a new password to continue.
        </p>

        <ResetPasswordForm />

        <p className="mt-6 text-center text-sm text-[#8b95a8]">
          Didn&apos;t receive a valid link?{" "}
          <Link href="/auth/forgot-password" className="font-semibold text-[#6ee7b7] underline-offset-2 hover:underline">
            Request another reset email
          </Link>
        </p>
      </div>
    </div>
  );
}
