import Link from 'next/link';
import RiskBadge from './RiskBadge';
import type { SearchResult } from '@/lib/types';

const TYPE_ICON: Record<string, string> = {
  company: '🏢',
  property: '🏠',
  person: '👤',
};

const TYPE_LABEL: Record<string, string> = {
  company: 'Unternehmen',
  property: 'Liegenschaft',
  person: 'Person',
};

interface EntityCardProps {
  entity: SearchResult;
}

export function EntityCard({ entity }: EntityCardProps) {
  return (
    <Link
      href={`/entity/${entity.id}`}
      className="block rounded-xl border p-5 transition-colors hover:border-[var(--accent)] group"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-2xl mt-0.5 shrink-0">{TYPE_ICON[entity.type]}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs px-1.5 py-0.5 rounded border"
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                {TYPE_LABEL[entity.type]}
              </span>
            </div>
            <h3
              className="font-semibold text-base truncate group-hover:underline"
              style={{ color: 'var(--text)' }}
            >
              {entity.name}
            </h3>
            {entity.subtitle && (
              <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                {entity.subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <RiskBadge score={entity.riskScore} />
        </div>
      </div>

      {entity.highlights.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {entity.highlights.map((h) => (
            <span
              key={h}
              className="text-xs px-2 py-1 rounded"
              style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
            >
              {h}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs" style={{ color: 'var(--accent)' }}>
        Details & Beteiligungsgraph →
      </div>
    </Link>
  );
}

export default EntityCard;
