import { config } from 'dotenv';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { validateCategoryTree, getCategorySummary, getAggregateCategorySlugs, getAggregateCategoryPaths } from './validate-category-tree.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
config({ path: resolve(__dirname, '../.env') });

// Determine data repo path (CLI arg or env var)
const DATA_REPO = process.argv.find(arg => arg.startsWith('--data-repo='))?.split('=')[1] 
  || process.env.DATA_REPO_PATH 
  || '../data';

const DEFINITIONS_PATH = resolve(DATA_REPO, 'definitions');
const OUTPUT_PATH = resolve(DATA_REPO, 'generated');

const loadJSON = (relativePath) => {
  const fullPath = resolve(DEFINITIONS_PATH, relativePath);
  return JSON.parse(readFileSync(fullPath, 'utf-8'));
};

// Load project configuration
const projectConfig = loadJSON('project.json');

// Validate required ACO configuration
if (!projectConfig.aco) {
  throw new Error(
    'Missing required "aco" configuration in project.json. ' +
    'Please add:\n' +
    '  "aco": {\n' +
    '    "locale": "en-US",\n' +
    '    "defaultProductStatus": "ENABLED",\n' +
    '    "defaultVisibility": ["CATALOG", "SEARCH"],\n' +
    '    "defaultCategoryActive": true\n' +
    '  }'
  );
}

// Validate required Commerce configuration
if (!projectConfig.commerce) {
  throw new Error(
    'Missing required "commerce" configuration in project.json. ' +
    'Please add:\n' +
    '  "commerce": {\n' +
    '    "defaultActive": true,\n' +
    '    "defaultIncludeInMenu": true\n' +
    '  }'
  );
}

// Validate required ACO fields
const requiredAcoFields = ['locale', 'defaultProductStatus', 'defaultVisibility', 'defaultCategoryActive'];
const missingAcoFields = requiredAcoFields.filter(field => !(field in projectConfig.aco));
if (missingAcoFields.length > 0) {
  throw new Error(`Missing required ACO configuration fields: ${missingAcoFields.join(', ')}`);
}

// Validate required Commerce fields
const requiredCommerceFields = ['defaultActive', 'defaultIncludeInMenu'];
const missingCommerceFields = requiredCommerceFields.filter(field => !(field in projectConfig.commerce));
if (missingCommerceFields.length > 0) {
  throw new Error(`Missing required Commerce configuration fields: ${missingCommerceFields.join(', ')}`);
}

export const PROJECT_CONFIG = {
  paths: {
    definitions: DEFINITIONS_PATH,
    outputCommerce: join(OUTPUT_PATH, 'commerce'),
    outputAco: join(OUTPUT_PATH, 'aco'),
    media: resolve(DATA_REPO, 'media')
  },
  
  // Load project settings from definitions (no defaults - explicit configuration required)
  project: projectConfig,
  
  // Load data files
  productCatalog: loadJSON('products/catalog.json'),
  brands: loadJSON('products/brands.json'),
  units: loadJSON('products/units.json'),
  categoryTree: (() => {
    const categoryTree = loadJSON('categories/category-tree.json');
    
    // Validate category tree matches fixed taxonomy
    try {
      validateCategoryTree(categoryTree);
      const summary = getCategorySummary(categoryTree);
      console.log(`✅ Category tree validated: ${summary.totalCount} categories (${summary.topLevelCount} top-level, ${summary.subcategoryCount} subcategories)`);
    } catch (error) {
      console.error('\n⚠️  CATEGORY TREE VALIDATION FAILED:\n');
      console.error(error.message);
      console.error('\n');
      process.exit(1);
    }
    
    return categoryTree;
  })(),

  // Aggregate categories (categories that contain ALL products, e.g., "All Products")
  // Derived from categoryTree categories with aggregateAll: true
  aggregateCategorySlugs: (() => {
    const categoryTree = loadJSON('categories/category-tree.json');
    const slugs = getAggregateCategorySlugs(categoryTree);
    if (slugs.length > 0) {
      console.log(`✅ Aggregate categories: ${slugs.join(', ')}`);
    }
    return slugs;
  })(),

  // Aggregate category paths for Commerce format (e.g., "BuildRight Catalog/All Products")
  aggregateCategoryPaths: (() => {
    const categoryTree = loadJSON('categories/category-tree.json');
    return getAggregateCategoryPaths(categoryTree);
  })(),

  productAttributes: loadJSON('attributes/product-attributes.json'),
  customerAttributes: loadJSON('attributes/customer-attributes.json'),
  customerGroups: loadJSON('customers/customer-groups.json'),
  demoCustomers: loadJSON('customers/demo-customers.json'),
  
  
  // Load ACO data files
  acoPriceBooks: loadJSON('aco/price-books.json'),
  acoPricingRules: loadJSON('aco/pricing-rules.json')
};

