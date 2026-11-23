import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../../boss/framework/StrikeTargets';
import { dim, glow, lit, mixC, mulberry } from '../../../../art/IsleArt';
import { fmn, frame, lotToken, memoryBottle, photo } from './art';
import {
  GILT, GILT_DARK, GILT_LIT, HINDSIGHT, HINDSIGHT_DARK, HINDSIGHT_EYE, HINDSIGHT_LIT, INK, LAMP_GREEN, LAMP_LIGHT,
  MEMORY_COLORS, PAPER, PAPER_DARK, RECALL, RECALL_LIT, SEPIA, SEPIA_DARK, SEPIA_DEEP, SEPIA_LIT, SEPIA_PALE, TIMBER,
  TIMBER_DARK, TIMBER_LIT,
} from './palette';
import { clamp, dist } from './util';

/**
 * Prince Hindsight, the Backward-Looking — one of the Croupier-King's lucky children, governor of
 * the Remembrance Court.
 *
 * Hindsight was never drawn: the favourites never are. He has spent his life watching other
 * people's Draws through a spyglass turned the wrong way round, and he believes that only the
 * past can be trusted, because it has already happened and cannot be rigged. So he keeps
 * everyone's. He fights by looking back:
 *
 * • **Recollection** (orbiting): an echo of you walks the path you took a few seconds ago and
 *   strikes where you were — keep moving, never double back; he takes your photograph with a
 *   magnesium flash, and the negative he leaves hanging bursts when it develops; and he throws pawn
 *   tickets that fly out, hang stamped LAPSED, and come home to him.
 * • **Forgotten** (blinking, pale): the arena forgets itself. Squares of floor fade to nothing and
 *   bite whoever stands in the void, then are remembered back while others go; faceless portraits
 *   of him ring you and fire unless you strike them first; and a great india-rubber rubs a band of
 *   the room clean.
 * • **Total Recall** (hard, anchored, gilt): every attack he has made this fight comes back at once,
 *   faint, then solid — the floor shows you where each one fell the first time.
 */

const TOP = 96;

// ── The fight's memory: every move he makes is written here, so Total Recall can play it back ──

type Recalled = { kind: 'circle'; x: number; y: number; r: number } | { kind: 'rect'; x: number; y: number; w: number; h: number };
const LOG = new WeakMap<BossToolkit, Recalled[]>();
function remember(tk: BossToolkit, r: Recalled): void {
  const log = LOG.get(tk) ?? [];
  log.push(r);
  while (log.length > 60) log.shift();
  LOG.set(tk, log);
}
const inRecalled = (r: Recalled, x: number, y: number) =>
  r.kind === 'circle' ? dist(x, y, r.x, r.y) < r.r : x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;

const alivePlayer = (tk: BossToolkit) => tk.player.active && tk.player.hp > 0;

// ── Signature: Recollection ──────────────────────────────────────────
// A sepia echo of the player walks the path they took 2.4s ago; every half second it strikes the
// ground where it stands. The trail is drawn ahead of it, so you can see where it will step.

const DELAY_MS = 2400;

const recollection = (tk: BossToolkit): SignatureMove => {
  const trail: { x: number; y: number; t: number }[] = [];
  let until = 0;
  let nextStrike = 0;
  let strikes: { x: number; y: number; at: number; fireAt: number; dealt: boolean }[] = [];
  const echoAt = (time: number) => {
    const want = time - DELAY_MS;
    for (let i = trail.length - 1; i >= 0; i--) if (trail[i].t <= want) return trail[i];
    return trail[0] ?? { x: tk.player.x, y: tk.player.y, t: time };
  };
  return {
    durationMs: 1800,
    windupMs: 700,
    gesture: 'point',
    tell: 'RECOLLECTION',
    cast(time) {
      until = time + (tk.hard ? 5600 : 4800);
      nextStrike = time + 400;
      tk.sfx('time-warp');
    },
    update(time) {
      // The path is always being kept, whether or not he is walking it.
      const p = tk.player;
      const last = trail[trail.length - 1];
      if (!last || time - last.t > 60) trail.push({ x: p.x, y: p.y, t: time });
      while (trail.length && time - trail[0].t > DELAY_MS + 1500) trail.shift();
      if (time < until && time >= nextStrike) {
        nextStrike = time + (tk.hard ? 460 : 560);
        const e = echoAt(time);
        strikes.push({ x: e.x, y: e.y, at: time, fireAt: time + tk.warn(420), dealt: false });
        remember(tk, { kind: 'circle', x: e.x, y: e.y, r: 50 });
      }
      for (const s of strikes) {
        if (s.dealt || time < s.fireAt) continue;
        s.dealt = true;
        tk.sfx('hit-medium');
        if (alivePlayer(tk) && dist(p.x, p.y, s.x, s.y) < 50) tk.hitPlayer(11, p.x, p.y);
      }
      strikes = strikes.filter((s) => !s.dealt || time - s.fireAt < 400);
    },
    drawGround(g, time) {
      if (time >= until && !strikes.length) return;
      // The path the echo will walk: footprints between it and the present.
      if (time < until) {
        const e = echoAt(time);
        for (const pt of trail) {
          if (pt.t < e.t || (pt.t / 60) % 3 > 1) continue;
          const k = (pt.t - e.t) / DELAY_MS;
          g.fillStyle(SEPIA_DEEP, 0.3 * (1 - k)); g.fillEllipse(pt.x, pt.y + 14, 10, 5);
        }
      }
      for (const s of strikes) {
        const k = clamp((time - s.at) / Math.max(1, s.fireAt - s.at), 0, 1);
        if (s.dealt) { const e = clamp((time - s.fireAt) / 400, 0, 1); g.fillStyle(RECALL_LIT, 0.5 * (1 - e)); g.fillCircle(s.x, s.y, 50 * (1 + e * 0.3)); continue; }
        g.fillStyle(SEPIA_DEEP, 0.12 + k * 0.2); g.fillCircle(s.x, s.y, 50);
        g.lineStyle(2, RECALL, 0.5 + k * 0.4); g.strokeCircle(s.x, s.y, 50 * (1.3 - k * 0.3));
      }
    },
    drawAir(g, time) {
      if (time >= until) return;
      const e = echoAt(time);
      const fl = 0.7 + Math.sin(time / 60) * 0.15;
      // The echo: you, in sepia, a frame behind — a flickering silhouette with film scratches.
      g.fillStyle(SEPIA_LIT, 0.35 * fl); g.fillCircle(e.x, e.y, 20);
      g.fillStyle(SEPIA_PALE, 0.25 * fl); g.fillCircle(e.x, e.y - 24, 11);
      g.lineStyle(1.5, SEPIA_DEEP, 0.7); g.strokeCircle(e.x, e.y, 20); g.strokeCircle(e.x, e.y - 24, 11);
      for (let i = 0; i < 3; i++) { const sx = e.x - 14 + ((time / 7 + i * 13) % 28); g.lineStyle(1, SEPIA_PALE, 0.6); g.lineBetween(sx, e.y - 36, sx + 1, e.y + 18); }
    },
    onPhaseEnd() { until = 0; strikes = []; },
  };
};

// ── Signature: Flash Photograph ──────────────────────────────────────
// A viewfinder frame follows you, then locks; the magnesium flash scorches everything inside it.
// The negative hangs where it was taken and, developing, bursts in a ring of sepia shards.

const snapshot = (tk: BossToolkit): SignatureMove => {
  const FW = 230, FH = 170;
  let st: { x: number; y: number; at: number; lockAt: number; flashAt: number; flashed: boolean; devAt: number; burst: boolean } | null = null;
  return {
    durationMs: 2000,
    windupMs: 600,
    gesture: 'raise',
    hold: 'draw',
    tell: 'SAY CHEESE',
    cast(time) {
      const p = tk.player;
      const lockAt = time + tk.warn(1000);
      st = { x: p.x, y: p.y, at: time, lockAt, flashAt: lockAt + tk.warn(520), flashed: false, devAt: 0, burst: false };
      tk.sfx('beam-charge');
    },
    update(time) {
      if (!st) return;
      const p = tk.player;
      if (time < st.lockAt) { st.x += (p.x - st.x) * 0.12; st.y += (p.y - st.y) * 0.12; }
      st.x = clamp(st.x, FW / 2, tk.W - FW / 2); st.y = clamp(st.y, TOP + FH / 2, tk.H - FH / 2);
      if (!st.flashed && time >= st.flashAt) {
        st.flashed = true;
        st.devAt = time + 1700;
        tk.sfx('light-beam');
        const r: Recalled = { kind: 'rect', x: st.x - FW / 2, y: st.y - FH / 2, w: FW, h: FH };
        remember(tk, r);
        if (alivePlayer(tk) && inRecalled(r, p.x, p.y)) { tk.hitPlayer(16, p.x, p.y); tk.slowPlayer(0.6, 700); }
      }
      if (st.flashed && !st.burst && time >= st.devAt) {
        st.burst = true;
        tk.sfx('crystal-shatter');
        const n = tk.hard ? 12 : 10;
        const off = Math.random() * Math.PI;
        for (let i = 0; i < n; i++) tk.spawnBullet({ x: st.x, y: st.y, angle: off + (i / n) * Math.PI * 2, speed: 200, damage: 9, r: 6, color: SEPIA_DARK, lifeMs: 4000 });
      }
      if (st.burst && time > st.devAt + 400) st = null;
    },
    drawGround(g, time) {
      if (!st || st.flashed) return;
      // The camera's shadow box on the floor while it frames you.
      g.fillStyle(SEPIA_DEEP, time < st.lockAt ? 0.08 : 0.2); g.fillRect(st.x - FW / 2, st.y - FH / 2, FW, FH);
    },
    drawAir(g, time) {
      if (!st) return;
      const x0 = st.x - FW / 2, y0 = st.y - FH / 2;
      if (!st.flashed) {
        // Viewfinder corners and a crosshair, blinking faster as the shutter nears.
        const locked = time >= st.lockAt;
        const blink = locked ? (Math.sin(time / 45) > 0 ? 1 : 0.4) : 0.7;
        g.lineStyle(3, locked ? RECALL_LIT : SEPIA_PALE, blink);
        for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x0 + FW, y0, -1, 1], [x0, y0 + FH, 1, -1], [x0 + FW, y0 + FH, -1, -1]]) {
          g.lineBetween(cx, cy, cx + sx * 34, cy); g.lineBetween(cx, cy, cx, cy + sy * 28);
        }
        g.lineStyle(1, SEPIA_PALE, 0.6); g.lineBetween(st.x - 12, st.y, st.x + 12, st.y); g.lineBetween(st.x, st.y - 12, st.x, st.y + 12);
        // The flash tray over his head, smoking.
        const bx = tk.bossX, by = tk.bossY - 58;
        g.fillStyle(0x9a9a9a, 1); g.fillRect(bx - 14, by, 28, 4);
        g.fillStyle(0xffffff, 0.3 + clamp((time - st.at) / Math.max(1, st.flashAt - st.at), 0, 1) * 0.6); g.fillCircle(bx, by - 2, 5);
        return;
      }
      const sinceFlash = time - st.flashAt;
      if (sinceFlash < 260) { g.fillStyle(0xffffff, 0.75 * (1 - sinceFlash / 260)); g.fillRect(x0, y0, FW, FH); }
      // The negative: a dark print hanging in the air, its image slowly coming up as it develops.
      const dev = clamp(1 - (st.devAt - time) / 1700, 0, 1);
      if (!st.burst) {
        g.fillStyle(0x1a1410, 0.55); g.fillRect(x0 + 20, y0 + 14, FW - 40, FH - 28);
        g.lineStyle(2, SEPIA_PALE, 0.6); g.strokeRect(x0 + 20, y0 + 14, FW - 40, FH - 28);
        g.fillStyle(mixC(0x1a1410, SEPIA_LIT, dev), 0.5 + dev * 0.3); g.fillCircle(st.x, st.y - 10, 16); g.fillEllipse(st.x, st.y + 24, 40, 30);
        g.lineStyle(2, RECALL_LIT, dev); g.strokeCircle(st.x, st.y, 30 + dev * 30);
        // The clothes-peg it hangs from.
        g.fillStyle(TIMBER, 1); g.fillRect(st.x - 3, y0 + 6, 6, 14);
      }
    },
    onPhaseEnd() { st = null; },
  };
};

// ── Signature: Pawn Tickets ──────────────────────────────────────────
// A fan of pawn tickets flies out spinning, slows, hangs stamped LAPSED, then whips home to him
// along the way it came. Each ticket cuts on the way out and on the way back.

interface Ticket { x: number; y: number; ox: number; oy: number; a: number; phase: 0 | 1 | 2; at: number; hangUntil: number; hitOut: boolean; hitBack: boolean; spin: number }

const tickets = (tk: BossToolkit): SignatureMove => {
  let list: Ticket[] = [];
  const OUT_MS = 700, HANG_MS = 900, BACK_MS = 520, RANGE = 330;
  return {
    durationMs: 1600,
    windupMs: 550,
    gesture: 'sweep',
    tell: 'LAPSED',
    cast(time) {
      const base = tk.angleToPlayer();
      const n = tk.hard ? 9 : 7;
      list = [];
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.24;
        list.push({ x: tk.bossX, y: tk.bossY, ox: tk.bossX, oy: tk.bossY, a, phase: 0, at: time, hangUntil: 0, hitOut: false, hitBack: false, spin: Math.random() * 6 });
      }
      tk.sfx('whoosh');
    },
    update(time) {
      const p = tk.player;
      for (const t of list) {
        if (t.phase === 0) {
          const k = clamp((time - t.at) / OUT_MS, 0, 1);
          const e = 1 - (1 - k) * (1 - k);
          t.x = t.ox + Math.cos(t.a) * RANGE * e; t.y = t.oy + Math.sin(t.a) * RANGE * e;
          if (k >= 1) { t.phase = 1; t.hangUntil = time + HANG_MS; remember(tk, { kind: 'circle', x: t.x, y: t.y, r: 34 }); }
        } else if (t.phase === 1) {
          if (time >= t.hangUntil) { t.phase = 2; t.at = time; t.ox = t.x; t.oy = t.y; tk.sfx('whip'); }
        } else {
          const k = clamp((time - t.at) / BACK_MS, 0, 1);
          t.x = t.ox + (tk.bossX - t.ox) * k * k; t.y = t.oy + (tk.bossY - t.oy) * k * k;
          if (k >= 1) t.phase = 2;
        }
        const d = dist(p.x, p.y, t.x, t.y);
        if (alivePlayer(tk) && d < 30) {
          if (t.phase === 0 && !t.hitOut) { t.hitOut = true; tk.hitPlayer(8, p.x, p.y); }
          if (t.phase === 2 && !t.hitBack) { t.hitBack = true; tk.hitPlayer(9, p.x, p.y); }
        }
      }
      list = list.filter((t) => !(t.phase === 2 && time - t.at > BACK_MS));
    },
    drawGround(g, time) {
      for (const t of list) {
        if (t.phase !== 1) continue;
        // The line home it will fly, faint, so you can step off it.
        const k = clamp(1 - (t.hangUntil - time) / HANG_MS, 0, 1);
        g.lineStyle(10, SEPIA_DEEP, 0.06 + k * 0.12); g.lineBetween(t.x, t.y, tk.bossX, tk.bossY);
      }
    },
    drawAir(g, time) {
      for (const t of list) {
        const spin = t.phase === 1 ? Math.sin(time / 200 + t.spin) * 0.3 : time / 60 + t.spin;
        const c = Math.cos(spin), s = Math.sin(spin);
        const pt = (dx: number, dy: number) => ({ x: t.x + dx * c - dy * s, y: t.y + dx * s + dy * c });
        const a = pt(-13, -8), b = pt(13, -8), cc = pt(13, 8), d = pt(-13, 8);
        g.fillStyle(PAPER_DARK, 1); g.fillTriangle(a.x, a.y + 1, b.x, b.y + 1, cc.x, cc.y + 1); g.fillTriangle(a.x, a.y + 1, cc.x, cc.y + 1, d.x, d.y + 1);
        g.fillStyle(PAPER, 1); g.fillTriangle(a.x, a.y, b.x, b.y, cc.x, cc.y); g.fillTriangle(a.x, a.y, cc.x, cc.y, d.x, d.y);
        // The perforated stub and the number.
        const st = pt(7, 0), nm = pt(-3, 0);
        g.fillStyle(SEPIA_DARK, 1); g.fillCircle(st.x, st.y, 1.4);
        g.fillStyle(INK, 0.8); g.fillRect(nm.x - 5, nm.y - 2, 9, 4);
        if (t.phase >= 1) {
          // LAPSED stamped in red across it.
          g.lineStyle(2.5, 0xb0302a, 0.85); const s1 = pt(-11, 5), s2 = pt(11, -5); g.lineBetween(s1.x, s1.y, s2.x, s2.y);
          if (t.phase === 1) { g.lineStyle(1, RECALL_LIT, 0.5 + Math.sin(time / 80) * 0.3); g.strokeCircle(t.x, t.y, 20); }
        }
      }
    },
    onPhaseEnd() { list = []; },
  };
};

// ── Signature: Forgetting (phase 2) ──────────────────────────────────
// Squares of floor fade to nothing — first the one you stand on, and others — and for a while
// those squares are void that bites whoever is in them. Then they are remembered back, and a
// second wave forgets other squares.

const CELL_W = 120, CELL_H = 91;
interface Hole { cx: number; cy: number; fadeAt: number; holeAt: number; backAt: number; seed: number }

const forgetting = (tk: BossToolkit): SignatureMove => {
  let holes: Hole[] = [];
  let lastBite = 0;
  const cols = Math.floor(960 / CELL_W), rows = Math.floor((640 - TOP) / CELL_H);
  const cellOf = (x: number, y: number) => ({ cx: clamp(Math.floor(x / CELL_W), 0, cols - 1), cy: clamp(Math.floor((y - TOP) / CELL_H), 0, rows - 1) });
  const rectOf = (h: Hole) => ({ x: h.cx * CELL_W, y: TOP + h.cy * CELL_H, w: CELL_W, h: CELL_H });
  function wave(time: number, n: number): void {
    const taken = new Set<string>(holes.filter((h) => time < h.backAt).map((h) => `${h.cx},${h.cy}`));
    const pick: { cx: number; cy: number }[] = [cellOf(tk.player.x, tk.player.y)];
    let guard = 0;
    while (pick.length < n && guard++ < 80) {
      const c = { cx: Math.floor(Math.random() * cols), cy: Math.floor(Math.random() * rows) };
      if (pick.some((q) => q.cx === c.cx && q.cy === c.cy) || taken.has(`${c.cx},${c.cy}`)) continue;
      pick.push(c);
    }
    const holeMs = tk.hard ? 3400 : 2900;
    for (const c of pick) {
      const fadeAt = time, holeAt = time + tk.warn(1250);
      const h = { ...c, fadeAt, holeAt, backAt: holeAt + holeMs, seed: Math.random() * 10 };
      holes.push(h);
      const r = rectOf(h);
      remember(tk, { kind: 'rect', ...r });
    }
    tk.sfx('hush');
  }
  let second = 0;
  return {
    durationMs: 2200,
    windupMs: 700,
    gesture: 'clap',
    tell: 'FORGOTTEN',
    cast(time) {
      wave(time, tk.hard ? 9 : 7);
      second = time + 2300;
    },
    update(time) {
      if (second > 0 && time >= second) { second = 0; wave(time, tk.hard ? 8 : 6); }
      const p = tk.player;
      if (alivePlayer(tk) && time - lastBite > 500) {
        const inside = holes.some((h) => time >= h.holeAt && time < h.backAt && inRecalled({ kind: 'rect', ...rectOf(h) }, p.x, p.y));
        if (inside) { lastBite = time; tk.hitPlayer(7, p.x, p.y); tk.slowPlayer(0.5, 600); }
      }
      holes = holes.filter((h) => time < h.backAt + 600);
    },
    drawGround(g, time) {
      for (const h of holes) {
        const r = rectOf(h);
        if (time < h.holeAt) {
          // Fading: the floor's grain thinning, sepia edges crumbling inward.
          const k = clamp((time - h.fadeAt) / Math.max(1, h.holeAt - h.fadeAt), 0, 1);
          g.fillStyle(SEPIA_PALE, 0.15 + k * 0.35); g.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
          g.lineStyle(2, SEPIA_DEEP, 0.3 + k * 0.6); g.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
          for (let i = 0; i < 10; i++) {
            const ex = r.x + ((i * 37 + h.seed * 11) % r.w), ey = i % 2 ? r.y + 4 + k * 10 : r.y + r.h - 4 - k * 10;
            g.fillStyle(SEPIA_DEEP, 0.4 * k); g.fillRect(ex, ey, 4, 3);
          }
          continue;
        }
        const back = time >= h.backAt ? clamp((time - h.backAt) / 600, 0, 1) : 0;
        // The void: a black square with stars of lost things swimming in it.
        g.fillStyle(0x0c0a08, 0.92 * (1 - back)); g.fillRect(r.x, r.y, r.w, r.h);
        for (let i = 0; i < 6; i++) {
          const ph = (time / 2000 + i / 6 + h.seed) % 1;
          g.fillStyle(MEMORY_COLORS[i % MEMORY_COLORS.length], 0.6 * (1 - back) * Math.sin(ph * Math.PI));
          g.fillCircle(r.x + 10 + ((i * 29 + h.seed * 7) % (r.w - 20)), r.y + r.h * (1 - ph), 1.6);
        }
        g.lineStyle(2, SEPIA_LIT, 0.7 * (1 - back)); g.strokeRect(r.x, r.y, r.w, r.h);
        if (back > 0) { g.fillStyle(SEPIA_LIT, 0.4 * (1 - back)); g.fillRect(r.x, r.y, r.w, r.h); }
      }
    },
    onPhaseEnd() { holes = []; second = 0; },
  };
};

// ── Signature: Whose Face? (phase 2) ─────────────────────────────────
// Three faceless portraits of him ring you. Strike one and it is forgotten harmlessly; any still
// hanging when the paint dries fires a fan of sepia at you.

const faceless = (tk: BossToolkit): SignatureMove => {
  let frames: { x: number; y: number; target: StrikeTarget; fireAt: number; at: number; done: boolean; popped: boolean; poppedAt: number }[] = [];
  return {
    durationMs: 1900,
    windupMs: 600,
    gesture: 'flex',
    tell: 'WHOSE FACE?',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 4 : 3;
      const off = Math.random() * Math.PI * 2;
      frames = [];
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * Math.PI * 2;
        const x = clamp(p.x + Math.cos(a) * 220, 60, tk.W - 60), y = clamp(p.y + Math.sin(a) * 180, TOP + 60, tk.H - 50);
        const f = { x, y, target: null as unknown as StrikeTarget, fireAt: time + tk.warn(1700), at: time, done: false, popped: false, poppedAt: 0 };
        f.target = tk.spawnTarget({
          x, y, r: 26,
          onStruck: () => { if (f.done) return; f.done = true; f.popped = true; f.poppedAt = tk.now; f.target.remove(); tk.sfx('crystal-chime'); },
        });
        frames.push(f);
        remember(tk, { kind: 'circle', x, y, r: 40 });
      }
      tk.sfx('curse-cast');
    },
    update(time) {
      for (const f of frames) {
        if (f.done || time < f.fireAt) continue;
        f.done = true;
        f.target.remove();
        const a = tk.angleToPlayer(f.x, f.y);
        for (let k = -2; k <= 2; k++) tk.spawnBullet({ x: f.x, y: f.y, angle: a + k * 0.17, speed: 230, damage: 8, r: 6, color: SEPIA_DEEP, lifeMs: 4000 });
        tk.sfx('shotgun');
      }
      frames = frames.filter((f) => !f.done || time - Math.max(f.fireAt, f.poppedAt) < 600);
    },
    drawAir(g, time) {
      for (const f of frames) {
        if (f.popped) {
          const e = clamp((time - f.poppedAt) / 600, 0, 1);
          for (let i = 0; i < 6; i++) photo(g, f.x + Math.cos(i) * e * 40, f.y + Math.sin(i) * e * 30 + e * 20, 12, 9, i + e * 4, 1, i);
          continue;
        }
        if (f.done) continue;
        const k = clamp((time - f.at) / Math.max(1, f.fireAt - f.at), 0, 1);
        frame(g, f.x, f.y, 46, 56, HINDSIGHT, 1);
        // The face is a blank oval, and a drip of drying paint shows how long until it fires.
        g.fillStyle(SEPIA_PALE, 1); g.fillEllipse(f.x, f.y - 6, 14, 17);
        g.lineStyle(1, SEPIA_DARK, 0.6); g.lineBetween(f.x - 4, f.y - 2, f.x + 4, f.y - 2);
        g.fillStyle(HINDSIGHT_DARK, 1); g.fillRect(f.x - 17, f.y + 24, 34 * k, 3);
        g.lineStyle(2, RECALL, 0.3 + k * 0.6); g.strokeCircle(f.x, f.y, 36 - k * 6);
        // A sight-line to you as it dries.
        if (k > 0.6) { const a = tk.angleToPlayer(f.x, f.y); g.lineStyle(1.5, SEPIA_DEEP, (k - 0.6) * 1.5); g.lineBetween(f.x, f.y, f.x + Math.cos(a) * 140, f.y + Math.sin(a) * 140); }
      }
    },
    onPhaseEnd() { for (const f of frames) f.target.remove(); frames = []; },
  };
};

// ── Signature: India-Rubber (phase 2) ────────────────────────────────
// A band of the room through you is pencilled round; then a great rubber scrubs along it from one
// side to the other, rubbing out whatever it meets and shoving it along.

const rubber = (tk: BossToolkit): SignatureMove => {
  let band: { horiz: boolean; c: number; half: number; dir: number; at: number; goAt: number; endAt: number; hit: boolean } | null = null;
  return {
    durationMs: 1600,
    windupMs: 600,
    gesture: 'sweep',
    tell: 'RUBBED OUT',
    cast(time) {
      const p = tk.player;
      const horiz = Math.random() < 0.6;
      const goAt = time + tk.warn(950);
      band = { horiz, c: horiz ? p.y : p.x, half: 54, dir: Math.random() < 0.5 ? 1 : -1, at: time, goAt, endAt: goAt + 1300, hit: false };
      remember(tk, horiz ? { kind: 'rect', x: 0, y: band.c - 54, w: tk.W, h: 108 } : { kind: 'rect', x: band.c - 54, y: TOP, w: 108, h: tk.H - TOP });
      tk.sfx('stone-slam');
    },
    update(time) {
      if (!band) return;
      if (time > band.endAt + 300) { band = null; return; }
      if (time < band.goAt || band.hit) return;
      const k = clamp((time - band.goAt) / (band.endAt - band.goAt), 0, 1);
      const len = band.horiz ? tk.W : tk.H - TOP;
      const head = (band.dir > 0 ? k : 1 - k) * len + (band.horiz ? 0 : TOP);
      const p = tk.player;
      const along = band.horiz ? p.x : p.y, across = band.horiz ? p.y : p.x;
      if (alivePlayer(tk) && Math.abs(across - band.c) < band.half && Math.abs(along - head) < 56) {
        band.hit = true;
        tk.hitPlayer(15, p.x, p.y);
        tk.pull(band.horiz ? clamp(p.x + band.dir * 300, 40, tk.W - 40) : p.x, band.horiz ? p.y : clamp(p.y + band.dir * 300, TOP + 40, tk.H - 40), 130, 500);
      }
    },
    drawGround(g, time) {
      if (!band) return;
      const b = band;
      const x0 = b.horiz ? 0 : b.c - b.half, y0 = b.horiz ? b.c - b.half : TOP;
      const w = b.horiz ? tk.W : b.half * 2, h = b.horiz ? b.half * 2 : tk.H - TOP;
      const k = clamp((time - b.at) / Math.max(1, b.goAt - b.at), 0, 1);
      // Pencilled round first: a dashed graphite outline.
      g.lineStyle(2, 0x4a4a4a, 0.4 + k * 0.4);
      const L = b.horiz ? w : h;
      for (let d = 0; d < L; d += 24) {
        if (b.horiz) { g.lineBetween(d, y0, d + 14, y0); g.lineBetween(d, y0 + h, d + 14, y0 + h); }
        else { g.lineBetween(x0, TOP + d, x0, TOP + d + 14); g.lineBetween(x0 + w, TOP + d, x0 + w, TOP + d + 14); }
      }
      if (time >= b.goAt) {
        // Behind the rubber, the floor is rubbed pale; shavings curl.
        const kk = clamp((time - b.goAt) / (b.endAt - b.goAt), 0, 1);
        const head = (b.dir > 0 ? kk : 1 - kk) * L;
        g.fillStyle(SEPIA_PALE, 0.5 * (1 - clamp((time - b.endAt) / 300, 0, 1)));
        if (b.horiz) g.fillRect(b.dir > 0 ? 0 : head, y0, b.dir > 0 ? head : tk.W - head, h);
        else g.fillRect(x0, TOP + (b.dir > 0 ? 0 : head), w, b.dir > 0 ? head : L - head);
      }
    },
    drawAir(g, time) {
      if (!band || time < band.goAt) return;
      const b = band;
      const kk = clamp((time - b.goAt) / (b.endAt - b.goAt), 0, 1);
      const L = b.horiz ? tk.W : tk.H - TOP;
      const head = (b.dir > 0 ? kk : 1 - kk) * L;
      const x = b.horiz ? head : b.c, y = b.horiz ? b.c : TOP + head;
      // The rubber: a fat pink-and-blue india-rubber, worn at the scrubbing edge.
      const rw = b.horiz ? 56 : b.half * 2 + 10, rh = b.horiz ? b.half * 2 + 10 : 56;
      g.fillStyle(0x000000, 0.2); g.fillRect(x - rw / 2 + 4, y - rh / 2 + 6, rw, rh);
      g.fillStyle(0xd88a8a, 1); g.fillRoundedRect(x - rw / 2, y - rh / 2, rw, rh, 8);
      g.fillStyle(0x6a8ac8, 1);
      if (b.horiz) g.fillRoundedRect(x - rw / 2 + (b.dir > 0 ? 0 : rw / 2), y - rh / 2, rw / 2, rh, 8);
      else g.fillRoundedRect(x - rw / 2, y - rh / 2 + (b.dir > 0 ? 0 : rh / 2), rw, rh / 2, 8);
      g.lineStyle(1.5, dim(0xd88a8a, 0.3), 1); g.strokeRoundedRect(x - rw / 2, y - rh / 2, rw, rh, 8);
      for (let i = 0; i < 5; i++) {
        const ph = (time / 200 + i / 5) % 1;
        const sx = x - (b.horiz ? b.dir * (20 + ph * 50) : 0) + (b.horiz ? 0 : (i - 2) * 16), sy = y - (b.horiz ? 0 : b.dir * (20 + ph * 50)) + (b.horiz ? (i - 2) * 16 : 0);
        g.fillStyle(0xe8b0b0, 1 - ph); g.fillEllipse(sx, sy, 6, 3);
      }
    },
    onPhaseEnd() { band = null; },
  };
};

// ── Signature: Total Recall (hard) ───────────────────────────────────
// Everything he has done this fight comes back at once: each remembered blow appears faint on the
// floor where it fell before, ripens, and lands solid — a few at a time, in the order he did them.

const totalRecall = (tk: BossToolkit): SignatureMove => {
  let rain: { r: Recalled; at: number; fireAt: number; dealt: boolean }[] = [];
  return {
    durationMs: 3000,
    windupMs: 900,
    gesture: 'raise',
    hold: 'conduct',
    locksBody: true,
    tell: 'TOTAL RECALL',
    cast(time) {
      const log = LOG.get(tk) ?? [];
      const picks = log.slice(-18);
      // A fight with no past yet remembers round you.
      if (!picks.length) for (let i = 0; i < 6; i++) picks.push({ kind: 'circle', x: tk.player.x + Math.cos(i) * 140, y: tk.player.y + Math.sin(i) * 110, r: 54 });
      rain = picks.map((r, i) => ({ r, at: time + i * 110, fireAt: time + i * 110 + tk.warn(1350), dealt: false }));
      tk.sfx('boss-phase');
    },
    update(time) {
      const p = tk.player;
      for (const d of rain) {
        if (d.dealt || time < d.fireAt) continue;
        d.dealt = true;
        tk.sfx(d.r.kind === 'rect' ? 'stone-slam' : 'hit-medium');
        if (alivePlayer(tk) && inRecalled(d.r, p.x, p.y)) tk.hitPlayer(d.r.kind === 'rect' ? 10 : 9, p.x, p.y);
      }
      rain = rain.filter((d) => !d.dealt || time - d.fireAt < 500);
    },
    drawGround(g, time) {
      for (const d of rain) {
        if (time < d.at) continue;
        const k = clamp((time - d.at) / Math.max(1, d.fireAt - d.at), 0, 1);
        const e = d.dealt ? clamp((time - d.fireAt) / 500, 0, 1) : 0;
        const a = d.dealt ? 0.6 * (1 - e) : 0.06 + k * 0.28;
        const col = d.dealt ? GILT_LIT : mixC(SEPIA_PALE, GILT, k);
        g.fillStyle(col, a);
        if (d.r.kind === 'circle') g.fillCircle(d.r.x, d.r.y, d.r.r); else g.fillRect(d.r.x, d.r.y, d.r.w, d.r.h);
        g.lineStyle(2, GILT, (d.dealt ? 1 - e : 0.3 + k * 0.6));
        if (d.r.kind === 'circle') g.strokeCircle(d.r.x, d.r.y, d.r.r); else g.strokeRect(d.r.x, d.r.y, d.r.w, d.r.h);
      }
    },
    drawAir(g, time) {
      // A photograph falls onto each remembered spot as it ripens — faint, then solid.
      for (const d of rain) {
        if (d.dealt || time < d.at) continue;
        const k = clamp((time - d.at) / Math.max(1, d.fireAt - d.at), 0, 1);
        const cx = d.r.kind === 'circle' ? d.r.x : d.r.x + d.r.w / 2, cy = d.r.kind === 'circle' ? d.r.y : d.r.y + d.r.h / 2;
        photo(g, cx, cy - (1 - k) * 220, 26, 20, (1 - k) * 4, 1 - k, Math.round(cx));
      }
    },
    onPhaseEnd() { rain = []; },
  };
};

// ── The Prince ───────────────────────────────────────────────────────

export const HINDSIGHT_BOSS: WorldBossDef = {
  worldId: 'isle:hindsight',
  name: 'Prince Hindsight',
  title: 'the Backward-Looking',
  color: HINDSIGHT,
  colorLit: HINDSIGHT_LIT,
  colorDark: HINDSIGHT_DARK,
  accent: HINDSIGHT_EYE,
  // Tier 3 of the eighth isle.
  damageMult: 1.35,

  intro: [
    'Ah. I saw you coming. Through the glass. Backwards, of course — you were leaving when I first saw you.',
    'The future is a drum, and drums are rigged. The past is honest. Let me show you yours.',
  ],
  banter: [
    'Every face in this court is in a bottle in my reading room. Catalogued. Safe. Nobody can lose them now.',
    'I was never drawn. Not once. Father saw to it. So I watch the Draws. Afterwards. Through the glass.',
    'You stepped there a moment ago. I remember. So does the floor.',
    'Hindsight is a gift. I give it to everyone. They pay me in what they had.',
    'Don\'t double back. It is the one thing nobody here can afford.',
  ],
  defeatLine: 'IT WAS ALWAYS GOING TO END THIS WAY',
  resumeLine: 'You again. Of course. I remember how this goes. Let\'s see if you do.',

  phases: [
    {
      name: 'Recollection',
      line: 'Recollection. Where were you a moment ago? I know. I\'m afraid you\'re about to be there.',
      hp: 550,
      cycle: [
        'sig:recollection', 'volley', 'sig:snapshot', 'sig:tickets', 'radial',
        'sig:recollection', 'homing', 'sig:tickets', 'sig:snapshot', 'stream',
      ],
      harass: ['h-snipe', 'h-orbs'],
      restMs: 1250,
      harassMs: 3400,
    },
    {
      name: 'Forgotten',
      line: 'I\'ve forgotten how this room goes. So has the room. Mind where you stand — it may not be there.',
      hp: 640,
      cycle: [
        'sig:forget', 'sig:faceless', 'lanes', 'sig:rubber', 'sig:forget',
        'barrage', 'sig:faceless', 'sig:tickets', 'sig:rubber', 'spiral',
      ],
      harass: ['h-flak', 'h-rune', 'h-lane'],
      restMs: 1100,
      harassMs: 3000,
    },
  ],

  hard: {
    introLine: 'EVERYTHING COMES BACK',
    extraPhase: {
      name: 'Total Recall',
      line: 'Total recall. Every blow I\'ve thrown today, in the order I threw it. I keep everything.',
      hp: 470,
      cycle: [
        'sig:recall', 'sig:recollection', 'sig:snapshot', 'sig:forget',
        'sig:recall', 'sig:faceless', 'sig:tickets', 'sweep',
      ],
      harass: ['h-orbs', 'h-mines'],
      restMs: 1000,
      harassMs: 2700,
    },
  },

  tuning: {
    volley: { count: 5, speed: 215, spreadRad: 0.45 },
    radial: { count: 16, speed: 175 },
    spiral: { arms: 3, speed: 165 },
    lanes: { warnMs: 900 },
  },

  signatures: {
    recollection,
    snapshot,
    tickets,
    forget: forgetting,
    faceless,
    rubber,
    recall: totalRecall,
  },

  look: {
    crest: 'none', pattern: 'weave', aura: 'smoke', hands: 'wisp',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: HINDSIGHT_EYE,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'blink', gimmick: 'none', tint: 'pale', look: { aura: 'dust', hands: 'ball', mouth: 'stitch' } },
    { movement: 'anchor', gimmick: 'none', tint: 'gold', look: { aura: 'coins', hands: 'orb', mouth: 'grin', eyes: 3 } },
  ],

  /**
   * The Backward-Looking's tells. A tall starched collar in faded plum; a gilt circlet with a little
   * clock on it whose hands turn backwards; a monocle over the eye nearest you, glinting amber;
   * the Lot token he was never called on, bright on its chain; and in his second hand a brass
   * spyglass held the wrong way round, always pointing *away* from you. Photographs drift round
   * him like moths. In Forgotten the photographs go blank, the collar fades, and dashed gaps open
   * in his outline where he has forgotten parts of himself. In Total Recall every photograph is
   * sharp, there are twice as many, and they spin fast, edged in gilt.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const forgot = s.phaseIdx === 1;
    const recall = s.hard && s.phaseIdx >= 2;
    // Drifting photographs, behind and around.
    const n = recall ? 12 : 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + s.t / (recall ? 700 : 2200);
      const rr = R * (1.55 + (i % 3) * 0.18);
      const px = s.x + Math.cos(a) * rr, py = s.y + Math.sin(a) * rr * 0.62 - 6;
      photo(g, px, py, 15, 11, a * 0.5 + Math.sin(s.t / 500 + i) * 0.3, forgot ? 0.95 : recall ? 0 : 0.35, i);
      if (recall) { g.lineStyle(1, GILT_LIT, 0.8); g.strokeCircle(px, py, 9); }
    }
    // The starched collar, rising behind the head.
    const collar = forgot ? mixC(HINDSIGHT, SEPIA_PALE, 0.55) : HINDSIGHT_DARK;
    g.fillStyle(collar, 1);
    g.fillTriangle(s.x - R * 0.95, s.y - R * 0.15, s.x - R * 0.2, s.y - R * 0.55, s.x - R * 0.75, s.y - R * 1.3);
    g.fillTriangle(s.x + R * 0.95, s.y - R * 0.15, s.x + R * 0.2, s.y - R * 0.55, s.x + R * 0.75, s.y - R * 1.3);
    g.lineStyle(1.5, lit(collar, 0.3), 0.8);
    g.lineBetween(s.x - R * 0.95, s.y - R * 0.15, s.x - R * 0.75, s.y - R * 1.3);
    g.lineBetween(s.x + R * 0.95, s.y - R * 0.15, s.x + R * 0.75, s.y - R * 1.3);
    // The circlet with its backwards clock.
    const cy = s.y - R * 0.95;
    g.lineStyle(3, GILT_DARK, 1); g.beginPath(); g.arc(s.x, s.y - R * 0.2, R * 0.8, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
    g.lineStyle(1.5, GILT_LIT, 1); g.beginPath(); g.arc(s.x, s.y - R * 0.22, R * 0.8, Math.PI * 1.2, Math.PI * 1.8, false); g.strokePath();
    g.fillStyle(GILT_DARK, 1); g.fillCircle(s.x, cy, 8.5);
    g.fillStyle(PAPER, 1); g.fillCircle(s.x, cy, 6.5);
    const mh = -Math.PI / 2 - s.t / 300, hh = -Math.PI / 2 - s.t / 3600;
    g.lineStyle(1.2, INK, 1); g.lineBetween(s.x, cy, s.x + Math.cos(mh) * 5.5, cy + Math.sin(mh) * 5.5);
    g.lineStyle(1.8, INK, 1); g.lineBetween(s.x, cy, s.x + Math.cos(hh) * 3.5, cy + Math.sin(hh) * 3.5);
    // The monocle over the eye nearest you, on a fine gilt chain.
    const side = Math.cos(s.facing) >= 0 ? 1 : -1;
    const mx = s.x + side * R * 0.32, my = s.y - R * 0.2;
    g.lineStyle(2, GILT, 1); g.strokeCircle(mx, my, 8);
    g.fillStyle(HINDSIGHT_EYE, 0.18 + s.castGlow * 0.3); g.fillCircle(mx, my, 7);
    g.fillStyle(0xffffff, 0.6); g.fillCircle(mx - 3, my - 3, 1.6);
    g.lineStyle(1, GILT_DARK, 0.9); g.lineBetween(mx + side * 6, my + 5, s.x + side * R * 0.5, s.y + R * 0.6);
    // The Lot he was never called on.
    g.lineStyle(1, GILT_DARK, 1); g.lineBetween(s.x - 7, s.y + R * 0.25, s.x, s.y + R * 0.55); g.lineBetween(s.x + 7, s.y + R * 0.25, s.x, s.y + R * 0.55);
    lotToken(g, s.x, s.y + R * 0.62, 6);
    if (s.castGlow > 0.3) glow(g, s.x, s.y + R * 0.62, 12, GILT_LIT, 0.05 * s.castGlow, 2);
    // The spyglass, the wrong way round: eyepiece to the world, lens to himself — pointing away.
    const hand = s.hands[1];
    if (hand) {
      const away = s.facing + Math.PI;
      const ex = hand.x + Math.cos(away) * 30, ey = hand.y + Math.sin(away) * 30;
      g.lineStyle(7, GILT_DARK, 1); g.lineBetween(hand.x, hand.y, ex, ey);
      g.lineStyle(4.5, GILT, 1); g.lineBetween(hand.x, hand.y, ex, ey);
      g.lineStyle(1, GILT_LIT, 1); g.lineBetween(hand.x + Math.cos(away) * 10, hand.y + Math.sin(away) * 10 - 2, ex, ey - 2);
      g.fillStyle(GILT_DARK, 1); g.fillCircle(ex, ey, 5.5);
      g.fillStyle(HINDSIGHT_EYE, 0.8); g.fillCircle(ex, ey, 3.5);
    }
    if (forgot) {
      // Dashed gaps in his outline: the parts of himself he has forgotten.
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + s.t / 4000;
        if (i % 3 === 0) continue;
        g.lineStyle(3, SEPIA_PALE, 0.85);
        g.beginPath(); g.arc(s.x, s.y, R + 2, a, a + 0.18, false); g.strokePath();
      }
    }
    if (recall) {
      g.lineStyle(2, GILT_LIT, 0.4 + Math.sin(s.t / 120) * 0.25); g.strokeCircle(s.x, s.y, R * 1.35);
    }
    if (s.enraged) { g.lineStyle(1.5, HINDSIGHT_EYE, 0.35 + Math.sin(s.t / 110) * 0.2); g.strokeCircle(s.x, s.y, R * 1.2); }
  },

  /**
   * The Archive's reading room: herringbone parquet, a great round catalogue rug at the heart
   * with the court's sixteen pledge-rays inlaid round a gilt eye, card-catalogue cabinets along the
   * back wall under shelves of glowing bottles, green-shaded reading lamps down both sides, and a
   * sepia hush pressing in at the corners.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x51a6e7);
    // Herringbone parquet.
    g.fillStyle(TIMBER, 1); g.fillRect(0, 0, W, H);
    for (let y = 90; y < H + 40; y += 24) {
      for (let x = -40; x < W + 40; x += 48) {
        const k = ((x / 48) | 0) % 2;
        const c = [TIMBER, TIMBER_LIT, mixC(TIMBER, SEPIA, 0.4)][((x * 7 + y * 3) / 24 | 0) % 3];
        g.fillStyle(c, 1);
        if (k) { g.fillTriangle(x, y, x + 24, y - 12, x + 48, y); g.fillTriangle(x, y, x + 48, y, x + 24, y + 12); }
        else { g.fillRect(x, y - 6, 48, 12); }
        g.lineStyle(1, TIMBER_DARK, 0.35); g.strokeRect(x, y - 6, 48, 12);
      }
    }
    // The back wall: catalogue cabinets under bottle shelves (half under the HUD).
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(0, 0, W, 112);
    for (let x = 6; x < W; x += 30) {
      for (let r = 0; r < 2; r++) {
        g.fillStyle(TIMBER, 1); g.fillRect(x, 62 + r * 22, 26, 19);
        g.fillStyle(PAPER, 0.9); g.fillRect(x + 6, 66 + r * 22, 14, 5);
        g.fillStyle(GILT, 1); g.fillRect(x + 10, 76 + r * 22, 6, 2);
      }
    }
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(0, 54, W, 5);
    for (let x = 14; x < W; x += 16) memoryBottle(g, x, 53, 0.75, MEMORY_COLORS[Math.floor(rng() * MEMORY_COLORS.length)], 0.7);
    g.fillStyle(GILT_DARK, 1); g.fillRect(0, 108, W, 5);
    // Reading lamps and desks down both sides.
    for (let y = 190; y < H - 40; y += 150) {
      for (const x of [34, W - 34]) {
        g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 24, y - 6, 48, 20);
        g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 24, y - 8, 48, 4);
        g.fillStyle(PAPER, 1); g.fillRect(x - 14, y - 12, 18, 4);
        g.fillStyle(LAMP_GREEN, 1); g.fillTriangle(x - 10, y - 26, x + 10, y - 26, x, y - 36);
        g.fillStyle(GILT, 1); g.fillRect(x - 1, y - 26, 2, 14);
        glow(g, x, y - 20, 40, LAMP_LIGHT, 0.04, 3);
      }
    }
    // The catalogue rug: a great round with sixteen pledge-rays round a gilt eye.
    const cx = W / 2, cy = (H + 112) / 2;
    g.fillStyle(SEPIA_DEEP, 1); g.fillCircle(cx, cy, 214);
    g.fillStyle(HINDSIGHT_DARK, 1); g.fillCircle(cx, cy, 206);
    g.fillStyle(mixC(HINDSIGHT_DARK, SEPIA, 0.3), 1); g.fillCircle(cx, cy, 190);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.fillStyle(i % 2 ? SEPIA_LIT : GILT_DARK, 0.5);
      g.fillTriangle(cx + Math.cos(a - 0.09) * 60, cy + Math.sin(a - 0.09) * 60, cx + Math.cos(a + 0.09) * 60, cy + Math.sin(a + 0.09) * 60, cx + Math.cos(a) * 184, cy + Math.sin(a) * 184);
    }
    g.lineStyle(3, GILT, 0.7); g.strokeCircle(cx, cy, 196);
    g.lineStyle(1.5, GILT_LIT, 0.5); g.strokeCircle(cx, cy, 120);
    // The eye: an amber iris looking back.
    g.fillStyle(SEPIA_PALE, 1); g.fillEllipse(cx, cy, 96, 50);
    g.fillStyle(HINDSIGHT_EYE, 1); g.fillCircle(cx, cy, 22);
    g.fillStyle(SEPIA_DEEP, 1); g.fillCircle(cx, cy, 10);
    g.fillStyle(0xffffff, 0.6); g.fillCircle(cx - 6, cy - 7, 4);
    g.lineStyle(2, GILT_DARK, 1); g.strokeEllipse(cx, cy, 96, 50);
    // Pressed forget-me-nots and loose tickets scattered on the boards.
    for (let i = 0; i < 26; i++) {
      const x = 70 + rng() * (W - 140), y = 130 + rng() * (H - 170);
      if (dist(x, y, cx, cy) < 220) continue;
      if (rng() < 0.5) fmn(g, x, y, 1.8, 0.7); else { g.fillStyle(PAPER, 0.7); g.fillRect(x, y, 9, 6); g.fillStyle(0xb0302a, 0.6); g.fillRect(x + 1, y + 2, 7, 1.5); }
    }
    // The hush at the corners.
    for (let i = 0; i < 6; i++) { g.lineStyle(40, SEPIA_DEEP, 0.05); g.strokeRect(i * 18, i * 18, W - i * 36, H - i * 36); }
  },
};
