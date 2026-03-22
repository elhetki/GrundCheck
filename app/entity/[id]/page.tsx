import { notFound } from 'next/navigation';
import Link from 'next/link';
import RiskBadge from '@/components/RiskBadge';
import WatchlistButton from '@/components/WatchlistButton';
import type { EntityDetail } from '@/lib/types';

interface EntityPageProps {
  params: Promise<{ id: string }>;
}

async function fetchEntity(id: string): Promise<EntityDetail | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/entity/${id}`, {
      next: { revalidate: 60 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<EntityDetail>;
  } catch {
    return null;
  }
}

export default async function EntityPage({ params }: EntityPageProps) {
  const { id } = await params;
  const entity = await fetchEntity(id);

  if (!entity) notFound();

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
        <Link href="/" className="hover:underline">Startseite</Link>
        {' / '}
        <span style={{ color: 'var(--text)' }}>{entity.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span
              className="text-xs px-2 py-0.5 rounded border"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {entity.type === 'company' ? 'Unternehmen' : entity.type === 'property' ? 'Liegenschaft' : 'Person'}
            </span>
            <RiskBadge score={entity.riskScore} />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
            {entity.name}
          </h1>
          {entity.subtitle && (
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {entity.subtitle}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <WatchlistButton entityId={id} entityName={entity.name} />
          <Link
            href={`/graph/${id}`}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Beteiligungsgraph →
          </Link>
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Key-value facts */}
        <div
          className="rounded-xl p-6 border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Stammdaten</h2>
          <dl className="space-y-3">
            {entity.facts.map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</dt>
                <dd className="text-sm font-medium text-right" style={{ color: 'var(--text)' }}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Risk breakdown */}
        <div
          className="rounded-xl p-6 border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Risikofaktoren</h2>
          {entity.riskFactors.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--green)' }}>
              ✓ Keine auffälligen Risikofaktoren gefunden.
            </p>
          ) : (
            <ul className="space-y-2">
              {entity.riskFactors.map((factor) => (
                <li
                  key={factor.label}
                  className="flex items-start gap-3 text-sm rounded-lg p-3"
                  style={{ background: 'var(--surface-2)' }}
                >
                  <span style={{ color: factor.severity === 'high' ? 'var(--red)' : 'var(--amber)' }}>
                    {factor.severity === 'high' ? '⛔' : '⚠️'}
                  </span>
                  <span style={{ color: 'var(--text)' }}>{factor.label}</span>
                  <span className="ml-auto font-mono" style={{ color: 'var(--text-muted)' }}>
                    +{factor.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Related entities */}
        {entity.related.length > 0 && (
          <div
            className="col-span-2 rounded-xl p-6 border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <h2 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Verbundene Entitäten</h2>
            <div className="grid grid-cols-3 gap-3">
              {entity.related.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/entity/${rel.id}`}
                  className="rounded-lg p-4 border transition-colors hover:border-[var(--accent)]"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                >
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    {rel.relationship}
                  </div>
                  <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                    {rel.name}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {rel.type === 'company' ? 'Unternehmen' : rel.type === 'property' ? 'Liegenschaft' : 'Person'}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
