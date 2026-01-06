/**
 * Canonical Datapack Validator
 *
 * Validation utilities to verify canonical datapack integrity before
 * downstream transformations. Catches duplicate SKUs, missing required
 * categories, and orphaned variants.
 *
 * All validators return consistent format: { valid: boolean, errors: string[] }
 *
 * @module lib/canonical-validator
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} errors - Array of error messages (empty if valid)
 */

/**
 * Validate that all product SKUs are unique
 *
 * @param {Array<Object>} products - Array of product objects with 'sku' property
 * @returns {ValidationResult} Validation result
 *
 * @example
 * const result = validateUniqueSKUs([
 *   { sku: 'ABC-001' },
 *   { sku: 'ABC-001' }  // duplicate
 * ]);
 * // result: { valid: false, errors: ['Duplicate SKU: ABC-001'] }
 */
export function validateUniqueSKUs(products) {
  const errors = [];
  const seen = new Set();
  const duplicates = new Set();

  for (const product of products) {
    if (seen.has(product.sku)) {
      duplicates.add(product.sku);
    } else {
      seen.add(product.sku);
    }
  }

  for (const sku of duplicates) {
    errors.push(`Duplicate SKU: ${sku}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate that all products have required category slugs
 *
 * @param {Array<Object>} products - Array of product objects with 'categories' array
 * @param {string[]} requiredSlugs - Array of required category slugs (e.g., ['all-products'])
 * @returns {ValidationResult} Validation result
 *
 * @example
 * const result = validateRequiredCategories(
 *   [{ sku: 'PROD-001', categories: ['structural'] }],
 *   ['all-products']
 * );
 * // result: { valid: false, errors: ['Product PROD-001 missing required category: all-products'] }
 */
export function validateRequiredCategories(products, requiredSlugs) {
  const errors = [];

  for (const product of products) {
    const categories = product.categories || [];

    for (const slug of requiredSlugs) {
      if (!categories.includes(slug)) {
        errors.push(`Product ${product.sku} missing required category: ${slug}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate bidirectional variant-parent references
 *
 * Checks two conditions:
 * 1. Variants (products with parentSku) must reference existing configurable parent SKUs
 * 2. Configurable parents must only reference variant SKUs that exist in products array
 *
 * @param {Array<Object>} products - Array of product objects
 * @returns {ValidationResult} Validation result
 *
 * @example
 * // Orphaned variant (missing parent)
 * const result = validateVariantParentRefs([
 *   { sku: 'VAR-001', parentSku: 'MISSING-CONFIG' }
 * ]);
 * // result.errors: ['Variant VAR-001 references non-existent parent: MISSING-CONFIG']
 */
export function validateVariantParentRefs(products) {
  const errors = [];

  // Build sets for lookup
  const allSkus = new Set(products.map(p => p.sku));
  const configurableSkus = new Set(
    products.filter(p => p.type === 'configurable').map(p => p.sku)
  );

  // Check 1: Variants must reference existing parent SKUs
  for (const product of products) {
    if (product.parentSku) {
      if (!configurableSkus.has(product.parentSku)) {
        errors.push(
          `Variant ${product.sku} references non-existent parent: ${product.parentSku}`
        );
      }
    }
  }

  // Check 2: Configurable parents must reference existing variant SKUs
  for (const product of products) {
    if (product.type === 'configurable' && Array.isArray(product.variants)) {
      for (const variantSku of product.variants) {
        if (!allSkus.has(variantSku)) {
          errors.push(
            `Configurable ${product.sku} references non-existent variant: ${variantSku}`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Run all validators on a canonical datapack
 *
 * Executes all validation checks in sequence:
 * 1. SKU uniqueness (validateUniqueSKUs)
 * 2. Required categories (validateRequiredCategories with 'all-products')
 * 3. Variant-parent references (validateVariantParentRefs)
 *
 * @param {Object} datapack - Canonical datapack object with 'products' array
 * @returns {ValidationResult} Aggregated validation result with all errors
 *
 * @example
 * const result = validateCanonicalDatapack({
 *   products: [...],
 *   categories: [...],
 *   metadata: {}
 * });
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors);
 * }
 */
export function validateCanonicalDatapack(datapack) {
  const products = datapack.products || [];
  const allErrors = [];

  // Run all validators
  const skuResult = validateUniqueSKUs(products);
  allErrors.push(...skuResult.errors);

  const categoryResult = validateRequiredCategories(products, ['all-products']);
  allErrors.push(...categoryResult.errors);

  const refResult = validateVariantParentRefs(products);
  allErrors.push(...refResult.errors);

  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}
