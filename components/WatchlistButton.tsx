'use client';

import { useEffect, useState } from 'react';

interface WatchlistButtonProps {
  entityId: string;
  entityName: string;
}

export function WatchlistButton({ entityId, entityName }: WatchlistButtonProps) {
  const [isWatched, setIsWatched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check initial watchlist state
  useEffect(() => {
    fetch('/api/watchlist')
      .then((r) => r.json())
      .then((data: { items?: Array<{ entityId: string }> }) => {
        const items = data.items ?? [];
        setIsWatched(items.some((item) => item.entityId === entityId));
      })
      .catch(() => {/* ignore */});
  }, [entityId]);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId,
          entityName,
          entityType: 'company', // simplified for demo
        }),
      });
      const data = (await res.json()) as { action: string };
      setIsWatched(data.action === 'added');
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40"
      style={{
        background: isWatched ? 'var(--surface-2)' : 'var(--surface)',
        borderColor: isWatched ? 'var(--accent)' : 'var(--border)',
        color: isWatched ? 'var(--accent)' : 'var(--text-muted)',
      }}
    >
      {isWatched ? '🔔 Beobachtet' : '🔕 Beobachten'}
    </button>
  );
}

export default WatchlistButton;
