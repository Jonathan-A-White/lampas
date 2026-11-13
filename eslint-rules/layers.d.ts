export const LAYERS: string[];
export const INVERSIONS_RECORDED: number;
export function layerOf(rel: string): 'data' | 'shared' | 'features' | null;
export function rankOf(layer: string | null): number;
export function resolveImport(root: string, fromRel: string, spec: string): string | null;
export function inversionKey(fromRel: string, toRel: string): string | null;
