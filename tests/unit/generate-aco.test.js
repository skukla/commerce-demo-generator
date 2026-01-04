/**
 * Unit tests for generate-aco.js
 * Tests for extractCategorySlugPaths() and transformToAcoProduct() functions
 *
 * @module tests/unit/generate-aco.test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  extractCategorySlugPaths,
  transformToAcoProduct,
  slugify
} from '../../generators/generate-aco.js';

// =============================================================================
// UNIT TESTS: extractCategorySlugPaths()
// =============================================================================

describe('extractCategorySlugPaths', () => {

  it('should return empty array for null input', () => {
    // Given: null input
    const commerceCategories = null;

    // When: extractCategorySlugPaths is called
    const result = extractCategorySlugPaths(commerceCategories);

    // Then: Returns empty array
    assert.deepStrictEqual(result, []);
  });

  it('should return empty array for undefined input', () => {
    // Given: undefined input
    const commerceCategories = undefined;

    // When: extractCategorySlugPaths is called
    const result = extractCategorySlugPaths(commerceCategories);

    // Then: Returns empty array
    assert.deepStrictEqual(result, []);
  });

  it('should return empty array for empty string input', () => {
    // Given: empty string input
    const commerceCategories = '';

    // When: extractCategorySlugPaths is called
    const result = extractCategorySlugPaths(commerceCategories);

    // Then: Returns empty array
    assert.deepStrictEqual(result, []);
  });

  it('should return single slug for one-level category after root', () => {
    // Given: one-level category path (root + one subcategory)
    const commerceCategories = 'BuildRight Catalog/Structural Materials';

    // When: extractCategorySlugPaths is called
    const result = extractCategorySlugPaths(commerceCategories);

    // Then: Returns array with single slug (root is excluded)
    assert.deepStrictEqual(result, ['structural-materials']);
  });

  it('should return hierarchical slugs for two-level category', () => {
    // Given: two-level category path
    const commerceCategories = 'BuildRight Catalog/Structural Materials/Lumber';

    // When: extractCategorySlugPaths is called
    const result = extractCategorySlugPaths(commerceCategories);

    // Then: Returns array with hierarchical slug paths
    assert.deepStrictEqual(result, [
      'structural-materials',
      'structural-materials/lumber'
    ]);
  });

  it('should return hierarchical slugs for three-level category', () => {
    // Given: three-level category path
    const commerceCategories = 'BuildRight Catalog/Structural Materials/Lumber/Dimensional';

    // When: extractCategorySlugPaths is called
    const result = extractCategorySlugPaths(commerceCategories);

    // Then: Returns array with all hierarchical slug paths
    assert.deepStrictEqual(result, [
      'structural-materials',
      'structural-materials/lumber',
      'structural-materials/lumber/dimensional'
    ]);
  });

  it('should correctly slugify category names with special characters (ampersand)', () => {
    // Given: category with ampersand
    const commerceCategories = 'BuildRight Catalog/Windows & Doors';

    // When: extractCategorySlugPaths is called
    const result = extractCategorySlugPaths(commerceCategories);

    // Then: Returns slugified path with ampersand converted
    assert.deepStrictEqual(result, ['windows-doors']);
  });

  it('should correctly slugify category names with multiple spaces', () => {
    // Given: category with multiple spaces
    const commerceCategories = 'BuildRight Catalog/Power  Tools/Cordless  Drills';

    // When: extractCategorySlugPaths is called
    const result = extractCategorySlugPaths(commerceCategories);

    // Then: Returns slugified paths with spaces normalized
    assert.deepStrictEqual(result, [
      'power-tools',
      'power-tools/cordless-drills'
    ]);
  });

});

// =============================================================================
// INTEGRATION TEST: transformToAcoProduct() with categories attribute
// =============================================================================

describe('transformToAcoProduct - categories attribute integration', () => {

  it('should include categories attribute with correct slug paths in transformed product', () => {
    // Given: A Commerce product with categories path
    const commerceProduct = {
      sku: 'TEST-SKU-001',
      name: 'Test Product',
      description: 'A test product',
      url_key: 'test-product',
      product_online: 1,
      visibility: 4,
      price: '29.99',
      weight: '1.5',
      categories: 'BuildRight Catalog/Structural Materials/Lumber'
    };

    // Category code map for routes (existing functionality)
    const categoryCodeMap = new Map();
    categoryCodeMap.set('BuildRight Catalog/Structural Materials/Lumber', 'structural-materials/lumber');
    categoryCodeMap.set('Lumber', 'structural-materials/lumber');

    // When: transformToAcoProduct is called
    const result = transformToAcoProduct(commerceProduct, categoryCodeMap);

    // Then: Result includes attributes array containing categories attribute
    assert.ok(result.attributes, 'Product should have attributes array');

    const categoriesAttr = result.attributes.find(attr => attr.code === 'categories');
    assert.ok(categoriesAttr, 'Product should have categories attribute');

    // Verify the categories attribute has the correct hierarchical slug paths
    assert.deepStrictEqual(categoriesAttr.values, [
      'structural-materials',
      'structural-materials/lumber'
    ], 'Categories attribute should contain hierarchical slug paths');
  });

});

// =============================================================================
// STEP 2: br_product_category REMOVAL VERIFICATION
// =============================================================================

describe('transformToAcoProduct - br_product_category removal', () => {

  it('should NOT include br_product_category attribute in transformed product (even if present in input)', () => {
    // Given: A Commerce product that still has br_product_category (legacy data)
    // NOTE: This test verifies that transformToAcoProduct filters out br_product_category
    // even if it's present in the input data (for backwards compatibility during migration)
    const commerceProduct = {
      sku: 'TEST-SKU-002',
      name: 'Test Product Without Category Attr',
      description: 'A test product',
      url_key: 'test-product-no-cat-attr',
      product_online: 1,
      visibility: 4,
      price: '19.99',
      weight: '2.0',
      categories: 'BuildRight Catalog/Structural Materials/Lumber',
      br_brand: 'TestBrand',
      br_unit_of_measure: 'EA',
      br_product_category: 'Structural Materials'  // Legacy attribute - should be filtered out
    };

    // Category code map for routes
    const categoryCodeMap = new Map();
    categoryCodeMap.set('BuildRight Catalog/Structural Materials/Lumber', 'structural-materials/lumber');

    // When: transformToAcoProduct is called
    const result = transformToAcoProduct(commerceProduct, categoryCodeMap);

    // Then: attributes array should NOT contain br_product_category
    assert.ok(result.attributes, 'Product should have attributes array');

    const brProductCategoryAttr = result.attributes.find(attr => attr.code === 'br_product_category');
    assert.strictEqual(brProductCategoryAttr, undefined,
      'Product attributes should NOT contain br_product_category (it should be filtered out)');
  });

  it('should still include br_brand attribute after br_product_category removal', () => {
    // Given: A Commerce product with br_brand
    const commerceProduct = {
      sku: 'TEST-SKU-003',
      name: 'Test Product With Brand',
      description: 'A test product',
      url_key: 'test-product-brand',
      product_online: 1,
      visibility: 4,
      price: '24.99',
      weight: '1.0',
      categories: 'BuildRight Catalog/Structural Materials/Lumber',
      br_brand: 'BuilderPro'
    };

    const categoryCodeMap = new Map();

    // When: transformToAcoProduct is called
    const result = transformToAcoProduct(commerceProduct, categoryCodeMap);

    // Then: br_brand attribute should still be present
    const brBrandAttr = result.attributes.find(attr => attr.code === 'br_brand');
    assert.ok(brBrandAttr, 'Product should still have br_brand attribute');
    assert.deepStrictEqual(brBrandAttr.values, ['BuilderPro'], 'br_brand should have correct value');
  });

  it('should still include native categories attribute (from Step 1) after br_product_category removal', () => {
    // Given: A Commerce product in "Structural Materials/Lumber" category
    const commerceProduct = {
      sku: 'TEST-SKU-004',
      name: 'Test Product Categories',
      description: 'A test product',
      url_key: 'test-product-categories',
      product_online: 1,
      visibility: 4,
      price: '14.99',
      weight: '0.5',
      categories: 'BuildRight Catalog/Structural Materials/Lumber'
    };

    const categoryCodeMap = new Map();

    // When: transformToAcoProduct is called
    const result = transformToAcoProduct(commerceProduct, categoryCodeMap);

    // Then: native categories attribute should contain hierarchical slug paths
    const categoriesAttr = result.attributes.find(attr => attr.code === 'categories');
    assert.ok(categoriesAttr, 'Product should have native categories attribute');
    assert.deepStrictEqual(categoriesAttr.values, [
      'structural-materials',
      'structural-materials/lumber'
    ], 'Native categories attribute should contain hierarchical slug paths');
  });

});

// =============================================================================
// VERIFICATION: slugify helper (dependency for extractCategorySlugPaths)
// =============================================================================

describe('slugify - helper function verification', () => {

  it('should convert text to lowercase slug', () => {
    // Given: text with uppercase
    const text = 'Structural Materials';

    // When: slugify is called
    const result = slugify(text);

    // Then: Returns lowercase slug
    assert.strictEqual(result, 'structural-materials');
  });

  it('should handle special characters', () => {
    // Given: text with special characters
    const text = 'Windows & Doors';

    // When: slugify is called
    const result = slugify(text);

    // Then: Special characters are removed/replaced
    assert.strictEqual(result, 'windows-doors');
  });

});
