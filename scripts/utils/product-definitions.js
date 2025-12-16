/**
 * Product definitions for BuildRight ACO product generation
 * 
 * Loaded from JSON configuration files
 * Source: data/products/*.json
 * 
 * To update product catalog, brands, or units:
 * Edit the JSON files in data/products/
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load brands (category-specific + generic)
const brandsData = JSON.parse(
  readFileSync(join(__dirname, '../../data/products/brands.json'), 'utf-8')
);

export const BRANDS_BY_CATEGORY = brandsData.categorySpecific;
export const BRANDS = brandsData.generic;

// Load units of measure
export const UNITS_OF_MEASURE = JSON.parse(
  readFileSync(join(__dirname, '../../data/products/units.json'), 'utf-8')
);

// Load product catalog
export const PRODUCT_CATEGORIES = JSON.parse(
  readFileSync(join(__dirname, '../../data/products/catalog.json'), 'utf-8')
);
