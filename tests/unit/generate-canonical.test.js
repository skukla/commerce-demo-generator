/**
 * Unit tests for generate-canonical.js
 * Tests for configurable product generation (canonical format)
 *
 * Step 1: Extend Canonical Format for Configurable Products
 *
 * @module tests/unit/generate-canonical.test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  cartesianProduct,
  generateCanonicalConfigurable,
  generateCanonicalVariant,
  generateProducts
} from '../../generators/generate-canonical.js';

// =============================================================================
// TEST 1: generateCanonicalConfigurable returns parent with type 'configurable'
// =============================================================================

describe('generateCanonicalConfigurable', () => {

  it('should return product with type configurable and SKU ending in -CONFIG', () => {
    // Given: A configurable product definition with dimensions (lumber example)
    const configDef = {
      name: 'Dimensional Lumber',
      dimensions: {
        depth: ['1.75', '3.5'],
        width: ['5.5', '9.25'],
        length: ['8', '12']
      }
    };
    const categoryKey = 'structural';
    const subcategoryKey = 'lumber';
    const index = 0;

    // When: generateCanonicalConfigurable is called
    const result = generateCanonicalConfigurable(configDef, categoryKey, subcategoryKey, index);

    // Then: Returns product object with type 'configurable' and SKU ending in '-CONFIG'
    assert.strictEqual(result.type, 'configurable', 'Product type should be configurable');
    assert.ok(result.sku.endsWith('-CONFIG'), `SKU should end with -CONFIG, got: ${result.sku}`);
  });

});

// =============================================================================
// TEST 2: Configurable parent includes variant references
// =============================================================================

describe('generateCanonicalConfigurable - variant references', () => {

  it('should include variants array containing all variant SKUs for 2x2 dimension matrix', () => {
    // Given: A configurable definition with 2x2 dimension matrix (4 variants)
    const configDef = {
      name: 'Test Configurable',
      dimensions: {
        depth: ['1', '2'],
        width: ['3', '4']
      }
    };
    const categoryKey = 'structural';
    const subcategoryKey = 'lumber';
    const index = 1;

    // When: generateCanonicalConfigurable is called
    const result = generateCanonicalConfigurable(configDef, categoryKey, subcategoryKey, index);

    // Then: Parent product has 'variants' array containing 4 variant SKUs
    assert.ok(Array.isArray(result.variants), 'Should have variants array');
    assert.strictEqual(result.variants.length, 4, `Should have 4 variant SKUs for 2x2 matrix, got ${result.variants.length}`);

    // Verify all variant SKUs are strings and contain -VAR-
    for (const variantSku of result.variants) {
      assert.strictEqual(typeof variantSku, 'string', 'Each variant should be a SKU string');
      assert.ok(variantSku.includes('-VAR-'), `Variant SKU should include -VAR-, got: ${variantSku}`);
    }
  });

});

// =============================================================================
// TEST 3: generateCanonicalVariant returns simple product with parent reference
// =============================================================================

describe('generateCanonicalVariant', () => {

  it('should return simple product with parentSku and visibility not_visible_individually', () => {
    // Given: A parent configurable SKU and dimension combination
    const parentSku = 'STR-ABC123-CONFIG';
    const dimensions = { depth: '1.75', width: '5.5', length: '8' };
    const configDef = {
      name: 'Dimensional Lumber',
      dimensions: {
        depth: ['1.75', '3.5'],
        width: ['5.5', '9.25'],
        length: ['8', '12']
      }
    };
    const categoryKey = 'structural';
    const subcategoryKey = 'lumber';

    // When: generateCanonicalVariant is called
    const result = generateCanonicalVariant(parentSku, dimensions, configDef, categoryKey, subcategoryKey);

    // Then: Returns product with type 'simple', parentSku field, and visibility 'not_visible_individually'
    assert.strictEqual(result.type, 'simple', 'Variant should have type simple');
    assert.strictEqual(result.parentSku, parentSku, `Variant should reference parent SKU ${parentSku}`);
    assert.strictEqual(result.meta.visibility, 'not_visible_individually',
      'Variant visibility should be not_visible_individually');
  });

});

// =============================================================================
// TEST 4: All products include aggregate categories
// =============================================================================

describe('generateCanonicalConfigurable - aggregate categories', () => {

  it('should include all-products in categories array for configurable parent', () => {
    // Given: A configurable product definition
    const configDef = {
      name: 'Test Configurable',
      dimensions: {
        depth: ['1', '2'],
        width: ['3', '4']
      }
    };
    const categoryKey = 'structural';
    const subcategoryKey = 'lumber';
    const index = 2;

    // When: Product is generated
    const result = generateCanonicalConfigurable(configDef, categoryKey, subcategoryKey, index);

    // Then: categories array includes 'all-products' slug
    assert.ok(Array.isArray(result.categories), 'Product should have categories array');
    assert.ok(result.categories.includes('all-products'),
      `Categories should include 'all-products', got: ${JSON.stringify(result.categories)}`);
  });

});

describe('generateCanonicalVariant - aggregate categories', () => {

  it('should include all-products in categories array for variant', () => {
    // Given: A variant product
    const parentSku = 'STR-XYZ789-CONFIG';
    const dimensions = { depth: '2', width: '4' };
    const configDef = {
      name: 'Test Variant',
      dimensions: {
        depth: ['1', '2'],
        width: ['3', '4']
      }
    };
    const categoryKey = 'structural';
    const subcategoryKey = 'lumber';

    // When: Variant is generated
    const result = generateCanonicalVariant(parentSku, dimensions, configDef, categoryKey, subcategoryKey);

    // Then: categories array includes 'all-products' slug
    assert.ok(Array.isArray(result.categories), 'Variant should have categories array');
    assert.ok(result.categories.includes('all-products'),
      `Variant categories should include 'all-products', got: ${JSON.stringify(result.categories)}`);
  });

});

// =============================================================================
// TEST 5: cartesianProduct generates all dimension combinations
// =============================================================================

describe('cartesianProduct', () => {

  it('should generate all dimension combinations for 2x2 matrix', () => {
    // Given: Dimensions {depth: [1, 2], width: [3, 4]}
    const dimensions = {
      depth: [1, 2],
      width: [3, 4]
    };

    // When: cartesianProduct is called
    const result = cartesianProduct(dimensions);

    // Then: Returns 4 combinations
    assert.strictEqual(result.length, 4, `Should return 4 combinations, got ${result.length}`);

    // Verify all expected combinations are present
    const expected = [
      { depth: 1, width: 3 },
      { depth: 1, width: 4 },
      { depth: 2, width: 3 },
      { depth: 2, width: 4 }
    ];

    // Sort both arrays for comparison (order may vary)
    const sortFn = (a, b) => {
      const keyA = `${a.depth}-${a.width}`;
      const keyB = `${b.depth}-${b.width}`;
      return keyA.localeCompare(keyB);
    };

    const sortedResult = [...result].sort(sortFn);
    const sortedExpected = [...expected].sort(sortFn);

    assert.deepStrictEqual(sortedResult, sortedExpected,
      'Should contain all expected dimension combinations');
  });

  it('should generate 8 combinations for 2x2x2 matrix', () => {
    // Given: 3 dimensions with 2 values each
    const dimensions = {
      depth: ['1.75', '3.5'],
      width: ['5.5', '9.25'],
      length: ['8', '12']
    };

    // When: cartesianProduct is called
    const result = cartesianProduct(dimensions);

    // Then: Returns 8 combinations (2 * 2 * 2)
    assert.strictEqual(result.length, 8, `Should return 8 combinations, got ${result.length}`);

    // Verify each result has all dimension keys
    for (const combo of result) {
      assert.ok('depth' in combo, 'Each combination should have depth');
      assert.ok('width' in combo, 'Each combination should have width');
      assert.ok('length' in combo, 'Each combination should have length');
    }
  });

});

// =============================================================================
// TEST 6: generateProducts includes both simple and configurable products
// =============================================================================

describe('generateProducts', () => {

  it('should return array containing simple products AND configurable parents with their variants', () => {
    // Given: Product catalog with both simple and configurable definitions
    // (The PRODUCT_CATEGORIES includes both simple and configurable arrays)

    // When: generateProducts is called
    const result = generateProducts();

    // Then: Returns array containing multiple product types
    assert.ok(Array.isArray(result), 'Should return an array');
    assert.ok(result.length > 0, 'Should contain products');

    // Find simple products (type: 'simple' without parentSku)
    const simpleProducts = result.filter(p => p.type === 'simple' && !p.parentSku);
    assert.ok(simpleProducts.length > 0, 'Should include simple products');

    // Find configurable parents
    const configurableProducts = result.filter(p => p.type === 'configurable');
    assert.ok(configurableProducts.length > 0, 'Should include configurable products');

    // Find variants (simple products with parentSku)
    const variantProducts = result.filter(p => p.type === 'simple' && p.parentSku);
    assert.ok(variantProducts.length > 0, 'Should include variant products');

    // Verify variants reference existing parent SKUs
    const parentSkus = new Set(configurableProducts.map(p => p.sku));
    for (const variant of variantProducts) {
      assert.ok(parentSkus.has(variant.parentSku),
        `Variant ${variant.sku} should reference existing parent SKU, got: ${variant.parentSku}`);
    }

    // Verify all products have categories array with 'all-products'
    for (const product of result) {
      assert.ok(Array.isArray(product.categories), `Product ${product.sku} should have categories array`);
      assert.ok(product.categories.includes('all-products'),
        `Product ${product.sku} should include 'all-products' in categories`);
    }
  });

});
