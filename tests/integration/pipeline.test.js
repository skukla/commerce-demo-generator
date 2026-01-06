/**
 * Integration tests for the complete product pipeline
 * Tests end-to-end validation that all 281 products generate correctly
 *
 * Step 5: Integration Testing and Cleanup
 *
 * @module tests/integration/pipeline.test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths to generated files
const CANONICAL_DATAPACK_PATH = resolve(__dirname, '../../../buildright-data/generated/canonical/datapack.json');
const COMMERCE_PRODUCTS_PATH = resolve(__dirname, '../../../buildright-data/generated/commerce/data/accs/accs_products.json');
const ACO_PRODUCTS_PATH = resolve(__dirname, '../../../buildright-data/generated/aco/products.json');
const ACO_VARIANTS_PATH = resolve(__dirname, '../../../buildright-data/generated/aco/variants.json');
const GENERATE_COMMERCE_PATH = resolve(__dirname, '../../generators/generate-commerce.js');
const GENERATE_ACO_PATH = resolve(__dirname, '../../generators/generate-aco.js');

// Expected product counts
const EXPECTED_TOTAL = 281;
const EXPECTED_SIMPLE_STANDALONE = 146;
const EXPECTED_CONFIGURABLE = 15;
const EXPECTED_VARIANTS = 120;

// =============================================================================
// TEST 1: Full pipeline generates 281 products in canonical datapack
// =============================================================================

describe('Full pipeline generates 281 products', () => {

  it('should have canonical datapack containing exactly 281 products', () => {
    // Given: Canonical datapack exists after running generate:canonical
    assert.ok(existsSync(CANONICAL_DATAPACK_PATH),
      'Canonical datapack should exist. Run "npm run generate:canonical" first.');

    // When: Reading the canonical datapack
    const canonical = JSON.parse(readFileSync(CANONICAL_DATAPACK_PATH, 'utf8'));

    // Then: Should contain exactly 281 products
    assert.strictEqual(canonical.products.length, EXPECTED_TOTAL,
      `Canonical datapack should contain ${EXPECTED_TOTAL} products, got ${canonical.products.length}`);
  });

  it('should have correct product type distribution in canonical', () => {
    // Given: Canonical datapack with all products
    const canonical = JSON.parse(readFileSync(CANONICAL_DATAPACK_PATH, 'utf8'));

    // When: Counting by type
    const simpleStandalone = canonical.products.filter(p =>
      p.type === 'simple' && !p.parentSku
    ).length;
    const configurable = canonical.products.filter(p =>
      p.type === 'configurable'
    ).length;
    const variants = canonical.products.filter(p =>
      p.type === 'simple' && p.parentSku
    ).length;

    // Then: Counts should match expected distribution
    assert.strictEqual(simpleStandalone, EXPECTED_SIMPLE_STANDALONE,
      `Should have ${EXPECTED_SIMPLE_STANDALONE} standalone simple products, got ${simpleStandalone}`);
    assert.strictEqual(configurable, EXPECTED_CONFIGURABLE,
      `Should have ${EXPECTED_CONFIGURABLE} configurable products, got ${configurable}`);
    assert.strictEqual(variants, EXPECTED_VARIANTS,
      `Should have ${EXPECTED_VARIANTS} variant products, got ${variants}`);
  });

  it('should have all products with all-products category', () => {
    // Given: Canonical datapack with all products
    const canonical = JSON.parse(readFileSync(CANONICAL_DATAPACK_PATH, 'utf8'));

    // When: Checking each product's categories
    const productsWithoutAllProducts = canonical.products.filter(p =>
      !p.categories || !p.categories.includes('all-products')
    );

    // Then: All products should have all-products category
    assert.strictEqual(productsWithoutAllProducts.length, 0,
      `All products should have 'all-products' category. Found ${productsWithoutAllProducts.length} without it: ` +
      productsWithoutAllProducts.slice(0, 5).map(p => p.sku).join(', ') +
      (productsWithoutAllProducts.length > 5 ? '...' : ''));
  });

});

// =============================================================================
// TEST 2: Product counts match across outputs
// =============================================================================

describe('Product counts match across outputs', () => {

  it('should have Commerce output containing 281 products', () => {
    // Given: Commerce products file exists after running generate:commerce
    assert.ok(existsSync(COMMERCE_PRODUCTS_PATH),
      'Commerce products file should exist. Run "npm run generate:commerce" first.');

    // When: Reading Commerce products
    const commerce = JSON.parse(readFileSync(COMMERCE_PRODUCTS_PATH, 'utf8'));

    // Then: Should contain 281 products in source.items
    assert.ok(commerce.source, 'Commerce file should have source wrapper');
    assert.ok(commerce.source.items, 'Commerce source should have items array');
    assert.strictEqual(commerce.source.items.length, EXPECTED_TOTAL,
      `Commerce should contain ${EXPECTED_TOTAL} products, got ${commerce.source.items.length}`);
  });

  it('should have Commerce product types matching canonical', () => {
    // Given: Commerce products loaded
    const commerce = JSON.parse(readFileSync(COMMERCE_PRODUCTS_PATH, 'utf8'));
    const products = commerce.source.items;

    // When: Counting by type
    const simpleStandalone = products.filter(p =>
      p.product_type === 'simple' && !p.parent_sku
    ).length;
    const configurable = products.filter(p =>
      p.product_type === 'configurable'
    ).length;
    const variants = products.filter(p =>
      p.parent_sku !== undefined
    ).length;

    // Then: Should match canonical counts
    assert.strictEqual(simpleStandalone, EXPECTED_SIMPLE_STANDALONE,
      `Commerce should have ${EXPECTED_SIMPLE_STANDALONE} standalone simple products, got ${simpleStandalone}`);
    assert.strictEqual(configurable, EXPECTED_CONFIGURABLE,
      `Commerce should have ${EXPECTED_CONFIGURABLE} configurable products, got ${configurable}`);
    assert.strictEqual(variants, EXPECTED_VARIANTS,
      `Commerce should have ${EXPECTED_VARIANTS} variants, got ${variants}`);
  });

  it('should have ACO products + variants = 281 total', () => {
    // Given: ACO products and variants files exist
    assert.ok(existsSync(ACO_PRODUCTS_PATH),
      'ACO products file should exist. Run "npm run generate:aco" first.');
    assert.ok(existsSync(ACO_VARIANTS_PATH),
      'ACO variants file should exist. Run "npm run generate:aco" first.');

    // When: Reading ACO files
    const acoProducts = JSON.parse(readFileSync(ACO_PRODUCTS_PATH, 'utf8'));
    const acoVariants = JSON.parse(readFileSync(ACO_VARIANTS_PATH, 'utf8'));

    // Then: ACO products should contain 161 (146 simple + 15 configurable)
    // ACO variants should contain 120 variants
    const expectedAcoProducts = EXPECTED_SIMPLE_STANDALONE + EXPECTED_CONFIGURABLE; // 161
    assert.strictEqual(acoProducts.length, expectedAcoProducts,
      `ACO products should contain ${expectedAcoProducts} items (simple + configurable), got ${acoProducts.length}`);
    assert.strictEqual(acoVariants.length, EXPECTED_VARIANTS,
      `ACO variants should contain ${EXPECTED_VARIANTS} items, got ${acoVariants.length}`);

    // Verify total matches
    const acoTotal = acoProducts.length + acoVariants.length;
    assert.strictEqual(acoTotal, EXPECTED_TOTAL,
      `ACO total (products + variants) should be ${EXPECTED_TOTAL}, got ${acoTotal}`);
  });

  it('should have consistent SKUs across all outputs', () => {
    // Given: All three outputs loaded
    const canonical = JSON.parse(readFileSync(CANONICAL_DATAPACK_PATH, 'utf8'));
    const commerce = JSON.parse(readFileSync(COMMERCE_PRODUCTS_PATH, 'utf8'));
    const acoProducts = JSON.parse(readFileSync(ACO_PRODUCTS_PATH, 'utf8'));
    const acoVariants = JSON.parse(readFileSync(ACO_VARIANTS_PATH, 'utf8'));

    // When: Collecting all SKUs from each output
    const canonicalSkus = new Set(canonical.products.map(p => p.sku));
    const commerceSkus = new Set(commerce.source.items.map(p => p.sku));
    const acoSkus = new Set([
      ...acoProducts.map(p => p.sku),
      ...acoVariants.map(v => v.sku)
    ]);

    // Then: All outputs should have the same SKUs
    assert.strictEqual(canonicalSkus.size, EXPECTED_TOTAL,
      `Canonical should have ${EXPECTED_TOTAL} unique SKUs`);
    assert.strictEqual(commerceSkus.size, EXPECTED_TOTAL,
      `Commerce should have ${EXPECTED_TOTAL} unique SKUs`);
    assert.strictEqual(acoSkus.size, EXPECTED_TOTAL,
      `ACO should have ${EXPECTED_TOTAL} unique SKUs`);

    // Check for any SKU differences
    const missingInCommerce = [...canonicalSkus].filter(sku => !commerceSkus.has(sku));
    const missingInAco = [...canonicalSkus].filter(sku => !acoSkus.has(sku));

    assert.strictEqual(missingInCommerce.length, 0,
      `All canonical SKUs should be in Commerce. Missing: ${missingInCommerce.slice(0, 5).join(', ')}`);
    assert.strictEqual(missingInAco.length, 0,
      `All canonical SKUs should be in ACO. Missing: ${missingInAco.slice(0, 5).join(', ')}`);
  });

});

// =============================================================================
// TEST 3: No orphaned products in legacy code paths
// =============================================================================

describe('No orphaned products in legacy code paths', () => {

  it('should NOT import generateVariants from product-variants.js in generate-commerce.js', () => {
    // Given: generate-commerce.js file
    assert.ok(existsSync(GENERATE_COMMERCE_PATH),
      'generate-commerce.js should exist');

    // When: Reading the file content
    const fileContent = readFileSync(GENERATE_COMMERCE_PATH, 'utf8');

    // Then: Should NOT have active import of generateVariants
    // Pattern: look for import { generateVariants } from './product-variants
    const importPatterns = [
      /^import\s*\{\s*generateVariants\s*\}\s*from\s*['"]\.\/product-variants/m,
      /^import\s*{[^}]*generateVariants[^}]*}\s*from\s*['"]\.\/product-variants/m
    ];

    const hasGenerateVariantsImport = importPatterns.some(pattern => pattern.test(fileContent));

    assert.strictEqual(hasGenerateVariantsImport, false,
      'generate-commerce.js should NOT actively import generateVariants from product-variants.js');

    // Verify the comment indicating removal is present
    assert.ok(fileContent.includes('generateVariants import REMOVED') ||
              fileContent.includes('NOTE: generateVariants import REMOVED'),
      'generate-commerce.js should have a comment indicating generateVariants import was removed');
  });

  it('should NOT import generateVariants from product-variants.js in generate-aco.js', () => {
    // Given: generate-aco.js file
    assert.ok(existsSync(GENERATE_ACO_PATH),
      'generate-aco.js should exist');

    // When: Reading the file content
    const fileContent = readFileSync(GENERATE_ACO_PATH, 'utf8');

    // Then: Should NOT have any import of generateVariants
    const importPatterns = [
      /import\s*\{\s*generateVariants\s*\}\s*from\s*['"]\.\/product-variants/,
      /import\s*{[^}]*generateVariants[^}]*}\s*from\s*['"]\.\/product-variants/,
      /import\s+generateVariants\s+from\s*['"]\.\/product-variants/
    ];

    const hasGenerateVariantsImport = importPatterns.some(pattern => pattern.test(fileContent));

    assert.strictEqual(hasGenerateVariantsImport, false,
      'generate-aco.js should NOT import generateVariants from product-variants.js');
  });

  it('should have all products flowing through canonical transform only', () => {
    // Given: Canonical datapack is the single source of truth
    const canonical = JSON.parse(readFileSync(CANONICAL_DATAPACK_PATH, 'utf8'));
    const commerce = JSON.parse(readFileSync(COMMERCE_PRODUCTS_PATH, 'utf8'));

    // When: Comparing canonical products to commerce products
    const canonicalSkus = new Set(canonical.products.map(p => p.sku));
    const commerceSkus = new Set(commerce.source.items.map(p => p.sku));

    // Then: Commerce should not have any SKUs that aren't in canonical
    // (This would indicate direct generation bypassing canonical)
    const orphanedInCommerce = [...commerceSkus].filter(sku => !canonicalSkus.has(sku));

    assert.strictEqual(orphanedInCommerce.length, 0,
      `Commerce should not have products bypassing canonical. Found orphaned: ${orphanedInCommerce.slice(0, 5).join(', ')}`);
  });

  it('should have configurable products with valid variant references', () => {
    // Given: Canonical datapack with configurable products
    const canonical = JSON.parse(readFileSync(CANONICAL_DATAPACK_PATH, 'utf8'));

    // When: Checking variant references
    const configurables = canonical.products.filter(p => p.type === 'configurable');
    const allSkus = new Set(canonical.products.map(p => p.sku));
    const issues = [];

    for (const config of configurables) {
      if (!config.variants || config.variants.length === 0) {
        issues.push(`${config.sku} has no variants`);
        continue;
      }

      for (const variantSku of config.variants) {
        if (!allSkus.has(variantSku)) {
          issues.push(`${config.sku} references non-existent variant ${variantSku}`);
        }
      }
    }

    // Then: All configurable products should have valid variant references
    assert.strictEqual(issues.length, 0,
      `All configurable products should have valid variant references. Issues: ${issues.slice(0, 5).join('; ')}`);
  });

  it('should have all variants with valid parent references', () => {
    // Given: Canonical datapack with variant products
    const canonical = JSON.parse(readFileSync(CANONICAL_DATAPACK_PATH, 'utf8'));

    // When: Checking parent references
    const variants = canonical.products.filter(p => p.parentSku);
    const configurableSkus = new Set(
      canonical.products.filter(p => p.type === 'configurable').map(p => p.sku)
    );
    const issues = [];

    for (const variant of variants) {
      if (!configurableSkus.has(variant.parentSku)) {
        issues.push(`Variant ${variant.sku} references non-existent parent ${variant.parentSku}`);
      }
    }

    // Then: All variants should reference valid configurable parents
    assert.strictEqual(issues.length, 0,
      `All variants should reference valid configurable parents. Issues: ${issues.slice(0, 5).join('; ')}`);
  });

});

// =============================================================================
// TEST 4: No duplicate SKUs across outputs
// =============================================================================

describe('No duplicate SKUs in outputs', () => {

  it('should have no duplicate SKUs in canonical datapack', () => {
    // Given: Canonical datapack
    const canonical = JSON.parse(readFileSync(CANONICAL_DATAPACK_PATH, 'utf8'));

    // When: Checking for duplicates
    const skuCounts = {};
    const duplicates = [];

    for (const product of canonical.products) {
      skuCounts[product.sku] = (skuCounts[product.sku] || 0) + 1;
      if (skuCounts[product.sku] === 2) {
        duplicates.push(product.sku);
      }
    }

    // Then: No duplicates should exist
    assert.strictEqual(duplicates.length, 0,
      `Canonical should have no duplicate SKUs. Found: ${duplicates.slice(0, 5).join(', ')}`);
  });

  it('should have no duplicate SKUs in Commerce output', () => {
    // Given: Commerce products
    const commerce = JSON.parse(readFileSync(COMMERCE_PRODUCTS_PATH, 'utf8'));

    // When: Checking for duplicates
    const skuCounts = {};
    const duplicates = [];

    for (const product of commerce.source.items) {
      skuCounts[product.sku] = (skuCounts[product.sku] || 0) + 1;
      if (skuCounts[product.sku] === 2) {
        duplicates.push(product.sku);
      }
    }

    // Then: No duplicates should exist
    assert.strictEqual(duplicates.length, 0,
      `Commerce should have no duplicate SKUs. Found: ${duplicates.slice(0, 5).join(', ')}`);
  });

  it('should have no duplicate SKUs in ACO outputs', () => {
    // Given: ACO products and variants
    const acoProducts = JSON.parse(readFileSync(ACO_PRODUCTS_PATH, 'utf8'));
    const acoVariants = JSON.parse(readFileSync(ACO_VARIANTS_PATH, 'utf8'));

    // When: Checking for duplicates across both files
    const skuCounts = {};
    const duplicates = [];

    for (const product of acoProducts) {
      skuCounts[product.sku] = (skuCounts[product.sku] || 0) + 1;
      if (skuCounts[product.sku] === 2) {
        duplicates.push(product.sku);
      }
    }

    for (const variant of acoVariants) {
      skuCounts[variant.sku] = (skuCounts[variant.sku] || 0) + 1;
      if (skuCounts[variant.sku] === 2) {
        duplicates.push(variant.sku);
      }
    }

    // Then: No duplicates should exist across both files
    assert.strictEqual(duplicates.length, 0,
      `ACO should have no duplicate SKUs across products and variants. Found: ${duplicates.slice(0, 5).join(', ')}`);
  });

});
