import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
envContent.split("\n").forEach((l) => {
  const [k, ...v] = l.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim();
});

const adminClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("==================================================");
  console.log("1. AUDITING SUPABASE STORAGE BUCKETS");
  console.log("==================================================");
  const { data: buckets, error: bErr } = await adminClient.storage.listBuckets();
  if (bErr) {
    console.error("Storage listBuckets error:", bErr.message);
  } else {
    console.log("Buckets found:", buckets);
    for (const b of buckets || []) {
      const { data: files, error: fErr } = await adminClient.storage.from(b.name).list();
      console.log(`Bucket [${b.name}] files:`, fErr ? fErr.message : files);
    }
  }

  console.log("\n==================================================");
  console.log("2. AUDITING LIVE PRODUCTS IN POSTGRESQL");
  console.log("==================================================");
  const { data: prods, error: pErr } = await adminClient.from("products").select("*");
  if (pErr) {
    console.error("Products query error:", pErr.message);
  } else {
    console.log(`Total products in PostgreSQL: ${prods.length}`);
    for (const p of prods) {
      console.log("--------------------------------------------------");
      console.log(`ID: ${p.id}`);
      console.log(`SKU: ${p.sku}`);
      console.log(`Name AR: ${p.name_ar}`);
      console.log(`Name EN: ${p.name_en}`);
      console.log(`Description: ${p.description}`);
      console.log("Full Row Columns:", Object.keys(p));
      console.log("Full Row JSON:", JSON.stringify(p, null, 2));
    }
  }
}

run();
