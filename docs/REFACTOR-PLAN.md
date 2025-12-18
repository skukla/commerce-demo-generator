# Canonical Format Refactor - Implementation Plan

## Current State (Before)

```
products.js (generators) 
    ↓
generate-commerce.js → Commerce JSON
    ↓
generate-aco.js (reads Commerce JSON) → ACO JSON
```

**Problems:**
- ACO depends on Commerce format (brittle)
- Can't generate ACO without Commerce
- Transformation logic is nested/complex
- Hard to add new platforms

## Target State (After)

```
products.js + other generators
    ↓
generate-canonical.js → Canonical JSON
    ↓            ↓
generate-commerce  generate-aco
    ↓            ↓
Commerce JSON    ACO JSON
```

**Benefits:**
- Independent transformations
- Can generate any format without others
- Clean separation of concerns
- Easy to add new formats

## Implementation Steps

### Step 1: Create Canonical Generator ✅ (In Progress)
- **File**: `generators/generate-canonical.js`
- **Input**: Uses existing generator modules (products.js, categories.js, etc.)
- **Output**: `buildright-data/generated/canonical/datapack.json`
- **Actions**:
  - Adapt products.js logic to output canonical format
  - Adapt categories.js to output canonical format
  - Adapt attributes.js to output canonical format
  - Combine into single canonical datapack

### Step 2: Refactor Commerce Generator
- **File**: `generators/generate-commerce.js`
- **Input**: `buildright-data/generated/canonical/datapack.json`
- **Output**: `buildright-data/generated/commerce/**/*.json`
- **Actions**:
  - Read canonical datapack
  - Transform products → Commerce format
  - Transform categories → Commerce format
  - Transform attributes → Commerce format
  - Write Commerce JSON files

### Step 3: Refactor ACO Generator
- **File**: `generators/generate-aco.js`
- **Input**: `buildright-data/generated/canonical/datapack.json`
- **Output**: `buildright-data/generated/aco/**/*.json`
- **Actions**:
  - Read canonical datapack (NOT Commerce)
  - Transform products → ACO format
  - Transform categories → ACO format
  - Transform attributes → ACO metadata
  - Generate price books and prices
  - Write ACO JSON files

### Step 4: Update Scripts
- **File**: `package.json`
- **Changes**:
  ```json
  {
    "scripts": {
      "generate:canonical": "node generators/generate-canonical.js",
      "generate:commerce": "node generators/generate-commerce.js",
      "generate:aco": "node generators/generate-aco.js",
      "generate:all": "npm run generate:canonical && npm run generate:commerce && npm run generate:aco"
    }
  }
  ```

### Step 5: Testing
- Generate canonical format
- Generate Commerce from canonical
- Generate ACO from canonical
- Verify Commerce ingestion still works
- Verify ACO ingestion still works
- Compare output with previous version

## Migration Path

### Phase 1: Create Canonical (Non-Breaking)
- Add generate-canonical.js
- Keep existing generators working
- Test canonical output

### Phase 2: Update Commerce Generator
- Modify generate-commerce.js to read canonical
- Test Commerce ingestion
- Compare with old output

### Phase 3: Update ACO Generator
- Modify generate-aco.js to read canonical
- Test ACO ingestion
- Compare with old output

### Phase 4: Cleanup (Optional)
- Archive old generator logic
- Update documentation
- Celebrate! 🎉

## File Structure

```
commerce-demo-generator/
├── generators/
│   ├── generate-canonical.js    NEW - Core generator
│   ├── generate-commerce.js     MODIFIED - Transform canonical → Commerce
│   ├── generate-aco.js          MODIFIED - Transform canonical → ACO
│   ├── products.js              KEPT - Product definitions
│   ├── categories.js            KEPT - Category definitions
│   └── attributes.js            KEPT - Attribute definitions
├── docs/
│   ├── CANONICAL-FORMAT.md      NEW - Schema documentation
│   └── REFACTOR-PLAN.md         NEW - This file
└── package.json                 MODIFIED - Updated scripts

buildright-data/generated/
├── canonical/
│   └── datapack.json            NEW - Canonical format output
├── commerce/
│   └── ...                      EXISTING - Commerce format
└── aco/
    └── ...                      EXISTING - ACO format
```

## Rollback Plan

If something goes wrong:
1. Revert package.json scripts
2. Keep old generate-commerce.js and generate-aco.js
3. Canonical generator is additive, can be ignored

## Success Criteria

- [ ] Canonical format validates against schema
- [ ] Commerce output matches previous version (or improved)
- [ ] ACO output matches previous version (or improved)
- [ ] Commerce ingestion succeeds
- [ ] ACO ingestion succeeds
- [ ] Storefront displays products correctly
- [ ] All existing functionality works

## Timeline

Estimated: 2-3 hours for full implementation and testing
- Canonical generator: 45 min
- Commerce refactor: 30 min
- ACO refactor: 45 min
- Testing: 30 min
- Documentation: 30 min

