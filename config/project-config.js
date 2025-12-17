import { config } from 'dotenv';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

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

// Set defaults for ACO configuration if not present
const acoDefaults = {
  locale: 'en-US',
  defaultProductStatus: 'ENABLED',
  defaultVisibility: ['CATALOG', 'SEARCH'],
  defaultCategoryActive: true
};

// Set defaults for Commerce configuration if not present
const commerceDefaults = {
  defaultActive: true,
  defaultIncludeInMenu: true
};

export const PROJECT_CONFIG = {
  paths: {
    definitions: DEFINITIONS_PATH,
    outputCommerce: join(OUTPUT_PATH, 'commerce'),
    outputAco: join(OUTPUT_PATH, 'aco'),
    media: resolve(DATA_REPO, 'media')
  },
  
  // Load project settings from definitions with defaults
  project: {
    ...projectConfig,
    aco: { ...acoDefaults, ...(projectConfig.aco || {}) },
    commerce: { ...commerceDefaults, ...(projectConfig.commerce || {}) }
  },
  
  // Load data files
  productCatalog: loadJSON('products/catalog.json'),
  brands: loadJSON('products/brands.json'),
  units: loadJSON('products/units.json'),
  categoryTree: loadJSON('categories/category-tree.json'),
  productAttributes: loadJSON('attributes/product-attributes.json'),
  customerAttributes: loadJSON('attributes/customer-attributes.json'),
  customerGroups: loadJSON('customers/customer-groups.json'),
  demoCustomers: loadJSON('customers/demo-customers.json'),
  
  
  // Load ACO data files
  acoPriceBooks: loadJSON('aco/price-books.json'),
  acoPricingRules: loadJSON('aco/pricing-rules.json')
};

