import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { palette } from '../art';
import { CADMIUM, CADMIUM_LIT, GOLD, GOLD_DARK, GOLD_LIT, ULTRAMARINE, ULTRA_LIT, VERMILION, VERMILION_LIT } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Colour Wheel — Pigmentist Prism.
 *
 * The floor is a great painted colour wheel, six wedges of red, yellow and blue round a palette
 * hub, slowly turning. Whatever colour you stand on when you cast loads your brush: for a couple
 * of seconds every hit you land carries it — **red** sets the struck fighter burning, **blue**
 * slows them, **yellow** quickens *your* step. Prism loads his brush the same way.
 *
 * Prism is a plasma man: every few seconds the wheel's six gilt spokes gather white light and
 * arc — anyone standing on a spoke is struck. The spokes turn with the wheel, so the safe ground
 * is the middle of a wedge, which is also where the colour is strongest. A clever player stands
 * on blue when Prism chases and on red when he stands to cast, and lets the spokes drive him off
 * the wedges he wants.
 */

type Hue = 'red' | 'yellow' | 'blue';
const HUES: Hue[] = ['red', 'yellow', 'blue'];
const COLOR: Record<Hue, number> = { red: VERMILION, yellow: CADMIUM, blue: ULTRAMARINE };
const LITC: Record<Hue, number> = { red: VERMILION_LIT, yellow: CADMIUM_LIT, blue: ULTRA_LIT };
const CSS: Record<Hue, string> = { red: '#ff7a5a', yellow: '#fff07a', blue: '#8aa8ff' };

const HUB_R = 46;
const LOAD_MS = 2600;
const BURN_TICK = 500;
const SPOKE_HALF = 20;

interface Side {
  f: Fighter;
  load: Hue | null;
  loadUntil: number;
  /** Burning: ticks left and when the next lands. */
  burnTicks: number;
  burnNext: number;
  slowUntil: number;
  quickUntil: number;
  /** Last time this side's trait was applied by a hit (one trait per beat). */
  procAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const C: Pt = { x: W / 2, y: (top + H) / 2 + 4 };
  const R = Math.min(W / 2 - 60, (H - top) / 2 - 18);
  let rot = rng() * Math.PI * 2;
  const spin = ctx.hard ? 0.34 : 0.27;
  const sides = new Map<Fighter, Side>();
  for (const f of [player, npc]) sides.set(f, { f, load: null, loadUntil: 0, burnTicks: 0, burnNext: 0, slowUntil: 0, quickUntil: 0, procAt: 0 });
  const P = () => sides.get(player) as Side;
  const N = () => sides.get(npc) as Side;
  /** Our own damage, so hurt hooks can ignore it. */
  let internal = false;
  const kitHit = (f: Fighter, n: number) => { internal = true; ctx.hit(f, n, f.x, f.y); internal = false; };

  const SPOKE_EVERY = ctx.hard ? 6800 : 8400;
  const SPOKE_WARN = 1150;
  let nextSpoke = 0;
  let spokeWarnAt = -1;
  let spokeFireAt = -1;
  let started = false;

  /** Which wedge (0..5) an angle falls in, given the current turn. */
  const wedgeOf = (a: number) => Math.floor((((a - rot) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 3)) % 6;
  const hueAt = (x: number, y: number): Hue | null => {
    const d = dist(C.x, C.y, x, y);
    if (d < HUB_R || d > R) return null;
    return HUES[wedgeOf(Math.atan2(y - C.y, x - C.x)) % 3];
  };
  const spokeAngles = () => [0, 1, 2, 3, 4, 5].map((i) => rot + (i * Math.PI) / 3);
  const onSpoke = (f: Fighter) => {
    const d = dist(C.x, C.y, f.x, f.y);
    if (d < HUB_R - 10 || d > R + 10) return false;
    return spokeAngles().some((a) => segDist(f.x, f.y, C.x + Math.cos(a) * HUB_R, C.y + Math.sin(a) * HUB_R, C.x + Math.cos(a) * R, C.y + Math.sin(a) * R) < SPOKE_HALF);
  };

  function loadBrush(s: Side, time: number): void {
    const h = hueAt(s.f.x, s.f.y);
    if (!h) return;
    const fresh = s.load !== h || time > s.loadUntil;
    s.load = h; s.loadUntil = time + LOAD_MS;
    if (fresh) ctx.float(s.f.x, s.f.y - 48, h.toUpperCase(), CSS[h]);
  }

  /** `by` landed a blow on `on`: if by's brush is loaded, the colour goes in. */
  function proc(by: Side, on: Side, time: number): void {
    if (!by.load || time > by.loadUntil || time - by.procAt < 420) return;
    by.procAt = time;
    switch (by.load) {
      case 'red':
        on.burnTicks = ctx.hard ? 4 : 3; on.burnNext = time + BURN_TICK;
        ctx.sfx('status-burn');
        break;
      case 'blue':
        on.slowUntil = time + 1700;
        if (on.f === player) ctx.tk.slowPlayer(0.6, 1700);
        ctx.sfx('status-slow');
        break;
      case 'yellow':
        by.quickUntil = time + 2200;
        ctx.sfx('status-buff');
        break;
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextSpoke = time + 4200; }
      rot += spin * dt;
      // The spokes gather light, then arc.
      if (spokeWarnAt < 0 && time >= nextSpoke - SPOKE_WARN) { spokeWarnAt = time; ctx.sfx('electric-charge'); ctx.banner('THE SPOKES GATHER', '#fff0a0'); }
      if (spokeWarnAt >= 0 && time >= nextSpoke) {
        spokeWarnAt = -1;
        spokeFireAt = time;
        nextSpoke = time + SPOKE_EVERY;
        ctx.sfx('plasma-arc');
        for (const s of sides.values()) {
          if (!alive(s.f) || !onSpoke(s.f)) continue;
          kitHit(s.f, ctx.hard ? 15 : 12);
          ctx.flash(s.f.x, s.f.y, 0xffffff);
        }
      }
      // Burns tick down.
      for (const s of sides.values()) {
        if (s.burnTicks > 0 && time >= s.burnNext && alive(s.f)) {
          s.burnTicks--; s.burnNext = time + BURN_TICK;
          kitHit(s.f, 3);
        }
        if (time > s.loadUntil) s.load = null;
      }
    },

    onPlayerCast() { loadBrush(P(), ctx.scene.time.now); },
    onNpcCast() { loadBrush(N(), ctx.scene.time.now); },
    onNpcHurt() { if (!internal) proc(P(), N(), ctx.scene.time.now); },
    onPlayerHurt() { if (!internal) proc(N(), P(), ctx.scene.time.now); },

    playerSpeedMult() {
      const now = ctx.scene.time.now, s = P();
      return now < s.quickUntil ? 1.35 : 1;
    },
    npcSpeedMult() {
      const now = ctx.scene.time.now, s = N();
      return (now < s.slowUntil ? 0.6 : 1) * (now < s.quickUntil ? 1.35 : 1);
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const now = ctx.scene.time.now;
      // Prism wants blue when you are on top of him, red otherwise; yellow when he's slowed.
      const want: Hue = now < N().slowUntil ? 'yellow' : dist(npc.x, npc.y, player.x, player.y) < 200 ? 'blue' : 'red';
      const ahead = rot + spin * 0.6;
      let best: Pt | null = null, bd = Infinity;
      for (let i = 0; i < 6; i++) {
        if (HUES[i % 3] !== want) continue;
        const a = ahead + (i + 0.5) * (Math.PI / 3);
        const r = spokeWarnAt >= 0 ? R * 0.62 : R * 0.55;
        const p = { x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r };
        const d = dist(p.x, p.y, player.x, player.y) + dist(p.x, p.y, npc.x, npc.y) * 0.5;
        if (d < bd) { bd = d; best = p; }
      }
      return best ? { x: clamp(best.x, 60, W - 60), y: clamp(best.y, top + 50, H - 40) } : null;
    },

    drawGround(g, time) {
      // Raw canvas round the wheel, primed and stretched.
      g.fillStyle(0xf2ead8, 0.25); g.fillCircle(C.x, C.y, R + 26);
      // The wedges: thick oil colour, brushed radially.
      for (let i = 0; i < 6; i++) {
        const a0 = rot + (i * Math.PI) / 3, a1 = a0 + Math.PI / 3;
        const hue = HUES[i % 3];
        const c = COLOR[hue];
        g.fillStyle(c, 0.62);
        g.slice(C.x, C.y, R, a0, a1, false); g.fillPath();
        // Brush strokes: radial ribbons, lighter and darker.
        for (let k = 0; k < 7; k++) {
          const a = a0 + ((k + 0.5) / 7) * (Math.PI / 3);
          g.lineStyle(k % 2 ? 5 : 3, k % 2 ? lit(c, 0.25) : dim(c, 0.2), 0.35);
          g.lineBetween(C.x + Math.cos(a) * (HUB_R + 10), C.y + Math.sin(a) * (HUB_R + 10), C.x + Math.cos(a) * (R - 10), C.y + Math.sin(a) * (R - 10));
        }
        // An outer band of the pure colour, glossy.
        g.lineStyle(10, lit(c, 0.1), 0.7);
        g.beginPath(); g.arc(C.x, C.y, R - 6, a0 + 0.02, a1 - 0.02, false); g.strokePath();
      }
      // The spokes: gilt rods — gathering white light before they arc.
      const warn = spokeWarnAt >= 0 ? clamp((time - spokeWarnAt) / SPOKE_WARN, 0, 1) : 0;
      const firing = spokeFireAt >= 0 && time - spokeFireAt < 320;
      for (const a of spokeAngles()) {
        const x0 = C.x + Math.cos(a) * HUB_R, y0 = C.y + Math.sin(a) * HUB_R;
        const x1 = C.x + Math.cos(a) * R, y1 = C.y + Math.sin(a) * R;
        if (warn > 0) { g.lineStyle(SPOKE_HALF * 2, 0xffffff, 0.08 + warn * 0.22); g.lineBetween(x0, y0, x1, y1); }
        g.lineStyle(6, GOLD_DARK, 1); g.lineBetween(x0, y0, x1, y1);
        g.lineStyle(3, warn > 0 ? lit(GOLD_LIT, warn) : GOLD, 1); g.lineBetween(x0, y0, x1, y1);
        if (warn > 0.3 || firing) {
          // Crackle: a jagged arc running the length of the spoke.
          const n = 9;
          let px = x0, py = y0;
          const nx = -Math.sin(a), ny = Math.cos(a);
          for (let k = 1; k <= n; k++) {
            const t = k / n;
            const j = (Math.sin(time / 31 + k * 2.1 + a * 5) * (firing ? 14 : 7 * warn));
            const qx = x0 + (x1 - x0) * t + nx * j, qy = y0 + (y1 - y0) * t + ny * j;
            g.lineStyle(firing ? 4 : 2, firing ? 0xffffff : 0xe8f4ff, firing ? 1 : 0.4 + warn * 0.5); g.lineBetween(px, py, qx, qy);
            px = qx; py = qy;
          }
        }
      }
      // The rim: a gilt ring with tick marks, an arrow showing which way the wheel turns.
      g.lineStyle(8, GOLD_DARK, 1); g.strokeCircle(C.x, C.y, R + 2);
      g.lineStyle(4, GOLD, 1); g.strokeCircle(C.x, C.y, R + 2);
      for (let k = 0; k < 36; k++) {
        const a = rot + (k / 36) * Math.PI * 2;
        g.lineStyle(k % 6 === 0 ? 3 : 1.5, GOLD_DARK, 1);
        g.lineBetween(C.x + Math.cos(a) * (R + 6), C.y + Math.sin(a) * (R + 6), C.x + Math.cos(a) * (R + (k % 6 === 0 ? 18 : 12)), C.y + Math.sin(a) * (R + (k % 6 === 0 ? 18 : 12)));
      }
      for (let k = 0; k < 3; k++) {
        const a = rot * 1 + (k * Math.PI * 2) / 3 + Math.PI / 6;
        const ax = C.x + Math.cos(a) * (R + 14), ay = C.y + Math.sin(a) * (R + 14);
        const tx = -Math.sin(a), ty = Math.cos(a);
        g.fillStyle(GOLD_LIT, 0.9);
        g.fillTriangle(ax + tx * 10, ay + ty * 10, ax - tx * 2 + Math.cos(a) * 5, ay - ty * 2 + Math.sin(a) * 5, ax - tx * 2 - Math.cos(a) * 5, ay - ty * 2 - Math.sin(a) * 5);
      }
      // The hub: Prism's great palette, turning with the wheel.
      g.fillStyle(0xf2ead8, 1); g.fillCircle(C.x, C.y, HUB_R);
      palette(g, C.x, C.y, 1.9, rot);
      if (warn > 0 || firing) glow(g, C.x, C.y, HUB_R + 10, 0xffffff, 0.06 + warn * 0.08, 3);
      // Loaded brushes leave a stain of their colour underfoot.
      for (const s of sides.values()) {
        if (!s.load || !alive(s.f)) continue;
        g.fillStyle(COLOR[s.load], 0.25); g.fillEllipse(s.f.x, s.f.y + 18, 44, 12);
      }
    },

    drawAir(g, time) {
      for (const s of sides.values()) {
        if (!alive(s.f)) continue;
        const f = s.f;
        // A loaded brush: a ring of the colour and a bristle tip bobbing at the shoulder.
        if (s.load && time < s.loadUntil) {
          const k = (s.loadUntil - time) / LOAD_MS;
          const c = COLOR[s.load];
          g.lineStyle(3, c, 0.35 + k * 0.5); g.strokeCircle(f.x, f.y, 26);
          g.lineStyle(1, LITC[s.load], 0.6); g.strokeCircle(f.x, f.y, 29);
          const bx = f.x + 20, by = f.y - 30 + Math.sin(time / 160) * 2;
          g.lineStyle(3, 0x6a4a2a, 1); g.lineBetween(bx - 6, by + 10, bx, by);
          g.fillStyle(GOLD, 1); g.fillRect(bx - 2, by - 3, 4, 4);
          g.fillStyle(c, 1); g.fillTriangle(bx - 3, by - 3, bx + 3, by - 3, bx + 1, by - 11);
        }
        // Burning: little vermilion licks.
        if (s.burnTicks > 0) {
          for (let i = 0; i < 5; i++) {
            const ph = (time / 300 + i / 5) % 1;
            const x = f.x - 14 + i * 7, y = f.y - 6 - ph * 30;
            g.fillStyle(i % 2 ? VERMILION : VERMILION_LIT, 1 - ph);
            g.fillTriangle(x - 3, y + 4, x + 3, y + 4, x, y - 6);
          }
        }
        // Slowed: ultramarine dripping off them.
        if (time < s.slowUntil) {
          for (let i = 0; i < 4; i++) {
            const ph = (time / 500 + i / 4) % 1;
            g.fillStyle(ULTRAMARINE, 0.9 - ph * 0.6); g.fillEllipse(f.x - 12 + i * 8, f.y - 10 + ph * 26, 4, 7);
          }
          g.fillStyle(ULTRAMARINE, 0.3); g.fillEllipse(f.x, f.y + 18, 40, 10);
        }
        // Quickened: cadmium streaks behind.
        if (time < s.quickUntil) {
          for (let i = 0; i < 4; i++) {
            const y = f.y - 14 + i * 9;
            g.lineStyle(2, CADMIUM_LIT, 0.4 + 0.3 * Math.sin(time / 60 + i)); g.lineBetween(f.x - 24 - i * 3, y, f.x - 40 - i * 5, y);
          }
        }
      }
    },

    drawHud(g) {
      // Each side's brush: a swatch pip under their bar, filled while loaded.
      const now = ctx.scene.time.now;
      for (const [s, x] of [[P(), 26], [N(), W - 26]] as [Side, number][]) {
        const y = top + 16;
        g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 11);
        g.lineStyle(2, GOLD, 1); g.strokeCircle(x, y, 11);
        if (s.load && now < s.loadUntil) {
          g.fillStyle(COLOR[s.load], 1);
          g.slice(x, y, 9, -Math.PI / 2, -Math.PI / 2 + ((s.loadUntil - now) / LOAD_MS) * Math.PI * 2, false); g.fillPath();
        }
      }
      // The spoke clock: a thin gilt bar filling toward the next arc.
      if (nextSpoke > 0) {
        const k = clamp(1 - (nextSpoke - now) / SPOKE_EVERY, 0, 1);
        g.fillStyle(0x000000, 0.4); g.fillRect(W / 2 - 80, top + 8, 160, 5);
        g.fillStyle(spokeWarnAt >= 0 ? 0xffffff : GOLD, 0.95); g.fillRect(W / 2 - 80, top + 8, 160 * k, 5);
      }
    },
  };
}

export const COLOUR_WHEEL: GimmickDef = {
  id: 'mural-colour-wheel',
  rules: 'Cast on a colour to load your brush: RED hits burn, BLUE hits slow, YELLOW quickens you. The gilt spokes arc every few seconds.',
  make,
};
