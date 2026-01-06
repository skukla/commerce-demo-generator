/**
 * Template-Based Description Generator
 * 
 * Generates product descriptions using configurable templates.
 * Templates are loaded from config/description-templates.json.
 * 
 * ARCHITECTURE:
 * - Templates use {{attribute}} for value substitution
 * - Templates use {{#attr}}...{{/attr}} for conditional blocks
 * - Values are automatically formatted for natural prose (lowercase, & → and)
 * - No hardcoded category logic - all customization is in templates
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== TEMPLATE LOADING ====================

let templatesCache = null;

/**
 * Load description templates from config file.
 * Templates are cached after first load.
 */
function loadTemplates() {
  if (templatesCache) return templatesCache;
  
  const templatePath = path.join(__dirname, '..', 'config', 'description-templates.json');
  
  try {
    const content = fs.readFileSync(templatePath, 'utf8');
    templatesCache = JSON.parse(content);
    return templatesCache;
  } catch (error) {
    console.warn(`Warning: Could not load description templates: ${error.message}`);
    // Return minimal default template
    return {
      default: {
        description: '{{brand}} {{name}} delivers professional-grade performance.',
        short: '{{name}}. Professional quality.'
      }
    };
  }
}

// ==================== VALUE FORMATTING ====================

/**
 * Format a value for natural mid-sentence use:
 * - Lowercase for proper grammar
 * - Replace "&" with "and" for better prose
 * - Replace underscores with spaces
 * 
 * "Foundation & Framing" → "foundation and framing"
 * "Builder_Grade" → "builder grade"
 */
function formatValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  
  return String(value)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s*&\s*/g, ' and ')
    .trim();
}

/**
 * Format a value but preserve case for names/brands (sentence case).
 * Used for brand names and product names that should remain capitalized.
 */
function formatName(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\s*&\s*/g, ' and ')
    .trim();
}

// ==================== ATTRIBUTE ACCESS ====================

/**
 * Get attribute value from product, checking common naming patterns.
 * Supports both prefixed (br_brand) and unprefixed (brand) attribute names.
 */
function getAttribute(product, attributeName) {
  if (!product) return null;
  
  // Normalize attribute name (remove br_ prefix if present for lookup)
  const normalizedName = attributeName.replace(/^br_/, '');
  
  // Check prefixed version first (br_attributeName)
  const prefixed = `br_${normalizedName}`;
  if (product[prefixed] !== undefined && product[prefixed] !== null) {
    return product[prefixed];
  }
  
  // Check unprefixed version
  if (product[normalizedName] !== undefined && product[normalizedName] !== null) {
    return product[normalizedName];
  }
  
  // Check original name (for cases like 'name', 'sku')
  if (product[attributeName] !== undefined && product[attributeName] !== null) {
    return product[attributeName];
  }
  
  return null;
}

// ==================== TEMPLATE RENDERING ====================

/**
 * Render a template string with product data.
 * 
 * Supports:
 * - {{attribute}} - Simple value substitution
 * - {{#attribute}}content{{/attribute}} - Conditional block (renders if attribute exists)
 * - Special attributes: brand, name, quality_description
 */
function renderTemplate(templateStr, product, templateDef) {
  if (!templateStr) return '';
  
  let result = templateStr;
  
  // Build context with all available values
  const context = buildContext(product, templateDef);
  
  // Process conditional blocks first: {{#attr}}...{{/attr}}
  result = processConditionals(result, context);
  
  // Process simple substitutions: {{attr}}
  result = processSubstitutions(result, context);
  
  // Clean up whitespace
  result = result
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .replace(/\s+\./g, '.') // Remove space before periods
    .replace(/\.\s*\./g, '.') // Remove double periods
    .trim();
  
  return result;
}

/**
 * Build a context object with all available values for template rendering.
 */
function buildContext(product, templateDef) {
  const context = {};
  
  // Add all product attributes (both raw and formatted)
  if (product) {
    for (const [key, value] of Object.entries(product)) {
      if (value !== null && value !== undefined) {
        // Store raw value
        context[key] = value;
        
        // Also store without br_ prefix for easier template access
        if (key.startsWith('br_')) {
          context[key.substring(3)] = value;
        }
      }
    }
  }
  
  // Add template name if available
  if (templateDef?.name) {
    context.name = templateDef.name;
  }
  
  return context;
}

/**
 * Process conditional blocks: {{#attr}}content{{/attr}}
 * Content is included only if attribute exists and is truthy.
 */
function processConditionals(template, context) {
  // Match {{#attr}}...{{/attr}} patterns
  const conditionalRegex = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  
  return template.replace(conditionalRegex, (match, attrName, content) => {
    const value = context[attrName];
    
    // Include content if value exists and is truthy
    if (value !== null && value !== undefined && value !== '' && value !== false) {
      // Process any nested substitutions in the content
      return processSubstitutions(content, context);
    }
    
    return ''; // Remove the entire block if condition not met
  });
}

/**
 * Process simple substitutions: {{attr}}
 */
function processSubstitutions(template, context) {
  const substitutionRegex = /\{\{(\w+)\}\}/g;
  
  // Attributes that should preserve their original formatting (proper nouns, etc.)
  const preserveFormatting = new Set(['brand', 'name']);
  
  return template.replace(substitutionRegex, (match, attrName) => {
    const value = context[attrName];
    
    if (value === null || value === undefined) {
      return ''; // Remove placeholder if no value
    }
    
    // Preserve formatting for names, brands, and pre-formatted descriptions
    if (preserveFormatting.has(attrName)) {
      return formatName(value);
    }
    
    // Use formatValue for other attributes (lowercase for prose)
    return formatValue(value);
  });
}

// ==================== PUBLIC API ====================

/**
 * Generate full product description using templates.
 * 
 * @param {Object} product - Product data with attributes
 * @param {Object} template - Product template (contains name, etc.)
 * @param {string} category - Category key (e.g., "structural_materials")
 * @param {string} subcategory - Subcategory key (e.g., "lumber")
 * @returns {string} Generated description
 */
export function generateProductDescription(product, template, category, subcategory) {
  const templates = loadTemplates();
  
  // Find best matching template: subcategory → category → default
  const templateDef = templates[subcategory] || templates[category] || templates.default;
  
  if (!templateDef?.description) {
    return renderTemplate(templates.default.description, product, template);
  }
  
  return renderTemplate(templateDef.description, product, template);
}

/**
 * Generate short product description using templates.
 * 
 * @param {Object} product - Product data with attributes
 * @param {Object} template - Product template (contains name, etc.)
 * @param {string} category - Category key
 * @param {string} subcategory - Subcategory key
 * @returns {string} Generated short description
 */
export function generateShortDescription(product, template, category, subcategory) {
  const templates = loadTemplates();
  
  // Find best matching template: subcategory → category → default
  const templateDef = templates[subcategory] || templates[category] || templates.default;
  
  if (!templateDef?.short) {
    return renderTemplate(templates.default.short, product, template);
  }
  
  return renderTemplate(templateDef.short, product, template);
}

/**
 * Clear the templates cache (useful for testing or hot-reloading).
 */
export function clearTemplateCache() {
  templatesCache = null;
}

/**
 * Get all available template categories.
 * Useful for validation and documentation.
 */
export function getAvailableCategories() {
  const templates = loadTemplates();
  return Object.keys(templates).filter(key => key !== '_meta' && key !== 'default');
}
