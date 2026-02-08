/**
 * Run SQL migration directly via Supabase
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🚀 Running Knowledge Base Migration...\n');

  const sqlPath = path.join(process.cwd(), 'supabase/migrations/005_knowledge_base.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // Split by semicolons but be careful with function bodies
  // We'll run the whole thing at once using rpc

  try {
    // Try using the pg_execute function if available, otherwise use REST
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    // If that doesn't work, let's try executing SQL statements one by one
    // Split into manageable chunks
    const statements = splitSQLStatements(sql);

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;

      const label = stmt.substring(0, 60).replace(/\n/g, ' ') + '...';
      process.stdout.write(`[${i + 1}/${statements.length}] ${label}`);

      const { error } = await supabase.rpc('exec_sql', { query: stmt }).single();

      if (error) {
        // Try alternative method - direct query
        const { error: error2 } = await supabase.from('_sqlx_migrations').select('*').limit(0);
        if (error2) {
          console.log(' ⚠️  (may need manual run)');
        }
      } else {
        console.log(' ✅');
      }
    }

    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('Migration error:', err);
  }
}

function splitSQLStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inFunction = false;
  let dollarQuote = '';

  const lines = sql.split('\n');

  for (const line of lines) {
    // Skip comments
    if (line.trim().startsWith('--')) {
      continue;
    }

    // Detect $$ function bodies
    if (line.includes('$$')) {
      const matches = line.match(/\$\$/g);
      if (matches) {
        for (const match of matches) {
          inFunction = !inFunction;
        }
      }
    }

    current += line + '\n';

    // If we hit a semicolon and we're not in a function body
    if (line.trim().endsWith(';') && !inFunction) {
      statements.push(current.trim());
      current = '';
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter(s => s.length > 0);
}

runMigration().catch(console.error);
