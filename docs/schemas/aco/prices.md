# ACO Prices Schema

Product pricing schema with support for regular pricing, tier pricing, and discounts in ACO.

## Schema: `FeedPrices`

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `sku` | `string` | Product SKU identifier. Must match an existing product in the catalog. |
| `priceBookId` | `string` | Price book identifier. Must reference an existing price book. |
| `regular` | `number` | Base price for the product in this price book. Price before any discounts or tiers. |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `tierPrices` | `TierPrice[]` | Array of quantity-based tier pricing. See [Tier Pricing](#tier-pricing). |
| `discounts` | `Discount[]` | Array of active discounts applied to the regular price. See [Discounts](#discounts). |

## Tier Pricing

Tier pricing offers discounted prices based on quantity thresholds.

### Fixed Price Tiers

Specify an exact price for a quantity threshold:

```json
{
  "qty": 10,
  "price": 95.00
}
```

### Percentage Discount Tiers

Specify a percentage discount at a quantity threshold:

```json
{
  "qty": 10,
  "percentage": 5.0
}
```

### Tier Price Fields

| Field | Type | Description |
|-------|------|-------------|
| `qty` | `number` | **Required**. Minimum quantity to qualify. Must be greater than 1. |
| `price` | `number` | Fixed price for this tier (use `price` OR `percentage`, not both). |
| `percentage` | `number` | Percentage discount (0.01 to 99.99) for this tier. |

### Tier Pricing Notes

- Tiers must have `qty > 1` (quantity of 1 is the `regular` price)
- Use either `price` (fixed) or `percentage` (discount), not both
- Tiers are evaluated in ascending quantity order
- Customer pays the best applicable tier price based on cart quantity

## Discounts

Discounts reduce the regular price through fixed amount or percentage reductions.

### Fixed Amount Discount

Reduce price by a fixed dollar amount:

```json
{
  "code": "holiday-sale",
  "price": 10.00
}
```

### Percentage Discount

Reduce price by a percentage:

```json
{
  "code": "loyalty-discount",
  "percentage": 10.0
}
```

### Discount Fields

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | **Required**. Unique identifier for the discount within this price record. |
| `price` | `number` | Fixed discount amount (use `price` OR `percentage`, not both). Must be less than `regular`. |
| `percentage` | `number` | Percentage discount (0.01 to 99.99). |

### Discount Notes

- Discount `code` must be unique within the price record (not globally)
- Use descriptive codes for easier management (e.g., "loyalty_discount", "holiday_sale")
- Multiple discounts can be applied to a single price
- Discounts apply to the `regular` price, not to tier prices

## Examples

### Simple Price

The minimum required for a valid price entry:

```json
{
  "sku": "LUMBER-2X4-8FT",
  "priceBookId": "retail",
  "regular": 12.99
}
```

### Price with Tier Pricing (Fixed Prices)

Quantity-based discounts with exact prices:

```json
{
  "sku": "SHINGLE-BUNDLE",
  "priceBookId": "retail",
  "regular": 45.00,
  "tierPrices": [
    {
      "qty": 10,
      "price": 42.00
    },
    {
      "qty": 50,
      "price": 38.00
    },
    {
      "qty": 100,
      "price": 35.00
    }
  ]
}
```

**Result**: 
- 1-9 bundles: $45.00 each
- 10-49 bundles: $42.00 each
- 50-99 bundles: $38.00 each
- 100+ bundles: $35.00 each

### Price with Tier Pricing (Percentages)

Quantity-based discounts with percentage reductions:

```json
{
  "sku": "PAINT-GALLON",
  "priceBookId": "wholesale",
  "regular": 35.00,
  "tierPrices": [
    {
      "qty": 5,
      "percentage": 10.0
    },
    {
      "qty": 10,
      "percentage": 15.0
    },
    {
      "qty": 25,
      "percentage": 20.0
    }
  ]
}
```

**Result**:
- 1-4 gallons: $35.00 each (100%)
- 5-9 gallons: $31.50 each (10% off)
- 10-24 gallons: $29.75 each (15% off)
- 25+ gallons: $28.00 each (20% off)

### Price with Discounts

Active promotions or customer-specific discounts:

```json
{
  "sku": "DOOR-INTERIOR",
  "priceBookId": "retail",
  "regular": 200.00,
  "discounts": [
    {
      "code": "spring-sale",
      "percentage": 15.0
    },
    {
      "code": "bulk-purchase",
      "price": 10.00
    }
  ]
}
```

**Result**: Regular price $200.00 with two active discounts (final calculation depends on ACO discount stacking rules)

### Price with Both Tiers and Discounts

Combined tier pricing and promotional discounts:

```json
{
  "sku": "CONCRETE-BAG",
  "priceBookId": "contractor",
  "regular": 8.50,
  "tierPrices": [
    {
      "qty": 10,
      "price": 7.95
    },
    {
      "qty": 50,
      "price": 7.50
    }
  ],
  "discounts": [
    {
      "code": "contractor-rate",
      "percentage": 5.0
    }
  ]
}
```

## Validation Rules

1. **Product Must Exist**: `sku` must reference a product already ingested
2. **Price Book Must Exist**: `priceBookId` must reference an existing price book
3. **Positive Prices**: All price values must be positive numbers
4. **Tier Quantity**: `qty` in tier prices must be greater than 1
5. **Discount Amount**: Fixed discount `price` must be less than `regular` price
6. **Percentage Range**: Percentage values must be between 0.01 and 99.99
7. **Unique Discount Codes**: Discount `code` values must be unique within the price record
8. **One Price Type**: Each tier/discount uses either `price` or `percentage`, not both

## Common Patterns

### Flat Pricing Across Price Books

Same structure, different prices for different customer segments:

```json
[
  {
    "sku": "WIDGET-001",
    "priceBookId": "retail",
    "regular": 100.00
  },
  {
    "sku": "WIDGET-001",
    "priceBookId": "wholesale",
    "regular": 85.00
  },
  {
    "sku": "WIDGET-001",
    "priceBookId": "trade",
    "regular": 75.00
  }
]
```

### Volume Discounts by Category

Apply different tier structures based on product type:

**Structural Materials** (high volume, small percentage discounts):
```json
{
  "sku": "LUMBER-2X4",
  "priceBookId": "retail",
  "regular": 9.22,
  "tierPrices": [
    { "qty": 100, "percentage": 3.0 },
    { "qty": 294, "percentage": 8.0 }
  ]
}
```

**Windows & Doors** (moderate volume, higher percentage discounts):
```json
{
  "sku": "WINDOW-CASEMENT",
  "priceBookId": "retail",
  "regular": 450.00,
  "tierPrices": [
    { "qty": 5, "percentage": 8.0 },
    { "qty": 20, "percentage": 12.0 }
  ]
}
```

### Promotional Pricing

Time-limited discounts applied across price books:

```json
[
  {
    "sku": "DECK-BOARD",
    "priceBookId": "retail",
    "regular": 25.00,
    "discounts": [
      { "code": "summer-2024", "percentage": 20.0 }
    ]
  },
  {
    "sku": "DECK-BOARD",
    "priceBookId": "wholesale",
    "regular": 21.25,
    "discounts": [
      { "code": "summer-2024", "percentage": 10.0 }
    ]
  }
]
```

## Performance Considerations

- **Batch Size**: ACO supports up to 100 price entries per batch API call
- **Grouping**: Group prices by price book for better ingestion performance
- **Tier Count**: Keep tier prices reasonable (typically 3-5 tiers max)
- **Discount Count**: Limit active discounts per price (typically 1-3 max)

## Price Updates

### Updating Existing Prices

Re-ingesting a price with the same `sku` + `priceBookId` combination updates the existing price:

```json
{
  "sku": "WIDGET-001",
  "priceBookId": "retail",
  "regular": 110.00
}
```

### Removing Tier Pricing

To remove tier pricing, re-ingest without `tierPrices`:

```json
{
  "sku": "WIDGET-001",
  "priceBookId": "retail",
  "regular": 100.00
}
```

### Removing Discounts

To remove all discounts, re-ingest without `discounts`:

```json
{
  "sku": "WIDGET-001",
  "priceBookId": "retail",
  "regular": 100.00
}
```

## Ingestion Order

Prices must be ingested **after**:
1. Products (SKUs must exist)
2. Price Books (price book IDs must exist)

## Implementation Notes

- **Currency**: Price values use the currency defined in the base price book
- **Decimal Precision**: Use appropriate precision for the currency (typically 2 decimals for USD)
- **Rounding**: Round prices to avoid floating-point precision issues
- **Null Values**: Omit optional fields rather than setting them to `null`
- **Empty Arrays**: Omit `tierPrices` and `discounts` if not used, don't pass empty arrays

## Related Schemas

- [Price Books Schema](price-books.md) - Define price books before assigning prices
- [Products Schema](products.md) - Define products before pricing them

