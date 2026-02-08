/**
 * Setup Knowledge Base Tables via Supabase REST API
 */
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1];
if (!projectRef) {
  console.error('Could not extract project ref from URL');
  process.exit(1);
}

async function executeSql(sql: string): Promise<{ success: boolean; error?: string }> {
  // Use Supabase Management API to execute SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { success: false, error: text };
  }

  return { success: true };
}

async function setupTables() {
  console.log('🚀 Setting up Knowledge Base Tables...\n');
  console.log(`📍 Project: ${projectRef}\n`);

  // First, let's try to query if tables exist
  const checkResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/knowledge_documents?select=id&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (checkResponse.ok) {
    console.log('✅ Tables already exist! Running ingestion...\n');
    return true;
  }

  console.log('❌ Tables do not exist yet.');
  console.log('\n📋 You need to run this SQL in Supabase Dashboard:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  console.log('   2. Copy & paste the contents of: supabase/migrations/005_knowledge_base.sql');
  console.log('   3. Click "Run"\n');

  return false;
}

setupTables().then(async (exists) => {
  if (exists) {
    // Tables exist, run ingestion
    console.log('Running ingestion script...\n');
    const { execSync } = await import('child_process');
    execSync('npx tsx scripts/ingest-knowledge.ts', { stdio: 'inherit' });
  }
}).catch(console.error);
