/**
 * Description Generator
 * Generates unique, realistic product descriptions based on product attributes
 * Makes each product description unique and compelling
 */

/**
 * Generate full product description
 */
export function generateProductDescription(product, template, category, subcategory) {
  const generators = {
    lumber: generateLumberDescription,
    sheathing: generateSheathingDescription,
    windows: generateWindowDescription,
    doors: generateDoorDescription,
    nails: generateFastenerDescription,
    screws: generateFastenerDescription,
    bolts: generateFastenerDescription,
    drywall: generateDrywallDescription,
    studs: generateStudDescription,
    insulation: generateInsulationDescription,
    flooring: generateFlooringDescription,
    paint: generatePaintDescription,
    lighting: generateLightingDescription,
    plumbing: generatePlumbingDescription,
    concrete: generateConcreteDescription,
    rebar: generateRebarDescription,
    shingles: generateRoofingDescription,
    underlayment: generateUnderlaymentDescription,
    siding: generateSidingDescription,
    decking: generateDeckingDescription,
    safety: generateSafetyDescription,
    electrical_boxes: generateElectricalDescription,
    wiring: generateElectricalDescription,
    switches: generateElectricalDescription,
    hvac: generateHVACDescription
  };
  
  const generator = generators[subcategory] || generateGenericDescription;
  return generator(product, template);
}

/**
 * Generate short description (summary)
 */
export function generateShortDescription(product, template, category, subcategory) {
  const generators = {
    lumber: generateLumberShort,
    sheathing: generateSheathingShort,
    windows: generateWindowShort,
    doors: generateDoorShort,
    nails: generateFastenerShort,
    screws: generateFastenerShort,
    bolts: generateFastenerShort,
    drywall: generateDrywallShort,
    insulation: generateInsulationShort,
    paint: generatePaintShort,
    lighting: generateLightingShort,
    plumbing: generatePlumbingShort,
    concrete: generateConcreteShort
  };
  
  const generator = generators[subcategory] || generateGenericShort;
  return generator(product, template);
}

// ==================== LUMBER ====================

function generateLumberDescription(product, template) {
  const qualityText = getQualityDescription(product.br_quality_tier);
  const dimensionText = product.br_lumber_dimension && product.br_lumber_length 
    ? `Actual dimensions: ${product.br_lumber_dimension} x ${product.br_lumber_length}.`
    : '';
  const deckText = product.br_deck_compatible 
    ? ` Ideal for deck framing and outdoor structures.`
    : '';
  
  return `${product.br_brand} ${template.name} delivers exceptional ${product.br_quality_tier} quality for ${product.br_construction_phase} applications. ${qualityText} ${dimensionText}${deckText} Kiln-dried for dimensional stability and minimal warping. Meets or exceeds industry standards for residential and commercial construction. Perfect for wall framing, floor joists, and structural applications where strength and reliability matter.`;
}

function generateLumberShort(product, template) {
  return `${product.br_brand} ${template.name} - ${product.br_quality_tier} lumber for ${product.br_construction_phase}. Kiln-dried for stability.`;
}

// ==================== SHEATHING ====================

function generateSheathingDescription(product, template) {
  const location = product.br_sheathing_location 
    ? `Engineered for ${product.br_sheathing_location} sheathing applications.`
    : 'Versatile sheathing solution for multiple applications.';
  
  return `${product.br_brand} ${template.name} provides superior structural performance and moisture resistance. ${location} Precision-manufactured for consistent thickness and strength. Tongue-and-groove edges ensure tight joints and easy installation. Treated for enhanced durability in demanding construction environments. Ideal for subfloors, roof decking, and wall sheathing.`;
}

function generateSheathingShort(product, template) {
  return `Structural ${product.br_sheathing_location || 'panel'} sheathing with superior strength. Moisture-resistant.`;
}

// ==================== WINDOWS ====================

function generateWindowDescription(product, template) {
  const glazingText = product.br_window_glazing_type 
    ? `${product.br_window_glazing_type.replace(/_/g, '-')} glazing`
    : 'energy-efficient glazing';
  const materialText = product.br_window_material 
    ? `${product.br_window_material} frame`
    : 'durable frame';
  const operationType = product.br_window_operation_type 
    ? product.br_window_operation_type.replace(/_/g, ' ')
    : 'window';
  
  // Add variety based on quality tier
  const performanceNote = product.br_quality_tier === 'Premium'
    ? ' Premium-grade seals and hardware ensure decades of smooth operation.'
    : product.br_quality_tier === 'Professional'
    ? ' Commercial-grade components withstand years of daily use.'
    : ' Reliable performance backed by industry-leading warranty.';
  
  // Add variety based on size
  const sizeNote = template.name.includes('36')
    ? ' Standard 36-inch width provides excellent natural light.'
    : template.name.includes('48')
    ? ' Expansive 48-inch width maximizes views and ventilation.'
    : '';
  
  return `${product.br_brand} ${template.name} combines energy efficiency with classic styling. Features ${glazingText} that blocks harmful UV rays while reducing energy costs by up to 30%. The ${materialText} construction requires minimal maintenance and resists warping, cracking, and fading in all weather conditions.${performanceNote}${sizeNote} ENERGY STAR certified for superior thermal performance. Professional-grade weatherstripping ensures draft-free operation.`;
}

function generateWindowShort(product, template) {
  const glazing = product.br_window_glazing_type ? product.br_window_glazing_type.replace(/_/g, '-') : 'energy-efficient';
  return `${glazing} ${product.br_window_operation_type || 'window'} with ${product.br_window_material} frame. ENERGY STAR certified.`;
}

// ==================== DOORS ====================

function generateDoorDescription(product, template) {
  const doorType = product.br_door_type ? product.br_door_type.replace(/_/g, ' ') : '';
  const material = product.br_door_material ? `${product.br_door_material} construction` : 'durable construction';
  const coreType = product.br_door_core_type 
    ? `Features ${product.br_door_core_type.replace(/_/g, ' ')} core for ${getCoreDescription(product.br_door_core_type)}.`
    : 'Engineered for maximum durability.';
  
  // Add variety based on product name
  const sizeNote = template.name.includes('36') 
    ? ' Standard 36-inch width fits most residential openings.'
    : template.name.includes('32')
    ? ' Compact 32-inch width ideal for secondary rooms.'
    : template.name.includes('60')
    ? ' Generous 60-inch opening creates dramatic entry.'
    : '';
  
  return `${product.br_brand} ${template.name} features ${material} for lasting beauty and performance. ${coreType}${sizeNote} Pre-drilled for standard hardware installation. Factory-primed finish is ready for painting or staining to match your design aesthetic. Meets ANSI/WDMA standards for quality and performance. Ideal for both new construction and replacement applications.`;
}

function generateDoorShort(product, template) {
  return `${product.br_door_material || 'Premium'} ${product.br_door_type || 'door'} with ${product.br_door_core_type?.replace(/_/g, ' ') || 'durable'} core. Ready for installation.`;
}

function getCoreDescription(coreType) {
  const descriptions = {
    'hollow_core': 'lightweight handling and economical installation',
    'solid_wood': 'maximum sound insulation and security',
    'polyurethane_foam': 'superior insulation and energy efficiency',
    'particle_board': 'solid feel and enhanced sound dampening'
  };
  return descriptions[coreType] || 'reliable performance';
}

// ==================== FASTENERS ====================

function generateFastenerDescription(product, template) {
  const fastenerType = product.br_fastener_type || 'fastener';
  const subtype = product.br_fastener_subtype 
    ? product.br_fastener_subtype.replace(/_/g, ' ')
    : fastenerType;
  
  // Add variety based on quality tier
  const qualityNote = product.br_quality_tier === 'Premium' 
    ? ' Premium-grade steel alloy ensures maximum durability.'
    : product.br_quality_tier === 'Professional'
    ? ' Professional-grade construction for demanding applications.'
    : ' Reliable performance for everyday construction needs.';
  
  return `${product.br_brand} ${template.name} delivers fast, reliable fastening performance.${qualityNote} Hot-dip galvanized coating provides superior rust resistance for both interior and exterior applications. Full round head design maximizes holding power and prevents pull-through on structural connections. Compatible with both pneumatic nailers and hand driving. Manufactured from high-carbon steel for consistent performance. Meets ASTM F1667 specifications for quality and strength. Approximately ${getApproximateCount(template.name)} pieces per package.`;
}

function generateFastenerShort(product, template) {
  const subtype = product.br_fastener_subtype?.replace(/_/g, ' ') || product.br_fastener_type;
  return `Hot-dip galvanized ${subtype}s. Compatible with pneumatic nailers. High-carbon steel.`;
}

function getApproximateCount(name) {
  if (name.includes('50lb')) return '2,800-3,000';
  if (name.includes('25lb')) return '1,400-1,500';
  if (name.includes('5lb')) return '280-300';
  if (name.includes('1lb')) return '55-60';
  return 'multiple';
}

// ==================== DRYWALL ====================

function generateDrywallDescription(product, template) {
  const thickness = product.br_drywall_thickness 
    ? `${product.br_drywall_thickness}"`
    : 'standard thickness';
  
  const phaseText = product.br_construction_phase ? product.br_construction_phase : 'Interior finish';
  
  return `${product.br_brand} ${thickness} drywall provides smooth, professional finish for interior wall and ceiling applications. Precision-manufactured gypsum core wrapped in heavy-duty paper facing for superior joint adhesion. Tapered edges simplify taping and finishing for seamless results. Lightweight design reduces installer fatigue without sacrificing strength. Meets ASTM C1396 specifications for performance and fire resistance. Each 4'x8' sheet covers 32 square feet. Ideal for ${phaseText} in residential and commercial projects.`;
}

function generateDrywallShort(product, template) {
  return `${product.br_drywall_thickness || 'Standard'}" drywall for smooth finish. Tapered edges, easy finishing. 32 sq ft coverage.`;
}

// ==================== STUD FRAMING ====================

function generateStudDescription(product, template) {
  return `${product.br_brand} ${template.name} provides reliable structural support for wall framing systems. Precision-cut to exact length for consistent quality. Grade-stamped for easy inspection and code compliance. Straight grain minimizes twisting and warping during construction. Ideal for interior partitions, load-bearing walls, and commercial framing applications. Meets building code requirements for structural lumber.`;
}

// ==================== INSULATION ====================

function generateInsulationDescription(product, template) {
  const rValue = product.br_insulation_r_value 
    ? product.br_insulation_r_value.toUpperCase()
    : 'high R-value';
  const insulationType = product.br_insulation_type 
    ? product.br_insulation_type.replace(/_/g, ' ')
    : 'insulation';
  
  return `${product.br_brand} ${insulationType} delivers ${rValue} thermal performance for energy-efficient buildings. Pre-cut batts fit snugly between standard stud spacing, eliminating gaps and thermal bridges. Formaldehyde-free composition ensures healthy indoor air quality. Easy to handle and install with standard safety equipment. Reduces heating and cooling costs by up to 30%. Fire-resistant treatment provides added safety. Ideal for walls, attics, and floor cavities. Made with recycled content for environmental responsibility.`;
}

function generateInsulationShort(product, template) {
  const rValue = product.br_insulation_r_value?.toUpperCase() || 'High R-value';
  return `${rValue} ${product.br_insulation_type?.replace(/_/g, ' ') || 'insulation'}. Formaldehyde-free, easy to install.`;
}

// ==================== FLOORING ====================

function generateFlooringDescription(product, template) {
  return `${product.br_brand} ${template.name} combines beauty and durability for lasting performance. Precision-milled for tight joints and professional installation. Pre-finished surface requires no sanding or sealing. Scratch and stain resistant coating protects against daily wear. Easy to clean and maintain with standard household products. Backed by manufacturer warranty. Ideal for living rooms, bedrooms, hallways, and light commercial spaces.`;
}

// ==================== PAINT ====================

function generatePaintDescription(product, template) {
  const paintType = product.br_paint_type 
    ? product.br_paint_type.toLowerCase().includes('interior') ? 'interior' : 'exterior'
    : 'premium';
  const finish = product.br_paint_finish || 'finish';
  
  return `${product.br_brand} ${paintType} paint in ${finish} finish provides professional coverage with excellent durability. Advanced latex formula flows smoothly for even application and minimal brush marks. Low-VOC composition ensures healthier indoor air quality. Mildew-resistant treatment prevents growth in high-moisture areas. Superior hide covers existing colors in fewer coats, saving time and money. Approximately 350-400 square feet coverage per gallon. Dries to touch in 1 hour, ready for second coat in 4 hours. Clean up easily with soap and water. Available in thousands of custom colors.`;
}

function generatePaintShort(product, template) {
  const paintType = product.br_paint_type?.toLowerCase().includes('interior') ? 'Interior' : 'Exterior';
  return `${paintType} paint in ${product.br_paint_finish || 'finish'}. Low-VOC, 350-400 sq ft coverage per gallon.`;
}

// ==================== LIGHTING ====================

function generateLightingDescription(product, template) {
  const lightType = product.br_light_type 
    ? product.br_light_type.replace(/_/g, ' ')
    : 'light fixture';
  const technology = product.br_light_technology || 'LED';
  
  return `${product.br_brand} ${lightType} fixture features ${technology.toUpperCase()} technology for energy-efficient illumination. Provides bright, even light distribution while using up to 80% less energy than incandescent bulbs. Long-lasting LED modules deliver 50,000+ hours of maintenance-free operation. Easy installation with standard electrical connections. Dimmable for custom ambiance control. UL-listed for safety and code compliance. Modern design complements any décor style. Ideal for residential and light commercial applications.`;
}

function generateLightingShort(product, template) {
  return `${product.br_light_technology?.toUpperCase() || 'LED'} ${product.br_light_type?.replace(/_/g, ' ') || 'fixture'}. Energy-efficient, 50,000+ hour lifespan. Dimmable.`;
}

// ==================== PLUMBING ====================

function generatePlumbingDescription(product, template) {
  const fixtureType = product.br_fixture_type || 'fixture';
  const location = product.br_fixture_location || 'installation';
  
  return `${product.br_brand} ${location} ${fixtureType} combines style and functionality with professional-grade construction. Solid brass waterways ensure leak-free performance and corrosion resistance. Ceramic disc cartridge provides smooth, drip-free operation for years of reliable service. Premium finish resists tarnishing, corrosion, and flaking. ADA-compliant lever handles offer easy operation. WaterSense certified for water conservation without sacrificing performance. Includes all necessary mounting hardware for quick installation. Limited lifetime warranty on finish and function.`;
}

function generatePlumbingShort(product, template) {
  return `${product.br_fixture_location || 'Premium'} ${product.br_fixture_type || 'fixture'}. Solid brass, ceramic disc, lifetime warranty.`;
}

// ==================== CONCRETE ====================

function generateConcreteDescription(product, template) {
  const concreteType = product.br_concrete_type 
    ? product.br_concrete_type.replace(/_/g, ' ')
    : 'concrete mix';
  
  const phaseText = product.br_construction_phase ? product.br_construction_phase : 'Foundation & framing';
  
  return `${product.br_brand} ${concreteType} delivers reliable strength for ${phaseText} applications. Precision-blended aggregates and Portland cement ensure consistent performance. High early strength development allows faster construction schedules. Meets ASTM C387 specifications for quality and performance. Just add water and mix to achieve workable consistency. Ideal for footings, foundations, slabs, and structural concrete work. Each bag yields approximately 0.45 cubic feet of mixed concrete.`;
}

function generateConcreteShort(product, template) {
  return `${product.br_concrete_type?.replace(/_/g, ' ') || 'Concrete'} mix. High early strength, ASTM C387 compliant. Just add water.`;
}

// ==================== REBAR ====================

function generateRebarDescription(product, template) {
  return `${product.br_brand} ${template.name} provides tensile reinforcement for concrete structures. High-strength steel resists deformation under load. Deformed surface pattern ensures superior concrete bond. Meets ASTM A615 Grade 60 specifications for yield strength. Mill-certified for quality assurance and code compliance. Ideal for footings, foundations, walls, and structural concrete applications. Prevents cracking and enhances load-bearing capacity.`;
}

// ==================== ROOFING ====================

function generateRoofingDescription(product, template) {
  const material = product.br_roofing_material 
    ? product.br_roofing_material.replace(/_/g, ' ')
    : 'asphalt';
  const style = product.br_roofing_style || 'architectural';
  
  // Add variety based on quality tier
  const warrantyNote = product.br_quality_tier === 'Premium'
    ? ' Limited lifetime warranty with transferable coverage.'
    : product.br_quality_tier === 'Professional'
    ? ' 50-year limited warranty provides long-term protection.'
    : ' 30-year limited warranty ensures lasting value.';
  
  // Add variety based on brand
  const windNote = product.br_brand.includes('Summit') || product.br_brand.includes('Vertex')
    ? ' Enhanced wind resistance up to 130 mph.'
    : ' Wind-resistant design withstands up to 110 mph winds.';
  
  return `${product.br_brand} ${template.name} offers superior weather protection with architectural styling. Heavy-duty fiberglass mat reinforced with premium asphalt provides excellent tear strength.${windNote} Class A fire rating delivers maximum protection. Algae-resistant granules prevent unsightly staining in humid climates. Advanced sealant activates in sunlight for secure bonding.${warrantyNote} UL2218 Class 4 impact-resistant rated.`;
}

// ==================== UNDERLAYMENT ====================

function generateUnderlaymentDescription(product, template) {
  const type = product.br_underlayment_type || 'synthetic';
  
  // Add variety based on quality and brand
  const strengthNote = product.br_quality_tier === 'Premium'
    ? ' High-tensile strength withstands extreme weather and installer traffic.'
    : product.br_quality_tier === 'Professional'
    ? ' Commercial-grade strength resists tears and punctures.'
    : ' Reliable tear resistance for residential applications.';
  
  const coverageNote = template.name.includes('10')
    ? ' Each roll covers 1000 square feet.'
    : ' Standard coverage for typical roof applications.';
  
  return `${product.br_brand} ${template.name} provides critical waterproof barrier beneath roofing materials. Synthetic construction offers superior durability compared to traditional felt paper.${strengthNote} UV-resistant surface allows up to 6 months of exposure during construction. Slip-resistant texture improves installer safety on steep slopes. Lightweight rolls are easier to handle and install.${coverageNote} Meets ICC-ES acceptance criteria for roofing underlayment.`;
}

// ==================== SIDING ====================

function generateSidingDescription(product, template) {
  const material = product.br_siding_material || 'siding';
  
  return `${product.br_brand} ${material.replace(/_/g, ' ')} siding delivers lasting curb appeal with minimal maintenance. Engineered for dimensional stability in all climates. Resists moisture, insects, and rot better than traditional wood. Factory-applied finish eliminates need for painting. Interlocking design creates weathertight seal against wind and rain. Backed by 30-year transferable warranty. Available in multiple colors and styles. Meets building codes for exterior cladding applications.`;
}

// ==================== DECKING ====================

function generateDeckingDescription(product, template) {
  return `${product.br_brand} ${template.name} combines natural beauty with lasting durability for outdoor living spaces. Pressure-treated for rot and insect resistance. Four-sided surfacing provides smooth, splinter-free finish. Pre-grooved edges compatible with hidden fastener systems. Ideal for deck floors, railings, and benches. Backed by limited warranty against rot and termite damage. Accepts stains and sealers for custom appearance. Meets building codes for residential deck construction.`;
}

// ==================== SAFETY / PPE ====================

function generateSafetyDescription(product, template) {
  return `${product.br_brand} ${template.name} provides essential protection for construction and industrial environments. Meets or exceeds ANSI safety standards for workplace protection. Durable construction withstands daily wear and harsh conditions. Comfortable fit reduces fatigue during extended use. Easy to clean and maintain. Approved for OSHA-regulated worksites. Essential safety equipment for contractors, builders, and maintenance professionals.`;
}

// ==================== ELECTRICAL ====================

function generateElectricalDescription(product, template) {
  return `${product.br_brand} ${template.name} delivers reliable electrical performance for residential and commercial wiring systems. UL-listed for safety and code compliance. Durable construction withstands installation stress. Easy wire termination saves installation time. Meets NEC requirements for electrical installations. Backed by manufacturer warranty. Compatible with standard electrical devices and fixtures.`;
}

// ==================== HVAC ====================

function generateHVACDescription(product, template) {
  return `${product.br_brand} ${template.name} provides efficient climate control for residential and commercial spaces. High-efficiency design reduces energy costs. Quiet operation ensures comfortable environment. Professional-grade construction ensures lasting performance. AHRI-certified for performance and efficiency. Easy installation with standard HVAC connections. Backed by comprehensive warranty. Ideal for new construction and replacement applications.`;
}

// ==================== GENERIC FALLBACK ====================

function generateGenericDescription(product, template) {
  return `${product.br_brand} ${template.name} delivers professional-grade performance for ${product.br_construction_phase} applications. Engineered for reliability and long-term performance in demanding construction environments. Meets or exceeds industry standards for quality and safety. Trusted by contractors and builders for consistent results. Ideal for residential and commercial construction projects.`;
}

function generateGenericShort(product, template) {
  return `Professional-grade ${template.name} for ${product.br_construction_phase}. Reliable performance.`;
}

// ==================== HELPER FUNCTIONS ====================

function getQualityDescription(tier) {
  const descriptions = {
    'Builder grade': 'Reliable performance for value-conscious projects.',
    'Professional': 'Premium quality for demanding professional applications.',
    'Premium': 'Top-tier quality for the most discerning builders and architects.',
    'Luxury': 'Exceptional quality for the most exclusive projects.'
  };
  return descriptions[tier] || 'Quality construction material.';
}

