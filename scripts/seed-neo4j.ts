/**
 * Seed Neo4j with demo data from /data/*.json
 * Run: npm run seed
 */
import { runWrite, closeDriver } from '../lib/neo4j';
import personsData from '../data/persons.json';
import companiesData from '../data/companies.json';
import propertiesData from '../data/properties.json';

interface Person {
  id: string;
  name: string;
  birth_year: number;
  roles: string[];
}

interface Company {
  id: string;
  name: string;
  fn_number: string;
  legal_form: string;
  registered_since: string;
  status: string;
  gf_id?: string;
  gf_changed?: string;
  shareholder_id?: string;
  shareholder_pct?: number;
  shareholder2_id?: string;
  shareholder2_pct?: number;
  shareholder3_id?: string;
  shareholder3_pct?: number;
  has_jahresabschluss?: boolean;
  insolvency?: boolean;
}

interface Property {
  id: string;
  address: string;
  plz: string;
  bezirk: string;
  ez: string;
  kg: string;
  blatt_a: string;
  blatt_b: string;
  blatt_c: string;
  owner_id?: string;
  owner_person_id?: string;
}

async function seed() {
  console.log('🌱 Seeding Neo4j...');

  // Clear existing data
  await runWrite('MATCH (n) DETACH DELETE n');
  console.log('  ✓ Cleared existing data');

  // Create constraints / indexes
  await runWrite('CREATE CONSTRAINT IF NOT EXISTS FOR (p:Property) REQUIRE p.id IS UNIQUE');
  await runWrite('CREATE CONSTRAINT IF NOT EXISTS FOR (c:Company) REQUIRE c.id IS UNIQUE');
  await runWrite('CREATE CONSTRAINT IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE');
  await runWrite('CREATE CONSTRAINT IF NOT EXISTS FOR (i:Insolvency) REQUIRE i.id IS UNIQUE');
  console.log('  ✓ Constraints created');

  // Seed Persons
  const persons = personsData as Person[];
  for (const person of persons) {
    await runWrite(
      `MERGE (p:Person {id: $id})
       SET p.name = $name, p.birth_year = $birth_year, p.roles = $roles`,
      { id: person.id, name: person.name, birth_year: person.birth_year, roles: person.roles }
    );
  }
  console.log(`  ✓ ${persons.length} Persons created`);

  // Seed Companies
  const companies = companiesData as Company[];
  const insolvencyCounter: Record<string, number> = {};

  for (const company of companies) {
    await runWrite(
      `MERGE (c:Company {id: $id})
       SET c.name = $name, c.fn_number = $fn_number, c.legal_form = $legal_form,
           c.registered_since = $registered_since, c.status = $status`,
      {
        id: company.id,
        name: company.name,
        fn_number: company.fn_number,
        legal_form: company.legal_form,
        registered_since: company.registered_since,
        status: company.status,
      }
    );

    // GF relationship
    if (company.gf_id) {
      const gfSince = company.registered_since;
      const gfUntil = company.gf_changed ?? null;
      await runWrite(
        `MATCH (c:Company {id: $cid}), (p:Person {id: $pid})
         MERGE (c)-[r:HAS_GF]->(p)
         SET r.since = $since, r.until = $until`,
        { cid: company.id, pid: company.gf_id, since: gfSince, until: gfUntil }
      );
    }

    // Shareholder relationships
    const shareholders = [
      { id: company.shareholder_id, pct: company.shareholder_pct },
      { id: company.shareholder2_id, pct: company.shareholder2_pct },
      { id: company.shareholder3_id, pct: company.shareholder3_pct },
    ].filter((s) => s.id != null);

    for (const sh of shareholders) {
      // Determine if shareholder is a company or person
      const isCompany = companies.some((c) => c.id === sh.id);
      if (isCompany) {
        await runWrite(
          `MATCH (c:Company {id: $cid}), (s:Company {id: $sid})
           MERGE (c)-[r:HAS_SHAREHOLDER]->(s)
           SET r.share_pct = $pct`,
          { cid: company.id, sid: sh.id, pct: sh.pct ?? 100 }
        );
      } else {
        await runWrite(
          `MATCH (c:Company {id: $cid}), (p:Person {id: $pid})
           MERGE (c)-[r:HAS_SHAREHOLDER]->(p)
           SET r.share_pct = $pct`,
          { cid: company.id, pid: sh.id, pct: sh.pct ?? 100 }
        );
      }
    }

    // Insolvency
    if (company.insolvency) {
      const insId = `ins_${company.id}`;
      insolvencyCounter[insId] = (insolvencyCounter[insId] ?? 0) + 1;
      await runWrite(
        `MERGE (i:Insolvency {id: $id})
         SET i.case_number = $case_number, i.type = $type, i.date = $date, i.court = $court`,
        {
          id: insId,
          case_number: `${company.id.toUpperCase()}-INS-001`,
          type: company.status === 'insolvent' ? 'Konkursverfahren' : 'Sanierungsverfahren',
          date: '2024-03-15',
          court: 'Handelsgericht Wien',
        }
      );
      await runWrite(
        `MATCH (c:Company {id: $cid}), (i:Insolvency {id: $iid})
         MERGE (c)-[:INVOLVED_IN]->(i)`,
        { cid: company.id, iid: insId }
      );
    }
  }
  console.log(`  ✓ ${companies.length} Companies created`);

  // SUBSIDIARY_OF relationships (companies owned by other companies)
  for (const company of companies) {
    const shareholders = [company.shareholder_id, company.shareholder2_id, company.shareholder3_id].filter(Boolean);
    for (const shId of shareholders) {
      const isCompanyShareholder = companies.some((c) => c.id === shId);
      if (isCompanyShareholder && shId) {
        await runWrite(
          `MATCH (child:Company {id: $cid}), (parent:Company {id: $pid})
           MERGE (child)-[:SUBSIDIARY_OF]->(parent)`,
          { cid: company.id, pid: shId }
        );
      }
    }
  }
  console.log('  ✓ SUBSIDIARY_OF relationships created');

  // Seed Properties
  const properties = propertiesData as Property[];
  for (const property of properties) {
    await runWrite(
      `MERGE (p:Property {id: $id})
       SET p.address = $address, p.plz = $plz, p.bezirk = $bezirk,
           p.ez = $ez, p.kg = $kg, p.blatt_a = $blatt_a, p.blatt_b = $blatt_b, p.blatt_c = $blatt_c`,
      {
        id: property.id,
        address: property.address,
        plz: property.plz,
        bezirk: property.bezirk,
        ez: property.ez,
        kg: property.kg,
        blatt_a: property.blatt_a,
        blatt_b: property.blatt_b,
        blatt_c: property.blatt_c,
      }
    );

    // Ownership relationships
    if (property.owner_id) {
      await runWrite(
        `MATCH (prop:Property {id: $pid}), (c:Company {id: $cid})
         MERGE (prop)-[:OWNED_BY]->(c)`,
        { pid: property.id, cid: property.owner_id }
      );
    }
    if (property.owner_person_id) {
      await runWrite(
        `MATCH (prop:Property {id: $pid}), (p:Person {id: $personId})
         MERGE (prop)-[:OWNED_BY]->(p)`,
        { pid: property.id, personId: property.owner_person_id }
      );
    }
  }
  console.log(`  ✓ ${properties.length} Properties created`);

  // Add insolvency links for GFs of insolvent companies
  const insolventCompanies = companies.filter((c) => c.insolvency && c.gf_id);
  for (const company of insolventCompanies) {
    const insId = `ins_${company.id}`;
    if (company.gf_id) {
      await runWrite(
        `MATCH (p:Person {id: $pid}), (i:Insolvency {id: $iid})
         MERGE (p)-[:INVOLVED_IN]->(i)`,
        { pid: company.gf_id, iid: insId }
      );
    }
  }
  console.log('  ✓ Person-Insolvency links created');

  console.log('\n✅ Seeding complete!');
  console.log(`   ${persons.length} persons`);
  console.log(`   ${companies.length} companies`);
  console.log(`   ${properties.length} properties`);
  console.log(`   ${Object.keys(insolvencyCounter).length} insolvency records`);
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => closeDriver());
