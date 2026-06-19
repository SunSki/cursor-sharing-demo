#!/usr/bin/env node
'use strict';

/**
 * Generate extension/_locales/{locale}/messages.json from the single
 * source of truth: extension/_locales/strings.json
 *
 * Usage:
 *   node scripts/gen-locales.js          # write files
 *   node scripts/gen-locales.js --check  # verify files are up to date (exit 1 if not)
 */

const fs = require('fs');
const path = require('path');

const STRINGS = path.resolve(__dirname, '../extension/_locales/strings.json');
const LOCALES_DIR = path.resolve(__dirname, '../extension/_locales');
const LOCALES = ['en', 'ja'];

const checkMode = process.argv.includes('--check');
let dirty = false;

// ── load source ──────────────────────────────────────────────────────────────
const source = JSON.parse(fs.readFileSync(STRINGS, 'utf8'));

// Strip internal comments / metadata keys that start with "_".
const keys = Object.keys(source).filter((k) => !k.startsWith('_'));

// ── validate: every key must have every locale ────────────────────────────────
const missing = [];
for (const key of keys) {
  for (const locale of LOCALES) {
    if (typeof source[key][locale] !== 'string') {
      missing.push(`  "${key}" is missing locale "${locale}"`);
    }
  }
}
if (missing.length) {
  console.error('❌  Missing translations in strings.json:\n' + missing.join('\n'));
  process.exit(1);
}

// ── build Chrome messages.json per locale ────────────────────────────────────
for (const locale of LOCALES) {
  const out = {};
  for (const key of keys) {
    const entry = { message: source[key][locale] };
    if (source[key].placeholders) {
      entry.placeholders = source[key].placeholders;
    }
    out[key] = entry;
  }

  const json = JSON.stringify(out, null, 2) + '\n';
  const dest = path.join(LOCALES_DIR, locale, 'messages.json');

  if (checkMode) {
    const current = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
    if (current !== json) {
      console.error(`❌  ${dest} is out of date. Run: npm run locales`);
      dirty = true;
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, json);
    console.log(`✓  wrote ${path.relative(process.cwd(), dest)}`);
  }
}

if (checkMode) {
  if (dirty) {
    process.exit(1);
  } else {
    console.log('✓  All locale files are up to date.');
  }
}
