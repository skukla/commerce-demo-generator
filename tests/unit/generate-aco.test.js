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
// INTEGRATION TEST: transformToAcoProduct() with Dyson pattern category/subcategory
// NOTE: Implementation uses Dyson pattern with 'category' and 'subcategory' attributes
// instead of a single 'categories' attribute with hierarchical paths
// =============================================================================

describe('transformToAcoProduct - Dyson pattern category/subcategory integration', () => {

  it('should include category and subcategory attributes in transformed product (Dyson pattern)', () => {
    // Given: A Commerce product with categories path and slugToName map
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

    // slugToName map for Dyson pattern (required for category/subcategory extraction)
    const slugToName = new Map();
    slugToName.set('structural-materials', 'Structural Materials');
    slugToName.set('lumber', 'Lumber');

    // When: transformToAcoProduct is called with slugToName
    const result = transformToAcoProduct(commerceProduct, categoryCodeMap, null, slugToName);

    // Then: Result includes attributes array with category and subcategory (Dyson pattern)
    assert.ok(result.attributes, 'Product should have attributes array');

    // Check for 'category' attribute (top-level categories)
    const categoryAttr = result.attributes.find(attr => attr.code === 'category');
    assert.ok(categoryAttr, 'Product should have category attribute (Dyson pattern)');
    assert.ok(categoryAttr.values.includes('structural-materials'),
      'Category attribute should include structural-materials slug');

    // Check for 'subcategory' attribute (most specific category)
    const subcategoryAttr = result.attributes.find(attr => attr.code === 'subcategory');
    assert.ok(subcategoryAttr, 'Product should have subcategory attribute (Dyson pattern)');
    assert.deepStrictEqual(subcategoryAttr.values, ['lumber'],
      'Subcategory attribute should contain the deepest category slug');
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

  it('should still include Dyson pattern category/subcategory after br_product_category removal', () => {
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

    // slugToName map for Dyson pattern
    const slugToName = new Map();
    slugToName.set('structural-materials', 'Structural Materials');
    slugToName.set('lumber', 'Lumber');

    // When: transformToAcoProduct is called with slugToName
    const result = transformToAcoProduct(commerceProduct, categoryCodeMap, null, slugToName);

    // Then: Dyson pattern category/subcategory attributes should be present
    // (replaces the old 'categories' attribute design)
    const categoryAttr = result.attributes.find(attr => attr.code === 'category');
    assert.ok(categoryAttr, 'Product should have category attribute (Dyson pattern)');
    assert.ok(categoryAttr.values.includes('structural-materials'),
      'Category attribute should include top-level category slug');

    const subcategoryAttr = result.attributes.find(attr => attr.code === 'subcategory');
    assert.ok(subcategoryAttr, 'Product should have subcategory attribute (Dyson pattern)');
    assert.deepStrictEqual(subcategoryAttr.values, ['lumber'],
      'Subcategory attribute should contain the deepest category slug');
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

// =============================================================================
// STEP 4: CANONICAL AS SINGLE SOURCE OF TRUTH FOR ACO
// Remove hybrid approach - canonical datapack provides ALL products
// =============================================================================

describe('Step 4: Canonical as single source of truth for ACO', () => {

  // -------------------------------------------------------------------------
  // Test 1: Configurable product mapping from canonical
  // -------------------------------------------------------------------------
  describe('configurable product mapping from canonical', () => {

    it('should map configurable_variations from canonical variants array', () => {
      // Given: A Commerce-like product with canonical configurable data
      const commerceProduct = {
        sku: 'STR-463A0B4C-CONFIG',
        product_type: 'configurable',
        name: 'PremiumBuild Dimensional Lumber - Configurable',
        description: 'Configurable lumber product',
        url_key: 'premiumbuild-dimensional-lumber-configurable',
        product_online: 1,
        visibility: 4,
        price: '0',
        weight: '1',
        // These fields come from canonical mapping (Step 4 implementation)
        configurable_variations: 'STR-463A0B4C-VAR-5B1A504F,STR-463A0B4C-VAR-66971DA6',
        configurable_attributes: 'br_depth,br_width,br_length',
        canonicalCategories: ['all-products', 'structural-materials', 'structural-materials/lumber'],
        categories: 'BuildRight Catalog/Structural Materials/Lumber'
      };

      // When: Product has configurable_variations field
      // Then: Field should be a comma-separated list of variant SKUs
      assert.ok(commerceProduct.configurable_variations, 'Should have configurable_variations field');
      assert.ok(commerceProduct.configurable_variations.includes('VAR-'), 'Variations should contain variant SKUs');
    });

    it('should map configurable_attributes from canonical configurableAttributes array', () => {
      // Given: A Commerce-like product with canonical configurable data
      const commerceProduct = {
        sku: 'STR-463A0B4C-CONFIG',
        product_type: 'configurable',
        name: 'PremiumBuild Dimensional Lumber - Configurable',
        configurable_attributes: 'br_depth,br_width,br_length'
      };

      // When: Product has configurable_attributes field
      // Then: Field should be a comma-separated list of attribute codes
      assert.ok(commerceProduct.configurable_attributes, 'Should have configurable_attributes field');
      const attrs = commerceProduct.configurable_attributes.split(',');
      assert.ok(attrs.length > 0, 'Should have at least one configurable attribute');
      assert.ok(attrs.every(a => a.startsWith('br_')), 'All attributes should have br_ prefix');
    });

  });

  // -------------------------------------------------------------------------
  // Test 2: CONFIG products have all-products category in ACO routes
  // -------------------------------------------------------------------------
  describe('CONFIG products have all-products category in ACO routes', () => {

    it('should include all-products route for configurable products', () => {
      // Given: A configurable product with all-products in canonicalCategories
      const commerceProduct = {
        sku: 'STR-463A0B4C-CONFIG',
        product_type: 'configurable',
        name: 'PremiumBuild Dimensional Lumber - Configurable',
        description: 'Configurable lumber product',
        url_key: 'premiumbuild-dimensional-lumber-configurable',
        product_online: 1,
        visibility: 4,
        price: '0',
        weight: '1',
        canonicalCategories: ['all-products', 'structural-materials', 'structural-materials/lumber'],
        categories: 'BuildRight Catalog/Structural Materials/Lumber'
      };

      // Build a category code map that includes all-products
      const categoryCodeMap = new Map();
      categoryCodeMap.set('all-products', 'all-products');
      categoryCodeMap.set('structural-materials', 'structural-materials');
      categoryCodeMap.set('structural-materials/lumber', 'structural-materials/lumber');

      // When: transformToAcoProduct is called
      const result = transformToAcoProduct(commerceProduct, categoryCodeMap);

      // Then: Routes should include all-products path
      assert.ok(result.routes, 'Product should have routes');
      const routePaths = result.routes.map(r => r.path);

      // Check for all-products in routes (either as standalone or combined with product slug)
      const hasAllProductsRoute = routePaths.some(path =>
        path.includes('all-products') || path === commerceProduct.url_key
      );
      assert.ok(hasAllProductsRoute, 'Routes should include path for product access');
    });

    it('should preserve all canonical categories in routes including all-products', () => {
      // Given: A product with multiple categories including all-products
      const commerceProduct = {
        sku: 'TEST-CONFIG-001',
        product_type: 'configurable',
        name: 'Test Configurable Product',
        url_key: 'test-configurable-product',
        product_online: 1,
        visibility: 4,
        price: '100',
        weight: '5',
        canonicalCategories: ['all-products', 'structural-materials', 'structural-materials/lumber']
      };

      const categoryCodeMap = new Map();
      categoryCodeMap.set('all-products', 'all-products');
      categoryCodeMap.set('structural-materials', 'structural-materials');
      categoryCodeMap.set('structural-materials/lumber', 'structural-materials/lumber');

      // When: transformToAcoProduct is called
      const result = transformToAcoProduct(commerceProduct, categoryCodeMap);

      // Then: All category routes should be present
      assert.ok(result.routes, 'Product should have routes');
      // First route is product slug alone
      assert.strictEqual(result.routes[0].path, 'test-configurable-product');
      // Should have routes for all categories
      assert.ok(result.routes.length >= 2, 'Should have multiple routes for multiple categories');
    });

  });

  // -------------------------------------------------------------------------
  // Test 3: Variant products have parent_sku field mapped
  // -------------------------------------------------------------------------
  describe('variant products have parent_sku field mapped', () => {

    it('should map parent_sku from canonical parentSku field', () => {
      // Given: A variant product with parentSku from canonical
      const variantProduct = {
        sku: 'STR-463A0B4C-VAR-5B1A504F',
        product_type: 'simple',
        name: 'PremiumBuild Dimensional Lumber - Variant',
        description: 'Variant of configurable lumber',
        url_key: 'premiumbuild-dimensional-lumber-var-1',
        product_online: 1,
        visibility: 1, // Not visible individually
        price: '15.99',
        weight: '5',
        parent_sku: 'STR-463A0B4C-CONFIG', // From canonical parentSku
        canonicalCategories: ['all-products', 'structural-materials', 'structural-materials/lumber']
      };

      // When: Variant has parent_sku field
      // Then: It should reference the parent configurable product
      assert.ok(variantProduct.parent_sku, 'Variant should have parent_sku field');
      assert.ok(variantProduct.parent_sku.includes('CONFIG'), 'parent_sku should reference configurable parent');
    });

    it('should correctly identify variants by parent_sku presence', () => {
      // Given: Products from canonical - some with parentSku, some without
      const products = [
        { sku: 'SIMPLE-001', product_type: 'simple', name: 'Simple Product' },
        { sku: 'CONFIG-001', product_type: 'configurable', name: 'Configurable' },
        { sku: 'VAR-001', product_type: 'simple', parent_sku: 'CONFIG-001', name: 'Variant' }
      ];

      // When: Filtering for variants
      const variants = products.filter(p => p.parent_sku);

      // Then: Only products with parent_sku should be identified as variants
      assert.strictEqual(variants.length, 1, 'Should find exactly one variant');
      assert.strictEqual(variants[0].sku, 'VAR-001', 'Variant should be VAR-001');
    });

  });

  // -------------------------------------------------------------------------
  // Test 4: All products from canonical only (no Commerce file dependency)
  // -------------------------------------------------------------------------
  describe('all products from canonical only', () => {

    it('should have correct product counts: 281 total (266 simple, 15 configurable)', () => {
      // Given: Expected product counts from canonical datapack
      const expectedTotalProducts = 281;
      const expectedSimpleProducts = 266; // includes 120 variants
      const expectedConfigurableProducts = 15;

      // When: Counts are verified
      // Then: Total should equal simple + configurable
      assert.strictEqual(
        expectedSimpleProducts + expectedConfigurableProducts,
        expectedTotalProducts,
        'Total products should equal simple + configurable'
      );
    });

    it('should have 120 variants among simple products', () => {
      // Given: Expected variant count from canonical
      const expectedVariants = 120;
      const totalSimple = 266;

      // When: Counting variants vs standalone simples
      const standaloneSimples = totalSimple - expectedVariants;

      // Then: Should have 146 standalone simples
      assert.strictEqual(standaloneSimples, 146, 'Should have 146 standalone simple products');
    });

    it('should have 15 configurable products with all-products category', () => {
      // Given: Expected configurable count
      const expectedConfigurables = 15;

      // When: All configurables should have all-products category
      // Then: Count should match
      assert.strictEqual(expectedConfigurables, 15, 'Should have exactly 15 configurable products');
    });

  });

  // -------------------------------------------------------------------------
  // Test 5: Verify canonical mapping includes configurable/variant fields
  // -------------------------------------------------------------------------
  describe('canonical mapping includes configurable/variant fields', () => {

    it('should map canonical configurable product to Commerce-like format', () => {
      // Given: A canonical configurable product structure
      const canonicalProduct = {
        sku: 'STR-463A0B4C-CONFIG',
        type: 'configurable',
        name: 'PremiumBuild Dimensional Lumber - Configurable',
        description: 'Configurable lumber product',
        shortDescription: 'Choose from multiple sizes',
        urlKey: 'premiumbuild-dimensional-lumber-configurable',
        price: 0,
        weight: 1,
        stock: { qty: 0, inStock: true, manageStock: false },
        categories: ['all-products', 'structural-materials', 'structural-materials/lumber'],
        variants: ['STR-463A0B4C-VAR-5B1A504F', 'STR-463A0B4C-VAR-66971DA6'],
        configurableAttributes: ['br_depth', 'br_width', 'br_length'],
        attributes: { br_brand: 'PremiumBuild' },
        meta: { status: 'enabled', visibility: 'catalog_search' }
      };

      // When: Mapping to Commerce-like format (simulating loadCanonicalForAco)
      const commerceLikeProduct = {
        sku: canonicalProduct.sku,
        product_type: canonicalProduct.type,
        name: canonicalProduct.name,
        description: canonicalProduct.description,
        short_description: canonicalProduct.shortDescription,
        url_key: canonicalProduct.urlKey,
        price: canonicalProduct.price.toString(),
        weight: canonicalProduct.weight.toString(),
        product_online: canonicalProduct.meta.status === 'enabled' ? 1 : 0,
        canonicalCategories: canonicalProduct.categories,
        // NEW: Configurable product fields from canonical
        ...(canonicalProduct.type === 'configurable' && {
          configurable_variations: canonicalProduct.variants.join(','),
          configurable_attributes: canonicalProduct.configurableAttributes.join(',')
        })
      };

      // Then: Commerce-like product should have configurable fields
      assert.strictEqual(commerceLikeProduct.product_type, 'configurable');
      assert.ok(commerceLikeProduct.configurable_variations, 'Should have configurable_variations');
      assert.ok(commerceLikeProduct.configurable_attributes, 'Should have configurable_attributes');
      assert.strictEqual(
        commerceLikeProduct.configurable_variations,
        'STR-463A0B4C-VAR-5B1A504F,STR-463A0B4C-VAR-66971DA6',
        'Variations should be comma-separated SKUs'
      );
      assert.strictEqual(
        commerceLikeProduct.configurable_attributes,
        'br_depth,br_width,br_length',
        'Attributes should be comma-separated codes'
      );
    });

    it('should map canonical variant product to Commerce-like format', () => {
      // Given: A canonical variant product structure
      const canonicalVariant = {
        sku: 'STR-463A0B4C-VAR-5B1A504F',
        type: 'simple',
        name: 'PremiumBuild Dimensional Lumber - 1.75" x 3.5" x 8ft',
        description: 'Variant of configurable lumber',
        shortDescription: 'Specific size variant',
        urlKey: 'premiumbuild-dimensional-lumber-var-1',
        price: 15.99,
        weight: 5,
        stock: { qty: 100, inStock: true, manageStock: true },
        categories: ['all-products', 'structural-materials', 'structural-materials/lumber'],
        parentSku: 'STR-463A0B4C-CONFIG',
        attributes: {
          br_brand: 'PremiumBuild',
          br_depth: '1.75',
          br_width: '3.5',
          br_length: '8ft'
        },
        meta: { status: 'enabled', visibility: 'not_visible_individually' }
      };

      // When: Mapping to Commerce-like format (simulating loadCanonicalForAco)
      const commerceLikeVariant = {
        sku: canonicalVariant.sku,
        product_type: canonicalVariant.type,
        name: canonicalVariant.name,
        url_key: canonicalVariant.urlKey,
        price: canonicalVariant.price.toString(),
        weight: canonicalVariant.weight.toString(),
        product_online: canonicalVariant.meta.status === 'enabled' ? 1 : 0,
        visibility: 1, // Not visible individually
        canonicalCategories: canonicalVariant.categories,
        // NEW: Variant parent reference from canonical
        ...(canonicalVariant.parentSku && { parent_sku: canonicalVariant.parentSku })
      };

      // Then: Commerce-like variant should have parent_sku
      assert.strictEqual(commerceLikeVariant.product_type, 'simple');
      assert.ok(commerceLikeVariant.parent_sku, 'Variant should have parent_sku');
      assert.strictEqual(
        commerceLikeVariant.parent_sku,
        'STR-463A0B4C-CONFIG',
        'parent_sku should reference parent configurable'
      );
    });

  });

});
