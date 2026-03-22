import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j';
import { calculateRiskScore } from '@/lib/risk-score';
import type { EntityDetail, RelatedEntity, RiskFactor } from '@/lib/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { id } = await params;

  try {
    // Fetch the entity and its direct relationships
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

    if (records.length === 0) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const record = records[0] as {
      n: { properties: Record<string, unknown> };
      nodeLabels: string[];
      outgoing: Array<{ rel: string; node: { labels: string[]; properties: Record<string, unknown> }; props: Record<string, unknown> }>;
      incoming: Array<{ rel: string; node: { labels: string[]; properties: Record<string, unknown> } }>;
    };

    const props = record.n.properties;
    const labels = record.nodeLabels;

    // Determine entity type
    const type = labels.includes('Company')
      ? 'company'
      : labels.includes('Property')
      ? 'property'
      : 'person';

    // Build related entities list
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

    // Calculate risk score
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
      hasJahresabschluss: true, // mock
      registeredAddress: String(props.address ?? ''),
    });

    // Build fact list
    const facts = buildFacts(type, props);

    const detail: EntityDetail = {
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

    return NextResponse.json(detail);
  } catch (err) {
    console.error('[/api/entity/:id] Error:', err);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
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
