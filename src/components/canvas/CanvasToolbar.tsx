'use client';

import { MousePointer2, Hand, Grid3x3, Magnet, Plus, Trash2, Layers, Cloud, CloudOff, Eraser, Pencil, Minus, Square, Type, Trash } from 'lucide-react';
import { useCanvasStore, type CanvasLayer, type CanvasTool } from '@/stores/canvasStore';

const LAYERS: { id: CanvasLayer; label: string }[] = [
  { id: 'map',   label: 'Map'   },
  { id: 'token', label: 'Token' },
  { id: 'gm',    label: 'GM'    },
  { id: 'light', label: 'Light' },
];

interface Props {
  isNarrator: boolean;
}

export function CanvasToolbar({ isNarrator }: Props) {
  const {
    tool, setTool,
    activeLayer, setActiveLayer,
    gridEnabled, toggleGrid,
    snapToGrid, toggleSnap,
    addToken, selectedTokenId, removeToken,
    fogEnabled, toggleFog, clearFog,
    drawColor, setDrawColor,
    drawStrokeWidth, setDrawStrokeWidth,
    clearDrawings,
  } = useCanvasStore();

  const isDrawTool = (t: CanvasTool) => ['pencil', 'line', 'rect', 'text'].includes(t);

  const btn = (active: boolean, danger = false) =>
    `p-1.5 rounded transition-colors ${active
      ? 'bg-[var(--brand)] text-black'
      : danger
        ? 'text-red-400 hover:bg-red-400/10'
        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-modifier-hover)]'
    }`;

  const handleAddToken = () => {
    const name = prompt('Token name?');
    if (!name) return;
    addToken({ name, imageUrl: null, x: 70, y: 70, width: 60, height: 60, hp: 10, maxHp: 10, isPlayer: false });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Drop hint */}
      {isNarrator && (
        <span className="text-[10px] text-[var(--text-muted)] hidden lg:block">
          {tool === 'pan' ? 'Drop → map bg' : 'Drop image → AI token'}
        </span>
      )}

      {/* Layer selector */}
      {isNarrator && (
        <div className="flex items-center gap-0.5 bg-[var(--bg-secondary)] rounded border border-[var(--border)] px-1 py-0.5">
          <Layers className="w-3 h-3 text-[var(--text-muted)] mr-0.5" />
          {LAYERS.map((l) => (
            <button
              key={l.id}
              onClick={() => setActiveLayer(l.id)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                activeLayer === l.id
                  ? 'bg-[var(--brand)] text-black font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}

      {/* Tools */}
      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-md px-2 py-1 border border-[var(--border)]">
        <button className={btn(tool === 'select')} onClick={() => setTool('select')} title="Select">
          <MousePointer2 className="w-4 h-4" />
        </button>
        <button className={btn(tool === 'pan')} onClick={() => setTool('pan')} title="Pan">
          <Hand className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-[var(--border)] mx-0.5" />

        <button className={btn(gridEnabled)} onClick={toggleGrid} title="Grid">
          <Grid3x3 className="w-4 h-4" />
        </button>
        <button className={btn(snapToGrid)} onClick={toggleSnap} title="Snap">
          <Magnet className="w-4 h-4" />
        </button>

        {isNarrator && (
          <>
            <div className="w-px h-4 bg-[var(--border)] mx-0.5" />

            {/* Drawing tools */}
            <button className={btn(tool === 'pencil')} onClick={() => setTool('pencil')} title="Freehand">
              <Pencil className="w-4 h-4" />
            </button>
            <button className={btn(tool === 'line')} onClick={() => setTool('line')} title="Line">
              <Minus className="w-4 h-4" />
            </button>
            <button className={btn(tool === 'rect')} onClick={() => setTool('rect')} title="Rectangle">
              <Square className="w-4 h-4" />
            </button>
            <button className={btn(tool === 'text')} onClick={() => setTool('text')} title="Text">
              <Type className="w-4 h-4" />
            </button>

            {/* Color + width when draw tool active */}
            {isDrawTool(tool) && (
              <>
                <input
                  type="color"
                  value={drawColor}
                  onChange={(e) => setDrawColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                  title="Draw color"
                />
                {([1, 3, 6] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setDrawStrokeWidth(w)}
                    className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold transition-colors ${
                      drawStrokeWidth === w
                        ? 'bg-[var(--brand)] text-black'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                    title={`Stroke ${w}px`}
                  >
                    {w}
                  </button>
                ))}
                <button
                  className={btn(false, true)}
                  onClick={() => { if (confirm('Clear all drawings?')) clearDrawings(); }}
                  title="Clear drawings"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </>
            )}

            <div className="w-px h-4 bg-[var(--border)] mx-0.5" />

            {/* Fog of war */}
            <button className={btn(fogEnabled)} onClick={toggleFog} title={fogEnabled ? 'Disable fog' : 'Enable fog'}>
              {fogEnabled ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
            </button>
            {fogEnabled && (
              <button className={btn(false)} onClick={() => { if (confirm('Clear all fog?')) clearFog(); }} title="Clear all fog">
                <Eraser className="w-4 h-4" />
              </button>
            )}

            <div className="w-px h-4 bg-[var(--border)] mx-0.5" />

            <button className={btn(false)} onClick={handleAddToken} title="Add blank token">
              <Plus className="w-4 h-4" />
            </button>
            {selectedTokenId && (
              <button
                className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-[var(--bg-modifier-hover)] transition-colors"
                onClick={() => removeToken(selectedTokenId)}
                title="Delete token"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
