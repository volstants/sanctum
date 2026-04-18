'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage as StageType } from 'konva/lib/Stage';
import { MapLayer } from './MapLayer';
import { GridOverlay } from './GridOverlay';
import { TokenLayer } from './TokenLayer';
import { DrawingLayer } from './DrawingLayer';
import { CanvasToolbar } from './CanvasToolbar';
import { TokenStatsModal } from './TokenStatsModal';
import { TokenStatsPanel } from './TokenStatsPanel';
import { useCanvasStore } from '@/stores/canvasStore';
import type { Drawing } from '@/stores/canvasStore';
import { generateTokenStats } from '@/lib/actions/ai';
import type { TokenStats } from '@/lib/actions/ai';

interface Props {
  channelId: string;
  channelName: string;
  realmId: string;
  isNarrator: boolean;
}

interface PendingToken {
  imageUrl: string;
  base64: string;
  mimeType: string;
  dropX: number;
  dropY: number;
}

export function VTTCanvas({ channelId, channelName, realmId, isNarrator }: Props) {
  const stageRef = useRef<StageType>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  // AI modal state
  const [pending, setPending] = useState<PendingToken | null>(null);
  const [aiStats, setAiStats] = useState<TokenStats | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const {
    zoom, offsetX, offsetY, setZoom, setOffset, selectToken,
    tool, setMapImage, addToken,
    drawColor, drawStrokeWidth, addDrawing, inProgressDrawing, setInProgressDrawing,
  } = useCanvasStore();

  const isDrawTool = ['pencil', 'line', 'rect', 'text'].includes(tool);
  const isDrawing = useRef(false);
  const drawIdRef = useRef(0);

  // Resize observer
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const ptr = stage.getPointerPosition();
    if (!ptr) return;
    const oldZoom = zoom;
    const mousePointTo = { x: (ptr.x - offsetX) / oldZoom, y: (ptr.y - offsetY) / oldZoom };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newZoom = Math.min(Math.max(oldZoom * (direction > 0 ? 1.1 : 1 / 1.1), 0.1), 5);
    setZoom(newZoom);
    setOffset(ptr.x - mousePointTo.x * newZoom, ptr.y - mousePointTo.y * newZoom);
  }, [zoom, offsetX, offsetY, setZoom, setOffset]);

  const handleDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    if (e.target === stageRef.current) setOffset(e.target.x(), e.target.y());
  }, [setOffset]);

  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (e.target === stageRef.current) selectToken(null);
  }, [selectToken]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isNarrator) return;

    const file = e.dataTransfer.files[0];
    if (!file?.type.startsWith('image/')) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasX = (screenX - offsetX) / zoom;
    const canvasY = (screenY - offsetY) / zoom;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        if (tool === 'pan') {
          // Pan mode → set as map background
          setMapImage(dataUrl, img.naturalWidth, img.naturalHeight);
        } else {
          // Select mode → AI token
          const base64 = dataUrl.split(',')[1];
          const mimeType = file.type;
          setPending({ imageUrl: dataUrl, base64, mimeType, dropX: canvasX, dropY: canvasY });
          setAiStats(null);
          setAiError(null);
          setAiLoading(true);

          generateTokenStats(base64, mimeType, realmId)
            .then((stats) => { setAiStats(stats); setAiError(null); })
            .catch((err) => setAiError(String(err)))
            .finally(() => setAiLoading(false));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [isNarrator, tool, zoom, offsetX, offsetY, setMapImage, realmId]);

  const handleModalConfirm = useCallback((stats: TokenStats, name: string) => {
    if (!pending) return;
    const SIZE = 70;
    addToken({
      name,
      imageUrl: pending.imageUrl,
      x: pending.dropX - SIZE / 2,
      y: pending.dropY - SIZE / 2,
      width: SIZE,
      height: SIZE,
      hp: stats.hp,
      maxHp: stats.maxHp,
      isPlayer: false,
      stats,
    });
    setPending(null);
    setAiStats(null);
  }, [pending, addToken]);

  const handleModalCancel = useCallback(() => {
    setPending(null);
    setAiStats(null);
    setAiError(null);
  }, []);

  const getWorldPos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    return stage.getRelativePointerPosition();
  }, []);

  const handleStageMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawTool || !isNarrator) return;
    const pos = getWorldPos();
    if (!pos) return;
    isDrawing.current = true;
    const id = `draw-${++drawIdRef.current}`;

    if (tool === 'text') {
      const text = prompt('Text:');
      if (!text) { isDrawing.current = false; return; }
      addDrawing({ id, type: 'text', x: pos.x, y: pos.y, text, color: drawColor, strokeWidth: drawStrokeWidth });
      isDrawing.current = false;
      return;
    }

    const draft: Drawing = {
      id,
      type: tool as 'pencil' | 'line' | 'rect',
      color: drawColor,
      strokeWidth: drawStrokeWidth,
      ...(tool === 'rect' ? { x: pos.x, y: pos.y, w: 0, h: 0 } : { points: [pos.x, pos.y, pos.x, pos.y] }),
    };
    setInProgressDrawing(draft);
  }, [isDrawTool, isNarrator, tool, drawColor, drawStrokeWidth, addDrawing, setInProgressDrawing, getWorldPos]);

  const handleStageMouseMove = useCallback(() => {
    if (!isDrawing.current || !inProgressDrawing) return;
    const pos = getWorldPos();
    if (!pos) return;

    if (inProgressDrawing.type === 'pencil') {
      setInProgressDrawing({ ...inProgressDrawing, points: [...(inProgressDrawing.points ?? []), pos.x, pos.y] });
    } else if (inProgressDrawing.type === 'line') {
      const pts = inProgressDrawing.points ?? [];
      setInProgressDrawing({ ...inProgressDrawing, points: [pts[0], pts[1], pos.x, pos.y] });
    } else if (inProgressDrawing.type === 'rect') {
      setInProgressDrawing({
        ...inProgressDrawing,
        w: pos.x - (inProgressDrawing.x ?? 0),
        h: pos.y - (inProgressDrawing.y ?? 0),
      });
    }
  }, [inProgressDrawing, setInProgressDrawing, getWorldPos]);

  const handleStageMouseUp = useCallback(() => {
    if (!isDrawing.current || !inProgressDrawing) return;
    isDrawing.current = false;
    addDrawing(inProgressDrawing);
    setInProgressDrawing(null);
  }, [inProgressDrawing, addDrawing, setInProgressDrawing]);

  const isDraggable = tool === 'pan';

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a]">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--border)] flex-shrink-0">
        <span className="font-semibold text-[var(--text-primary)] text-sm"># {channelName}</span>
        <CanvasToolbar isNarrator={isNarrator} />
      </div>

      {/* Canvas (relative so panel can be absolute inside) */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{ cursor: 'default' }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          scaleX={zoom}
          scaleY={zoom}
          x={offsetX}
          y={offsetY}
          draggable={isDraggable}
          onWheel={handleWheel}
          onDragEnd={handleDragEnd}
          onClick={handleStageClick}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          style={{ cursor: isDrawTool ? 'crosshair' : isDraggable ? 'grab' : 'default' }}
        >
          <Layer>
            <MapLayer />
            <GridOverlay stageWidth={size.width} stageHeight={size.height} />
            <TokenLayer />
          </Layer>
          <Layer>
            <DrawingLayer />
          </Layer>
        </Stage>
        </div>

        {/* Token stats panel (selected token) */}
        <TokenStatsPanel />
      </div>

      {/* AI Token Modal */}
      {pending && (
        <TokenStatsModal
          imageUrl={pending.imageUrl}
          stats={aiStats}
          loading={aiLoading}
          error={aiError}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}
    </div>
  );
}
