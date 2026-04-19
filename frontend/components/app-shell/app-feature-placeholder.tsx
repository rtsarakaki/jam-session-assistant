/** Minimal placeholder until the real feature UI exists. */
export function AppFeaturePlaceholder({ title }: { title: string }) {
  return (
    <main id="app-main" className="flex min-h-[40vh] flex-col items-center justify-center py-12 text-center">
      <h1 className="m-0 text-2xl font-bold tracking-tight text-[#6ee7b7]">{title}</h1>
    </main>
  );
}
