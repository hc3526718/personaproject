#!/usr/bin/env node

/**
 * Validate Apple Wallet .pkpass file:
 * - Extracts and reads manifest.json
 * - Computes SHA-1 hash for each file listed in manifest
 * - Compares computed hash against manifest value
 *
 * Usage: node scripts/validate-pkpass.mjs <path-to-file.pkpass>
 */

import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import AdmZip from 'adm-zip';

function computeSHA1(buffer) {
  return createHash('sha1').update(buffer).digest('hex');
}

async function validatePkpass(pkpassPath) {
  console.log(`\n📦 Validating: ${pkpassPath}\n`);

  const zip = new AdmZip(pkpassPath);
  const entries = zip.getEntries();

  // Read manifest.json
  const manifestEntry = entries.find(e => e.entryName === 'manifest.json');
  if (!manifestEntry) {
    throw new Error('❌ manifest.json not found in .pkpass');
  }

  const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
  console.log(`✅ Found manifest.json with ${Object.keys(manifest).length} files\n`);

  let allValid = true;
  const errors = [];

  for (const [fileName, expectedHash] of Object.entries(manifest)) {
    const fileEntry = entries.find(e => e.entryName === fileName);
    
    if (!fileEntry) {
      errors.push(`❌ ${fileName}: File listed in manifest but not found in zip`);
      allValid = false;
      continue;
    }

    const fileData = fileEntry.getData();
    const computedHash = computeSHA1(fileData);

    if (computedHash === expectedHash) {
      console.log(`✅ ${fileName}: ${computedHash}`);
    } else {
      console.log(`❌ ${fileName}:`);
      console.log(`   Expected:  ${expectedHash}`);
      console.log(`   Computed:  ${computedHash}`);
      errors.push(`❌ ${fileName}: SHA-1 mismatch`);
      allValid = false;
    }
  }

  console.log('');
  
  if (allValid) {
    console.log('🎉 All manifest hashes are valid!\n');
    return true;
  } else {
    console.log('⚠️  Validation failed:\n');
    errors.forEach(err => console.log(`   ${err}`));
    console.log('');
    return false;
  }
}

// CLI entry point
const pkpassPath = process.argv[2];

if (!pkpassPath) {
  console.error('Usage: node scripts/validate-pkpass.mjs <path-to-file.pkpass>');
  process.exit(1);
}

try {
  const valid = await validatePkpass(pkpassPath);
  process.exit(valid ? 0 : 1);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
