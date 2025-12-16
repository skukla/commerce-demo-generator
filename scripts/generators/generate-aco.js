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
import { updateLine, finishLine } from '../utils/format.js';
import { PROJECT_CONFIG } from '../../config/project-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const COMMERCE_DATAPACK = join(PROJECT_CONFIG.paths.outputCommerce, 'data/accs/accs_products.json');
const COMMERCE_ATTRIBUTES = join(PROJECT_CONFIG.paths.outputCommerce, 'data/accs/accs_product_attributes.json');
const ACO_OUTPUT_DIR = PROJECT_CONFIG.paths.outputAco;
const ACO_PRODUCTS_FILE = join(ACO_OUTPUT_DIR, 'products.json');
const ACO_VARIANTS_FILE = join(ACO_OUTPUT_DIR, 'variants.json');
const ACO_METADATA_FILE = join(ACO_OUTPUT_DIR, 'metadata.json');

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
  
  // Extract all br_ attributes
  for (const [key, value] of Object.entries(commerceProduct)) {
    if (key.startsWith('br_') && value !== null && value !== '') {
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
    
    return {
      attributeId: attr.attribute_code,
      type: type,
      label: attr.default_frontend_label || attr.attribute_code,
      sortOrder: attr.position || 0
    };
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
    
    // Step 3: Separate by type
    const { simples, configurables, variants } = separateByType(commerceProducts);
    const acoSimples = simples.map(transformToAcoProduct);
    const acoConfigurables = configurables.map(transformToAcoProduct);
    const acoVariants = [...acoConfigurables, ...variants.map(transformToAcoProduct)];
    
    updateLine(chalk.green(`✔ Transforming to ACO format (${acoSimples.length} simple, ${acoConfigurables.length} configurable, ${variants.length} variants)`));
    finishLine();
    
    // Step 4: Extract metadata from Commerce attributes
    updateLine('📦 Extracting metadata...');
    const metadata = extractMetadata(commerceAttributes);
    updateLine(chalk.green(`✔ Extracting metadata (${metadata.length} attributes)`));
    finishLine();
    
    // Step 5: Ensure ACO directory exists
    await fs.mkdir(ACO_OUTPUT_DIR, { recursive: true });
    
    // Step 6: Write to ACO data directory
    updateLine('📦 Writing ACO data files...');
    
    await fs.writeFile(ACO_PRODUCTS_FILE, JSON.stringify(acoSimples, null, 2));
    await fs.writeFile(ACO_VARIANTS_FILE, JSON.stringify(acoVariants, null, 2));
    await fs.writeFile(ACO_METADATA_FILE, JSON.stringify(metadata, null, 2));
    
    updateLine(chalk.green(`✔ Writing ACO data files (${acoSimples.length} products, ${acoVariants.length} variants, ${metadata.length} attributes)`));
    finishLine();
    
    console.log('');
    console.log(chalk.green('✔ Transform complete!'));
    console.log('');
    
    return {
      success: true,
      products: acoSimples.length,
      variants: acoVariants.length,
      metadata: metadata.length
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

