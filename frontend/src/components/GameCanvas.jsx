import React, { useRef, useEffect } from 'react';
import { createGame } from '../game/engine.js';
import { SAMPLE_DATA } from '../game/constants.js';

function GameCanvas({ settings, onStats, onGameOver }) {
  const canvasRef = useRef(null);
  const controllerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      let bars;

      if (settings.mode === 'live') {
        try {
          const res = await fetch(
            `http://127.0.0.1:8000/ohlc?symbol=${settings.symbol}`
          );
          const data = await res.json();
          bars = data.bars;
        } catch (err) {
          console.warn('Live API failed, falling back to sample data:', err);
          bars = null;
        }
      }

      // Fall back to sample data
      if (!bars) {
        bars = SAMPLE_DATA[settings.symbol];
      }

      if (cancelled || !canvasRef.current) return;

      controllerRef.current = createGame(canvasRef.current, {
        bars,
        vehicleType: settings.vehicleType,
        chartType: settings.chartType,
        theme: settings.theme,
        onStats,
        onGameOver,
      });
    }

    init();

    return () => {
      cancelled = true;
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="game-canvas-wrap">
      <canvas ref={canvasRef} />
    </div>
  );
}

export default GameCanvas;
