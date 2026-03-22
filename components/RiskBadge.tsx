import { scoreToLabel } from '@/lib/risk-score';

interface RiskBadgeProps {
  score: number;
}

const COLORS: Record<string, string> = {
  LOW: 'var(--green)',
  MEDIUM: 'var(--amber)',
  HIGH: 'var(--red)',
};

const LABELS: Record<string, string> = {
  LOW: 'Niedriges Risiko',
  MEDIUM: 'Mittleres Risiko',
  HIGH: 'Hohes Risiko',
};

export function RiskBadge({ score }: RiskBadgeProps) {
  const label = scoreToLabel(score);
  const color = COLORS[label];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
      style={{
        color,
        borderColor: color,
        background: `${color}1A`, // 10% opacity
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      {LABELS[label]} ({score})
    </span>
  );
}

export default RiskBadge;
