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
import { PRODUCT_CATEGORIES, BRANDS, BRANDS_BY_CATEGORY } from '../lib/product-definitions.js';
import { generateProductDescription, generateShortDescription } from '../lib/description-generator.js';
import { generateHash, generateUrlKey } from '../lib/product-utils.js';
import { PROJECT_CONFIG } from '../config/project-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SEED = 12345;
const random = new SeededRandom(SEED);

// Output paths
const OUTPUT_DIR = join(__dirname, '../../buildright-data/generated/canonical');
const OUTPUT_FILE = join(OUTPUT_DIR, 'datapack.json');

// Track generated SKUs
const generatedSkus = new Set();

// Progress indicator
let currentLine = '';
function updateLine(text) {
  if (currentLine) {
    process.stdout.write('\r' + ' '.repeat(currentLine.length) + '\r');
  }
  process.stdout.write(text);
  currentLine = text;
}
function finishLine() {
  if (currentLine) {
    process.stdout.write('\n');
    currentLine = '';
  }
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
  const categoryBrands = BRANDS_BY_CATEGORY[subcategory] || BRANDS;
  const brand = categoryBrands[random.nextInt(0, categoryBrands.length - 1)];
  const price = random.nextFloat(template.priceRange[0], template.priceRange[1]);
  
  const sku = generateSKU(category, subcategory, index);
  const productName = `${brand} ${template.name}`;
  const urlKey = generateUrlKey(productName);
  const categoryName = PRODUCT_CATEGORIES[category]?.name || category;
  const categorySlug = generateUrlKey(categoryName);
  
  // Build canonical product
  const product = {
    id: sku, // Use SKU as ID
    sku,
    type: 'simple',
    
    // Basic info
    name: productName,
    description: generateProductDescription(template, brand),
    shortDescription: generateShortDescription(template, brand),
    urlKey,
    
    // Pricing & Inventory
    price: parseFloat(price.toFixed(2)),
    weight: parseFloat(template.weight || random.nextInt(1, 10)),
    stock: {
      qty: 100,
      inStock: true,
      manageStock: true
    },
    
    // Categorization (use actual category from product definition)
    categories: [categorySlug],
    
    // Images
    images: [
      {
        file: `${sku}.jpg`,
        roles: ['image', 'small_image', 'thumbnail']
      }
    ],
    
    // Custom attributes (with br_ prefix)
    attributes: {
      br_brand: brand,
      br_product_category: PRODUCT_CATEGORIES[category].attributeValue || categoryName,
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
 * Generate all products
 */
function generateProducts() {
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
      
      // TODO: Handle configurable products
      // if (subcategoryDef.configurable) { ... }
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
  
  // Product categories
  for (const [key, def] of Object.entries(PRODUCT_CATEGORIES)) {
    const slug = generateUrlKey(def.name);
    categories.push({
      id: key,
      slug,
      name: def.name,
      parentId: 'root',
      description: def.description || `${def.name} products`,
      isActive: true,
      position: position++,
      meta: {
        includeInMenu: true
      }
    });
  }
  
  return categories;
}

/**
 * Generate attributes in canonical format
 */
function generateAttributes() {
  const attributes = [];
  const attributePrefix = PROJECT_CONFIG.project.attributePrefix;
  
  // Read attribute definitions from config
  const attributeDefs = PROJECT_CONFIG.project.attributes || {};
  
  // Core attributes
  attributes.push({
    code: `${attributePrefix}product_category`,
    label: 'Product Category',
    type: 'select',
    required: true,
    searchable: true,
    filterable: true,
    comparable: false,
    visibleOnFront: true,
    usedInProductListing: true,
    options: Object.entries(PRODUCT_CATEGORIES).map(([key, def]) => ({
      value: generateUrlKey(def.name),
      label: def.attributeValue || def.name
    }))
  });
  
  attributes.push({
    code: `${attributePrefix}brand`,
    label: 'Brand',
    type: 'select',
    required: false,
    searchable: true,
    filterable: true,
    comparable: true,
    visibleOnFront: true,
    usedInProductListing: true,
    options: BRANDS.map(brand => ({
      value: generateUrlKey(brand),
      label: brand
    }))
  });
  
  attributes.push({
    code: `${attributePrefix}unit_of_measure`,
    label: 'Unit of Measure',
    type: 'select',
    required: false,
    searchable: false,
    filterable: false,
    comparable: false,
    visibleOnFront: true,
    usedInProductListing: true,
    options: [
      { value: 'EA', label: 'Each' },
      { value: 'BOX', label: 'Box' },
      { value: 'BDL', label: 'Bundle' },
      { value: 'LF', label: 'Linear Foot' },
      { value: 'SF', label: 'Square Foot' }
    ]
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

// Run generator
generateCanonical();

