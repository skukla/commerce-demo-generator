/**
 * Product Name Normalizer
 * Brand-agnostic product name normalization for image matching
 *
 * This is used by both datapack generation and image import to ensure
 * consistent matching between products and images regardless of brand names.
 */

import { BRANDS } from './product-definitions.js';

/**
 * Normalize product name for matching images
 * Brand-agnostic matching: strips all brands and matches on product TYPE only.
 * This is realistic for construction supply - stock photos often represent product types
 * rather than specific brands (e.g., a 2x4 looks the same regardless of mill).
 *
 * Uses generic BRANDS list from product-definitions.js.
 * To add new brands, update the generic list in brands.json.
 *
 * @param {string} name - Product name (may include brand)
 * @returns {string} Normalized name (lowercase alphanumeric only, no brands)
 *
 * @example
 * normalizeProductName("BuildRight Pro 2x4 Stud - 8ft")
 * // Returns: "2x4stud8ft"
 *
 * normalizeProductName("ProFrame Metal Stud 20ga - 3.5\" x 10ft")
 * // Returns: "metalstud20ga35x10ft"
 */
export function normalizeProductName(name) {
  let normalized = name;
  // Strip all brand names for type-based matching
  // Sort brands by length (longest first) to avoid partial matches
  const sortedBrands = BRANDS.slice().sort((a, b) => b.length - a.length);
  for (const brand of sortedBrands) {
    normalized = normalized.replace(new RegExp(brand + '\\s*', 'gi'), '');
  }
  return normalized.toLowerCase().replace(/[^a-z0-9]/g, '');
}

