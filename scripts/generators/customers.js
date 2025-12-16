/**
 * Customers JSON Generator
 * Generates customers.json for module-data-install
 */

import { PROJECT_CONFIG } from '../../config/project-config.js';

const DEMO_CUSTOMERS = PROJECT_CONFIG.demoCustomers;

/**
 * Generate customers in Data Installer JSON format
 * @returns {Array} Array of customer objects
 */
export function generateCustomers() {
  return DEMO_CUSTOMERS.map(customer => {
    const customerData = {
      email: customer.email,
      firstname: customer.firstname,
      lastname: customer.lastname,
      group_code: customer.groupCode,
      website_code: 'base',
      store_view_code: 'default',
      password: customer.password,
      
      // Billing address
      billing_firstname: customer.firstname,
      billing_lastname: customer.lastname,
      billing_street: '123 Construction Way',
      billing_city: 'Phoenix',
      billing_region: 'Arizona',
      billing_postcode: '85001',
      billing_country_id: 'US',
      billing_telephone: '555-0100',
      
      // Shipping address (same as billing)
      shipping_firstname: customer.firstname,
      shipping_lastname: customer.lastname,
      shipping_street: '123 Construction Way',
      shipping_city: 'Phoenix',
      shipping_region: 'Arizona',
      shipping_postcode: '85001',
      shipping_country_id: 'US',
      shipping_telephone: '555-0100'
    };
    
    // Add company if present
    if (customer.company) {
      customerData.billing_company = customer.company;
      customerData.shipping_company = customer.company;
    }
    
    return customerData;
  });
}

/**
 * Generate customers with persona-specific addresses
 * @returns {Array} Array of customer objects with realistic data
 */
export function generateCustomersWithDetails() {
  const customerDetails = {
    sarah: {
      street: '456 Builder Boulevard',
      city: 'Phoenix',
      region: 'Arizona',
      postcode: '85004',
      telephone: '602-555-0101'
    },
    marcus: {
      street: '789 Contractor Lane',
      city: 'Scottsdale',
      region: 'Arizona',
      postcode: '85251',
      telephone: '480-555-0102'
    },
    lisa: {
      street: '321 Design Center Drive',
      city: 'Tempe',
      region: 'Arizona',
      postcode: '85281',
      telephone: '480-555-0103'
    },
    david: {
      street: '555 Homeowner Street',
      city: 'Mesa',
      region: 'Arizona',
      postcode: '85201',
      telephone: '480-555-0104'
    },
    kevin: {
      street: '999 Wholesale Way',
      city: 'Gilbert',
      region: 'Arizona',
      postcode: '85233',
      telephone: '480-555-0105'
    }
  };
  
  return DEMO_CUSTOMERS.map(customer => {
    const details = customerDetails[customer.firstname.toLowerCase()] || customerDetails.david;
    
    const customerData = {
      email: customer.email,
      firstname: customer.firstname,
      lastname: customer.lastname,
      group_code: customer.groupCode,
      website_code: 'base',
      store_view_code: 'default',
      password: customer.password,
      
      // Billing address
      billing_firstname: customer.firstname,
      billing_lastname: customer.lastname,
      billing_street: details.street,
      billing_city: details.city,
      billing_region: details.region,
      billing_postcode: details.postcode,
      billing_country_id: 'US',
      billing_telephone: details.telephone,
      
      // Shipping address
      shipping_firstname: customer.firstname,
      shipping_lastname: customer.lastname,
      shipping_street: details.street,
      shipping_city: details.city,
      shipping_region: details.region,
      shipping_postcode: details.postcode,
      shipping_country_id: 'US',
      shipping_telephone: details.telephone
    };
    
    if (customer.company) {
      customerData.billing_company = customer.company;
      customerData.shipping_company = customer.company;
    }
    
    return customerData;
  });
}

export default { generateCustomers, generateCustomersWithDetails };

