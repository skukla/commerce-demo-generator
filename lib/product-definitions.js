/**
 * Product definitions for Commerce product generation
 * 
 * Loaded from PROJECT_CONFIG which reads from data repository
 * Source: {data-repo}/definitions/products/*.json
 * 
 * To update product catalog, brands, or units:
 * Edit the JSON files in the data repository's definitions/products/ directory
 */

import { PROJECT_CONFIG } from '../config/project-config.js';

// Load brands from PROJECT_CONFIG
export const BRANDS_BY_CATEGORY = PROJECT_CONFIG.brands.categorySpecific;
export const BRANDS = PROJECT_CONFIG.brands.generic;

// Load units of measure from PROJECT_CONFIG
export const UNITS_OF_MEASURE = PROJECT_CONFIG.units;

// Load product catalog from PROJECT_CONFIG
export const PRODUCT_CATEGORIES = PROJECT_CONFIG.productCatalog;
