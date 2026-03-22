import { Suspense } from 'react';
import SearchBar from '@/components/SearchBar';
import EntityCard from '@/components/EntityCard';
import type { SearchResult } from '@/lib/types';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

async function SearchResults({ query }: { query: string }) {
  let results: SearchResult[] = [];
  let error: string | null = null;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(
      `${baseUrl}/api/search?q=${encodeURIComponent(query)}`,
      {
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(12_000),
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { results: SearchResult[]; partial?: boolean };
    results = data.results;

    if (data.partial) {
      error = 'Teilweise Ergebnisse — KI-Antwort hat die Zeitgrenze überschritten.';
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unbekannter Fehler';
  }

  if (error && results.length === 0) {
    return (
      <div
        className="rounded-xl p-6 border text-sm"
        style={{ background: 'var(--surface)', borderColor: 'var(--red)', color: 'var(--red)' }}
      >
        Fehler: {error}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
        Keine Ergebnisse für „{query}" gefunden.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm border"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--amber)', color: 'var(--amber)' }}
        >
          ⚠️ {error}
        </div>
      )}
      {results.map((result) => (
        <EntityCard key={`${result.type}-${result.id}`} entity={result} />
      ))}
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q: query = '' } = await searchParams;

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <SearchBar defaultValue={query} />
      </div>

      {query ? (
        <>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Suchergebnisse für:{' '}
            <span style={{ color: 'var(--text)' }}>„{query}"</span>
          </p>
          <Suspense
            fallback={
              <div className="flex items-center gap-3 py-8" style={{ color: 'var(--text-muted)' }}>
                <div className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
                KI analysiert Anfrage…
              </div>
            }
          >
            <SearchResults query={query} />
          </Suspense>
        </>
      ) : (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          Bitte gib eine Suchanfrage ein.
        </div>
      )}
    </main>
  );
}
