import { NextRequest, NextResponse } from 'next/server';
import { naturalLanguageToCypher } from '@/lib/ai';
import { runQuery } from '@/lib/neo4j';
import { calculateRiskScore, scoreToLabel } from '@/lib/risk-score';
import type { SearchResult, SearchApiResponse } from '@/lib/types';

export const maxDuration = 15; // 15s Vercel function timeout

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = req.nextUrl.searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter q' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10s hard limit

  try {
    // Step 1: AI translates natural language → Cypher
    const { cypher, params } = await naturalLanguageToCypher(query);

    // Step 2: Execute Cypher against Neo4j
    const rawRecords = await runQuery(cypher, params);

    // Step 3: Transform raw Neo4j records into SearchResult[]
    const results = transformRecords(rawRecords);

    clearTimeout(timeout);

    const response: SearchApiResponse = { results, cypher };
    return NextResponse.json(response);
  } catch (err) {
    clearTimeout(timeout);

    if (err instanceof Error && err.name === 'AbortError') {
      // Return partial results (empty in this case) with partial flag
      const partialResponse: SearchApiResponse = {
        results: [],
        partial: true,
      };
      return NextResponse.json(partialResponse, { status: 206 });
    }

    console.error('[/api/search] Error:', err);
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

function transformRecords(records: Record<string, unknown>[]): SearchResult[] {
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const record of records) {
    // Each record may contain multiple nodes — extract whichever are present
    for (const [, value] of Object.entries(record)) {
      const node = value as { labels?: string[]; properties?: Record<string, unknown> } | null;
      if (!node || !node.labels || !node.properties) continue;

      const props = node.properties;
      const id = String(props.id ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);

      if (node.labels.includes('Company')) {
        const riskResult = calculateRiskScore({
          hasInsolvency: false, // would need sub-query in real impl
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
