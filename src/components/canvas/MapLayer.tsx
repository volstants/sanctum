'use client';

import { useEffect, useState } from 'react';
import { Image } from 'react-konva';
import { useCanvasStore } from '@/stores/canvasStore';

export function MapLayer() {
  const { mapImageUrl, mapWidth, mapHeight } = useCanvasStore();
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!mapImageUrl) { setImage(null); return; }
    const img = new window.Image();
    img.src = mapImageUrl;
    img.onload = () => setImage(img);
    return () => { img.onload = null; };
  }, [mapImageUrl]);

  if (!image) return null;

  return (
    <Image
      image={image}
      x={0}
      y={0}
      width={mapWidth || image.naturalWidth}
      height={mapHeight || image.naturalHeight}
      listening={false}
    />
  );
}
