# ACO Categories Schema

Category hierarchy schema for ingesting categories into ACO.

> **⚠️ Schema Version: v1.0.0 (December 2024)**
> 
> The category schema was significantly updated in v1.0.0. The fields `code`, `description`, `active`, and `parentId` are **no longer supported**. Hierarchy is now represented exclusively via the `slug` field using a hierarchical path format.

## Schema: `FeedCategory`

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `slug` | `string` | **Required**. Hierarchical category path using forward slashes to represent parent-child relationships. String can contain only lowercase letters, numbers, and hyphens. Examples: `"men"`, `"men/clothing"`, `"men/clothing/pants"` |
| `source` | `Source` | **Required**. Source locale information. See [Source](#source). |
| `name` | `string` | **Required**. Display name of the category shown to customers. |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `families` | `string[]` | Optional. Array of product family identifiers that this category is associated with. Used for enhanced product organization and filtering. |

### ❌ Removed Fields (Not Supported in v1.0.0)

| Field | Status | Alternative |
|-------|--------|-------------|
| `code` | ❌ Removed | Use `slug` instead |
| `description` | ❌ Removed | Not supported in v1.0.0 |
| `active` | ❌ Removed | Not supported in v1.0.0 |
| `parentId` | ❌ Removed | Hierarchy via `slug` path (e.g., `"parent/child"`) |

## Source

The source object identifies the locale for the category data.

```json
{
  "locale": "en-US"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `locale` | `string` | **Required**. Locale identifier (e.g., `"en-US"`, `"fr-FR"`, `"de-DE"`). |

## Slug Format

The `slug` field defines both the category identifier and its position in the hierarchy:

- **Root Level**: Single segment (e.g., `"structural-materials"`)
- **Second Level**: Two segments (e.g., `"structural-materials/lumber"`)
- **Third Level**: Three segments (e.g., `"structural-materials/lumber/dimensional"`)

### Slug Rules

1. **Lowercase Only**: Must be lowercase letters
2. **Alphanumeric**: Can contain letters (a-z), numbers (0-9), and hyphens (-)
3. **No Spaces**: Use hyphens instead of spaces
4. **Hierarchy Separator**: Use forward slash (`/`) to represent parent-child relationships
5. **URL-Friendly**: Valid for use in URLs without encoding

### ✅ Valid Slugs

```
structural-materials
structural-materials/lumber
structural-materials/lumber/dimensional-lumber
windows-doors
windows-doors/windows
windows-doors/windows/casement-windows
```

### ❌ Invalid Slugs

```
Structural Materials        → Contains spaces and uppercase
structural_materials        → Underscore not allowed (use hyphen)
structural/materials/       → Trailing slash not allowed
/structural/materials       → Leading slash not allowed
Structural-Materials/Lumber → Mixed case not allowed
```

## Category Examples

### Minimal Category (Root Level)

The absolute minimum required for a valid category:

```json
{
  "slug": "structural-materials",
  "source": { "locale": "en-US" },
  "name": "Structural Materials"
}
```

### Category with Product Family

Category associated with a specific product family:

```json
{
  "slug": "electrical-systems",
  "source": { "locale": "en-US" },
  "name": "Electrical Systems",
  "families": ["commercial-grade", "residential"]
}
```

### Hierarchical Category Structure

Creating a three-level category hierarchy:

```json
[
  {
    "slug": "windows-doors",
    "source": { "locale": "en-US" },
    "name": "Windows & Doors"
  },
  {
    "slug": "windows-doors/windows",
    "source": { "locale": "en-US" },
    "name": "Windows"
  },
  {
    "slug": "windows-doors/windows/casement-windows",
    "source": { "locale": "en-US" },
    "name": "Casement Windows"
  },
  {
    "slug": "windows-doors/windows/double-hung-windows",
    "source": { "locale": "en-US" },
    "name": "Double-Hung Windows"
  },
  {
    "slug": "windows-doors/doors",
    "source": { "locale": "en-US" },
    "name": "Doors"
  },
  {
    "slug": "windows-doors/doors/interior-doors",
    "source": { "locale": "en-US" },
    "name": "Interior Doors"
  },
  {
    "slug": "windows-doors/doors/exterior-doors",
    "source": { "locale": "en-US" },
    "name": "Exterior Doors"
  }
]
```

### BuildRight Example

Complete BuildRight category hierarchy:

```json
[
  {
    "slug": "structural-materials",
    "source": { "locale": "en-US" },
    "name": "Structural Materials"
  },
  {
    "slug": "structural-materials/lumber",
    "source": { "locale": "en-US" },
    "name": "Lumber"
  },
  {
    "slug": "structural-materials/plywood-sheathing",
    "source": { "locale": "en-US" },
    "name": "Plywood & Sheathing"
  },
  {
    "slug": "framing-drywall",
    "source": { "locale": "en-US" },
    "name": "Framing & Drywall"
  },
  {
    "slug": "framing-drywall/metal-studs-track",
    "source": { "locale": "en-US" },
    "name": "Metal Studs & Track"
  },
  {
    "slug": "framing-drywall/drywall",
    "source": { "locale": "en-US" },
    "name": "Drywall"
  },
  {
    "slug": "framing-drywall/insulation",
    "source": { "locale": "en-US" },
    "name": "Insulation"
  }
]
```

## Linking Products to Categories

After creating categories, link products to them using the category slug:

```json
{
  "sku": "2X4-LUMBER-8FT",
  "name": "2x4 Lumber - 8 ft",
  "attributes": [
    {
      "code": "br_product_category",
      "value": "structural-materials/lumber"
    }
  ]
}
```

Or use the `categoryCodes` field (if supported by your product schema):

```json
{
  "sku": "2X4-LUMBER-8FT",
  "name": "2x4 Lumber - 8 ft",
  "categoryCodes": ["structural-materials/lumber"]
}
```

## Ingestion Order

Categories should be ingested in hierarchical order (parents before children):

1. ✅ **Good**: Root first, then children
   ```json
   [
     { "slug": "parent", ... },
     { "slug": "parent/child", ... },
     { "slug": "parent/child/grandchild", ... }
   ]
   ```

2. ⚠️ **Works but not recommended**: Random order
   ```json
   [
     { "slug": "parent/child/grandchild", ... },
     { "slug": "parent", ... },
     { "slug": "parent/child", ... }
   ]
   ```

ACO will handle the relationships, but ingesting in hierarchical order is cleaner and easier to debug.

## Validation Rules

1. **Unique Slug**: Each category must have a unique `slug` within a locale
2. **Required Fields**: `slug`, `source`, and `name` are required
3. **Slug Format**: Must match pattern `^[a-z0-9-]+(?:\/[a-z0-9-]+)*$`
4. **Max Length**: Slug can be up to 1024 characters
5. **Name Length**: Name can be up to 128 characters
6. **No Additional Properties**: Fields not in the schema will cause validation errors

## Common Patterns

### Multi-Locale Categories

Create the same category hierarchy for different locales:

```json
[
  {
    "slug": "windows-doors",
    "source": { "locale": "en-US" },
    "name": "Windows & Doors"
  },
  {
    "slug": "windows-doors",
    "source": { "locale": "fr-FR" },
    "name": "Fenêtres et Portes"
  },
  {
    "slug": "windows-doors",
    "source": { "locale": "de-DE" },
    "name": "Fenster und Türen"
  }
]
```

### Deep Hierarchy

ACO supports deep category hierarchies:

```json
{
  "slug": "structural/lumber/dimensional/pressure-treated/2x4",
  "source": { "locale": "en-US" },
  "name": "2x4 Pressure-Treated Lumber"
}
```

## Implementation Notes

- **Batch Size**: ACO supports up to 100 categories per batch API call
- **Order of Ingestion**: Categories should be ingested before products that reference them
- **Updates**: Re-ingesting a category with the same `slug` and `source` updates the existing category
- **Deletion**: Use the delete API endpoint; not including a category in subsequent ingests does not delete it
- **GraphQL Queries**: Use `categories` and `categorytree` GraphQL queries to retrieve category data for storefront rendering
- **Performance**: Batch all categories in a single request if possible for better performance

## Related Schemas

- [Products Schema](products.md) - Link products to categories using category codes
- [Metadata Schema](metadata.md) - Define category-related facets for filtering

## Migration from Old Schema

If you have code using the old schema format, here's how to migrate:

### Before (❌ Old Schema)

```json
{
  "code": "lumber",
  "source": { "locale": "en-US" },
  "name": "Lumber",
  "slug": "structural-materials/lumber",
  "description": "Lumber category",
  "active": true,
  "parentId": "structural-materials"
}
```

### After (✅ New Schema v1.0.0)

```json
{
  "slug": "structural-materials/lumber",
  "source": { "locale": "en-US" },
  "name": "Lumber"
}
```

**Changes:**
- ❌ Remove `code` - No longer used
- ❌ Remove `description` - Not supported
- ❌ Remove `active` - Not supported
- ❌ Remove `parentId` - Hierarchy via `slug` path
- ✅ Keep only: `slug`, `source`, `name` (and optionally `families`)

## API Reference

- **Endpoint**: `POST /v1/catalog/categories`
- **Method**: Create new categories
- **Update**: `PATCH /v1/catalog/categories`
- **OpenAPI Spec**: See official ACO Data Ingestion API documentation

## Version History

- **v1.0.0 (December 2024)**: Major schema simplification
  - Removed: `code`, `description`, `active`, `parentId`
  - Hierarchy now exclusively via `slug` path format
  - Simplified to 3 required fields + optional `families`

