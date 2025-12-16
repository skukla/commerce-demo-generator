/**
 * Categories JSON Generator
 * Generates categories.json for module-data-install
 */

import { PROJECT_CONFIG } from '../../config/project-config.js';

const CATEGORY_TREE = PROJECT_CONFIG.categoryTree;

/**
 * Flatten category tree into array format expected by Data Installer
 * @param {Object} node - Category node
 * @param {string} parentPath - Parent category path
 * @param {number} position - Position within parent
 * @returns {Array} Flattened category array
 */
function flattenCategoryTree(node, parentPath = 'Default Category', position = 1) {
  const categories = [];
  const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
  
  // Add current category
  categories.push({
    path: currentPath,
    name: node.name,
    is_active: 1,
    is_anchor: 1,
    include_in_menu: 1,
    position: position,
    url_key: node.urlKey || node.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: node.description || '',
    meta_title: node.name,
    meta_keywords: node.name.toLowerCase(),
    meta_description: `Shop ${node.name} at BuildRight Supply`
  });
  
  // Process children
  if (node.children && node.children.length > 0) {
    node.children.forEach((child, index) => {
      const childCategories = flattenCategoryTree(child, currentPath, index + 1);
      categories.push(...childCategories);
    });
  }
  
  return categories;
}

/**
 * Generate categories in Data Installer JSON format
 * @returns {Array} Array of category objects
 */
export function generateCategories() {
  const categories = [];
  
  // Start with each top-level category
  if (CATEGORY_TREE.children) {
    CATEGORY_TREE.children.forEach((child, index) => {
      const childCategories = flattenCategoryTree(child, 'Default Category', index + 1);
      categories.push(...childCategories);
    });
  }
  
  return categories;
}

/**
 * Generate top-level categories only for ACCS format
 * @returns {Array} Array of top-level category objects
 */
export function generateTopLevelCategories() {
  const categories = [];
  
  if (CATEGORY_TREE.children) {
    CATEGORY_TREE.children.forEach((child, index) => {
      categories.push({
        name: child.name,
        url_key: child.urlKey || child.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        position: index + 1
      });
    });
  }
  
  return categories;
}

/**
 * Get category path mapping for product assignment
 * @returns {Object} Map of category key to full path
 */
export function getCategoryPathMap() {
  const pathMap = {};
  
  function buildPathMap(node, parentPath = 'Default Category') {
    const currentPath = `${parentPath}/${node.name}`;
    const key = node.urlKey || node.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    pathMap[key] = currentPath;
    
    if (node.children) {
      node.children.forEach(child => buildPathMap(child, currentPath));
    }
  }
  
  if (CATEGORY_TREE.children) {
    CATEGORY_TREE.children.forEach(child => buildPathMap(child, 'Default Category'));
  }
  
  return pathMap;
}

export default { generateCategories, getCategoryPathMap };

