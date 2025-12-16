/**
 * Products Generator (Commerce as Source)
 * Generates products from product-definitions.js
 * 
 * This makes Commerce the source of truth for catalog data.
 */

import { SeededRandom } from '#shared/seeded-random';
import { PRODUCT_CATEGORIES, BRANDS, BRANDS_BY_CATEGORY, UNITS_OF_MEASURE } from './product-definitions.js';
import { generateProductDescription, generateShortDescription } from './description-generator.js';
import { generateHash, generateUrlKey } from './utils.js';

const SEED = 12345; // Fixed seed for deterministic output
const random = new SeededRandom(SEED);

// Track generated SKUs to avoid duplicates
const generatedSkus = new Set();

/**
 * Generate SKU for simple product
 */
function generateSKU(category, subcategory, index) {
  const categoryPrefix = category.slice(0, 3).toUpperCase();
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
  // Use category-specific brands if available, otherwise fall back to general brands
  const categoryBrands = BRANDS_BY_CATEGORY[subcategory] || BRANDS;
  const brand = categoryBrands[random.nextInt(0, categoryBrands.length - 1)];
  const price = random.nextFloat(template.priceRange[0], template.priceRange[1]);
  
  const sku = generateSKU(category, subcategory, index);
  const productName = `${brand} ${template.name}`;
  const slug = generateUrlKey(productName);
  
  // Get category name for path
  const categoryName = PRODUCT_CATEGORIES[category]?.name || category;
  
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
    categories: `BuildRight Catalog/${categoryName}`,
    url_key: slug,
    qty: 100,
    is_in_stock: 1,
    manage_stock: 1,
    image: `/${sku.slice(0,1).toLowerCase()}/${sku.slice(1,2).toLowerCase()}/${sku}.jpg`,
    small_image: `/${sku.slice(0,1).toLowerCase()}/${sku.slice(1,2).toLowerCase()}/${sku}.jpg`,
    thumbnail: `/${sku.slice(0,1).toLowerCase()}/${sku.slice(1,2).toLowerCase()}/${sku}.jpg`,
    
    // BuildRight custom attributes
    br_brand: brand,
    br_product_category: PRODUCT_CATEGORIES[category].attributeValue || category,
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
