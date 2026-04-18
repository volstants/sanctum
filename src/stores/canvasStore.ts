import { create } from 'zustand';
import type { TokenStats } from '@/lib/actions/ai';

export interface CanvasToken {
  id: string;
  name: string;
  imageUrl: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  isPlayer: boolean;
  stats?: TokenStats;
}

export type RpgSystem = 'D&D 5e' | 'Pathfinder 2e' | 'OSR / Old School';
export type CanvasLayer = 'map' | 'token' | 'gm' | 'light';
export type CanvasTool = 'select' | 'pan' | 'pencil' | 'line' | 'rect' | 'text' | 'erase';

export interface FogRect { id: string; x: number; y: number; w: number; h: number }

export type DrawingType = 'pencil' | 'line' | 'rect' | 'text';

export interface Drawing {
  id: string;
  type: DrawingType;
  points?: number[];
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  text?: string;
  color: string;
  strokeWidth: number;
}

interface CanvasState {
  // Viewport
  zoom: number;
  offsetX: number;
  offsetY: number;
  // Map
  mapImageUrl: string | null;
  mapWidth: number;
  mapHeight: number;
  // Grid
  gridEnabled: boolean;
  gridSize: number;
  gridColor: string;
  gridOpacity: number;
  snapToGrid: boolean;
  // Tokens
  tokens: CanvasToken[];
  selectedTokenId: string | null;
  // Layer
  activeLayer: CanvasLayer;
  // Tool
  tool: CanvasTool;
  // Fog of war
  fogEnabled: boolean;
  fogRects: FogRect[];
  // RPG system for AI generation
  rpgSystem: RpgSystem;
  // Drawings
  drawings: Drawing[];
  drawColor: string;
  drawStrokeWidth: number;
  inProgressDrawing: Drawing | null;

  // Actions
  setZoom: (zoom: number) => void;
  setOffset: (x: number, y: number) => void;
  setMapImage: (url: string, width: number, height: number) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setTool: (tool: CanvasTool) => void;
  setActiveLayer: (layer: CanvasLayer) => void;
  setRpgSystem: (system: RpgSystem) => void;
  addToken: (token: Omit<CanvasToken, 'id'>) => string;
  updateToken: (id: string, patch: Partial<CanvasToken>) => void;
  removeToken: (id: string) => void;
  selectToken: (id: string | null) => void;
  moveToken: (id: string, x: number, y: number) => void;
  toggleFog: () => void;
  addFogRect: (rect: Omit<FogRect, 'id'>) => void;
  removeFogRect: (id: string) => void;
  clearFog: () => void;
  addDrawing: (drawing: Drawing) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;
  setDrawColor: (color: string) => void;
  setDrawStrokeWidth: (width: number) => void;
  setInProgressDrawing: (drawing: Drawing | null) => void;
}

let nextId = 1;

export const useCanvasStore = create<CanvasState>((set) => ({
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  mapImageUrl: null,
  mapWidth: 0,
  mapHeight: 0,
  gridEnabled: true,
  gridSize: 70,
  gridColor: '#ffffff',
  gridOpacity: 0.15,
  snapToGrid: true,
  tokens: [],
  selectedTokenId: null,
  activeLayer: 'token',
  tool: 'select',
  fogEnabled: false,
  fogRects: [],
  rpgSystem: 'D&D 5e',
  drawings: [],
  drawColor: '#f0a500',
  drawStrokeWidth: 3,
  inProgressDrawing: null,

  setZoom: (zoom) => set({ zoom }),
  setOffset: (offsetX, offsetY) => set({ offsetX, offsetY }),
  setMapImage: (mapImageUrl, mapWidth, mapHeight) => set({ mapImageUrl, mapWidth, mapHeight }),
  toggleGrid: () => set((s) => ({ gridEnabled: !s.gridEnabled })),
  toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
  setTool: (tool) => set({ tool }),
  setActiveLayer: (activeLayer) => set({ activeLayer }),
  setRpgSystem: (rpgSystem) => set({ rpgSystem }),

  addToken: (token) => {
    const id = `token-${nextId++}`;
    set((s) => ({ tokens: [...s.tokens, { ...token, id }] }));
    return id;
  },
  updateToken: (id, patch) =>
    set((s) => ({ tokens: s.tokens.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  removeToken: (id) =>
    set((s) => ({
      tokens: s.tokens.filter((t) => t.id !== id),
      selectedTokenId: s.selectedTokenId === id ? null : s.selectedTokenId,
    })),
  selectToken: (selectedTokenId) => set({ selectedTokenId }),
  moveToken: (id, x, y) =>
    set((s) => ({ tokens: s.tokens.map((t) => (t.id === id ? { ...t, x, y } : t)) })),

  toggleFog: () => set((s) => ({ fogEnabled: !s.fogEnabled })),
  addFogRect: (rect) => {
    const id = `fog-${nextId++}`;
    set((s) => ({ fogRects: [...s.fogRects, { ...rect, id }] }));
  },
  removeFogRect: (id) => set((s) => ({ fogRects: s.fogRects.filter((r) => r.id !== id) })),
  clearFog: () => set({ fogRects: [] }),
  addDrawing: (drawing) => set((s) => ({ drawings: [...s.drawings, drawing] })),
  removeDrawing: (id) => set((s) => ({ drawings: s.drawings.filter((d) => d.id !== id) })),
  clearDrawings: () => set({ drawings: [] }),
  setDrawColor: (drawColor) => set({ drawColor }),
  setDrawStrokeWidth: (drawStrokeWidth) => set({ drawStrokeWidth }),
  setInProgressDrawing: (inProgressDrawing) => set({ inProgressDrawing }),
}));
