/**
 * Run SQL migration via Supabase Management API
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_3165b6cc60f2c652464901942e6a00f8b0db6340';
const PROJECT_REF = 'fxukbijtgezuehmlaeps';

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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL error: ${text}`);
  }

  return response.json();
}

async function runMigration() {
  console.log('🚀 Running Knowledge Base Migration via Management API\n');

  const sqlPath = path.join(process.cwd(), 'supabase/migrations/005_knowledge_base.sql');
  const fullSQL = fs.readFileSync(sqlPath, 'utf-8');

  // Split into individual statements (careful with $$ blocks)
  const statements: string[] = [];
  let current = '';
  let inDollarBlock = false;

  for (const line of fullSQL.split('\n')) {
    // Skip pure comment lines
    if (line.trim().startsWith('--') && !current.trim()) {
      continue;
    }

    // Track $$ blocks
    const dollarMatches = line.match(/\$\$/g);
    if (dollarMatches) {
      inDollarBlock = dollarMatches.length % 2 === 1 ? !inDollarBlock : inDollarBlock;
    }

    current += line + '\n';

    // End of statement (semicolon outside $$ block)
    if (line.trim().endsWith(';') && !inDollarBlock) {
      const stmt = current.trim();
      if (stmt && !stmt.startsWith('--')) {
        statements.push(stmt);
      }
      current = '';
    }
  }

  console.log(`📝 Found ${statements.length} SQL statements\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 50).replace(/\n/g, ' ').trim() + '...';
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview} `);

    try {
      await executeSQL(stmt);
      console.log('✅');
      success++;
    } catch (error: any) {
      // Check if it's just "already exists" error
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('⏭️  (exists)');
        success++;
      } else {
        console.log('❌');
        console.log(`    Error: ${error.message.substring(0, 100)}`);
        failed++;
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);

  return failed === 0;
}

runMigration()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Migration complete! Running ingestion...\n');
      import('child_process').then(({ execSync }) => {
        execSync('npx tsx scripts/ingest-knowledge.ts', { stdio: 'inherit' });
      });
    }
  })
  .catch(console.error);
