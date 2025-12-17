/**
 * Stores JSON Generator
 * Generates accs_stores.json for ACCS Data Importer
 * 
 * Format matches module-data-install stores.csv columns:
 * site_code, site_name, site_order, store_code, store_name, 
 * store_root_category, is_default_store, store_view_code, view_name,
 * is_default_view, view_order, view_is_active, host, theme
 * 
 * @see https://github.com/PMET-public/module-data-install
 */

import { PROJECT_CONFIG } from '../../config/project-config.js';

/**
 * Generate stores configuration in data-install format
 * @returns {Array} Array of store configuration objects (one row per store view)
 */
export function generateStores() {
  const project = PROJECT_CONFIG.project;
  
  // Format matches stores.csv - one row per store view
  return [
    {
      site_code: project.websiteCode,
      site_name: `${project.displayName} Website`,
      site_order: 0,
      store_code: project.storeCode,
      store_name: `${project.displayName} Store`,
      store_root_category: project.rootCategoryName,
      is_default_store: 'Y',
      store_view_code: project.storeViewCode,
      view_name: `${project.displayName} US`,
      is_default_view: 'Y',
      view_order: 0,
      view_is_active: 'Y',
      host: '',
      theme: ''
    }
  ];
}

export default { generateStores };
