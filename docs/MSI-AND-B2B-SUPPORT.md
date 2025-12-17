# MSI Sources and B2B Companies Support

This document describes the newly added support for Adobe Commerce Multi-Source Inventory (MSI) sources and B2B Companies in the commerce demo generator.

## Overview

The generator now creates demo data for:

1. **MSI Inventory Sources** - Warehouses, distribution centers, and retail store pickup locations
2. **Stock-Source Links** - Associations between sources and stocks with priority ordering
3. **Source Items** - Inventory quantities per product per source
4. **B2B Companies** - Company profiles with addresses and metadata
5. **Company Teams** - Organizational teams within companies
6. **Company Roles** - Permission-based roles for company users

## Use Case: BuildRight Solutions

The implementation is based on the BuildRight Solutions B2B building materials distribution use case from the `buildright-eds` repository. This use case demonstrates:

- **Regional Distribution Strategy**: 3 warehouse locations (West, Central, East)
- **Multi-Location Fulfillment**: Priority-based inventory sourcing
- **In-Store Pickup**: Retail store locations with pickup capabilities
- **B2B Customer Segments**: 
  - Regional production builders (Sunset Valley Homes)
  - General contractors (Johnson Custom Builders)
  - Remodeling contractors (Chen Kitchen & Bath Remodeling)
  - Hardware store chains (Precision Lumber & Supply)

## Generated Files

### MSI Files

The generator creates the following MSI-related files in `output/commerce/data/accs/`:

1. **`accs_inventory_sources.json`**
   - Defines warehouse and store locations
   - Includes contact information, addresses, coordinates
   - Supports in-store pickup extension attributes

2. **`accs_stock_source_links.json`**
   - Links inventory sources to stocks
   - Defines priority order for fulfillment
   - Associates sources with custom stock (stock_id: 2)

3. **`accs_source_items_*.json`** (multiple files)
   - Assigns inventory quantities to each product at each source
   - Split into chunks of 500 items per file for performance
   - Randomized quantities between configurable min/max values

### B2B Files

The generator creates the following B2B-related files:

1. **`accs_companies.json`**
   - Company profiles with legal information
   - Addresses, contact details, tax IDs
   - Customer group assignments
   - Extension attributes for BuildRight-specific metadata

2. **`accs_company_roles_template.json`**
   - Pre-configured role definitions
   - Permission sets for common B2B roles:
     - Purchasing Manager
     - Project Manager
     - Store Manager
     - Buyer

3. **`accs_company_teams_template.json`**
   - Team structures per company
   - Organizational hierarchies
   - Department groupings

## Configuration

### Default Configuration

The generator includes default configurations based on the BuildRight use case. These are defined in:

- `scripts/generators/inventory-sources.js` - Default warehouses and store locations
- `scripts/generators/companies.js` - Default company profiles and structures

### Custom Configuration

You can override defaults by creating custom configuration files:

#### Custom Inventory Sources

Create `config/sample-data/inventory-sources.json`:

```json
{
  "sources": [
    {
      "source_code": "warehouse_west",
      "name": "West Coast Distribution Center",
      "enabled": true,
      "description": "Primary distribution center for western region",
      "contact_name": "Sarah Martinez",
      "email": "sarah@example.com",
      "phone": "(602) 555-0100",
      "country_id": "US",
      "region_id": 4,
      "region": "Arizona",
      "city": "Phoenix",
      "street": "2450 West Buckeye Road",
      "postcode": "85009",
      "latitude": 33.435463,
      "longitude": -112.109985,
      "use_default_carrier_config": true
    }
  ]
}
```

#### Custom B2B Companies

Create `config/sample-data/companies.json`:

```json
{
  "companies": [
    {
      "company_name": "Acme Construction",
      "company_email": "info@acmeconstruction.example.com",
      "legal_name": "Acme Construction, LLC",
      "vat_tax_id": "12-3456789",
      "reseller_id": "ACME-2024",
      "comment": "General contractor specializing in commercial projects",
      "street": ["123 Main Street"],
      "city": "New York",
      "country_id": "US",
      "region": "New York",
      "region_id": 43,
      "postcode": "10001",
      "telephone": "(212) 555-0100",
      "customer_group_id": 2
    }
  ]
}
```

## Data Schema Reference

### MSI Inventory Source

Based on Adobe Commerce REST API: `POST /V1/inventory/sources`

**Required Fields:**
- `source_code` (string) - Unique identifier, cannot be changed after creation
- `name` (string) - Display name
- `country_id` (string) - ISO country code (e.g., "US")
- `postcode` (string) - Postal/ZIP code

**Optional Fields:**
- `enabled` (boolean) - Whether source is active (default: true)
- `description` (string) - Internal description
- `contact_name` (string) - Contact person name
- `email` (string) - Contact email
- `phone` (string) - Contact phone number
- `fax` (string) - Contact fax number
- `region_id` (integer) - Region/state ID
- `region` (string) - Region/state name
- `city` (string) - City name
- `street` (string) - Street address
- `latitude` (number) - GPS latitude
- `longitude` (number) - GPS longitude
- `use_default_carrier_config` (boolean) - Use default shipping config

**Extension Attributes (for in-store pickup):**
- `is_pickup_location_active` (boolean) - Enable as pickup location
- `frontend_name` (string) - Customer-facing name
- `frontend_description` (string) - Customer-facing description

### Stock-Source Link

**Fields:**
- `source_code` (string) - Source identifier
- `stock_id` (integer) - Stock ID (default stock is 1, custom stocks start at 2)
- `priority` (integer) - Fulfillment priority (lower number = higher priority)

### Source Item

**Fields:**
- `sku` (string) - Product SKU
- `source_code` (string) - Source identifier
- `quantity` (number) - Inventory quantity
- `status` (integer) - Stock status (0 = Out of Stock, 1 = In Stock)

### B2B Company

Based on Adobe Commerce B2B REST API: `POST /V1/company/`

**Required Fields:**
- `company_name` (string) - Company display name
- `company_email` (string) - Company email address
- `country_id` (string) - ISO country code

**Optional Fields:**
- `legal_name` (string) - Legal business name
- `vat_tax_id` (string) - VAT/Tax ID
- `reseller_id` (string) - Reseller identifier
- `comment` (string) - Internal notes
- `status` (integer) - Company status (0=Pending, 1=Active, 2=Rejected)
- `street` (array) - Street address lines
- `city` (string) - City
- `region` (string) - State/region name
- `region_id` (integer) - State/region ID
- `postcode` (string) - Postal/ZIP code
- `telephone` (string) - Phone number
- `customer_group_id` (integer) - Customer group for pricing
- `sales_representative_id` (integer) - Assigned sales rep
- `super_user_id` (integer) - Company admin customer ID
- `extension_attributes` (object) - Custom attributes

### Company Team

**Fields:**
- `name` (string) - Team name
- `description` (string) - Team description
- `company_id` (integer) - Parent company ID

### Company Role

**Fields:**
- `role_name` (string) - Role name
- `permissions` (array) - Array of permission objects
  - `resource_id` (string) - Resource identifier (e.g., "Magento_Sales::all")
  - `permission` (string) - Permission level ("allow" or "deny")
- `company_id` (integer) - Parent company ID

## Generator Options

### Inventory Source Options

```javascript
generateInventorySources({ 
  includeStorePickup: true // Include retail store pickup locations
})
```

### Source Item Options

```javascript
generateSourceItems(products, sources, {
  minQty: 100,  // Minimum quantity per source
  maxQty: 2000  // Maximum quantity per source
})
```

## Usage

### Running the Generator

```bash
npm run generate:commerce
```

This will automatically generate all MSI and B2B data along with products, customers, and other entities.

### Output Structure

```
output/commerce/
├── data/accs/
│   ├── accs_inventory_sources.json
│   ├── accs_stock_source_links.json
│   ├── accs_source_items_1.json
│   ├── accs_source_items_2.json
│   ├── accs_source_items_3.json
│   ├── accs_companies.json
│   ├── accs_company_roles_template.json
│   ├── accs_company_teams_template.json
│   └── ... (other ACCS files)
└── media/catalog/product/
    └── ... (product images)
```

## Import to Adobe Commerce

### MSI Sources Import

1. **Create Inventory Sources:**
   ```bash
   # Via REST API
   POST /rest/V1/inventory/sources
   ```

2. **Link Sources to Stock:**
   ```bash
   POST /rest/V1/inventory/stock-source-links
   ```

3. **Assign Inventory to Products:**
   ```bash
   POST /rest/V1/inventory/source-items
   ```

### B2B Companies Import

1. **Create Companies:**
   ```bash
   POST /rest/V1/company/
   ```

2. **Create Company Teams:**
   ```bash
   POST /rest/V1/team/:companyId
   ```

3. **Create Company Roles:**
   ```bash
   POST /rest/V1/company/role/
   ```

4. **Assign Company Admin:**
   ```bash
   PUT /rest/V1/customers/:customerId/companies/:companyId
   ```

## Architecture

### Data Flow

```
1. Generate Products → Generate Inventory Sources → Generate Source Items
   └─> Assign quantities per product per source

2. Generate Customers → Generate Companies → Link Customers to Companies
   └─> Create admin assignments

3. Generate Company Structure → Teams → Roles
   └─> Define organizational hierarchy
```

### File Dependencies

- `inventory-sources.js` - MSI source generation logic
- `companies.js` - B2B company generation logic
- `generate-commerce.js` - Main orchestration script
- `inventory-sources.json` - Custom source configuration (optional)
- `companies.json` - Custom company configuration (optional)

## Integration with BuildRight EDS

The generated data aligns with the BuildRight EDS frontend implementation:

### Warehouse Mapping

| Generator Source Code | EDS Warehouse Config | Region | Priority |
|-----------------------|----------------------|---------|----------|
| `warehouse_west` | `WAREHOUSE_WEST` | Western | 1 |
| `warehouse_central` | `WAREHOUSE_CENTRAL` | Central | 2 |
| `warehouse_east` | `WAREHOUSE_EAST` | Eastern | 3 |
| `store_austin` | Precision Lumber Austin | Central | 4 |
| `store_san_antonio` | Precision Lumber SA | Central | 5 |

### Company-Persona Mapping

| Company | Persona | Customer Group | Tier |
|---------|---------|----------------|------|
| Sunset Valley Homes | Sarah Martinez | Commercial-Tier2 | 2 |
| Johnson Custom Builders | Marcus Johnson | Residential-Builder | 3 |
| Chen Kitchen & Bath | Lisa Chen | Residential-Builder | 3 |
| Precision Lumber | Kevin Rodriguez | Retail-Chain-Buyer | 4 |

## Advanced Features

### In-Store Pickup

Sources with `extension_attributes.is_pickup_location_active: true` are enabled for customer pickup:

- Display in checkout as pickup options
- Show frontend name and description to customers
- Support "Buy Online, Pick Up In Store" (BOPIS) workflows

### Multi-Source Priority

The `priority` field in stock-source links determines:
- Order of inventory allocation
- Which warehouse ships products
- Fallback sources if primary is out of stock

Lower priority number = higher priority (priority 1 is used first).

### Company Hierarchy

Companies support organizational hierarchies:
- Company Admin (top level)
- Teams (departments, locations, divisions)
- Team Members (individual users)

### Role-Based Permissions

Roles control what company users can do:
- **Purchasing Manager**: Full order and quote management
- **Project Manager**: Order placement, limited financial access
- **Store Manager**: Multi-location management for retail chains
- **Buyer**: Basic ordering only

## Troubleshooting

### Issue: No inventory showing for products

**Solution**: Ensure source items are created for simple products only. Configurable products don't have inventory - their child variants do.

### Issue: Companies not appearing in frontend

**Solution**: Ensure:
1. Company status is set to `1` (Active)
2. Company has a linked admin user (`super_user_id`)
3. Customer group IDs match between company and customer

### Issue: Sources not available for pickup

**Solution**: Verify:
1. `extension_attributes.is_pickup_location_active` is `true`
2. Source is enabled (`enabled: true`)
3. Source is linked to the website's stock

## References

- [Adobe Commerce MSI Documentation](https://experienceleague.adobe.com/docs/commerce-admin/inventory/introduction.html)
- [Adobe Commerce B2B Documentation](https://experienceleague.adobe.com/docs/commerce-admin/b2b/introduction.html)
- [Adobe Commerce REST API Reference](https://adobe-commerce.redoc.ly/)
- [BuildRight EDS Repository](../../../buildright-eds/)
- [BuildRight Personas Documentation](../../../buildright-eds/docs/personas/BUILDRIGHT-PERSONAS-AND-FLOWS.md)

## Version History

- **v1.0.0** (2024-12-17): Initial implementation of MSI sources and B2B companies support
  - 3 warehouse locations + 2 store pickup locations
  - 4 B2B company profiles based on BuildRight personas
  - Company teams and roles templates
  - Stock-source linking with priority ordering
  - Per-source inventory quantity generation

