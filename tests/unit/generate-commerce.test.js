/**
 * Unit tests for generate-commerce.js
 * Tests for canonical-to-Commerce transformation including configurable products
 *
 * Step 3: Refactor generate-commerce.js to Transform from Canonical
 *
 * @module tests/unit/generate-commerce.test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to generate-commerce.js for import checking
const GENERATE_COMMERCE_PATH = resolve(__dirname, '../../generators/generate-commerce.js');

// Path to canonical datapack for integration tests
const CANONICAL_DATAPACK_PATH = resolve(__dirname, '../../../buildright-data/generated/canonical/datapack.json');

// =============================================================================
// TEST 1: loadProductsFromCanonical returns all product types
// =============================================================================

describe('loadProductsFromCanonical', () => {

  it('should return all product types including simple, configurable, and variants', async () => {
    // Given: Canonical datapack with simple, configurable, and variant products
    // Import the function dynamically to get the latest version
    const { loadProductsFromCanonical } = await import('../../generators/generate-commerce.js');

    // When: loadProductsFromCanonical() is called
    const products = loadProductsFromCanonical();

    // Then: Returns array containing all product types with correct Commerce format
    assert.ok(Array.isArray(products), 'Should return an array');
    assert.ok(products.length > 0, 'Should contain products');

    // Verify we have simple products (without parent_sku)
    const simpleProducts = products.filter(p => p.type_id === 'simple' && !p.parent_sku);
    assert.ok(simpleProducts.length > 0, 'Should include simple products');

    // Verify we have configurable products
    const configurableProducts = products.filter(p => p.type_id === 'configurable');
    assert.ok(configurableProducts.length > 0, 'Should include configurable products');

    // Verify we have variant products (simple with parent_sku)
    const variantProducts = products.filter(p => p.parent_sku);
    assert.ok(variantProducts.length > 0, 'Should include variant products');

    // Verify all products have required Commerce fields
    for (const product of products) {
      assert.ok(product.sku, `Product should have sku`);
      assert.ok(product.type_id, `Product ${product.sku} should have type_id`);
      assert.ok(product.name, `Product ${product.sku} should have name`);
    }
  });

});

// =============================================================================
// TEST 2: Configurable parent transforms with configurable_variations
// =============================================================================

describe('Configurable parent transformation', () => {

  it('should transform configurable with type_id configurable and configurable_variations from variants array', async () => {
    // Given: Canonical configurable product with variants array
    const { loadProductsFromCanonical } = await import('../../generators/generate-commerce.js');

    // When: Transformed to Commerce format
    const products = loadProductsFromCanonical();
    const configurable = products.find(p => p.type_id === 'configurable');

    // Then: Has type_id: 'configurable' and configurable_variations as comma-separated SKUs
    assert.ok(configurable, 'Should find a configurable product');
    assert.strictEqual(configurable.type_id, 'configurable', 'Should have type_id configurable');
    assert.ok(configurable.configurable_variations, `Configurable ${configurable.sku} should have configurable_variations`);

    // Verify configurable_variations is a comma-separated string of variant SKUs
    const variationSkus = configurable.configurable_variations.split(',');
    assert.ok(variationSkus.length > 0, 'Should have at least one variant SKU');

    // Verify each variation SKU contains -VAR- (variant pattern)
    for (const sku of variationSkus) {
      assert.ok(sku.includes('-VAR-'), `Variation SKU ${sku} should contain -VAR-`);
    }
  });

});

// =============================================================================
// TEST 3: Variant transforms with parent_sku and visibility=1
// =============================================================================

describe('Variant transformation', () => {

  it('should transform variant with parent_sku and visibility 1 (Not Visible Individually)', async () => {
    // Given: Canonical variant with parentSku and visibility: 'not_visible_individually'
    const { loadProductsFromCanonical } = await import('../../generators/generate-commerce.js');

    // When: Transformed to Commerce format
    const products = loadProductsFromCanonical();
    const variant = products.find(p => p.parent_sku);

    // Then: Has parent_sku field and visibility: 1 (Not Visible Individually)
    assert.ok(variant, 'Should find a variant product');
    assert.ok(variant.parent_sku, 'Variant should have parent_sku field');
    assert.strictEqual(variant.visibility, 1, `Variant ${variant.sku} should have visibility 1, got ${variant.visibility}`);

    // Verify parent_sku matches a configurable product
    const parentSku = variant.parent_sku;
    const parent = products.find(p => p.sku === parentSku);
    assert.ok(parent, `Variant parent_sku ${parentSku} should reference existing product`);
    assert.strictEqual(parent.type_id, 'configurable', 'Parent should be configurable');
  });

});

// =============================================================================
// TEST 4: Configurable attributes map from canonical configurableAttributes
// =============================================================================

describe('Configurable attributes mapping', () => {

  it('should transform configurableAttributes array to comma-separated configurable_attributes', async () => {
    // Given: Canonical configurable with configurableAttributes: ['br_depth', 'br_width', ...]
    const { loadProductsFromCanonical } = await import('../../generators/generate-commerce.js');

    // When: Transformed to Commerce format
    const products = loadProductsFromCanonical();
    const configurable = products.find(p => p.type_id === 'configurable');

    // Then: Has configurable_attributes as comma-separated attribute codes
    assert.ok(configurable, 'Should find a configurable product');
    assert.ok(configurable.configurable_attributes,
      `Configurable ${configurable.sku} should have configurable_attributes`);

    // Verify configurable_attributes is a comma-separated string of attribute codes
    const attributeCodes = configurable.configurable_attributes.split(',');
    assert.ok(attributeCodes.length > 0, 'Should have at least one attribute code');

    // Verify attribute codes follow br_ prefix pattern
    for (const code of attributeCodes) {
      assert.ok(code.startsWith('br_'), `Attribute code ${code} should start with br_`);
    }
  });

});

// =============================================================================
// TEST 5: generateVariants import removed from generate-commerce.js
// =============================================================================

describe('generateVariants import removal', () => {

  it('should NOT have import of generateVariants from product-variants.js', () => {
    // Given: Refactored generate-commerce.js file
    assert.ok(existsSync(GENERATE_COMMERCE_PATH), 'generate-commerce.js should exist');

    // When: Module imports are checked
    const fileContent = readFileSync(GENERATE_COMMERCE_PATH, 'utf8');

    // Then: No active import statement of generateVariants from ./product-variants.js
    // Check for actual import syntax patterns (not comments mentioning the words)
    const importPatterns = [
      /import\s*\{\s*generateVariants\s*\}\s*from\s*['"]\.\/product-variants/,
      /import\s*{[^}]*generateVariants[^}]*}\s*from\s*['"]\.\/product-variants/,
      /import\s+generateVariants\s+from\s*['"]\.\/product-variants/
    ];

    const hasGenerateVariantsImport = importPatterns.some(pattern => pattern.test(fileContent));

    assert.strictEqual(hasGenerateVariantsImport, false,
      'Should NOT import generateVariants from product-variants.js - ' +
      'all products must come from canonical datapack');
  });

});

// =============================================================================
// TEST 6: All 281 products generated exclusively from canonical
// =============================================================================

describe('Full canonical integration', () => {

  it('should load all 281 products from canonical with no duplicate SKUs', async () => {
    // Given: Full canonical datapack with 146 simple + 15 configurable + 120 variants = 281 products
    // Verify canonical datapack exists first
    assert.ok(existsSync(CANONICAL_DATAPACK_PATH),
      'Canonical datapack should exist at expected path');

    const canonical = JSON.parse(readFileSync(CANONICAL_DATAPACK_PATH, 'utf8'));
    const expectedTotal = canonical.products.length;

    // When: loadProductsFromCanonical() runs
    const { loadProductsFromCanonical } = await import('../../generators/generate-commerce.js');
    const products = loadProductsFromCanonical();

    // Then: Products match expected total with no duplicates
    assert.strictEqual(products.length, expectedTotal,
      `Should load all ${expectedTotal} products from canonical, got ${products.length}`);

    // Verify no duplicate SKUs
    const skuSet = new Set();
    const duplicates = [];
    for (const product of products) {
      if (skuSet.has(product.sku)) {
        duplicates.push(product.sku);
      } else {
        skuSet.add(product.sku);
      }
    }

    assert.strictEqual(duplicates.length, 0,
      `Should have no duplicate SKUs, found duplicates: ${duplicates.join(', ')}`);

    // Verify product type breakdown matches canonical
    const simpleCount = products.filter(p => p.type_id === 'simple' && !p.parent_sku).length;
    const configurableCount = products.filter(p => p.type_id === 'configurable').length;
    const variantCount = products.filter(p => p.parent_sku).length;

    const canonicalSimple = canonical.products.filter(p => p.type === 'simple' && !p.parentSku).length;
    const canonicalConfigurable = canonical.products.filter(p => p.type === 'configurable').length;
    const canonicalVariants = canonical.products.filter(p => p.parentSku).length;

    assert.strictEqual(simpleCount, canonicalSimple,
      `Simple product count should match: expected ${canonicalSimple}, got ${simpleCount}`);
    assert.strictEqual(configurableCount, canonicalConfigurable,
      `Configurable product count should match: expected ${canonicalConfigurable}, got ${configurableCount}`);
    assert.strictEqual(variantCount, canonicalVariants,
      `Variant product count should match: expected ${canonicalVariants}, got ${variantCount}`);
  });

});
