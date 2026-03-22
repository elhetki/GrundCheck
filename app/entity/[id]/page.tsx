import { notFound } from 'next/navigation';
import Link from 'next/link';
import { XCircle, AlertTriangle, Check } from 'lucide-react';
import RiskBadge from '@/components/RiskBadge';
import WatchlistButton from '@/components/WatchlistButton';
import { runQuery } from '@/lib/neo4j';
import { calculateRiskScore } from '@/lib/risk-score';
import type { EntityDetail, RelatedEntity, RiskFactor } from '@/lib/types';

interface EntityPageProps {
  params: Promise<{ id: string }>;
}

function formatRelationship(rel: string, props: Record<string, unknown>): string {
  switch (rel) {
    case 'OWNED_BY': return 'Eigentümer';
    case 'HAS_GF': return props.until ? `Ex-GF (bis ${String(props.until).slice(0, 7)})` : 'Geschäftsführer';
    case 'HAS_SHAREHOLDER': return props.share_pct ? `Gesellschafter (${props.share_pct}%)` : 'Gesellschafter';
    case 'INVOLVED_IN': return 'Insolvenzverfahren';
    case 'SUBSIDIARY_OF': return 'Tochtergesellschaft von';
    default: return rel;
  }
}

function formatIncomingRelationship(rel: string): string {
  switch (rel) {
    case 'OWNED_BY': return 'Besitzt Liegenschaft';
    case 'HAS_GF': return 'GF bei';
    case 'HAS_SHAREHOLDER': return 'Gesellschafter bei';
    case 'SUBSIDIARY_OF': return 'Muttergesellschaft von';
    default: return rel;
  }
}

function buildFacts(type: string, props: Record<string, unknown>): Array<{ label: string; value: string }> {
  if (type === 'company') {
    return [
      { label: 'Rechtsform', value: String(props.legal_form ?? '—') },
      { label: 'Firmenbuchnummer', value: `FN ${String(props.fn_number ?? '—')}` },
      { label: 'Eingetragen seit', value: String(props.registered_since ?? '—').slice(0, 10) },
      { label: 'Status', value: String(props.status ?? '—') },
    ];
  }
  if (type === 'property') {
    return [
      { label: 'PLZ', value: String(props.plz ?? '—') },
      { label: 'Bezirk', value: `${String(props.bezirk ?? '—')}. Bezirk` },
      { label: 'Einlagezahl (EZ)', value: String(props.ez ?? '—') },
      { label: 'Katastralgemeinde', value: String(props.kg ?? '—') },
      { label: 'Eigentumsblatt (A)', value: String(props.blatt_a ?? '—') },
    ];
  }
  return [
    { label: 'Geburtsjahr', value: String(props.birth_year ?? '—') },
    { label: 'Rollen', value: (props.roles as string[] | undefined)?.join(', ') ?? '—' },
  ];
}

function buildSubtitle(type: string, props: Record<string, unknown>): string {
  if (type === 'company') return `${String(props.legal_form ?? '')} · FN ${String(props.fn_number ?? '')}`;
  if (type === 'property') return `${String(props.bezirk ?? '')}. Bezirk, ${String(props.plz ?? '')} Wien`;
  return `Geb. ${String(props.birth_year ?? '')}`;
}

function estimateAgeMonths(dateStr: string): number | null {
  if (!dateStr) return null;
  try {
    const registered = new Date(dateStr);
    return Math.floor((Date.now() - registered.getTime()) / (1000 * 60 * 60 * 24 * 30));
  } catch {
    return null;
  }
}

async function fetchEntityDirect(id: string): Promise<EntityDetail | null> {
  try {
    const records = await runQuery(
      `
      MATCH (n {id: $id})
      OPTIONAL MATCH (n)-[r]->(related)
      OPTIONAL MATCH (n)<-[rin]-(relatedIn)
      RETURN n, labels(n) AS nodeLabels,
             collect(DISTINCT {rel: type(r), node: related, props: properties(r)}) AS outgoing,
             collect(DISTINCT {rel: type(rin), node: relatedIn}) AS incoming
      LIMIT 1
      `,
      { id }
    );

    if (records.length === 0) return null;

    const record = records[0] as {
      n: { properties: Record<string, unknown> };
      nodeLabels: string[];
      outgoing: Array<{ rel: string; node: { labels: string[]; properties: Record<string, unknown> }; props: Record<string, unknown> }>;
      incoming: Array<{ rel: string; node: { labels: string[]; properties: Record<string, unknown> } }>;
    };

    const props = record.n.properties;
    const labels = record.nodeLabels;

    const type = labels.includes('Company')
      ? 'company'
      : labels.includes('Property')
      ? 'property'
      : 'person';

    const related: RelatedEntity[] = [];

    for (const { rel, node, props: relProps } of record.outgoing) {
      if (!node?.properties?.id) continue;
      const relType = node.labels?.includes('Company')
        ? 'company'
        : node.labels?.includes('Property')
        ? 'property'
        : 'person';
      related.push({
        id: String(node.properties.id),
        type: relType as 'company' | 'property' | 'person',
        name: String(node.properties.name ?? node.properties.address ?? ''),
        relationship: formatRelationship(rel, relProps),
      });
    }

    for (const { rel, node } of record.incoming) {
      if (!node?.properties?.id) continue;
      const relType = node.labels?.includes('Company')
        ? 'company'
        : node.labels?.includes('Property')
        ? 'property'
        : 'person';
      related.push({
        id: String(node.properties.id),
        type: relType as 'company' | 'property' | 'person',
        name: String(node.properties.name ?? node.properties.address ?? ''),
        relationship: formatIncomingRelationship(rel),
      });
    }

    const hasInsolvency = record.outgoing.some((o) => o.rel === 'INVOLVED_IN');
    const gfChange = record.outgoing
      .filter((o) => o.rel === 'HAS_GF' && o.props?.until)
      .map((o) => {
        const until = new Date(String(o.props.until));
        return Math.floor((Date.now() - until.getTime()) / (1000 * 60 * 60 * 24 * 30));
      })
      .sort((a, b) => a - b)[0] ?? null;

    const riskResult = calculateRiskScore({
      hasInsolvency,
      gfChangedMonthsAgo: gfChange,
      companyAgeMonths: type === 'company' ? estimateAgeMonths(String(props.registered_since ?? '')) : null,
      shellLayers: record.outgoing.filter((o) => o.rel === 'SUBSIDIARY_OF').length,
      hasJahresabschluss: true,
      registeredAddress: String(props.address ?? ''),
    });

    const facts = buildFacts(type, props);

    return {
      id,
      type: type as 'company' | 'property' | 'person',
      name: String(props.name ?? props.address ?? ''),
      subtitle: buildSubtitle(type, props),
      riskScore: riskResult.score,
      riskLabel: riskResult.label,
      facts,
      riskFactors: riskResult.factors as RiskFactor[],
      related: related.slice(0, 12),
    };
  } catch {
    return null;
  }
}

export default async function EntityPage({ params }: EntityPageProps) {
  const { id } = await params;
  const entity = await fetchEntityDirect(id);

  if (!entity) notFound();

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted" style={{ color: 'var(--text-muted)' }}>
        <Link href="/" className="hover:underline">Startseite</Link>
        {' / '}
        <span className="text-primary" style={{ color: 'var(--text)' }}>{entity.name}</span>
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
          <h1 className="text-3xl font-bold text-primary" style={{ color: 'var(--text)' }}>
            {entity.name}
          </h1>
          {entity.subtitle && (
            <p className="mt-1 text-sm text-muted" style={{ color: 'var(--text-muted)' }}>
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
          className="rounded-xl p-6 border bg-surface border-default"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h2 className="font-semibold mb-4 text-primary" style={{ color: 'var(--text)' }}>Stammdaten</h2>
          <dl className="space-y-3">
            {entity.facts.map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-sm text-muted" style={{ color: 'var(--text-muted)' }}>{label}</dt>
                <dd className="text-sm font-medium text-right text-primary" style={{ color: 'var(--text)' }}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Risk breakdown */}
        <div
          className="rounded-xl p-6 border bg-surface border-default"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h2 className="font-semibold mb-4 text-primary" style={{ color: 'var(--text)' }}>Risikofaktoren</h2>
          {entity.riskFactors.length === 0 ? (
            <p className="text-sm flex items-center gap-2" style={{ color: 'var(--green)' }}>
              <Check className="w-4 h-4 shrink-0" />
              Keine auffälligen Risikofaktoren gefunden.
            </p>
          ) : (
            <ul className="space-y-2">
              {entity.riskFactors.map((factor) => (
                <li
                  key={factor.label}
                  className="flex items-start gap-3 text-sm rounded-lg p-3 bg-surface-2"
                  style={{ background: 'var(--surface-2)' }}
                >
                  <span className="shrink-0 mt-0.5" style={{ color: factor.severity === 'high' ? 'var(--red)' : 'var(--amber)' }}>
                    {factor.severity === 'high'
                      ? <XCircle className="w-4 h-4" />
                      : <AlertTriangle className="w-4 h-4" />}
                  </span>
                  <span className="text-primary" style={{ color: 'var(--text)' }}>{factor.label}</span>
                  <span className="ml-auto font-mono text-muted" style={{ color: 'var(--text-muted)' }}>
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
            className="col-span-2 rounded-xl p-6 border bg-surface border-default"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <h2 className="font-semibold mb-4 text-primary" style={{ color: 'var(--text)' }}>Verbundene Entitäten</h2>
            <div className="grid grid-cols-3 gap-3">
              {entity.related.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/entity/${rel.id}`}
                  className="rounded-lg p-4 border transition-colors hover:border-[var(--accent)] bg-surface-2 border-default"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                >
                  <div className="text-xs mb-1 text-muted" style={{ color: 'var(--text-muted)' }}>
                    {rel.relationship}
                  </div>
                  <div className="font-medium text-sm text-primary" style={{ color: 'var(--text)' }}>
                    {rel.name}
                  </div>
                  <div className="text-xs mt-1 text-muted" style={{ color: 'var(--text-muted)' }}>
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
