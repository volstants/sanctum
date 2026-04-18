'use client';

import { Line, Group } from 'react-konva';
import { useCanvasStore } from '@/stores/canvasStore';

const BUFFER = 3;

interface Props {
  stageWidth: number;
  stageHeight: number;
}

export function GridOverlay({ stageWidth, stageHeight }: Props) {
  const { gridEnabled, gridSize, gridColor, gridOpacity, zoom, offsetX, offsetY } = useCanvasStore();

  if (!gridEnabled || stageWidth === 0) return null;

  const minX = -offsetX / zoom;
  const minY = -offsetY / zoom;
  const maxX = (stageWidth - offsetX) / zoom;
  const maxY = (stageHeight - offsetY) / zoom;

  const startX = Math.floor(minX / gridSize - BUFFER) * gridSize;
  const endX = Math.ceil(maxX / gridSize + BUFFER) * gridSize;
  const startY = Math.floor(minY / gridSize - BUFFER) * gridSize;
  const endY = Math.ceil(maxY / gridSize + BUFFER) * gridSize;

  const lines: React.ReactNode[] = [];

  for (let x = startX; x <= endX; x += gridSize) {
    lines.push(
      <Line key={`v${x}`} points={[x, startY, x, endY]} stroke={gridColor} strokeWidth={1} opacity={gridOpacity} listening={false} />
    );
  }
  for (let y = startY; y <= endY; y += gridSize) {
    lines.push(
      <Line key={`h${y}`} points={[startX, y, endX, y]} stroke={gridColor} strokeWidth={1} opacity={gridOpacity} listening={false} />
    );
  }

  return <Group listening={false}>{lines}</Group>;
}
