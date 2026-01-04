/**
 * Brand Synchronization Test
 *
 * Validates that all brands used in product generation are defined
 * in the attribute options. This prevents Commerce import failures.
 *
 * DESIGN: Products use ONLY the generic BRANDS list (not category-specific).
 * This ensures synchronization with product-attributes.json options.
 */

import { BRANDS } from '../lib/product-definitions.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load attribute definitions to get valid brand options
const attributesPath = join(__dirname, '../../buildright-data/definitions/attributes/product-attributes.json');
const attributes = JSON.parse(readFileSync(attributesPath, 'utf-8'));

// Find br_brand attribute and get its options
const brandAttribute = attributes.find(attr => attr.attributeCode === 'br_brand');
const validBrandOptions = new Set(brandAttribute?.options || []);

console.log('=== Brand Synchronization Test ===\n');
console.log(`Valid brand options in product-attributes.json: ${validBrandOptions.size}`);
console.log(`  Options: ${[...validBrandOptions].join(', ')}\n`);

// Products now only use generic BRANDS list
const usedBrands = new Set(BRANDS);

console.log(`Brands used in product generation (BRANDS): ${usedBrands.size}`);
console.log(`  Brands: ${[...usedBrands].join(', ')}\n`);

// Find brands that are NOT in the attribute options
const invalidBrands = [...usedBrands].filter(brand => !validBrandOptions.has(brand));

// Also check reverse: attribute options not in used brands
const unusedOptions = [...validBrandOptions].filter(brand => !usedBrands.has(brand));

if (invalidBrands.length > 0) {
  console.log('❌ FAIL: Found brands NOT defined in attribute options:\n');
  invalidBrands.forEach(brand => console.log(`  - "${brand}"`));
  console.log(`\nTotal invalid brands: ${invalidBrands.length}`);
  console.log('\nThis will cause Commerce import to fail with:');
  console.log('  "Attribute br_brand has invalid value. The int type was expected."');
  process.exit(1);
} else if (unusedOptions.length > 0) {
  console.log('⚠️  WARNING: Attribute options not used by generator:\n');
  unusedOptions.forEach(brand => console.log(`  - "${brand}"`));
  console.log('\nThis is not a failure, but indicates unused options.');
  console.log('\n✅ PASS: All brands used in generation are defined in attribute options');
  process.exit(0);
} else {
  console.log('✅ PASS: Brand lists are PERFECTLY synchronized!');
  console.log('  - All BRANDS are in attribute options');
  console.log('  - All attribute options are in BRANDS');
  process.exit(0);
}
