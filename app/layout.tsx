import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GrundCheck.at — Österreichische Immobilien- & Unternehmensrecherche',
  description:
    'Wer besitzt welches Grundstück? Wer steckt hinter welchem Unternehmen? GrundCheck gibt die Antwort in Sekunden.',
  keywords: ['Grundbuch', 'Firmenbuch', 'Österreich', 'Eigentümer', 'Transparenz'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={inter.className} style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        {children}
        <footer className="border-t mt-16 py-6 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <p>
            ⚠️ Dies ist keine Rechtsberatung. Alle Informationen ohne Gewähr.
          </p>
          <p className="mt-1">
            © 2025 GrundCheck.at — Hackathon MVP
          </p>
        </footer>
      </body>
    </html>
  );
}
