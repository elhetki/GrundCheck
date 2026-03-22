'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SearchBarProps {
  defaultValue?: string;
}

export function SearchBar({ defaultValue = '' }: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    setLoading(true);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto">
      <div
        className="flex items-center rounded-xl border overflow-hidden"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <span className="pl-4 text-xl select-none" style={{ color: 'var(--text-muted)' }}>
          🔍
        </span>
        <input
          name="q"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Wem gehört Neubaugasse 42? Oder: Ist Muster GmbH sauber?"
          className="flex-1 bg-transparent px-4 py-4 text-base outline-none placeholder:opacity-60"
          style={{ color: 'var(--text)' }}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="mr-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#fff' }} />
              …
            </span>
          ) : (
            'Suchen'
          )}
        </button>
      </div>
    </form>
  );
}

export default SearchBar;
