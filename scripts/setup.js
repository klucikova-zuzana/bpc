#!/usr/bin/env node
// Setup script (DI-01 / FR-ORG-03, SCRUM-11): applies the database schema and
// creates the one Super Admin account. Safe to run more than once.
//
//   SUPER_ADMIN_EMAIL=ops@example.com npm run setup            # local D1
//   SUPER_ADMIN_EMAIL=ops@example.com npm run setup -- --remote # Cloudflare D1

import { execFileSync } from 'node:child_process';
import { hashPassword } from '../src/password.js';
import {
  SELECT_SUPER_ADMIN_SQL,
  generatePassword,
  insertSuperAdminSql,
  validateEmail,
  validatePassword,
} from './setup-lib.js';

const DATABASE = process.env.D1_DATABASE ?? 'bpc';
const target = process.argv.includes('--remote') ? '--remote' : '--local';

function wrangler(...args) {
  return execFileSync('npx', ['wrangler', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, CI: 'true' }, // no interactive confirmation prompts
  });
}

function query(sql) {
  const output = JSON.parse(wrangler('d1', 'execute', DATABASE, target, '--json', '--command', sql));
  return output[0].results;
}

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  validateEmail(email);

  console.log(`Applying schema migrations to ${DATABASE} (${target.slice(2)})...`);
  wrangler('d1', 'migrations', 'apply', DATABASE, target);

  const existing = query(SELECT_SUPER_ADMIN_SQL);
  if (existing.length > 0) {
    console.log(`Super Admin already exists (${existing[0].email}). Nothing to create.`);
    return;
  }

  const generated = !process.env.SUPER_ADMIN_PASSWORD;
  const password = process.env.SUPER_ADMIN_PASSWORD ?? generatePassword();
  validatePassword(password);

  query(insertSuperAdminSql({ email, passwordHash: await hashPassword(password) }));
  console.log(`Created Super Admin ${email}. The password must be changed at first login.`);
  if (generated) {
    console.log(`Initial password (shown only once): ${password}`);
  }
}

main().catch((error) => {
  console.error(`Setup failed: ${error.message}`);
  process.exit(1);
});
