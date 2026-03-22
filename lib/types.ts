// ─── Neo4j Node types ────────────────────────────────────────────────────────

export interface PropertyNode {
  id: string;
  address: string;
  plz: string;
  bezirk: string;
  ez: string;
  kg: string;
  blatt_a: string; // Eigentumsblatt
  blatt_b: string; // Lastenblatt
  blatt_c: string; // Pfandrechte
}

export interface CompanyNode {
  id: string;
  name: string;
  fn_number: string;
  legal_form: string; // GmbH, KG, AG, e.U., etc.
  registered_since: string; // ISO date string
  status: 'aktiv' | 'gelöscht' | 'insolvent';
}

export interface PersonNode {
  id: string;
  name: string;
  birth_year: number;
  roles: string[];
}

export interface InsolvencyNode {
  id: string;
  case_number: string;
  type: 'Sanierungsverfahren' | 'Konkursverfahren' | 'Schuldenregulierungsverfahren';
  date: string;
  court: string;
}

// ─── Search / API response types ─────────────────────────────────────────────

export type EntityType = 'property' | 'company' | 'person';

export interface SearchResult {
  id: string;
  type: EntityType;
  name: string;
  subtitle?: string;
  riskScore: number;
  riskLabel: 'LOW' | 'MEDIUM' | 'HIGH';
  highlights: string[]; // key facts to show in card
}

export interface RiskFactor {
  label: string;
  points: number;
  severity: 'medium' | 'high';
}

export interface RelatedEntity {
  id: string;
  type: EntityType;
  name: string;
  relationship: string; // e.g. "Eigentümer", "Gesellschafter (51%)", "Geschäftsführer"
}

export interface EntityDetail {
  id: string;
  type: EntityType;
  name: string;
  subtitle?: string;
  riskScore: number;
  riskLabel: 'LOW' | 'MEDIUM' | 'HIGH';
  facts: Array<{ label: string; value: string }>;
  riskFactors: RiskFactor[];
  related: RelatedEntity[];
}

// ─── Graph types (for D3) ────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  name: string;
  type: EntityType | 'insolvency';
  riskScore?: number;
  // D3 simulation adds these at runtime:
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string; // node id
  target: string; // node id
  label: string;  // relationship type
  weight?: number; // e.g. share_pct for HAS_SHAREHOLDER
}

export interface GraphData {
  rootId: string;
  rootName: string;
  nodes: GraphNode[];
  links: GraphLink[];
}

// ─── Watchlist (PostgreSQL via Prisma) ───────────────────────────────────────

export interface WatchlistItem {
  id: string;
  entityId: string;
  entityName: string;
  entityType: EntityType;
  createdAt: string;
}

// ─── API payloads ─────────────────────────────────────────────────────────────

export interface SearchApiResponse {
  results: SearchResult[];
  cypher?: string; // the generated Cypher (for debugging)
  partial?: boolean;
}

export interface WatchlistTogglePayload {
  entityId: string;
  entityName: string;
  entityType: EntityType;
}
