/**
 * Canonical Format Generator
 * 
 * Generates a platform-neutral canonical datapack that can be transformed
 * into Commerce, ACO, or any other platform format.
 * 
 * Output: buildright-data/generated/canonical/datapack.json
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { SeededRandom } from '../lib/seeded-random.js';
import { PRODUCT_CATEGORIES, BRANDS } from '../lib/product-definitions.js';
import { generateProductDescription, generateShortDescription } from '../lib/description-generator.js';
import { generateHash, generateUrlKey } from '../lib/product-utils.js';
import { PROJECT_CONFIG } from '../config/project-config.js';
import { generateAttributes as generateCommerceAttributes } from './attributes.js';
import { updateLine, finishLine } from '../lib/format.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SEED = 12345;
const random = new SeededRandom(SEED);

// Output paths
const OUTPUT_DIR = join(__dirname, '../../buildright-data/generated/canonical');
const OUTPUT_FILE = join(OUTPUT_DIR, 'datapack.json');

// Track generated SKUs
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

// Map product catalog subcategory keys to category tree urlKeys
const SUBCATEGORY_KEY_TO_URL_KEY = {
  'studs': 'metal-studs-track',
  'ready-mix': 'concrete-foundation',
  'units': 'hvac-units',
  'kitchen': 'kitchen-appliances'
  // Other keys match directly (lumber, windows, nails, shingles, flooring, wiring, water-supply, drywall)
};

/**
 * Build category slugs array for a product
 * Includes aggregate categories, parent category, and subcategory paths
 * @param {string} categoryKey - Category identifier
 * @param {string} subcategoryKey - Subcategory identifier
 * @returns {string[]} Array of category slugs
 */
function buildCategorySlugs(categoryKey, subcategoryKey) {
  const categoryName = PRODUCT_CATEGORIES[categoryKey]?.name || categoryKey;
  const categorySlug = generateUrlKey(categoryName);
  const mappedSubcategory = SUBCATEGORY_KEY_TO_URL_KEY[subcategoryKey] || subcategoryKey;
  const subcategoryName = SUBCATEGORY_NAMES.get(mappedSubcategory) || subcategoryKey;
  const subcategorySlug = generateUrlKey(subcategoryName);

  return [
    ...PROJECT_CONFIG.aggregateCategorySlugs,
    categorySlug,
    `${categorySlug}/${subcategorySlug}`
  ];
}

/**
 * Calculate cartesian product of dimension arrays
 * Generates all possible combinations of dimension values
 * @param {Object} dimensions - Object with dimension keys and array values
 * @returns {Array<Object>} Array of all dimension combinations
 * @example cartesianProduct({depth: [1, 2], width: [3, 4]}) =>
 *   [{depth:1,width:3}, {depth:1,width:4}, {depth:2,width:3}, {depth:2,width:4}]
 */
export function cartesianProduct(dimensions) {
  const keys = Object.keys(dimensions);
  const values = Object.values(dimensions);

  function* product(index, current) {
    if (index === keys.length) {
      yield { ...current };
      return;
    }

    for (const value of values[index]) {
      const next = { ...current };
      next[keys[index]] = value;
      yield* product(index + 1, next);
    }
  }

  return Array.from(product(0, {}));
}

/**
 * Generate SKU for configurable product
 * @param {string} categoryKey - Category identifier
 * @param {string} subcategoryKey - Subcategory identifier
 * @param {string} productName - Product name for hash
 * @returns {string} SKU with -CONFIG suffix
 */
function generateConfigurableSKU(categoryKey, subcategoryKey, productName) {
  const categoryConfig = PRODUCT_CATEGORIES[categoryKey];
  const prefix = categoryConfig?.skuPrefix || categoryKey.substring(0, 3).toUpperCase();
  const hash = generateHash(`${categoryKey}-${subcategoryKey}-${productName}`);
  const sku = `${prefix}-${hash}-CONFIG`;
  generatedSkus.add(sku);
  return sku;
}

/**
 * Generate SKU for variant product
 * @param {string} parentSKU - Parent configurable SKU
 * @param {Object} dimensions - Dimension values for this variant
 * @returns {string} Variant SKU with -VAR- segment
 */
function generateVariantSKU(parentSKU, dimensions) {
  // Create dimension string with keys for uniqueness
  const dimStr = Object.entries(dimensions)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, val]) => `${key}=${val}`)
    .join(',');
  const hash = generateHash(dimStr);
  const sku = `${parentSKU.replace('-CONFIG', '')}-VAR-${hash}`;
  generatedSkus.add(sku);
  return sku;
}

/**
 * Generate SKU for product
 */
function generateSKU(category, subcategory, index) {
  const categoryConfig = PRODUCT_CATEGORIES[category];
  const categoryPrefix = categoryConfig?.skuPrefix || category.slice(0, 3).toUpperCase();
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
 * Generate a simple product in canonical format
 */
function generateCanonicalProduct(template, category, subcategory, index) {
  const brand = BRANDS[random.nextInt(0, BRANDS.length - 1)];
  const price = random.nextFloat(template.priceRange[0], template.priceRange[1]);
  const sku = generateSKU(category, subcategory, index);
  const productName = `${brand} ${template.name}`;
  const urlKey = generateUrlKey(productName);
  
  // Build product-like object for description generation
  // (needs br_brand and name before we can generate descriptions)
  const productForDesc = {
    br_brand: brand,
    name: productName,
    ...template // Include all template attributes (br_* attributes)
  };

  const product = {
    id: sku,
    sku,
    type: 'simple',
    name: productName,
    description: generateProductDescription(productForDesc, template, category, subcategory),
    shortDescription: generateShortDescription(productForDesc, template, category, subcategory),
    urlKey,
    price: parseFloat(price.toFixed(2)),
    weight: parseFloat(template.weight || random.nextInt(1, 10)),
    stock: {
      qty: 100,
      inStock: true,
      manageStock: true
    },
    categories: buildCategorySlugs(category, subcategory),
    
    // Images
    images: [
      {
        file: `${sku}.jpg`,
        roles: ['image', 'small_image', 'thumbnail']
      }
    ],
    
    // Custom attributes (with br_ prefix)
    // NOTE: br_product_category removed - native 'categories' attribute replaces it
    attributes: {
      br_brand: brand,
      br_unit_of_measure: template.uom || 'EA'
    },
    
    // Platform metadata
    meta: {
      status: 'enabled',
      visibility: 'catalog_search',
      taxClass: 'taxable_goods'
    }
  };
  
  // Add all template attributes
  for (const [key, value] of Object.entries(template)) {
    if (key.startsWith('br_') && value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        product.attributes[key] = value.map(v => String(v));
      } else {
        product.attributes[key] = String(value);
      }
    }
  }
  
  return product;
}

/**
 * Generate a configurable parent product in canonical format
 * @param {Object} configDef - Configurable product definition with dimensions
 * @param {string} categoryKey - Category identifier
 * @param {string} subcategoryKey - Subcategory identifier
 * @param {number} index - Product index for SKU generation
 * @returns {Object} Canonical configurable product with variants array
 */
export function generateCanonicalConfigurable(configDef, categoryKey, subcategoryKey, index) {
  const brand = BRANDS[random.nextInt(0, BRANDS.length - 1)];
  const sku = generateConfigurableSKU(categoryKey, subcategoryKey, configDef.name);
  const productName = `${brand} ${configDef.name} - Configurable`;
  const urlKey = generateUrlKey(productName);

  // Generate all variant combinations and their SKUs
  const combinations = cartesianProduct(configDef.dimensions);
  const variantSkus = combinations.map(dims => generateVariantSKU(sku, dims));

  // Build configurable attributes list (dimension keys with br_ prefix)
  const configurableAttributes = Object.keys(configDef.dimensions).map(key => `br_${key}`);
  
  // Build product-like object for description generation
  const productForDesc = {
    br_brand: brand,
    name: productName,
    ...configDef // Include all config attributes
  };

  const product = {
    id: sku,
    sku,
    type: 'configurable',
    name: productName,
    description: `${brand} ${configDef.name} - Available in multiple configurations. ` +
      generateProductDescription(productForDesc, configDef, categoryKey, subcategoryKey),
    shortDescription: `${configDef.name} configurable - Choose from multiple size options`,
    urlKey,
    price: 0, // Configurable parents have price 0; variants have actual prices
    weight: 1,
    stock: {
      qty: 0,
      inStock: true,
      manageStock: false // Stock managed at variant level
    },
    categories: buildCategorySlugs(categoryKey, subcategoryKey),
    images: [
      {
        file: `${sku}.jpg`,
        roles: ['image', 'small_image', 'thumbnail']
      }
    ],
    attributes: {
      br_brand: brand,
      br_unit_of_measure: configDef.uom || 'EA'
    },
    meta: {
      status: 'enabled',
      visibility: 'catalog_search',
      taxClass: 'taxable_goods'
    },
    // Configurable-specific fields
    variants: variantSkus,
    configurableAttributes
  };

  return product;
}

/**
 * Generate a variant product in canonical format
 * @param {string} parentSku - Parent configurable SKU
 * @param {Object} dimensions - Dimension values for this variant
 * @param {Object} configDef - Configurable product definition
 * @param {string} categoryKey - Category identifier
 * @param {string} subcategoryKey - Subcategory identifier
 * @returns {Object} Canonical simple product with parentSku reference
 */
export function generateCanonicalVariant(parentSku, dimensions, configDef, categoryKey, subcategoryKey) {
  const brand = BRANDS[random.nextInt(0, BRANDS.length - 1)];
  const sku = generateVariantSKU(parentSku, dimensions);

  // Create dimension string for name (e.g., "1.75 x 9.25 x 20")
  const dimStr = Object.values(dimensions).join(' x ');
  const productName = `${brand} ${configDef.name} - ${dimStr}`;
  const urlKey = generateUrlKey(productName);

  // Calculate price based on dimensions (larger = more expensive)
  const dimValues = Object.values(dimensions)
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v));
  const basePrice = configDef.priceBase || 10;
  const price = dimValues.length > 0
    ? basePrice + dimValues.reduce((sum, val) => sum + val, 0)
    : basePrice;
  
  // Build product-like object for description generation
  const productForDesc = {
    br_brand: brand,
    name: productName,
    ...configDef, // Include all config attributes
    ...dimensions // Include dimension values
  };

  const product = {
    id: sku,
    sku,
    type: 'simple',
    parentSku, // Reference to parent configurable
    name: productName,
    description: generateProductDescription(productForDesc, configDef, categoryKey, subcategoryKey),
    shortDescription: generateShortDescription(productForDesc, configDef, categoryKey, subcategoryKey),
    urlKey,
    price: parseFloat(price.toFixed(2)),
    weight: dimValues.length > 0
      ? parseFloat((dimValues.reduce((sum, val) => sum * val, 1) / 100).toFixed(2))
      : 1,
    stock: {
      qty: random.nextInt(50, 200),
      inStock: true,
      manageStock: true
    },
    categories: buildCategorySlugs(categoryKey, subcategoryKey),
    images: [
      {
        file: `${sku}.jpg`,
        roles: ['image', 'small_image', 'thumbnail']
      }
    ],
    attributes: {
      br_brand: brand,
      br_unit_of_measure: configDef.uom || 'EA',
      // Add dimension-specific attributes
      ...Object.fromEntries(
        Object.entries(dimensions).map(([key, val]) => [`br_${key}`, String(val)])
      )
    },
    meta: {
      status: 'enabled',
      visibility: 'not_visible_individually', // Variants not visible in catalog
      taxClass: 'taxable_goods'
    }
  };

  return product;
}

/**
 * Generate all products (simple + configurable + variants)
 */
export function generateProducts() {
  const products = [];
  let productIndex = 0;
  
  for (const [categoryKey, categoryDef] of Object.entries(PRODUCT_CATEGORIES)) {
    if (!categoryDef.subcategories) continue;
    
    for (const [subcategoryKey, subcategoryDef] of Object.entries(categoryDef.subcategories)) {
      // Generate simple products
      if (subcategoryDef.simple) {
        for (const template of subcategoryDef.simple) {
          const product = generateCanonicalProduct(template, categoryKey, subcategoryKey, productIndex++);
          products.push(product);
        }
      }
      
      // Generate configurable products and their variants
      if (subcategoryDef.configurable) {
        for (const configDef of subcategoryDef.configurable) {
          // Generate parent configurable
          const parent = generateCanonicalConfigurable(configDef, categoryKey, subcategoryKey, productIndex++);
          products.push(parent);

          // Generate variant children
          const combinations = cartesianProduct(configDef.dimensions);
          for (const dims of combinations) {
            const variant = generateCanonicalVariant(parent.sku, dims, configDef, categoryKey, subcategoryKey);
            products.push(variant);
          }
        }
      }
    }
  }
  
  return products;
}

/**
 * Generate categories in canonical format
 */
function generateCategories() {
  const categories = [];
  let position = 1;
  const categoryTree = PROJECT_CONFIG.categoryTree;
  
  // Root category
  categories.push({
    id: 'root',
    slug: PROJECT_CONFIG.project.rootCategorySlug || 'catalog',
    name: PROJECT_CONFIG.project.rootCategoryName || 'Catalog',
    parentId: null,
    description: 'Root catalog category',
    isActive: true,
    position: position++,
    meta: {
      includeInMenu: false
    }
  });
  
  // Generate categories from category tree (includes subcategories)
  if (categoryTree.children) {
    for (const parent of categoryTree.children) {
      const parentSlug = parent.urlKey || generateUrlKey(parent.name);
      const parentId = parentSlug; // Use slug as ID
      
      // Add parent category
      categories.push({
        id: parentId,
        slug: parentSlug,
        name: parent.name,
        parentId: 'root',
        description: `${parent.name} products`,
        isActive: true,
        position: position++,
        meta: {
          includeInMenu: true
        }
      });
      
      // Add subcategories
      if (parent.children) {
        for (const child of parent.children) {
          const childSlug = child.urlKey || generateUrlKey(child.name);
          const childId = `${parentSlug}/${childSlug}`; // Hierarchical ID
          
          categories.push({
            id: childId,
            slug: childId, // Full path as slug for ACO routing
            name: child.name,
            parentId: parentId,
            description: `${child.name} products`,
            isActive: true,
            position: position++,
            meta: {
              includeInMenu: true
            }
          });
        }
      }
    }
  }
  
  return categories;
}

/**
 * Generate attributes in canonical format
 * Reads from Commerce attribute generator to ensure alignment
 */
function generateAttributes() {
  // Generate Commerce attributes (the source of truth)
  const commerceAttributes = generateCommerceAttributes();
  
  // Transform Commerce attributes to canonical format
  const attributes = commerceAttributes.map(attr => {
    // Map Commerce attribute types to canonical types
    const typeMap = {
      'text': 'text',
      'textarea': 'textarea',
      'select': 'select',
      'multiselect': 'multiselect',
      'boolean': 'boolean',
      'date': 'date',
      'price': 'price',
      'weight': 'number',
      'media_image': 'image'
    };
    
    const canonicalAttr = {
      code: attr.attribute_code,
      label: attr.frontend_label || attr.attribute_code,
      type: typeMap[attr.frontend_input] || 'text',
      required: attr.is_required === 1,
      searchable: attr.is_searchable === 1,
      filterable: attr.is_filterable === 1,
      comparable: attr.is_comparable === 1,
      visibleOnFront: attr.is_visible_on_front === 1,
      usedInProductListing: attr.used_in_product_listing === 1
    };
    
    // Transform options if present
    if (attr.options && attr.options.length > 0) {
      canonicalAttr.options = attr.options.map(opt => ({
        value: opt.value || opt.label,
        label: opt.label || opt.value
      }));
    }
    
    return canonicalAttr;
  });
  
  return attributes;
}

/**
 * Main generator
 */
async function generateCanonical() {
  console.log(chalk.blue.bold('\n📦 Generating Canonical Datapack\n'));
  
  try {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Generate products
    updateLine('🔨 Generating products...');
    const products = generateProducts();
    finishLine();
    console.log(chalk.green(`✔ Generated ${products.length} products`));
    
    // Generate categories
    updateLine('📁 Generating categories...');
    const categories = generateCategories();
    finishLine();
    console.log(chalk.green(`✔ Generated ${categories.length} categories`));
    
    // Generate attributes
    updateLine('🏷️  Generating attributes...');
    const attributes = generateAttributes();
    finishLine();
    console.log(chalk.green(`✔ Generated ${attributes.length} attributes`));
    
    // Build canonical datapack
    const datapack = {
      products,
      categories,
      attributes,
      metadata: {
        generatedAt: new Date().toISOString(),
        generator: 'commerce-demo-generator',
        version: '2.0.0',
        project: PROJECT_CONFIG.project.name,
        seed: SEED,
        format: 'canonical'
      }
    };
    
    // Write to file
    updateLine('💾 Writing datapack...');
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(datapack, null, 2));
    finishLine();
    console.log(chalk.green(`✔ Wrote datapack to ${OUTPUT_FILE}`));
    
    console.log(chalk.blue.bold('\n✅ Canonical datapack generated successfully!\n'));
    
  } catch (error) {
    finishLine();
    console.error(chalk.red('\n❌ Error generating canonical datapack:'), error);
    process.exit(1);
  }
}

// Run generator only when executed directly (not when imported for testing)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('generate-canonical.js')) {
  generateCanonical();
}

