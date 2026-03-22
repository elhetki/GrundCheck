import SearchBar from '@/components/SearchBar';

export default function HomePage() {
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

          <h1 className="text-5xl font-bold mb-4 tracking-tight" style={{ color: 'var(--text)' }}>
            Wem gehört{' '}
            <span style={{ color: 'var(--accent)' }}>Österreich?</span>
          </h1>

          <p className="text-lg mb-10" style={{ color: 'var(--text-muted)' }}>
            Gib eine Adresse oder einen Firmennamen ein. GrundCheck zeigt dir den Eigentümer,
            die Beteiligungsstruktur und einen Risiko-Score — in unter 10 Sekunden.
          </p>

          <SearchBar />

          {/* Example queries */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {[
              'Wem gehört Neubaugasse 42?',
              'Ist die Firma hinter Kärntner Straße 12 sauber?',
              'Firmen von Thomas Müller',
              'Liegenschaften im 1. Bezirk',
            ].map((q) => (
              <button
                key={q}
                className="px-3 py-1.5 rounded-lg text-sm border transition-colors hover:border-[var(--accent)]"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-muted)',
                }}
                onClick={() => {
                  // Handled by SearchBar via URL
                  const input = document.querySelector<HTMLInputElement>('input[name="q"]');
                  if (input) {
                    input.value = q;
                    input.form?.requestSubmit();
                  }
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-5xl mx-auto w-full px-6 pb-24 grid grid-cols-3 gap-6">
        {[
          {
            icon: '🏛️',
            title: 'Grundbuch-Daten',
            desc: 'Eigentümer, Lasten, Pfandrechte — aus dem Grundbuch aggregiert.',
          },
          {
            icon: '🕸️',
            title: 'Beteiligungsgraph',
            desc: 'Interaktive Visualisierung der vollständigen Eigentümerkette.',
          },
          {
            icon: '🔎',
            title: 'KI-Suche',
            desc: 'Natürlichsprachliche Anfragen auf Deutsch — kein SQL nötig.',
          },
          {
            icon: '⚠️',
            title: 'Risiko-Score',
            desc: 'LOW / MEDIUM / HIGH basierend auf Insolvenzen, GF-Wechseln, Mantelgesellschaften.',
          },
          {
            icon: '📋',
            title: 'Firmenbuch',
            desc: 'Gesellschafter, Geschäftsführer, Kapital und Status auf einen Blick.',
          },
          {
            icon: '🔔',
            title: 'Watchlist',
            desc: 'Entitäten beobachten und über Änderungen benachrichtigt werden.',
          },
        ].map(({ icon, title, desc }) => (
          <div
            key={title}
            className="rounded-xl p-6 border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="text-2xl mb-3">{icon}</div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>
              {title}
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {desc}
            </p>
          </div>
        ))}
      </section>

      {/* Roadmap teaser */}
      <section
        className="mx-6 mb-16 rounded-xl p-8 border max-w-5xl mx-auto w-full"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
          Roadmap
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Geplante Features nach dem Hackathon:
        </p>
        <ul className="text-sm space-y-1" style={{ color: 'var(--text-muted)' }}>
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
