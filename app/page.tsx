'use client';

import { useRouter } from 'next/navigation';
import { Landmark, Network, Brain, ShieldAlert, FileText, Bell } from 'lucide-react';
import SearchBar from '@/components/SearchBar';

const FEATURES = [
  {
    icon: <Landmark className="w-6 h-6" />,
    title: 'Grundbuch-Daten',
    desc: 'Eigentümer, Lasten, Pfandrechte — aus dem Grundbuch aggregiert.',
  },
  {
    icon: <Network className="w-6 h-6" />,
    title: 'Beteiligungsgraph',
    desc: 'Interaktive Visualisierung der vollständigen Eigentümerkette.',
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: 'KI-Suche',
    desc: 'Natürlichsprachliche Anfragen auf Deutsch — kein SQL nötig.',
  },
  {
    icon: <ShieldAlert className="w-6 h-6" />,
    title: 'Risiko-Score',
    desc: 'LOW / MEDIUM / HIGH basierend auf Insolvenzen, GF-Wechseln, Mantelgesellschaften.',
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Firmenbuch',
    desc: 'Gesellschafter, Geschäftsführer, Kapital und Status auf einen Blick.',
  },
  {
    icon: <Bell className="w-6 h-6" />,
    title: 'Watchlist',
    desc: 'Entitäten beobachten und über Änderungen benachrichtigt werden.',
  },
];

const EXAMPLE_QUERIES = [
  'Wem gehört Neubaugasse 42?',
  'Ist die Firma hinter Kärntner Straße 12 sauber?',
  'Firmen von Thomas Müller',
  'Liegenschaften im 1. Bezirk',
];

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-24">
        <div className="max-w-3xl w-full text-center">
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-6 border"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--accent)',
            }}
          >
            Hackathon MVP · Nur Demo-Daten
          </div>

          <h1 className="text-5xl font-bold mb-4 tracking-tight text-primary" style={{ color: 'var(--text)' }}>
            Wem gehört{' '}
            <span style={{ color: 'var(--accent)' }}>Österreich?</span>
          </h1>

          <p className="text-lg mb-10 text-muted" style={{ color: 'var(--text-muted)' }}>
            Gib eine Adresse oder einen Firmennamen ein. GrundCheck zeigt dir den Eigentümer,
            die Beteiligungsstruktur und einen Risiko-Score — in unter 10 Sekunden.
          </p>

          <SearchBar />

          {/* Example queries */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                className="px-3 py-1.5 rounded-lg text-sm border transition-colors hover:border-[var(--accent)]"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-muted)',
                }}
                onClick={() => router.push(`/search?q=${encodeURIComponent(q)}`)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-5xl mx-auto w-full px-6 pb-24 grid grid-cols-3 gap-6">
        {FEATURES.map(({ icon, title, desc }) => (
          <div
            key={title}
            className="rounded-xl p-6 border bg-surface border-default"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="mb-3" style={{ color: 'var(--accent)' }}>{icon}</div>
            <h3 className="font-semibold mb-2 text-primary" style={{ color: 'var(--text)' }}>
              {title}
            </h3>
            <p className="text-sm text-muted" style={{ color: 'var(--text-muted)' }}>
              {desc}
            </p>
          </div>
        ))}
      </section>

      {/* Roadmap teaser */}
      <section
        className="mx-6 mb-16 rounded-xl p-8 border max-w-5xl mx-auto w-full bg-surface border-default"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-xl font-semibold mb-2 text-primary" style={{ color: 'var(--text)' }}>
          Roadmap
        </h2>
        <p className="text-sm mb-4 text-muted" style={{ color: 'var(--text-muted)' }}>
          Geplante Features nach dem Hackathon:
        </p>
        <ul className="text-sm space-y-1 text-muted" style={{ color: 'var(--text-muted)' }}>
          <li>• Live-Anbindung Firmenbuch API (Justizministerium)</li>
          <li>• Live-Anbindung Grundbuch Online (Österreichisches Grundbuch)</li>
          <li>• ESG-Modul: Nachhaltigkeitsbewertung von Immobilienportfolios</li>
          <li>• Automatisches Monitoring & E-Mail-Alerts</li>
          <li>• API für Anwälte und Steuerberater</li>
          <li>• Ediktsdatei & GISA Integration</li>
        </ul>
      </section>
    </main>
  );
}
