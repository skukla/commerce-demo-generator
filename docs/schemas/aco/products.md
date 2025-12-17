# ACO Products Schema

Product catalog schema for ingesting simple and configurable products into ACO.

## Schema: `FeedProduct`

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `sku` | `string` | Unique product identifier. Must be unique across all products. |
| `name` | `string` | Product name displayed to customers. |
| `attributes` | `Attribute[]` | Array of product attributes. See [Attributes](#attributes). |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | `string` | Long-form product description with full details. |
| `shortDescription` | `string` | Brief product summary for listings and previews. |
| `categories` | `string[]` | Array of category paths (e.g., `["Catalog/Structural/Lumber"]`). |
| `images` | `Image[]` | Array of product images. See [Images](#images). |
| `videos` | `Video[]` | Array of product videos. See [Videos](#videos). |
| `externalId` | `string` | External system identifier for integration tracking. |

## Attributes

Product attributes are key-value pairs that describe product characteristics.

```json
{
  "code": "br_brand",
  "value": "Simpson Strong-Tie"
}
```

### Attribute Fields

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | **Required**. Attribute identifier matching metadata `attributeId`. |
| `value` | `string \| number \| boolean` | **Required**. Attribute value. Type should match metadata `dataType`. |

### Attribute Notes

- Attribute `code` must reference a metadata entry ingested via the metadata API
- Multi-value attributes (multiselect) use comma-separated strings: `"value1,value2,value3"`
- Configurable product variation attributes are included in the standard attributes array

## Images

Product images for display in storefronts and search results.

```json
{
  "url": "https://example.com/images/product.jpg",
  "roles": ["main", "thumbnail"]
}
```

### Image Fields

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | **Required**. Fully qualified image URL. Must be publicly accessible. |
| `roles` | `string[]` | Optional. Image roles (e.g., `["main", "thumbnail", "swatch"]`). |
| `label` | `string` | Optional. Alt text for accessibility. |

## Videos

Product videos for enhanced product displays.

```json
{
  "url": "https://youtube.com/watch?v=xxx",
  "provider": "youtube",
  "title": "Product Demo"
}
```

### Video Fields

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | **Required**. Video URL (YouTube, Vimeo, or direct link). |
| `provider` | `string` | Optional. Video provider (`"youtube"`, `"vimeo"`, `"direct"`). |
| `title` | `string` | Optional. Video title for display. |
| `description` | `string` | Optional. Video description. |

## Product Types

### Simple Products

Standalone products without variations. Most common product type.

```json
{
  "sku": "2X4-LUMBER-8FT",
  "name": "2x4 Lumber - 8 ft",
  "description": "Premium grade lumber for framing",
  "shortDescription": "8-foot 2x4 lumber",
  "categories": ["BuildRight Catalog/Structural Materials/Lumber"],
  "attributes": [
    { "code": "br_brand", "value": "Georgia-Pacific" },
    { "code": "br_length", "value": 8 },
    { "code": "br_width", "value": 4 },
    { "code": "br_depth", "value": 2 }
  ],
  "images": [
    {
      "url": "https://cdn.example.com/lumber-2x4.jpg",
      "roles": ["main", "thumbnail"]
    }
  ]
}
```

### Configurable Products

Parent products that represent a family of variations. The parent defines the product concept.

```json
{
  "sku": "WINDOW-CASEMENT-CONFIG",
  "name": "Casement Window",
  "description": "Energy-efficient casement windows in multiple sizes",
  "shortDescription": "Available in multiple sizes",
  "categories": ["BuildRight Catalog/Windows & Doors/Windows"],
  "attributes": [
    { "code": "br_brand", "value": "Anderson" },
    { "code": "br_window_type", "value": "Casement" },
    { "code": "br_material", "value": "Vinyl" }
  ],
  "images": [
    {
      "url": "https://cdn.example.com/window-casement.jpg",
      "roles": ["main"]
    }
  ]
}
```

### Product Variants

Variants are **simple products** that represent specific variations of a configurable product. They are ingested as regular products with their variation attributes.

**Important**: ACO does NOT support `parentSku` or `selections` fields. Variants are standalone products with their variation attribute values in the standard `attributes` array.

```json
{
  "sku": "WINDOW-CASEMENT-VAR-24X36",
  "name": "Casement Window - 24\"x36\"",
  "description": "Energy-efficient casement window, 24x36 inches",
  "shortDescription": "24\"x36\" casement window",
  "categories": ["BuildRight Catalog/Windows & Doors/Windows"],
  "attributes": [
    { "code": "br_brand", "value": "Anderson" },
    { "code": "br_window_type", "value": "Casement" },
    { "code": "br_material", "value": "Vinyl" },
    { "code": "br_window_width", "value": 24 },
    { "code": "br_window_height", "value": 36 }
  ],
  "images": [
    {
      "url": "https://cdn.example.com/window-casement-24x36.jpg",
      "roles": ["main", "thumbnail"]
    }
  ]
}
```

**Note**: The relationship between configurables and variants is established through shared attribute values and naming conventions, not through explicit parent-child fields.

## Validation Rules

1. **Unique SKU**: Each product must have a unique SKU
2. **Required Fields**: `sku`, `name`, and `attributes` are required
3. **Attribute References**: All attribute `code` values must reference existing metadata
4. **Category Paths**: Use forward slashes to separate category levels
5. **Image URLs**: Must be publicly accessible HTTPS URLs
6. **No Additional Properties**: Fields not in the schema will cause validation errors

## Common Patterns

### Minimal Product

The absolute minimum required for a valid product:

```json
{
  "sku": "SIMPLE-001",
  "name": "Basic Product",
  "attributes": []
}
```

### Product with Faceting

Products intended for filtering should include facet attributes:

```json
{
  "sku": "DOOR-001",
  "name": "Interior Door",
  "attributes": [
    { "code": "br_product_category", "value": "Windows & Doors" },
    { "code": "br_brand", "value": "Masonite" },
    { "code": "br_material", "value": "Wood" },
    { "code": "br_door_style", "value": "Panel" }
  ]
}
```

### Product with Full Details

Complete product with all optional fields:

```json
{
  "sku": "ROOF-SHINGLE-001",
  "name": "Architectural Shingles - Pewter Gray",
  "description": "Premium architectural shingles...",
  "shortDescription": "30-year warranty shingles",
  "categories": ["BuildRight Catalog/Roofing/Shingles"],
  "externalId": "EXT-ROOF-001",
  "attributes": [
    { "code": "br_brand", "value": "GAF" },
    { "code": "br_color", "value": "Pewter Gray" },
    { "code": "br_warranty_years", "value": 30 }
  ],
  "images": [
    {
      "url": "https://cdn.example.com/shingle-main.jpg",
      "roles": ["main"],
      "label": "Pewter Gray Shingle"
    },
    {
      "url": "https://cdn.example.com/shingle-detail.jpg",
      "roles": ["additional"],
      "label": "Close-up texture"
    }
  ],
  "videos": [
    {
      "url": "https://youtube.com/watch?v=install-demo",
      "provider": "youtube",
      "title": "Installation Guide"
    }
  ]
}
```

## Implementation Notes

- **Batch Size**: ACO supports up to 100 products per batch API call
- **Order of Ingestion**: Metadata must be ingested before products
- **Updates**: Re-ingesting a product with the same SKU updates the existing product
- **Deletion**: Use the delete API endpoint; simply not including a product in subsequent ingests does not delete it
- **Performance**: Batch products by type (simple vs configurable) for better ingestion performance

## Related Schemas

- [Metadata Schema](metadata.md) - Define attributes before using them in products
- [Prices Schema](prices.md) - Assign prices to products after ingestion

