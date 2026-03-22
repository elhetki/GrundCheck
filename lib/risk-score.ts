import type { RiskFactor } from './types';

export type RiskLabel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiskScoreResult {
  score: number;
  label: RiskLabel;
  factors: RiskFactor[];
}

// Known mass-registration addresses in Vienna (simplified list for demo)
const MASS_REGISTRATION_ADDRESSES = [
  'Schottengasse 1',
  'Wipplingerstraße 30',
  'Mariahilfer Straße 1',
  'Favoritenstraße 7',
  'Hernalser Hauptstraße 28',
];

interface RiskInput {
  hasInsolvency: boolean;
  gfChangedMonthsAgo: number | null; // null = no change
  companyAgeMonths: number | null;   // null = unknown
  shellLayers: number;               // 0 = no nesting, 1+ = shell layers
  hasJahresabschluss: boolean;
  registeredAddress: string;
}

/**
 * Calculate a risk score (0–100) and return the factors that contributed.
 * Score bands: LOW 0–30, MEDIUM 31–60, HIGH 61–100.
 */
export function calculateRiskScore(input: RiskInput): RiskScoreResult {
  const factors: RiskFactor[] = [];
  let score = 0;

  if (input.hasInsolvency) {
    score += 30;
    factors.push({
      label: 'Insolvenzverfahren für verbundene Person oder Unternehmen',
      points: 30,
      severity: 'high',
    });
  }

  if (input.gfChangedMonthsAgo !== null && input.gfChangedMonthsAgo <= 12) {
    score += 20;
    factors.push({
      label: `Geschäftsführerwechsel vor ${input.gfChangedMonthsAgo} Monaten`,
      points: 20,
      severity: 'medium',
    });
  }

  if (input.companyAgeMonths !== null && input.companyAgeMonths < 24) {
    score += 15;
    factors.push({
      label: `Unternehmen jünger als 2 Jahre (${input.companyAgeMonths} Monate alt)`,
      points: 15,
      severity: 'medium',
    });
  }

  if (input.shellLayers > 0) {
    const shellPoints = input.shellLayers * 10;
    score += shellPoints;
    factors.push({
      label: `${input.shellLayers} verschachtelte Gesellschaftsebene(n)`,
      points: shellPoints,
      severity: input.shellLayers >= 2 ? 'high' : 'medium',
    });
  }

  if (!input.hasJahresabschluss) {
    score += 15;
    factors.push({
      label: 'Kein Jahresabschluss im Firmenbuch hinterlegt',
      points: 15,
      severity: 'medium',
    });
  }

  const isMassAddress = MASS_REGISTRATION_ADDRESSES.some((addr) =>
    input.registeredAddress.toLowerCase().includes(addr.toLowerCase())
  );
  if (isMassAddress) {
    score += 10;
    factors.push({
      label: 'Massenregistrierungsadresse',
      points: 10,
      severity: 'medium',
    });
  }

  const clampedScore = Math.min(100, score);

  return {
    score: clampedScore,
    label: scoreToLabel(clampedScore),
    factors,
  };
}

export function scoreToLabel(score: number): RiskLabel {
  if (score <= 30) return 'LOW';
  if (score <= 60) return 'MEDIUM';
  return 'HIGH';
}
