import neo4j, { type Driver, type Session } from 'neo4j-driver';

// Singleton driver — reuse across requests in Next.js
let driver: Driver | null = null;

function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
      throw new Error(
        'Missing Neo4j environment variables: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD'
      );
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: 10,
      connectionAcquisitionTimeout: 5_000,
    });
  }
  return driver;
}

/**
 * Execute a Cypher query with parameterized inputs.
 * Always use this — never concatenate user input into query strings.
 */
export async function runQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const session: Session = getDriver().session({ database: 'neo4j' });
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => record.toObject() as T);
  } finally {
    await session.close();
  }
}

/**
 * Run a write transaction (CREATE, MERGE, SET, DELETE).
 */
export async function runWrite<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const session: Session = getDriver().session({ database: 'neo4j' });
  try {
    const result = await session.writeTransaction((tx) => tx.run(cypher, params));
    return result.records.map((record) => record.toObject() as T);
  } finally {
    await session.close();
  }
}

/**
 * Close the driver — call on process exit.
 */
export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
