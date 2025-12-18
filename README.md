# Commerce Demo Generator

Generic, reusable datapack generator for Adobe Commerce demo projects.

## Overview

This tool generates datapacks for Adobe Commerce and Adobe Commerce Optimizer (ACO) from structured data definitions. It's designed to be project-agnostic, reading configuration and data from a separate data repository.

## Features

- Generates ACCS-format datapacks for Commerce import
- Transforms Commerce data to ACO format
- Fully configurable via data repository
- Supports products (simple & configurable), categories, attributes, customers, customer groups
- **NEW**: Multi-Source Inventory (MSI) sources and inventory management
- **NEW**: B2B companies, teams, and roles
- Image handling with base64 encoding
- No dependencies on target Commerce or ACO instances

## Architecture

### Canonical Format Architecture (v2.0+)

The generator now uses a **canonical format** as an intermediate representation, enabling clean separation between data definitions and platform-specific formats.

```
Product Definitions (buildright-data)
    ↓
generate-canonical.js → Canonical Datapack (JSON)
    ↓               ↓
generate-commerce   generate-aco
    ↓               ↓
Commerce JSON      ACO JSON
    ↓               ↓
commerce-demo-ingestion
    ↓               ↓
Adobe Commerce     ACO
```

**Benefits:**
- ✅ Platform-agnostic data model
- ✅ Independent transformations (Commerce doesn't depend on ACO, or vice versa)
- ✅ Easier to add new platforms (Shopify, BigCommerce, etc.)
- ✅ Single source of truth for catalog data
- ✅ Better maintainability and testability

### Canonical Format

The canonical format is a platform-neutral JSON structure that serves as the single source of truth for catalog data. It includes:

- **Products**: Core product data (SKU, name, price, attributes, etc.)
- **Categories**: Category hierarchy with slugs and metadata
- **Attributes**: Attribute definitions with types, options, and visibility rules
- **Metadata**: Generation timestamp, version, project info

**Example canonical product:**
```json
{
  "id": "STR-49C283DE",
  "sku": "STR-49C283DE",
  "type": "simple",
  "name": "Premium Lumber 2x4 Stud - 8ft",
  "price": 9.22,
  "attributes": {
    "br_brand": "BuildRight",
    "br_product_category": "Structural Materials",
    "br_construction_phase": ["Foundation & framing"]
  },
  "meta": {
    "status": "enabled",
    "visibility": "catalog_search"
  }
}
```

See `docs/CANONICAL-FORMAT.md` for complete schema documentation.

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- A data repository (e.g., `buildright-data`) cloned alongside this repo

### Installation

```bash
npm install
```

### Configuration

1. Copy `.env.example` to `.env`
2. Set `DATA_REPO_PATH` to point to your data repository

```bash
cp .env.example .env
```

### Generate Datapacks

**Generate all datapacks (recommended):**
```bash
npm run generate:all
```
This runs the full pipeline: canonical → Commerce → ACO

**Or generate individually:**

**1. Generate canonical datapack:**
```bash
npm run generate:canonical
```

**2. Generate Commerce datapack (from canonical):**
```bash
npm run generate:commerce
```

**3. Generate ACO datapack (from canonical):**
```bash
npm run generate:aco
```

**Output Locations:**
- Canonical: `buildright-data/generated/canonical/datapack.json`
- Commerce: `buildright-data/generated/commerce/data/accs/*.json`
- ACO: `buildright-data/generated/aco/*.json`
```bash
npm run generate:all
```

### Using with Different Data Repositories

You can override the data repository path:

```bash
npm run generate:commerce -- --data-repo=../citisignal-data
```

Or set it in your `.env` file:

```env
DATA_REPO_PATH=../citisignal-data
```

## Data Repository Structure

The generator expects the data repository to have this structure:

```
buildright-data/                    # Or any project-specific data repo
├── definitions/
│   ├── project.json               # Project configuration (REQUIRED)
│   ├── products/
│   │   ├── catalog.json
│   │   ├── brands.json
│   │   └── units.json
│   ├── categories/
│   │   └── category-tree.json
│   ├── customers/
│   │   ├── customer-groups.json
│   │   └── demo-customers.json
│   └── attributes/
│       ├── product-attributes.json
│       └── customer-attributes.json
├── media/
│   └── images/
│       └── products/
└── generated/                      # Output directory (created by generator)
    ├── commerce/
    │   ├── data/accs/
    │   └── media/
    └── aco/
```

### Required: definitions/project.json

This file defines project-specific configuration:

```json
{
  "name": "BuildRight",
  "displayName": "BuildRight Demo",
  "identifier": "buildright",
  "websiteCode": "buildright",
  "storeCode": "buildright_store",
  "storeViewCode": "buildright_us",
  "rootCategoryName": "BuildRight Catalog",
  "attributePrefix": "br_",
  "customerAttributePrefix": "aco_"
}
```

## Sample Data

See `config/sample-data/` for BuildRight data as a reference example.

## New Features

### Multi-Source Inventory (MSI) Support

The generator now creates MSI sources (warehouses, distribution centers, retail stores) with inventory quantities assigned per product per source. This enables:

- Multi-warehouse inventory management
- Regional fulfillment strategies
- In-store pickup (BOPIS) capabilities
- Priority-based source allocation

See [docs/MSI-AND-B2B-SUPPORT.md](docs/MSI-AND-B2B-SUPPORT.md) for detailed documentation.

### B2B Companies Support

The generator creates B2B company structures including:

- Company profiles with legal and contact information
- Company teams for organizational hierarchy
- Company roles with granular permissions
- Company admin user assignments

Based on the BuildRight Solutions use case, demonstrating regional builders, contractors, and retail chains.

See [docs/MSI-AND-B2B-SUPPORT.md](docs/MSI-AND-B2B-SUPPORT.md) for detailed documentation.

## Output

### Commerce Output (ACCS Format)

Generated in `{data-repo}/generated/commerce/`:

**Core Entities:**
- `data/accs/accs_products.json` - Products (simple & configurable)
- `data/accs/accs_categories.json` - Category tree
- `data/accs/accs_product_attributes.json` - Product attributes
- `data/accs/accs_stores.json` - Store structure
- `data/accs/accs_customer_groups.json` - Customer groups
- `data/accs/accs_customers.json` - Demo customers
- `data/accs/accs_product_images_*.json` - Product images (base64)
- `media/catalog/product/` - Image files

**Multi-Source Inventory (MSI):**
- `data/accs/accs_inventory_sources.json` - Warehouse and store locations
- `data/accs/accs_stock_source_links.json` - Source-to-stock associations
- `data/accs/accs_source_items_*.json` - Per-source inventory quantities

**B2B Companies:**
- `data/accs/accs_companies.json` - Company profiles
- `data/accs/accs_company_roles_template.json` - Role definitions
- `data/accs/accs_company_teams_template.json` - Team structures
- `data/accs/b2b_enable_instructions.json` - Setup instructions (manual configuration required)
- `data/accs/b2b_config_reference.json` - Configuration reference

> **⚠️ Important:** B2B features must be enabled manually via Admin UI before importing companies. See generated instructions file.

### ACO Output

Generated in `{data-repo}/generated/aco/`:

- `categories.json` - Categories with `families: ['default']` for navigation query
- `metadata.json` - Attribute metadata
- `products.json` - Product data
- `variants.json` - Product variants
- `price-books.json` - Price books per customer group
- `prices.json` - Product prices with tier pricing

## Development

### Project Structure

```
commerce-demo-generator/
├── config/
│   ├── project-config.js          # Dynamic config loader
│   └── sample-data/                # BuildRight reference data
├── scripts/
│   ├── generators/
│   │   ├── generate-commerce.js   # Main Commerce generator
│   │   ├── generate-aco.js        # ACO transformer
│   │   ├── products.js            # Product generation logic
│   │   ├── product-variants.js    # Configurable products
│   │   ├── categories.js
│   │   ├── stores.js
│   │   ├── attributes.js
│   │   ├── customers.js
│   │   └── customer-groups.js
│   └── utils/
│       ├── description-generator.js
│       ├── name-normalizer.js
│       ├── product-utils.js
│       └── format.js
└── examples/
    └── sample-data/                # Minimal example data
```

## Troubleshooting

### Error: Cannot find module

Make sure:
1. You've run `npm install`
2. Your `DATA_REPO_PATH` is correct
3. The data repository has all required files

### Error: Cannot read property 'json'

The data repository is missing the `definitions/project.json` file. This file is required for all projects.

### Validation Errors

Check that your data files match the expected structure. See `config/sample-data/` for examples.

## Creating a New Data Repository

To create a data repository for a new project:

1. Create the directory structure shown above
2. Create `definitions/project.json` with your project configuration
3. Add your data files to `definitions/`
4. Add product images to `media/images/products/`
5. Run the generator pointing to your new data repo

## License

MIT

