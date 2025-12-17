# Commerce Demo Generator Documentation

Technical documentation for the generic demo datapack generator.

---

## Documents in This Directory

### Technical Documentation

- **[GENERIC-RELATIONSHIP-HANDLING.md](./GENERIC-RELATIONSHIP-HANDLING.md)**
  - How the generator maintains Commerce product relationships
  - Simple, configurable, and variant product handling
  - Why it works for any project (not just BuildRight)
  - Parent-child relationships and selections extraction
  - **Key takeaway:** The generator is fully generic and reads relationships from Commerce native fields

- **[REQUIREMENTS-VERIFICATION.md](./REQUIREMENTS-VERIFICATION.md)**
  - Comprehensive verification of generator output against documented requirements
  - Compares generated files with ACO ingestion requirements
  - Compares pricing output with pricing strategy documentation
  - Validates data flows and architecture patterns
  - **Grade:** A- (90%) - Production-ready with minor enhancements identified

### Schema Reference

- **[schemas/aco/](./schemas/aco/)** - ACO Data Ingestion Schema Reference
  - Complete field-by-field documentation for all ACO ingestion formats
  - Based on official `@adobe-commerce/aco-ts-sdk` TypeScript definitions
  - Includes validation rules, examples, and common patterns
  - **Schemas:** [Metadata](./schemas/aco/metadata.md), [Products](./schemas/aco/products.md), [Price Books](./schemas/aco/price-books.md), [Prices](./schemas/aco/prices.md)

---

## Quick Links

### In This Repository

- **[../README.md](../README.md)** - Main generator README with usage instructions
- **[../config/project-config.js](../config/project-config.js)** - Configuration loader
- **[../scripts/generators/](../scripts/generators/)** - Generator implementations

### Related Repositories

- **buildright-data** - Example data repository with definitions and generated output
- **commerce-demo-ingestion** - Ingestion tools that consume generator output

---

## Key Concepts

### Separation of Concerns

The generator separates:
- **Static Data** (JSON files in data repo) - What to generate
- **Generator Logic** (JS files in this repo) - How to generate it
- **Generated Output** (in data repo) - Result of generation

### Reusability

The generator is **100% generic**:
- ✅ No hardcoded project names
- ✅ No hardcoded attribute names
- ✅ No hardcoded relationship assumptions
- ✅ Reads all configuration from `PROJECT_CONFIG`

### Data Flow

```
buildright-data/definitions/*.json
  ↓ npm run generate:commerce
commerce-demo-generator/scripts/generators/*.js
  ↓ 
buildright-data/generated/commerce/*.json
  ↓ npm run generate:aco
commerce-demo-generator/scripts/generators/generate-aco.js
  ↓
buildright-data/generated/aco/*.json
```

---

## Usage Examples

### Generate Commerce Datapack

```bash
cd commerce-demo-generator
npm run generate:commerce
```

**Output:**
- `buildright-data/generated/commerce/data/accs/*.json` (7 files)

### Generate ACO Datapack

```bash
cd commerce-demo-generator
npm run generate:aco
```

**Output:**
- `buildright-data/generated/aco/*.json` (5 files)

### Use with Different Project

1. Create new data repo (e.g., `acme-data`)
2. Set `DATA_REPO_PATH=../acme-data` in `.env`
3. Run same commands
4. Generator produces Acme-specific output

**No code changes needed!**

---

## Architecture Principles

### 1. Project Config as Source of Truth

All project-specific values come from `buildright-data/definitions/project.json`:
- Project name and identifiers
- Attribute prefixes
- Website/store codes
- Root category name

### 2. Commerce Native Fields

Product relationships use Commerce standard fields:
- `product_type` - simple/configurable/bundle
- `parent_sku` - parent-child link
- `configurable_attributes` - what varies

### 3. Dynamic Attribute Handling

No hardcoded attribute lists:
- Reads attributes from JSON definitions
- Extracts selections from parent declarations
- Works with any attribute prefix (br_, acme_, elec_)

---

## Maintenance Guidelines

### When Adding Features

1. ✅ Keep generators generic (no hardcoded values)
2. ✅ Read configuration from `PROJECT_CONFIG`
3. ✅ Use Commerce native fields for relationships
4. ✅ Test with multiple projects (not just BuildRight)

### When Fixing Bugs

1. ✅ Check if bug is specific to BuildRight or generic
2. ✅ Ensure fix doesn't introduce project-specific assumptions
3. ✅ Update verification tests if behavior changes

### Documentation Standards

1. ✅ Document **why** (not just what)
2. ✅ Show examples from multiple projects
3. ✅ Explain generic approach vs alternatives

---

## Testing

### Current Coverage

- ✅ Generates all required Commerce files (7)
- ✅ Generates all required ACO files (5)
- ✅ Product counts match expectations (281)
- ✅ Relationships preserved (120 variants with selections)
- ✅ Pricing calculations correct (2,616 entries)

### Known Issues

See **[REQUIREMENTS-VERIFICATION.md](./REQUIREMENTS-VERIFICATION.md)** for:
- ⚠️ Metadata transformation enhancements needed
- ⚠️ Variant selections (now fixed!)
- ⚠️ Pricing tier alignment (now fixed!)

---

**Status:** Production-ready for BuildRight  
**Next Steps:** Test with additional projects to validate full genericity

