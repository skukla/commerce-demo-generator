# ACO Metadata Schema

Product attribute metadata defines how product attributes are displayed, searched, and filtered in ACO.

## Schema: `FeedProductMetadata`

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `attributeId` | `string` | Unique identifier for the attribute. Must be unique across all attributes. |
| `name` | `string` | Human-readable name for the attribute used in UI display. |
| `dataType` | `DataType` | Data type of the attribute values. See [Data Types](#data-types). |
| `visibility` | `Visibility[]` | Array of contexts where this attribute should be visible. See [Visibility](#visibility). |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `searchWeight` | `number` | Search ranking weight (1-5). Higher values prioritize this attribute in search results. Default: 1. |
| `options` | `Option[]` | Available values for select/multiselect attributes. See [Options](#options). |

## Data Types

The `dataType` field must be one of:

- `TEXT` - String values
- `DECIMAL` - Numeric values with decimal precision
- `BOOLEAN` - True/false values
- `DATE` - Date values in ISO format

## Visibility

The `visibility` array determines where the attribute appears:

| Value | Description |
|-------|-------------|
| `PRODUCT_DETAIL` | Show in product detail page specifications |
| `PRODUCT_LISTING` | Show in product listing/grid views |
| `SEARCH_RESULTS` | Show in search result displays |
| `FACET` | Enable as a facet/filter in search |

**Note:** An attribute can have multiple visibility contexts. For example, a brand attribute might appear in all contexts.

### Visibility and `isVisibleOnFront`

Visibility is derived from the canonical data `isVisibleOnFront` field:

| Canonical | Generated ACO Visibility |
|-----------|--------------------------|
| `isVisibleOnFront: true` | Includes `PRODUCT_DETAIL` |
| `isVisibleOnFront: false` | Does NOT include `PRODUCT_DETAIL` |

**Internal Attributes:** Attributes with `isVisibleOnFront: false` (like `br_restock_priority`) 
will have `visibility: []` or only include `FACET` if filterable. They are still available on 
products for business logic but are filtered out by the mesh before reaching the frontend.

See [ADR-019: Attribute Visibility Pattern](../../../../buildright-eds/docs/adr/ADR-019-attribute-visibility-pattern.md) for details.

## Options

For `select` and `multiselect` attributes, define available options:

```json
{
  "value": "option-key",
  "label": "Display Label"
}
```

### Option Fields

| Field | Type | Description |
|-------|------|-------------|
| `value` | `string` | **Required**. Internal value/key for the option. |
| `label` | `string` | **Required**. Human-readable label displayed in UI. |

## Complete Example

```json
{
  "attributeId": "br_brand",
  "name": "Brand",
  "dataType": "TEXT",
  "visibility": [
    "PRODUCT_DETAIL",
    "PRODUCT_LISTING",
    "SEARCH_RESULTS"
  ],
  "searchWeight": 3,
  "options": [
    {
      "value": "simpson",
      "label": "Simpson Strong-Tie"
    },
    {
      "value": "georgia-pacific",
      "label": "Georgia-Pacific"
    }
  ]
}
```

## Validation Rules

1. **Unique `attributeId`**: Each attribute must have a unique ID across all metadata entries
2. **Non-empty Arrays**: `visibility` must contain at least one value
3. **Valid `dataType`**: Must be one of the four supported types
4. **Options for Select Types**: If attribute is used as a select/multiselect in products, provide options
5. **Search Weight Range**: If specified, must be between 1 and 5

## Common Patterns

### Core Identification Attributes

Attributes used for product identification typically have:
- `searchWeight: 5` (highest priority)
- All three visibility contexts
- `dataType: "TEXT"`

```json
{
  "attributeId": "sku",
  "name": "SKU",
  "dataType": "TEXT",
  "visibility": ["PRODUCT_DETAIL", "PRODUCT_LISTING", "SEARCH_RESULTS"],
  "searchWeight": 5
}
```

### Discovery/Facet Attributes

Attributes used for filtering and faceting:
- `searchWeight: 2-3` (moderate priority)
- Include `PRODUCT_LISTING` visibility
- Provide `options` for discrete values

```json
{
  "attributeId": "br_product_category",
  "name": "Product Category",
  "dataType": "TEXT",
  "visibility": ["PRODUCT_DETAIL", "PRODUCT_LISTING"],
  "searchWeight": 3,
  "options": [
    { "value": "structural", "label": "Structural Materials" },
    { "value": "windows", "label": "Windows & Doors" }
  ]
}
```

### Technical Specification Attributes

Attributes for detailed specifications:
- `searchWeight: 1` (low priority)
- `PRODUCT_DETAIL` visibility only
- Appropriate `dataType` for the value type

```json
{
  "attributeId": "br_depth",
  "name": "Depth",
  "dataType": "DECIMAL",
  "visibility": ["PRODUCT_DETAIL"],
  "searchWeight": 1
}
```

### Internal/Operational Attributes

Attributes used for business logic but NOT displayed to customers:
- `visibility: []` (empty array - no display contexts)
- May include `FACET` if used for internal filtering
- Generated from canonical `isVisibleOnFront: false`

```json
{
  "attributeId": "br_store_velocity_category",
  "name": "Store Velocity Category",
  "dataType": "TEXT",
  "visibility": [],
  "searchWeight": 1,
  "options": [
    { "value": "fast-moving", "label": "Fast-Moving" },
    { "value": "slow-moving", "label": "Slow-Moving" }
  ]
}
```

These attributes are:
- ✅ Available on products via API (for dashboards, logic, B2B features)
- ✅ Queryable through GraphQL
- ❌ NOT shown in PDP specifications (filtered by mesh)

## Implementation Notes

- **Order of Ingestion**: Metadata must be ingested before products that use those attributes
- **Updates**: Re-ingesting metadata with the same `attributeId` updates the existing definition
- **Deletion**: Deleting metadata does not delete product data; attribute values remain but become untyped
- **Performance**: Use appropriate `searchWeight` values to optimize search relevance without degrading performance

## Related Schemas

- [Products Schema](products.md) - Uses metadata definitions for attribute validation

