import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../IslesTypes';
import { dim, glow, lit, mulberry } from '../../../../art/IsleArt';
import { bell, carvedNumber, greyedGhost, lily, spade } from './art';
import {
  BELL_VERDIGRIS, BONE, BONE_DARK, BRONZE, BRONZE_DARK, BRONZE_LIT, BRUISE_DARK, BRUISE_LIT, CRAPE, CRAPE_LIT,
  DIRT, DIRT_DARK, DIRT_LIT, GREY, GREY_DARK, GREY_LIT, IRON, IRON_LIT, LAMP, LICHEN, MIRE, MIRE_SHEEN, MORTIS,
  MORTIS_DARK, MORTIS_LIT, PEAT_DARK, SHROUD, SLAB, SLAB_DARK, SLAB_LIT, TIMBER, TIMBER_DARK, VENOM, WISP,
} from './palette';
import { clamp, dist, segDist, wrapAngle } from './util';

/**
 * Prince Mortis, Keeper of the Register — the Matriarch's broodling who governs the Grave Court.
 *
 * Mortis is the quietest of Nyxa's six. He keeps the Burial Register in his own hand, digs the
 * first spadeful of every grave himself, and speaks of the greyed as *resting*. He believes it.
 * His mother rations the Draught and he receives what is left over when the rationing is done, and
 * he has made a whole religion out of being gentle with it. He fights like a funeral:
 *
 * • **Gravedigger** (stalking): he flings shovelfuls of grave-dirt that land in heaps you wade
 *   through, and stamps his spade to cut a field of graves across the floor that open together.
 * • **Requiem** (anchored, the room goes dark): he tolls. Rings of knell roll out from him with one
 *   quiet way through; the ghosts of the greyed rise from the floor and come for you, hands out;
 *   and the great bell of the Lych House drops on where you stood, then tolls once where it lands.
 * • **Rigor** (hard, blinking): he goes stiff and grey, pennies on his eyes — and so will you if
 *   you stand still. Winding sheets unroll across the floor at you, one and then another.
 */

const TOP = 96;

// ── Signature: Shovelful ─────────────────────────────────────────────
// He scoops and flings: clods of grave-earth arc over and land in a line across your path, each
// shadow growing under it. Each lands as a heap of loose earth that drags at your feet.

interface Clod { sx: number; sy: number; x: number; y: number; throwAt: number; landAt: number; landed: boolean; heapUntil: number; seed: number }

const shovelful = (tk: BossToolkit): SignatureMove => {
  let clods: Clod[] = [];
  let lastDrag = 0;
  const HEAP_R = 40;
  return {
    durationMs: 1800,
    windupMs: 600,
    gesture: 'sweep',
    tell: 'SHOVELFUL',
    cast(time) {
      const p = tk.player;
      const a = tk.angleToPlayer();
      const nx = -Math.sin(a), ny = Math.cos(a);
      const n = tk.hard ? 5 : 4;
      for (let i = 0; i < n; i++) {
        const k = i - (n - 1) / 2;
        const fwd = i % 2 ? 34 : -12;
        clods.push({
          sx: tk.bossX, sy: tk.bossY - 30,
          x: tk.clampX(p.x + nx * k * 80 + Math.cos(a) * fwd), y: tk.clampY(p.y + ny * k * 80 + Math.sin(a) * fwd),
          throwAt: time + i * 110, landAt: time + tk.warn(950) + i * 140, landed: false, heapUntil: 0, seed: Math.random() * 6,
        });
      }
      tk.sfx('rock-throw');
    },
    update(time) {
      const p = tk.player;
      const up = p.active && p.hp > 0;
      for (const c of clods) {
        if (c.landed || time < c.landAt) continue;
        c.landed = true;
        c.heapUntil = time + 4500;
        tk.sfx('stone-slam');
        if (up && dist(p.x, p.y, c.x, c.y) < 46) tk.hitPlayer(13, c.x, c.y);
      }
      if (up && time - lastDrag > 250 && clods.some((c) => c.landed && time < c.heapUntil && dist(p.x, p.y, c.x, c.y) < HEAP_R)) {
        lastDrag = time;
        tk.slowPlayer(0.58, 360);
      }
      clods = clods.filter((c) => !c.landed || time < c.heapUntil);
    },
    drawGround(g, time) {
      for (const c of clods) {
        if (!c.landed) {
          // The shadow of the falling clod, darkening as it comes down.
          const k = clamp((time - c.throwAt) / Math.max(1, c.landAt - c.throwAt), 0, 1);
          g.fillStyle(0x000000, 0.12 + k * 0.3); g.fillEllipse(c.x, c.y + 4, 30 + k * 40, 10 + k * 14);
          g.lineStyle(1.5, DIRT_LIT, 0.3 + k * 0.5); g.strokeEllipse(c.x, c.y + 4, 92, 34);
          continue;
        }
        // A heap of loose grave-earth: lumps, a root, a worm, a bone.
        const fade = clamp((c.heapUntil - time) / 600, 0, 1);
        g.fillStyle(DIRT_DARK, 0.9 * fade); g.fillEllipse(c.x, c.y + 4, HEAP_R * 2 + 10, HEAP_R + 12);
        g.fillStyle(DIRT, fade); g.fillEllipse(c.x, c.y, HEAP_R * 2 - 4, HEAP_R + 2);
        g.fillStyle(DIRT_LIT, 0.8 * fade); g.fillEllipse(c.x - 10, c.y - 6, HEAP_R, HEAP_R * 0.4);
        for (let i = 0; i < 6; i++) {
          const a = c.seed + i * 1.1;
          g.fillStyle(i % 2 ? DIRT_DARK : DIRT_LIT, fade); g.fillCircle(c.x + Math.cos(a) * 24, c.y + Math.sin(a) * 9, 3 + (i % 3));
        }
        g.lineStyle(1.5, TIMBER, fade); g.lineBetween(c.x + 8, c.y - 2, c.x + 22, c.y - 8);
        g.lineStyle(2, 0xc07a7a, fade); g.beginPath(); g.arc(c.x - 14, c.y + 4, 4, 0, Math.PI, false); g.strokePath();
        g.fillStyle(BONE, fade); g.fillRect(c.x + 2, c.y + 6, 9, 2.5); g.fillCircle(c.x + 2, c.y + 7, 1.6); g.fillCircle(c.x + 11, c.y + 7, 1.6);
      }
    },
    drawAir(g, time) {
      for (const c of clods) {
        if (c.landed || time < c.throwAt) continue;
        const k = clamp((time - c.throwAt) / Math.max(1, c.landAt - c.throwAt), 0, 1);
        const x = c.sx + (c.x - c.sx) * k, y = c.sy + (c.y - c.sy) * k - Math.sin(k * Math.PI) * 170;
        g.fillStyle(DIRT_DARK, 1); g.fillCircle(x + 2, y + 2, 11);
        g.fillStyle(DIRT, 1); g.fillCircle(x, y, 10);
        g.fillStyle(DIRT_LIT, 1); g.fillCircle(x - 3, y - 3, 4);
        for (let i = 0; i < 3; i++) { g.fillStyle(DIRT, 0.6); g.fillCircle(x - Math.cos(k * 6 + i) * 12, y + 6 + i * 4, 2); }
      }
    },
    onPhaseEnd() { clods = []; },
  };
};

// ── Signature: Open the Ground ───────────────────────────────────────
// He stamps his spade and the floor is cut into graves — rows of them across the room, one lane
// left whole. The turf lines show first; then every grave opens at once and stays open a moment.

interface Pit { x: number; y: number; openAt: number; closeAt: number }

const openGround = (tk: BossToolkit): SignatureMove => {
  let pits: Pit[] = [];
  let lastFall = 0;
  const PW = 88, PH = 38;
  return {
    durationMs: 2300,
    windupMs: 700,
    gesture: 'slam',
    tell: 'OPEN THE GROUND',
    cast(time) {
      const p = tk.player;
      const rows = [-90, 0, 90].map((d) => clamp(p.y + d, TOP + 40, tk.H - 40));
      const lane = Math.floor(Math.random() * 8);
      const openAt = time + tk.warn(1250);
      pits = [];
      const seen = new Set<number>();
      for (const y of rows) {
        const ry = Math.round(y);
        if (seen.has(ry)) continue;
        seen.add(ry);
        for (let c = 0; c < 8; c++) {
          if (c === lane) continue;
          pits.push({ x: 80 + c * 114, y: ry, openAt, closeAt: openAt + 2400 });
        }
      }
      tk.sfx('quake');
    },
    update(time) {
      const p = tk.player;
      if (!(p.active && p.hp > 0) || time - lastFall < 900) return;
      for (const pt of pits) {
        if (time < pt.openAt || time > pt.closeAt) continue;
        if (Math.abs(p.x - pt.x) < PW / 2 + 4 && Math.abs(p.y - pt.y) < PH / 2 + 4) {
          lastFall = time;
          tk.hitPlayer(14, p.x, p.y);
          tk.slowPlayer(0.3, 800);
          tk.sfx('land');
          break;
        }
      }
      pits = pits.filter((pt) => time < pt.closeAt + 400);
    },
    drawGround(g, time) {
      for (const pt of pits) {
        const x0 = pt.x - PW / 2, y0 = pt.y - PH / 2;
        if (time < pt.openAt) {
          const k = clamp(1 - (pt.openAt - time) / 1250, 0, 1);
          g.fillStyle(DIRT_DARK, 0.1 + k * 0.3); g.fillRect(x0, y0, PW, PH);
          g.lineStyle(2, DIRT_LIT, 0.3 + k * 0.6); g.strokeRect(x0, y0, PW, PH);
          for (let d = 8; d < PW; d += 14) { g.lineStyle(1, DIRT_DARK, 0.3 + k * 0.4); g.lineBetween(x0 + d, y0 + 2, x0 + d - 4, y0 + PH - 2); }
          continue;
        }
        const closing = clamp((time - pt.closeAt) / 400, 0, 1);
        const a = 1 - closing;
        g.fillStyle(DIRT, a); g.fillRect(x0 - 4, y0 - 6, PW + 8, PH + 10);
        g.fillStyle(DIRT_DARK, a); g.fillRect(x0, y0, PW, PH);
        g.fillStyle(MIRE, a); g.fillRect(x0 + 5, y0 + 9, PW - 10, PH - 12);
        g.fillStyle(DIRT_LIT, 0.6 * a); g.fillRect(x0, y0, PW, 5);
        // Old coffin lids showing in the black.
        g.fillStyle(TIMBER_DARK, 0.7 * a); g.fillRect(x0 + 18, y0 + 18, PW - 36, 6);
      }
    },
    drawAir(g, time) {
      // Earth thrown up the moment they open.
      for (const pt of pits) {
        const k = (time - pt.openAt) / 450;
        if (k < 0 || k > 1) continue;
        for (let i = 0; i < 4; i++) {
          g.fillStyle(i % 2 ? DIRT : DIRT_LIT, 1 - k);
          g.fillCircle(pt.x - 30 + i * 20, pt.y - k * 34 + k * k * 30, 4);
        }
      }
    },
    onPhaseEnd() { pits = []; },
  };
};

// ── Signature: Knell ─────────────────────────────────────────────────
// He tolls the bell-rope over his shoulder, and rings of sound roll out of him one after
// another, each with one quiet way through, marked by white lilies. The quiet way drifts a
// little each ring; walk with it.

interface Knell { cx: number; cy: number; startAt: number; gap: number; hit: boolean }

const knell = (tk: BossToolkit): SignatureMove => {
  let rings: Knell[] = [];
  let hush = 0;
  let warnFrom = 0;
  const SPEED = 230, BAND = 14, GAP_HALF = 0.46;
  return {
    durationMs: 2600,
    windupMs: 800,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'KNELL',
    cast(time) {
      const n = tk.hard ? 4 : 3;
      const side = Math.random() < 0.5 ? -1 : 1;
      hush = tk.angleToPlayer() + side * 0.7;
      warnFrom = time;
      const first = time + tk.warn(700);
      rings = [];
      for (let i = 0; i < n; i++) rings.push({ cx: tk.bossX, cy: tk.bossY, startAt: first + i * 650, gap: hush + side * 0.28 * i, hit: false });
      tk.sfx('beam-charge');
    },
    update(time) {
      const p = tk.player;
      const up = p.active && p.hp > 0;
      for (const r of rings) {
        if (time < r.startAt) continue;
        const rad = ((time - r.startAt) / 1000) * SPEED;
        if (time - r.startAt < 30) tk.sfx('holy-chord');
        if (r.hit || !up) continue;
        const d = dist(r.cx, r.cy, p.x, p.y);
        if (Math.abs(d - rad) < BAND + 18 && Math.abs(wrapAngle(Math.atan2(p.y - r.cy, p.x - r.cx) - r.gap)) > GAP_HALF) {
          r.hit = true;
          tk.hitPlayer(12, p.x, p.y);
        }
      }
      rings = rings.filter((r) => time < r.startAt || ((time - r.startAt) / 1000) * SPEED < 1250);
    },
    drawGround(g, time) {
      const pending = rings.filter((r) => time < r.startAt);
      if (pending.length) {
        // The quiet way, shown before the first ring: a pale path of lilies out from him.
        const r = pending[0];
        const k = clamp((time - warnFrom) / Math.max(1, r.startAt - warnFrom), 0, 1);
        for (let d = 60; d < 700; d += 70) {
          const x = r.cx + Math.cos(r.gap) * d, y = r.cy + Math.sin(r.gap) * d;
          if (y < TOP || y > tk.H || x < 0 || x > tk.W) continue;
          lily(g, x, y, 0.8, 0.25 + k * 0.6);
        }
        g.lineStyle(2, BRONZE_LIT, 0.2 + k * 0.4); g.strokeCircle(r.cx, r.cy, 30 + k * 20);
      }
    },
    drawAir(g, time) {
      for (const r of rings) {
        if (time < r.startAt) continue;
        const rad = ((time - r.startAt) / 1000) * SPEED;
        const fade = clamp(1 - rad / 1250, 0, 1);
        const a0 = r.gap + GAP_HALF, a1 = r.gap + Math.PI * 2 - GAP_HALF;
        // A thick bronze swell of sound, an inner bright edge, and notches like a bell's rim.
        g.lineStyle(BAND * 2, BRONZE_DARK, 0.45 * fade); g.beginPath(); g.arc(r.cx, r.cy, rad, a0, a1, false); g.strokePath();
        g.lineStyle(BAND, BRONZE, 0.65 * fade); g.beginPath(); g.arc(r.cx, r.cy, rad, a0, a1, false); g.strokePath();
        g.lineStyle(2, BRONZE_LIT, 0.9 * fade); g.beginPath(); g.arc(r.cx, r.cy, rad - BAND * 0.5, a0, a1, false); g.strokePath();
        const steps = Math.max(8, Math.floor(rad / 18));
        for (let i = 0; i <= steps; i++) {
          const a = a0 + ((a1 - a0) * i) / steps;
          g.lineStyle(1.5, BELL_VERDIGRIS, 0.7 * fade);
          g.lineBetween(r.cx + Math.cos(a) * (rad - BAND), r.cy + Math.sin(a) * (rad - BAND), r.cx + Math.cos(a) * (rad + BAND), r.cy + Math.sin(a) * (rad + BAND));
        }
        // The lilies at the gap's lips.
        for (const e of [a0, a1]) lily(g, r.cx + Math.cos(e) * rad, r.cy + Math.sin(e) * rad + 6, 1, fade);
      }
    },
    onPhaseEnd() { rings = []; },
  };
};

// ── Signature: The Greyed Rise ───────────────────────────────────────
// Round you the floor cracks in grave-shapes and the greyed come up through it, hands out, and
// drift at you. One blow lays each to rest; a touch is the grave-cold.

interface Risen { x: number; y: number; riseAt: number; dieAt: number; gone: boolean; handle: StrikeTarget | null; seed: number; laidAt: number }

const greyedRise = (tk: BossToolkit): SignatureMove => {
  let risen: Risen[] = [];
  const drop = (r: Risen) => { r.gone = true; r.handle?.remove(); r.handle = null; };
  return {
    durationMs: 2000,
    windupMs: 700,
    gesture: 'raise',
    tell: 'THE GREYED RISE',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 5 : 4;
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = base + (i / n) * Math.PI * 2;
        const d = 230 + Math.random() * 60;
        risen.push({
          x: tk.clampX(p.x + Math.cos(a) * d), y: tk.clampY(p.y + Math.sin(a) * d),
          riseAt: time + tk.warn(1000), dieAt: time + tk.warn(1000) + 6500, gone: false, handle: null, seed: Math.random() * 6, laidAt: 0,
        });
      }
      tk.sfx('curse-cast');
    },
    update(time, dt) {
      const p = tk.player;
      for (const r of risen) {
        if (r.gone || time < r.riseAt) continue;
        if (!r.handle) {
          const self = r;
          r.handle = tk.spawnTarget({
            x: r.x, y: r.y - 16, r: 18,
            onStruck: () => { if (self.gone) return; self.laidAt = tk.now; drop(self); tk.sfx('hush'); },
          });
        }
        if (time > r.dieAt) { drop(r); continue; }
        const d = Math.max(1, dist(r.x, r.y, p.x, p.y));
        const sp = 62 * (time - r.riseAt < 500 ? 0.2 : 1);
        r.x += ((p.x - r.x) / d) * sp * dt;
        r.y += ((p.y - r.y) / d) * sp * dt;
        r.handle?.moveTo(r.x, r.y - 16);
        if (d < 28 && p.active && p.hp > 0) {
          tk.hitPlayer(11, p.x, p.y);
          tk.slowPlayer(0.6, 1200);
          tk.sfx('frost-blast');
          drop(r);
        }
      }
      risen = risen.filter((r) => !r.gone || time - r.laidAt < 600);
    },
    drawGround(g, time) {
      for (const r of risen) {
        if (r.gone) continue;
        if (time < r.riseAt) {
          // The floor cracking in the shape of a grave.
          const k = clamp(1 - (r.riseAt - time) / 1000, 0, 1);
          g.fillStyle(PEAT_DARK, 0.3 + k * 0.4); g.fillRect(r.x - 22, r.y - 10, 44, 20);
          g.lineStyle(1.5, GREY_LIT, 0.3 + k * 0.6); g.strokeRect(r.x - 22, r.y - 10, 44, 20);
          for (let i = 0; i < 4; i++) { g.lineStyle(1, GREY_LIT, k * 0.7); g.lineBetween(r.x, r.y, r.x + Math.cos(i * 1.7) * 30 * k, r.y + Math.sin(i * 1.7) * 14 * k); }
          // Grey fingers pushing up.
          if (k > 0.5) for (let i = 0; i < 4; i++) { g.fillStyle(GREY, (k - 0.5) * 2); g.fillRect(r.x - 6 + i * 4, r.y - 2 - (k - 0.5) * 14, 2.5, (k - 0.5) * 14); }
          continue;
        }
        g.fillStyle(WISP, 0.07); g.fillEllipse(r.x, r.y + 6, 44, 12);
      }
    },
    drawAir(g, time) {
      for (const r of risen) {
        if (r.gone) {
          // Laid to rest: the sheet folding down into a little heap of linen.
          const k = clamp((time - r.laidAt) / 600, 0, 1);
          g.fillStyle(SHROUD, 0.7 * (1 - k)); g.fillEllipse(r.x, r.y - 6 + k * 6, 30 * (1 - k * 0.4), 24 * (1 - k));
          continue;
        }
        if (time < r.riseAt) continue;
        const up = clamp((time - r.riseAt) / 500, 0, 1);
        greyedGhost(g, r.x, r.y + (1 - up) * 22, 1.05, (tk.dark ? 1 : 0.88) * up, time, r.seed, 0.8);
      }
    },
    onPhaseEnd() { for (const r of risen) r.handle?.remove(); risen = []; },
  };
};

// ── Signature: The Great Bell ────────────────────────────────────────
// The shadow of a bell's mouth opens on the floor where you stand; the Lych House bell comes
// down on it. It stands there, then tolls once — a single ring out from where it fell, quiet
// only on the side that faces him — and is drawn back up into the dark.

const greatBell = (tk: BossToolkit): SignatureMove => {
  const R = 66;
  let at: { x: number; y: number; castAt: number; dropAt: number; tollAt: number; liftAt: number; dropped: boolean; tolled: boolean; ringHit: boolean; gap: number } | null = null;
  const RING_SPEED = 270, BAND = 14, GAP_HALF = 0.55;
  return {
    durationMs: 1500,
    windupMs: 650,
    gesture: 'slam',
    tell: 'THE GREAT BELL',
    cast(time) {
      const p = tk.player;
      const x = tk.clampX(p.x, 80), y = tk.clampY(p.y, 80);
      const dropAt = time + tk.warn(1100);
      at = { x, y, castAt: time, dropAt, tollAt: dropAt + 1700, liftAt: dropAt + 2500, dropped: false, tolled: false, ringHit: false, gap: 0 };
      tk.sfx('beam-charge');
    },
    update(time) {
      const b = at;
      if (!b) return;
      const p = tk.player;
      const up = p.active && p.hp > 0;
      if (!b.dropped && time >= b.dropAt) {
        b.dropped = true;
        tk.sfx('gravity-slam');
        if (up && dist(p.x, p.y, b.x, b.y) < R) { tk.hitPlayer(18, p.x, p.y); tk.slowPlayer(0.45, 700); }
      }
      if (!b.tolled && time >= b.tollAt) {
        b.tolled = true;
        b.gap = Math.atan2(tk.bossY - b.y, tk.bossX - b.x);
        tk.sfx('holy-chord');
      }
      if (b.tolled && !b.ringHit && up) {
        const rad = R + ((time - b.tollAt) / 1000) * RING_SPEED;
        const d = dist(b.x, b.y, p.x, p.y);
        if (Math.abs(d - rad) < BAND + 18 && Math.abs(wrapAngle(Math.atan2(p.y - b.y, p.x - b.x) - b.gap)) > GAP_HALF) { b.ringHit = true; tk.hitPlayer(10, p.x, p.y); }
      }
      if (time > b.liftAt + 3500) at = null;
    },
    drawGround(g, time) {
      const b = at;
      if (!b) return;
      if (!b.dropped) {
        const k = clamp((time - b.castAt) / Math.max(1, b.dropAt - b.castAt), 0, 1);
        g.fillStyle(0x000000, 0.15 + k * 0.4); g.fillEllipse(b.x, b.y, R * 2 * (0.5 + k * 0.5), R * 1.1 * (0.5 + k * 0.5));
        g.lineStyle(3, BRONZE_LIT, 0.3 + k * 0.6); g.strokeEllipse(b.x, b.y, R * 2, R * 1.1);
        return;
      }
      if (time < b.liftAt + 400) {
        // Cracked slabs round the rim where it landed.
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          g.lineStyle(1.5, PEAT_DARK, 0.7); g.lineBetween(b.x + Math.cos(a) * R, b.y + Math.sin(a) * R * 0.55, b.x + Math.cos(a) * (R + 22), b.y + Math.sin(a) * (R + 12) * 0.55);
        }
      }
    },
    drawAir(g, time) {
      const b = at;
      if (!b) return;
      const r = R / 1.05;
      if (!b.dropped) {
        // Coming down out of the dark over the last moment.
        const k = clamp(1 - (b.dropAt - time) / 320, 0, 1);
        if (k > 0) bell(g, b.x, b.y - 1.45 * r - (1 - k) * 340, r, 0, BRONZE);
        return;
      }
      if (time < b.liftAt) {
        const shake = time - b.dropAt < 200 ? Math.sin(time / 20) * 3 : 0;
        const swing = b.tolled && time - b.tollAt < 600 ? Math.sin((time - b.tollAt) / 60) * 0.06 : 0;
        bell(g, b.x + shake, b.y - 1.45 * r, r, swing, BRONZE);
        if (time - b.dropAt < 300) { const k = (time - b.dropAt) / 300; g.lineStyle(4, BONE, 1 - k); g.strokeEllipse(b.x, b.y, R * 2 + k * 80, R * 1.1 + k * 40); }
      } else {
        const k = clamp((time - b.liftAt) / 500, 0, 1);
        if (k < 1) bell(g, b.x, b.y - 1.45 * r - k * 300, r, 0, BRONZE);
      }
      if (b.tolled) {
        const rad = R + ((time - b.tollAt) / 1000) * RING_SPEED;
        const fade = clamp(1 - rad / 1100, 0, 1);
        if (fade > 0) {
          const a0 = b.gap + GAP_HALF, a1 = b.gap + Math.PI * 2 - GAP_HALF;
          g.lineStyle(BAND * 2, BRONZE_DARK, 0.4 * fade); g.beginPath(); g.arc(b.x, b.y, rad, a0, a1, false); g.strokePath();
          g.lineStyle(3, BRONZE_LIT, 0.9 * fade); g.beginPath(); g.arc(b.x, b.y, rad, a0, a1, false); g.strokePath();
        }
      }
    },
    onPhaseEnd() { at = null; },
  };
};

// ── Signature: Rigor ─────────────────────────────────────────────────
// For a while after he casts it, standing still is death's own business: a grey frost creeps in
// on you whenever you stop, and if it closes you are stiffened — held nearly still, then hurt.
// Keep moving and it never closes.

const rigor = (tk: BossToolkit): SignatureMove => {
  let until = 0;
  let meter = 0;
  let lx = 0, ly = 0;
  let stiffAt = -9999;
  let hurt = true;
  return {
    durationMs: 1200,
    windupMs: 500,
    gesture: 'flex',
    tell: 'RIGOR',
    cast(time) {
      until = time + (tk.hard ? 8000 : 7000);
      meter = 0;
      lx = tk.player.x; ly = tk.player.y;
      tk.sfx('frost-blast');
    },
    update(time, dt) {
      const p = tk.player;
      const moved = dist(p.x, p.y, lx, ly);
      lx = p.x; ly = p.y;
      if (time - stiffAt < 900) {
        if (!hurt && time - stiffAt >= 700) { hurt = true; tk.hitPlayer(14, p.x, p.y); tk.sfx('ice-shatter'); }
        return;
      }
      if (time > until || !(p.active && p.hp > 0)) { meter = Math.max(0, meter - dt * 2); return; }
      const speed = dt > 0 ? moved / dt : 999;
      meter = clamp(meter + (speed < 40 ? dt / 1.05 : -dt * 1.4), 0, 1);
      if (meter >= 1) {
        meter = 0;
        stiffAt = time;
        hurt = false;
        tk.slowPlayer(0.25, 900);
        tk.sfx('status-freeze');
      }
    },
    drawGround(g, time) {
      const p = tk.player;
      if (time < until) {
        // Grey frost creeping in from the walls while the rule holds.
        const k = clamp((until - time) / 800, 0, 1);
        for (let i = 0; i < 4; i++) { g.lineStyle(26, GREY_LIT, 0.035 * k); g.strokeRect(i * 14, TOP + i * 14, tk.W - i * 28, tk.H - TOP - i * 28); }
        if (meter > 0) {
          const r = 70 - meter * 44;
          g.lineStyle(2 + meter * 3, GREY_LIT, 0.25 + meter * 0.6); g.strokeCircle(p.x, p.y + 4, r);
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + i;
            g.lineStyle(1.5, GREY_LIT, meter * 0.8);
            g.lineBetween(p.x + Math.cos(a) * (r + 30), p.y + 4 + Math.sin(a) * (r + 30), p.x + Math.cos(a) * r, p.y + 4 + Math.sin(a) * r);
          }
        }
      }
    },
    drawAir(g, time) {
      const p = tk.player;
      const since = time - stiffAt;
      if (since < 900) {
        // Stiffened: a grey crust over the body, cracking when the hurt lands.
        const k = clamp(since / 700, 0, 1);
        g.fillStyle(GREY, 0.45); g.fillCircle(p.x, p.y - 8, 24);
        g.lineStyle(2, GREY_LIT, 0.9); g.strokeCircle(p.x, p.y - 8, 24);
        for (let i = 0; i < 6; i++) { const a = i * 1.05; g.lineStyle(1.2, GREY_DARK, 0.4 + k * 0.6); g.lineBetween(p.x, p.y - 8, p.x + Math.cos(a) * 22 * k, p.y - 8 + Math.sin(a) * 22 * k); }
      } else if (meter > 0.4 && time < until) {
        g.fillStyle(GREY_LIT, (meter - 0.4) * 0.5); g.fillCircle(p.x, p.y - 8, 22);
      }
    },
    onPhaseEnd() { until = 0; meter = 0; },
  };
};

// ── Signature: Winding Sheet ─────────────────────────────────────────
// He shakes out a winding sheet and it unrolls across the floor at you in one long white lash;
// as it lands, he shakes out a second at wherever you went.

interface Sheet { ox: number; oy: number; a: number; warnAt: number; fireAt: number; hit: boolean; second: boolean }

const windingSheet = (tk: BossToolkit): SignatureMove => {
  let sheets: Sheet[] = [];
  const HALF = 34, LEN = 1000, ROLL_MS = 260;
  const aim = (time: number, second: boolean): Sheet => ({ ox: tk.bossX, oy: tk.bossY, a: tk.angleToPlayer(), warnAt: time, fireAt: time + tk.warn(second ? 750 : 1000), hit: false, second });
  return {
    durationMs: 2600,
    windupMs: 700,
    gesture: 'sweep',
    tell: 'WINDING SHEET',
    cast(time) {
      sheets = [aim(time, false)];
      tk.sfx('whoosh');
    },
    update(time) {
      const p = tk.player;
      for (const s of [...sheets]) {
        if (time < s.fireAt) continue;
        if (!s.second && !sheets.some((o) => o.second)) sheets.push(aim(time, true));
        if (s.hit || !(p.active && p.hp > 0)) continue;
        const reach = clamp((time - s.fireAt) / ROLL_MS, 0, 1) * LEN;
        if (time - s.fireAt > ROLL_MS + 200) continue;
        if (segDist(p.x, p.y, s.ox, s.oy, s.ox + Math.cos(s.a) * reach, s.oy + Math.sin(s.a) * reach) < HALF + 12) {
          s.hit = true;
          tk.hitPlayer(13, p.x, p.y);
          tk.slowPlayer(0.5, 1000);
          tk.sfx('whip');
        }
      }
      sheets = sheets.filter((s) => time < s.fireAt + 900);
    },
    drawGround(g, time) {
      for (const s of sheets) {
        if (time >= s.fireAt) continue;
        const k = clamp((time - s.warnAt) / Math.max(1, s.fireAt - s.warnAt), 0, 1);
        const ex = s.ox + Math.cos(s.a) * LEN, ey = s.oy + Math.sin(s.a) * LEN;
        const nx = -Math.sin(s.a) * HALF, ny = Math.cos(s.a) * HALF;
        g.fillStyle(SHROUD, 0.06 + k * 0.12);
        g.fillPoints([{ x: s.ox + nx, y: s.oy + ny }, { x: ex + nx, y: ey + ny }, { x: ex - nx, y: ey - ny }, { x: s.ox - nx, y: s.oy - ny }], true);
        g.lineStyle(1.5, SHROUD, 0.3 + k * 0.5);
        g.lineBetween(s.ox + nx, s.oy + ny, ex + nx, ey + ny); g.lineBetween(s.ox - nx, s.oy - ny, ex - nx, ey - ny);
      }
    },
    drawAir(g, time) {
      for (const s of sheets) {
        const ca = Math.cos(s.a), sa = Math.sin(s.a);
        if (time < s.fireAt) {
          // The rolled bolt of linen in his hands, trembling.
          const j = Math.sin(time / 40) * 2;
          g.fillStyle(SHROUD, 1); g.fillEllipse(s.ox + ca * 40 + j, s.oy + sa * 40 - 10, 26, 16);
          g.lineStyle(1, GREY_DARK, 0.6); g.strokeEllipse(s.ox + ca * 40 + j, s.oy + sa * 40 - 10, 14, 8);
          continue;
        }
        const k = clamp((time - s.fireAt) / ROLL_MS, 0, 1);
        const fade = clamp(1 - (time - s.fireAt - ROLL_MS) / 640, 0, 1);
        const reach = k * LEN;
        // The sheet: a long white band, folds across it, its free edge rippling.
        const steps = 24;
        const top: { x: number; y: number }[] = [], bot: { x: number; y: number }[] = [];
        for (let i = 0; i <= steps; i++) {
          const d = (i / steps) * reach;
          const wav = Math.sin(d / 40 - time / 70) * 6;
          top.push({ x: s.ox + ca * d - sa * (HALF + wav), y: s.oy + sa * d + ca * (HALF + wav) });
          bot.push({ x: s.ox + ca * d + sa * (HALF - wav * 0.5), y: s.oy + sa * d - ca * (HALF - wav * 0.5) });
        }
        g.fillStyle(SHROUD, 0.85 * fade); g.fillPoints([...top, ...bot.reverse()], true);
        for (let d = 30; d < reach; d += 46) {
          g.lineStyle(1.5, GREY, 0.45 * fade);
          g.lineBetween(s.ox + ca * d - sa * HALF, s.oy + sa * d + ca * HALF, s.ox + ca * (d + 14) + sa * HALF, s.oy + sa * (d + 14) - ca * HALF);
        }
        g.lineStyle(2, BONE_DARK, 0.6 * fade); g.lineBetween(s.ox, s.oy, s.ox + ca * reach, s.oy + sa * reach);
      }
    },
    onPhaseEnd() { sheets = []; },
  };
};

// ── The Prince ───────────────────────────────────────────────────────

export const MORTIS_BOSS: WorldBossDef = {
  worldId: 'isle:mortis',
  name: 'Prince Mortis',
  title: 'Keeper of the Register',
  color: MORTIS,
  colorLit: MORTIS_LIT,
  colorDark: MORTIS_DARK,
  accent: VENOM,
  // Tier 4 of the seventh isle.
  damageMult: 1.45,

  intro: [
    'Shh. Mind the slabs; there are names on them. You are standing on the Ashby girl.',
    'I keep the Register, stranger. Every name goes in, and every name goes down. Shall I write yours?',
  ],
  banter: [
    'They are not dead. They are resting. Mother says so, and I have never once known her lie about rest.',
    'I dig the first spadeful of every grave myself. It is the least I can do. It is, in fact, the least.',
    'A bell rang last night in the east field. I went and stood by it until it stopped.',
    'The Draught is a kindness. Rationing it is a larger kindness. You would not understand.',
    'Lie still. Everything here is easier lying still.',
  ],
  defeatLine: 'THE BELL GOES QUIET',
  resumeLine: 'You came back. They usually don\'t. I wrote you in, you know. I\'ll have to cross it out.',

  phases: [
    {
      name: 'Gravedigger',
      line: 'Every grave in this court I opened with my own spade. Here. Let me show you the first cut.',
      hp: 570,
      cycle: [
        'sig:shovel', 'volley', 'sig:ground', 'quake', 'sig:shovel',
        'minefield', 'sig:ground', 'barrage', 'sig:shovel',
      ],
      harass: ['h-flak', 'h-mines'],
      restMs: 1150,
      harassMs: 3200,
    },
    {
      name: 'Requiem',
      line: 'Then I shall toll for you. Listen. They hear it, under the slabs. They always come when it rings.',
      hp: 670,
      cycle: [
        'sig:knell', 'sig:greyed', 'radial', 'sig:bell', 'sig:knell',
        'homing', 'sig:greyed', 'spiral', 'sig:bell',
      ],
      harass: ['h-orbs', 'h-rune'],
      restMs: 1050,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'LIE STILL',
    extraPhase: {
      name: 'Rigor',
      line: 'Mother\'s pennies on my eyes. I can\'t see you now. I don\'t need to. Only stop moving.',
      hp: 490,
      cycle: [
        'sig:rigor', 'sig:sheet', 'lanes', 'sig:ground', 'sig:rigor',
        'sig:sheet', 'sweep', 'sig:knell', 'sig:greyed',
      ],
      harass: ['h-snipe', 'h-lane'],
      restMs: 950,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 5, speed: 220, spreadRad: 0.45 },
    radial: { count: 16, speed: 175 },
    spiral: { arms: 3, speed: 170 },
    minefield: { count: 5 },
  },

  signatures: {
    shovel: shovelful,
    ground: openGround,
    knell,
    greyed: greyedRise,
    bell: greatBell,
    rigor,
    sheet: windingSheet,
  },

  look: {
    crest: 'none', pattern: 'scales', aura: 'dust', hands: 'ball',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: VENOM,
  },
  phaseStyles: [
    { movement: 'stalk', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'gloom', tint: 'cold', look: { aura: 'smoke', hands: 'wisp', crest: 'veil' } },
    { movement: 'blink', gimmick: 'none', tint: 'pale', look: { aura: 'frost', hands: 'claw', mouth: 'stitch' } },
  ],

  /**
   * The Keeper's tells. A broodling's head: ash-violet scale with a raised serpent hood fanning
   * behind it, a flicking forked tongue. As the Gravedigger he wears a wide black digger's hat
   * with a crape band trailing, and carries his spade, its blade wet with peat. In the Requiem the
   * hat is off, his hood is spread wide and hung with tiny silver bells, a bell-rope crosses his
   * chest, and a handbell rings in his fist. In Rigor he is bound in winding-sheet bands, frosted
   * grey, a bronze penny over each eye.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const phase = s.phaseIdx;
    const rigorPhase = s.hard && phase >= 2;
    const requiem = phase === 1;
    // The serpent hood behind the head, fanned wider in the Requiem.
    const spread = requiem ? 1.5 : rigorPhase ? 0.9 : 1.15;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + 0.25 + (i / 8) * (Math.PI - 0.5);
      const px = s.x + Math.cos(a) * R * spread, py = s.y - R * 0.1 + Math.sin(a) * R * spread * 0.95;
      g.fillStyle(i % 2 ? MORTIS_DARK : dim(MORTIS, 0.25), 0.95); g.fillEllipse(px, py, R * 0.42, R * 0.3);
      if (requiem) { bell(g, px, py + R * 0.12, 2.6, Math.sin(s.t / 120 + i) * 0.4, 0xd0d4dc); }
    }
    // The hood's spectacle mark — two pale rings, as on a cobra.
    if (requiem) for (const k of [-1, 1]) { g.lineStyle(2, MORTIS_LIT, 0.7); g.strokeCircle(s.x + k * R * 0.9, s.y - R * 0.95, R * 0.14); }
    // Forked tongue, flicking.
    const flick = (s.t % 1800) < 260;
    if (flick) {
      const tx = s.x + Math.cos(s.facing) * R * 0.5, ty = s.y + R * 0.3;
      g.lineStyle(2, 0xb83a5a, 1); g.lineBetween(s.x, s.y + R * 0.25, tx, ty);
      g.lineBetween(tx, ty, tx + Math.cos(s.facing - 0.4) * 6, ty + Math.sin(s.facing - 0.4) * 6);
      g.lineBetween(tx, ty, tx + Math.cos(s.facing + 0.4) * 6, ty + Math.sin(s.facing + 0.4) * 6);
    }
    if (phase === 0) {
      // The digger's hat: wide brim, low crown, a crape band whose tails stream behind him.
      g.fillStyle(CRAPE, 1); g.fillEllipse(s.x, s.y - R * 0.86, R * 2.3, R * 0.5);
      g.fillStyle(CRAPE_LIT, 0.6); g.fillEllipse(s.x - R * 0.3, s.y - R * 0.92, R * 1.2, R * 0.16);
      g.fillStyle(CRAPE, 1); g.fillRect(s.x - R * 0.55, s.y - R * 1.45, R * 1.1, R * 0.6);
      g.fillEllipse(s.x, s.y - R * 1.45, R * 1.1, R * 0.3);
      g.fillStyle(MORTIS_DARK, 1); g.fillRect(s.x - R * 0.56, s.y - R * 1.05, R * 1.12, R * 0.14);
      const sw = Math.sin(s.t / 260) * 4;
      g.lineStyle(3, CRAPE, 1); g.lineBetween(s.x + R * 0.5, s.y - R, s.x + R * 1.2 + sw, s.y - R * 0.3);
      g.lineStyle(2.5, CRAPE, 1); g.lineBetween(s.x + R * 0.5, s.y - R, s.x + R * 1.0 + sw * 0.6, s.y - R * 0.1);
      // The spade, held upright in the second hand, the blade peat-black.
      const h = s.hands[1];
      if (h) spade(g, h.x + 4, h.y + 22, -Math.PI / 2 - 0.12 - s.castGlow * 0.5, 58);
      // A clod of peat clinging to his front.
      g.fillStyle(DIRT, 0.9); g.fillEllipse(s.x - R * 0.35, s.y + R * 0.6, 10, 6);
    } else if (requiem) {
      // The bell-rope across his chest, and the handbell ringing in his fist.
      g.lineStyle(4, BONE_DARK, 1); g.lineBetween(s.x - R * 0.8, s.y - R * 0.6, s.x + R * 0.7, s.y + R * 0.8);
      g.lineStyle(1.5, BONE, 0.8); for (let k = 0; k < 6; k++) { const t = k / 6; g.lineBetween(s.x - R * 0.8 + R * 1.5 * t, s.y - R * 0.6 + R * 1.4 * t, s.x - R * 0.74 + R * 1.5 * t, s.y - R * 0.5 + R * 1.4 * t); }
      const h = s.hands[1];
      if (h) {
        g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(h.x, h.y, h.x, h.y - 12);
        bell(g, h.x, h.y - 6, 7, Math.sin(s.t / 90) * (0.3 + s.castGlow * 0.5), BRONZE);
      }
    } else if (rigorPhase) {
      // Winding-sheet bands across him, frost grey, pennies on his eyes.
      for (let k = -1; k <= 1; k++) {
        g.lineStyle(R * 0.22, SHROUD, 0.9); g.lineBetween(s.x - R * 0.95, s.y + k * R * 0.42 - R * 0.15, s.x + R * 0.95, s.y + k * R * 0.42 + R * 0.15);
        g.lineStyle(1, GREY, 0.7); g.lineBetween(s.x - R * 0.95, s.y + k * R * 0.42 - R * 0.05, s.x + R * 0.95, s.y + k * R * 0.42 + R * 0.25);
      }
      g.fillStyle(GREY_LIT, 0.25); g.fillCircle(s.x, s.y, R);
      const lx = Math.cos(s.facing) * R * 0.13, ly = Math.sin(s.facing) * R * 0.1;
      for (const k of [-1, 1]) {
        const ex = s.x + k * R * 0.32 + lx, ey = s.y - R * 0.12 + ly;
        g.fillStyle(BRONZE_DARK, 1); g.fillCircle(ex, ey, R * 0.22);
        g.fillStyle(BRONZE, 1); g.fillCircle(ex, ey, R * 0.19);
        g.fillStyle(BRONZE_LIT, 0.9); g.fillCircle(ex - R * 0.05, ey - R * 0.05, R * 0.07);
        g.lineStyle(1, BRONZE_DARK, 0.8); g.strokeCircle(ex, ey, R * 0.12);
      }
      // Frost flecks shed as he moves.
      for (let i = 0; i < 4; i++) { const ph = (s.t / 900 + i / 4) % 1; g.fillStyle(GREY_LIT, 0.8 * (1 - ph)); g.fillCircle(s.x - R + i * R * 0.6, s.y + R * 0.8 + ph * R, 2); }
    }
    if (s.enraged) { g.lineStyle(1.5, VENOM, 0.3 + Math.sin(s.t / 140) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /** In the Requiem's dark: his green eyes and the handbell are all you see of him. */
  drawLit(g, s) {
    if (!s.inGloom) return;
    const R = s.radius;
    const lx = Math.cos(s.facing) * R * 0.13, ly = Math.sin(s.facing) * R * 0.1;
    for (const k of [-1, 1]) {
      const ex = s.x + k * R * 0.32 + lx, ey = s.y - R * 0.12 + ly;
      glow(g, ex, ey, 10, VENOM, 0.1, 3);
      g.fillStyle(VENOM, 1); g.fillEllipse(ex, ey, R * 0.3, R * 0.3);
      g.fillStyle(0x0a0a0a, 1); g.fillEllipse(ex, ey, R * 0.07, R * 0.26);
    }
    const h = s.hands[1];
    if (h) { glow(g, h.x, h.y - 2, 14, BRONZE_LIT, 0.08, 3); bell(g, h.x, h.y - 6, 7, Math.sin(s.t / 90) * 0.4, BRONZE_LIT); }
    g.lineStyle(1, WISP, 0.25); g.strokeCircle(s.x, s.y, R * 1.2);
  },

  /**
   * The nave of the Lych House: the floor is laid with the court's own grave-slabs, names up,
   * black water seeping in the joints; a ring of brass round the bell-pit under the great bell at
   * the heart; iron candle-stands down both walls; and under the HUD the back wall's black timber
   * and lancet windows lit violet, the Register's lectern chained between them.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x6a7e1d);
    g.fillStyle(SLAB_DARK, 1); g.fillRect(0, 0, W, H);
    // Grave-slabs in staggered rows, each with its carving.
    const SW = 64, SH = 34;
    for (let row = 0; row * SH < H + SH; row++) {
      for (let c = -1; c * SW < W + SW; c++) {
        const x = c * SW + (row % 2) * (SW / 2), y = 100 + row * SH;
        const tone = rng();
        g.fillStyle(tone < 0.25 ? dim(SLAB, 0.12) : tone < 0.8 ? SLAB : lit(SLAB, 0.1), 1);
        g.fillRect(x + 1, y + 1, SW - 2, SH - 2);
        g.fillStyle(SLAB_DARK, 0.5);
        for (let k = 0; k < 3; k++) g.fillRect(x + 10, y + 7 + k * 7, SW * (0.3 + rng() * 0.4), 1.3);
        if (rng() < 0.1) { g.fillStyle(SLAB_DARK, 0.6); g.fillRect(x + SW / 2 - 1, y + 6, 2, 20); g.fillRect(x + SW / 2 - 7, y + 12, 14, 2); }
        if (rng() < 0.12) { g.fillStyle(MIRE, 0.7); g.fillEllipse(x + rng() * SW, y + SH - 2, 18, 4); }
        if (rng() < 0.15) { g.fillStyle(LICHEN, 0.35); g.fillCircle(x + rng() * SW, y + rng() * SH, 3); }
      }
    }
    // Black water seeping in the joints, a sheen on it.
    for (let i = 0; i < 18; i++) {
      const y = 100 + Math.floor(rng() * (H / SH)) * SH;
      const x = rng() * W;
      g.fillStyle(MIRE, 0.8); g.fillRect(x, y - 1, 40 + rng() * 80, 3);
      g.fillStyle(MIRE_SHEEN, 0.4); g.fillRect(x + 6, y - 1, 20, 1);
    }
    // The bell-pit at the heart: a brass ring, a dark well, the old rope's frayed end lying on it.
    const cx = W / 2, cy = (H + 110) / 2;
    g.fillStyle(BRONZE_DARK, 1); g.fillCircle(cx, cy, 112);
    g.fillStyle(BRONZE, 1); g.fillCircle(cx, cy, 106);
    g.fillStyle(BRONZE_LIT, 0.4); g.fillCircle(cx - 8, cy - 8, 98);
    g.fillStyle(MORTIS_DARK, 1); g.fillCircle(cx, cy, 94);
    g.fillStyle(BRUISE_DARK, 1); g.fillCircle(cx, cy, 80);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.lineStyle(2, BELL_VERDIGRIS, 0.7); g.lineBetween(cx + Math.cos(a) * 96, cy + Math.sin(a) * 96, cx + Math.cos(a) * 104, cy + Math.sin(a) * 104);
    }
    // Numbers round the ring: the hours a knell is rung.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      carvedNumber(g, cx + Math.cos(a) * 140, cy + Math.sin(a) * 140, i + 1, 12, SLAB_DARK, SLAB_LIT, 0.8);
    }
    g.lineStyle(5, BONE_DARK, 1); g.beginPath(); g.moveTo(cx - 20, cy - 10); g.lineTo(cx + 10, cy + 6); g.lineTo(cx + 26, cy - 4); g.strokePath();
    for (let k = 0; k < 6; k++) { g.lineStyle(1, BONE, 0.8); g.lineBetween(cx + 26, cy - 4, cx + 30 + k * 2, cy - 10 + k * 3); }
    // The back wall under the HUD: black timber, grey wattle, lancets lit violet, swags of crape.
    g.fillStyle(GREY_DARK, 1); g.fillRect(0, 0, W, 104);
    g.fillStyle(TIMBER_DARK, 1); for (let x = 0; x <= W; x += 80) g.fillRect(x - 5, 0, 10, 104);
    g.fillRect(0, 96, W, 10);
    for (let x = 40; x < W; x += 80) {
      if (Math.abs(x - W / 2) < 50) continue;
      g.fillStyle(BRUISE_DARK, 1); g.fillRect(x - 10, 26, 20, 58); g.fillTriangle(x - 10, 26, x + 10, 26, x, 10);
      g.fillStyle(BRUISE_LIT, 0.8); g.fillRect(x - 7, 29, 14, 52); g.fillTriangle(x - 7, 29, x + 7, 29, x, 15);
      g.lineStyle(1.5, TIMBER_DARK, 1); g.lineBetween(x, 15, x, 81); g.lineBetween(x - 7, 55, x + 7, 55);
      g.lineStyle(3, CRAPE, 1); g.beginPath(); g.arc(x, 18, 18, 0.2, Math.PI - 0.2, false); g.strokePath();
    }
    // The Register on its lectern at the centre of the wall, the Matriarch's green clasp.
    g.fillStyle(TIMBER, 1); g.fillRect(W / 2 - 40, 50, 80, 40);
    g.fillStyle(BONE, 1); g.fillRect(W / 2 - 36, 54, 34, 32); g.fillStyle(lit(BONE, 0.4), 1); g.fillRect(W / 2 + 2, 54, 34, 32);
    for (let k = 0; k < 6; k++) { g.lineStyle(0.8, GREY_DARK, 0.7); g.lineBetween(W / 2 - 32, 60 + k * 4, W / 2 - 6, 60 + k * 4); g.lineBetween(W / 2 + 6, 60 + k * 4, W / 2 + 32, 60 + k * 4); }
    g.fillStyle(VENOM, 1); g.fillRect(W / 2 - 3, 66, 6, 6);
    g.lineStyle(2, IRON_LIT, 1); g.beginPath(); g.moveTo(W / 2, 72); g.lineTo(W / 2 + 10, 92); g.lineTo(W / 2 + 4, 104); g.strokePath();
    // Iron candle-stands down both walls, and their light on the slabs.
    for (let y = 170; y < H - 30; y += 120) {
      for (const x of [26, W - 26]) {
        g.fillStyle(LAMP, 0.06); g.fillCircle(x, y, 60);
        g.fillStyle(IRON, 1); g.fillRect(x - 2, y - 30, 4, 34); g.fillRect(x - 10, y - 32, 20, 3);
        for (const d of [-7, 0, 7]) { g.fillStyle(BONE, 1); g.fillRect(x + d - 1.5, y - 42, 3, 10); g.fillStyle(LAMP, 1); g.fillCircle(x + d, y - 44, 2); }
        g.fillStyle(BONE, 0.6); g.fillEllipse(x, y + 4, 22, 6);
      }
    }
    // Dark at the corners, as in a church at night.
    for (let i = 0; i < 6; i++) { g.lineStyle(40, BRUISE_DARK, 0.06); g.strokeRect(i * 18, 100 + i * 18, W - i * 36, H - 100 - i * 36); }
  },
};
