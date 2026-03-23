// Quick test: can we connect to Supabase?
require("dotenv").config();
const pg = require("pg");

const connectionString = process.env.DATABASE_URL;
console.log("Connecting to:", connectionString?.replace(/:[^:@]+@/, ":***@"));

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

pool
  .query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
  .then((r) => {
    console.log("Connected OK! Tables:", r.rows.map((row) => row.tablename));
    pool.end();
  })
  .catch((e) => {
    console.error("Connection FAILED:", e.message);
    pool.end();
  });
