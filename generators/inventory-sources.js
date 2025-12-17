/**
 * MSI Inventory Sources Generator
 * 
 * Generates Adobe Commerce Multi-Source Inventory (MSI) sources for demo data.
 * 
 * Based on BuildRight use case:
 * - 3 warehouse/distribution centers across US regions
 * - Support for in-store pickup locations
 * - Regional fulfillment strategy
 * 
 * References:
 * - buildright-eds/scripts/warehouse-config.js
 * - Adobe Commerce REST API: POST /V1/inventory/sources
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PROJECT_CONFIG } from '../config/project-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SAMPLE_DATA_DIR = join(__dirname, '../../config/sample-data');

/**
 * Default warehouse/source definitions based on BuildRight use case
 */
const DEFAULT_SOURCES = [
  {
    source_code: 'warehouse_west',
    name: 'West Coast Distribution Center',
    enabled: true,
    description: 'Primary distribution center for western region',
    contact_name: 'Sarah Martinez',
    email: 'sarah.martinez@buildright.example.com',
    phone: '(602) 555-0100',
    country_id: 'US',
    region_id: 4, // Arizona
    region: 'Arizona',
    city: 'Phoenix',
    street: '2450 West Buckeye Road',
    postcode: '85009',
    latitude: 33.435463,
    longitude: -112.109985,
    use_default_carrier_config: true
  },
  {
    source_code: 'warehouse_central',
    name: 'Central Distribution Center',
    enabled: true,
    description: 'Primary distribution center for central region',
    contact_name: 'Marcus Johnson',
    email: 'marcus.johnson@buildright.example.com',
    phone: '(214) 555-0200',
    country_id: 'US',
    region_id: 57, // Texas
    region: 'Texas',
    city: 'Dallas',
    street: '1200 Industrial Boulevard',
    postcode: '75207',
    latitude: 32.803340,
    longitude: -96.822070,
    use_default_carrier_config: true
  },
  {
    source_code: 'warehouse_east',
    name: 'East Coast Distribution Center',
    enabled: true,
    description: 'Primary distribution center for eastern region',
    contact_name: 'Lisa Chen',
    email: 'lisa.chen@buildright.example.com',
    phone: '(404) 555-0300',
    country_id: 'US',
    region_id: 18, // Georgia
    region: 'Georgia',
    city: 'Atlanta',
    street: '850 Distribution Drive',
    postcode: '30318',
    latitude: 33.778630,
    longitude: -84.429540,
    use_default_carrier_config: true
  }
];

/**
 * Optional: Retail store pickup locations
 * These can be enabled for in-store pickup scenarios
 */
const STORE_PICKUP_LOCATIONS = [
  {
    source_code: 'store_austin',
    name: 'Austin Retail Store',
    enabled: true,
    description: 'Retail showroom and pickup location',
    contact_name: 'Kevin Rodriguez',
    email: 'austin@buildright.example.com',
    phone: '(512) 555-0100',
    country_id: 'US',
    region_id: 57, // Texas
    region: 'Texas',
    city: 'Austin',
    street: '4521 South Congress Avenue',
    postcode: '78745',
    latitude: 30.230180,
    longitude: -97.800140,
    use_default_carrier_config: true,
    extension_attributes: {
      is_pickup_location_active: true,
      frontend_name: 'Austin (South Congress) Store',
      frontend_description: 'South Congress, Austin - Retail showroom with pickup'
    }
  },
  {
    source_code: 'store_san_antonio',
    name: 'San Antonio Retail Store',
    enabled: true,
    description: 'Retail showroom and pickup location',
    contact_name: 'David Thompson',
    email: 'sanantonio@buildright.example.com',
    phone: '(210) 555-0200',
    country_id: 'US',
    region_id: 57, // Texas
    region: 'Texas',
    city: 'San Antonio',
    street: '8900 IH-10 West',
    postcode: '78230',
    latitude: 29.523840,
    longitude: -98.625300,
    use_default_carrier_config: true,
    extension_attributes: {
      is_pickup_location_active: true,
      frontend_name: 'San Antonio (IH-10) Store',
      frontend_description: 'IH-10 West, San Antonio - Retail showroom with pickup'
    }
  }
];

/**
 * Generate MSI inventory sources
 * 
 * @param {Object} options - Generation options
 * @param {boolean} options.includeStorePickup - Whether to include retail store pickup locations
 * @returns {Array} Array of inventory source objects
 */
export function generateInventorySources(options = {}) {
  const { includeStorePickup = false } = options;
  
  // Start with default warehouse sources
  let sources = [...DEFAULT_SOURCES];
  
  // Optionally add store pickup locations
  if (includeStorePickup) {
    sources = [...sources, ...STORE_PICKUP_LOCATIONS];
  }
  
  // Check for custom sources from sample data
  const customSourcesPath = join(SAMPLE_DATA_DIR, 'inventory-sources.json');
  if (existsSync(customSourcesPath)) {
    try {
      const customData = JSON.parse(readFileSync(customSourcesPath, 'utf8'));
      if (customData.sources && Array.isArray(customData.sources)) {
        sources = customData.sources;
      }
    } catch (err) {
      console.warn(`Warning: Could not load custom inventory sources from ${customSourcesPath}`);
    }
  }
  
  return sources;
}

/**
 * Transform sources to ACCS format for import
 * ACCS expects sources wrapped in a specific structure
 * 
 * @param {Array} sources - Array of source objects
 * @returns {Object} ACCS-formatted sources data
 */
export function transformSourcesToAccsFormat(sources) {
  return {
    sources: sources.map(source => ({
      source: {
        source_code: source.source_code,
        name: source.name,
        enabled: source.enabled !== undefined ? source.enabled : true,
        description: source.description || '',
        latitude: source.latitude || null,
        longitude: source.longitude || null,
        contact_name: source.contact_name || '',
        email: source.email || '',
        phone: source.phone || '',
        fax: source.fax || '',
        country_id: source.country_id,
        region_id: source.region_id || null,
        region: source.region || '',
        city: source.city || '',
        street: source.street || '',
        postcode: source.postcode,
        use_default_carrier_config: source.use_default_carrier_config !== undefined ? source.use_default_carrier_config : true,
        ...(source.extension_attributes && { extension_attributes: source.extension_attributes })
      }
    }))
  };
}

/**
 * Generate source-stock links
 * Links inventory sources to stocks with priority ordering
 * 
 * The default stock (stock_id: 1) cannot be modified.
 * Custom stocks start at stock_id: 2
 * 
 * @param {Array} sources - Array of source objects
 * @param {number} stockId - Stock ID to link sources to (default: 2)
 * @returns {Object} ACCS-formatted stock-source links
 */
export function generateStockSourceLinks(sources, stockId = 2) {
  return {
    links: sources.map((source, index) => ({
      source_code: source.source_code,
      stock_id: stockId,
      priority: index + 1 // Priority determines fulfillment order
    }))
  };
}

/**
 * Generate inventory quantities for products
 * Assigns inventory quantities to each source for all products
 * 
 * @param {Array} products - Array of product objects with SKUs
 * @param {Array} sources - Array of source objects
 * @param {Object} options - Generation options
 * @param {number} options.minQty - Minimum quantity per source (default: 50)
 * @param {number} options.maxQty - Maximum quantity per source (default: 1000)
 * @returns {Object} ACCS-formatted source items
 */
export function generateSourceItems(products, sources, options = {}) {
  const { minQty = 50, maxQty = 1000 } = options;
  
  const sourceItems = [];
  
  for (const product of products) {
    // Skip configurable products - only assign inventory to simple products
    if (product.type_id === 'configurable' || product.product_type === 'configurable') {
      continue;
    }
    
    for (const source of sources) {
      // Generate random quantity between min and max
      const quantity = Math.floor(Math.random() * (maxQty - minQty + 1)) + minQty;
      
      sourceItems.push({
        sku: product.sku,
        source_code: source.source_code,
        quantity: quantity,
        status: 1 // 1 = In Stock, 0 = Out of Stock
      });
    }
  }
  
  return {
    sourceItems
  };
}

/**
 * Export for use in generate-commerce.js
 */
export default {
  generateInventorySources,
  transformSourcesToAccsFormat,
  generateStockSourceLinks,
  generateSourceItems
};

