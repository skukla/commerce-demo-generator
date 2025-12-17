#!/usr/bin/env node

/**
 * Commerce Datapack Generator
 * 
 * Generates a datapack compatible with the ACCS Data Importer.
 * Reads configuration and data from a project-specific data repository.
 * 
 * Output structure:
 *   - data/accs/*.json
 *   - media/catalog/product/...
 */

import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, createWriteStream } from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import generators
import { generateStores } from './stores.js';
import { generateCustomerGroups } from './customer-groups.js';
import { generateAttributes, generateAttributeOptions } from './attributes.js';
import { generateProducts } from './products.js';
import { generateVariants } from './product-variants.js';
import { generateCustomersWithDetails } from './customers.js';
import { 
  generateInventorySources, 
  transformSourcesToAccsFormat,
  generateStockSourceLinks,
  generateSourceItems 
} from './inventory-sources.js';
import { 
  generateCompanies,
  generateTeamsForCompany,
  generateCompanyRoles,
  transformCompaniesToAccsFormat,
  transformTeamsToAccsFormat,
  transformRolesToAccsFormat,
  createCompanyAdminAssignment
} from './companies.js';
import {
  generateB2BConfigReference,
  generateB2BAdminInstructions
} from './b2b-config.js';
import { PROJECT_CONFIG } from '../config/project-config.js';
import { normalizeProductName } from '../lib/name-normalizer.js';
import { updateLine, finishLine } from '../lib/format.js';

// Note: Pricing (tier prices, advanced pricing) is handled via ACO, not Commerce backend
// Customer groups ARE managed in Commerce (for customer segmentation)

// Output paths
const OUTPUT_DIR = PROJECT_CONFIG.paths.outputCommerce;
const DATA_DIR = join(OUTPUT_DIR, 'data/accs');  // ACCS format files in data/accs/
const MEDIA_DIR = join(OUTPUT_DIR, 'media/catalog/product');  // Magento product image structure

// Source image paths
const IMAGES_PATH = join(PROJECT_CONFIG.paths.media, 'images/products');
const IMAGE_MAPPING_PATH = join(IMAGES_PATH, 'IMAGE-PRODUCT-MAPPING.json');

/**
 * Helper to pluralize words
 */
function pluralize(count, singular, plural = null) {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

/**
 * Write JSON file with pretty formatting
 */
function writeJsonFile(filePath, data, description, countField = null) {
  const jsonContent = JSON.stringify(data, null, 4);
  writeFileSync(filePath, jsonContent, 'utf8');
  updateLine(chalk.green(`✔ Generated ${description}`));
  finishLine();
}

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

// NOTE: Module files (registration.php, composer.json, etc/module.xml) are not needed for ACCS datapacks.
// ACCS datapacks only require data/ and media/ folders.

/**
 * Transform products to ACCS format (with source wrapper and flat attributes)
 */
function transformProductsToAccsFormat(products) {
  return {
    source: {
      entity: "catalog_product",
      behavior: "append",
      validation_strategy: "validation-stop-on-errors",
      allowed_error_count: 1,
      items: products.map(product => ({
        sku: product.sku,
        attribute_set_code: product.attribute_set_code || "Default",
        product_type: product.type_id || product.product_type || "simple",  // Preserve the original type_id
        categories: product.categories || [],
        product_websites: [PROJECT_CONFIG.project.websiteCode],
        name: product.name,
        description: product.description || `<p>${product.name}</p>`,
        short_description: product.short_description || `<p>${product.name}</p>`,
        weight: product.weight || 0,
        product_online: product.product_online !== undefined ? product.product_online : 1,
        tax_class_name: "Taxable Goods",
        visibility: product.visibility || 4, // Default: Catalog, Search (numeric for ACO compatibility)
        price: product.price,
        special_price: product.special_price || "",
        special_price_from_date: "",
        special_price_to_date: "",
        url_key: product.url_key || product.sku.toLowerCase(),
        meta_title: product.name,
        meta_keywords: product.name,
        meta_description: product.name,
        qty: product.qty || 100,
        out_of_stock_qty: 0,
        use_config_min_qty: 1,
        is_qty_decimal: 0,
        allow_backorders: 0,
        use_config_backorders: 1,
        min_cart_qty: 1,
        use_config_min_sale_qty: 1,
        max_cart_qty: 10000,
        use_config_max_sale_qty: 1,
        is_in_stock: 1,
        notify_on_stock_below: 1,
        use_config_notify_stock_qty: 1,
        manage_stock: 1,
        use_config_manage_stock: 1,
        use_config_qty_increments: 1,
        qty_increments: 1,
        use_config_enable_qty_inc: 1,
        enable_qty_increments: 0,
        is_decimal_divided: 0,
        // Configurable product fields
        ...(product.configurable_variations && { configurable_variations: product.configurable_variations }),
        ...(product.parent_sku && { parent_sku: product.parent_sku }),
        // Custom attributes as flat fields with br_ prefix
        // Dynamically include ALL br_ attributes from product
        ...Object.keys(product)
          .filter(key => key.startsWith('br_'))
          .reduce((acc, key) => {
            acc[key] = product[key] || "";
            return acc;
          }, {}),
        // Configurable-specific fields
        ...(product.type_id === 'configurable' && {
          configurable_attributes: product.configurable_attributes
        })
      }))
    }
  };
}

/**
 * Transform categories to ACCS format
 */
function transformCategoriesToAccsFormat(categories) {
  const commerceConfig = PROJECT_CONFIG.project.commerce;
  
  return {
    root_category: {
      name: PROJECT_CONFIG.project.rootCategoryName,
      parent_id: 1,
      is_active: commerceConfig.defaultActive,
      include_in_menu: false,
      customAttributes: [
        {
          attributeCode: "is_anchor",
          value: "1"
        }
      ]
    },
    categories: categories.map((cat, index) => ({
      category: {
        name: cat.name,
        parent_id: 0,
        is_active: commerceConfig.defaultActive,
        position: index + 1,
        path: "",
        include_in_menu: commerceConfig.defaultIncludeInMenu,
        customAttributes: [
          {
            attributeCode: "is_anchor",
            value: "1"
          },
          {
            attribute_code: "url_key",
            value: cat.url_key || cat.name.toLowerCase().replace(/\s+/g, '-')
          }
        ]
      }
    }))
  };
}

/**
 * Transform customers to ACCS format
 */
function transformCustomersToAccsFormat(customers) {
  return {
    source: {
      entity: "customer_composite",
      behavior: "add_update",
      validationStrategy: "validation-skip-errors",
      allowedErrorCount: "10",
      items: customers.map(customer => ({
        email: customer.email,
        _website: "base",
        _store: "default",
        firstname: customer.firstname,
        lastname: customer.lastname,
        dob: "",
        gender: customer.gender || 3, // 1=Male, 2=Female, 3=Not Specified
        group_id: customer.group_id || 1,
        prefix: "",
        suffix: "",
        middlename: "",
        taxvat: "",
        password: customer.password || "Password1",
        confirmation: "",
        created_at: "",
        created_in: "Default Store View",
        disable_auto_group_change: 0,
        website_id: 0,
        store_id: 1,
        _address_firstname: customer.firstname,
        _address_lastname: customer.lastname,
        _address_company: customer.company || "",
        _address_street: customer.street || "123 Main Street",
        _address_city: customer.city || "San Diego",
        _address_region: customer.region || "California",
        _address_postcode: customer.postcode || "92101",
        _address_country_id: customer.country_id || "US",
        _address_telephone: customer.telephone || "(555) 555-5555",
        _address_fax: "",
        _address_default_billing_: "1",
        _address_default_shipping_: "1"
      }))
    }
  };
}

/**
 * Transform attributes to ACCS format
 */
function transformAttributesToAccsFormat(attributes) {
  return attributes.map(attr => {
    // Map camelCase from JSON to snake_case expected by transform
    const frontendInput = attr.frontendInput || attr.frontend_input || "select";
    const attributeCode = attr.attributeCode || attr.attribute_code;
    const frontendLabel = attr.frontendLabel || attr.frontend_label || attributeCode;
    const isRequired = attr.isRequired ?? attr.is_required ?? false;
    const isSearchable = attr.isSearchable ?? attr.is_searchable ?? true;
    
    // Text fields CANNOT be filterable in Commerce - force to false for text/textarea
    const isFilterable = (frontendInput === 'text' || frontendInput === 'textarea') 
      ? false 
      : (attr.isFilterable ?? attr.is_filterable ?? true);
    const isFilterableInSearch = (frontendInput === 'text' || frontendInput === 'textarea')
      ? false
      : (attr.isFilterableInSearch ?? attr.is_filterable_in_search ?? true);
    
    const isComparable = attr.isComparable ?? attr.is_comparable ?? true;
    const isVisibleOnFront = attr.isVisibleOnFront ?? attr.is_visible_on_front ?? true;
    
    // Determine backend_type based on frontend_input
    let backendType;
    switch (frontendInput) {
      case 'boolean':
        backendType = 'int';
        break;
      case 'textarea':
        backendType = 'text';
        break;
      case 'price':
        backendType = 'decimal';
        break;
      default:
        backendType = 'varchar';
    }
    
    const attributeData = {
      entity_type_id: 4, // Product entity type
      attribute_code: attributeCode,
      frontend_input: frontendInput,
      backend_type: backendType,
      scope: "global", // Required: global, website, or store
      is_required: isRequired,
      is_unique: "0",
      default_frontend_label: frontendLabel,
      is_html_allowed_on_front: false,
      used_for_sort_by: "0",
      is_filterable: isFilterable,
      is_filterable_in_search: isFilterableInSearch,
      is_searchable: isSearchable ? "1" : "0",
      is_visible_in_advanced_search: "1",
      is_comparable: isComparable,
      is_used_for_promo_rules: true,
      is_visible_on_front: isVisibleOnFront ? 1 : 0,
      used_in_product_listing: "0",
      position: attr.sortOrder || attr.sort_order || 0,
      apply_to: [], // Empty array means applies to all product types
      is_user_defined: true // Custom attributes must be marked as user-defined
    };
    
    // Add source_model for select/multiselect attributes
    if (frontendInput === 'select' || frontendInput === 'multiselect') {
      attributeData.source_model = 'Magento\\Eav\\Model\\Entity\\Attribute\\Source\\Table';
    }
    
    // Add options if present
    if (attr.options && attr.options.length > 0) {
      attributeData.options = attr.options.map((opt, index) => ({
        label: opt.label || opt,
        value: opt.value || opt,
        sort_order: index,
        is_default: index === 0
      }));
    } else {
      attributeData.options = [];
    }
    
    return { attribute: attributeData };
  });
}

/**
 * Transform attribute sets to ACCS format
 * Schema: schemas/attribute_sets.json
 */
function transformAttributeSetsToAccsFormat() {
  return [
    {
      attributeSet: {
        attribute_set_name: "Default",
        sort_order: 0,
        entity_type_id: 4
      },
      skeletonId: 4
    },
    {
      attributeSet: {
        attribute_set_name: "Building Materials",
        sort_order: 1,
        entity_type_id: 4
      },
      skeletonId: 4
    }
  ];
}

/**
 * Generate attribute assignments to attribute sets
 * Schema: schemas/attribute_assign_to_set.json
 */
function generateAttributeAssignToSet(attributes) {
  const assignments = [];
  
  // Get all custom attribute codes
  const customAttributeCodes = attributes.map(attr => attr.attribute_code);
  
  // Assign to Building Materials attribute set
  customAttributeCodes.forEach((attrCode, index) => {
    assignments.push({
      attributeSetId: 'Building Materials',
      attributeGroupId: 7, // General group
      attributeCode: attrCode,
      sortOrder: index + 10,
      attribute_set_name: 'Building Materials',
      attribute_group_name: 'Product Details',
      attribute_code: attrCode,
      sort_order: index + 10
    });
  });
  
  return assignments;
}

/**
 * Split array into chunks of specified size
 * @param {Array} array - Array to split
 * @param {number} chunkSize - Size of each chunk
 * @returns {Array} Array of chunks
 */
function splitArrayIntoChunks(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Copy product images to media/catalog/product directory
 * Images are stored in Magento structure: media/catalog/product/{first_char}/{second_char}/filename.{ext}
 * Supports both JPG and PNG formats
 * Gracefully handles missing images directory
 */
function copyProductImages(mediaDir) {
  if (!existsSync(IMAGES_PATH)) {
    // Images directory doesn't exist - this is OK, images are optional
    return 0;
  }
  
  if (!existsSync(IMAGE_MAPPING_PATH)) {
    // Images exist but no mapping file - this is OK
    return 0;
  }

  const mapping = JSON.parse(readFileSync(IMAGE_MAPPING_PATH, 'utf8'));
  let copiedCount = 0;

  for (const imageInfo of mapping.mapping || []) {
    const sourcePath = join(IMAGES_PATH, imageInfo.newFilename);
    if (existsSync(sourcePath)) {
      try {
        // Preserve original filename and extension (supports .jpg, .jpeg, .png)
        const filename = imageInfo.newFilename;
        
        // Create Magento-style path: /l/b/LBR-xxx.{ext}
        const firstChar = filename[0].toLowerCase();
        const secondChar = filename[1].toLowerCase();
        const targetDir = join(mediaDir, firstChar, secondChar);
        ensureDir(targetDir);
        
        const targetPath = join(targetDir, filename);
        const imageBuffer = readFileSync(sourcePath);
        writeFileSync(targetPath, imageBuffer);
        copiedCount++;
      } catch (err) {
        // Skip failed copies
      }
    }
  }

  return copiedCount;
}

/**
 * Generate product images JSON with base64 encoding
 * Matches images to products by normalized product name
 * Gracefully handles missing images
 */
function generateProductImagesJson(products) {
  if (!existsSync(IMAGES_PATH) || !existsSync(IMAGE_MAPPING_PATH)) {
    // Images not configured - this is OK, images are optional
    return [];
  }

  const mapping = JSON.parse(readFileSync(IMAGE_MAPPING_PATH, 'utf8'));
  const imageEntries = [];
  
  // Build a map of normalized product name to product SKU
  const productNameToSku = new Map();
  for (const product of products) {
    const normalizedName = normalizeProductName(product.name);
    productNameToSku.set(normalizedName, product.sku);
  }

  for (const imageInfo of mapping.mapping || []) {
    const imagePath = join(IMAGES_PATH, imageInfo.newFilename);
    if (existsSync(imagePath)) {
      try {
        // Match image to product by normalized name
        const normalizedImageProductName = normalizeProductName(imageInfo.productName);
        const productSku = productNameToSku.get(normalizedImageProductName);
        
        if (!productSku) {
          console.log(`  ⚠ No matching product for image: ${imageInfo.productName}`);
          continue;
        }
        
        const imageBuffer = readFileSync(imagePath);
        const base64Data = imageBuffer.toString('base64');
        
        // Detect image format from file extension
        const filename = imageInfo.newFilename;
        const ext = filename.split('.').pop().toLowerCase();
        let mimeType = 'image/jpeg'; // default
        
        if (ext === 'png') {
          mimeType = 'image/png';
        } else if (ext === 'jpg' || ext === 'jpeg') {
          mimeType = 'image/jpeg';
        }

        imageEntries.push({
          product: {
            sku: productSku,  // Use the matched product SKU, not the image mapping SKU
            media_gallery_entries: [
              {
                media_type: "image",
                label: "",
                position: 1,
                disabled: false,
                types: ["image", "small_image", "thumbnail"],
                content: {
                  base64_encoded_data: base64Data,
                  type: mimeType,
                  name: filename
                }
              }
            ]
          }
        });
      } catch (err) {
        console.log(format.warning(`Could not encode image: ${imageInfo.newFilename} - ${err.message}`));
      }
    }
  }

  return imageEntries;
}

/**
 * Extract product images from generated JSON to media/images/products/
 * This provides a source for frontend image syncing
 * @param {Array} productImages - Array of product image entries (from generateProductImagesJson)
 * @param {string} outputMediaPath - Path to media/images/products/ directory
 * @returns {number} Number of images extracted
 */
function extractProductImagesToMedia(productImages, outputMediaPath) {
  if (productImages.length === 0) {
    return 0;
  }
  
  ensureDir(outputMediaPath);
  let extractedCount = 0;
  
  for (const item of productImages) {
    const sku = item.product.sku;
    const entries = item.product.media_gallery_entries || [];
    
    for (const entry of entries) {
      if (entry.content?.base64_encoded_data) {
        try {
          const buffer = Buffer.from(entry.content.base64_encoded_data, 'base64');
          // Always use .jpg extension for consistency (standardized across all repos)
          const outputFile = join(outputMediaPath, `${sku}.jpg`);
          
          writeFileSync(outputFile, buffer);
          extractedCount++;
        } catch (err) {
          console.log(`  ⚠ Failed to extract image for SKU ${sku}: ${err.message}`);
        }
      }
    }
  }
  
  return extractedCount;
}

/**
 * Main generator function
 */
async function generateDataPack() {
  console.log('');

  // Clean and create output directories
  if (existsSync(OUTPUT_DIR)) {
    rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  ensureDir(DATA_DIR);
  ensureDir(MEDIA_DIR);

  // Generate stores
  updateLine('📦 Generating stores...');
  const stores = generateStores();
  writeJsonFile(join(DATA_DIR, 'accs_stores.json'), stores, `${stores.length} ${pluralize(stores.length, 'store')}`);

  // Generate customer groups
  updateLine('📦 Generating customer groups...');
  const customerGroups = generateCustomerGroups();
  writeJsonFile(join(DATA_DIR, 'accs_customer_groups.json'), customerGroups, `${customerGroups.length} ${pluralize(customerGroups.length, 'group')}`);

  // Generate attribute sets
  updateLine('📦 Generating attribute sets...');
  const attributeSets = transformAttributeSetsToAccsFormat();
  writeJsonFile(join(DATA_DIR, 'accs_attribute_sets.json'), attributeSets, `${attributeSets.length} ${pluralize(attributeSets.length, 'set')}`);


  // Generate attributes and assignments
  updateLine('📦 Generating product attributes...');
  const rawAttributes = generateAttributes();
  const accsAttributes = transformAttributesToAccsFormat(rawAttributes);
  writeFileSync(join(DATA_DIR, 'accs_product_attributes.json'), JSON.stringify(accsAttributes, null, 4), 'utf8');
  const attributeAssignments = generateAttributeAssignToSet(rawAttributes);
  writeFileSync(join(DATA_DIR, 'accs_attribute_assign_to_set.json'), JSON.stringify(attributeAssignments, null, 4), 'utf8');
  updateLine(chalk.green(`✔ Generated ${rawAttributes.length} ${pluralize(rawAttributes.length, 'attribute')} with ${attributeAssignments.length} ${pluralize(attributeAssignments.length, 'assignment')}`));
  finishLine();

  // Generate simple products
  updateLine('📦 Generating simple products...');
  const rawProducts = await generateProducts();
  updateLine(chalk.green(`✔ Generated ${rawProducts.length} simple ${pluralize(rawProducts.length, 'product')}`));
  finishLine();
  
  // Generate configurable products and variants
  updateLine('📦 Generating configurable products...');
  const rawVariants = await generateVariants();
  const configurableCount = rawVariants.filter(p => p.type_id === 'configurable').length;
  const variantCount = rawVariants.filter(p => p.type_id === 'simple').length;
  updateLine(chalk.green(`✔ Generated ${configurableCount} ${pluralize(configurableCount, 'configurable')} with ${variantCount} ${pluralize(variantCount, 'variant')}`));
  finishLine();
  
  // Combine all products
  const allProducts = [...rawProducts, ...rawVariants];
  
  // Check for duplicate SKUs
  const skuCounts = {};
  const duplicates = [];
  allProducts.forEach(p => {
    if (skuCounts[p.sku]) {
      skuCounts[p.sku]++;
      if (skuCounts[p.sku] === 2) {
        duplicates.push(p.sku);
      }
    } else {
      skuCounts[p.sku] = 1;
    }
  });
  
  if (duplicates.length > 0) {
    throw new Error(`Duplicate SKUs detected: ${duplicates.join(', ')}`);
  }
  
  // Transform and write products
  const accsProducts = transformProductsToAccsFormat(allProducts);
  writeFileSync(join(DATA_DIR, 'accs_products.json'), JSON.stringify(accsProducts, null, 4), 'utf8');
  
  // Calculate totals for summary
  const simpleCount = rawProducts.length;
  const totalSkus = simpleCount + configurableCount;
  const totalRecords = allProducts.length;

  // Generate product images
  updateLine('📦 Generating product images...');
  const productImages = generateProductImagesJson(allProducts);
  if (productImages.length > 0) {
    // Split images into multiple files for better IDE performance
    const IMAGES_PER_FILE = 5;
    const imageChunks = splitArrayIntoChunks(productImages, IMAGES_PER_FILE);
    
    imageChunks.forEach((chunk, index) => {
      const fileNumber = index + 1;
      const jsonContent = JSON.stringify(chunk, null, 4);
      writeFileSync(join(DATA_DIR, `accs_product_images_${fileNumber}.json`), jsonContent, 'utf8');
    });
  }
  
  // Copy image files to media/catalog/product directory (for Commerce import)
  const copiedImages = copyProductImages(MEDIA_DIR);
  
  // Extract images to media/images/products/ (for frontend sync)
  const frontendMediaPath = join(PROJECT_CONFIG.paths.media, 'images/products');
  const extractedImages = extractProductImagesToMedia(productImages, frontendMediaPath);
  
  const imageFileCount = Math.ceil(productImages.length / 5);
  updateLine(chalk.green(`✔ Generated ${productImages.length} ${pluralize(productImages.length, 'image')} (${copiedImages} for Commerce, ${extractedImages} for frontend, ${imageFileCount} ${pluralize(imageFileCount, 'file')})`));
  finishLine();

  // Generate customers
  updateLine('📦 Generating demo customers...');
  const rawCustomers = generateCustomersWithDetails();
  const accsCustomers = transformCustomersToAccsFormat(rawCustomers);
  const customerCount = accsCustomers.source?.items?.length || rawCustomers.length;
  updateLine(chalk.green(`✔ Generated ${customerCount} demo ${pluralize(customerCount, 'customer')}`));
  finishLine();
  
  writeFileSync(join(DATA_DIR, 'accs_customers.json'), JSON.stringify(accsCustomers, null, 4), 'utf8');

  // Generate MSI inventory sources
  updateLine('📦 Generating MSI inventory sources...');
  const inventorySources = generateInventorySources({ includeStorePickup: true });
  const accsInventorySources = transformSourcesToAccsFormat(inventorySources);
  const sourceCount = accsInventorySources.sources?.length || inventorySources.length;
  writeJsonFile(join(DATA_DIR, 'accs_inventory_sources.json'), accsInventorySources, `${sourceCount} MSI ${pluralize(sourceCount, 'source')}`, 'sources');
  
  // Generate stock-source links (linking sources to stock_id 2)
  updateLine('📦 Generating stock-source links...');
  const stockSourceLinks = generateStockSourceLinks(inventorySources, 2);
  const linkCount = stockSourceLinks.links?.length || 0;
  writeJsonFile(join(DATA_DIR, 'accs_stock_source_links.json'), stockSourceLinks, `${linkCount} stock ${pluralize(linkCount, 'link')}`, 'links');
  
  // Generate source items (inventory quantities per source per product)
  updateLine('📦 Generating source inventory quantities...');
  const sourceItems = generateSourceItems(allProducts, inventorySources, { minQty: 100, maxQty: 2000 });
  
  // Split source items into chunks for better performance (500 items per file)
  const SOURCE_ITEMS_PER_FILE = 500;
  const sourceItemChunks = splitArrayIntoChunks(sourceItems.sourceItems, SOURCE_ITEMS_PER_FILE);
  
  sourceItemChunks.forEach((chunk, index) => {
    const fileNumber = index + 1;
    const jsonContent = JSON.stringify({ sourceItems: chunk }, null, 4);
    writeFileSync(join(DATA_DIR, `accs_source_items_${fileNumber}.json`), jsonContent, 'utf8');
  });
  
  const itemCount = sourceItems.sourceItems.length;
  updateLine(chalk.green(`✔ Generated ${itemCount} inventory ${pluralize(itemCount, 'item')} (${sourceItemChunks.length} ${pluralize(sourceItemChunks.length, 'file')})`));
  finishLine();

  // Generate B2B companies
  updateLine('📦 Generating B2B companies...');
  const companies = generateCompanies();
  const accsCompanies = transformCompaniesToAccsFormat(companies);
  const companyCount = accsCompanies.companies?.length || companies.length;
  writeJsonFile(join(DATA_DIR, 'accs_companies.json'), accsCompanies, `${companyCount} B2B ${pluralize(companyCount, 'company', 'companies')}`, 'companies');
  
  // Generate company roles (shared across all companies)
  updateLine('📦 Generating B2B company structures...');
  const companyRoles = generateCompanyRoles();
  // Note: In real implementation, roles would be created per company via API
  // For demo, we export a template that can be applied to each company
  writeFileSync(join(DATA_DIR, 'accs_company_roles_template.json'), JSON.stringify({ roles: companyRoles }, null, 4), 'utf8');
  
  // Generate company teams (template for each company)
  const companyTeams = {};
  companies.forEach(company => {
    const teams = generateTeamsForCompany(company.company_name);
    if (teams.length > 0) {
      companyTeams[company.company_name] = teams;
    }
  });
  writeFileSync(join(DATA_DIR, 'accs_company_teams_template.json'), JSON.stringify({ teams: companyTeams }, null, 4), 'utf8');

  // Generate B2B configuration instructions
  // NOTE: B2B features must be enabled manually via Admin UI before importing companies
  const b2bConfigRef = generateB2BConfigReference();
  writeFileSync(join(DATA_DIR, 'b2b_config_reference.json'), JSON.stringify(b2bConfigRef, null, 4), 'utf8');
  
  const adminInstructions = generateB2BAdminInstructions();
  writeFileSync(join(DATA_DIR, 'b2b_enable_instructions.json'), JSON.stringify(adminInstructions, null, 4), 'utf8');
  
  updateLine(chalk.green(`✔ Generated B2B structures with ${companyRoles.length} ${pluralize(companyRoles.length, 'role')} (setup instructions included)`));
  finishLine();

  // Done
  console.log('');
  console.log(chalk.green(`✔ Commerce datapack generated successfully`));
  console.log('');
}

// Run generator
generateDataPack().catch(error => {
  console.error(chalk.red(`✖ Generation failed: ${error.message}`));
  console.error(error.stack);
  process.exit(1);
});
