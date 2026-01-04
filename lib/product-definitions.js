/**
 * Product definitions for Commerce product generation
 *
 * Loaded from PROJECT_CONFIG which reads from data repository
 * Source: {data-repo}/definitions/products/*.json
 *
 * To update product catalog, brands, or units:
 * Edit the JSON files in the data repository's definitions/products/ directory
 *
 * DESIGN DECISION: Products use ONLY generic brands (not category-specific).
 * This ensures br_brand values match attribute options in product-attributes.json.
 * See: .rptc/research/brand-generation-issues/research.md
 */

import { PROJECT_CONFIG } from '../config/project-config.js';

// Load generic brands only - these match br_brand attribute options
// NOTE: categorySpecific brands are NOT used (see design decision above)
export const BRANDS = PROJECT_CONFIG.brands.generic;

// Load units of measure from PROJECT_CONFIG
export const UNITS_OF_MEASURE = PROJECT_CONFIG.units;

// Load product catalog from PROJECT_CONFIG
export const PRODUCT_CATEGORIES = PROJECT_CONFIG.productCatalog;
