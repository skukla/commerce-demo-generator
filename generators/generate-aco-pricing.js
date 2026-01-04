/**
 * ACO Pricing Generator
 * 
 * Generates price books and prices for ACO from Commerce product data.
 * Reads pricing configuration from data repository definitions.
 * 
 * ACO Price Schema:
 * {
 *   sku: string,
 *   priceBookId: string,
 *   regular: number,  // Base price
 *   tierPrices?: [{ qty: number, price: number }]  // Optional quantity-based tiers
 * }
 * 
 * Flow:
 * 1. Load Commerce products (for base prices)
 * 2. Load ACO pricing configuration (price books, rules)
 * 3. Generate price books
 * 4. Generate prices by applying rules with tier pricing
 */

import { PROJECT_CONFIG } from '../config/project-config.js';

/**
 * Round price to 2 decimal places
 */
function roundPrice(price) {
  return Math.round(price * 100) / 100;
}

/**
 * Find the applicable pricing rule for a product
 * Rules are evaluated in order; first match wins
 */
function findApplicableRule(product, rules) {
  const attributePrefix = PROJECT_CONFIG.project.attributePrefix;
  
  for (const rule of rules) {
    let matches = true;
    
    // Check category pattern
    if (rule.categoryPattern) {
      const pattern = new RegExp(rule.categoryPattern);
      if (!product.categories || !pattern.test(product.categories)) {
        matches = false;
      }
    }
    
    // Check attribute matching
    if (matches && rule.attributeMatch) {
      for (const [attr, expectedValue] of Object.entries(rule.attributeMatch)) {
        // Support both prefixed and unprefixed attribute names
        const actualValue = product[attr] || product[`${attributePrefix}${attr}`];
        if (actualValue !== expectedValue) {
          matches = false;
          break;
        }
      }
    }
    
    if (matches) {
      return rule;
    }
  }
  
  return null;
}

/**
 * Generate price books from configuration
 */
export function generatePriceBooks() {
  const priceBookDefs = PROJECT_CONFIG.acoPriceBooks;
  
  return priceBookDefs.map(pb => ({
    priceBookId: pb.id,
    name: pb.name,
    currency: 'USD'
  }));
}

/**
 * Generate prices by applying price book multipliers and tier rules
 * 
 * Generates ACO-compliant price entries with tier pricing grouped under each SKU+priceBook.
 * For configurable products, calculates price range from variants and adds price for min value.
 * 
 * @param {Array} commerceProducts - Products from Commerce datapack
 * @returns {Array} Price entries for ACO in format: { sku, priceBookId, regular, tierPrices? }
 */
export function generatePrices(commerceProducts) {
  const priceBooks = PROJECT_CONFIG.acoPriceBooks;
  const pricingConfig = PROJECT_CONFIG.acoPricingRules;
  const prices = [];
  
  // Build map of configurable parents to their variants for price range calculation
  const configurableVariants = new Map();
  for (const product of commerceProducts) {
    if (product.parent_sku) {
      if (!configurableVariants.has(product.parent_sku)) {
        configurableVariants.set(product.parent_sku, []);
      }
      configurableVariants.get(product.parent_sku).push(product);
    }
  }
  
  for (const product of commerceProducts) {
    // Handle configurable products - calculate price from variants
    if (product.product_type === 'configurable' || (product.sku && product.sku.endsWith('-CONFIG'))) {
      const variants = configurableVariants.get(product.sku);
      if (variants && variants.length > 0) {
        // Calculate min/max prices from variants
        const variantPrices = variants
          .map(v => parseFloat(v.price))
          .filter(p => !isNaN(p) && p > 0);
        
        if (variantPrices.length > 0) {
          const minPrice = Math.min(...variantPrices);
          
          // Generate price entries using minimum variant price
          // ACO will calculate priceRange automatically from variant prices
          for (const priceBook of priceBooks) {
            const pbBasePrice = minPrice * priceBook.baseMultiplier;
            
            prices.push({
              sku: product.sku,
              priceBookId: priceBook.id,
              regular: roundPrice(pbBasePrice)
            });
          }
        }
      }
      continue; // Skip to next product
    }
    
    // Skip products without base prices (simple products only)
    if (!product.price || product.price === '0' || product.price === 0) {
      continue;
    }
    
    const basePrice = parseFloat(product.price);
    
    // Find applicable pricing rule
    const applicableRule = pricingConfig.tierPricingEnabled 
      ? findApplicableRule(product, pricingConfig.rules)
      : null;
    
    // Generate ONE price entry per SKU+priceBook combination
    for (const priceBook of priceBooks) {
      // Calculate price book base price (with multiplier)
      const pbBasePrice = basePrice * priceBook.baseMultiplier;
      
      // Create base price entry
      const priceEntry = {
        sku: product.sku,
        priceBookId: priceBook.id,
        regular: roundPrice(pbBasePrice)
      };
      
      // Add tier pricing if applicable
      if (applicableRule && applicableRule.tiers && applicableRule.tiers.length > 0) {
        const tierPrices = [];
        
        for (const tier of applicableRule.tiers) {
          // Skip the first tier if minQty is 1 (that's the regular price)
          if (tier.minQty > 1) {
            const discount = tier.discountPercent / 100;
            const tierPrice = pbBasePrice * (1 - discount);
            
            tierPrices.push({
              qty: tier.minQty,
              price: roundPrice(tierPrice)
            });
          }
        }
        
        // Only add tierPrices if we have any quantity-based tiers
        if (tierPrices.length > 0) {
          priceEntry.tierPrices = tierPrices;
        }
      }
      
      prices.push(priceEntry);
    }
  }
  
  return prices;
}

/**
 * Generate statistics for pricing generation
 */
export function getPricingStats(commerceProducts, prices) {
  const priceBooks = PROJECT_CONFIG.acoPriceBooks;
  const pricingConfig = PROJECT_CONFIG.acoPricingRules;
  
  // Count products with tier pricing
  let tieredPriceEntries = prices.filter(p => p.tierPrices && p.tierPrices.length > 0).length;
  
  // Count unique products with prices
  const productsWithPrices = commerceProducts.filter(p => p.price && p.price !== '0').length;
  
  // Count total tier price definitions across all price entries
  let totalTierDefinitions = 0;
  for (const price of prices) {
    if (price.tierPrices) {
      totalTierDefinitions += price.tierPrices.length;
    }
  }
  
  return {
    totalProducts: productsWithPrices,
    priceBookCount: priceBooks.length,
    totalPriceEntries: prices.length,
    tieredPriceEntries,
    totalTierDefinitions
  };
}

