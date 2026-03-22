export default function Loading() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="h-14 rounded-xl bg-[var(--surface)] animate-pulse mb-8" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-[var(--surface)] animate-pulse" />
        ))}
      </div>
    </main>
  );
}
