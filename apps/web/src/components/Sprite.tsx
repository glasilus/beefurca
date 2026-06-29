import React from "react";

interface SpriteProps {
  src: string;
  alt?: string;
  height?: number;
  flip?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Sprite({ src, alt = "", height = 120, flip = false, className, style }: SpriteProps) {
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      style={{
        height: `${height}px`,
        width: "auto",
        imageRendering: "pixelated",
        filter: "url(#sprite-key)",
        transform: flip ? "scaleX(-1)" : undefined,
        display: "block",
        userSelect: "none",
        ...style,
      }}
      className={className}
    />
  );
}
