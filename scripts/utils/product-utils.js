/**
 * Shared Product Utilities
 * Common functions for SKU generation, hashing, and URL formatting
 */

/**
 * Generate deterministic hash from string
 * Used for generating consistent SKUs across runs
 * @param {string} input - String to hash
 * @returns {string} 8-character hexadecimal hash
 */
export function generateHash(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).toUpperCase().substring(0, 8);
}

/**
 * Generate URL-friendly slug from product name
 * Converts to lowercase and replaces non-alphanumeric chars with hyphens
 * @param {string} name - Product name
 * @returns {string} URL-safe slug
 */
export function generateUrlKey(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

