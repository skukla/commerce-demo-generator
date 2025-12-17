/**
 * B2B Configuration Generator
 * 
 * Generates configuration instructions for enabling B2B features in Adobe Commerce.
 * 
 * IMPORTANT: B2B features MUST be enabled manually via Admin UI before importing companies.
 * Adobe Commerce does not provide APIs for setting configuration values.
 * 
 * Configuration Path: Stores > Configuration > General > B2B Features
 * 
 * Required Settings:
 * - Company accounts
 * - Shared catalogs
 * - B2B quotes
 * - Requisition lists
 * - Quick order functionality
 * 
 * References:
 * - Adobe Commerce B2B Documentation
 * - https://experienceleague.adobe.com/docs/commerce-admin/b2b/enable-basic-features.html
 */

/**
 * B2B Configuration Settings Reference
 * These are the configuration paths and values needed to enable B2B features.
 * 
 * NOTE: These values are for reference only. They must be set manually via Admin UI.
 * 
 * @returns {Object} Configuration settings reference for B2B features
 */
export function generateB2BConfigReference() {
  return {
    note: "These settings must be configured manually via Admin UI at: Stores > Configuration > General > B2B Features",
    required_before: "Company data import",
    config: [
      {
        setting: "Enable Company",
        path: 'btob/website_configuration/company_active',
        required_value: 'Yes',
        description: 'Main setting that enables B2B company accounts'
      },
      {
        setting: "Enable Shared Catalog",
        path: 'btob/website_configuration/sharedcatalog_active',
        required_value: 'Yes',
        description: 'Allows custom pricing configurations per company'
      },
      {
        setting: "Enable B2B Quote",
        path: 'btob/website_configuration/negotiablequote_active',
        required_value: 'Yes',
        description: 'Enables price negotiation between buyers and sellers'
      },
      {
        setting: "Enable Quick Order",
        path: 'btob/website_configuration/quickorder_active',
        required_value: 'Yes',
        description: 'Allows quick ordering by SKU or product name'
      },
      {
        setting: "Enable Requisition List",
        path: 'btob/website_configuration/requisition_list_active',
        required_value: 'Yes',
        description: 'Enables saved order lists for repeat purchasing'
      },
      {
        setting: "Number of Requisition Lists",
        path: 'btob/website_configuration/requisition_list_number',
        required_value: '999',
        description: 'Maximum requisition lists per customer account'
      }
    ]
  };
}

/**
 * Transform B2B config to ACCS format for import
 * ACCS format for system configuration import
 * 
 * @param {Object} config - B2B configuration object
 * @returns {Object} ACCS-formatted configuration data
 */
export function transformB2BConfigToAccsFormat(config) {
  return {
    source: {
      entity: "core_config_data",
      behavior: "append",
      validation_strategy: "validation-stop-on-errors",
      allowed_error_count: 1,
      items: config.config.map(item => ({
        path: item.path,
        value: item.value,
        scope: item.scope,
        scope_id: item.scope_id
      }))
    }
  };
}

/**
 * NOTE: Adobe Commerce does not provide a REST API endpoint for setting
 * arbitrary configuration values. Configuration can only be set via:
 * 1. CLI (bin/magento config:set)
 * 2. Admin UI (Stores > Configuration)
 * 3. Direct database manipulation
 * 4. ACCS datapack import (accs_b2b_config.json)
 */

/**
 * Generate SQL statements for direct database configuration
 * Use only as last resort when no other options available
 * 
 * @param {Object} config - B2B configuration object
 * @returns {Array} Array of SQL INSERT/UPDATE statements
 */
export function generateB2BConfigSQL(config) {
  return config.config.map(item => {
    return `INSERT INTO core_config_data (scope, scope_id, path, value) 
VALUES ('${item.scope}', ${item.scope_id}, '${item.path}', '${item.value}')
ON DUPLICATE KEY UPDATE value = '${item.value}';`;
  });
}

/**
 * Generate B2B module enablement commands
 * These are the CLI commands needed to enable B2B modules
 * 
 * @returns {Array} Array of CLI commands
 */
export function generateB2BModuleCommands() {
  return [
    'bin/magento module:enable Magento_B2b',
    'bin/magento module:enable Magento_Company',
    'bin/magento module:enable Magento_CompanyCredit',
    'bin/magento module:enable Magento_CompanyPayment',
    'bin/magento module:enable Magento_NegotiableQuote',
    'bin/magento module:enable Magento_QuickOrder',
    'bin/magento module:enable Magento_RequisitionList',
    'bin/magento module:enable Magento_SharedCatalog',
    'bin/magento setup:upgrade',
    'bin/magento setup:di:compile',
    'bin/magento cache:flush'
  ];
}

/**
 * Generate step-by-step instructions for enabling B2B features via Admin UI
 * 
 * @returns {Object} Structured instructions for manual configuration
 */
export function generateB2BAdminInstructions() {
  return {
    title: "Enable B2B Features - Manual Configuration Required",
    prerequisite: "Must be completed BEFORE importing company data",
    admin_path: "Stores > Configuration > General > B2B Features",
    documentation: "https://experienceleague.adobe.com/docs/commerce-admin/b2b/enable-basic-features.html",
    
    steps: [
      {
        step: 1,
        action: "Login to Adobe Commerce Admin",
        url: "/admin"
      },
      {
        step: 2,
        action: "Navigate to Stores > Configuration",
        description: "Access the main configuration panel"
      },
      {
        step: 3,
        action: "Go to General > B2B Features",
        description: "Find B2B Features in the left navigation under General"
      },
      {
        step: 4,
        setting: "Enable Company",
        value: "Yes",
        required: true,
        description: "Main setting - enables B2B company accounts. This automatically enables Shared Catalog."
      },
      {
        step: 5,
        setting: "Enable Shared Catalog",
        value: "Yes",
        required: true,
        description: "Allows custom pricing per company (enabled automatically with Enable Company)"
      },
      {
        step: 6,
        setting: "Enable B2B Quote",
        value: "Yes",
        required: true,
        description: "Enables negotiable quotes for price negotiation"
      },
      {
        step: 7,
        setting: "Enable Quick Order",
        value: "Yes",
        recommended: true,
        description: "Allows quick ordering by SKU"
      },
      {
        step: 8,
        setting: "Enable Requisition List",
        value: "Yes",
        recommended: true,
        description: "Enables saved order lists for repeat purchasing"
      },
      {
        step: 9,
        setting: "Number of Requisition Lists",
        value: "999",
        recommended: true,
        description: "Maximum requisition lists per customer"
      },
      {
        step: 10,
        action: "Save Configuration",
        button: "Save Config",
        description: "Click the 'Save Config' button in the top right"
      },
      {
        step: 11,
        action: "Flush Cache",
        path: "System > Cache Management",
        button: "Flush Cache Storage",
        description: "Clear cache for changes to take effect"
      }
    ],
    
    verification: {
      description: "After configuration, verify B2B features are enabled:",
      checks: [
        "Companies menu should appear under Customers in admin sidebar",
        "Shared Catalogs menu should appear under Catalog",
        "Quotes menu should appear under Sales"
      ]
    },
    
    notes: [
      "B2B modules must be installed and enabled (typically pre-configured in Adobe Commerce B2B)",
      "These settings enable the features globally for all websites/stores",
      "Company-specific settings can be configured after companies are created"
    ]
  };
}

/**
 * Export for use in generate-commerce.js
 */
export default {
  generateB2BConfigReference,
  generateB2BAdminInstructions
};

