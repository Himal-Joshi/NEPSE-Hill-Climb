/**
 * terrain.js — Builds a smoothed terrain polyline from OHLCV bar data.
 *
 * Exports: buildTerrain(bars) → Array<{ x, y, price }>
 *
 * Steps:
 *   1. Create a flat lead-in ramp before the chart data begins
 *   2. Map each bar's close price to screen coordinates with delta clamping
 *   3. Interpolate through Catmull-Rom spline for a smooth ride surface
 */

import { TERRAIN } from './constants.js';

// ─── Catmull-Rom Spline Interpolation ───────────────────────────────
// Given an array of control points, returns a densely-sampled smooth curve.
// Each segment between adjacent points is subdivided into `segments` sub-steps.
function catmullRom(points, segments) {
  const result = [];

  for (let i = 0; i < points.length - 1; i++) {
    // Clamp boundary indices so we always have p0..p3
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let s = 0; s < segments; s++) {
      const t  = s / segments;
      const t2 = t * t;
      const t3 = t2 * t;

      // Standard Catmull-Rom basis functions
      const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      );

      const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      );

      // Linearly interpolate the price for HUD display
      const price = p1.price + (p2.price - p1.price) * t;

      result.push({ x, y, price });
    }
  }

  // Push the very last control point so the curve reaches the end
  const last = points[points.length - 1];
  result.push({ x: last.x, y: last.y, price: last.price });

  return result;
}

// ─── Main Builder ───────────────────────────────────────────────────
export function buildTerrain(bars, chartType = 'line') {
  if (!bars || bars.length < 2) {
    throw new Error('buildTerrain requires at least 2 bars');
  }

  const xScale = chartType === 'candle' ? 60 : 100;
  const yScale = TERRAIN.yScale;

  // Find the global high price — used to invert Y (screen Y goes down)
  let maxPrice = -Infinity;
  for (const bar of bars) {
    if (bar.h > maxPrice) maxPrice = bar.h;
  }

  // Convert a price to screen-Y
  const priceToY = (price) => (maxPrice - price) * yScale + TERRAIN.yOffset;

  // ── Step 1: Build raw control points ──────────────────────────────

  const controlPoints = [];

  // Lead-in ramp: 4 flat points so the bike spawns on level ground
  const firstPrice = chartType === 'candle' ? Math.max(bars[0].o, bars[0].c) : bars[0].c;
  const firstY = priceToY(firstPrice);
  const rampStep = TERRAIN.leadInLength / 3; // divide lead-in into 3 segments (4 points)

  controlPoints.push({ x: -TERRAIN.leadInLength,          y: firstY, price: firstPrice });
  controlPoints.push({ x: -TERRAIN.leadInLength + rampStep, y: firstY, price: firstPrice });
  controlPoints.push({ x: -rampStep,                       y: firstY, price: firstPrice });
  controlPoints.push({ x: 0,                               y: firstY, price: firstPrice });

  // ── Step 2: Map each bar with delta clamping ──────────────────────

  let prevPrice = firstPrice;

  if (chartType === 'candle') {
    const barWidth = 44;
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      const targetPrice = Math.max(bar.o, bar.c);
      let clampedPrice = targetPrice;

      // Clamp consecutive deltas to avoid impossibly steep terrain
      const delta = clampedPrice - prevPrice;
      if (delta > TERRAIN.maxDelta)  clampedPrice = prevPrice + TERRAIN.maxDelta;
      if (delta < -TERRAIN.maxDelta) clampedPrice = prevPrice - TERRAIN.maxDelta;

      prevPrice = clampedPrice;

      const centerX = i * xScale;
      const centerY = priceToY(clampedPrice);

      // Add start of candle top platform
      controlPoints.push({ x: centerX - barWidth / 2, y: centerY, price: bar.c });
      // Add end of candle top platform
      controlPoints.push({ x: centerX + barWidth / 2, y: centerY, price: bar.c });
    }
    // Return direct block/step points
    return controlPoints;
  } else {
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      let clampedPrice = bar.c;

      // Clamp consecutive deltas to avoid impossibly steep terrain
      const delta = clampedPrice - prevPrice;
      if (delta > TERRAIN.maxDelta)  clampedPrice = prevPrice + TERRAIN.maxDelta;
      if (delta < -TERRAIN.maxDelta) clampedPrice = prevPrice - TERRAIN.maxDelta;

      prevPrice = clampedPrice;

      const x = i * xScale;
      const y = priceToY(clampedPrice);

      controlPoints.push({ x, y, price: bar.c });
    }

    // ── Step 3: Spline smooth ─────────────────────────────────────────
    const smoothed = catmullRom(controlPoints, TERRAIN.splineSegments);
    return smoothed;
  }
}
