'use client';

import { Rect, Group } from 'react-konva';
import { useCanvasStore } from '@/stores/canvasStore';

export function FogLayer({ stageWidth, stageHeight }: { stageWidth: number; stageHeight: number }) {
  const { fogEnabled, fogRects } = useCanvasStore();
  if (!fogEnabled) return null;

  return (
    <Group listening={false}>
      {/* Full-cover darkness */}
      <Rect
        x={-5000} y={-5000}
        width={stageWidth / 0.1 + 10000}
        height={stageHeight / 0.1 + 10000}
        fill="#000000"
        opacity={0.75}
        listening={false}
      />
      {/* Revealed areas (punch holes via destination-out equivalent — use white rectangles) */}
      {fogRects.map((r) => (
        <Rect
          key={r.id}
          x={r.x} y={r.y}
          width={r.w} height={r.h}
          fill="#000000"
          opacity={0}
          listening={false}
          globalCompositeOperation="destination-out"
        />
      ))}
    </Group>
  );
}
