import 'dotenv/config';
import * as fs from 'fs';

const ACCESS_TOKEN = 'sbp_3165b6cc60f2c652464901942e6a00f8b0db6340';
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
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`SQL error: ${text}`);
  }
  return text;
}

async function main() {
  const sql = fs.readFileSync('supabase/migrations/008_billing_events.sql', 'utf-8');
  console.log('Running 008_billing_events.sql...');
  try {
    await executeSQL(sql);
    console.log('✅ Migration 008 completed');
  } catch (e: any) {
    console.error('❌ Error:', e.message);
  }
}

main();
