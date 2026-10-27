import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { brandSigil, dim, lit, mulberry } from '../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, COPPER, COPPER_DARK, COPPER_LIT, IRON, IRON_DARK, IRON_LIT, RIVET, STEAM,
  clamp, copperPipe, dial, hazardStripes, pipeElbow, plate, rivets, steamPuff, valveWheel,
} from './util';

/**
 * Prince Gauge, the Prince of Pistons — King Ashgrave's third child, who keeps the Boilerworks
 * running past every safe line on the dial because the Kiln eats coal and the King eats
 * quotas. He is a boiler-plated brawler with piston rods for arms, twin smokestacks on his
 * shoulders and a pressure gauge riveted to his back whose needle tells you how close he is
 * to bursting.
 *
 * Phase one, *Pistons*: he rushes in throwing telegraphed piston-fist combos and blows steam
 * down the floor mains. Phase two, *Redline*: rooted and overheating — a heat ring climbs
 * around him toward a ring-burst; three relief valves on the walls vent him when you spin
 * them. Hard mode adds *Meltdown*: the works go up section by section, one bay left standing.
 */

// Palette — boiler copper with a hot core; not the Archfiend's flat ember.
const MAIN = 0xb5683a;
const LIT = 0xffc47a;
const DARK = 0x3a1c0e;
const ACCENT = 0xe0262a;

/**
 * Live readout shared between the Redline signature and the rig decor: the decor has no
 * access to signature state, and one fight runs at a time.
 */
const gaugeState = { heat: 0, redline: false };

// Floor mains the Blowdown signature runs through — also painted by drawArena.
const MAINS_FRAC: { axis: 'h' | 'v'; at: number }[] = [
  { axis: 'h', at: 0.36 },
  { axis: 'h', at: 0.8 },
  { axis: 'v', at: 0.5 },
];
const mainPos = (m: { axis: 'h' | 'v'; at: number }, W: number, H: number): number =>
  m.axis === 'h' ? H * m.at : W * m.at;

const segDist = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
};

// ── Signature: Piston Fists ──────────────────────────────────────────
// Gauge plants and throws a combo of straight piston punches, alternating arms. Each punch is
// shown first as a long pressure-lined channel from his body toward where you stood, then
// the rod fires down it at speed and retracts. Each one is re-aimed, so step *across* the
// channel, never back along it.

const PUNCH_LEN = 300;
const PUNCH_HALF = 30;

const pistonFists = (tk: BossToolkit): SignatureMove => {
  interface Punch { ox: number; oy: number; a: number; side: number; bornAt: number; firesAt: number; endsAt: number; dealt: boolean }
  let punches: Punch[] = [];
  const throwOne = (side: number): void => {
    const now = tk.now;
    const a = tk.angleToPlayer();
    const warn = tk.warn(560);
    punches.push({ ox: tk.bossX, oy: tk.bossY, a, side, bornAt: now, firesAt: now + warn, endsAt: now + warn + 300, dealt: false });
    tk.sfx('engine');
  };
  return {
    durationMs: 2600,
    windupMs: 650,
    gesture: 'punch',
    locksBody: true,
    tell: 'PISTON FISTS',
    cast() {
      punches = [];
      const n = tk.hard ? 4 : 3;
      for (let i = 0; i < n; i++) tk.schedule(i * 560, () => throwOne(i % 2 ? 1 : -1));
    },
    update(time) {
      const p = tk.player;
      for (const k of punches) {
        if (k.dealt || time < k.firesAt || time > k.firesAt + 140) continue;
        const ex = k.ox + Math.cos(k.a) * PUNCH_LEN, ey = k.oy + Math.sin(k.a) * PUNCH_LEN;
        if (segDist(p.x, p.y, k.ox, k.oy, ex, ey) < PUNCH_HALF + 16) {
          k.dealt = true;
          tk.hitPlayer(16, p.x, p.y);
          tk.sfx('hit-heavy');
        }
      }
      punches = punches.filter((k) => time < k.endsAt + 100);
    },
    drawGround(g, time) {
      for (const k of punches) {
        if (time >= k.firesAt) continue;
        const c = clamp((time - k.bornAt) / (k.firesAt - k.bornAt), 0, 1);
        const ca = Math.cos(k.a), sa = Math.sin(k.a);
        const nx = -sa, ny = ca;
        const ex = k.ox + ca * PUNCH_LEN, ey = k.oy + sa * PUNCH_LEN;
        g.fillStyle(DARK, 0.25 + c * 0.2);
        g.fillPoints([
          new Phaser.Geom.Point(k.ox + nx * PUNCH_HALF, k.oy + ny * PUNCH_HALF),
          new Phaser.Geom.Point(ex + nx * PUNCH_HALF, ey + ny * PUNCH_HALF),
          new Phaser.Geom.Point(ex - nx * PUNCH_HALF, ey - ny * PUNCH_HALF),
          new Phaser.Geom.Point(k.ox - nx * PUNCH_HALF, k.oy - ny * PUNCH_HALF),
        ], true);
        // Pressure lines filling from the body outward.
        g.lineStyle(2, LIT, 0.7);
        for (const s of [-1, 1]) g.lineBetween(k.ox + nx * PUNCH_HALF * s, k.oy + ny * PUNCH_HALF * s, ex + nx * PUNCH_HALF * s, ey + ny * PUNCH_HALF * s);
        for (let d = 20; d < PUNCH_LEN * c; d += 22) {
          const x = k.ox + ca * d, y = k.oy + sa * d;
          g.lineStyle(3, ACCENT, 0.55);
          g.lineBetween(x + nx * PUNCH_HALF * 0.7, y + ny * PUNCH_HALF * 0.7, x - nx * PUNCH_HALF * 0.7, y - ny * PUNCH_HALF * 0.7);
        }
        // The landing ring at the far end.
        g.lineStyle(2.5, LIT, 0.4 + c * 0.5); g.strokeCircle(ex, ey, PUNCH_HALF + 4);
        if (c > 0.8 && Math.floor(time / 70) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.5); g.strokeCircle(ex, ey, PUNCH_HALF + 8); }
      }
    },
    drawAir(g, time) {
      for (const k of punches) {
        if (time < k.firesAt) continue;
        const t = (time - k.firesAt) / (k.endsAt - k.firesAt);
        const ext = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
        const ca = Math.cos(k.a), sa = Math.sin(k.a);
        const fx = k.ox + ca * PUNCH_LEN * ext, fy = k.oy + sa * PUNCH_LEN * ext;
        const sx = k.ox - sa * 14 * k.side, sy = k.oy + ca * 14 * k.side;
        // Telescoping rod: three sleeves.
        for (let s = 0; s < 3; s++) {
          const a0 = s / 3, a1 = (s + 1) / 3;
          g.lineStyle(14 - s * 3, s === 0 ? IRON : s === 1 ? IRON_LIT : 0xd8dee6, 1);
          g.lineBetween(sx + (fx - sx) * a0, sy + (fy - sy) * a0, sx + (fx - sx) * a1, sy + (fy - sy) * a1);
        }
        // The fist: a riveted ram head.
        g.fillStyle(DARK, 1); g.fillCircle(fx, fy, 20);
        g.fillStyle(MAIN, 1); g.fillCircle(fx, fy, 17);
        g.fillStyle(LIT, 0.8); g.fillCircle(fx - ca * 5, fy - sa * 5, 7);
        rivets(g, { x: fx - sa * 14, y: fy + ca * 14 }, { x: fx + sa * 14, y: fy - ca * 14 }, 7, 1.5, BRASS);
        if (t < 0.35) {
          // Exhaust puff out the back of the cylinder.
          g.fillStyle(STEAM, 0.6 * (1 - t / 0.35)); g.fillCircle(k.ox - ca * 30, k.oy - sa * 30, 16 + t * 40);
        }
      }
    },
    onPhaseEnd() { punches = []; },
  };
};

// ── Signature: Blowdown ──────────────────────────────────────────────
// Gauge opens the floor mains. A glowing pressure bulge runs down each chosen main, and every
// vent it passes flares red, then jets a column of live steam. The bulge is the fuse — read
// which mains it is on and stand between them.

const VENT_STEP = 60;
const VENT_R = 38;
const BULGE_SPEED = 300;

const blowdown = (tk: BossToolkit): SignatureMove => {
  interface Run { axis: 'h' | 'v'; at: number; dir: number; startAt: number; len: number; dealt: boolean }
  let runs: Run[] = [];
  const top = 96;
  const ventWarn = (): number => tk.warn(520);
  const ventPos = (r: Run, i: number): { x: number; y: number } => {
    const d = r.dir > 0 ? i * VENT_STEP + 30 : r.len - (i * VENT_STEP + 30);
    return r.axis === 'h' ? { x: d, y: r.at } : { x: r.at, y: top + d };
  };
  const ventCount = (r: Run): number => Math.floor((r.len - 30) / VENT_STEP) + 1;
  /** When the bulge reaches vent i. */
  const passAt = (r: Run, i: number): number => r.startAt + ((i * VENT_STEP + 30) / BULGE_SPEED) * 1000;
  return {
    durationMs: 2200,
    windupMs: 600,
    gesture: 'slam',
    tell: 'BLOWDOWN',
    cast(time) {
      tk.sfx('train-horn');
      const pool = [...MAINS_FRAC];
      const n = tk.hard ? 3 : 2;
      runs = [];
      for (let i = 0; i < n && pool.length; i++) {
        const m = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        const len = m.axis === 'h' ? tk.W : tk.H - top;
        runs.push({ axis: m.axis, at: mainPos(m, tk.W, tk.H), dir: Math.random() < 0.5 ? 1 : -1, startAt: time + i * 250, len, dealt: false });
      }
    },
    update(time) {
      const p = tk.player;
      const w = ventWarn();
      for (const r of runs) {
        if (r.dealt) continue;
        for (let i = 0; i < ventCount(r); i++) {
          const fire = passAt(r, i) + w;
          if (time < fire || time > fire + 420) continue;
          const v = ventPos(r, i);
          if (Math.hypot(p.x - v.x, p.y - v.y) < VENT_R + 14) {
            r.dealt = true;
            tk.hitPlayer(15, p.x, p.y);
            tk.sfx('sizzle');
            break;
          }
        }
      }
      const last = (r: Run): number => passAt(r, ventCount(r) - 1) + w + 500;
      runs = runs.filter((r) => time < last(r));
    },
    drawGround(g, time) {
      const w = ventWarn();
      for (const r of runs) {
        // The bulge: a swollen glowing collar travelling the main.
        const along = ((time - r.startAt) / 1000) * BULGE_SPEED;
        if (along >= 0 && along <= r.len) {
          const d = r.dir > 0 ? along : r.len - along;
          const bx = r.axis === 'h' ? d : r.at, by = r.axis === 'h' ? r.at : top + d;
          g.fillStyle(LIT, 0.25); g.fillCircle(bx, by, 30);
          g.fillStyle(ACCENT, 0.8); g.fillCircle(bx, by, 17);
          g.fillStyle(0xffffff, 0.8); g.fillCircle(bx, by, 7);
        }
        for (let i = 0; i < ventCount(r); i++) {
          const pa = passAt(r, i);
          if (time < pa || time > pa + w + 420) continue;
          const v = ventPos(r, i);
          const c = clamp((time - pa) / w, 0, 1);
          g.fillStyle(ACCENT, 0.12 + c * 0.25); g.fillCircle(v.x, v.y, VENT_R);
          g.lineStyle(2, LIT, 0.4 + c * 0.5); g.strokeCircle(v.x, v.y, VENT_R * (1.15 - c * 0.15));
        }
      }
    },
    drawAir(g, time) {
      const w = ventWarn();
      for (const r of runs) {
        for (let i = 0; i < ventCount(r); i++) {
          const fire = passAt(r, i) + w;
          if (time < fire || time > fire + 420) continue;
          const v = ventPos(r, i);
          const k = (time - fire) / 420;
          const hgt = 80 * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) * (1 - k * 0.4);
          g.fillStyle(STEAM, 0.55 * (1 - k)); g.fillEllipse(v.x, v.y - hgt / 2, 30 + k * 22, hgt + 10);
          g.fillStyle(0xffffff, 0.7 * (1 - k)); g.fillEllipse(v.x, v.y - hgt * 0.35, 12, hgt * 0.7);
          steamPuff(g, v.x, v.y - hgt, k, 18, 0.7);
        }
      }
    },
    onPhaseEnd() { runs = []; },
  };
};

// ── Signature: Redline ───────────────────────────────────────────────
// The first cast opens the throttle for the rest of the phase: a heat ring climbs around Gauge.
// Three relief valves stand on the deck; walk into a ready one to spin it, venting a jet of
// steam into him and knocking the heat back. Let the heat pin and he bursts — three shock
// rings out of his body, with one shared gap opening toward the valve nearest you. Each
// later cast throttles him up another notch.

const redline = (tk: BossToolkit): SignatureMove => {
  interface Valve { x: number; y: number; readyAt: number; rot: number }
  let valves: Valve[] = [];
  let jets: { x: number; y: number; until: number }[] = [];
  let burstAt = 0;
  /** Per-fight arming; the shared readout is reset whenever a fresh fight builds this move. */
  let armed = false;
  gaugeState.redline = false;
  gaugeState.heat = 0;
  const rate = (): number => (tk.hard ? 8.5 : 6.5);
  const VENT = 38;
  const placeValves = (): void => {
    valves = [
      { x: 110, y: tk.H * 0.6, readyAt: 0, rot: 0 },
      { x: tk.W - 110, y: tk.H * 0.6, readyAt: 0, rot: 0 },
      { x: tk.W / 2, y: tk.H - 64, readyAt: 0, rot: 0 },
    ];
  };
  return {
    durationMs: 1300,
    windupMs: 700,
    hold: 'brace',
    tell: 'REDLINE',
    cast() {
      if (!armed) {
        armed = true;
        gaugeState.redline = true;
        gaugeState.heat = 30;
        placeValves();
        tk.host.showFloatingText(tk.W / 2, 140, 'SPIN THE VALVES TO VENT HIM', '#ffd0a0');
      } else {
        gaugeState.heat = Math.min(96, gaugeState.heat + 22);
        tk.host.showFloatingText(tk.bossX, tk.bossY - 60, 'THROTTLE UP', '#ff8a6a');
      }
      tk.sfx('engine');
    },
    update(time, dt) {
      if (!armed) return;
      const p = tk.player;
      for (const v of valves) {
        v.rot += (time < v.readyAt ? 0 : 1.2) * dt;
        if (time >= v.readyAt && Math.hypot(p.x - v.x, p.y - v.y) < VENT && p.active) {
          v.readyAt = time + 4500;
          v.rot += Math.PI;
          gaugeState.heat = Math.max(0, gaugeState.heat - 38);
          jets.push({ x: v.x, y: v.y, until: time + 550 });
          tk.sfx('geyser');
          tk.host.showFloatingText(v.x, v.y - 34, 'VENTED', '#bfe8ff');
          if (burstAt && gaugeState.heat < 80) burstAt = 0;
        }
      }
      jets = jets.filter((j) => time < j.until);
      if (!burstAt) {
        gaugeState.heat = Math.min(100, gaugeState.heat + rate() * dt);
        if (gaugeState.heat >= 100) {
          burstAt = time + tk.warn(1500);
          tk.sfx('beam-charge');
          tk.host.showFloatingText(tk.bossX, tk.bossY - 64, 'REDLINE!', '#ff4a3a');
        }
      } else if (time >= burstAt) {
        burstAt = 0;
        gaugeState.heat = 35;
        const p2 = tk.player;
        let near = valves[0];
        for (const v of valves) if (Math.hypot(p2.x - v.x, p2.y - v.y) < Math.hypot(p2.x - near.x, p2.y - near.y)) near = v;
        const gap = Math.atan2(near.y - tk.bossY, near.x - tk.bossX);
        for (let i = 0; i < 3; i++) {
          tk.spawnRing({ cx: tk.bossX, cy: tk.bossY, delayMs: i * 380, speed: 320, gapCentre: gap, gapHalf: 0.55, band: 18, damage: 18 });
        }
        tk.boom(tk.bossX, tk.bossY, 120, ACCENT);
        tk.sfx('explosion-large');
        tk.scene.cameras.main.shake(260, 0.008);
      }
    },
    drawGround(g, time) {
      if (!armed) return;
      // Heat ring around Gauge — fills clockwise, goes white near the top.
      const k = gaugeState.heat / 100;
      const R = 64;
      g.lineStyle(8, DARK, 0.6); g.strokeCircle(tk.bossX, tk.bossY, R);
      g.lineStyle(6, k > 0.8 ? (Math.floor(time / 90) % 2 ? 0xffffff : ACCENT) : LIT, 0.85);
      g.beginPath(); g.arc(tk.bossX, tk.bossY, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
      if (burstAt) {
        const c = clamp(1 - (burstAt - time) / tk.warn(1500), 0, 1);
        g.fillStyle(ACCENT, 0.1 + c * 0.25); g.fillCircle(tk.bossX, tk.bossY, 40 + c * 60);
      }
      for (const v of valves) {
        const ready = time >= v.readyAt;
        g.fillStyle(ready ? 0x2f6f9a : 0x3a2a24, 0.7); g.fillCircle(v.x, v.y, VENT);
        g.lineStyle(2.5, ready ? 0x9fe8ff : 0x6a4a3a, ready ? 0.6 + 0.3 * Math.sin(time / 160) : 0.5); g.strokeCircle(v.x, v.y, VENT);
        if (!ready) {
          const c = 1 - (v.readyAt - time) / 4500;
          g.lineStyle(3, 0x9fe8ff, 0.7);
          g.beginPath(); g.arc(v.x, v.y, VENT + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c, false); g.strokePath();
        }
        valveWheel(g, v.x, v.y - 4, 20, v.rot, ready ? 0x3aa0d8 : 0x6a4a3a);
      }
    },
    drawAir(g, time) {
      if (!armed) return;
      for (const j of jets) {
        const k = 1 - (j.until - time) / 550;
        const bx = tk.bossX, by = tk.bossY;
        for (let i = 0; i < 8; i++) {
          const t = (i / 8 + k) % 1;
          const x = j.x + (bx - j.x) * t, y = j.y + (by - j.y) * t - Math.sin(t * Math.PI) * 30;
          g.fillStyle(STEAM, 0.55 * (1 - k)); g.fillCircle(x, y, 10 + t * 10);
        }
      }
      // Heat shimmer off his plates when he is near the red.
      if (gaugeState.heat > 70) {
        for (let i = 0; i < 6; i++) {
          const ph = ((time / 600) + i / 6) % 1;
          g.lineStyle(1.5, LIT, (1 - ph) * 0.5);
          const x = tk.bossX + Math.sin(i * 2.3 + time / 300) * 26;
          g.lineBetween(x, tk.bossY - 40 - ph * 40, x + Math.sin(time / 90 + i) * 4, tk.bossY - 52 - ph * 40);
        }
      }
    },
    onPhaseEnd() {
      armed = false;
      gaugeState.redline = false;
      gaugeState.heat = 0;
      burstAt = 0;
      valves = [];
      jets = [];
    },
  };
};

// ── Signature: Meltdown (hard) ───────────────────────────────────────
// The works give way bay by bay. The deck is six bays; five go up in sequence, one is left
// standing and marked. A doomed bay's plates glow and pop their rivets before it blows, and a
// blown bay burns for a moment after.

const meltdown = (tk: BossToolkit): SignatureMove => {
  interface Bay { c: number; r: number; blowAt: number; bornAt: number; burnUntil: number; blown: boolean; safe: boolean; lastTick: number }
  let bays: Bay[] = [];
  const top = 96;
  const bw = (): number => tk.W / 3;
  const bh = (): number => (tk.H - top) / 2;
  const bayOf = (x: number, y: number): { c: number; r: number } => ({
    c: clamp(Math.floor(x / bw()), 0, 2), r: clamp(Math.floor((y - top) / bh()), 0, 1),
  });
  return {
    durationMs: 4800,
    windupMs: 800,
    gesture: 'raise',
    tell: 'MELTDOWN',
    cast(time) {
      tk.sfx('boss-phase');
      const p = bayOf(tk.player.x, tk.player.y);
      const all: { c: number; r: number }[] = [];
      for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) all.push({ c, r });
      const others = all.filter((b) => b.c !== p.c || b.r !== p.r);
      const safe = others[Math.floor(Math.random() * others.length)];
      // Order: the player's own bay goes second, never first — there is always a beat to move.
      const doomed = all.filter((b) => b !== safe && !(b.c === p.c && b.r === p.r));
      for (let i = doomed.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [doomed[i], doomed[j]] = [doomed[j], doomed[i]]; }
      doomed.splice(1, 0, p);
      const warn = tk.warn(1700);
      bays = doomed.map((b, i) => ({ ...b, bornAt: time, blowAt: time + warn + i * 620, burnUntil: 0, blown: false, safe: false, lastTick: 0 }));
      bays.push({ ...safe, bornAt: time, blowAt: Infinity, burnUntil: 0, blown: false, safe: true, lastTick: 0 });
    },
    update(time) {
      const p = tk.player;
      const at = bayOf(p.x, p.y);
      for (const b of bays) {
        if (b.safe) continue;
        if (!b.blown && time >= b.blowAt) {
          b.blown = true;
          b.burnUntil = time + 1900;
          tk.boom((b.c + 0.5) * bw(), top + (b.r + 0.5) * bh(), Math.max(bw(), bh()) * 0.6, ACCENT);
          tk.sfx('explosion-medium');
          if (at.c === b.c && at.r === b.r) { tk.hitPlayer(22, p.x, p.y); b.lastTick = time; }
        }
        if (b.blown && time < b.burnUntil && at.c === b.c && at.r === b.r && time - b.lastTick > 520) {
          b.lastTick = time;
          tk.hitPlayer(6, p.x, p.y);
        }
      }
      const live = bays.some((b) => !b.safe && (!b.blown || time < b.burnUntil));
      if (!live) bays = [];
    },
    drawGround(g, time) {
      const rng = mulberry(7);
      for (const b of bays) {
        const x = b.c * bw(), y = top + b.r * bh();
        if (b.safe) {
          g.fillStyle(0x7fe0b0, 0.1 + 0.05 * Math.sin(time / 200)); g.fillRect(x + 6, y + 6, bw() - 12, bh() - 12);
          g.lineStyle(3, 0x9ff0c8, 0.75); g.strokeRect(x + 6, y + 6, bw() - 12, bh() - 12);
          continue;
        }
        if (!b.blown) {
          const c = clamp((time - b.bornAt) / (b.blowAt - b.bornAt), 0, 1);
          g.fillStyle(ACCENT, 0.06 + c * 0.24); g.fillRect(x + 4, y + 4, bw() - 8, bh() - 8);
          g.lineStyle(2, LIT, 0.3 + c * 0.6); g.strokeRect(x + 4, y + 4, bw() - 8, bh() - 8);
          // Weld seams glowing in a grid.
          g.lineStyle(1.5, LIT, c * 0.6);
          for (let k = 1; k < 4; k++) g.lineBetween(x + (bw() * k) / 4, y + 8, x + (bw() * k) / 4, y + bh() - 8);
          if (c > 0.8 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(5, 0xffffff, 0.5); g.strokeRect(x + 2, y + 2, bw() - 4, bh() - 4); }
        } else if (time < b.burnUntil) {
          const a = clamp((b.burnUntil - time) / 1900, 0, 1);
          g.fillStyle(0x2a0a04, 0.7 * a); g.fillRect(x + 4, y + 4, bw() - 8, bh() - 8);
          for (let i = 0; i < 14; i++) {
            const fx = x + 20 + rng() * (bw() - 40), fy = y + 20 + rng() * (bh() - 40);
            g.fillStyle(i % 2 ? ACCENT : LIT, a * (0.5 + 0.4 * Math.sin(time / 90 + i)));
            g.fillTriangle(fx - 6, fy, fx + 6, fy, fx, fy - 14 - Math.sin(time / 70 + i) * 5);
          }
        }
      }
    },
    drawAir(g, time) {
      // Rivets popping off doomed bays as they heat.
      for (const b of bays) {
        if (b.safe || b.blown) continue;
        const c = clamp((time - b.bornAt) / (b.blowAt - b.bornAt), 0, 1);
        if (c < 0.4) continue;
        const x = b.c * bw(), y = top + b.r * bh();
        for (let i = 0; i < 6; i++) {
          const ph = ((time / 500) + i / 6) % 1;
          const rx = x + ((i * 53) % 97) / 97 * bw(), ry = y + ((i * 31) % 61) / 61 * bh();
          g.fillStyle(RIVET, (1 - ph) * c);
          g.fillCircle(rx + ph * 18 * (i % 2 ? 1 : -1), ry - Math.sin(ph * Math.PI) * 30, 2.5);
        }
      }
    },
    onPhaseEnd() { bays = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const GAUGE_BOSS: WorldBossDef = {
  worldId: 'isle:gauge',
  name: 'Prince Gauge',
  title: 'Prince of Pistons',
  color: MAIN,
  colorLit: LIT,
  colorDark: DARK,
  accent: ACCENT,
  damageMult: 0.9,

  intro: [
    'Shift change. You are on it.',
    'Father wants coal by morning. You are made of something that burns.',
  ],
  banter: [
    'Every needle in this yard points at the red. I put it there.',
    'Pressure is just patience that ran out.',
    'The Kiln is hungry. I am the mouth that feeds it.',
    'Mind the pipes. Actually, no — don\'t.',
    'You hit like a loose rivet.',
    'Father counts the coal. I count the seconds.',
  ],
  defeatLine: 'THE BOILERS GO QUIET',
  resumeLine: 'Back on shift? Good. The quota did not wait for you.',

  phases: [
    {
      name: 'Pistons',
      line: 'Full stroke. Both arms.',
      hp: 340,
      cycle: ['sig:pistons', 'lanes', 'sig:blowdown', 'charge', 'volley', 'sig:pistons', 'slamchain', 'sig:blowdown'],
      harass: ['h-snipe', 'h-lane', 'h-flak'],
      restMs: 1150,
      harassMs: 3200,
    },
    {
      name: 'Redline',
      line: 'Past the red. Past safe. Past you.',
      hp: 410,
      cycle: ['sig:redline', 'sig:blowdown', 'quake', 'sig:pistons', 'hazard', 'sig:redline', 'barrage', 'spiral'],
      harass: ['h-rune', 'h-orbs', 'h-lane'],
      restMs: 1000,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'THE WORKS ARE PAST SAVING',
    extraPhase: {
      name: 'Meltdown',
      line: 'If the works go, I go with them. And so do you.',
      hp: 300,
      cycle: ['sig:meltdown', 'sig:blowdown', 'homing', 'sig:pistons', 'sanctuary', 'sig:meltdown', 'stream', 'sig:blowdown'],
      harass: ['h-mines', 'h-rune', 'h-snipe', 'h-lane'],
      restMs: 820,
      harassMs: 2400,
    },
  },

  tuning: {
    lanes: { halfW: 34, warnMs: 900 },
    charge: { halfW: 40 },
  },

  signatures: {
    pistons: pistonFists,
    blowdown,
    redline,
    meltdown,
  },

  look: {
    crest: 'none', pattern: 'plates', aura: 'smoke', hands: 'gauntlet',
    torsoR: 37, mouth: 'grate', eyes: 2, eyeColor: 0xffd27a,
  },
  phaseStyles: [
    { movement: 'rush', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'hot', look: { aura: 'sparks', pattern: 'gears' } },
    { movement: 'blink', gimmick: 'tremor', tint: 'blood', look: { aura: 'flame', pattern: 'cracks', mouth: 'maw' } },
  ],

  /**
   * Piston rods out to the fists, twin smokestacks on the shoulders, and the pressure gauge on
   * his back with a cog coronet on top — the needle is the fight's own readout.
   */
  drawDecor(g, s) {
    const R = s.radius;
    // Piston rods: body to each fist, with a brass collar.
    for (const h of s.hands) {
      const a = Math.atan2(h.y - s.y, h.x - s.x);
      const bx = s.x + Math.cos(a) * R * 0.85, by = s.y + Math.sin(a) * R * 0.85;
      g.lineStyle(9, dim(IRON, 0.3), 1); g.lineBetween(bx, by, h.x, h.y);
      g.lineStyle(5, 0xc8d0d8, 1); g.lineBetween(bx, by, h.x, h.y);
      const mx = (bx + h.x) / 2, my = (by + h.y) / 2;
      g.fillStyle(BRASS, 1); g.fillCircle(mx, my, 5);
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(mx, my, 2.5);
    }
    // Smokestacks.
    const smoke = s.phaseIdx === 0 ? 0x5a5550 : s.phaseIdx === 1 ? 0xff8a3a : 0x2a0a0a;
    for (const side of [-1, 1]) {
      const sx = s.x + side * R * 0.62;
      const sTop = s.y - R - 22;
      g.fillStyle(DARK, 1); g.fillRect(sx - 7, sTop, 14, R * 0.9);
      g.fillStyle(IRON, 1); g.fillRect(sx - 5.5, sTop, 11, R * 0.9);
      g.fillStyle(IRON_DARK, 1); g.fillRect(sx - 9, sTop - 4, 18, 6);
      g.fillStyle(lit(IRON, 0.3), 1); g.fillRect(sx - 9, sTop - 4, 18, 2);
      for (let i = 0; i < 3; i++) {
        const ph = ((s.t / (s.enraged ? 380 : 700)) + i / 3 + (side > 0 ? 0.5 : 0)) % 1;
        g.fillStyle(smoke, (1 - ph) * 0.55);
        g.fillCircle(sx + Math.sin(ph * 4 + side) * 6, sTop - 6 - ph * 34, 4 + ph * 9);
        if (s.phaseIdx >= 1 && i === 0) { g.fillStyle(0xffd27a, 1 - ph); g.fillCircle(sx + side * ph * 10, sTop - ph * 40, 1.6); }
      }
    }
    // The back gauge.
    const gx = s.x, gy = s.y - R - 10;
    let frac: number;
    if (s.phaseIdx === 0) frac = 0.3 + (1 - s.hpRatio) * 0.45 + Math.sin(s.t / 90) * 0.02;
    else if (s.phaseIdx === 1) frac = gaugeState.redline ? gaugeState.heat / 100 : 0.8;
    else frac = 1.02 + Math.sin(s.t / 25) * 0.02;
    frac += s.hurt ? 0.05 : 0;
    // Cog coronet.
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI + (Math.PI * i) / 7;
      g.fillStyle(BRASS, 1);
      g.fillRect(gx + Math.cos(a) * 17 - 2.5, gy + Math.sin(a) * 17 - 2.5, 5, 5);
    }
    dial(g, gx, gy, 13, frac);
    if (frac > 0.85 && Math.floor(s.t / 100) % 2 === 0) { g.lineStyle(2, ACCENT, 0.9); g.strokeCircle(gx, gy, 16); }
  },

  /** Gauge's control floor: under the great boiler, mains laid in the deck. */
  drawArena(g, W, H) {
    const rng = mulberry(424242);
    const top = 96;
    g.fillStyle(IRON_DARK, 1); g.fillRect(0, 0, W, H);
    for (let y = top; y < H; y += 64) for (let x = 0; x < W; x += 96) {
      plate(g, x, y, 96, Math.min(64, H - y), ((x / 96 + (y - top) / 64) % 2) ? dim(IRON, 0.08) : dim(IRON, 0.18), rng);
    }
    // The great boiler's belly across the top of the room.
    g.fillStyle(COPPER_DARK, 1); g.fillRect(0, top, W, 54);
    g.fillStyle(COPPER, 1); g.fillRect(0, top + 2, W, 44);
    g.fillStyle(COPPER_LIT, 0.6); g.fillRect(0, top + 8, W, 6);
    for (let x = 60; x < W; x += 120) {
      g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 4, top, 8, 50);
      rivets(g, { x, y: top + 4 }, { x, y: top + 46 }, 8, 1.4, BRASS);
    }
    // Firebox doors glowing in the boiler.
    for (const fx of [W * 0.25, W * 0.75]) {
      g.fillStyle(0xff6a2a, 0.16); g.fillCircle(fx, top + 40, 48);
      g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(fx - 30, top + 12, 60, 36, 6);
      g.fillStyle(0xff7a30, 0.85); g.fillRoundedRect(fx - 24, top + 18, 48, 24, 4);
      g.lineStyle(3, IRON_DARK, 1);
      for (let k = -18; k <= 18; k += 9) g.lineBetween(fx + k, top + 18, fx + k, top + 42);
    }
    dial(g, W / 2, top + 26, 20, 0.92);
    brandSigil(g, W / 2, top + 26, 30, 0xff7a2f, 0.25);
    // Floor mains for Blowdown.
    for (const m of MAINS_FRAC) {
      const at = mainPos(m, W, H);
      if (m.axis === 'h') copperPipe(g, { x: 0, y: at }, { x: W, y: at }, 10, rng, 120);
      else copperPipe(g, { x: at, y: top + 54 }, { x: at, y: H }, 10, rng, 120);
      const len = m.axis === 'h' ? W : H - top;
      for (let d = 30; d < len; d += VENT_STEP) {
        const vx = m.axis === 'h' ? d : at, vy = m.axis === 'h' ? at : top + d;
        if (m.axis === 'v' && vy < top + 60) continue;
        g.fillStyle(0x140c08, 1); g.fillRect(vx - 6, vy - 3, 12, 6);
        g.fillStyle(0xff7a30, 0.25); g.fillRect(vx - 5, vy - 2, 10, 4);
      }
    }
    for (const m of MAINS_FRAC) if (m.axis === 'h') pipeElbow(g, W * 0.5, mainPos(m, W, H), 10);
    // Brass railing along the sides and hazard kerbs.
    hazardStripes(g, { x: 0, y: top + 54, w: 12, h: H - top - 54 }, 0.6);
    hazardStripes(g, { x: W - 12, y: top + 54, w: 12, h: H - top - 54 }, 0.6);
    g.lineStyle(3, BRASS, 0.7); g.lineBetween(14, H - 6, W - 14, H - 6);
  },
};
