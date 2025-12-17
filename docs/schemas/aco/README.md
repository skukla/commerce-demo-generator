# ACO Data Ingestion Schemas

This directory contains reference documentation for Adobe Commerce Optimizer (ACO) data ingestion schemas.

These schemas are based on the official `@adobe-commerce/aco-ts-sdk` TypeScript definitions and describe the exact format required for ingesting data into ACO.

## Schema Files

- **[metadata.md](metadata.md)** - Product attribute metadata schema
- **[products.md](products.md)** - Product catalog schema  
- **[price-books.md](price-books.md)** - Price book hierarchy schema
- **[prices.md](prices.md)** - Product pricing with tier support schema

## Key Concepts

### Data Ingestion Flow

The recommended order for ingesting data into ACO:

1. **Metadata** - Define product attributes and their properties
2. **Products** - Ingest product catalog (simple and configurable products)
3. **Price Books** - Define pricing hierarchies and currencies
4. **Prices** - Assign prices to products within each price book

### Schema Validation

ACO strictly validates all ingested data against these schemas. Common validation errors:

- **Missing Required Fields** - All fields marked as `required` must be present
- **Invalid Types** - Field values must match the specified type (string, number, boolean, etc.)
- **Additional Properties** - ACO does not allow fields not defined in the schema
- **Reference Integrity** - SKUs, price book IDs, and other references must exist before use

### Currency Handling

- Base price books define the currency for themselves and all child price books
- Child price books inherit currency from their parent
- Currencies use ISO 4217 codes (e.g., "USD", "EUR", "GBP")

### Hierarchical Pricing

ACO supports multi-level price book hierarchies:

```
Base Price Book (USD) ← defines currency
├── Regional Price Book (inherits USD)
│   └── Customer Segment Price Book (inherits USD)
└── Wholesale Price Book (inherits USD)
```

## Related Documentation

- **ACO TypeScript SDK**: `@adobe-commerce/aco-ts-sdk` npm package
- **Generator Implementation**: `../../scripts/generators/generate-aco.js`
- **Ingestion Scripts**: `commerce-demo-ingestion/aco/`

## Version

These schemas are based on `@adobe-commerce/aco-ts-sdk` version as installed in the ingestion repository.

