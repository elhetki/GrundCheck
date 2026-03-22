import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// The exact Neo4j schema is embedded in the system prompt so Claude can
// generate valid Cypher without hallucinating node labels or properties.
const SYSTEM_PROMPT = `Du bist ein Experte für Neo4j Cypher-Abfragen. Du erhältst natürlichsprachige Anfragen auf Deutsch über österreichische Immobilien und Unternehmen und gibst ausschließlich gültige Cypher-Abfragen zurück.

WICHTIG:
- Gib NUR Cypher zurück — keine Erklärungen, kein Markdown, keine Backticks
- Verwende IMMER parametrisierte Abfragen (z.B. $address, $name)
- Handle deutsche Eingaben inklusive Umlaute (ä, ö, ü, ß)
- Nutze CONTAINS für unscharfe Suchen, da Benutzer selten exakte Schreibweisen kennen
- Limitiere Ergebnisse auf maximal 50 Einträge mit LIMIT 50
- Gib die gefundenen Nodes als Variablen zurück, sodass die App sie verarbeiten kann

NEO4J SCHEMA:

Nodes:
(:Property {id: string, address: string, plz: string, bezirk: string, ez: string, kg: string, blatt_a: string, blatt_b: string, blatt_c: string})
(:Company  {id: string, name: string, fn_number: string, legal_form: string, registered_since: string, status: string})
(:Person   {id: string, name: string, birth_year: integer, roles: [string]})
(:Insolvency {id: string, case_number: string, type: string, date: string, court: string})

Relationships:
(:Property)-[:OWNED_BY]->(:Company)
(:Property)-[:OWNED_BY]->(:Person)
(:Company)-[:HAS_SHAREHOLDER {share_pct: float}]->(:Person)
(:Company)-[:HAS_SHAREHOLDER {share_pct: float}]->(:Company)
(:Company)-[:HAS_GF {since: string, until: string}]->(:Person)
(:Person)-[:INVOLVED_IN]->(:Insolvency)
(:Company)-[:INVOLVED_IN]->(:Insolvency)
(:Company)-[:SUBSIDIARY_OF]->(:Company)

BEISPIELE:

Anfrage: "Wem gehört Neubaugasse 42?"
Cypher: MATCH (p:Property)-[:OWNED_BY]->(owner) WHERE toLower(p.address) CONTAINS toLower($address) RETURN p, owner LIMIT 50

Anfrage: "Zeig mir Mustermann GmbH"
Cypher: MATCH (c:Company) WHERE toLower(c.name) CONTAINS toLower($name) OPTIONAL MATCH (c)-[:HAS_GF]->(gf:Person) OPTIONAL MATCH (c)-[:HAS_SHAREHOLDER]->(sh) RETURN c, gf, sh LIMIT 50

Anfrage: "Firmen von Thomas Müller"
Cypher: MATCH (p:Person)-[r:HAS_GF|HAS_SHAREHOLDER]-(c:Company) WHERE toLower(p.name) CONTAINS toLower($name) RETURN p, c, type(r) as role LIMIT 50

Anfrage: "Ist die Firma hinter Kärntner Straße 12 sauber?"
Cypher: MATCH (prop:Property)-[:OWNED_BY]->(c:Company) WHERE toLower(prop.address) CONTAINS toLower($address) OPTIONAL MATCH (c)-[:INVOLVED_IN]->(i:Insolvency) OPTIONAL MATCH (c)-[:HAS_GF]->(gf:Person)-[:INVOLVED_IN]->(gi:Insolvency) OPTIONAL MATCH (c)-[:SUBSIDIARY_OF*1..3]->(parent:Company) RETURN prop, c, i, gf, gi, parent LIMIT 50

Anfrage: "Liegenschaften im 1. Bezirk"
Cypher: MATCH (p:Property)-[:OWNED_BY]->(owner) WHERE p.bezirk = $bezirk RETURN p, owner LIMIT 50`;

/**
 * Translate a natural language query (German) into a Neo4j Cypher query.
 * The returned string is ready to execute — parameterized, no markdown.
 */
export async function naturalLanguageToCypher(
  userQuery: string
): Promise<{ cypher: string; params: Record<string, unknown> }> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userQuery,
      },
    ],
  });

  const raw = message.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('');

  // Strip markdown code fences if Claude wraps the Cypher in them
  const cypher = raw
    .replace(/^```(?:cypher|sql)?\n?/i, '')
    .replace(/\n?```$/, '')
    .trim();

  // Extract parameter values from the natural language query.
  // This is a best-effort extraction — the real values come from user input.
  const params = extractParams(userQuery, cypher);

  return { cypher, params };
}

/**
 * Heuristically extract Cypher parameter values from the natural language query.
 * Looks at what $variables are referenced in the generated Cypher and maps them.
 */
function extractParams(
  query: string,
  cypher: string
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const normalized = query.toLowerCase().trim();

  // Extract $address
  if (cypher.includes('$address')) {
    // Pull address-like substrings (street + optional number)
    const addressMatch = query.match(
      /([A-ZÄÖÜa-zäöüß][a-zäöüßA-ZÄÖÜ\s\-]+(straße|gasse|platz|weg|allee|ring|gürtel|zeile)\s*\d*)/i
    );
    params.address = addressMatch ? addressMatch[0].trim() : query;
  }

  // Extract $name
  if (cypher.includes('$name')) {
    // Remove common German question words to isolate the name
    const cleaned = normalized
      .replace(/^(zeig mir|firmen von|wem gehört|ist|sauber|suche nach|zeige)\s*/i, '')
      .replace(/\?$/, '')
      .trim();
    params.name = cleaned || query;
  }

  // Extract $bezirk
  if (cypher.includes('$bezirk')) {
    const bezirkMatch = query.match(/(\d+)\.\s*Bezirk/i);
    if (bezirkMatch) {
      params.bezirk = bezirkMatch[1].padStart(2, '0');
    }
  }

  return params;
}
