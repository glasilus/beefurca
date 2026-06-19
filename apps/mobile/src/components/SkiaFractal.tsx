import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import {
  Canvas,
  Path,
  Skia,
  LinearGradient,
  vec,
  BlurMask,
} from "@shopify/react-native-skia";

interface SkiaFractalProps {
  seed: string;
}

/**
 * GPU-Accelerated procedural background using React Native Skia.
 * Renders mathematical sine wave patterns simulating a fractal coordinate field.
 */
export const SkiaFractal: React.FC<SkiaFractalProps> = ({ seed }) => {
  const path = useMemo(() => {
    let hash = 0;
    const cleanSeed = seed || "default_mobile_seed";
    for (let i = 0; i < cleanSeed.length; i++) {
      hash = cleanSeed.charCodeAt(i) + ((hash << 5) - hash);
    }

    const newPath = Skia.Path.Make();
    // Generate wave lines based on deterministic coefficients
    const waveCount = 4;
    const height = 800;
    const width = 400;

    for (let w = 0; w < waveCount; w++) {
      const frequency = 0.005 + (w * 0.002);
      const amplitude = 30 + (Math.abs(hash % 30) / 30) * 20;
      const yOffset = 150 + w * 120;

      newPath.moveTo(0, yOffset);
      for (let x = 0; x <= width; x += 10) {
        const y = yOffset + Math.sin(x * frequency + (hash + w)) * amplitude;
        newPath.lineTo(x, y);
      }
    }
    
    return newPath;
  }, [seed]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Canvas style={styles.canvas}>
        <Path
          path={path}
          style="stroke"
          strokeWidth={1.5}
          strokeCap="round"
        >
          <LinearGradient
            start={vec(0, 0)}
            end={vec(400, 800)}
            colors={["#FF1F44", "#4D00FF", "#00E5FF"]}
          />
          <BlurMask blur={3} style="solid" />
        </Path>
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#050709", // Deep Obsidian backdrop
  },
});
