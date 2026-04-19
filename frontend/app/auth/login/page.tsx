import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0f1218] px-4 py-10 text-[#e8ecf4]">
      <div className="w-full max-w-md rounded-xl border border-[#2a3344] bg-[#171c26] p-8">
        <h1 className="text-xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-6">
          <Link href="/" className="text-sm font-semibold text-[#6ee7b7] underline-offset-2 hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
