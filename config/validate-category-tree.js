/**
 * Category Tree Validation
 * 
 * Ensures the category-tree.json maintains the fixed taxonomy defined in Phase 0.5.
 * This prevents accidental changes during data regeneration.
 * 
 * Reference: buildright-eds/docs/implementation/sarah-end-to-end/features/PRODUCT-CATEGORY-TAXONOMY-MAPPING.md
 */

/**
 * Fixed category taxonomy as of Phase 0.5 (November 2024)
 * This structure should NEVER change without explicit approval
 */
export const FIXED_CATEGORY_TAXONOMY = {
  name: 'BuildRight Catalog',
  children: [
    {
      name: 'Structural Materials',
      urlKey: 'structural-materials',
      children: [
        { name: 'Lumber', urlKey: 'lumber' },
        { name: 'Plywood & Sheathing', urlKey: 'plywood-sheathing' },
        { name: 'Concrete & Foundation', urlKey: 'concrete-foundation' }
      ]
    },
    {
      name: 'Framing & Drywall',
      urlKey: 'framing-drywall',
      children: [
        { name: 'Metal Studs & Track', urlKey: 'metal-studs-track' },
        { name: 'Drywall', urlKey: 'drywall' },
        { name: 'Insulation', urlKey: 'insulation' },
        { name: 'Flooring', urlKey: 'flooring' },
        { name: 'Paint', urlKey: 'paint' }
      ]
    },
    {
      name: 'Windows & Doors',
      urlKey: 'windows-doors',
      children: [
        { name: 'Windows', urlKey: 'windows' },
        { name: 'Doors', urlKey: 'doors' },
        { name: 'Lighting', urlKey: 'lighting' },
        { name: 'Kitchen Appliances', urlKey: 'kitchen-appliances' }
      ]
    },
    {
      name: 'Fasteners & Hardware',
      urlKey: 'fasteners-hardware',
      children: [
        { name: 'Nails', urlKey: 'nails' },
        { name: 'Screws', urlKey: 'screws' },
        { name: 'Wiring', urlKey: 'wiring' },
        { name: 'Devices', urlKey: 'devices' },
        { name: 'Panels', urlKey: 'panels' },
        { name: 'Water Supply', urlKey: 'water-supply' },
        { name: 'Drain & Waste', urlKey: 'drain-waste' },
        { name: 'Fittings', urlKey: 'fittings' }
      ]
    },
    {
      name: 'Roofing',
      urlKey: 'roofing',
      children: [
        { name: 'Shingles', urlKey: 'shingles' },
        { name: 'Underlayment', urlKey: 'underlayment' },
        { name: 'Siding', urlKey: 'siding' },
        { name: 'Plumbing Fixtures', urlKey: 'plumbing-fixtures' },
        { name: 'HVAC Units', urlKey: 'hvac-units' },
        { name: 'Ductwork', urlKey: 'ductwork' },
        { name: 'Vents & Thermostats', urlKey: 'vents-thermostats' }
      ]
    }
  ]
};

/**
 * Validate that the loaded category tree matches the fixed taxonomy
 * @param {Object} categoryTree - The loaded category tree from category-tree.json
 * @throws {Error} If validation fails
 */
export function validateCategoryTree(categoryTree) {
  const errors = [];
  
  // Check root name
  if (categoryTree.name !== FIXED_CATEGORY_TAXONOMY.name) {
    errors.push(`Root category name mismatch: expected "${FIXED_CATEGORY_TAXONOMY.name}", got "${categoryTree.name}"`);
  }
  
  // Check number of top-level categories
  const expectedCount = FIXED_CATEGORY_TAXONOMY.children.length;
  const actualCount = categoryTree.children?.length || 0;
  
  if (actualCount !== expectedCount) {
    errors.push(`Top-level category count mismatch: expected ${expectedCount}, got ${actualCount}`);
  }
  
  // Check each top-level category
  if (categoryTree.children) {
    FIXED_CATEGORY_TAXONOMY.children.forEach((expectedCategory, index) => {
      const actualCategory = categoryTree.children[index];
      
      if (!actualCategory) {
        errors.push(`Missing category at index ${index}: expected "${expectedCategory.name}"`);
        return;
      }
      
      // Check name
      if (actualCategory.name !== expectedCategory.name) {
        errors.push(`Category name mismatch at index ${index}: expected "${expectedCategory.name}", got "${actualCategory.name}"`);
      }
      
      // Check urlKey
      if (actualCategory.urlKey !== expectedCategory.urlKey) {
        errors.push(`Category urlKey mismatch for "${expectedCategory.name}": expected "${expectedCategory.urlKey}", got "${actualCategory.urlKey}"`);
      }
      
      // Check subcategories
      const expectedSubCount = expectedCategory.children?.length || 0;
      const actualSubCount = actualCategory.children?.length || 0;
      
      if (expectedSubCount !== actualSubCount) {
        errors.push(`Subcategory count mismatch for "${expectedCategory.name}": expected ${expectedSubCount}, got ${actualSubCount}`);
      }
      
      // Check each subcategory
      if (expectedCategory.children && actualCategory.children) {
        expectedCategory.children.forEach((expectedSub, subIndex) => {
          const actualSub = actualCategory.children[subIndex];
          
          if (!actualSub) {
            errors.push(`Missing subcategory for "${expectedCategory.name}" at index ${subIndex}: expected "${expectedSub.name}"`);
            return;
          }
          
          if (actualSub.name !== expectedSub.name) {
            errors.push(`Subcategory name mismatch for "${expectedCategory.name}": expected "${expectedSub.name}", got "${actualSub.name}"`);
          }
          
          if (actualSub.urlKey !== expectedSub.urlKey) {
            errors.push(`Subcategory urlKey mismatch for "${expectedCategory.name} > ${expectedSub.name}": expected "${expectedSub.urlKey}", got "${actualSub.urlKey}"`);
          }
        });
      }
    });
  }
  
  // Throw if any errors found
  if (errors.length > 0) {
    throw new Error(
      `Category tree validation failed:\n\n` +
      errors.map(e => `  ❌ ${e}`).join('\n') +
      `\n\nThe category taxonomy is FIXED as of Phase 0.5 and should not be modified.\n` +
      `See: buildright-eds/docs/implementation/sarah-end-to-end/features/PRODUCT-CATEGORY-TAXONOMY-MAPPING.md\n` +
      `\nTo make changes, update FIXED_CATEGORY_TAXONOMY in validate-category-tree.js first.`
    );
  }
  
  return true;
}

/**
 * Get a summary of the category structure
 * @param {Object} categoryTree - The category tree
 * @returns {Object} Summary statistics
 */
export function getCategorySummary(categoryTree) {
  let topLevelCount = 0;
  let subcategoryCount = 0;
  let totalCount = 0;
  
  if (categoryTree.children) {
    topLevelCount = categoryTree.children.length;
    totalCount += topLevelCount;
    
    categoryTree.children.forEach(category => {
      if (category.children) {
        const subCount = category.children.length;
        subcategoryCount += subCount;
        totalCount += subCount;
      }
    });
  }
  
  return {
    topLevelCount,
    subcategoryCount,
    totalCount,
    categories: categoryTree.children?.map(c => ({
      name: c.name,
      urlKey: c.urlKey,
      subcategories: c.children?.length || 0
    })) || []
  };
}

