/**
 * Unit tests for canonical-validator.js
 * Tests for canonical datapack validation utilities
 *
 * Step 2: Add Canonical Validation Layer
 *
 * All validators return consistent format: { valid: boolean, errors: string[] }
 *
 * @module tests/unit/canonical-validator.test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateUniqueSKUs,
  validateRequiredCategories,
  validateVariantParentRefs,
  validateCanonicalDatapack
} from '../../lib/canonical-validator.js';

// =============================================================================
// TEST 1: validateUniqueSKUs detects duplicates
// =============================================================================

describe('validateUniqueSKUs', () => {

  it('should detect duplicate SKUs and return error with SKU identifier', () => {
    // Given: Product array with two items sharing same SKU
    const products = [
      { sku: 'LUMBER-001', name: 'Product A', type: 'simple', categories: ['all-products'] },
      { sku: 'LUMBER-002', name: 'Product B', type: 'simple', categories: ['all-products'] },
      { sku: 'LUMBER-001', name: 'Product C Duplicate', type: 'simple', categories: ['all-products'] }
    ];

    // When: validateUniqueSKUs is called
    const result = validateUniqueSKUs(products);

    // Then: Returns { valid: false, errors: ['Duplicate SKU: LUMBER-001'] }
    assert.strictEqual(result.valid, false, 'Should return valid: false for duplicates');
    assert.ok(Array.isArray(result.errors), 'Should return errors array');
    assert.ok(result.errors.length >= 1, 'Should have at least one error');
    assert.ok(
      result.errors.some(e => e.includes('Duplicate SKU') && e.includes('LUMBER-001')),
      `Should report duplicate SKU LUMBER-001, got: ${JSON.stringify(result.errors)}`
    );
  });

  it('should return valid: true when all SKUs are unique', () => {
    // Given: Product array with unique SKUs
    const products = [
      { sku: 'SKU-001', name: 'Product A', type: 'simple', categories: ['all-products'] },
      { sku: 'SKU-002', name: 'Product B', type: 'simple', categories: ['all-products'] },
      { sku: 'SKU-003', name: 'Product C', type: 'simple', categories: ['all-products'] }
    ];

    // When: validateUniqueSKUs is called
    const result = validateUniqueSKUs(products);

    // Then: Returns { valid: true, errors: [] }
    assert.strictEqual(result.valid, true, 'Should return valid: true for unique SKUs');
    assert.deepStrictEqual(result.errors, [], 'Should return empty errors array');
  });

});

// =============================================================================
// TEST 2: validateRequiredCategories detects missing all-products
// =============================================================================

describe('validateRequiredCategories', () => {

  it('should detect products missing required all-products category', () => {
    // Given: Product with categories array missing 'all-products' slug
    const products = [
      { sku: 'GOOD-001', name: 'Good Product', type: 'simple', categories: ['all-products', 'structural'] },
      { sku: 'BAD-001', name: 'Bad Product', type: 'simple', categories: ['structural'] }, // missing all-products
      { sku: 'GOOD-002', name: 'Another Good', type: 'simple', categories: ['all-products', 'electrical'] }
    ];
    const requiredSlugs = ['all-products'];

    // When: validateRequiredCategories is called
    const result = validateRequiredCategories(products, requiredSlugs);

    // Then: Returns error listing product SKU and missing category
    assert.strictEqual(result.valid, false, 'Should return valid: false for missing categories');
    assert.ok(Array.isArray(result.errors), 'Should return errors array');
    assert.ok(result.errors.length >= 1, 'Should have at least one error');
    assert.ok(
      result.errors.some(e => e.includes('BAD-001') && e.includes('all-products')),
      `Should report SKU BAD-001 missing all-products, got: ${JSON.stringify(result.errors)}`
    );
  });

  it('should return valid: true when all products have required categories', () => {
    // Given: All products have required categories
    const products = [
      { sku: 'GOOD-001', name: 'Product A', type: 'simple', categories: ['all-products', 'structural'] },
      { sku: 'GOOD-002', name: 'Product B', type: 'simple', categories: ['all-products', 'electrical'] }
    ];
    const requiredSlugs = ['all-products'];

    // When: validateRequiredCategories is called
    const result = validateRequiredCategories(products, requiredSlugs);

    // Then: Returns { valid: true, errors: [] }
    assert.strictEqual(result.valid, true, 'Should return valid: true when all have required categories');
    assert.deepStrictEqual(result.errors, [], 'Should return empty errors array');
  });

  it('should handle products with empty categories array', () => {
    // Given: Product with empty categories
    const products = [
      { sku: 'EMPTY-001', name: 'Empty Categories', type: 'simple', categories: [] }
    ];
    const requiredSlugs = ['all-products'];

    // When: validateRequiredCategories is called
    const result = validateRequiredCategories(products, requiredSlugs);

    // Then: Should detect missing category
    assert.strictEqual(result.valid, false, 'Should return valid: false for empty categories');
    assert.ok(
      result.errors.some(e => e.includes('EMPTY-001')),
      `Should report SKU EMPTY-001, got: ${JSON.stringify(result.errors)}`
    );
  });

});

// =============================================================================
// TEST 3: validateVariantParentRefs detects orphaned variants (missing parent)
// =============================================================================

describe('validateVariantParentRefs - orphaned variants', () => {

  it('should detect variant referencing non-existent parent SKU', () => {
    // Given: Variant with parentSku that does not exist in product array
    const products = [
      { sku: 'CONFIG-001', name: 'Config Parent', type: 'configurable', variants: ['VAR-001'], categories: ['all-products'] },
      { sku: 'VAR-001', name: 'Valid Variant', type: 'simple', parentSku: 'CONFIG-001', categories: ['all-products'] },
      { sku: 'VAR-ORPHAN', name: 'Orphan Variant', type: 'simple', parentSku: 'NONEXISTENT-CONFIG', categories: ['all-products'] }
    ];

    // When: validateVariantParentRefs is called
    const result = validateVariantParentRefs(products);

    // Then: Returns error identifying orphaned variant SKU
    assert.strictEqual(result.valid, false, 'Should return valid: false for orphaned variants');
    assert.ok(Array.isArray(result.errors), 'Should return errors array');
    assert.ok(result.errors.length >= 1, 'Should have at least one error');
    assert.ok(
      result.errors.some(e => e.includes('VAR-ORPHAN') && e.includes('NONEXISTENT-CONFIG')),
      `Should report orphan variant VAR-ORPHAN with missing parent, got: ${JSON.stringify(result.errors)}`
    );
  });

  it('should return valid: true when all variants have valid parents', () => {
    // Given: All variants reference existing parents
    const products = [
      { sku: 'CONFIG-001', name: 'Config Parent', type: 'configurable', variants: ['VAR-001', 'VAR-002'], categories: ['all-products'] },
      { sku: 'VAR-001', name: 'Variant 1', type: 'simple', parentSku: 'CONFIG-001', categories: ['all-products'] },
      { sku: 'VAR-002', name: 'Variant 2', type: 'simple', parentSku: 'CONFIG-001', categories: ['all-products'] }
    ];

    // When: validateVariantParentRefs is called
    const result = validateVariantParentRefs(products);

    // Then: Returns { valid: true, errors: [] }
    assert.strictEqual(result.valid, true, 'Should return valid: true for valid parent refs');
    assert.deepStrictEqual(result.errors, [], 'Should return empty errors array');
  });

});

// =============================================================================
// TEST 4: validateCanonicalDatapack runs all validators (happy path)
// =============================================================================

describe('validateCanonicalDatapack', () => {

  it('should return valid: true for a valid canonical datapack with no issues', () => {
    // Given: Valid canonical datapack with no issues
    const datapack = {
      products: [
        { sku: 'SIMPLE-001', name: 'Simple Product', type: 'simple', categories: ['all-products', 'structural'] },
        { sku: 'CONFIG-001', name: 'Configurable', type: 'configurable', variants: ['VAR-001', 'VAR-002'], categories: ['all-products'] },
        { sku: 'VAR-001', name: 'Variant 1', type: 'simple', parentSku: 'CONFIG-001', categories: ['all-products'] },
        { sku: 'VAR-002', name: 'Variant 2', type: 'simple', parentSku: 'CONFIG-001', categories: ['all-products'] }
      ],
      categories: [],
      attributes: [],
      metadata: { generatedAt: new Date().toISOString() }
    };

    // When: validateCanonicalDatapack is called
    const result = validateCanonicalDatapack(datapack);

    // Then: Returns { valid: true, errors: [] }
    assert.strictEqual(result.valid, true, 'Should return valid: true for valid datapack');
    assert.deepStrictEqual(result.errors, [], 'Should return empty errors array');
  });

  it('should aggregate errors from all validators', () => {
    // Given: Datapack with multiple issues
    const datapack = {
      products: [
        { sku: 'DUP-001', name: 'Duplicate 1', type: 'simple', categories: ['all-products'] },
        { sku: 'DUP-001', name: 'Duplicate 2', type: 'simple', categories: ['all-products'] }, // duplicate SKU
        { sku: 'NO-CAT-001', name: 'No Category', type: 'simple', categories: ['structural'] }, // missing all-products
        { sku: 'ORPHAN-VAR', name: 'Orphan', type: 'simple', parentSku: 'MISSING-PARENT', categories: ['all-products'] } // orphan
      ],
      categories: [],
      attributes: [],
      metadata: {}
    };

    // When: validateCanonicalDatapack is called
    const result = validateCanonicalDatapack(datapack);

    // Then: Should have multiple errors from different validators
    assert.strictEqual(result.valid, false, 'Should return valid: false for invalid datapack');
    assert.ok(result.errors.length >= 3, `Should have errors from multiple validators, got ${result.errors.length}`);

    // Check for errors from each validator type
    assert.ok(
      result.errors.some(e => e.includes('Duplicate SKU') || e.includes('DUP-001')),
      'Should include duplicate SKU error'
    );
    assert.ok(
      result.errors.some(e => e.includes('NO-CAT-001') && e.includes('all-products')),
      'Should include missing category error'
    );
    assert.ok(
      result.errors.some(e => e.includes('ORPHAN-VAR') || e.includes('MISSING-PARENT')),
      'Should include orphan variant error'
    );
  });

});

// =============================================================================
// TEST 5: Configurable parents reference existing variants
// =============================================================================

describe('validateVariantParentRefs - missing variant children', () => {

  it('should detect configurable parent referencing non-existent variant SKU', () => {
    // Given: Configurable parent with variants array containing SKU not in products
    const products = [
      {
        sku: 'CONFIG-001',
        name: 'Config Parent',
        type: 'configurable',
        variants: ['VAR-001', 'VAR-MISSING'], // VAR-MISSING does not exist
        categories: ['all-products']
      },
      { sku: 'VAR-001', name: 'Valid Variant', type: 'simple', parentSku: 'CONFIG-001', categories: ['all-products'] }
      // VAR-MISSING is not present in products array
    ];

    // When: validateVariantParentRefs is called
    const result = validateVariantParentRefs(products);

    // Then: Returns error for missing variant reference
    assert.strictEqual(result.valid, false, 'Should return valid: false for missing variant reference');
    assert.ok(Array.isArray(result.errors), 'Should return errors array');
    assert.ok(result.errors.length >= 1, 'Should have at least one error');
    assert.ok(
      result.errors.some(e => e.includes('CONFIG-001') && e.includes('VAR-MISSING')),
      `Should report CONFIG-001 references missing variant VAR-MISSING, got: ${JSON.stringify(result.errors)}`
    );
  });

  it('should return valid: true when all variant references exist', () => {
    // Given: All variants referenced in parent actually exist
    const products = [
      {
        sku: 'CONFIG-001',
        name: 'Config Parent',
        type: 'configurable',
        variants: ['VAR-001', 'VAR-002'],
        categories: ['all-products']
      },
      { sku: 'VAR-001', name: 'Variant 1', type: 'simple', parentSku: 'CONFIG-001', categories: ['all-products'] },
      { sku: 'VAR-002', name: 'Variant 2', type: 'simple', parentSku: 'CONFIG-001', categories: ['all-products'] }
    ];

    // When: validateVariantParentRefs is called
    const result = validateVariantParentRefs(products);

    // Then: Returns { valid: true, errors: [] }
    assert.strictEqual(result.valid, true, 'Should return valid: true when all variant refs exist');
    assert.deepStrictEqual(result.errors, [], 'Should return empty errors array');
  });

  it('should handle configurable products with empty variants array', () => {
    // Given: Configurable with empty variants array (edge case)
    const products = [
      {
        sku: 'CONFIG-EMPTY',
        name: 'Empty Config',
        type: 'configurable',
        variants: [],
        categories: ['all-products']
      }
    ];

    // When: validateVariantParentRefs is called
    const result = validateVariantParentRefs(products);

    // Then: Should be valid (empty is technically valid, just unusual)
    assert.strictEqual(result.valid, true, 'Should return valid: true for empty variants array');
    assert.deepStrictEqual(result.errors, [], 'Should return empty errors array');
  });

});
