/**
 * Run pending migrations via Supabase Management API
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const ACCESS_TOKEN = 'sbp_3165b6cc60f2c652464901942e6a00f8b0db6340';
const PROJECT_REF = 'fxukbijtgezuehmlaeps';

// Migrations to run (in order)
const MIGRATIONS = [
  'supabase/migrations/006_profiles_auth_billing.sql',
  'supabase/migrations/007_credits_and_transactions.sql',
  'supabase/setup-storage.sql',
];

async function executeSQL(sql: string): Promise<any> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`SQL error: ${text}`);
  }

  return text;
}

function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarBlock = false;

  for (const line of sql.split('\n')) {
    if (line.trim().startsWith('--') && !current.trim()) continue;

    const dollarMatches = line.match(/\$\$/g);
    if (dollarMatches) {
      inDollarBlock = dollarMatches.length % 2 === 1 ? !inDollarBlock : inDollarBlock;
    }

    current += line + '\n';

    if (line.trim().endsWith(';') && !inDollarBlock) {
      const stmt = current.trim();
      if (stmt && !stmt.startsWith('--')) {
        statements.push(stmt);
      }
      current = '';
    }
  }

  return statements.filter(s => s.length > 0);
}

async function runMigration(filePath: string) {
  console.log(`\n📄 Running: ${filePath}`);
  console.log('─'.repeat(50));

  const sql = fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
  const statements = splitStatements(sql);

  console.log(`   Found ${statements.length} statements\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 45).replace(/\n/g, ' ').trim() + '...';
    process.stdout.write(`   [${i + 1}/${statements.length}] ${preview} `);

    try {
      await executeSQL(stmt);
      console.log('✅');
      success++;
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        console.log('⏭️  (exists)');
        skipped++;
      } else if (msg.includes('does not exist') && stmt.includes('DROP')) {
        console.log('⏭️  (nothing to drop)');
        skipped++;
      } else {
        console.log('❌');
        console.log(`      Error: ${msg.substring(0, 80)}`);
        failed++;
      }
    }
  }

  console.log(`\n   ✅ ${success} | ⏭️ ${skipped} | ❌ ${failed}`);
  return failed === 0;
}

async function main() {
  console.log('🚀 Running Pending Migrations');
  console.log('═'.repeat(50));

  let allSuccess = true;

  for (const migration of MIGRATIONS) {
    const success = await runMigration(migration);
    if (!success) allSuccess = false;
  }

  console.log('\n' + '═'.repeat(50));
  if (allSuccess) {
    console.log('🎉 All migrations completed successfully!');
  } else {
    console.log('⚠️  Some migrations had errors - check above');
  }
}

main().catch(console.error);
