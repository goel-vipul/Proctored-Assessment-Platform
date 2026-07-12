/**
 * Migration runner — executes SQL migration files against the database.
 * Usage: node src/migrations/run.js
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function runMigrations() {
  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration file(s).`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`Running migration: ${file}...`);
    try {
      await pool.query(sql);
      console.log(`  ✓ ${file} applied successfully.`);
    } catch (err) {
      console.error(`  ✗ ${file} failed:`, err.message);
      process.exit(1);
    }
  }

  console.log('All migrations applied.');
  await pool.end();
  process.exit(0);
}

runMigrations();
