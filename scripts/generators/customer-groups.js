/**
 * Customer Groups JSON Generator
 * Generates customer_groups.json for ACCS Data Importer
 * Schema: schemas/customer_groups.json
 */

import { CUSTOMER_GROUPS } from '#config/commerce-config';

/**
 * Generate customer groups in ACCS schema format
 * Format: Array of { customer_group: { code, tax_class_id } }
 * @returns {Array} Array of customer group objects
 */
export function generateCustomerGroups() {
  return CUSTOMER_GROUPS.map(group => ({
    customer_group: {
      code: group.code,
      tax_class_id: 3 // 3 = Retail Customer tax class
    }
  }));
}

/**
 * Get raw customer groups for internal use
 */
export function getRawCustomerGroups() {
  return CUSTOMER_GROUPS;
}

/**
 * Get customer group mapping (code -> discount percent)
 * Useful for tier pricing calculations
 */
export function getCustomerGroupDiscounts() {
  const discounts = {};
  CUSTOMER_GROUPS.forEach(group => {
    discounts[group.code] = group.discountPercent;
  });
  return discounts;
}

export default { generateCustomerGroups, getCustomerGroupDiscounts };

