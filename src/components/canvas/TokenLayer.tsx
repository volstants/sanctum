'use client';

import { useEffect, useState } from 'react';
import { Group, Image, Circle, Rect, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCanvasStore, type CanvasToken } from '@/stores/canvasStore';

const GRID = 70;

function snap(v: number, size: number) {
  return Math.round(v / size) * size;
}

function TokenItem({ token, canSelect }: { token: CanvasToken; canSelect: boolean }) {
  const { selectedTokenId, selectToken, moveToken, snapToGrid, gridSize } = useCanvasStore();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const isSelected = selectedTokenId === token.id;

  useEffect(() => {
    if (!token.imageUrl) { setImage(null); return; }
    const img = new window.Image();
    img.src = token.imageUrl;
    img.onload = () => setImage(img);
    return () => { img.onload = null; };
  }, [token.imageUrl]);

  const handleClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!canSelect) return;
    e.cancelBubble = true;
    selectToken(token.id);
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    let x = e.target.x() - token.width / 2;
    let y = e.target.y() - token.height / 2;
    if (snapToGrid) {
      x = snap(x, gridSize);
      y = snap(y, gridSize);
      e.target.x(x + token.width / 2);
      e.target.y(y + token.height / 2);
    }
    moveToken(token.id, x, y);
  };

  const hpPct = token.maxHp > 0 ? token.hp / token.maxHp : 1;
  const barW = token.width - 8;

  return (
    <Group
      x={token.x + token.width / 2}
      y={token.y + token.height / 2}
      offsetX={token.width / 2}
      offsetY={token.height / 2}
      draggable={canSelect}
      listening={canSelect}
      onClick={canSelect ? handleClick : undefined}
      onTap={canSelect ? handleClick : undefined}
      onDragEnd={canSelect ? handleDragEnd : undefined}
    >
      {/* Token image or fallback circle */}
      {image ? (
        <Image
          image={image}
          width={token.width}
          height={token.height}
          cornerRadius={token.width / 2}
          listening={false}
        />
      ) : (
        <Circle
          x={token.width / 2}
          y={token.height / 2}
          radius={token.width / 2}
          fill={token.isPlayer ? '#3b82f6' : '#dc2626'}
          listening={false}
        />
      )}

      {/* Selection ring */}
      {isSelected && (
        <Circle
          x={token.width / 2}
          y={token.height / 2}
          radius={token.width / 2 + 4}
          stroke="#f0a500"
          strokeWidth={3}
          listening={false}
        />
      )}

      {/* HP bar */}
      <Rect x={4} y={token.height + 4} width={barW} height={5} fill="#374151" cornerRadius={2} listening={false} />
      <Rect
        x={4} y={token.height + 4}
        width={barW * hpPct} height={5}
        fill={hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444'}
        cornerRadius={2}
        listening={false}
      />

      {/* Name */}
      <Text
        x={0} y={token.height + 13}
        width={token.width}
        text={token.name}
        fontSize={11}
        fill="#ffffff"
        align="center"
        listening={false}
      />
    </Group>
  );
}

export function TokenLayer() {
  const { tokens, tool } = useCanvasStore();
  const canSelect = tool === 'select';

  return (
    <Group listening={canSelect}>
      {tokens.map((t) => (
        <TokenItem key={t.id} token={t} canSelect={canSelect} />
      ))}
    </Group>
  );
}
