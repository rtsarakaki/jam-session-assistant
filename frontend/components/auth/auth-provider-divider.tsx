/** Visual separator between OAuth and email/password flows. */
export function AuthProviderDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-[#2a3344]" />
      </div>
      <div className="relative flex justify-center text-xs font-medium uppercase tracking-wide text-[#8b95a8]">
        <span className="bg-[#171c26] px-2">ou</span>
      </div>
    </div>
  );
}
