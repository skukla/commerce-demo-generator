# SKU Prefix Strategy

## Overview

SKU prefixes are **business decisions**, not algorithmic logic. Each project defines its own SKU prefix strategy in its catalog definition file.

## How It Works

### SKU Format

```
{PREFIX}-{HASH}
{PREFIX}-{HASH}-CONFIG  (for configurable products)
{PREFIX}-{HASH}-VAR-{HASH}  (for variant products)
```

### Prefix Resolution

The generator determines the SKU prefix using the following priority:

1. **Explicit `skuPrefix`** from category definition (recommended)
2. **Fallback**: First 3 characters of category key (auto-generation)

### Example

```json
{
  "roofing": {
    "name": "Roofing",
    "skuPrefix": "ROF",
    "attributeValue": "Roofing",
    "subcategories": { ... }
  }
}
```

**With `skuPrefix`:** `ROF-A1B2C3D4` (2x4 Roofing Shingle)  
**Without `skuPrefix`:** `ROO-A1B2C3D4` (fallback to first 3 chars)

## Why User-Defined Prefixes?

SKU prefixes require domain expertise and business context:

- **Industry Standards**: Construction uses different conventions than retail or grocery
- **Legacy Systems**: May need to align with existing SKU schemes
- **Warehouse Integration**: May need to match physical inventory systems
- **Branding**: May follow company naming conventions
- **Conflict Avoidance**: May need to avoid conflicts with existing products

**No algorithm can capture this business context.** The generator provides the mechanism; you provide the strategy.

## Implementation Guide

### Step 1: Review Your Categories

```bash
cd buildright-data
cat definitions/products/catalog.json | jq 'keys'
```

### Step 2: Decide on SKU Prefixes

Consider:
- Industry standards for your domain
- Existing SKU schemes (if migrating from legacy system)
- Clarity and uniqueness
- Stakeholder preferences

### Step 3: Add `skuPrefix` to Catalog

Edit `{data-repo}/definitions/products/catalog.json`:

```json
{
  "structural": {
    "name": "Structural Materials",
    "skuPrefix": "STR",
    "attributeValue": "Structural Materials",
    "subcategories": { ... }
  },
  "framing": {
    "name": "Framing & Drywall",
    "skuPrefix": "FRM",
    "attributeValue": "Framing & Drywall",
    "subcategories": { ... }
  },
  "roofing": {
    "name": "Roofing",
    "skuPrefix": "ROF",
    "attributeValue": "Roofing",
    "subcategories": { ... }
  }
}
```

### Step 4: Regenerate Data

```bash
cd commerce-demo-generator
npm run generate:commerce
```

All products will be regenerated with the new SKU prefixes.

## Multi-Project Support

The generator is project-agnostic. Each data repository defines its own SKU prefix strategy:

### BuildRight (Construction)

```json
{
  "structural": { "skuPrefix": "STR" },
  "roofing": { "skuPrefix": "ROF" },
  "framing": { "skuPrefix": "FRM" }
}
```

**Example SKUs:** `STR-49C283DE`, `ROF-A1B2C3D4`, `FRM-E5F6G7H8`

### FashionCo (Retail Apparel)

```json
{
  "apparel": { "skuPrefix": "APP" },
  "footwear": { "skuPrefix": "FOT" },
  "accessories": { "skuPrefix": "ACC" }
}
```

**Example SKUs:** `APP-12345678`, `FOT-87654321`, `ACC-ABCDEF12`

### FoodMart (Grocery)

```json
{
  "produce": { "skuPrefix": "PRD" },
  "frozen": { "skuPrefix": "FRZ" },
  "dairy": { "skuPrefix": "DRY" }
}
```

**Example SKUs:** `PRD-11223344`, `FRZ-55667788`, `DRY-99AABBCC`

## Impact of Changing SKU Prefixes

⚠️ **This is a breaking change.** Changing SKU prefixes requires:

1. **Regenerate all data**
   ```bash
   cd commerce-demo-generator
   npm run generate:commerce
   npm run generate:aco
   ```

2. **Re-extract images** (keyed by SKU)
   ```bash
   # Images are automatically extracted during Commerce generation
   # No separate step needed
   ```

3. **Delete and reimport Commerce data**
   ```bash
   cd commerce-demo-ingestion
   npm run reset:all
   npm run import:all
   ```

4. **Sync images to frontend**
   ```bash
   cd buildright-eds
   npm run sync:images
   ```

5. **Frontend automatically updates** (uses convention-based image URLs)

## Best Practices

### ✅ DO

- Define explicit `skuPrefix` for all categories
- Use 2-4 character prefixes (3 is standard)
- Use uppercase letters only
- Document your SKU prefix decisions
- Get stakeholder buy-in before changing

### ❌ DON'T

- Use special characters or numbers in prefixes
- Change prefixes frequently (causes data churn)
- Use ambiguous prefixes (e.g., "CON" has negative connotations)
- Assume the auto-generated prefix is "correct"

## Validation

The generator validates SKU prefixes:

- Must be uppercase letters only
- Must be 2-4 characters long
- Must be unique across categories

If validation fails, the generator will error with a helpful message.

## Schema

```typescript
interface CategoryDefinition {
  name: string;                    // Display name
  skuPrefix?: string;              // Optional: 2-4 uppercase letters
  attributeValue: string;          // Attribute value for filtering
  subcategories: {
    [key: string]: {
      simple?: ProductTemplate[];
      configurable?: ConfigurableTemplate[];
    }
  }
}
```

## Related Documentation

- [Product Definitions](./PRODUCT-DEFINITIONS.md)
- [Category Structure](./CATEGORY-STRUCTURE.md)
- [Data Generation Flow](./DATA-GENERATION-FLOW.md)

