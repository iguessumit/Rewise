/* chapters-data.js - built-in JEE chapter list (Physics, Chemistry, Maths) covering Main and Advanced.
   Edit names here if you want to correct them. After changing this file, raise the number in version.js.
   New names are added automatically; chapters you already have (and any you hid) are never overwritten. */
(function () {
  var RQ = (window.RQ = window.RQ || {});
  RQ.BUILTIN = {
    Physics: [
      { group: 'Class 11 - Mechanics', items: [
        'Units and Measurements', 'Kinematics (1D and 2D Motion)', 'Laws of Motion and Friction',
        'Work, Energy and Power', 'Center of Mass and Collisions', 'Rotational Motion',
        'Gravitation', 'Mechanical Properties of Solids', 'Mechanical Properties of Fluids'] },
      { group: 'Class 11 - Heat and Waves', items: [
        'Thermal Properties of Matter and Calorimetry', 'Heat Transfer and Thermal Expansion',
        'Thermodynamics', 'Kinetic Theory of Gases', 'Oscillations (SHM)', 'Waves and Sound'] },
      { group: 'Class 12 - Electricity and Magnetism', items: [
        'Electrostatics', 'Electric Potential and Capacitance', 'Current Electricity',
        'Moving Charges and Magnetism', 'Magnetism and Matter', 'Electromagnetic Induction',
        'Alternating Current', 'Electromagnetic Waves'] },
      { group: 'Class 12 - Optics and Modern Physics', items: [
        'Ray Optics and Optical Instruments', 'Wave Optics', 'Dual Nature of Matter and Radiation',
        'Atoms', 'Nuclei', 'Semiconductor Electronics', 'Communication Systems'] },
      { group: 'Practical', items: ['Experimental Skills'] }
    ],
    Chemistry: [
      { group: 'Physical Chemistry', items: [
        'Some Basic Concepts of Chemistry (Mole Concept)', 'Atomic Structure', 'States of Matter (Gases and Liquids)',
        'Chemical Thermodynamics', 'Chemical Equilibrium', 'Ionic Equilibrium', 'Redox Reactions',
        'Solutions', 'Electrochemistry', 'Chemical Kinetics', 'Solid State', 'Surface Chemistry', 'Nuclear Chemistry'] },
      { group: 'Inorganic Chemistry', items: [
        'Classification of Elements and Periodicity', 'Chemical Bonding and Molecular Structure',
        'Hydrogen', 's-Block Elements', 'p-Block Elements (Groups 13 and 14)', 'p-Block Elements (Groups 15 to 18)',
        'd- and f-Block Elements', 'Coordination Compounds', 'General Principles of Metallurgy',
        'Environmental Chemistry', 'Qualitative Salt Analysis'] },
      { group: 'Organic Chemistry', items: [
        'Basic Principles and General Organic Chemistry (GOC)', 'Isomerism', 'Hydrocarbons (Alkanes, Alkenes, Alkynes)',
        'Aromatic Hydrocarbons', 'Haloalkanes and Haloarenes', 'Alcohols, Phenols and Ethers',
        'Aldehydes and Ketones', 'Carboxylic Acids and Derivatives', 'Amines', 'Biomolecules',
        'Polymers', 'Chemistry in Everyday Life', 'Principles of Practical Chemistry'] }
    ],
    Maths: [
      { group: 'Algebra', items: [
        'Sets, Relations and Functions', 'Complex Numbers', 'Quadratic Equations and Inequalities',
        'Sequences and Series', 'Permutations and Combinations', 'Binomial Theorem',
        'Matrices and Determinants', 'Mathematical Reasoning'] },
      { group: 'Trigonometry', items: [
        'Trigonometric Ratios and Identities', 'Trigonometric Equations', 'Inverse Trigonometric Functions',
        'Properties of Triangles and Heights and Distances'] },
      { group: 'Coordinate Geometry', items: [
        'Straight Lines', 'Circles', 'Parabola', 'Ellipse', 'Hyperbola'] },
      { group: 'Calculus', items: [
        'Limits and Continuity', 'Differentiability and Differentiation', 'Applications of Derivatives',
        'Indefinite Integration', 'Definite Integration', 'Area Under Curves', 'Differential Equations'] },
      { group: 'Vectors, 3D and Probability', items: [
        'Vector Algebra', 'Three-Dimensional Geometry', 'Probability', 'Statistics'] }
    ]
  };
  RQ.SUBJECTS = ['Physics', 'Chemistry', 'Maths'];
})();
