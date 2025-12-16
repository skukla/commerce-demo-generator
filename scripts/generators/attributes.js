/**
 * Attributes JSON Generator
 * Generates attributes.json and attribute_options.json for module-data-install
 */

import { PROJECT_CONFIG } from '../../config/project-config.js';

const PRODUCT_ATTRIBUTES = PROJECT_CONFIG.productAttributes;

/**
 * Map frontend input types to backend types
 */
const BACKEND_TYPE_MAP = {
  'text': 'varchar',
  'textarea': 'text',
  'select': 'int',
  'multiselect': 'varchar',
  'boolean': 'int',
  'price': 'decimal',
  'date': 'datetime'
};

/**
 * Generate product attributes in Data Installer JSON format
 * @returns {Array} Array of attribute objects
 */
export function generateAttributes() {
  return PRODUCT_ATTRIBUTES.map(attr => ({
    attribute_code: attr.attributeCode,
    frontend_label: attr.frontendLabel,
    frontend_input: attr.frontendInput,
    backend_type: attr.backendType || BACKEND_TYPE_MAP[attr.frontendInput] || 'varchar',
    is_required: attr.isRequired ? 1 : 0,
    is_user_defined: 1,
    is_unique: 0,
    is_global: 1,
    is_searchable: attr.isSearchable ? 1 : 0,
    is_filterable: attr.isFilterable ? 1 : 0,
    is_comparable: attr.isComparable ? 1 : 0,
    is_visible_on_front: attr.isVisibleOnFront ? 1 : 0,
    used_for_sort_by: 0,
    used_in_product_listing: attr.isFilterable ? 1 : 0,
    attribute_set: 'Default',
    attribute_group: 'Product Details',
    options: attr.options || [] // Include options for select/multiselect attributes
  }));
}

/**
 * Generate attribute options in Data Installer JSON format
 * @returns {Array} Array of attribute option objects
 */
export function generateAttributeOptions() {
  const options = [];
  
  PRODUCT_ATTRIBUTES.forEach(attr => {
    if (attr.options && attr.options.length > 0) {
      attr.options.forEach((optionValue, index) => {
        options.push({
          attribute_code: attr.attributeCode,
          sort_order: (index + 1) * 10,
          value: optionValue
        });
      });
    }
  });
  
  return options;
}

export default { generateAttributes, generateAttributeOptions };

