export default function Loading() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <div className="h-8 w-48 rounded bg-[var(--surface-2)] animate-pulse mb-4" />
      <div className="h-12 w-96 rounded bg-[var(--surface-2)] animate-pulse mb-8" />
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 rounded-xl bg-[var(--surface)] animate-pulse" />
        <div className="h-64 rounded-xl bg-[var(--surface)] animate-pulse" />
      </div>
    </main>
  );
}
