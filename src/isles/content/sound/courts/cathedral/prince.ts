import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mulberry } from '../../../../art/IsleArt';
import { candelabrum, choirStalls, lancetShape, organPipe, roseWindow, tuningFork } from './art';
import {
  ASHLAR, ASHLAR_DARK, CANDLELIGHT, EVENGOLD, GILT, GILT_DARK, GILT_LIT, GLASS_BLUE, GLASS_COLORS,
  GLASS_GOLD, GLASS_GREEN, GLASS_RED, LEAD, SMOKE, SURPLICE, VESPER, VESPER_DARK, VESPER_LIT,
} from './palette';
import { clamp, dist, segDist } from './util';

/**
 * Prince Vesper, the Evening Voice — first chair of the Cathedral Court, the Maestro's soloist.
 *
 * Chosen at ten for the clearest voice on Choirholm, Vesper had her own Part taken from her
 * collar the day she was chosen ("you will sing mine now") and has sung the Vespers solo every
 * evening since, thirty years, never a note of her own. She believes the muted are *kept* — safe
 * in the Organ, singing perfectly for ever — and that it is the kindest thing the Maestro does.
 * She fights the way the office of Vespers runs:
 *
 * • **Litany** (orbiting): a rosary of glowing beads circles her, and one bead at a time lashes
 *   out in a strand; the beads fly off to ring you and are told across the ring one by one; and
 *   a censer on a long chain swings arcs before her, leaving incense that drags at your feet.
 * • **Stained Glass** (anchored at the altar, gold): the floor becomes a window. Panes light in a
 *   coloured sequence and then smite in that order; three lancet shafts of light fall and slide
 *   across the nave together; and she raises a glass roundel whose beam follows you, lagging.
 * • **Rapture** (hard, hovering, pale): she rises in light — nothing touches her unless you stand
 *   beneath her, in her shadow — while pillars of light fall from the rose window; and her halo
 *   comes down on you as a burning ring that you must step through, in or out.
 */

const TOP = 96;

/** Phases ended so far — the window floor shows from the Stained Glass on. Set from drawDecor. */
let vesperPhase = 0;

const alivePlayer = (tk: BossToolkit) => tk.player.active && tk.player.hp > 0;

// ── Signature: Litany (the rosary) ───────────────────────────────────
// Ten beads orbit her. One after another, each bead brightens, a thin line runs out from it, and
// then it lashes out along that line as a strand of light. The lashes walk round her in a fan.

interface Lash { a: number; ox: number; oy: number; warnAt: number; fireAt: number; dealt: boolean }

const BEADS = 10;
const LASH_LEN = 440;

const litany = (tk: BossToolkit): SignatureMove => {
  let lashes: Lash[] = [];
  let spin = 0;
  let activeUntil = 0;
  return {
    durationMs: 3200,
    windupMs: 600,
    gesture: 'raise',
    tell: 'LITANY',
    cast(time) {
      const gap = tk.hard ? 210 : 260;
      const warn = tk.warn(560);
      const base = tk.angleToPlayer();
      const dir = Math.random() < 0.5 ? 1 : -1;
      lashes = [];
      for (let i = 0; i < BEADS; i++) {
        const warnAt = time + i * gap;
        lashes.push({ a: base + dir * i * (Math.PI * 2 / BEADS + gap / 1000 * 1.6), ox: 0, oy: 0, warnAt, fireAt: warnAt + warn, dealt: false });
      }
      spin = base;
      activeUntil = time + BEADS * gap + warn + 500;
      tk.sfx('crystal-chime');
    },
    update(time, dt) {
      if (time > activeUntil) { lashes = []; return; }
      spin += dt * 1.6;
      const p = tk.player;
      for (const l of lashes) {
        if (time >= l.warnAt && l.ox === 0 && l.oy === 0) { l.ox = tk.bossX; l.oy = tk.bossY; }
        if (l.dealt || time < l.fireAt) continue;
        l.dealt = true;
        tk.sfx('whip');
        if (alivePlayer(tk) && segDist(p.x, p.y, l.ox, l.oy, l.ox + Math.cos(l.a) * LASH_LEN, l.oy + Math.sin(l.a) * LASH_LEN) < 14 + 18) {
          tk.hitPlayer(11, p.x, p.y);
        }
      }
    },
    drawGround(g, time) {
      for (const l of lashes) {
        if (time < l.warnAt || l.dealt) continue;
        const k = clamp((time - l.warnAt) / Math.max(1, l.fireAt - l.warnAt), 0, 1);
        const ex = l.ox + Math.cos(l.a) * LASH_LEN, ey = l.oy + Math.sin(l.a) * LASH_LEN;
        g.lineStyle(2 + k * 10, VESPER_LIT, 0.08 + k * 0.18); g.lineBetween(l.ox, l.oy, ex, ey);
        g.lineStyle(1, EVENGOLD, 0.3 + k * 0.5); g.lineBetween(l.ox, l.oy, l.ox + Math.cos(l.a) * LASH_LEN * k, l.oy + Math.sin(l.a) * LASH_LEN * k);
      }
    },
    drawAir(g, time) {
      if (time > activeUntil) return;
      // The beads on their orbit, the next to lash swelling.
      const told = lashes.filter((l) => l.dealt).length;
      for (let i = 0; i < BEADS; i++) {
        if (i < told) continue;
        const a = spin + (i / BEADS) * Math.PI * 2;
        const x = tk.bossX + Math.cos(a) * 66, y = tk.bossY + Math.sin(a) * 52;
        const next = i === told;
        g.fillStyle(VESPER_DARK, 1); g.fillCircle(x, y, next ? 8 : 6);
        g.fillStyle(next ? EVENGOLD : VESPER_LIT, 1); g.fillCircle(x, y, next ? 6.5 : 4.5);
        g.fillStyle(0xffffff, 0.7); g.fillCircle(x - 1.5, y - 1.5, 1.6);
      }
      g.lineStyle(1, GILT, 0.5); g.strokeEllipse(tk.bossX, tk.bossY, 132, 104);
      // The strands as they lash: a bright cord that snaps out and fades, a bead at its tip.
      for (const l of lashes) {
        if (!l.dealt || time > l.fireAt + 360) continue;
        const k = (time - l.fireAt) / 360;
        const reach = LASH_LEN * Math.min(1, k * 2.2);
        const ex = l.ox + Math.cos(l.a) * reach, ey = l.oy + Math.sin(l.a) * reach;
        const wob = Math.sin(k * 20) * 6 * (1 - k);
        const mx = (l.ox + ex) / 2 - Math.sin(l.a) * wob, my = (l.oy + ey) / 2 + Math.cos(l.a) * wob;
        g.lineStyle(5 * (1 - k) + 1, VESPER_LIT, 1 - k); g.lineBetween(l.ox, l.oy, mx, my); g.lineBetween(mx, my, ex, ey);
        g.lineStyle(2, 0xffffff, (1 - k) * 0.8); g.lineBetween(l.ox, l.oy, ex, ey);
        g.fillStyle(EVENGOLD, 1 - k); g.fillCircle(ex, ey, 7);
      }
    },
    onPhaseEnd() { lashes = []; activeUntil = 0; },
  };
};

// ── Signature: Decade ────────────────────────────────────────────────
// The beads fly off the string and stand in a ring round where you are. Then she tells them: one
// at a time a bead lights, a line shows its path, and it flies straight across the ring through
// the middle to the far side. Keep moving — the middle is crossed every time.

interface RingBead { a: number; litAt: number; flyAt: number; dealt: boolean }

const decade = (tk: BossToolkit): SignatureMove => {
  let beads: RingBead[] = [];
  let cx = 0, cy = 0, R = 220;
  let until = 0;
  const FLY = 320;
  return {
    durationMs: 3800,
    windupMs: 700,
    gesture: 'clap',
    tell: 'DECADE',
    cast(time) {
      const p = tk.player;
      cx = clamp(p.x, 240, tk.W - 240); cy = clamp(p.y, TOP + 200, tk.H - 190);
      R = 200;
      const n = tk.hard ? 10 : 8;
      const step = tk.hard ? 300 : 360;
      const warn = tk.warn(620);
      const rot = Math.random() * Math.PI * 2;
      beads = [];
      for (let i = 0; i < n; i++) {
        // Told in a star pattern round the ring so each crossing comes from somewhere new.
        const k = (i * 3) % n;
        const litAt = time + 500 + i * step;
        beads.push({ a: rot + (k / n) * Math.PI * 2, litAt, flyAt: litAt + warn, dealt: false });
      }
      until = time + 500 + n * step + warn + FLY + 300;
      tk.sfx('crystal-chime');
    },
    update(time) {
      if (time > until) { beads = []; return; }
      const p = tk.player;
      for (const b of beads) {
        if (b.dealt || time < b.flyAt) continue;
        const k = (time - b.flyAt) / FLY;
        if (k > 1) { b.dealt = true; continue; }
        const x = cx + Math.cos(b.a) * R * (1 - 2 * k), y = cy + Math.sin(b.a) * R * (1 - 2 * k);
        if (alivePlayer(tk) && dist(p.x, p.y, x, y) < 12 + 20) { b.dealt = true; tk.hitPlayer(10, x, y); tk.sfx('hit-medium'); }
      }
    },
    drawGround(g, time) {
      if (!beads.length) return;
      g.lineStyle(1.5, GILT, 0.25); g.strokeCircle(cx, cy, R);
      for (const b of beads) {
        if (b.dealt || time < b.litAt) continue;
        const k = clamp((time - b.litAt) / Math.max(1, b.flyAt - b.litAt), 0, 1);
        const x0 = cx + Math.cos(b.a) * R, y0 = cy + Math.sin(b.a) * R;
        g.lineStyle(4 + k * 18, VESPER_LIT, 0.06 + k * 0.14); g.lineBetween(x0, y0, cx * 2 - x0, cy * 2 - y0);
        g.lineStyle(1.5, EVENGOLD, 0.4 + k * 0.4); g.lineBetween(x0, y0, x0 + (cx - x0) * 2 * k, y0 + (cy - y0) * 2 * k);
      }
    },
    drawAir(g, time) {
      for (const b of beads) {
        if (b.dealt) continue;
        const flying = time >= b.flyAt;
        const k = flying ? (time - b.flyAt) / FLY : 0;
        // Before they arrive at the ring they fly out from her along a curve.
        const out = clamp((time - (b.litAt - 500)) / 400, 0, 1);
        let x = cx + Math.cos(b.a) * R * (1 - 2 * k), y = cy + Math.sin(b.a) * R * (1 - 2 * k);
        if (out < 1) { x = tk.bossX + (x - tk.bossX) * out; y = tk.bossY + (y - tk.bossY) * out - Math.sin(out * Math.PI) * 60; }
        const lit1 = time >= b.litAt;
        g.fillStyle(VESPER_DARK, 1); g.fillCircle(x, y, 10);
        g.fillStyle(lit1 ? EVENGOLD : VESPER_LIT, 1); g.fillCircle(x, y, 8);
        g.fillStyle(0xffffff, 0.7); g.fillCircle(x - 2, y - 2, 2.4);
        if (flying) for (let i = 1; i < 5; i++) { g.fillStyle(EVENGOLD, 0.4 - i * 0.08); g.fillCircle(x - Math.cos(b.a) * -i * 12, y - Math.sin(b.a) * -i * 12, 7 - i); }
      }
    },
    onPhaseEnd() { beads = []; until = 0; },
  };
};

// ── Signature: Censer ────────────────────────────────────────────────
// She swings a censer on a long chain, arcs back and forth in front of her (the arc shows first).
// The censer hits hard; at each end of a swing it leaves a cloud of incense that drags at you.

interface Cloud { x: number; y: number; until: number; seed: number }

const censer = (tk: BossToolkit): SignatureMove => {
  let swingAt = 0, swings = 0, centre = 0, ox = 0, oy = 0, until = 0;
  let hitSwing = -1, lastIdx = 0;
  let clouds: Cloud[] = [];
  let lastSlow = 0;
  const LEN = 210, AMP = 1.25, SWING_MS = 720;
  const head = (time: number) => {
    const u = (time - swingAt) / SWING_MS;
    const ang = centre + Math.cos(u * Math.PI) * AMP;
    return { x: ox + Math.cos(ang) * LEN, y: oy + Math.sin(ang) * LEN * 0.9, u };
  };
  return {
    durationMs: 3400,
    windupMs: 650,
    hold: 'brace',
    locksBody: true,
    tell: 'THE CENSER',
    cast(time) {
      ox = tk.bossX; oy = tk.bossY;
      centre = tk.angleToPlayer();
      swings = tk.hard ? 4 : 3;
      swingAt = time + tk.warn(700);
      until = swingAt + swings * SWING_MS;
      hitSwing = -1;
      lastIdx = 0;
      tk.sfx('whoosh');
    },
    update(time) {
      const p = tk.player;
      if (time >= swingAt && time < until) {
        const h = head(time);
        const idx = Math.floor(h.u);
        // At each end of a swing (a new swing begins), a puff of incense where the censer turned.
        if (idx !== lastIdx) {
          lastIdx = idx;
          if (clouds.length < 12) clouds.push({ x: h.x, y: h.y, until: time + 4200, seed: Math.random() * 6 });
          tk.sfx('whoosh');
        }
        if (idx !== hitSwing && alivePlayer(tk) && dist(p.x, p.y, h.x, h.y) < 18 + 20) {
          hitSwing = idx;
          tk.hitPlayer(12, h.x, h.y);
          tk.sfx('clang');
        }
      }
      clouds = clouds.filter((c) => time < c.until);
      if (alivePlayer(tk) && time - lastSlow > 280 && clouds.some((c) => dist(p.x, p.y, c.x, c.y) < 52)) {
        lastSlow = time;
        tk.slowPlayer(0.6, 400);
      }
    },
    drawGround(g, time) {
      // The arc it will swing through, while she winds it up.
      if (time < until) {
        const k = time < swingAt ? clamp(1 - (swingAt - time) / 700, 0, 1) : 1;
        for (let i = 0; i <= 16; i++) {
          const ang = centre - AMP + (i / 16) * AMP * 2;
          g.fillStyle(GILT, (time < swingAt ? 0.2 + k * 0.3 : 0.12)); g.fillCircle(ox + Math.cos(ang) * LEN, oy + Math.sin(ang) * LEN * 0.9, 4);
        }
      }
      for (const c of clouds) {
        const life = clamp((c.until - time) / 4200, 0, 1);
        for (let i = 0; i < 6; i++) {
          const a = c.seed + i + time / 1600;
          g.fillStyle(SMOKE, 0.12 * life); g.fillCircle(c.x + Math.cos(a) * 20, c.y + Math.sin(a) * 14, 26 + i * 2);
        }
      }
    },
    drawAir(g, time) {
      if (time < swingAt - tk.warn(700) || time >= until) return;
      const h = time < swingAt ? { x: ox + Math.cos(centre - AMP) * LEN, y: oy + Math.sin(centre - AMP) * LEN * 0.9 } : head(time);
      // The chain in links, the censer pierced and smoking.
      for (let i = 1; i < 14; i++) {
        const k = i / 14;
        g.fillStyle(GILT_DARK, 1); g.fillCircle(ox + (h.x - ox) * k, oy + (h.y - oy) * k, 2);
      }
      g.fillStyle(GILT_DARK, 1); g.fillCircle(h.x, h.y, 16);
      g.fillStyle(GILT, 1); g.fillCircle(h.x, h.y, 13);
      g.fillStyle(GILT_LIT, 1); g.fillCircle(h.x - 4, h.y - 4, 4);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.fillStyle(0xff9a40, 0.9); g.fillCircle(h.x + Math.cos(a) * 8, h.y + Math.sin(a) * 8, 1.8); }
      g.fillStyle(GILT_DARK, 1); g.fillTriangle(h.x - 8, h.y - 12, h.x + 8, h.y - 12, h.x, h.y - 22);
      for (let i = 0; i < 4; i++) { const ph = (time / 500 + i / 4) % 1; g.fillStyle(SMOKE, 0.4 * (1 - ph)); g.fillCircle(h.x + Math.sin(ph * 5 + i) * 6, h.y - 20 - ph * 30, 4 + ph * 7); }
    },
    onPhaseEnd() { clouds = []; until = 0; },
  };
};

// ── Signature: Stained Glass (the window floor) ──────────────────────
// The floor is a window of leaded panes in four colours. The panes light in a coloured sequence
// — red, then gold, then blue, then green, say — and then smite in that same order. Stand in a
// pane whose colour comes late, and move before it falls.

const COLS = 6, ROWS = 4;
const PANE_COLORS = [GLASS_RED, GLASS_GOLD, GLASS_BLUE, GLASS_GREEN];

const panes = (tk: BossToolkit): SignatureMove => {
  const cw = 960 / COLS, ch = (640 - TOP) / ROWS;
  const rng = mulberry(0x7e59e2);
  let grid: number[] = Array.from({ length: COLS * ROWS }, () => Math.floor(rng() * 4));
  let order: number[] = [];
  let showAt = 0, smiteAt = 0, until = 0;
  let dealt: boolean[] = [];
  const SHOW = 420, STEP = 760;
  const cellOf = (x: number, y: number) => clamp(Math.floor(x / cw), 0, COLS - 1) + clamp(Math.floor((y - TOP) / ch), 0, ROWS - 1) * COLS;
  return {
    durationMs: 3600,
    windupMs: 700,
    gesture: 'raise',
    tell: 'STAINED GLASS',
    cast(time) {
      // Recolour so every colour has ~six panes, scattered.
      const deck = Array.from({ length: COLS * ROWS }, (_, i) => i % 4);
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      grid = deck;
      order = [0, 1, 2, 3];
      for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      showAt = time;
      smiteAt = time + order.length * SHOW + tk.warn(700);
      until = smiteAt + order.length * STEP + 400;
      dealt = [false, false, false, false];
      tk.sfx('prism');
    },
    update(time) {
      if (time > until) return;
      const p = tk.player;
      for (let k = 0; k < order.length; k++) {
        if (dealt[k] || time < smiteAt + k * STEP) continue;
        dealt[k] = true;
        tk.sfx('light-beam');
        if (alivePlayer(tk) && grid[cellOf(p.x, p.y)] === order[k]) { tk.hitPlayer(15, p.x, p.y); tk.slowPlayer(0.75, 400); }
      }
    },
    drawGround(g, time) {
      const showing = vesperPhase >= 1 || time < until;
      if (!showing) return;
      const active = time < until;
      for (let i = 0; i < COLS * ROWS; i++) {
        const x = (i % COLS) * cw, y = TOP + Math.floor(i / COLS) * ch;
        const c = PANE_COLORS[grid[i]];
        let a = 0.07;
        if (active) {
          const k = order.indexOf(grid[i]);
          const shownAt = showAt + k * SHOW;
          const fireAt = smiteAt + k * STEP;
          if (time >= shownAt && time < shownAt + SHOW) a = 0.45;
          else if (time >= smiteAt - 900 && time < fireAt) a = 0.12 + clamp(1 - (fireAt - time) / 1600, 0, 1) * 0.3;
          else if (time >= fireAt && time < fireAt + 400) a = 0.7 * (1 - (time - fireAt) / 400);
          // Its place in the order, in pips at the pane's heart.
          if (time >= showAt + order.length * SHOW && time < fireAt) {
            for (let d = 0; d <= k; d++) { g.fillStyle(lit(c, 0.4), 0.8); g.fillCircle(x + cw / 2 - k * 5 + d * 10, y + ch / 2, 3.5); }
          }
        }
        g.fillStyle(c, a); g.fillRect(x + 3, y + 3, cw - 6, ch - 6);
        // A painted roundel in the middle of each pane, as in the real glass.
        g.lineStyle(1.5, dim(c, 0.3), a + 0.08); g.strokeCircle(x + cw / 2, y + ch / 2, Math.min(cw, ch) * 0.3);
      }
      // The lead between the panes.
      for (let c = 0; c <= COLS; c++) { g.lineStyle(5, LEAD, 0.5); g.lineBetween(c * cw, TOP, c * cw, 640); }
      for (let r = 0; r <= ROWS; r++) { g.lineStyle(5, LEAD, 0.5); g.lineBetween(0, TOP + r * ch, 960, TOP + r * ch); }
    },
    drawAir(g, time) {
      if (time > until) return;
      for (let k = 0; k < order.length; k++) {
        const fireAt = smiteAt + k * STEP;
        if (time < fireAt || time > fireAt + 380) continue;
        const f = (time - fireAt) / 380;
        for (let i = 0; i < COLS * ROWS; i++) {
          if (grid[i] !== order[k]) continue;
          const x = (i % COLS) * cw + cw / 2, y = TOP + Math.floor(i / COLS) * ch + ch / 2;
          g.fillStyle(PANE_COLORS[order[k]], 0.35 * (1 - f)); g.fillRect(x - cw * 0.3, y - ch / 2 - 200 * (1 - f), cw * 0.6, ch / 2 + 200 * (1 - f));
          g.fillStyle(0xffffff, 0.4 * (1 - f)); g.fillRect(x - cw * 0.1, y - ch / 2 - 200 * (1 - f), cw * 0.2, ch / 2 + 200 * (1 - f));
        }
      }
    },
    onPhaseEnd() { until = 0; },
  };
};

// ── Signature: Lancets ───────────────────────────────────────────────
// Three tall shafts of lancet light fall on the nave (their pointed outlines show on the floor),
// then slide across it together. Walk with the gap between them.

interface Shaft { x: number }

const lancets = (tk: BossToolkit): SignatureMove => {
  let shafts: Shaft[] = [];
  let fallAt = 0, until = 0, dir = 1;
  let hitAt = 0;
  const HALF = 34, SLIDE = 150, SLIDE_MS = 2600;
  return {
    durationMs: 2600,
    windupMs: 600,
    gesture: 'point',
    tell: 'LANCETS',
    cast(time) {
      dir = tk.player.x < tk.W / 2 ? 1 : -1;
      const start = dir > 0 ? 70 : tk.W - 70;
      shafts = [0, 1, 2].map((i) => ({ x: start + dir * i * 310 }));
      fallAt = time + tk.warn(900);
      until = fallAt + SLIDE_MS;
      hitAt = 0;
      tk.sfx('beam-charge');
    },
    update(time, dt) {
      if (time > until || !shafts.length) { shafts = []; return; }
      if (time < fallAt) return;
      for (const s of shafts) s.x += dir * SLIDE * dt;
      const p = tk.player;
      if (alivePlayer(tk) && time - hitAt > 520 && shafts.some((s) => Math.abs(p.x - s.x) < HALF + 12)) {
        hitAt = time;
        tk.hitPlayer(time - fallAt < 120 ? 14 : 8, p.x, p.y);
      }
    },
    drawGround(g, time) {
      for (const s of shafts) {
        const pre = time < fallAt;
        const k = pre ? clamp(1 - (fallAt - time) / 900, 0, 1) : 1;
        // A long pointed-arch of light laid along the floor.
        lancetShape(g, s.x, 640, HALF * 2, 640 - TOP, pre ? VESPER_LIT : 0xfff0c8, pre ? 0.08 + k * 0.14 : 0.3);
        if (!pre) {
          for (let i = 0; i < 4; i++) { const c = GLASS_COLORS[(i + Math.floor(s.x / 60)) % 5]; g.fillStyle(c, 0.18); g.fillRect(s.x - HALF + 6, TOP + 70 + i * 120, HALF * 2 - 12, 60); }
        }
      }
    },
    drawAir(g, time) {
      if (time < fallAt) return;
      for (const s of shafts) {
        const f = clamp((time - fallAt) / 180, 0, 1);
        g.fillStyle(0xfff6d8, 0.16 * f); g.fillRect(s.x - HALF, TOP, HALF * 2, 640 - TOP);
        g.fillStyle(0xffffff, 0.22 * f); g.fillRect(s.x - 6, TOP, 12, 640 - TOP);
        // Dust turning in the shaft.
        for (let i = 0; i < 8; i++) {
          const y = TOP + ((time / 9 + i * 71) % (640 - TOP));
          g.fillStyle(0xffffff, 0.5); g.fillCircle(s.x + Math.sin(time / 300 + i) * (HALF - 8), y, 1.3);
        }
      }
    },
    onPhaseEnd() { shafts = []; },
  };
};

// ── Signature: Roundel ───────────────────────────────────────────────
// She lifts a roundel of painted glass and focuses the window's light through it: a coloured beam
// from her that follows you, always a little behind. Keep moving round her.

const roundel = (tk: BossToolkit): SignatureMove => {
  let ang = 0, onAt = 0, until = 0, tickAt = 0;
  const LEN = 760, HALF = 15;
  return {
    durationMs: 3400,
    windupMs: 600,
    hold: 'charge',
    locksBody: true,
    tell: 'THE ROUNDEL',
    cast(time) {
      ang = tk.angleToPlayer() + (Math.random() < 0.5 ? 0.9 : -0.9);
      onAt = time + tk.warn(800);
      until = onAt + (tk.hard ? 3200 : 2700);
      tickAt = 0;
      tk.sfx('beam-charge');
    },
    update(time, dt) {
      if (time > until) return;
      const want = tk.angleToPlayer();
      let d = Math.atan2(Math.sin(want - ang), Math.cos(want - ang));
      const turn = (time < onAt ? 0.5 : tk.hard ? 1.0 : 0.85) * dt;
      d = clamp(d, -turn, turn);
      ang += d;
      if (time < onAt) return;
      const p = tk.player;
      if (alivePlayer(tk) && time >= tickAt && segDist(p.x, p.y, tk.bossX, tk.bossY, tk.bossX + Math.cos(ang) * LEN, tk.bossY + Math.sin(ang) * LEN) < HALF + 12) {
        tickAt = time + 340;
        tk.hitPlayer(6, p.x, p.y);
        tk.sfx('sizzle');
      }
    },
    drawGround(g, time) {
      if (time > until) return;
      const ex = tk.bossX + Math.cos(ang) * LEN, ey = tk.bossY + Math.sin(ang) * LEN;
      if (time < onAt) {
        g.lineStyle(2, VESPER_LIT, 0.35); g.lineBetween(tk.bossX, tk.bossY, ex, ey);
        return;
      }
      const c = GLASS_COLORS[Math.floor(time / 300) % GLASS_COLORS.length];
      g.lineStyle(HALF * 2 + 16, c, 0.12); g.lineBetween(tk.bossX, tk.bossY, ex, ey);
      g.lineStyle(HALF * 2, c, 0.4); g.lineBetween(tk.bossX, tk.bossY, ex, ey);
      g.lineStyle(6, 0xffffff, 0.7); g.lineBetween(tk.bossX, tk.bossY, ex, ey);
    },
    drawAir(g, time) {
      if (time > until) return;
      // The roundel itself, held before her.
      const rx = tk.bossX + Math.cos(ang) * 44, ry = tk.bossY + Math.sin(ang) * 44 - 6;
      roseWindow(g, rx, ry, 16, time / 600, 1, GILT);
      if (time >= onAt) glow(g, rx, ry, 30, 0xffffff, 0.1, 3);
    },
    onPhaseEnd() { until = 0; },
  };
};

// ── Signature: Rapture ───────────────────────────────────────────────
// She rises into the light. While she is up, nothing reaches her — except from directly beneath,
// standing in her shadow on the floor. Meanwhile pillars of light fall from the rose window, and
// some of them fall on her shadow.

interface Pillar { x: number; y: number; at: number; dealt: boolean }

const SHADOW_R = 96;

const rapture = (tk: BossToolkit): SignatureMove => {
  let upAt = 0, until = 0;
  let pillars: Pillar[] = [];
  const P_R = 62;
  const up = (time: number) => time >= upAt && time < until;
  return {
    durationMs: 6400,
    windupMs: 700,
    hold: 'reach',
    locksBody: true,
    tell: 'RAPTURE',
    cast(time) {
      upAt = time + 400;
      until = upAt + 6000;
      pillars = [];
      const n = tk.hard ? 11 : 9;
      for (let i = 0; i < n; i++) {
        const at = upAt + 700 + i * 520;
        // Every third falls on her shadow; the rest wherever you are standing then.
        pillars.push({ x: -1, y: i % 3 === 2 ? -2 : -1, at, dealt: false });
      }
      tk.sfx('wings');
    },
    update(time) {
      const p = tk.player;
      for (const pl of pillars) {
        // Aim each pillar when its warning starts.
        if (pl.x === -1 && time >= pl.at - tk.warn(950)) {
          if (pl.y === -2) { const a = Math.random() * Math.PI * 2; pl.x = tk.bossX + Math.cos(a) * 30; pl.y = tk.bossY + Math.sin(a) * 30; }
          else { pl.x = clamp(p.x, 40, tk.W - 40); pl.y = clamp(p.y, TOP + 30, tk.H - 30); }
        }
        if (pl.dealt || time < pl.at || pl.x < 0) continue;
        pl.dealt = true;
        tk.sfx('light-beam');
        if (alivePlayer(tk) && dist(p.x, p.y, pl.x, pl.y) < P_R + 14) tk.hitPlayer(14, pl.x, pl.y);
      }
      if (time > until + 400) pillars = [];
    },
    takenMult() {
      const now = tk.now;
      if (!up(now)) return 1;
      return dist(tk.player.x, tk.player.y, tk.bossX, tk.bossY + 20) < SHADOW_R ? 1.15 : 0;
    },
    drawGround(g, time) {
      if (up(time)) {
        // Her shadow, cast straight down on the floor: the one place to strike from.
        const pulse = 0.5 + Math.sin(time / 160) * 0.2;
        g.fillStyle(0x0a0618, 0.45); g.fillEllipse(tk.bossX, tk.bossY + 20, SHADOW_R * 2, SHADOW_R * 1.3);
        g.lineStyle(2.5, EVENGOLD, pulse); g.strokeEllipse(tk.bossX, tk.bossY + 20, SHADOW_R * 2, SHADOW_R * 1.3);
      }
      for (const pl of pillars) {
        if (pl.dealt || pl.x < 0) continue;
        const k = clamp(1 - (pl.at - time) / tk.warn(950), 0, 1);
        g.fillStyle(0xfff0c0, 0.08 + k * 0.2); g.fillCircle(pl.x, pl.y, P_R);
        g.lineStyle(2, EVENGOLD, 0.4 + k * 0.5); g.strokeCircle(pl.x, pl.y, P_R * (1.4 - k * 0.4));
        // The rose's tracery projected inside the circle, sharpening as it comes.
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + time / 900;
          g.lineStyle(1.5, GLASS_COLORS[i % 5], 0.2 + k * 0.4); g.lineBetween(pl.x, pl.y, pl.x + Math.cos(a) * P_R * k, pl.y + Math.sin(a) * P_R * k);
        }
      }
    },
    drawAir(g, time) {
      if (up(time)) {
        // Rising in a column of light, wings of light rays behind her.
        g.fillStyle(0xfff6d8, 0.12); g.fillRect(tk.bossX - 40, TOP, 80, tk.bossY - TOP + 30);
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i - 4.5) * 0.22 + Math.sin(time / 600) * 0.04;
          g.lineStyle(3, i % 2 ? EVENGOLD : VESPER_LIT, 0.35); g.lineBetween(tk.bossX, tk.bossY - 10, tk.bossX + Math.cos(a) * 110, tk.bossY - 10 + Math.sin(a) * 80);
        }
      }
      for (const pl of pillars) {
        if (!pl.dealt || time > pl.at + 420) continue;
        const f = (time - pl.at) / 420;
        g.fillStyle(0xfff6d8, 0.5 * (1 - f)); g.fillRect(pl.x - P_R * 0.7, TOP, P_R * 1.4, pl.y - TOP);
        g.fillStyle(0xffffff, 0.6 * (1 - f)); g.fillCircle(pl.x, pl.y, P_R * (0.6 + f * 0.6));
      }
    },
    onPhaseEnd() { pillars = []; until = 0; },
  };
};

// ── Signature: Nimbus ────────────────────────────────────────────────
// Her halo lifts off and comes down as a burning ring laid across where you stand — you are ON
// its line when it shows. Step in or out of the ring before it lands. Three halos, one by one.

interface Halo { x: number; y: number; showAt: number; at: number; dealt: boolean }

const nimbus = (tk: BossToolkit): SignatureMove => {
  let halos: Halo[] = [];
  const R = 92, BAND = 16;
  return {
    durationMs: 2800,
    windupMs: 600,
    gesture: 'raise',
    tell: 'NIMBUS',
    cast(time) {
      halos = [];
      const n = tk.hard ? 4 : 3;
      for (let i = 0; i < n; i++) halos.push({ x: -1, y: -1, showAt: time + i * 650, at: time + i * 650 + tk.warn(1000), dealt: false });
      tk.sfx('holy-chord');
    },
    update(time) {
      const p = tk.player;
      for (const h of halos) {
        if (h.x < 0 && time >= h.showAt) {
          const a = Math.random() * Math.PI * 2;
          h.x = clamp(p.x + Math.cos(a) * R, 60, tk.W - 60); h.y = clamp(p.y + Math.sin(a) * R, TOP + 40, tk.H - 40);
        }
        if (h.dealt || time < h.at || h.x < 0) continue;
        h.dealt = true;
        tk.sfx('crystal-shatter');
        if (alivePlayer(tk) && Math.abs(dist(p.x, p.y, h.x, h.y) - R) < BAND + 14) tk.hitPlayer(13, p.x, p.y);
      }
      halos = halos.filter((h) => time < h.at + 500);
    },
    drawGround(g, time) {
      for (const h of halos) {
        if (h.x < 0) continue;
        if (!h.dealt) {
          const k = clamp((time - h.showAt) / Math.max(1, h.at - h.showAt), 0, 1);
          g.lineStyle(BAND * 2, EVENGOLD, 0.06 + k * 0.16); g.strokeCircle(h.x, h.y, R);
          g.lineStyle(2, GILT_LIT, 0.4 + k * 0.5); g.strokeCircle(h.x, h.y, R + BAND); g.strokeCircle(h.x, h.y, R - BAND);
        } else {
          const f = (time - h.at) / 500;
          g.lineStyle(BAND * 2 * (1 - f) + 2, 0xffffff, 0.7 * (1 - f)); g.strokeCircle(h.x, h.y, R);
        }
      }
    },
    drawAir(g, time) {
      for (const h of halos) {
        if (h.x < 0 || h.dealt) continue;
        // The halo descending from above, a gilt ellipse narrowing onto its ring.
        const k = clamp((time - h.showAt) / Math.max(1, h.at - h.showAt), 0, 1);
        const y = h.y - (1 - k) * 160;
        g.lineStyle(5, GILT, 0.5 + k * 0.4); g.strokeEllipse(h.x, y, R * 2, R * 2 * (0.25 + k * 0.75));
        g.lineStyle(2, GILT_LIT, 0.8); g.strokeEllipse(h.x, y - 2, R * 2 - 8, R * 2 * (0.25 + k * 0.75) - 8);
      }
    },
    onPhaseEnd() { halos = []; },
  };
};

// ── The prince ───────────────────────────────────────────────────────

export const VESPER_BOSS: WorldBossDef = {
  worldId: 'isle:vesper',
  name: 'Prince Vesper',
  title: 'the Evening Voice',
  color: VESPER,
  colorLit: VESPER_LIT,
  colorDark: VESPER_DARK,
  accent: EVENGOLD,
  // Tier 4 of the ninth isle.
  damageMult: 1.55,

  intro: [
    'You have come up the stair at the wrong Hour. It is nearly Vespers. I sing Vespers.',
    'The voices in the Organ are kept, stranger. Kept safe, in tune for ever. You would break the pipes and call it mercy.',
  ],
  banter: [
    'Every evening for thirty years. Never a wrong note. Never a note of mine.',
    'He took my Part the day he chose me. "You will sing mine now." It was a gift.',
    'The muted are not lost. Listen at Compline. They have never sounded so beautiful.',
    'Kneel. Everyone kneels at Vespers.',
    'You sing out of tune. I can hear it from here. It hurts.',
  ],
  defeatLine: 'THE EVENING HYMN ENDS',
  resumeLine: 'You again, at the wrong Hour. Very well. From the first verse.',

  phases: [
    {
      name: 'Litany',
      line: 'A decade of the Score, then. Count with me. One.',
      hp: 610,
      cycle: [
        'sig:litany', 'volley', 'sig:censer', 'sig:decade', 'radial',
        'sig:litany', 'homing', 'sig:censer', 'sig:decade',
      ],
      harass: ['h-orbs', 'h-snipe'],
      restMs: 1150,
      harassMs: 3000,
    },
    {
      name: 'Stained Glass',
      line: 'Then look down. You are standing on the window. You have always been standing on it.',
      hp: 710,
      cycle: [
        'sig:panes', 'sig:lancets', 'lanes', 'sig:roundel', 'sig:panes',
        'barrage', 'sig:lancets', 'sig:litany', 'sig:roundel',
      ],
      harass: ['h-rune', 'h-lane'],
      restMs: 1050,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'SHE RISES AT THE MAGNIFICAT',
    extraPhase: {
      name: 'Rapture',
      line: 'Magnificat. My soul doth — no. HIS soul. His. I rise on his breath, not mine.',
      hp: 530,
      cycle: [
        'sig:rapture', 'sig:nimbus', 'spiral', 'sig:litany',
        'sig:rapture', 'sig:nimbus', 'sig:lancets', 'sweep',
      ],
      harass: ['h-orbs', 'h-mines'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 230, spreadRad: 0.45 },
    radial: { count: 16, speed: 190 },
    homing: { count: 3, speed: 170 },
    spiral: { arms: 4, speed: 175 },
    lanes: { count: 3, halfW: 30 },
  },

  signatures: {
    litany,
    decade,
    censer,
    panes,
    lancets,
    roundel,
    rapture,
    nimbus,
  },

  look: {
    crest: 'halo', pattern: 'weave', aura: 'smoke', hands: 'orb',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: EVENGOLD,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'gold', look: { pattern: 'grid', aura: 'sparks' } },
    { movement: 'hover', gimmick: 'none', tint: 'pale', look: { crest: 'halo', aura: 'none', hands: 'wisp', mouth: 'grin' } },
  ],

  /**
   * The Evening Voice's tells. A tall white chorister's ruff, pleated, round her throat; a cope of
   * twilight violet with gilt orphreys falling to a hem below the body; a hymnal open in one hand
   * and a rosary hanging from the other; her empty collar where her tuning-reed was, a bare gilt
   * pin. In the Stained Glass the cope turns to leaded glass panes that brighten as she is hurt;
   * in the Rapture rays of light fan out behind her and the cope hangs empty, the ruff ablaze.
   */
  drawDecor(g, s) {
    vesperPhase = s.phaseIdx;
    const R = s.radius;
    const glassPhase = s.phaseIdx === 1;
    const rapturePhase = s.hard && s.phaseIdx >= 2;
    // The cope: a wide bell of cloth below the body, edged in gilt.
    const hemY = s.y + R * 1.55;
    const cope = rapturePhase ? lit(VESPER, 0.35) : VESPER_DARK;
    g.fillStyle(dim(cope, 0.25), 1); g.fillTriangle(s.x - R * 1.25, hemY, s.x + R * 1.25, hemY, s.x, s.y - R * 0.2);
    g.fillStyle(cope, 1); g.fillTriangle(s.x - R * 1.15, hemY - 2, s.x + R * 0.9, hemY - 2, s.x - R * 0.05, s.y - R * 0.1);
    if (glassPhase) {
      // Leaded panes across the cope, lighting up as she is hurt.
      const lit1 = 1 - s.hpRatio;
      for (let i = 0; i < 7; i++) {
        const k = (i - 3) / 3;
        const px = s.x + k * R * 0.85, py = hemY - R * 0.4 - Math.abs(k) * R * 0.1;
        g.fillStyle(LEAD, 1); g.fillRect(px - R * 0.15, py - R * 0.32, R * 0.3, R * 0.5);
        g.fillStyle(PANE_COLORS[i % 4], 0.5 + lit1 * 0.5); g.fillRect(px - R * 0.12, py - R * 0.29, R * 0.24, R * 0.44);
      }
    }
    g.lineStyle(3, GILT, 1); g.lineBetween(s.x - R * 1.25, hemY, s.x + R * 1.25, hemY);
    for (const k of [-1, 1]) { g.lineStyle(4, GILT, 1); g.lineBetween(s.x + k * R * 0.35, s.y + R * 0.4, s.x + k * R * 0.6, hemY); }
    // The ruff: a pleated white collar of many folds.
    const ry = s.y + R * 0.72;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.fillStyle(i % 2 ? SURPLICE : dim(SURPLICE, 0.12), 1);
      g.fillEllipse(s.x + Math.cos(a) * R * 0.62, ry + Math.sin(a) * R * 0.2, R * 0.34, R * 0.22);
    }
    if (rapturePhase) glow(g, s.x, ry, R * 1.1, EVENGOLD, 0.08, 3);
    // The bare gilt pin where her Part was taken.
    g.fillStyle(GILT_DARK, 1); g.fillCircle(s.x, ry + R * 0.16, 3);
    g.fillStyle(GILT_LIT, 1); g.fillCircle(s.x - 0.8, ry + R * 0.14, 1.4);
    // Hymnal in the first hand, open, its ribbon hanging.
    const h0 = s.hands[0];
    if (h0) {
      g.fillStyle(0x3a1a2a, 1); g.fillRect(h0.x - 13, h0.y - 22, 26, 16);
      g.fillStyle(SURPLICE, 1); g.fillRect(h0.x - 11, h0.y - 21, 10, 13); g.fillRect(h0.x + 1, h0.y - 21, 10, 13);
      for (let l = 0; l < 4; l++) { g.lineStyle(0.8, 0x6a6a7a, 1); g.lineBetween(h0.x - 9, h0.y - 18 + l * 3, h0.x - 3, h0.y - 18 + l * 3); g.lineBetween(h0.x + 3, h0.y - 18 + l * 3, h0.x + 9, h0.y - 18 + l * 3); }
      g.lineStyle(1.5, GLASS_RED, 1); g.lineBetween(h0.x, h0.y - 8, h0.x + 2, h0.y + 4);
    }
    // A rosary from the second hand (gone in the Rapture: she wears the beads as a crown of light).
    const h1 = s.hands[1];
    if (h1 && !rapturePhase) {
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * 0.15 + (i / 8) * Math.PI * 0.7;
        const bx = h1.x + Math.cos(a) * 10, by = h1.y + Math.sin(a) * 20 + 4;
        g.fillStyle(VESPER_LIT, 1); g.fillCircle(bx, by, 2.4);
      }
      tuningFork(g, h1.x, h1.y + 34, 12, GILT, 1);
    }
    // Over all: the halo. Thin and gilt; blazing and many-rayed in the Rapture.
    const hy = s.y - R * 1.25;
    if (rapturePhase) {
      for (let i = 0; i < 14; i++) {
        const a = -Math.PI + (i / 13) * Math.PI;
        g.lineStyle(2, i % 2 ? EVENGOLD : 0xffffff, 0.5 + Math.sin(s.t / 200 + i) * 0.2);
        g.lineBetween(s.x + Math.cos(a) * R * 0.7, hy + Math.sin(a) * R * 0.25, s.x + Math.cos(a) * R * 1.6, hy + Math.sin(a) * R * 0.9);
      }
    }
    g.lineStyle(4, GILT_DARK, 1); g.strokeEllipse(s.x, hy, R * 1.3, R * 0.38);
    g.lineStyle(2.5, rapturePhase ? 0xffffff : GILT_LIT, 1); g.strokeEllipse(s.x, hy - 1, R * 1.3, R * 0.38);
    // An open singing mouth when she casts.
    if (s.castGlow > 0.3) { g.fillStyle(0x1a0a20, 0.8); g.fillEllipse(s.x, s.y + R * 0.18, R * 0.16, R * 0.12 + s.castGlow * R * 0.12); }
    if (s.enraged) { g.lineStyle(1.5, EVENGOLD, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The chancel: a floor of black and pale marble in a star radiating from the altar step at the
   * top, choir stalls in carved oak down both sides, a rank of silver pipes and a little rose
   * above the altar under the HUD, seven-branched candelabra at the corners, and evening light
   * through the rose laid across the marble in long coloured lozenges.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xa57e2);
    // Marble: pale base, dark rays from the altar.
    g.fillStyle(0xe4dfd4, 1); g.fillRect(0, 0, W, H);
    const ax = W / 2, ay = 110;
    for (let i = 0; i < 24; i++) {
      if (i % 2) continue;
      const a0 = (i / 24) * Math.PI, a1 = ((i + 1) / 24) * Math.PI;
      g.fillStyle(0x2a2830, 0.85); g.slice(ax, ay, 900, a0, a1, false); g.fillPath();
    }
    for (let r = 120; r < 900; r += 110) { g.lineStyle(3, GILT, 0.35); g.beginPath(); g.arc(ax, ay, r, 0, Math.PI, false); g.strokePath(); }
    // Veins in the pale marble.
    for (let i = 0; i < 40; i++) {
      const x = rng() * W, y = 110 + rng() * (H - 110);
      g.lineStyle(1, 0xb8b2a6, 0.4); g.lineBetween(x, y, x + (rng() - 0.5) * 60, y + rng() * 30);
    }
    // Choir stalls down both sides, seen end-on as long oak benches.
    for (const x0 of [0, W - 46]) {
      g.fillStyle(0x3a2618, 1); g.fillRect(x0, 110, 46, H - 110);
      g.fillStyle(0x5a3c28, 1); g.fillRect(x0 + 4, 110, 38, H - 110);
      for (let y = 130; y < H; y += 44) { g.fillStyle(0x7e5a3c, 1); g.fillRect(x0 + 2, y, 42, 4); g.fillStyle(SURPLICE, 0.8); g.fillRect(x0 + 12, y + 10, 22, 4); }
    }
    // The east end under the HUD: reredos, a small rose, a rank of pipes, the altar.
    g.fillStyle(ASHLAR_DARK, 1); g.fillRect(0, 0, W, 104);
    g.fillStyle(ASHLAR, 1); g.fillRect(0, 0, W, 98);
    for (let i = 0; i < 9; i++) organPipe(g, 90 + i * 22, 96, 14, 60 + (i % 2) * 14, 0.5);
    for (let i = 0; i < 9; i++) organPipe(g, W - 90 - i * 22, 96, 14, 60 + (i % 2) * 14, 0.5);
    roseWindow(g, ax, 44, 38, 0.1, 1);
    choirStalls(g, 300, 96, 4, 22);
    choirStalls(g, W - 300 - 88, 96, 4, 22);
    g.fillStyle(GILT_DARK, 1); g.fillRect(ax - 90, 92, 180, 18);
    g.fillStyle(GILT, 1); g.fillRect(ax - 88, 92, 176, 6);
    g.fillStyle(SURPLICE, 1); g.fillRect(ax - 84, 98, 168, 6);
    // The altar rail.
    g.fillStyle(0x5a3c28, 1); g.fillRect(60, 120, W - 120, 6);
    for (let x = 70; x < W - 60; x += 24) { g.fillStyle(GILT, 0.8); g.fillRect(x, 112, 3, 10); }
    // Candelabra at the four corners of the chancel.
    for (const [x, y] of [[90, 210], [W - 90, 210], [90, H - 40], [W - 90, H - 40]] as [number, number][]) candelabrum(g, x, y, 0.9, x * 0.01);
    // Evening light through the rose, lying across the marble in long lozenges.
    for (let i = 0; i < 7; i++) {
      const c = [GLASS_RED, GLASS_BLUE, GLASS_GOLD, GLASS_GREEN, GLASS_BLUE, GLASS_RED, GLASS_GOLD][i];
      g.fillStyle(c, 0.09);
      g.fillTriangle(ax - 30 + i * 8, 120, ax - 160 + i * 52, H, ax - 110 + i * 52, H);
    }
    for (let i = 0; i < 5; i++) { g.lineStyle(40, CANDLELIGHT, 0.03); g.strokeRect(i * 16, 110 + i * 16, W - i * 32, H - 110 - i * 32); }
  },
};
