/**
 * Standardized Diagnostic Lab Tests Catalog (Prompt 3.1 & Prompt 6.1)
 * Enforces standardized diagnostic test naming and physiological reference ranges across SAHAY modules.
 */

export const labCatalog = [
  {
    name: 'Fasting Blood Sugar',
    aliases: ['FBS', 'Fasting Blood Glucose', 'Fasting Sugar', 'Blood Sugar'],
    min: 70,
    max: 100,
    unit: 'mg/dL',
    normalRange: { min: 70, max: 100, unit: 'mg/dL' },
    category: 'Biochemistry',
  },
  {
    name: 'Blood Glucose (Fasting & PP)',
    aliases: ['Random Blood Sugar', 'Random Blood Sugar (RBS)', 'RBS', 'Blood Glucose', 'PPBS'],
    min: 70,
    max: 140,
    unit: 'mg/dL',
    normalRange: { min: 70, max: 140, unit: 'mg/dL' },
    category: 'Biochemistry',
  },
  {
    name: 'Complete Blood Count (CBC)',
    aliases: ['CBC', 'WBC', 'Full Blood Count'],
    min: 4.5,
    max: 11.0,
    unit: '10^3/µL',
    normalRange: { min: 4.5, max: 11.0, unit: '10^3/µL' },
    category: 'Hematology',
  },
  {
    name: 'Hemoglobin (Hb)',
    aliases: ['Hemoglobin', 'Hb'],
    min: 12.0,
    max: 17.5,
    unit: 'g/dL',
    normalRange: { min: 12.0, max: 17.5, unit: 'g/dL' },
    category: 'Hematology',
  },
  {
    name: 'Lipid Profile',
    aliases: ['Lipid Panel', 'Cholesterol'],
    min: 100,
    max: 200,
    unit: 'mg/dL',
    normalRange: { min: 100, max: 200, unit: 'mg/dL' },
    category: 'Biochemistry',
  },
  {
    name: 'ECG',
    aliases: ['Electrocardiogram', 'EKG'],
    min: null,
    max: null,
    unit: null,
    normalRange: null,
    category: 'Cardiology',
  },
  {
    name: 'Serum Creatinine',
    aliases: ['Creatinine', 'S. Creatinine', 'Serum Creat'],
    min: 0.6,
    max: 1.2,
    unit: 'mg/dL',
    normalRange: { min: 0.6, max: 1.2, unit: 'mg/dL' },
    category: 'Nephrology',
  },
  {
    name: 'HbA1c',
    min: 4.0,
    max: 5.6,
    unit: '%',
    normalRange: { min: 4.0, max: 5.6, unit: '%' },
    category: 'Biochemistry',
  },
  {
    name: 'Chest X-Ray',
    min: null,
    max: null,
    unit: null,
    normalRange: null,
    category: 'Radiology',
  },
  {
    name: 'Liver Function Test (LFT)',
    min: 10,
    max: 40,
    unit: 'U/L',
    normalRange: { min: 10, max: 40, unit: 'U/L' },
    category: 'Biochemistry',
  },
  {
    name: 'Kidney Function Test (KFT)',
    min: 15,
    max: 45,
    unit: 'mg/dL',
    normalRange: { min: 15, max: 45, unit: 'mg/dL' },
    category: 'Nephrology',
  },
  {
    name: 'Serum Electrolytes',
    min: 135,
    max: 145,
    unit: 'mEq/L',
    normalRange: { min: 135, max: 145, unit: 'mEq/L' },
    category: 'Biochemistry',
  },
  {
    name: 'Thyroid Profile (T3, T4, TSH)',
    min: 0.4,
    max: 4.0,
    unit: 'µIU/mL',
    normalRange: { min: 0.4, max: 4.0, unit: 'µIU/mL' },
    category: 'Endocrinology',
  },
  {
    name: 'Urine Routine & Microscopic',
    min: null,
    max: null,
    unit: null,
    normalRange: null,
    category: 'Pathology',
  },
  {
    name: 'Ultrasound Abdomen & Pelvis',
    min: null,
    max: null,
    unit: null,
    normalRange: null,
    category: 'Radiology',
  },
  {
    name: 'Widal Test',
    min: null,
    max: null,
    unit: null,
    normalRange: null,
    category: 'Microbiology',
  },
  {
    name: 'Malaria & Dengue Antigen',
    min: null,
    max: null,
    unit: null,
    normalRange: null,
    category: 'Microbiology',
  },
  {
    name: 'C-Reactive Protein (CRP)',
    min: 0,
    max: 10,
    unit: 'mg/L',
    normalRange: { min: 0, max: 10, unit: 'mg/L' },
    category: 'Immunology',
  },
  {
    name: 'Erythrocyte Sedimentation Rate (ESR)',
    min: 0,
    max: 20,
    unit: 'mm/hr',
    normalRange: { min: 0, max: 20, unit: 'mm/hr' },
    category: 'Hematology',
  },
  {
    name: 'Blood Urea Nitrogen (BUN)',
    min: 7,
    max: 20,
    unit: 'mg/dL',
    normalRange: { min: 7, max: 20, unit: 'mg/dL' },
    category: 'Nephrology',
  },
  {
    name: 'Urine Culture & Sensitivity',
    min: null,
    max: null,
    unit: null,
    normalRange: null,
    category: 'Microbiology',
  },
  {
    name: 'Sputum for AFB',
    min: null,
    max: null,
    unit: null,
    normalRange: null,
    category: 'Microbiology',
  },
  {
    name: 'Vitamin D & B12 Panel',
    min: 30,
    max: 100,
    unit: 'ng/mL',
    normalRange: { min: 30, max: 100, unit: 'ng/mL' },
    category: 'Biochemistry',
  },
  {
    name: 'Stool Routine & Occult Blood',
    min: null,
    max: null,
    unit: null,
    normalRange: null,
    category: 'Pathology',
  },
];

/** Helper to extract all valid catalog test names */
export const getCatalogTestNames = () =>
  labCatalog.map((t) => (typeof t === 'string' ? t : t.name));

/** Helper to look up a test definition by name (case-insensitive with aliases support) */
export const findCatalogTest = (testName) => {
  if (!testName) return null;
  const clean = String(testName).trim().toLowerCase();

  // 1. Direct match
  const directMatch = labCatalog.find(
    (t) => (typeof t === 'string' ? t : t.name).toLowerCase() === clean
  );
  if (directMatch) return directMatch;

  // 2. Match against aliases if available
  const aliasMatch = labCatalog.find((t) => {
    if (Array.isArray(t.aliases)) {
      return t.aliases.some((a) => a.toLowerCase() === clean);
    }
    return false;
  });
  if (aliasMatch) return aliasMatch;

  // 3. Substring / partial match (e.g., 'Fasting Blood Sugar' contains 'blood sugar' or vice versa)
  const partialMatch = labCatalog.find((t) => {
    const tName = (typeof t === 'string' ? t : t.name).toLowerCase();
    return (
      clean.includes(tName) ||
      tName.includes(clean) ||
      (Array.isArray(t.aliases) && t.aliases.some((a) => clean.includes(a.toLowerCase()) || a.toLowerCase().includes(clean)))
    );
  });

  return partialMatch || null;
};

// Polyfill includes on labCatalog array to accept both test objects and test name strings
const originalIncludes = labCatalog.includes.bind(labCatalog);
labCatalog.includes = function (item) {
  if (originalIncludes(item)) return true;
  if (typeof item === 'string') {
    return this.some((t) => {
      const name = typeof t === 'string' ? t : t.name;
      return name === item || (Array.isArray(t.aliases) && t.aliases.includes(item));
    });
  }
  return false;
};

export default labCatalog;
