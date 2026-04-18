'use client';

import { Line, Rect, Text, Group } from 'react-konva';
import { useCanvasStore, type Drawing } from '@/stores/canvasStore';

function DrawingShape({ d }: { d: Drawing }) {
  if (d.type === 'pencil' || d.type === 'line') {
    return (
      <Line
        points={d.points ?? []}
        stroke={d.color}
        strokeWidth={d.strokeWidth}
        lineCap="round"
        lineJoin="round"
        tension={d.type === 'pencil' ? 0.4 : 0}
        globalCompositeOperation="source-over"
      />
    );
  }
  if (d.type === 'rect') {
    return (
      <Rect
        x={d.x ?? 0}
        y={d.y ?? 0}
        width={d.w ?? 0}
        height={d.h ?? 0}
        stroke={d.color}
        strokeWidth={d.strokeWidth}
        fill="transparent"
      />
    );
  }
  if (d.type === 'text') {
    return (
      <Text
        x={d.x ?? 0}
        y={d.y ?? 0}
        text={d.text ?? ''}
        fontSize={16 + d.strokeWidth * 2}
        fill={d.color}
        fontFamily="monospace"
      />
    );
  }
  return null;
}

export function DrawingLayer() {
  const drawings = useCanvasStore((s) => s.drawings);
  const inProgress = useCanvasStore((s) => s.inProgressDrawing);

  return (
    <Group>
      {drawings.map((d) => <DrawingShape key={d.id} d={d} />)}
      {inProgress && <DrawingShape d={inProgress} />}
    </Group>
  );
}
