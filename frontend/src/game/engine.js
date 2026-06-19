/**
 * engine.js — Complete game engine for NEPSE Hill Climb.
 *
 * Uses Matter.js for physics (no Matter.Render — we draw everything ourselves).
 * Exports: createGame(canvas, options) → { destroy() }
 *
 * options = { bars, vehicleType, chartType, theme, onStats, onGameOver }
 */

import Matter from 'matter-js';
import { VEHICLE_CONFIGS, TERRAIN, COLORS, PHYSICS } from './constants.js';
import { buildTerrain } from './terrain.js';

const { Engine, Bodies, Composite, Constraint, Body, Events } = Matter;

// ─────────────────────────────────────────────────────────────────────
export function createGame(canvas, options) {
  const {
    bars,
    vehicleType = 'dirtbike',
    chartType   = 'line',
    theme       = 'dark',
    onStats     = () => {},
    onGameOver  = () => {}
  } = options;

  const ctx = canvas.getContext('2d');
  const vc  = VEHICLE_CONFIGS[vehicleType] || VEHICLE_CONFIGS.dirtbike;
  const col = COLORS[theme] || COLORS.dark;

  // ─── Canvas Sizing via ResizeObserver ────────────────────────────
  function resizeCanvas() {
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width  = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }
  }
  resizeCanvas();

  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(canvas.parentElement || canvas);

  // ─── Build Terrain ──────────────────────────────────────────────
  const terrainPoints = buildTerrain(bars, chartType);

  // Find max terrain Y for fall-off-map detection
  let maxTerrainY = -Infinity;
  for (const pt of terrainPoints) {
    if (pt.y > maxTerrainY) maxTerrainY = pt.y;
  }

  // ─── Physics Engine ─────────────────────────────────────────────
  const engine = Engine.create();
  engine.gravity.y = 1.2; // Slightly heavier gravity for better feel

  // ─── Terrain Bodies (static rectangles between adjacent points) ─
  const terrainBodies = [];

  for (let i = 0; i < terrainPoints.length - 1; i++) {
    const p1 = terrainPoints[i];
    const p2 = terrainPoints[i + 1];

    const dx    = p2.x - p1.x;
    const dy    = p2.y - p1.y;
    const width = Math.hypot(dx, dy);
    const cx    = (p1.x + p2.x) / 2;
    const cy    = (p1.y + p2.y) / 2;
    const angle = Math.atan2(dy, dx);

    const rect = Bodies.rectangle(cx, cy, width + 2, TERRAIN.surfaceThickness, {
      isStatic: true,
      angle,
      friction: 0.8,
      restitution: 0.05,
      render: { visible: false }
    });
    // Stash terrain metadata for price lookups
    rect._tp1 = p1;
    rect._tp2 = p2;

    terrainBodies.push(rect);
  }

  Composite.add(engine.world, terrainBodies);

  // ─── Ground & Left Wall ─────────────────────────────────────────
  const lastPt = terrainPoints[terrainPoints.length - 1];
  const ground = Bodies.rectangle(
    lastPt.x / 2, maxTerrainY + 1500,
    lastPt.x + 4000, 200,
    { isStatic: true, friction: 1.0 }
  );
  const leftWall = Bodies.rectangle(
    -TERRAIN.leadInLength - 100, 0,
    100, 8000,
    { isStatic: true, friction: 0 }
  );
  Composite.add(engine.world, [ground, leftWall]);

  // ─── Bike Creation ──────────────────────────────────────────────
  const group = Body.nextGroup(true);

  // Spawn in the middle of the lead-in ramp, high above surface
  const spawnX = -TERRAIN.leadInLength / 2;
  // Use the lead-in Y (all lead-in points share the same Y)
  const spawnTerrainY = terrainPoints[0].y;
  const spawnY = spawnTerrainY - 150;

  const chassis = Bodies.rectangle(spawnX, spawnY, vc.chassisW, vc.chassisH, {
    collisionFilter: { group },
    friction: 0.1,
    density: vc.chassisDensity,
    label: 'chassis'
  });

  const head = Bodies.circle(spawnX + 5, spawnY - 50, 14, {
    collisionFilter: { group },
    density: 0.001,
    isSensor: true,
    label: 'head'
  });

  const wheelOpts = {
    collisionFilter: { group },
    friction: 0.9,
    restitution: 0.05,
    density: vc.wheelDensity,
    label: 'wheel'
  };

  const constraintLength = vc.wheelR + 5; // Use original length wheelR + 5

  // Spawn wheels at exact constraint length below attachment point
  // Attachment point is at spawnY + 10, wheel center is at spawnY + 10 + constraintLength
  // Add 5px horizontal offset outward
  const wheelSpawnY = spawnY + 10 + constraintLength;
  const wheelA = Bodies.circle(spawnX - (vc.chassisW / 2 + 5), wheelSpawnY, vc.wheelR, wheelOpts);
  const wheelB = Bodies.circle(spawnX + (vc.chassisW / 2 + 5), wheelSpawnY, vc.wheelR, wheelOpts);

  // Suspension Local Coordinates
  let rearPivot, rearShockTop, frontPivot, frontShockTop;

  if (vehicleType === 'dirtbike') {
    rearPivot = { x: -10, y: 5 };
    rearShockTop = { x: -(vc.chassisW / 2 + 5), y: -15 };
    frontPivot = { x: 10, y: 5 };
    frontShockTop = { x: 24, y: -22 };
  } else {
    // monster
    rearPivot = { x: -20, y: 5 };
    rearShockTop = { x: -(vc.chassisW / 2 + 5), y: -15 };
    frontPivot = { x: 20, y: 5 };
    frontShockTop = { x: vc.chassisW / 2 + 5, y: -15 };
  }

  const rearWheelLocal = { x: -(vc.chassisW / 2 + 5), y: 10 + constraintLength };
  const frontWheelLocal = { x: vc.chassisW / 2 + 5, y: 10 + constraintLength };

  const rearPivotLength = Math.hypot(rearWheelLocal.x - rearPivot.x, rearWheelLocal.y - rearPivot.y);
  const rearShockLength = Math.hypot(rearWheelLocal.x - rearShockTop.x, rearWheelLocal.y - rearShockTop.y);

  const frontPivotLength = Math.hypot(frontWheelLocal.x - frontPivot.x, frontWheelLocal.y - frontPivot.y);
  const frontShockLength = Math.hypot(frontWheelLocal.x - frontShockTop.x, frontWheelLocal.y - frontShockTop.y);

  const axleA = Constraint.create({
    bodyA: chassis, pointA: rearShockTop,
    bodyB: wheelA,
    stiffness: vc.stiffness, damping: vc.damping, // Use vehicle-specific settings
    length: rearShockLength
  });

  const axleB = Constraint.create({
    bodyA: chassis, pointA: frontShockTop,
    bodyB: wheelB,
    stiffness: vc.stiffness, damping: vc.damping, // Use vehicle-specific settings
    length: frontShockLength
  });

  const axleA2 = Constraint.create({
    bodyA: chassis, pointA: rearPivot,
    bodyB: wheelA,
    stiffness: 0.95, damping: vc.damping,
    length: rearPivotLength
  });

  const axleB2 = Constraint.create({
    bodyA: chassis, pointA: frontPivot,
    bodyB: wheelB,
    stiffness: 0.95, damping: vc.damping,
    length: frontPivotLength
  });

  // Triangulate the head to make it 100% rigid relative to the chassis
  // Head is at (spawnX + 5, spawnY - 50)
  // Attachment points on chassis are at (spawnX - 5, spawnY - 15) and (spawnX + 15, spawnY - 15)
  // Distance is Math.hypot(10, 35) ≈ 36.4
  const headConstraint1 = Constraint.create({
    bodyA: chassis, pointA: { x: -5, y: -15 },
    bodyB: head, pointB: { x: 0, y: 0 },
    stiffness: 1.0,
    length: 36.4
  });
  const headConstraint2 = Constraint.create({
    bodyA: chassis, pointA: { x: 15, y: -15 },
    bodyB: head, pointB: { x: 0, y: 0 },
    stiffness: 1.0,
    length: 36.4
  });

  const bikeComposite = Composite.create({
    bodies: [chassis, head, wheelA, wheelB],
    constraints: [axleA, axleB, axleA2, axleB2, headConstraint1, headConstraint2]
  });

  Composite.add(engine.world, bikeComposite);

  const bike = { chassis, head, wheelA, wheelB };

  // ─── Settle Phase ───────────────────────────────────────────────
  // Run physics silently so the bike drops and settles on the ramp
  for (let i = 0; i < PHYSICS.settleFrames; i++) {
    Engine.update(engine, 1000 / 60);
  }

  // ─── Collision Detection (armed after grace period) ─────────────
  let collisionsArmed = false;
  let gameOver = false;

  const armTimeout = setTimeout(() => {
    collisionsArmed = true;
  }, PHYSICS.crashGracePeriod);

  Events.on(engine, 'collisionStart', (event) => {
    if (!collisionsArmed || gameOver) return;

    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;

      const headBody  = a.label === 'head' ? a : b.label === 'head' ? b : null;
      const otherBody = headBody === a ? b : a;

      if (headBody && otherBody && otherBody.isStatic) {
        triggerGameOver();
        return;
      }
    }
  });

  // ─── Input Handling ─────────────────────────────────────────────
  const keys = { ArrowRight: false, ArrowLeft: false };

  function onKeyDown(e) {
    if (e.code in keys) { keys[e.code] = true; e.preventDefault(); }
  }
  function onKeyUp(e) {
    if (e.code in keys) { keys[e.code] = false; e.preventDefault(); }
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup',   onKeyUp);

  // ─── Mobile Touch Controls ──────────────────────────────────────
  // Defer DOM lookup since HUD mounts in parallel
  const touchCleanups = [];
  setTimeout(() => {
    const btnGas   = document.getElementById('btn-gas');
    const btnBrake = document.getElementById('btn-brake');

    if (btnGas) {
      const gs = () => { keys.ArrowRight = true; };
      const ge = () => { keys.ArrowRight = false; };
      btnGas.addEventListener('touchstart', gs, { passive: true });
      btnGas.addEventListener('touchend',   ge, { passive: true });
      btnGas.addEventListener('mousedown',  gs);
      btnGas.addEventListener('mouseup',    ge);
      touchCleanups.push(() => {
        btnGas.removeEventListener('touchstart', gs);
        btnGas.removeEventListener('touchend',   ge);
        btnGas.removeEventListener('mousedown',  gs);
        btnGas.removeEventListener('mouseup',    ge);
      });
    }
    if (btnBrake) {
      const bs = () => { keys.ArrowLeft = true; };
      const be = () => { keys.ArrowLeft = false; };
      btnBrake.addEventListener('touchstart', bs, { passive: true });
      btnBrake.addEventListener('touchend',   be, { passive: true });
      btnBrake.addEventListener('mousedown',  bs);
      btnBrake.addEventListener('mouseup',    be);
      touchCleanups.push(() => {
        btnBrake.removeEventListener('touchstart', bs);
        btnBrake.removeEventListener('touchend',   be);
        btnBrake.removeEventListener('mousedown',  bs);
        btnBrake.removeEventListener('mouseup',    be);
      });
    }
  }, 100);

  // ─── Camera State ───────────────────────────────────────────────
  let cameraX = chassis.position.x;
  let cameraY = chassis.position.y;

  // ─── Stats Tracking ────────────────────────────────────────────
  const startPrice = bars[0].c;
  let lastReportedDist = -1;

  // ─── Price Lookup ───────────────────────────────────────────────
  function getCurrentPrice() {
    const bikeX = chassis.position.x;
    for (const tb of terrainBodies) {
      const p1 = tb._tp1;
      const p2 = tb._tp2;
      if (p1 && p2 && bikeX >= p1.x && bikeX <= p2.x) {
        const t = (bikeX - p1.x) / (p2.x - p1.x || 1);
        return p1.price + (p2.price - p1.price) * t;
      }
    }
    return bars[bars.length - 1].c;
  }

  // ─── Game Over Handler ─────────────────────────────────────────
  function triggerGameOver() {
    if (gameOver) return;
    gameOver = true;

    const price    = getCurrentPrice();
    const distance = Math.max(0, Math.floor(chassis.position.x / 50));
    const profit   = (price - startPrice) * 10;

    onGameOver({ distance, finalPrice: price, finalProfit: profit });
  }

  // ─── Render Helpers ─────────────────────────────────────────────

  /** Draw grid lines behind everything */
  function drawGrid(camX, camY) {
    const activeW = canvas.width - 60;
    const activeH = canvas.height - 30;
    const left   = camX - activeW / 2;
    const right  = camX + activeW / 2;
    const top    = camY - activeH / 2;
    const bottom = camY + activeH / 2;

    ctx.strokeStyle = col.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();

    const gridSize = 100;
    for (let x = Math.floor(left / gridSize) * gridSize; x <= right; x += gridSize) {
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    for (let y = Math.floor(top / gridSize) * gridSize; y <= bottom; y += gridSize) {
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.stroke();
  }

  /** Draw candlesticks behind the terrain line */
  function drawCandlesticks() {
    if (!bars || bars.length === 0) return;

    // Find max price for screen-Y mapping reference
    let maxPrice = -Infinity;
    for (const b of bars) {
      if (b.h > maxPrice) maxPrice = b.h;
    }

    const priceToY = (price) => (maxPrice - price) * TERRAIN.yScale + TERRAIN.yOffset;
    const xScale = chartType === 'candle' ? 60 : 100;
    const barWidth = 44; // Thick bodies close together

    // Draw only visible candles based on camera X bounds
    const activeW = canvas.width - 60;
    const leftBound = cameraX - activeW;
    const rightBound = cameraX + activeW;

    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      const x = i * xScale;
      if (x < leftBound || x > rightBound) continue;

      const oY = priceToY(bar.o);
      const cY = priceToY(bar.c);
      const hY = priceToY(bar.h);
      const lY = priceToY(bar.l);

      const isUp = bar.c >= bar.o;
      const color = isUp ? col.upCandle : col.downCandle;

      // Draw candle wick (high-low)
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5; // Thicker wicks
      ctx.beginPath();
      ctx.moveTo(x, hY);
      ctx.lineTo(x, lY);
      ctx.stroke();

      // Draw candle body (open-close)
      ctx.fillStyle = color;
      const bodyY = Math.min(oY, cY);
      const bodyH = Math.max(Math.abs(oY - cY), 4); // At least 4px height
      ctx.fillRect(x - barWidth / 2, bodyY, barWidth, bodyH);
    }
  }

  /** Draw the terrain surface line + gradient fill */
  function drawTerrainLine() {
    if (chartType === 'candle') {
      // Draw a visual starting launch platform for the lead-in ramp
      const firstPrice = Math.max(bars[0].o, bars[0].c);
      let maxPrice = -Infinity;
      for (const b of bars) {
        if (b.h > maxPrice) maxPrice = b.h;
      }
      const firstY = (maxPrice - firstPrice) * TERRAIN.yScale + TERRAIN.yOffset;

      ctx.strokeStyle = '#4b5563'; // neutral grey border
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-TERRAIN.leadInLength, firstY);
      ctx.lineTo(0, firstY);
      ctx.stroke();

      // Fill below starting platform
      ctx.fillStyle = col.bg === '#ffffff' ? 'rgba(75, 85, 99, 0.08)' : 'rgba(75, 85, 99, 0.15)';
      ctx.beginPath();
      ctx.moveTo(-TERRAIN.leadInLength, firstY);
      ctx.lineTo(0, firstY);
      ctx.lineTo(0, maxTerrainY + 1000);
      ctx.lineTo(-TERRAIN.leadInLength, maxTerrainY + 1000);
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (terrainPoints.length < 2) return;

    // Surface line
    ctx.strokeStyle = col.terrainStroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(terrainPoints[0].x, terrainPoints[0].y);
    for (let i = 1; i < terrainPoints.length; i++) {
      ctx.lineTo(terrainPoints[i].x, terrainPoints[i].y);
    }
    ctx.stroke();

    // Fill below the terrain line (proper closed polygon enclosing surface + bottom)
    ctx.fillStyle = col.terrainFill;
    ctx.beginPath();
    ctx.moveTo(terrainPoints[0].x, terrainPoints[0].y);
    for (let i = 1; i < terrainPoints.length; i++) {
      ctx.lineTo(terrainPoints[i].x, terrainPoints[i].y);
    }
    const farBelow = maxTerrainY + 1000;
    ctx.lineTo(terrainPoints[terrainPoints.length - 1].x, farBelow);
    ctx.lineTo(terrainPoints[0].x, farBelow);
    ctx.closePath();
    ctx.fill();
  }

  /** Draw a coiled spring shock absorber */
  function drawCoilSpring(x1, y1, x2, y2, springColor = '#fbbf24', strutColor = '#9ca3af') {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 5) return;

    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(Math.atan2(dy, dx));

    // Draw main shock cylinder (inner rod)
    ctx.strokeStyle = strutColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();

    // Draw top mount
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw bottom mount
    ctx.beginPath();
    ctx.arc(len, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw coiled spring (zigzag)
    const startCoil = len * 0.15;
    const endCoil = len * 0.85;
    const coilLength = endCoil - startCoil;
    const numCoils = 8;
    const coilW = 8; // width of coil

    ctx.strokeStyle = springColor;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startCoil, 0);

    for (let i = 0; i <= numCoils; i++) {
      const px = startCoil + (i / numCoils) * coilLength;
      const py = (i === 0 || i === numCoils) ? 0 : (i % 2 === 0 ? 1 : -1) * coilW;
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.restore();
  }

  /** Draw a single wheel with tread, rim, and spoke details */
  function drawWheel(wheel) {
    const { x, y } = wheel.position;
    const angle = wheel.angle;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const r = vc.wheelR;

    // 1. Draw outer tire (thick dark ring)
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw tire treads
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 3;
    const numTreads = 16;
    for (let i = 0; i < numTreads; i++) {
      const a = (i / numTreads) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }

    // 3. Draw inner tire cutout
    ctx.fillStyle = col.bg;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.fill();

    // 4. Draw metal rim
    const rimGrad = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 0.7);
    rimGrad.addColorStop(0, '#9ca3af');
    rimGrad.addColorStop(0.5, '#f3f4f6');
    rimGrad.addColorStop(1, '#4b5563');
    
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2, true); // hole
    ctx.fill();

    // 5. Draw Spokes
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2.5;
    const numSpokes = vehicleType === 'monster' ? 5 : 8;
    for (let s = 0; s < numSpokes; s++) {
      const a = (s / numSpokes) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58);
      ctx.stroke();
    }

    // 6. Center hub
    ctx.fillStyle = '#1f2937';
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /** Draw the chassis as a detailed vehicle frame or cab body */
  function drawChassis() {
    const { x, y } = chassis.position;
    const angle = chassis.angle;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const w = vc.chassisW;
    const h = vc.chassisH;
    const themeColor = col.chassis || vc.color;

    // Calculate rider head local coordinates
    const cx = chassis.position.x;
    const cy = chassis.position.y;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const dx = head.position.x - cx;
    const dy = head.position.y - cy;
    const hx = dx * cosA + dy * sinA;
    const hy = -dx * sinA + dy * cosA;

    if (vehicleType === 'dirtbike') {
      // ─── DIRT BIKE FRAME ───────────────────────────────────────────
      // 1. Engine Block
      const engineGrad = ctx.createLinearGradient(-15, -4, 10, 8);
      engineGrad.addColorStop(0, '#374151');
      engineGrad.addColorStop(0.5, '#6b7280');
      engineGrad.addColorStop(1, '#1f2937');
      ctx.fillStyle = engineGrad;
      ctx.beginPath();
      ctx.rect(-15, -4, 25, 12);
      ctx.fill();
      
      // Engine detail lines
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 1.5;
      for (let ey = -2; ey <= 6; ey += 2) {
        ctx.beginPath();
        ctx.moveTo(-13, ey);
        ctx.lineTo(8, ey);
        ctx.stroke();
      }

      // 2. Exhaust Pipe (chrome)
      const pipeGrad = ctx.createLinearGradient(-35, 2, -20, 2);
      pipeGrad.addColorStop(0, '#9ca3af');
      pipeGrad.addColorStop(0.5, '#f9fafb');
      pipeGrad.addColorStop(1, '#374151');
      ctx.strokeStyle = pipeGrad;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-5, 4);
      ctx.quadraticCurveTo(-20, 4, -28, -2);
      ctx.lineTo(-38, -4);
      ctx.stroke();

      // Carbon fiber tip
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(-38, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 3. Fuel Tank
      ctx.fillStyle = themeColor;
      ctx.beginPath();
      ctx.moveTo(-12, -11);
      ctx.lineTo(12, -11);
      ctx.lineTo(22, -1);
      ctx.lineTo(8, 6);
      ctx.lineTo(-12, 6);
      ctx.closePath();
      ctx.fill();

      // 4. Rear Fender
      ctx.beginPath();
      ctx.moveTo(-25, -6);
      ctx.lineTo(-42, -17);
      ctx.lineTo(-38, -19);
      ctx.lineTo(-20, -9);
      ctx.closePath();
      ctx.fill();

      // 5. Seat (black leather)
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.moveTo(-27, -8);
      ctx.lineTo(-10, -9);
      ctx.quadraticCurveTo(2, -8, 5, -5);
      ctx.lineTo(-10, -5);
      ctx.closePath();
      ctx.fill();

      // 6. Handlebars
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(15, 5);
      ctx.lineTo(24, -22);
      ctx.stroke();

      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(21, -22);
      ctx.lineTo(27, -22);
      ctx.stroke();
      
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(26, -22, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // ─── RIDER BODY ────────────────────────────────────────────────
      // Torso (racing jacket)
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(-16, -9);
      ctx.lineTo(hx - 3, hy + 5);
      ctx.lineTo(hx + 3, hy + 5);
      ctx.lineTo(-6, -8);
      ctx.closePath();
      ctx.fill();

      // Legs (dark pants)
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(-16, -9);
      ctx.lineTo(-2, 7);
      ctx.lineTo(4, 7);
      ctx.lineTo(-8, -8);
      ctx.closePath();
      ctx.fill();

      // Arm reaching handlebars
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx, hy + 8);
      ctx.lineTo(26, -22);
      ctx.stroke();

    } else if (vehicleType === 'monster') {
      // ─── MONSTER TRUCK CABIN ───────────────────────────────────────
      // 1. Exhaust stack
      const stackGrad = ctx.createLinearGradient(-22, -35, -16, -35);
      stackGrad.addColorStop(0, '#9ca3af');
      stackGrad.addColorStop(0.5, '#f9fafb');
      stackGrad.addColorStop(1, '#374151');
      ctx.strokeStyle = stackGrad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-20, -10);
      ctx.lineTo(-20, -32);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(-20, -32);
      ctx.quadraticCurveTo(-20, -35, -23, -35);
      ctx.stroke();

      // 2. Mudguards
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(-w/2 + 5, 5, 42, Math.PI, 0);
      ctx.lineTo(-w/2 + 5 + 42, 5);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(w/2 - 5, 5, 42, Math.PI, 0);
      ctx.lineTo(w/2 - 5 + 42, 5);
      ctx.closePath();
      ctx.fill();

      // 3. Cabin Body
      ctx.fillStyle = themeColor;
      ctx.beginPath();
      ctx.moveTo(-w/2 + 5, -10);
      ctx.lineTo(-20, -10);
      ctx.lineTo(-12, -26);
      ctx.lineTo(15, -26);
      ctx.lineTo(24, -10);
      ctx.lineTo(w/2 - 2, -10);
      ctx.lineTo(w/2 - 2, 5);
      ctx.lineTo(-w/2 + 5, 5);
      ctx.closePath();
      ctx.fill();

      // 4. Windows (glass)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      ctx.moveTo(-16, -12);
      ctx.lineTo(-10, -23);
      ctx.lineTo(12, -23);
      ctx.lineTo(19, -12);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 5. Grill & Headlights
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(w/2 - 5, -8, 3, 10);
      
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(w/2 - 2, -6, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 6. Racing Stripe
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-w/2 + 15, -6, w - 30, 3);

      // Steering wheel
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(10, -14, 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#4b5563';
      ctx.beginPath();
      ctx.moveTo(10, -14);
      ctx.lineTo(6, -8);
      ctx.stroke();
    }

    ctx.restore();
  }

  /** Draw the rider helmet with colored shell and shiny visor */
  function drawHead() {
    const { x, y } = head.position;
    
    ctx.save();
    ctx.translate(x, y);

    if (vehicleType === 'dirtbike') {
      // 1. Helmet Shell
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // 2. Visor
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 14, -Math.PI / 6, Math.PI / 4);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // Highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(6, 2, 2, 5, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      // Stripe
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 14, Math.PI * 0.8, Math.PI * 1.2);
      ctx.stroke();

    } else if (vehicleType === 'monster') {
      // Driver head inside cabin window
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, 10, -Math.PI / 8, Math.PI / 4);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  /** Draw coil spring suspension shocks */
  function drawAxles() {
    // Compute chassis attachment points in world space
    const cx = chassis.position.x;
    const cy = chassis.position.y;
    const a  = chassis.angle;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);

    // Rear shock top mount in world space
    const rearWorldX = cx + rearShockTop.x * cosA - rearShockTop.y * sinA;
    const rearWorldY = cy + rearShockTop.x * sinA + rearShockTop.y * cosA;

    // Front shock top mount in world space
    const frontWorldX = cx + frontShockTop.x * cosA - frontShockTop.y * sinA;
    const frontWorldY = cy + frontShockTop.x * sinA + frontShockTop.y * cosA;

    // Draw shocks
    drawCoilSpring(rearWorldX, rearWorldY, wheelA.position.x, wheelA.position.y, '#eab308', col.axle);
    drawCoilSpring(frontWorldX, frontWorldY, wheelB.position.x, wheelB.position.y, '#eab308', col.axle);
  }

  /** Draw dynamic axes in screen space (aligned with viewport scroll) */
  function drawAxes(activeW, activeH, w, h) {
    // 1. Draw Axis Backgrounds
    ctx.fillStyle = col.bg;
    ctx.fillRect(activeW, 0, 60, h);
    ctx.fillRect(0, activeH, w, 30);

    // 2. Draw Axis Borders
    ctx.strokeStyle = col.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(activeW, 0);
    ctx.lineTo(activeW, h);
    ctx.moveTo(0, activeH);
    ctx.lineTo(w, activeH);
    ctx.stroke();

    // Find max price for screen-Y mapping reference
    let maxPrice = -Infinity;
    for (const b of bars) {
      if (b.h > maxPrice) maxPrice = b.h;
    }

    // 3. Draw Price Ticks & Labels (Right Sidebar)
    ctx.fillStyle = col.wheelStroke || '#787b86';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.beginPath();
    for (let screenY = 30; screenY < activeH; screenY += 50) {
      const worldY = cameraY - activeH / 2 + screenY;
      const price = maxPrice - (worldY - TERRAIN.yOffset) / TERRAIN.yScale;

      ctx.moveTo(activeW, screenY);
      ctx.lineTo(activeW + 5, screenY);
      ctx.fillText(price.toFixed(0), activeW + 10, screenY);
    }
    ctx.stroke();

    // 4. Draw Date Ticks & Labels (Bottom Sidebar)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const xScale = chartType === 'candle' ? 60 : 100;

    ctx.beginPath();
    for (let screenX = 50; screenX < activeW; screenX += 100) {
      const worldX = cameraX - activeW / 2 + screenX;
      const barIndex = Math.floor(worldX / xScale);

      if (barIndex >= 0 && barIndex < bars.length) {
        const bar = bars[barIndex];
        let timestamp = bar.t;
        if (timestamp < 100000) {
          timestamp = 1764569498 + timestamp * 86400;
        }
        const dateStr = new Date(timestamp * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

        ctx.moveTo(screenX, activeH);
        ctx.lineTo(screenX, activeH + 5);
        ctx.fillText(dateStr, screenX, activeH + 8);
      }
    }
    ctx.stroke();
  }

  /** Draw checkered flag pole at the end of the track */
  function drawFinishLine() {
    const xScale = chartType === 'candle' ? 60 : 100;
    const finishX = (bars.length - 1) * xScale;
    const lastBar = bars[bars.length - 1];

    let maxPrice = -Infinity;
    for (const b of bars) {
      if (b.h > maxPrice) maxPrice = b.h;
    }

    const lastPrice = chartType === 'candle' ? Math.max(lastBar.o, lastBar.c) : lastBar.c;
    const lastPriceY = (maxPrice - lastPrice) * TERRAIN.yScale + TERRAIN.yOffset;

    ctx.save();

    // Draw finish flag pole
    ctx.strokeStyle = col.wheelStroke || '#787b86';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(finishX, lastPriceY);
    ctx.lineTo(finishX, lastPriceY - 140);
    ctx.stroke();

    // Draw checkered flag banner
    const flagW = 55;
    const flagH = 34;
    const flagX = finishX;
    const flagY = lastPriceY - 140;

    // Background white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(flagX, flagY, flagW, flagH);

    // Black checkers
    ctx.fillStyle = '#000000';
    const rows = 4;
    const cols = 6;
    const squareW = flagW / cols;
    const squareH = flagH / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 1) {
          ctx.fillRect(flagX + c * squareW, flagY + r * squareH, squareW, squareH);
        }
      }
    }

    // Flag border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(flagX, flagY, flagW, flagH);

    // Draw text "FINISH" on top
    ctx.fillStyle = '#089981';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH', finishX + flagW / 2, flagY - 8);

    ctx.restore();
  }

  /** Full render pass for one frame */
  function render() {
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return;

    const activeW = w - 60;
    const activeH = h - 30;

    // ── Camera ──
    const targetX = chassis.position.x + activeW * 0.15;
    const targetY = chassis.position.y;

    cameraX += (targetX - cameraX) * 0.08;
    cameraY += (targetY - cameraY) * 0.08;

    // ── Clear ──
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);

    // ── Apply camera transform with clipping ──
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, activeW, activeH);
    ctx.clip();

    ctx.translate(activeW / 2 - cameraX, activeH / 2 - cameraY);

    // Grid
    drawGrid(cameraX, cameraY);

    // Candlesticks (behind terrain line) or nothing if line chart
    if (chartType === 'candle') {
      drawCandlesticks();
    }

    // Terrain surface line + fill
    drawTerrainLine();

    // Draw Checkered Flag at the end
    drawFinishLine();

    // Bike
    drawAxles();
    drawWheel(wheelA);
    drawWheel(wheelB);
    drawChassis();
    drawHead();

    ctx.restore();

    // Draw dynamic axes overlays on top in screen space
    drawAxes(activeW, activeH, w, h);
  }

  // ─── Game Loop ──────────────────────────────────────────────────
  let animFrameId = null;
  let gameFinished = false;

  function triggerGameFinished() {
    if (gameFinished || gameOver) return;
    gameFinished = true;

    const price    = getCurrentPrice();
    const distance = Math.max(0, Math.floor(chassis.position.x / 50));
    const profit   = (price - startPrice) * 10;

    onGameOver({ distance, finalPrice: price, finalProfit: profit, isFinished: true });
  }

  function gameLoop() {
    if (gameOver || gameFinished) {
      render();
      return;
    }

    // ── Input: drive + tilt ──
    if (keys.ArrowRight) {
      Body.setAngularVelocity(wheelA, Math.min(wheelA.angularVelocity + vc.torque, vc.maxSpeed));
      Body.setAngularVelocity(wheelB, Math.min(wheelB.angularVelocity + vc.torque, vc.maxSpeed));
      Body.setAngularVelocity(chassis, chassis.angularVelocity + vc.tiltForce);
    }
    if (keys.ArrowLeft) {
      Body.setAngularVelocity(wheelA, Math.max(wheelA.angularVelocity - vc.torque, -vc.maxSpeed));
      Body.setAngularVelocity(wheelB, Math.max(wheelB.angularVelocity - vc.torque, -vc.maxSpeed));
      Body.setAngularVelocity(chassis, chassis.angularVelocity - vc.tiltForce);
    }

    // ── Step physics ──
    Engine.update(engine, 1000 / 60);

    // ── Fell off map? ──
    if (chassis.position.y > maxTerrainY + PHYSICS.fallThreshold) {
      triggerGameOver();
      render();
      return;
    }

    // ── Crossed finish line? ──
    const xScale = chartType === 'candle' ? 60 : 100;
    const finishX = (bars.length - 1) * xScale;
    if (chassis.position.x >= finishX) {
      triggerGameFinished();
      render();
      return;
    }

    // ── Stats ──
    const dist = Math.max(0, Math.floor(chassis.position.x / 50));
    if (dist !== lastReportedDist) {
      lastReportedDist = dist;
      const price  = getCurrentPrice();
      const profit = (price - startPrice) * 10;

      const currentBarIndex = Math.max(0, Math.min(bars.length - 1, Math.floor(chassis.position.x / xScale)));
      const currentBar = bars[currentBarIndex];
      let timestamp = currentBar.t;
      if (timestamp < 100000) {
        timestamp = 1764569498 + timestamp * 86400;
      }
      const currentYear = new Date(timestamp * 1000).getFullYear();

      onStats({
        price: Math.round(price * 100) / 100,
        distance: dist,
        profit: Math.round(profit),
        year: currentYear
      });
    }

    // ── Render ──
    render();

    // ── Next frame ──
    animFrameId = requestAnimationFrame(gameLoop);
  }

  // Start the loop
  animFrameId = requestAnimationFrame(gameLoop);

  // ─── Destroy / Cleanup ──────────────────────────────────────────
  function destroy() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    clearTimeout(armTimeout);

    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup',   onKeyUp);
    touchCleanups.forEach(fn => fn());

    resizeObserver.disconnect();

    Events.off(engine, 'collisionStart');
    Composite.clear(engine.world, false);
    Engine.clear(engine);
  }

  return { destroy };
}
