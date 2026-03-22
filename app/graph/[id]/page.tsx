import { notFound } from 'next/navigation';
import Link from 'next/link';
import OwnershipGraph from '@/components/OwnershipGraph';
import type { GraphData } from '@/lib/types';

interface GraphPageProps {
  params: Promise<{ id: string }>;
}

async function fetchGraphData(id: string): Promise<GraphData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/graph/${id}`, {
      next: { revalidate: 60 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<GraphData>;
  } catch {
    return null;
  }
}

export default async function GraphPage({ params }: GraphPageProps) {
  const { id } = await params;
  const graphData = await fetchGraphData(id);

  if (!graphData) notFound();

  return (
    <main className="h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Toolbar */}
      <header
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href={`/entity/${id}`}
            className="text-sm border px-3 py-1.5 rounded-lg transition-colors hover:border-[var(--accent)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            ← Zurück
          </Link>
          <h1 className="font-semibold" style={{ color: 'var(--text)' }}>
            Beteiligungsgraph: {graphData.rootName}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{graphData.nodes.length} Knoten</span>
          <span>·</span>
          <span>{graphData.links.length} Verbindungen</span>
        </div>
      </header>

      {/* Full-screen graph */}
      <div className="flex-1">
        <OwnershipGraph data={graphData} />
      </div>

      {/* Legend */}
      <div
        className="flex items-center gap-6 px-6 py-3 border-t text-xs"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: 'var(--accent)' }} />
          Unternehmen
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: 'var(--cyan)' }} />
          Liegenschaft
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: 'var(--green)' }} />
          Person
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: 'var(--red)' }} />
          Insolvenz
        </div>
      </div>
    </main>
  );
}
