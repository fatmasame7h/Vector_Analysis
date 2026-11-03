import { Component, useMemo, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneOptions, SceneShape } from './types';
import type { Vec3 } from '../engines/vectors/vec3';

const DEFAULTS: SceneOptions = { axes: true, grid: true, labels: true, projections: false };

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <div className="grid h-full place-items-center p-4 text-center text-sm text-muted">3D view is unavailable (WebGL is not supported or was blocked).</div>
      : this.props.children;
  }
}

const Label = ({ at, text }: { at: Vec3; text: string }) => (
  <Html position={at} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
    <span className="whitespace-nowrap rounded bg-surface/85 px-1 text-xs text-ink">{text}</span>
  </Html>
);

function Arrow({ from, vec, color }: { from: Vec3; vec: Vec3; color: string }) {
  const obj = useMemo(() => {
    const len = Math.hypot(...vec);
    if (len < 1e-9) return null;
    return new THREE.ArrowHelper(new THREE.Vector3(...vec).normalize(), new THREE.Vector3(...from), len, color,
      Math.min(0.35, len * 0.3), Math.min(0.18, len * 0.15));
  }, [from, vec, color]);
  return obj ? <primitive object={obj} /> : null;
}

function GridSurface({ grid, color, opacity }: { grid: Vec3[][]; color: string; opacity: number }) {
  const geo = useMemo(() => {
    const rows = grid.length, cols = grid[0].length;
    const pos = new Float32Array(rows * cols * 3);
    grid.forEach((r, i) => r.forEach((p, j) => pos.set(p, (i * cols + j) * 3)));
    const idx: number[] = [];
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }, [grid]);
  return (
    <>
      <mesh geometry={geo}><meshStandardMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh geometry={geo}><meshBasicMaterial color={color} wireframe transparent opacity={0.25} /></mesh>
    </>
  );
}

function SoupMesh({ positions, color, opacity }: { positions: number[]; color: string; opacity: number }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    g.computeVertexNormals();
    return g;
  }, [positions]);
  return <mesh geometry={geo}><meshStandardMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>;
}

function PlaneMesh({ p, n, size, color, opacity }: { p: Vec3; n: Vec3; size: number; color: string; opacity: number }) {
  const q = useMemo(() => {
    const nn = new THREE.Vector3(...n).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), nn);
  }, [n]);
  return (
    <mesh position={p} quaternion={q}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function ShapeView({ s, labels, projections }: { s: SceneShape; labels: boolean; projections: boolean }) {
  switch (s.kind) {
    case 'point': {
      const [x, y, z] = s.p;
      return (
        <group>
          <mesh position={s.p}><sphereGeometry args={[0.09, 20, 20]} /><meshBasicMaterial color={s.color} /></mesh>
          {labels && s.label && <Label at={[x, y, z + 0.3]} text={s.label} />}
          {projections && (
            <>
              <Line points={[s.p, [x, y, 0]]} color={s.color} dashed dashSize={0.12} gapSize={0.1} lineWidth={1} />
              <Line points={[[x, y, 0], [x, 0, 0]]} color={s.color} dashed dashSize={0.12} gapSize={0.1} lineWidth={1} />
              <Line points={[[x, y, 0], [0, y, 0]]} color={s.color} dashed dashSize={0.12} gapSize={0.1} lineWidth={1} />
            </>
          )}
        </group>
      );
    }
    case 'vector': {
      const tip: Vec3 = [s.from[0] + s.vec[0], s.from[1] + s.vec[1], s.from[2] + s.vec[2]];
      return <group><Arrow from={s.from} vec={s.vec} color={s.color} />{labels && s.label && <Label at={tip} text={s.label} />}</group>;
    }
    case 'polyline':
      if (s.pts.length < 2) return null;
      return (
        <group>
          <Line points={s.pts} color={s.color} lineWidth={2} dashed={s.dashed} dashSize={0.15} gapSize={0.1} />
          {labels && s.label && <Label at={s.pts[Math.floor(s.pts.length / 2)]} text={s.label} />}
        </group>
      );
    case 'plane': return <PlaneMesh p={s.p} n={s.n} size={s.size ?? 6} color={s.color} opacity={s.opacity ?? 0.25} />;
    case 'surface': return s.grid.length > 1 ? <GridSurface grid={s.grid} color={s.color} opacity={s.opacity ?? 0.45} /> : null;
    case 'mesh': return s.positions.length ? <SoupMesh positions={s.positions} color={s.color} opacity={s.opacity ?? 0.5} /> : null;
  }
}

function Axes({ E, labels }: { E: number; labels: boolean }) {
  const ax: { c: string; a: Vec3; n: string }[] = [
    { c: '#ef4444', a: [E, 0, 0], n: 'x' }, { c: '#22c55e', a: [0, E, 0], n: 'y' }, { c: '#3b82f6', a: [0, 0, E], n: 'z' },
  ];
  return (
    <group>
      {ax.map((x) => (
        <group key={x.n}>
          <Line points={[x.a.map((v) => -v) as Vec3, x.a]} color={x.c} lineWidth={1.5} />
          {labels && <Label at={x.a.map((v) => v * 1.06 + (v ? 0.2 : 0)) as Vec3} text={x.n} />}
        </group>
      ))}
      <mesh><sphereGeometry args={[0.06, 12, 12]} /><meshBasicMaterial color="#64748b" /></mesh>
      {labels && <Label at={[0.25, -0.25, -0.25]} text="O" />}
    </group>
  );
}

export interface Scene3DProps {
  shapes: SceneShape[];
  options?: Partial<SceneOptions>;
  extent?: number;
  height?: number | string;
}

export default function Scene3D({ shapes, options, extent = 5, height = 380 }: Scene3DProps) {
  const o = { ...DEFAULTS, ...options };
  const [resetKey, setResetKey] = useState(0);
  return (
    <div className="relative overflow-hidden rounded-card border border-line bg-surface" style={{ height }}>
      <Boundary>
        <Canvas key={resetKey} dpr={[1, 2]} camera={{ position: [extent * 1.5, -extent * 1.5, extent * 1.1], up: [0, 0, 1], fov: 45 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, -5, 10]} intensity={0.8} />
          {o.grid && <gridHelper args={[extent * 2, extent * 2, '#94a3b8', '#cbd5e1']} rotation={[Math.PI / 2, 0, 0]} />}
          {o.axes && <Axes E={extent} labels={o.labels} />}
          {shapes.map((s, i) => <ShapeView key={i} s={s} labels={o.labels} projections={o.projections} />)}
          <OrbitControls makeDefault enableDamping />
        </Canvas>
      </Boundary>
      <button onClick={() => setResetKey((k) => k + 1)}
        className="absolute right-2 top-2 rounded-lg border border-line bg-surface/90 px-2 py-1 text-xs font-medium text-muted hover:text-ink">
        Reset view
      </button>
    </div>
  );
}
