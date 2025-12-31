#!/usr/bin/env node
/**
 * Transform Canonical Datapack to ACO Format
 * 
 * Reads canonical datapack and transforms to ACO format.
 * 
 * Flow:
 * 1. Read canonical datapack (datapack.json)
 * 2. Transform to ACO format (products.json, variants.json, metadata.json, etc.)
 * 3. Write to ACO output directory
 * 
 * Usage:
 *   npm run generate:aco
 *   node generators/generate-aco.js
 * 
 * @module generators/generate-aco
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { updateLine, finishLine } from '../lib/format.js';
import { PROJECT_CONFIG } from '../config/project-config.js';
import { generatePriceBooks, generatePrices, getPricingStats } from './generate-aco-pricing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const CANONICAL_DATAPACK = join(__dirname, '../../buildright-data/generated/canonical/datapack.json');
const ACO_OUTPUT_DIR = PROJECT_CONFIG.paths.outputAco;
const ACO_PRODUCTS_FILE = join(ACO_OUTPUT_DIR, 'products.json');
const ACO_VARIANTS_FILE = join(ACO_OUTPUT_DIR, 'variants.json');
const ACO_METADATA_FILE = join(ACO_OUTPUT_DIR, 'metadata.json');
const ACO_PRICE_BOOKS_FILE = join(ACO_OUTPUT_DIR, 'price-books.json');
const ACO_PRICES_FILE = join(ACO_OUTPUT_DIR, 'prices.json');
const ACO_CATEGORIES_FILE = join(ACO_OUTPUT_DIR, 'categories.json');

/**
 * Transform Commerce product to ACO format
 * @param {Object} commerceProduct - Commerce product data
 * @param {Map} categoryCodeMap - Map of category names/paths to ACO codes (optional)
 * @param {Array} configurations - Configurations array for configurable products (optional)
 * @param {Map} slugToName - Map from slug to display name for category/subcategory (optional)
 */
function transformToAcoProduct(commerceProduct, categoryCodeMap = null, configurations = null, slugToName = null) {
  // Get ACO configuration defaults from project config
  const acoConfig = PROJECT_CONFIG.project.aco;
  
  const acoProduct = {
    sku: commerceProduct.sku,
    source: {
      locale: acoConfig.locale
    },
    name: commerceProduct.name,
    slug: commerceProduct.url_key,
    description: commerceProduct.description || commerceProduct.short_description || '',
    status: commerceProduct.product_online === 1 ? acoConfig.defaultProductStatus : 'DISABLED',
    visibleIn: []
  };
  
  // Add category routes if available
  if (categoryCodeMap && commerceProduct.categories) {
    const categoryCodes = extractCategoryCodes(
      commerceProduct.categories, 
      categoryCodeMap,
      commerceProduct.url_key  // Pass product slug for route generation
    );
    if (categoryCodes.length > 0) {
      acoProduct.routes = categoryCodes.map((path, index) => {
        const route = { path };
        // Position 0 is omitted (per Dyson pattern), positions 1+ are included
        if (index > 0) {
          route.position = index;
        }
        return route;
      });
    }
  }
  
  // Map Commerce visibility (numeric) to ACO visibleIn (string array)
  const visibilityMap = {
    1: [], // Not Visible Individually
    2: ['CATALOG'], // Catalog
    3: ['SEARCH'], // Search
    4: ['CATALOG', 'SEARCH'] // Catalog, Search
  };
  
  const visibility = parseInt(commerceProduct.visibility) || 4;
  acoProduct.visibleIn = visibilityMap[visibility] || acoConfig.defaultVisibility;
  
  // Transform custom attributes
  acoProduct.attributes = [];
  
  // Extract all custom attributes (using project's attribute prefix)
  // NOTE: br_product_category is excluded - native 'categories' attribute replaces it
  const attributePrefix = PROJECT_CONFIG.project.attributePrefix;
  for (const [key, value] of Object.entries(commerceProduct)) {
    if (key.startsWith(attributePrefix) && key !== 'br_product_category' && value !== null && value !== '') {
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

  // Add category and subcategory attributes for ACO filtering (Dyson pattern)
  // ACO does NOT have native categoryPath filter - use custom attributes with filterable: true
  // Uses display names (e.g., "Structural Materials", "Lumber") not slugs
  if (slugToName) {
    let categorySlugs = [];

    if (commerceProduct.canonicalCategories && Array.isArray(commerceProduct.canonicalCategories)) {
      // Canonical products already have categories as slug path arrays
      categorySlugs = commerceProduct.canonicalCategories;
    } else if (commerceProduct.categories) {
      // Commerce products have categories as path string, extract slugs
      categorySlugs = extractCategorySlugPaths(commerceProduct.categories);
    }

    if (categorySlugs.length > 0) {
      const { category, subcategory } = extractCategorySlugs(categorySlugs);

      if (category) {
        acoProduct.attributes.push({
          code: 'category',
          values: [category]
        });
      }

      if (subcategory) {
        acoProduct.attributes.push({
          code: 'subcategory',
          values: [subcategory]
        });
      }
    }
  }

  // Add configurations for configurable products
  if (configurations && configurations.length > 0) {
    acoProduct.configurations = configurations;
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
 * Build configurations for configurable products
 * Returns map of parent SKU to configurations array
 */
function buildConfigurationsMap(products, configurableAttrsMap) {
  const configurationsMap = new Map();
  
  // Find all variants for each configurable
  for (const product of products) {
    if (product.product_type === 'configurable') {
      const configurableAttrs = configurableAttrsMap.get(product.sku);
      if (!configurableAttrs) continue;
      
      // Find all variants of this configurable
      const variants = products.filter(p => p.parent_sku === product.sku);
      
      // Build configurations array
      const configurations = [];
      
      for (const attrCode of configurableAttrs) {
        // Collect all unique values for this attribute across variants
        const valueSet = new Set();
        for (const variant of variants) {
          const value = variant[attrCode];
          if (value) {
            valueSet.add(value.toString());
          }
        }
        
        // Convert to ProductOptionValue array
        const values = Array.from(valueSet).sort().map(value => ({
          variantReferenceId: `${attrCode}-${value}`,
          label: value
        }));
        
        if (values.length > 0) {
          configurations.push({
            attributeCode: attrCode,
            label: formatAttributeLabel(attrCode),
            type: 'CONFIGURABLE',
            values
          });
        }
      }
      
      if (configurations.length > 0) {
        configurationsMap.set(product.sku, configurations);
      }
    }
  }
  
  return configurationsMap;
}

/**
 * Format attribute code to human-readable label
 */
function formatAttributeLabel(code) {
  return code
    .replace(/^br_/, '')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Transform Commerce variant to ACO format
 *
 * NOTE: ACO variant schema uses variantReferenceId and links array (not parentSku).
 * Variants are standalone products with their variation attributes in the attributes array,
 * plus relationship fields linking them to their parent configurable product.
 *
 * @param {Object} commerceVariant - The variant product
 * @param {Map} configurableAttrsMap - Map of parent SKU to configurable attributes (unused but kept for API compatibility)
 * @param {Map} categoryCodeMap - Map of category names/paths to ACO codes (optional)
 * @param {Map} slugToName - Map from slug to display name for category/subcategory (optional)
 */
function transformToAcoVariant(commerceVariant, configurableAttrsMap = new Map(), categoryCodeMap = null, slugToName = null) {
  // Transform as a standard product first
  const acoProduct = transformToAcoProduct(commerceVariant, categoryCodeMap, null, slugToName);
  
  // Control variant visibility for import/delete operations
  // DEFAULT: Variants are generated as visible for verification during import
  // Set VARIANT_INITIAL_VISIBLE=false to generate as invisible (for testing)
  // The import script will toggle them to invisible after verification
  const variantInitialVisible = process.env.VARIANT_INITIAL_VISIBLE !== 'false';
  
  if (variantInitialVisible) {
    // Make variants visible for verification during import
    acoProduct.visibleIn = ['CATALOG', 'SEARCH'];
  } else {
    // Default: variants are invisible (not shown as standalone products)
    acoProduct.visibleIn = [];
  }
  
  // Add variant-specific fields required by ACO schema
  // Per ACO TypeScript SDK: interface ProductLink { type: string; sku: string; }
  // variantReferenceId belongs INSIDE ProductAttribute, not at product root level
  if (commerceVariant.parent_sku) {
    // Links array: establishes parent-child relationship
    acoProduct.links = [
      {
        type: 'VARIANT_OF',
        sku: commerceVariant.parent_sku
      }
    ];
    
    // Add variantReferenceId to the configurable attributes
    // variantReferenceId format: "attributeCode-value" (e.g., "br_depth-1.75")
    // This must match the variantReferenceId in the parent's configurations array
    const configurableAttrs = configurableAttrsMap.get(commerceVariant.parent_sku);
    if (configurableAttrs && configurableAttrs.length > 0) {
      for (const attrCode of configurableAttrs) {
        const attr = acoProduct.attributes.find(a => a.code === attrCode);
        if (attr && attr.values && attr.values.length > 0) {
          // Format: "attrCode-value" matches configurations[].values[].variantReferenceId
          attr.variantReferenceId = `${attrCode}-${attr.values[0]}`;
        }
      }
    }
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
  
  // Enable faceting if filterable (required for Live Search category facets)
  if (attr.is_filterable === 1 || attr.is_filterable_in_search === 1) {
    visibility.push('FACET');
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
 * Extract category slug paths for ACO native categories attribute
 * @param {string} commerceCategories - Category path (e.g., "BuildRight Catalog/Structural Materials/Lumber")
 * @returns {string[]} Array of hierarchical slug paths (e.g., ["structural-materials", "structural-materials/lumber"])
 */
function extractCategorySlugPaths(commerceCategories) {
  if (!commerceCategories) {
    return [];
  }

  const paths = [];
  const parts = commerceCategories.split('/').slice(1); // Remove root category

  let currentPath = '';

  for (const part of parts) {
    const slug = slugify(part);
    currentPath = currentPath ? `${currentPath}/${slug}` : slug;
    paths.push(currentPath);
  }

  return paths;
}

/**
 * Build a map from slug to display name for category/subcategory extraction
 * @param {Object} categoryTree - Category tree with name, urlKey, and children
 * @returns {Object} { slugToName: Map, parentSlugToName: Map }
 */
function buildCategoryNameMaps(categoryTree) {
  const slugToName = new Map();
  const slugToParentSlug = new Map();

  function traverse(node, parentSlug = null) {
    const slug = node.urlKey || slugify(node.name);
    slugToName.set(slug, node.name);
    if (parentSlug) {
      slugToParentSlug.set(slug, parentSlug);
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child, slug);
      }
    }
  }

  // Start from root's children (skip root itself)
  if (categoryTree.children) {
    for (const child of categoryTree.children) {
      traverse(child, null);
    }
  }

  return { slugToName, slugToParentSlug };
}

/**
 * Extract category and subcategory slugs from product categories (Dyson pattern)
 *
 * Stores SLUGS (not display names) in product attributes. This simplifies the
 * mesh resolver by eliminating slug-to-display-name conversion. Display names
 * are obtained from the Categories API when needed for UI rendering.
 *
 * @param {string[]} categorySlugs - Array of category paths (e.g., ["structural-materials", "structural-materials/lumber"])
 * @returns {Object} { category: string|null, subcategory: string|null }
 */
function extractCategorySlugs(categorySlugs) {
  if (!categorySlugs || categorySlugs.length === 0) {
    return { category: null, subcategory: null };
  }

  // Find the deepest category path (most specific)
  const deepestPath = categorySlugs.reduce((longest, current) =>
    current.length > longest.length ? current : longest
  , categorySlugs[0]);

  // Parse the path: "structural-materials/lumber" -> ["structural-materials", "lumber"]
  const pathParts = deepestPath.split('/');

  // Category is always the first part (top-level slug)
  const category = pathParts[0];

  // Subcategory is the last part if there are multiple levels (leaf slug)
  const subcategory = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;

  return { category, subcategory };
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
        value: slugify(String(opt.label || opt.value || opt)),
        label: String(opt.label || opt.value || opt)
      }));
    }
    
    return metadata;
  });
}

/**
 * Transform category tree to ACO format with flat structure
 * ACO categories use parentId references and slug-based paths
 */
function transformToAcoCategories(categoryTree) {
  const categories = [];
  const categoryMap = new Map(); // Track codes for building slugs
  
  /**
   * Recursively flatten category tree
   * @param {Object} node - Category node
   * @param {string} slugPath - Accumulated slug path (hierarchy via slug)
   * 
   * ACO Category Schema (v1.0.0):
   * - slug: REQUIRED - hierarchical path (e.g., "men/clothing/pants")
   * - source: REQUIRED - { locale: "en-US" }
   * - name: REQUIRED - display name
   * - families: OPTIONAL - array of product family identifiers
   * 
   * REMOVED from schema (no longer supported):
   * - code (use slug instead)
   * - description (not supported)
   * - active (not supported)
   * - parentId (hierarchy via slug path)
   */
  function flattenCategory(node, slugPath = '') {
    const code = node.urlKey || slugify(node.name);
    const currentSlug = slugPath ? `${slugPath}/${code}` : code;
    
    // Get ACO configuration defaults from project config
    const acoConfig = PROJECT_CONFIG.project.aco;
    
    // ACO Category Schema v1.0.0 - ONLY these fields are allowed
    const acoCategory = {
      slug: currentSlug, // REQUIRED - hierarchical path represents parent-child
      source: {
        locale: acoConfig.locale
      },
      name: node.name, // REQUIRED - display name
      families: ['default'] // REQUIRED for navigation query - associates category with catalog family
    };
    
    categories.push(acoCategory);
    categoryMap.set(code, currentSlug);
    
    // Process children - hierarchy is represented via slug path
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        flattenCategory(child, currentSlug); // Pass current slug as parent path
      }
    }
  }
  
  // Start with root node's children
  if (categoryTree.children && categoryTree.children.length > 0) {
    for (const child of categoryTree.children) {
      flattenCategory(child, null, '');
    }
  }
  
  return { categories, categoryMap };
}

/**
 * Build a map of Commerce category paths to ACO category codes
 * This allows us to link products to categories
 */
function buildCategoryCodeMap(categoryTree) {
  const pathToCode = new Map();
  
  function traverse(node, pathParts = [], codeParts = []) {
    const currentPath = [...pathParts, node.name].join('/');
    const code = node.urlKey || slugify(node.name);
    const fullCode = codeParts.length > 0 ? [...codeParts, code].join('/') : code;
    
    // Map full name path to full code slug
    pathToCode.set(currentPath, fullCode);
    
    // Map simple name to full code (for subcategories)
    pathToCode.set(node.name, fullCode);
    
    // Map by slug too (canonical products use slugs in categories array)
    pathToCode.set(fullCode, fullCode);  // slug → slug (identity mapping)
    pathToCode.set(code, fullCode);      // leaf slug → full slug
    
    if (node.children) {
      for (const child of node.children) {
        traverse(child, [...pathParts, node.name], [...codeParts, code]);
      }
    }
  }
  
  // Start traversal from root's children
  if (categoryTree.children) {
    for (const child of categoryTree.children) {
      traverse(child, []);
    }
  }
  
  return pathToCode;
}

/**
 * Extract category codes from a Commerce product's categories field
 * @param {String|Array} productCategories - Commerce category paths (string or array, e.g., "BuildRight Catalog/Lumber" or ["Default Category/BuildRight/Lumber"])
 * @param {Map} categoryCodeMap - Map of category names/paths to ACO codes
 * @returns {Array} Array of ACO category codes
 */
/**
 * Extract product routes following Dyson/ACO pattern:
 * - Route 1: Product slug alone (direct access)
 * - Route 2+: Full category path + product slug (category browsing)
 * 
 * Example:
 *   Input: categories = ["Structural Materials/Lumber"], productSlug = "2x4-premium-stud-8ft"
 *   Output: ["2x4-premium-stud-8ft", "structural-materials/lumber/2x4-premium-stud-8ft"]
 * 
 * @param {string|string[]} productCategories - Category paths
 * @param {Map} categoryCodeMap - Map of category names to slugs
 * @param {string} productSlug - Product URL key/slug
 * @returns {string[]} Array of route paths
 */
function extractCategoryCodes(productCategories, categoryCodeMap, productSlug) {
  if (!productCategories || !productSlug) {
    return [];
  }
  
  // Convert string to array if needed (Commerce datapacks use strings)
  const categoriesArray = typeof productCategories === 'string' 
    ? [productCategories] 
    : productCategories;
  
  if (categoriesArray.length === 0) {
    return [productSlug]; // At minimum, return product slug
  }
  
  const routes = [];
  
  // Route 1: Product slug alone (direct access)
  routes.push(productSlug);
  
  // Route 2+: Full category path + product slug
  for (const categoryPath of categoriesArray) {
    // Try full path first
    let categorySlug = null;
    if (categoryCodeMap.has(categoryPath)) {
      categorySlug = categoryCodeMap.get(categoryPath);
    } else {
      // Try splitting and using the last part (leaf category)
      const parts = categoryPath.split('/');
      const leafCategory = parts[parts.length - 1];
      
      if (categoryCodeMap.has(leafCategory)) {
        categorySlug = categoryCodeMap.get(leafCategory);
      }
    }
    
    // Combine category path + product slug (Dyson pattern)
    if (categorySlug) {
      routes.push(`${categorySlug}/${productSlug}`);
    }
  }
  
  return Array.from(new Set(routes)); // Remove duplicates
}

/**
 * Load canonical datapack and Commerce products for ACO transformation
 * Hybrid approach: Simple products from canonical, configurable/variants from Commerce
 */
async function loadCanonicalForAco() {
  const canonical = JSON.parse(await fs.readFile(CANONICAL_DATAPACK, 'utf-8'));
  
  // Convert canonical products to Commerce-like format
  const canonicalProducts = canonical.products.map(product => ({
    sku: product.sku,
    product_type: product.type,
    name: product.name,
    description: product.description,
    short_description: product.shortDescription,
    price: product.price.toString(),
    weight: product.weight.toString(),
    product_online: product.meta.status === 'enabled' ? 1 : 0,
    visibility: mapCanonicalVisibilityToCommerce(product.meta.visibility),
    categories: mapCanonicalCategoriesToPath(product.categories, canonical.categories),
    // Preserve original canonical categories for ACO native categories attribute
    canonicalCategories: product.categories,
    url_key: product.urlKey,
    qty: product.stock.qty,
    is_in_stock: product.stock.inStock ? 1 : 0,
    manage_stock: product.stock.manageStock ? 1 : 0,
    // Flatten attributes to Commerce style
    ...flattenAttributes(product.attributes)
  }));
  
  // Also read Commerce products to get configurable products and variants
  // (These are not yet in canonical format)
  const COMMERCE_PRODUCTS_PATH = join(PROJECT_CONFIG.paths.outputCommerce, 'data/accs/accs_products.json');
  const commerceData = JSON.parse(await fs.readFile(COMMERCE_PRODUCTS_PATH, 'utf-8'));
  const commerceProducts = commerceData.source.items;
  
  // Extract configurable products and variants from Commerce
  const configurables = commerceProducts.filter(p => p.product_type === 'configurable');
  const variants = commerceProducts.filter(p => p.product_type === 'simple' && p.sku.includes('-VAR-'));
  
  // Combine: canonical simple products + Commerce configurable products + Commerce variants
  const commerceLikeProducts = [...canonicalProducts, ...configurables, ...variants];
  
  // Convert canonical attributes to Commerce-like format
  const commerceLikeAttributes = canonical.attributes.map(attr => ({
    attribute: {
      attribute_id: attr.code,
      attribute_code: attr.code,
      frontend_label: attr.label,
      frontend_input: attr.type,
      is_required: attr.required ? 1 : 0,
      is_searchable: attr.searchable ? 1 : 0,
      is_filterable: attr.filterable ? 1 : 0,
      is_comparable: attr.comparable ? 1 : 0,
      is_visible_on_front: attr.visibleOnFront ? 1 : 0,
      used_in_product_listing: attr.usedInProductListing ? 1 : 0,
      is_filterable_in_search: attr.filterable ? 1 : 0,
      additional_data: attr.options ? JSON.stringify(attr.options) : null,
      options: attr.options || []
    }
  }));
  
  return { commerceLikeProducts, commerceLikeAttributes };
}

/**
 * Flatten canonical attributes to Commerce style
 */
function flattenAttributes(attributes) {
  const flattened = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (Array.isArray(value)) {
      flattened[key] = value.join(',');
    } else {
      flattened[key] = value;
    }
  }
  return flattened;
}

/**
 * Map canonical visibility to Commerce visibility codes
 */
function mapCanonicalVisibilityToCommerce(visibility) {
  const map = {
    'not_visible': 1,
    'catalog': 2,
    'search': 3,
    'catalog_search': 4
  };
  return map[visibility] || 4;
}

/**
 * Map canonical categories (slugs) to Commerce category path
 */
function mapCanonicalCategoriesToPath(categorySlugs, allCategories) {
  if (!categorySlugs || categorySlugs.length === 0) return '';
  
  // Find root category
  const root = allCategories.find(c => c.parentId === null);
  const rootName = root ? root.name : PROJECT_CONFIG.project.rootCategoryName || 'Catalog';
  
  // Look for the most specific category (longest path = deepest in hierarchy)
  // Example: ["structural-materials", "structural-materials/lumber"]
  // We want "structural-materials/lumber" (the subcategory)
  const mostSpecificSlug = categorySlugs.reduce((longest, current) => 
    current.length > longest.length ? current : longest
  , categorySlugs[0]);
  
  // Find the category by slug
  const category = allCategories.find(c => c.slug === mostSpecificSlug);
  
  if (category) {
    // Build full path from root through all parents to this category
    const pathParts = [category.name];
    let current = category;
    
    // Walk up the parent chain
    while (current.parentId) {
      const parent = allCategories.find(c => c.id === current.parentId);
      if (parent && parent.parentId !== null) { // Don't include root
        pathParts.unshift(parent.name);
      }
      current = parent || { parentId: null };
    }
    
    return `${rootName}/${pathParts.join('/')}`;
  }
  
  return rootName;
}

/**
 * Main transform function
 */
async function transformForAco() {
  console.log('');
  
  try {
    // Step 1: Read canonical datapack
    updateLine('📦 Reading canonical datapack...');
    const { commerceLikeProducts, commerceLikeAttributes } = await loadCanonicalForAco();
    const commerceProducts = commerceLikeProducts;
    const commerceAttributes = commerceLikeAttributes;
    const productCount = commerceProducts.length;
    updateLine(chalk.green(`✔ Read ${productCount} ${productCount === 1 ? 'product' : 'products'} from canonical datapack`));
    finishLine();
    
    // Step 2: Transform categories to ACO format
    updateLine('📦 Transforming categories...');
    const categoryTree = PROJECT_CONFIG.categoryTree;
    const { categories: acoCategories, categoryMap } = transformToAcoCategories(categoryTree);
    const categoryCodeMap = buildCategoryCodeMap(categoryTree);
    // Build slug-to-name map for Dyson pattern (category/subcategory with display names)
    const { slugToName } = buildCategoryNameMaps(categoryTree);
    const catCount = acoCategories.length;
    updateLine(chalk.green(`✔ Transformed ${catCount} ${catCount === 1 ? 'category' : 'categories'}`));
    finishLine();

    // Step 3: Transform products to ACO format with category linkage
    updateLine('📦 Transforming products...');
    const acoProducts = commerceProducts.map(p => transformToAcoProduct(p, categoryCodeMap, null, slugToName));

    // Step 4: Separate by type and build configurable attributes map
    const { simples, configurables, variants } = separateByType(commerceProducts);
    const configurableAttrsMap = buildConfigurableAttributesMap(commerceProducts);

    // Build configurations for configurable products
    const configurationsMap = buildConfigurationsMap(commerceProducts, configurableAttrsMap);

    const acoSimples = simples.map(p => transformToAcoProduct(p, categoryCodeMap, null, slugToName));
    const acoConfigurables = configurables.map(p => {
      const configurations = configurationsMap.get(p.sku);
      return transformToAcoProduct(p, categoryCodeMap, configurations, slugToName);
    });
    // ACO variants file should contain ONLY the variant products, not parent configurables
    // Parent configurables belong in the products file
    const acoVariants = variants.map(v => transformToAcoVariant(v, configurableAttrsMap, categoryCodeMap, slugToName));
    
    updateLine(chalk.green(`✔ Transformed ${acoSimples.length} simple, ${acoConfigurables.length} configurable, ${variants.length} ${variants.length === 1 ? 'variant' : 'variants'}`));
    finishLine();
    
    // Step 5: Extract metadata from Commerce attributes
    updateLine('📦 Extracting metadata...');
    let metadata = extractMetadata(commerceAttributes);

    // Filter out br_product_category (replaced by category/subcategory Dyson pattern)
    metadata = metadata.filter(m => m.attributeId !== 'br_product_category');

    // Add category and subcategory attributes for ACO filtering (Dyson pattern)
    // ACO does NOT have native categoryPath filter - use custom attributes with filterable: true
    // Type 'select' ensures filterable: true is set by the importer
    metadata.push({
      attributeId: 'category',
      type: 'select',
      label: 'Category',
      searchWeight: 5,
      isRequired: false,
      sortOrder: 1
    });

    metadata.push({
      attributeId: 'subcategory',
      type: 'select',
      label: 'Subcategory',
      searchWeight: 5,
      isRequired: false,
      sortOrder: 2
    });

    const metaCount = metadata.length;
    updateLine(chalk.green(`✔ Extracted ${metaCount} ${metaCount === 1 ? 'attribute' : 'attributes'}`));
    finishLine();
    
    // Step 6: Generate price books and prices
    updateLine('📦 Generating price books...');
    const priceBooks = generatePriceBooks();
    const pbCount = priceBooks.length;
    updateLine(chalk.green(`✔ Generated ${pbCount} price ${pbCount === 1 ? 'book' : 'books'}`));
    finishLine();
    
    updateLine('📦 Generating prices...');
    const prices = generatePrices(commerceProducts);
    const pricingStats = getPricingStats(commerceProducts, prices);
    const priceCount = prices.length;
    updateLine(chalk.green(`✔ Generated ${priceCount} ${priceCount === 1 ? 'price' : 'prices'} (${pricingStats.tieredPriceEntries} with tiers)`));
    finishLine();
    
    // Step 7: Ensure ACO directory exists
    await fs.mkdir(ACO_OUTPUT_DIR, { recursive: true });
    
    // Step 8: Write to ACO data directory
    updateLine('📦 Writing ACO files...');
    
    await fs.writeFile(ACO_CATEGORIES_FILE, JSON.stringify(acoCategories, null, 2));
    // Products file should contain both simple products AND parent configurables
    await fs.writeFile(ACO_PRODUCTS_FILE, JSON.stringify([...acoSimples, ...acoConfigurables], null, 2));
    await fs.writeFile(ACO_VARIANTS_FILE, JSON.stringify(acoVariants, null, 2));
    await fs.writeFile(ACO_METADATA_FILE, JSON.stringify(metadata, null, 2));
    await fs.writeFile(ACO_PRICE_BOOKS_FILE, JSON.stringify(priceBooks, null, 2));
    await fs.writeFile(ACO_PRICES_FILE, JSON.stringify(prices, null, 2));
    
    const totalFiles = 6;
    updateLine(chalk.green(`✔ Wrote ${totalFiles} ACO ${totalFiles === 1 ? 'file' : 'files'}`));
    finishLine();
    
    console.log('');
    console.log(chalk.green('✔ ACO datapack generated successfully'));
    console.log('');
    
    return {
      success: true,
      categories: acoCategories.length,
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

// Export functions for testing
export {
  extractCategorySlugPaths,
  transformToAcoProduct,
  slugify
};

// Run only when invoked directly (not when imported for testing)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  transformForAco()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(error => {
      console.error(chalk.red('Fatal error:'), error);
      process.exit(1);
    });
}

