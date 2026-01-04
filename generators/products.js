/**
 * Products Generator (Commerce as Source)
 * Generates products from product-definitions.js
 * 
 * This makes Commerce the source of truth for catalog data.
 */

import { SeededRandom } from '../lib/seeded-random.js';
import { PRODUCT_CATEGORIES, BRANDS, UNITS_OF_MEASURE } from '../lib/product-definitions.js';
import { generateProductDescription, generateShortDescription } from '../lib/description-generator.js';
import { generateHash, generateUrlKey } from '../lib/product-utils.js';
import { PROJECT_CONFIG } from '../config/project-config.js';

const SEED = 12345; // Fixed seed for deterministic output
const random = new SeededRandom(SEED);

// Track generated SKUs to avoid duplicates
const generatedSkus = new Set();

/**
 * Build a map of subcategory urlKey to subcategory name from category tree
 * @returns {Map<string, string>} Map of urlKey → subcategory name
 */
function buildSubcategoryNameMap() {
  const map = new Map();
  const categoryTree = PROJECT_CONFIG.categoryTree;
  
  if (categoryTree.children) {
    for (const parent of categoryTree.children) {
      if (parent.children) {
        for (const child of parent.children) {
          if (child.urlKey && child.name) {
            map.set(child.urlKey, child.name);
          }
        }
      }
    }
  }
  
  return map;
}

// Build subcategory name map once at module load time
const SUBCATEGORY_NAMES = buildSubcategoryNameMap();

/**
 * Generate SKU for simple product
 * 
 * SKU Format: {PREFIX}-{HASH}
 * 
 * Prefix Priority:
 * 1. Use skuPrefix from category definition (explicit business decision)
 * 2. Fallback to first 3 characters of category key (auto-generation)
 * 
 * Example:
 *   Category "roofing" with skuPrefix: "ROF" → ROF-A1B2C3D4
 *   Category "roofing" without skuPrefix → ROO-A1B2C3D4 (fallback)
 */
function generateSKU(category, subcategory, index) {
  // Read skuPrefix from category config (user-defined business decision)
  const categoryConfig = PRODUCT_CATEGORIES[category];
  const categoryPrefix = categoryConfig?.skuPrefix 
    || category.slice(0, 3).toUpperCase(); // Fallback: first 3 chars
  
  const hash = generateHash(`${category}-${subcategory}-${index}`);
  
  let sku = `${categoryPrefix}-${hash}`;
  let counter = 0;
  
  while (generatedSkus.has(sku)) {
    counter++;
    sku = `${categoryPrefix}-${hash}-${counter}`;
  }
  
  generatedSkus.add(sku);
  return sku;
}

/**
 * Generate a simple product in Commerce format
 */
function generateSimpleProduct(template, category, subcategory, index) {
  // Use generic brands only - these match the br_brand attribute options
  const brand = BRANDS[random.nextInt(0, BRANDS.length - 1)];
  const price = random.nextFloat(template.priceRange[0], template.priceRange[1]);
  
  const sku = generateSKU(category, subcategory, index);
  const productName = `${brand} ${template.name}`;
  const slug = generateUrlKey(productName);
  
  // Get category name for path
  const categoryName = PRODUCT_CATEGORIES[category]?.name || category;
  
  // Get subcategory name from category tree
  const subcategoryName = SUBCATEGORY_NAMES.get(subcategory) || subcategory;
  
  // Build full category path including subcategory
  // Format: "BuildRight Catalog/Structural Materials/Lumber"
  const specificCategoryPath = `${PROJECT_CONFIG.project.rootCategoryName}/${categoryName}/${subcategoryName}`;

  // Include aggregate categories (e.g., "All Products") - all products belong to these
  const allCategoryPaths = [
    ...PROJECT_CONFIG.aggregateCategoryPaths,
    specificCategoryPath
  ].join(',');
  
  // Build product object with attributes first
  const product = {
    sku,
    attribute_set_code: 'Default',
    type_id: 'simple',
    product_websites: 'base',
    name: productName,
    price: price.toFixed(2),
    weight: template.weight || random.nextInt(1, 10).toString(),
    status: 1,
    visibility: 4, // Catalog, Search
    tax_class_name: 'Taxable Goods',
    categories: allCategoryPaths,
    url_key: slug,
    qty: 100,
    is_in_stock: 1,
    manage_stock: 1,
    image: `/${sku.slice(0,1).toLowerCase()}/${sku.slice(1,2).toLowerCase()}/${sku}.jpg`,
    small_image: `/${sku.slice(0,1).toLowerCase()}/${sku.slice(1,2).toLowerCase()}/${sku}.jpg`,
    thumbnail: `/${sku.slice(0,1).toLowerCase()}/${sku.slice(1,2).toLowerCase()}/${sku}.jpg`,
    
    // BuildRight custom attributes
    // NOTE: br_product_category removed - native 'categories' attribute replaces it
    br_brand: brand,
    br_unit_of_measure: template.uom || 'EA'
  };
  
  // Add all template attributes (now with br_ prefix)
  for (const [key, value] of Object.entries(template)) {
    if (key.startsWith('br_') && value !== undefined && value !== null) {
      // Handle arrays (multi-select attributes)
      if (Array.isArray(value)) {
        product[key] = value.join(',');
      } else {
        product[key] = value;
      }
    }
  }
  
  // Generate unique descriptions based on product attributes
  product.description = generateProductDescription(product, template, category, subcategory);
  product.short_description = generateShortDescription(product, template, category, subcategory);
  
  return product;
}

/**
 * Generate all products from definitions
 */
export async function generateProducts() {
  const products = [];
  let productIndex = 0;
  
  // Generate products from each category
  for (const [categoryKey, categoryDef] of Object.entries(PRODUCT_CATEGORIES)) {
    if (!categoryDef.subcategories) continue;
    
    for (const [subcategoryKey, subcategoryDef] of Object.entries(categoryDef.subcategories)) {
      // Generate simple products
      if (subcategoryDef.simple) {
        for (const template of subcategoryDef.simple) {
          const product = generateSimpleProduct(template, categoryKey, subcategoryKey, productIndex++);
          products.push(product);
        }
      }
    }
  }
  
  return products;
}
