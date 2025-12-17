# ACO Price Books Schema

Price books define pricing hierarchies and currency contexts for product prices in ACO.

## Overview

ACO supports hierarchical price books:
- **Base Price Books**: Define currency and serve as root of hierarchy
- **Child Price Books**: Inherit currency from parent and can have their own children

This enables scenarios like:
- Regional pricing (Base: USD → Child: US East, US West)
- Customer segment pricing (Base: USD → Child: Retail, Wholesale, Trade)
- Multi-level hierarchies (Base: USD → Region → Customer Segment)

## Schema: Base Price Book

Root-level price books that define currency.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `priceBookId` | `string` | Unique identifier for the price book. Must be unique across all price books. |
| `name` | `string` | Human-readable name for display and identification. |
| `currency` | `string` | ISO 4217 currency code (e.g., "USD", "EUR", "GBP"). Inherited by all children. |

### Example: Base Price Book

```json
{
  "priceBookId": "usd-base",
  "name": "USD Base Pricing",
  "currency": "USD"
}
```

## Schema: Child Price Book

Price books that inherit currency from a parent.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `priceBookId` | `string` | Unique identifier for the child price book. Must be unique across all price books. |
| `name` | `string` | Human-readable name for display and identification. |
| `parent` | `string` | Reference to parent price book ID. Must reference an existing price book. |

### Example: Child Price Book

```json
{
  "priceBookId": "wholesale",
  "name": "Wholesale Pricing",
  "parent": "usd-base"
}
```

## Complete Hierarchy Example

```json
[
  {
    "priceBookId": "usd-base",
    "name": "USD Base Pricing",
    "currency": "USD"
  },
  {
    "priceBookId": "retail",
    "name": "Retail Pricing",
    "parent": "usd-base"
  },
  {
    "priceBookId": "wholesale",
    "name": "Wholesale Pricing",
    "parent": "usd-base"
  },
  {
    "priceBookId": "trade-professional",
    "name": "Trade Professional Pricing",
    "parent": "usd-base"
  },
  {
    "priceBookId": "production-builder",
    "name": "Production Builder Pricing",
    "parent": "wholesale"
  }
]
```

**Resulting Hierarchy:**
```
USD Base (USD)
├── Retail (inherits USD)
├── Wholesale (inherits USD)
│   └── Production Builder (inherits USD)
└── Trade Professional (inherits USD)
```

## Validation Rules

1. **Unique `priceBookId`**: Each price book must have a unique ID
2. **Currency on Base Only**: Only base price books (those without `parent`) can specify `currency`
3. **Parent Must Exist**: Child price books' `parent` field must reference an existing price book ID
4. **No Circular References**: A price book cannot be its own ancestor
5. **Valid Currency Codes**: Use ISO 4217 standard currency codes

## Common Patterns

### Single Currency, Multiple Segments

Most common pattern for B2B scenarios:

```json
[
  {
    "priceBookId": "usd-base",
    "name": "Base USD",
    "currency": "USD"
  },
  {
    "priceBookId": "retail",
    "name": "Retail Customer Pricing",
    "parent": "usd-base"
  },
  {
    "priceBookId": "contractor",
    "name": "Contractor Pricing",
    "parent": "usd-base"
  },
  {
    "priceBookId": "distributor",
    "name": "Distributor Pricing",
    "parent": "usd-base"
  }
]
```

### Multi-Currency Setup

For international stores:

```json
[
  {
    "priceBookId": "usd-base",
    "name": "USD Pricing",
    "currency": "USD"
  },
  {
    "priceBookId": "eur-base",
    "name": "EUR Pricing",
    "currency": "EUR"
  },
  {
    "priceBookId": "gbp-base",
    "name": "GBP Pricing",
    "currency": "GBP"
  }
]
```

### Regional with Segments

Combining regional and customer segment pricing:

```json
[
  {
    "priceBookId": "usd-base",
    "name": "USD Base",
    "currency": "USD"
  },
  {
    "priceBookId": "us-east",
    "name": "US East Region",
    "parent": "usd-base"
  },
  {
    "priceBookId": "us-east-retail",
    "name": "US East Retail",
    "parent": "us-east"
  },
  {
    "priceBookId": "us-east-wholesale",
    "name": "US East Wholesale",
    "parent": "us-east"
  }
]
```

## Ingestion Order

Price books must be ingested in hierarchy order:
1. Base price books first (those with `currency`)
2. Their direct children next (those with `parent` referencing a base)
3. Grandchildren and deeper levels after their parents exist

ACO validates parent references at ingestion time, so parent must exist before child.

## Supported Currencies

ACO supports all ISO 4217 currency codes. Common examples:

- `USD` - United States Dollar
- `EUR` - Euro
- `GBP` - British Pound Sterling
- `CAD` - Canadian Dollar
- `AUD` - Australian Dollar
- `JPY` - Japanese Yen
- `CNY` - Chinese Yuan

## Implementation Notes

- **Batch Size**: ACO supports up to 50 price books per batch API call
- **Updates**: Re-ingesting a price book with the same ID updates its properties
- **Cannot Change Currency**: A base price book's currency cannot be changed after creation
- **Cannot Change Parent**: A child price book's parent cannot be changed after creation
- **Deletion**: Deleting a price book also deletes all associated prices and child price books

## Price Book Strategy

### Simple Approach (Flat)

Create one base price book per customer segment:

```json
[
  { "priceBookId": "retail", "name": "Retail", "currency": "USD" },
  { "priceBookId": "wholesale", "name": "Wholesale", "currency": "USD" },
  { "priceBookId": "trade", "name": "Trade", "currency": "USD" }
]
```

**Pros**: Simple, easy to manage
**Cons**: Duplicate currency definitions, harder to manage multi-currency

### Hierarchical Approach

Create base price books for currencies, then children for segments:

```json
[
  { "priceBookId": "usd-base", "name": "USD", "currency": "USD" },
  { "priceBookId": "retail", "name": "Retail", "parent": "usd-base" },
  { "priceBookId": "wholesale", "name": "Wholesale", "parent": "usd-base" }
]
```

**Pros**: Clean currency management, scalable for multi-currency
**Cons**: Slightly more complex structure

## Related Schemas

- [Prices Schema](prices.md) - Assign prices within price books

