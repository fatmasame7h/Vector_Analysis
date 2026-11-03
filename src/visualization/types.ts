import type { Vec3 } from '../engines/vectors/vec3';

type Base = { color?: string; label?: string };
export type Shape =
  | (Base & { kind: 'point'; p: Vec3 })
  | (Base & { kind: 'vector'; from: Vec3; vec: Vec3 })
  | (Base & { kind: 'polyline'; pts: Vec3[]; dashed?: boolean })
  | (Base & { kind: 'plane'; p: Vec3; n: Vec3; size?: number; opacity?: number })
  | (Base & { kind: 'surface'; grid: Vec3[][]; opacity?: number })
  | (Base & { kind: 'mesh'; positions: number[]; opacity?: number });
export type SceneShape = Shape & { color: string };
export interface SceneOptions { axes: boolean; grid: boolean; labels: boolean; projections: boolean }
export const PALETTE = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777'];
