import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config.js";
import { ensureDatabase, pool } from "./pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  if (config.databaseUrl === "memory") {
    await ensureDatabase();
    await pool.end();
    console.log("In-memory migration completed.");
    return;
  }

  const sql = await fs.readFile(path.join(__dirname, "migration.sql"), "utf8");
  await pool.query(sql);
  await pool.end();
  console.log("Migration completed.");
}

runMigration().catch(async (error) => {
  console.error("Migration failed:", error);
  await pool.end();
  process.exit(1);
});
