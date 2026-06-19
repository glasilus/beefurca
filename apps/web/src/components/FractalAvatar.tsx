"use client";

import React from "react";
import { FractalMedallion } from "./Fractal";

interface FractalAvatarProps {
  seed: string;
  size?: number;
}

/**
 * Procedural Fractal Avatar -- thin wrapper over FractalMedallion.
 * Keeps the same {seed, size} API for backwards compatibility.
 */
export const FractalAvatar: React.FC<FractalAvatarProps> = ({
  seed,
  size = 64,
}) => {
  return <FractalMedallion seed={seed} size={size} />;
};
