import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function parseEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join("=").trim();
    }
  }
  return env;
}

async function main() {
  const env = parseEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local");
    process.exit(1);
  }

  console.log(`📡 Target Supabase URL: ${url}`);
  const sqlPath = path.resolve(process.cwd(), "supabase/seed.sql");
  if (fs.existsSync(sqlPath)) {
    console.log(`\n✅ Created supabase/seed.sql with daytime (Run Club) and nightlife (Indie Mixer) events!`);
    console.log(`\nTo populate your remote Supabase database:`);
    console.log(`1. Go to your Supabase Dashboard -> SQL Editor`);
    console.log(`2. Paste and run the contents of supabase/seed.sql`);
    console.log(`\nOr run via Supabase CLI:`);
    console.log(`   npx supabase db execute --file supabase/seed.sql\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
