#!/usr/bin/env node
/**
 * Transform Commerce Datapack to ACO Format
 * 
 * Reads Commerce datapack (ACCS format) and transforms to ACO format.
 * This makes Commerce the source of truth for products, variants, and base pricing.
 * 
 * Flow:
 * 1. Read Commerce datapack (accs_products.json)
 * 2. Transform to ACO format (products.json, variants.json)
 * 3. Write to local output directory (output/aco-format/)
 * 
 * Usage:
 *   npm run transform:aco
 *   node scripts/workflows/transform-for-aco.js
 * 
 * @module scripts/workflows/transform-for-aco
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { updateLine, finishLine } from '../lib/format.js';
import { PROJECT_CONFIG } from '../../config/project-config.js';
import { generatePriceBooks, generatePrices, getPricingStats } from './generate-aco-pricing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const COMMERCE_DATAPACK = join(PROJECT_CONFIG.paths.outputCommerce, 'data/accs/accs_products.json');
const COMMERCE_ATTRIBUTES = join(PROJECT_CONFIG.paths.outputCommerce, 'data/accs/accs_product_attributes.json');
const ACO_OUTPUT_DIR = PROJECT_CONFIG.paths.outputAco;
const ACO_PRODUCTS_FILE = join(ACO_OUTPUT_DIR, 'products.json');
const ACO_VARIANTS_FILE = join(ACO_OUTPUT_DIR, 'variants.json');
const ACO_METADATA_FILE = join(ACO_OUTPUT_DIR, 'metadata.json');
const ACO_PRICE_BOOKS_FILE = join(ACO_OUTPUT_DIR, 'price-books.json');
const ACO_PRICES_FILE = join(ACO_OUTPUT_DIR, 'prices.json');

/**
 * Transform Commerce product to ACO format
 */
function transformToAcoProduct(commerceProduct) {
  const acoProduct = {
    sku: commerceProduct.sku,
    source: {
      locale: 'en-US'
    },
    name: commerceProduct.name,
    slug: commerceProduct.url_key,
    description: commerceProduct.description || commerceProduct.short_description || '',
    status: commerceProduct.product_online === 1 ? 'ENABLED' : 'DISABLED',
    visibleIn: []
  };
  
  // Map Commerce visibility (numeric) to ACO visibleIn (string array)
  const visibilityMap = {
    1: [], // Not Visible Individually
    2: ['CATALOG'], // Catalog
    3: ['SEARCH'], // Search
    4: ['CATALOG', 'SEARCH'] // Catalog, Search
  };
  
  const visibility = parseInt(commerceProduct.visibility) || 4;
  acoProduct.visibleIn = visibilityMap[visibility] || ['CATALOG', 'SEARCH'];
  
  // Transform custom attributes
  acoProduct.attributes = [];
  
  // Extract all custom attributes (using project's attribute prefix)
  const attributePrefix = PROJECT_CONFIG.project.attributePrefix;
  for (const [key, value] of Object.entries(commerceProduct)) {
    if (key.startsWith(attributePrefix) && value !== null && value !== '') {
      // Handle array values (multi-select attributes) and convert all to strings
      const values = Array.isArray(value) ? value : [value];
      acoProduct.attributes.push({
        code: key,
        values: values.filter(v => v !== null && v !== '').map(v => String(v))
      });
    }
  }
  
  // Add other important attributes
  if (commerceProduct.price) {
    acoProduct.attributes.push({
      code: 'price',
      values: [commerceProduct.price.toString()]
    });
  }
  
  if (commerceProduct.weight) {
    acoProduct.attributes.push({
      code: 'weight',
      values: [commerceProduct.weight.toString()]
    });
  }
  
  return acoProduct;
}

/**
 * Build a map of parent SKU to configurable attributes
 */
function buildConfigurableAttributesMap(products) {
  const map = new Map();
  
  for (const product of products) {
    if (product.product_type === 'configurable' && product.configurable_attributes) {
      // Parse "br_depth,br_width,br_length" into array
      const attrs = product.configurable_attributes.split(',').map(a => a.trim());
      map.set(product.sku, attrs);
    }
  }
  
  return map;
}

/**
 * Transform Commerce variant to ACO format
 * 
 * NOTE: ACO does not support parentSku or selections fields in the product schema.
 * Variants are treated as standalone products with their variation attributes included
 * in the standard attributes array.
 * 
 * @param {Object} commerceVariant - The variant product
 * @param {Map} configurableAttrsMap - Map of parent SKU to configurable attributes (unused but kept for API compatibility)
 */
function transformToAcoVariant(commerceVariant, configurableAttrsMap = new Map()) {
  // Transform as a standard product - ACO handles variants as regular products
  // The variation attributes (size, color, etc.) are already in the product's attributes
  return transformToAcoProduct(commerceVariant);
}

/**
 * Separate products by type
 */
function separateByType(products) {
  const simples = [];
  const configurables = [];
  const variants = [];
  
  for (const product of products) {
    if (product.product_type === 'simple') {
      // Check if it's a variant (has configurable_variations or parent)
      if (product.configurable_variations || product.parent_sku) {
        variants.push(product);
      } else {
        simples.push(product);
      }
    } else if (product.product_type === 'configurable') {
      configurables.push(product);
    }
  }
  
  return { simples, configurables, variants };
}

/**
 * Map Commerce frontend_input to ACO dataType
 */
function mapToACODataType(frontendInput) {
  const map = {
    'text': 'TEXT',
    'textarea': 'TEXT',
    'select': 'TEXT',
    'multiselect': 'TEXT',
    'price': 'DECIMAL',
    'weight': 'DECIMAL',
    'boolean': 'BOOLEAN',
    'date': 'DATE'
  };
  return map[frontendInput] || 'TEXT';
}

/**
 * Map Commerce attribute flags to ACO visibility array
 */
function mapToACOVisibility(attr) {
  const visibility = [];
  
  // Always show on product detail
  visibility.push('PRODUCT_DETAIL');
  
  // Show in product listing if visible on front
  if (attr.is_visible_on_front === 1 || attr.used_in_product_listing === 1) {
    visibility.push('PRODUCT_LISTING');
  }
  
  // Show in search results if searchable
  if (attr.is_searchable === 1) {
    visibility.push('SEARCH_RESULTS');
  }
  
  return visibility;
}

/**
 * Calculate search weight based on attribute importance
 */
function calculateSearchWeight(attr) {
  // Core attributes: weight 5
  if (['sku', 'name'].includes(attr.attribute_code)) {
    return 5;
  }
  
  // Product category and brand: weight 4
  const attributePrefix = PROJECT_CONFIG.project.attributePrefix;
  if (attr.attribute_code === `${attributePrefix}product_category` || 
      attr.attribute_code === `${attributePrefix}brand`) {
    return 4;
  }
  
  // Important searchable attributes: weight 3
  if (attr.is_searchable === 1 && attr.search_weight >= 5) {
    return 3;
  }
  
  // Standard searchable attributes: weight 2
  if (attr.is_searchable === 1) {
    return 2;
  }
  
  // Default: weight 1
  return 1;
}

/**
 * Create slug from label
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Transform metadata (attributes) from Commerce attributes file
 */
function extractMetadata(commerceAttributes) {
  return commerceAttributes.map(attrDef => {
    const attr = attrDef.attribute;
    
    // Map Commerce frontend_input to ACO type
    let type = 'text';
    if (attr.frontend_input === 'select') type = 'select';
    else if (attr.frontend_input === 'multiselect') type = 'multiselect';
    else if (attr.frontend_input === 'boolean') type = 'boolean';
    else if (attr.frontend_input === 'date') type = 'date';
    else if (attr.frontend_input === 'price') type = 'number';
    
    const metadata = {
      attributeId: attr.attribute_code,
      type: type,
      dataType: mapToACODataType(attr.frontend_input),
      label: attr.default_frontend_label || attr.attribute_code,
      visibility: mapToACOVisibility(attr),
      searchWeight: calculateSearchWeight(attr),
      isRequired: attr.is_required === 1,
      sortOrder: attr.position || 0
    };
    
    // Transform options if present
    if (attr.options && attr.options.length > 0) {
      metadata.options = attr.options.map(opt => ({
        value: slugify(opt.label || opt.value || opt),
        label: opt.label || opt.value || opt
      }));
    }
    
    return metadata;
  });
}

/**
 * Main transform function
 */
async function transformForAco() {
  console.log('');
  
  try {
    // Step 1: Read Commerce datapack
    updateLine('📦 Reading Commerce datapack...');
    const commerceData = JSON.parse(await fs.readFile(COMMERCE_DATAPACK, 'utf-8'));
    const commerceProducts = commerceData.source.items;
    const commerceAttributes = JSON.parse(await fs.readFile(COMMERCE_ATTRIBUTES, 'utf-8'));
    updateLine(chalk.green(`✔ Reading Commerce datapack (${commerceProducts.length} products)`));
    finishLine();
    
    // Step 2: Transform to ACO format
    updateLine('📦 Transforming to ACO format...');
    const acoProducts = commerceProducts.map(transformToAcoProduct);
    
    // Step 3: Separate by type and build configurable attributes map
    const { simples, configurables, variants } = separateByType(commerceProducts);
    const configurableAttrsMap = buildConfigurableAttributesMap(commerceProducts);
    
    const acoSimples = simples.map(transformToAcoProduct);
    const acoConfigurables = configurables.map(transformToAcoProduct);
    const acoVariants = [...acoConfigurables, ...variants.map(v => transformToAcoVariant(v, configurableAttrsMap))];
    
    updateLine(chalk.green(`✔ Transforming to ACO format (${acoSimples.length} simple, ${acoConfigurables.length} configurable, ${variants.length} variants)`));
    finishLine();
    
    // Step 4: Extract metadata from Commerce attributes
    updateLine('📦 Extracting metadata...');
    const metadata = extractMetadata(commerceAttributes);
    updateLine(chalk.green(`✔ Extracting metadata (${metadata.length} attributes)`));
    finishLine();
    
    // Step 5: Generate price books and prices
    updateLine('📦 Generating price books...');
    const priceBooks = generatePriceBooks();
    updateLine(chalk.green(`✔ Generating price books (${priceBooks.length} price books)`));
    finishLine();
    
    updateLine('📦 Generating prices...');
    const prices = generatePrices(commerceProducts);
    const pricingStats = getPricingStats(commerceProducts, prices);
    updateLine(chalk.green(`✔ Generating prices (${prices.length} price entries for ${pricingStats.totalProducts} products, ${pricingStats.tieredPriceEntries} with tier pricing, ${pricingStats.totalTierDefinitions} total tiers)`));
    finishLine();
    
    // Step 6: Ensure ACO directory exists
    await fs.mkdir(ACO_OUTPUT_DIR, { recursive: true });
    
    // Step 7: Write to ACO data directory
    updateLine('📦 Writing ACO data files...');
    
    await fs.writeFile(ACO_PRODUCTS_FILE, JSON.stringify(acoSimples, null, 2));
    await fs.writeFile(ACO_VARIANTS_FILE, JSON.stringify(acoVariants, null, 2));
    await fs.writeFile(ACO_METADATA_FILE, JSON.stringify(metadata, null, 2));
    await fs.writeFile(ACO_PRICE_BOOKS_FILE, JSON.stringify(priceBooks, null, 2));
    await fs.writeFile(ACO_PRICES_FILE, JSON.stringify(prices, null, 2));
    
    updateLine(chalk.green(`✔ Writing ACO data files (${acoSimples.length} products, ${acoVariants.length} variants, ${metadata.length} attributes, ${priceBooks.length} price books, ${prices.length} prices)`));
    finishLine();
    
    console.log('');
    console.log(chalk.green('✔ Transform complete!'));
    console.log('');
    
    return {
      success: true,
      products: acoSimples.length,
      variants: acoVariants.length,
      metadata: metadata.length,
      priceBooks: priceBooks.length,
      prices: prices.length
    };
    
  } catch (error) {
    console.error(chalk.red('✖ Transform failed:'), error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

// Run
transformForAco()
  .then(result => process.exit(result.success ? 0 : 1))
  .catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });

