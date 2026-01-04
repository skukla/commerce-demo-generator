/**
 * Variant/Configurable Products Generator
 * Generates configurable products and their variants from product definitions
 * Commerce is the source of truth (reads from product-definitions.js)
 */

import { PRODUCT_CATEGORIES, BRANDS } from '../lib/product-definitions.js';
import { SeededRandom } from '../lib/seeded-random.js';
import { generateProductDescription, generateShortDescription } from '../lib/description-generator.js';
import { generateHash, generateUrlKey } from '../lib/product-utils.js';
import { PROJECT_CONFIG } from '../config/project-config.js';

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
 * Generate SKU for configurable product
 * 
 * Uses same prefix logic as simple products:
 * 1. Use skuPrefix from category definition (explicit business decision)
 * 2. Fallback to first 3 characters of category key (auto-generation)
 */
function generateConfigurableSKU(categoryKey, subcategoryKey, productName) {
  // Read skuPrefix from category config (user-defined business decision)
  const categoryConfig = PRODUCT_CATEGORIES[categoryKey];
  const prefix = categoryConfig?.skuPrefix 
    || categoryKey.substring(0, 3).toUpperCase(); // Fallback: first 3 chars
  
  const hash = generateHash(`${categoryKey}-${subcategoryKey}-${productName}`);
  return `${prefix}-${hash}-CONFIG`;
}

/**
 * Generate SKU for variant product
 */
function generateVariantSKU(parentSKU, dimensions) {
  // Create dimension string with KEYS to avoid collisions (e.g., "depth=1.75,width=9.25,length=20")
  // Using keys ensures different dimension sets with same values in different order don't collide
  const dimStr = Object.entries(dimensions)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // Sort by key for consistency
    .map(([key, val]) => `${key}=${val}`)
    .join(',');
  // Use full 8-character hash to minimize collisions
  const hash = generateHash(dimStr);
  return `${parentSKU.replace('-CONFIG', '')}-VAR-${hash}`;
}

/**
 * Calculate cartesian product of dimension arrays
 * Example: {depth: [1,2], width: [3,4]} → [{depth:1,width:3}, {depth:1,width:4}, {depth:2,width:3}, {depth:2,width:4}]
 */
function cartesianProduct(dimensions) {
  const keys = Object.keys(dimensions);
  const values = Object.values(dimensions);
  
  function* product(index, current) {
    if (index === keys.length) {
      yield { ...current };
      return;
    }
    
    for (const value of values[index]) {
      // Create a new object for each recursion to avoid mutation issues
      const next = { ...current };
      next[keys[index]] = value;
      yield* product(index + 1, next);
    }
  }
  
  return Array.from(product(0, {}));
}

/**
 * Map attributes from category/subcategory context to product
 */
function mapCategoryAttributes(categoryKey, category, subcategory, random) {
  const attributes = {};

  // NOTE: br_product_category removed - native 'categories' attribute replaces it

  // Construction phase - use first simple product's phase as default
  if (subcategory.simple && subcategory.simple.length > 0) {
    const firstProduct = subcategory.simple[0];
    if (firstProduct.br_construction_phase) {
      attributes.br_construction_phase = Array.isArray(firstProduct.br_construction_phase) 
        ? firstProduct.br_construction_phase[0] 
        : firstProduct.br_construction_phase;
    }
  }
  
  // Quality tier - pick randomly
  const qualityTiers = ['Builder grade', 'Professional', 'Premium'];
  attributes.br_quality_tier = qualityTiers[random.nextInt(0, qualityTiers.length - 1)];
  
  // Store velocity
  const velocities = ['low', 'medium', 'high'];
  attributes.br_store_velocity_category = velocities[random.nextInt(0, velocities.length - 1)];
  
  // Restock attributes
  if (attributes.br_store_velocity_category === 'high') {
    attributes.br_recommended_restock_quantity = random.nextInt(50, 100);
    attributes.br_typical_days_supply = 7;
    attributes.br_restock_priority = 'high';
  } else if (attributes.br_store_velocity_category === 'medium') {
    attributes.br_recommended_restock_quantity = random.nextInt(30, 50);
    attributes.br_typical_days_supply = 14;
    attributes.br_restock_priority = 'medium';
  } else {
    attributes.br_recommended_restock_quantity = random.nextInt(10, 30);
    attributes.br_typical_days_supply = 30;
    attributes.br_restock_priority = 'low';
  }
  
  // Package tier
  const packageTiers = ['good', 'better', 'best'];
  attributes.br_package_tier = packageTiers[random.nextInt(0, packageTiers.length - 1)];
  
  return attributes;
}

/**
 * Generate configurable parent product
 */
function generateConfigurableParent(configDef, categoryKey, category, subcategory, random) {
  const subcategoryKey = Object.keys(category.subcategories).find(k => category.subcategories[k] === subcategory);
  const sku = generateConfigurableSKU(categoryKey, subcategoryKey, configDef.name);
  
  // Use generic brands only - these match br_brand attribute options
  const brand = BRANDS[random.nextInt(0, BRANDS.length - 1)];
  const name = `${brand} ${configDef.name} - Configurable`;
  
  // Base attributes
  const attributes = mapCategoryAttributes(categoryKey, category, subcategory, random);
  
  // Get subcategory name from category tree
  const subcategoryName = SUBCATEGORY_NAMES.get(subcategoryKey) || subcategoryKey;
  
  // Build full category path including subcategory
  const categoryPath = `${PROJECT_CONFIG.project.rootCategoryName}/${category.name}/${subcategoryName}`;
  
  const product = {
    sku,
    attribute_set_code: 'Default',
    type_id: 'configurable',
    product_websites: PROJECT_CONFIG.project.websiteCode,
    name,
    price: 0, // Price varies by configuration
    weight: 1,
    product_online: 1,
    visibility: 4, // Catalog, Search - parent configurable visible everywhere
    tax_class_name: 'Taxable Goods',
    categories: categoryPath,
    url_key: generateUrlKey(name),
    qty: 100,
    is_in_stock: 1,
    manage_stock: 0, // Don't manage stock on parent
    
    // Brand and category attributes
    br_brand: brand,
    br_unit_of_measure: configDef.uom || 'EA',
    
    ...attributes
  };
  
  // Generate descriptions for configurable parent
  const template = { name: configDef.name, priceRange: [0, 0] };
  product.description = `${brand} ${configDef.name} - Available in multiple configurations to suit your project needs. ` + 
                        generateProductDescription(product, template, categoryKey, subcategoryKey).split('.').slice(1).join('.');
  product.short_description = `${configDef.name} configurable - Choose from multiple size and material options`;
  
  return product;
}

/**
 * Generate variant products for all dimension combinations
 */
function generateVariantChildren(configDef, parent, categoryKey, category, subcategory, random) {
  const subcategoryKey = Object.keys(category.subcategories).find(k => category.subcategories[k] === subcategory);
  const combinations = cartesianProduct(configDef.dimensions);
  const variants = [];
  
  // Get subcategory name from category tree
  const subcategoryName = SUBCATEGORY_NAMES.get(subcategoryKey) || subcategoryKey;
  
  // Build full category path including subcategory
  const categoryPath = `${PROJECT_CONFIG.project.rootCategoryName}/${category.name}/${subcategoryName}`;
  
  for (const dims of combinations) {
    const sku = generateVariantSKU(parent.sku, dims);
    
    // Create dimension string for name (e.g., "1.75 x 9.25 x 20")
    const dimStr = Object.entries(dims)
      .map(([key, val]) => val)
      .join(' x ');
    
    const name = `${parent.name.replace(' - Configurable', '')} - ${dimStr}`;
    
    // Price varies by dimensions (larger = more expensive)
    // Only use numeric dimension values for pricing (filter out text like 'single-hung', 'panel', etc.)
    const dimValues = Object.values(dims)
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v)); // Remove NaN values from non-numeric dimensions
    const basePrice = configDef.priceBase || 10;
    const price = dimValues.length > 0 
      ? basePrice + dimValues.reduce((sum, val) => sum + val, 0)
      : basePrice;
    
    const variant = {
      sku,
      attribute_set_code: 'Default',
      type_id: 'simple',
      product_websites: PROJECT_CONFIG.project.websiteCode,
      name,
      price: price.toFixed(2),
      weight: dimValues.length > 0 
        ? dimValues.reduce((sum, val) => sum * val, 1) / 100 // Approximate weight based on dimensions
        : 1, // Default weight if no numeric dimensions
      product_online: 1,
      visibility: 1, // Not Visible Individually - variants not visible in catalog/search
      tax_class_name: 'Taxable Goods',
      categories: categoryPath,
      url_key: generateUrlKey(name),
      qty: random.nextInt(50, 200),
      is_in_stock: 1,
      manage_stock: 1,
      
      // Link to parent
      parent_sku: parent.sku,
      
      // Inherit attributes from parent
      // NOTE: br_product_category removed - native 'categories' attribute replaces it
      br_brand: parent.br_brand,
      br_unit_of_measure: parent.br_unit_of_measure,
      br_construction_phase: parent.br_construction_phase,
      br_quality_tier: parent.br_quality_tier,
      br_store_velocity_category: parent.br_store_velocity_category,
      br_recommended_restock_quantity: parent.br_recommended_restock_quantity,
      br_typical_days_supply: parent.br_typical_days_supply,
      br_restock_priority: parent.br_restock_priority,
      br_package_tier: parent.br_package_tier,
      
      // Add dimension-specific attributes
      ...Object.fromEntries(
        Object.entries(dims).map(([key, val]) => [`br_${key}`, val])
      )
    };
    
    // Category-specific attributes for lumber
    // NOTE: br_product_category check removed - using categoryKey directly
    if (categoryKey === 'structural') {
      if (dims.depth && dims.width) {
        variant.br_lumber_dimension = `${dims.depth}x${dims.width}`;
      }
      if (dims.length) {
        variant.br_lumber_length = `${dims.length}ft`;
      }
    }
    
    // Generate unique descriptions for variants
    const template = { name: configDef.name, priceRange: [price, price] };
    variant.description = generateProductDescription(variant, template, categoryKey, subcategoryKey);
    variant.short_description = generateShortDescription(variant, template, categoryKey, subcategoryKey);
    
    variants.push(variant);
  }
  
  return variants;
}

/**
 * Generate all configurable products and their variants
 */
export async function generateVariants() {
  const configurables = [];
  const variants = [];
  
  // Iterate over all categories and subcategories
  for (const [categoryKey, category] of Object.entries(PRODUCT_CATEGORIES)) {
    if (!category.subcategories) continue;
    
    for (const [subcategoryKey, subcategory] of Object.entries(category.subcategories)) {
      if (!subcategory.configurable || subcategory.configurable.length === 0) continue;
      
      // Create seeded random for deterministic generation
      const random = new SeededRandom(`${categoryKey}-${subcategoryKey}`);
      
      for (const configDef of subcategory.configurable) {
        // Generate parent configurable
        const parent = generateConfigurableParent(configDef, categoryKey, category, subcategory, random);
        
        // Generate child variants
        const children = generateVariantChildren(configDef, parent, categoryKey, category, subcategory, random);
        
        // Link parent to children via configurable_variations
        parent.configurable_variations = children.map(c => c.sku).join(',');
        
        // Set configurable_attributes (which attributes vary across children)
        // Convert dimension keys to attribute codes (e.g., "depth" -> "br_depth")
        const configurableAttributeCodes = Object.keys(configDef.dimensions).map(key => `br_${key}`);
        parent.configurable_attributes = configurableAttributeCodes.join(',');
        
        configurables.push(parent);
        variants.push(...children);
      }
    }
  }
  
  // Return both configurables and variants as a flat array
  return [...configurables, ...variants];
}

export default { generateVariants };

