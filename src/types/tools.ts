export interface ToolInfo {
  id: string;
  path: string;
  title: string;
  description: string;
  icon: string; // key in components/ui/Icon.tsx
  group: 'main' | 'additional';
}

export const TOOLS: ToolInfo[] = [
  { id: 'point-conversion', path: '/point-conversion', title: 'Point Conversion', icon: 'swap', group: 'main',
    description: 'Convert points between Cartesian, cylindrical and spherical coordinates.' },
  { id: 'point-operations', path: '/point-operations', title: 'Point Operations', icon: 'dots', group: 'main',
    description: 'Distance, midpoint, position vector and coordinate arithmetic.' },
  { id: 'vector-conversion', path: '/vector-conversion', title: 'Vector Conversion', icon: 'basis', group: 'main',
    description: 'Transform vector components using the local basis at a point.' },
  { id: 'vector-operations', path: '/vector-operations', title: 'Vector Operations', icon: 'arrow', group: 'main',
    description: 'Dot and cross products, projections, angles and direction cosines.' },
  { id: 'point-explorer', path: '/point-explorer', title: 'Point Explorer', icon: 'target', group: 'main',
    description: 'See one point in all three systems, with projections.' },
  { id: 'geometry-explorer', path: '/geometry-explorer', title: 'Axis & Geometry Explorer', icon: 'curve', group: 'main',
    description: 'Lines, curves, planes and implicit surfaces.' },
  { id: 'coordinate-surfaces', path: '/coordinate-surfaces', title: 'Coordinate Surfaces Explorer', icon: 'surface', group: 'main',
    description: 'Constant-coordinate surfaces with normals and tangent planes.' },
  { id: 'solver', path: '/solver', title: 'Step-by-Step Solver', icon: 'steps', group: 'additional',
    description: 'Worked solutions for every calculator.' },
  { id: 'visualizer', path: '/visualizer', title: '3D Visualizer', icon: 'cube', group: 'additional',
    description: 'A free 3D workspace for points, vectors, lines, planes and surfaces.' },
  { id: 'formulas', path: '/formulas', title: 'Formula Library', icon: 'book', group: 'additional',
    description: 'Searchable formulas with examples and variable definitions.' },
];
