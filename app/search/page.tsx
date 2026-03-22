import { Suspense } from 'react';
import { AlertTriangle } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import EntityCard from '@/components/EntityCard';
import { naturalLanguageToCypher } from '@/lib/ai';
import { runQuery } from '@/lib/neo4j';
import { calculateRiskScore, scoreToLabel } from '@/lib/risk-score';
import type { SearchResult } from '@/lib/types';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

function estimateAgeMonths(dateStr: string): number | null {
  if (!dateStr) return null;
  try {
    const registered = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - registered.getTime()) / (1000 * 60 * 60 * 24 * 30));
  } catch {
    return null;
  }
}

function transformRecords(records: Record<string, unknown>[]): SearchResult[] {
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const record of records) {
    for (const [, value] of Object.entries(record)) {
      const node = value as { labels?: string[]; properties?: Record<string, unknown> } | null;
      if (!node || !node.labels || !node.properties) continue;

      const props = node.properties;
      const id = String(props.id ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);

      if (node.labels.includes('Company')) {
        const riskResult = calculateRiskScore({
          hasInsolvency: false,
          gfChangedMonthsAgo: null,
          companyAgeMonths: estimateAgeMonths(String(props.registered_since ?? '')),
          shellLayers: 0,
          hasJahresabschluss: true,
          registeredAddress: '',
        });

        results.push({
          id,
          type: 'company',
          name: String(props.name ?? ''),
          subtitle: `${String(props.legal_form ?? '')} · FN ${String(props.fn_number ?? '')}`,
          riskScore: riskResult.score,
          riskLabel: riskResult.label,
          highlights: [
            `Status: ${String(props.status ?? '')}`,
            `Seit: ${String(props.registered_since ?? '').slice(0, 4)}`,
          ],
        });
      } else if (node.labels.includes('Property')) {
        results.push({
          id,
          type: 'property',
          name: String(props.address ?? ''),
          subtitle: `${String(props.bezirk ?? '')}. Bezirk, ${String(props.plz ?? '')} Wien`,
          riskScore: 0,
          riskLabel: scoreToLabel(0),
          highlights: [
            `EZ: ${String(props.ez ?? '')}`,
            `KG: ${String(props.kg ?? '')}`,
          ],
        });
      } else if (node.labels.includes('Person')) {
        results.push({
          id,
          type: 'person',
          name: String(props.name ?? ''),
          subtitle: `Geb. ${String(props.birth_year ?? '')}`,
          riskScore: 0,
          riskLabel: scoreToLabel(0),
          highlights: (props.roles as string[] | undefined)?.slice(0, 2) ?? [],
        });
      }
    }
  }

  return results.slice(0, 20);
}

async function SearchResults({ query }: { query: string }) {
  let results: SearchResult[] = [];
  let error: string | null = null;
  let partial = false;

  try {
    const { cypher, params } = await naturalLanguageToCypher(query);
    const rawRecords = await runQuery(cypher, params);
    results = transformRecords(rawRecords);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      partial = true;
    } else {
      error = err instanceof Error ? err.message : 'Unbekannter Fehler';
    }
  }

  if (partial) {
    error = 'Teilweise Ergebnisse — KI-Antwort hat die Zeitgrenze überschritten.';
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
      <div className="text-center py-16 text-muted" style={{ color: 'var(--text-muted)' }}>
        Keine Ergebnisse für „{query}" gefunden.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm border flex items-center gap-2"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--amber)', color: 'var(--amber)' }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
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
          <p className="text-sm mb-6 text-muted" style={{ color: 'var(--text-muted)' }}>
            Suchergebnisse für:{' '}
            <span className="text-primary" style={{ color: 'var(--text)' }}>„{query}"</span>
          </p>
          <Suspense
            fallback={
              <div className="flex items-center gap-3 py-8 text-muted" style={{ color: 'var(--text-muted)' }}>
                <div className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
                KI analysiert Anfrage…
              </div>
            }
          >
            <SearchResults query={query} />
          </Suspense>
        </>
      ) : (
        <div className="text-center py-16 text-muted" style={{ color: 'var(--text-muted)' }}>
          Bitte gib eine Suchanfrage ein.
        </div>
      )}
    </main>
  );
}
