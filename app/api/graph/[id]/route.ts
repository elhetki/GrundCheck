import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j';
import type { GraphData, GraphNode, GraphLink } from '@/lib/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { id } = await params;

  try {
    // Fetch up to 3 hops from the root entity
    const records = await runQuery(
      `
      MATCH path = (root {id: $id})-[*0..3]-(connected)
      WITH root, relationships(path) AS rels, nodes(path) AS pathNodes
      UNWIND pathNodes AS n
      UNWIND rels AS r
      RETURN
        collect(DISTINCT {
          id: n.id,
          name: coalesce(n.name, n.address, n.case_number),
          labels: labels(n)
        }) AS nodes,
        collect(DISTINCT {
          source: startNode(r).id,
          target: endNode(r).id,
          label: type(r),
          weight: r.share_pct
        }) AS links,
        root.id AS rootId,
        coalesce(root.name, root.address) AS rootName
      LIMIT 1
      `,
      { id }
    );

    if (records.length === 0) {
      // If no relationships found, just return the single node
      const nodeRecords = await runQuery(
        `MATCH (n {id: $id}) RETURN n, labels(n) AS lbls LIMIT 1`,
        { id }
      );
      if (nodeRecords.length === 0) {
        return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
      }
      const nr = nodeRecords[0] as { n: { properties: Record<string, unknown> }; lbls: string[] };
      const graphData: GraphData = {
        rootId: id,
        rootName: String(nr.n.properties.name ?? nr.n.properties.address ?? id),
        nodes: [mapNode({ id, labels: nr.lbls, name: String(nr.n.properties.name ?? nr.n.properties.address ?? id) })],
        links: [],
      };
      return NextResponse.json(graphData);
    }

    const record = records[0] as {
      nodes: Array<{ id: unknown; name: unknown; labels: string[] }>;
      links: Array<{ source: unknown; target: unknown; label: string; weight?: number }>;
      rootId: unknown;
      rootName: unknown;
    };

    const nodes: GraphNode[] = record.nodes
      .filter((n) => n.id != null)
      .map((n) => mapNode({ id: String(n.id), labels: n.labels, name: String(n.name ?? '') }));

    const links: GraphLink[] = record.links
      .filter((l) => l.source != null && l.target != null)
      .map((l) => ({
        source: String(l.source),
        target: String(l.target),
        label: l.label,
        weight: l.weight,
      }));

    const graphData: GraphData = {
      rootId: String(record.rootId),
      rootName: String(record.rootName ?? ''),
      nodes,
      links,
    };

    return NextResponse.json(graphData);
  } catch (err) {
    console.error('[/api/graph/:id] Error:', err);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

function mapNode(raw: { id: string; labels: string[]; name: string }): GraphNode {
  const type = raw.labels.includes('Company')
    ? 'company'
    : raw.labels.includes('Property')
    ? 'property'
    : raw.labels.includes('Insolvency')
    ? 'insolvency'
    : 'person';

  return { id: raw.id, name: raw.name, type };
}
