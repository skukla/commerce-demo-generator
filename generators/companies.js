/**
 * B2B Companies Generator
 * 
 * Generates Adobe Commerce B2B company structures for demo data.
 * 
 * Based on BuildRight use case:
 * - Regional production builders (Sunset Valley Homes)
 * - General contractors (Johnson Custom Builders)
 * - Remodeling contractors (Chen Kitchen & Bath Remodeling)
 * - Hardware store chains (Pacific Northwest Hardware)
 * 
 * References:
 * - buildright-eds/scripts/company-config.js
 * - buildright-eds/docs/personas/BUILDRIGHT-PERSONAS-AND-FLOWS.md
 * - Adobe Commerce B2B REST API: POST /V1/company/
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PROJECT_CONFIG } from '../../config/project-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SAMPLE_DATA_DIR = join(__dirname, '../../config/sample-data');

/**
 * Default company definitions based on BuildRight personas
 */
const DEFAULT_COMPANIES = [
  {
    company_name: 'Sunset Valley Homes',
    company_email: 'info@sunsetvalleyhomes.example.com',
    legal_name: 'Sunset Valley Homes, LLC',
    vat_tax_id: '12-3456789',
    reseller_id: 'SVH-2024',
    comment: 'Regional production builder - 20-30 homes per year in Desert Ridge subdivision',
    street: ['1500 Desert Ridge Parkway'],
    city: 'Phoenix',
    country_id: 'US',
    region: 'Arizona',
    region_id: 4,
    postcode: '85054',
    telephone: '(602) 555-0150',
    customer_group_id: 2, // Commercial-Tier2
    sales_representative_id: null,
    reject_reason: null,
    rejected_at: null,
    super_user_id: null, // Will be linked to customer after creation
    extension_attributes: {
      // Company type/tier for BuildRight demo
      company_type: 'regional_builder',
      annual_volume: '20-30 homes',
      tier: 'Commercial-Tier2'
    }
  },
  {
    company_name: 'Johnson Custom Builders',
    company_email: 'info@johnsoncustombuilders.example.com',
    legal_name: 'Johnson Custom Builders, Inc.',
    vat_tax_id: '23-4567890',
    reseller_id: 'JCB-2024',
    comment: 'General contractor - 3-5 custom homes per year, $800K-$1.5M each',
    street: ['789 Mountain View Drive'],
    city: 'Denver',
    country_id: 'US',
    region: 'Colorado',
    region_id: 6,
    postcode: '80202',
    telephone: '(303) 555-0200',
    customer_group_id: 3, // Residential-Builder
    sales_representative_id: null,
    reject_reason: null,
    rejected_at: null,
    super_user_id: null,
    extension_attributes: {
      company_type: 'general_contractor',
      annual_volume: '3-5 homes',
      tier: 'Residential-Builder'
    }
  },
  {
    company_name: 'Chen Kitchen & Bath Remodeling',
    company_email: 'info@chenkitchenbath.example.com',
    legal_name: 'Chen Kitchen & Bath Remodeling, LLC',
    vat_tax_id: '34-5678901',
    reseller_id: 'CKB-2024',
    comment: 'Remodeling contractor - 30-40 kitchen/bath remodels per year, $20K-$60K each',
    street: ['456 Trade Center Boulevard'],
    city: 'Charlotte',
    country_id: 'US',
    region: 'North Carolina',
    region_id: 37,
    postcode: '28202',
    telephone: '(704) 555-0300',
    customer_group_id: 3, // Residential-Builder
    sales_representative_id: null,
    reject_reason: null,
    rejected_at: null,
    super_user_id: null,
    extension_attributes: {
      company_type: 'remodeling_contractor',
      annual_volume: '30-40 projects',
      tier: 'Residential-Builder'
    }
  },
  {
    company_name: 'Precision Lumber & Supply',
    company_email: 'info@precisionlumber.example.com',
    legal_name: 'Precision Lumber & Supply, Inc.',
    vat_tax_id: '45-6789012',
    reseller_id: 'PLS-2024',
    comment: 'Regional hardware/lumber chain - 3 locations in Texas',
    street: ['4521 South Congress Avenue'],
    city: 'Austin',
    country_id: 'US',
    region: 'Texas',
    region_id: 57,
    postcode: '78745',
    telephone: '(512) 555-0100',
    customer_group_id: 4, // Retail-Chain-Buyer
    sales_representative_id: null,
    reject_reason: null,
    rejected_at: null,
    super_user_id: null,
    extension_attributes: {
      company_type: 'retail_chain',
      annual_volume: '15 stores',
      tier: 'Retail-Chain-Buyer'
    }
  }
];

/**
 * Default company teams based on BuildRight use case
 * Teams organize company users into logical groups
 */
const DEFAULT_TEAMS_TEMPLATE = {
  'Sunset Valley Homes': [
    {
      name: 'Purchasing Team',
      description: 'Materials purchasing and procurement'
    },
    {
      name: 'Project Management',
      description: 'Project managers and site supervisors'
    }
  ],
  'Johnson Custom Builders': [
    {
      name: 'Management',
      description: 'Company owners and managers'
    }
  ],
  'Chen Kitchen & Bath Remodeling': [
    {
      name: 'Design Team',
      description: 'Designers and client relations'
    },
    {
      name: 'Installation Team',
      description: 'Installation crews and project coordinators'
    }
  ],
  'Precision Lumber & Supply': [
    {
      name: 'Austin Store',
      description: 'Austin location staff'
    },
    {
      name: 'San Antonio Store',
      description: 'San Antonio location staff'
    },
    {
      name: 'Houston Store',
      description: 'Houston location staff'
    }
  ]
};

/**
 * Default company roles based on BuildRight use case
 * Roles define permissions for company users
 */
const DEFAULT_ROLES = [
  {
    role_name: 'Purchasing Manager',
    permissions: [
      { resource_id: 'Magento_Company::index', permission: 'allow' },
      { resource_id: 'Magento_Sales::all', permission: 'allow' },
      { resource_id: 'Magento_Sales::place_order', permission: 'allow' },
      { resource_id: 'Magento_Sales::payment_account', permission: 'allow' },
      { resource_id: 'Magento_Sales::view_orders', permission: 'allow' },
      { resource_id: 'Magento_Sales::view_orders_sub', permission: 'allow' },
      { resource_id: 'Magento_NegotiableQuote::all', permission: 'allow' },
      { resource_id: 'Magento_NegotiableQuote::view_quotes', permission: 'allow' },
      { resource_id: 'Magento_NegotiableQuote::manage', permission: 'allow' },
      { resource_id: 'Magento_NegotiableQuote::checkout', permission: 'allow' },
      { resource_id: 'Magento_NegotiableQuote::view_quotes_sub', permission: 'allow' },
      { resource_id: 'Magento_PurchaseOrder::all', permission: 'allow' },
      { resource_id: 'Magento_PurchaseOrder::view_purchase_orders', permission: 'allow' },
      { resource_id: 'Magento_PurchaseOrder::view_purchase_orders_for_subordinates', permission: 'allow' },
      { resource_id: 'Magento_PurchaseOrder::autoapprove_purchase_order', permission: 'allow' }
    ]
  },
  {
    role_name: 'Project Manager',
    permissions: [
      { resource_id: 'Magento_Company::index', permission: 'allow' },
      { resource_id: 'Magento_Sales::all', permission: 'allow' },
      { resource_id: 'Magento_Sales::place_order', permission: 'allow' },
      { resource_id: 'Magento_Sales::payment_account', permission: 'deny' },
      { resource_id: 'Magento_Sales::view_orders', permission: 'allow' },
      { resource_id: 'Magento_Sales::view_orders_sub', permission: 'deny' },
      { resource_id: 'Magento_NegotiableQuote::all', permission: 'allow' },
      { resource_id: 'Magento_NegotiableQuote::view_quotes', permission: 'allow' },
      { resource_id: 'Magento_NegotiableQuote::manage', permission: 'deny' },
      { resource_id: 'Magento_NegotiableQuote::checkout', permission: 'allow' }
    ]
  },
  {
    role_name: 'Store Manager',
    permissions: [
      { resource_id: 'Magento_Company::index', permission: 'allow' },
      { resource_id: 'Magento_Sales::all', permission: 'allow' },
      { resource_id: 'Magento_Sales::place_order', permission: 'allow' },
      { resource_id: 'Magento_Sales::payment_account', permission: 'allow' },
      { resource_id: 'Magento_Sales::view_orders', permission: 'allow' },
      { resource_id: 'Magento_Sales::view_orders_sub', permission: 'allow' },
      { resource_id: 'Magento_PurchaseOrder::all', permission: 'allow' },
      { resource_id: 'Magento_PurchaseOrder::view_purchase_orders', permission: 'allow' },
      { resource_id: 'Magento_PurchaseOrder::view_purchase_orders_for_subordinates', permission: 'allow' }
    ]
  },
  {
    role_name: 'Buyer',
    permissions: [
      { resource_id: 'Magento_Company::index', permission: 'allow' },
      { resource_id: 'Magento_Sales::all', permission: 'allow' },
      { resource_id: 'Magento_Sales::place_order', permission: 'allow' },
      { resource_id: 'Magento_Sales::payment_account', permission: 'deny' },
      { resource_id: 'Magento_Sales::view_orders', permission: 'allow' },
      { resource_id: 'Magento_Sales::view_orders_sub', permission: 'deny' }
    ]
  }
];

/**
 * Generate B2B companies
 * 
 * @param {Object} options - Generation options
 * @returns {Array} Array of company objects
 */
export function generateCompanies(options = {}) {
  let companies = [...DEFAULT_COMPANIES];
  
  // Check for custom companies from sample data
  const customCompaniesPath = join(SAMPLE_DATA_DIR, 'companies.json');
  if (existsSync(customCompaniesPath)) {
    try {
      const customData = JSON.parse(readFileSync(customCompaniesPath, 'utf8'));
      if (customData.companies && Array.isArray(customData.companies)) {
        companies = customData.companies;
      }
    } catch (err) {
      console.warn(`Warning: Could not load custom companies from ${customCompaniesPath}`);
    }
  }
  
  return companies;
}

/**
 * Generate company teams
 * 
 * @param {string} companyName - Name of the company
 * @returns {Array} Array of team objects for the company
 */
export function generateTeamsForCompany(companyName) {
  return DEFAULT_TEAMS_TEMPLATE[companyName] || [];
}

/**
 * Generate company roles
 * 
 * @returns {Array} Array of role objects
 */
export function generateCompanyRoles() {
  return [...DEFAULT_ROLES];
}

/**
 * Transform companies to ACCS format for import
 * 
 * @param {Array} companies - Array of company objects
 * @returns {Object} ACCS-formatted companies data
 */
export function transformCompaniesToAccsFormat(companies) {
  return {
    companies: companies.map(company => ({
      company: {
        company_name: company.company_name,
        company_email: company.company_email,
        legal_name: company.legal_name || company.company_name,
        vat_tax_id: company.vat_tax_id || '',
        reseller_id: company.reseller_id || '',
        comment: company.comment || '',
        status: company.status || 1, // 1 = Active, 0 = Pending, 2 = Rejected
        street: company.street || [],
        city: company.city || '',
        country_id: company.country_id || 'US',
        region: company.region || '',
        region_id: company.region_id || null,
        postcode: company.postcode || '',
        telephone: company.telephone || '',
        customer_group_id: company.customer_group_id || 1,
        sales_representative_id: company.sales_representative_id || null,
        reject_reason: company.reject_reason || null,
        rejected_at: company.rejected_at || null,
        super_user_id: company.super_user_id || null,
        ...(company.extension_attributes && { extension_attributes: company.extension_attributes })
      }
    }))
  };
}

/**
 * Transform teams to ACCS format
 * 
 * @param {Array} teams - Array of team objects
 * @param {number} companyId - Company ID to associate teams with
 * @returns {Object} ACCS-formatted teams data
 */
export function transformTeamsToAccsFormat(teams, companyId) {
  return {
    teams: teams.map(team => ({
      team: {
        name: team.name,
        description: team.description || '',
        company_id: companyId
      }
    }))
  };
}

/**
 * Transform roles to ACCS format
 * 
 * @param {Array} roles - Array of role objects
 * @param {number} companyId - Company ID to associate roles with
 * @returns {Object} ACCS-formatted roles data
 */
export function transformRolesToAccsFormat(roles, companyId) {
  return {
    roles: roles.map(role => ({
      role: {
        role_name: role.role_name,
        permissions: role.permissions,
        company_id: companyId
      }
    }))
  };
}

/**
 * Link company admin user to company
 * Creates the association between a customer and a company
 * 
 * @param {number} customerId - Customer ID to link as company admin
 * @param {number} companyId - Company ID
 * @param {string} jobTitle - Job title (default: "Company Administrator")
 * @param {string} status - User status (0=Inactive, 1=Active)
 * @returns {Object} Company user assignment data
 */
export function createCompanyAdminAssignment(customerId, companyId, jobTitle = 'Company Administrator', status = 1) {
  return {
    customer_id: customerId,
    company_id: companyId,
    job_title: jobTitle,
    status: status,
    telephone: ''
  };
}

/**
 * Export for use in generate-commerce.js
 */
export default {
  generateCompanies,
  generateTeamsForCompany,
  generateCompanyRoles,
  transformCompaniesToAccsFormat,
  transformTeamsToAccsFormat,
  transformRolesToAccsFormat,
  createCompanyAdminAssignment
};

