import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { Pt, StrikeTarget } from '../../../../IslesTypes';
import { dim, glow, lit, mulberry, type G } from '../../../../art/IsleArt';
import { auriel, brush, palette, splat } from './art';
import {
  CADMIUM, CADMIUM_LIT, CANVAS, CANVAS_DARK, GOLD, GOLD_DARK, GOLD_LIT, GLASS, HUE, HUE_DARK, HUE_LIT, MADDER,
  PIGMENTS, STONE, STONE_DARK, STONE_LIT, TIMBER, TIMBER_DARK, ULTRAMARINE, ULTRA_LIT, VEIN, VERMILION, VERMILION_LIT,
  VIOLET, VIRIDIAN,
} from './palette';
import { bezier, clamp, dist, polyDist } from './util';

/**
 * Prince Hue, the Painter Royal — the Despot's Radiance over the Mural Court.
 *
 * As a boy Hue drew with a box of chalks on the flags of Atelier Row, and what he loved best to
 * draw was shadows — under benches, under cats, under Ombretta Vell's little girl. Auriel saw a
 * talent and took it to the Gallery, and there taught it the Canon of Light: paint only what the
 * noon shows. He has painted nothing else for twenty years. He fights the way he paints:
 *
 * • **Brushwork** (orbiting his canvas): great strokes laid across the floor — pencilled first,
 *   then the loaded brush runs along them: red strokes keep burning, blue strokes drag, yellow
 *   strokes crackle a moment after they are laid; and a flick of the wrist spatters drops of
 *   colour that come down where their landing-marks show.
 * • **Masterpiece** (rooted at the easel, gilt tint): he paints creatures and they step out of
 *   the canvas — painted wolves that lunge along a scratched line (strike them to smear them) and
 *   a flock of painted swallows that sweeps across on a wave.
 * • **Turpentine** (hard, blinking, pale): the solvent goes on and the floor itself runs — bands
 *   of colour drip from the top and melt away down the arena, one, two, three at a time.
 */

const TOP = 96;

type Hue3 = 'red' | 'blue' | 'yellow';
const HUE_COL: Record<Hue3, number> = { red: VERMILION, blue: ULTRAMARINE, yellow: CADMIUM };
const HUE_LITC: Record<Hue3, number> = { red: VERMILION_LIT, blue: ULTRA_LIT, yellow: CADMIUM_LIT };

/** The colour on Hue's brush right now, for the decor (set by the moves). */
let brushColor = VERMILION;

// ── Signature: Brushwork ──────────────────────────────────────────────
// Three great strokes, one after another, each curving across the floor near you. Pencilled
// first; then the brush runs along it (its head strikes); then the paint lies wet: red burns,
// blue drags, yellow crackles once.

interface Stroke {
  pts: Pt[]; hue: Hue3; half: number;
  warnAt: number; paintAt: number; paintMs: number; wetUntil: number;
  headHit: boolean; crackleAt: number; crackled: boolean;
}

const brushwork = (tk: BossToolkit): SignatureMove => {
  let strokes: Stroke[] = [];
  let tickAt = 0;
  const HALF = 30;
  const cross = (s: Stroke, x: number, y: number) => polyDist(x, y, s.pts) < s.half;
  return {
    durationMs: 2900,
    windupMs: 600,
    gesture: 'sweep',
    tell: 'BRUSHWORK',
    cast(time) {
      const p = tk.player;
      const hues: Hue3[] = (['red', 'blue', 'yellow'] as Hue3[]).sort(() => Math.random() - 0.5);
      strokes = hues.map((hue, i) => {
        const horiz = Math.random() < 0.5;
        const off = (i - 1) * 110 + (Math.random() - 0.5) * 40;
        const a: Pt = horiz ? { x: 30, y: clamp(p.y + off + 120 * (Math.random() - 0.5), TOP + 30, tk.H - 30) } : { x: clamp(p.x + off + 120 * (Math.random() - 0.5), 30, tk.W - 30), y: TOP + 20 };
        const b: Pt = horiz ? { x: tk.W - 30, y: clamp(p.y + off + 120 * (Math.random() - 0.5), TOP + 30, tk.H - 30) } : { x: clamp(p.x + off + 120 * (Math.random() - 0.5), 30, tk.W - 30), y: tk.H - 20 };
        const c: Pt = horiz ? { x: tk.W / 2, y: clamp(p.y + off, TOP + 30, tk.H - 30) } : { x: clamp(p.x + off, 30, tk.W - 30), y: (TOP + tk.H) / 2 };
        const paintAt = time + tk.warn(1050) + i * 520;
        return {
          pts: bezier(a, c, b, 22), hue, half: HALF, warnAt: time, paintAt, paintMs: 420,
          wetUntil: paintAt + 420 + (tk.phase >= 2 ? 1600 : 3000), headHit: false, crackleAt: paintAt + 420 + 650, crackled: false,
        };
      });
      brushColor = HUE_COL[strokes[0].hue];
      tk.sfx('whoosh');
    },
    update(time) {
      const p = tk.player;
      const live = p.active && p.hp > 0;
      for (const s of strokes) {
        if (time < s.paintAt) continue;
        // The brush head travelling along the stroke.
        const k = clamp((time - s.paintAt) / s.paintMs, 0, 1);
        if (k < 1 && !s.headHit && live) {
          const head = s.pts[Math.min(s.pts.length - 1, Math.floor(k * (s.pts.length - 1)))];
          if (dist(head.x, head.y, p.x, p.y) < s.half + 20) { s.headHit = true; tk.hitPlayer(12, p.x, p.y); }
        }
        if (k > 0 && k < 0.1) brushColor = HUE_COL[s.hue];
        if (k < 1 || time > s.wetUntil || !live) continue;
        // The wet paint.
        if (s.hue === 'yellow' && !s.crackled && time >= s.crackleAt) {
          s.crackled = true;
          tk.sfx('zap');
          if (cross(s, p.x, p.y)) tk.hitPlayer(11, p.x, p.y);
        }
        if (s.hue === 'blue' && cross(s, p.x, p.y)) tk.slowPlayer(0.55, 350);
        if (s.hue === 'red' && cross(s, p.x, p.y) && time - tickAt > 500) { tickAt = time; tk.hitPlayer(4, p.x, p.y); }
      }
      strokes = strokes.filter((s) => time < s.wetUntil + 400);
    },
    drawGround(g, time) {
      for (const s of strokes) {
        const c = HUE_COL[s.hue];
        if (time < s.paintAt) {
          // Pencilled: a soft graphite double line marking the stroke's width, hatching inside.
          const k = clamp((time - s.warnAt) / Math.max(1, s.paintAt - s.warnAt), 0, 1);
          g.lineStyle(s.half * 2, c, 0.08 + k * 0.14);
          g.strokePoints(s.pts, false);
          g.lineStyle(1.5, 0x5a5a64, 0.4 + k * 0.4);
          for (let i = 1; i < s.pts.length; i++) {
            const a = s.pts[i - 1], b = s.pts[i];
            const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
            const ox = Math.cos(ang) * s.half, oy = Math.sin(ang) * s.half;
            g.lineBetween(a.x + ox, a.y + oy, b.x + ox, b.y + oy);
            g.lineBetween(a.x - ox, a.y - oy, b.x - ox, b.y - oy);
            if (i % 2) g.lineBetween(a.x + ox * 0.8, a.y + oy * 0.8, a.x - ox * 0.5 + (b.x - a.x) * 0.5, a.y - oy * 0.5 + (b.y - a.y) * 0.5);
          }
          continue;
        }
        // Laid paint: thick body, a lighter ridge, bristle marks; fades as it dries.
        const k = clamp((time - s.paintAt) / s.paintMs, 0, 1);
        const n = Math.max(2, Math.floor(k * s.pts.length));
        const pts = s.pts.slice(0, n);
        const dry = clamp((s.wetUntil - time) / 500, 0, 1);
        g.lineStyle(s.half * 2, dim(c, 0.15), 0.75 * dry); g.strokePoints(pts, false);
        g.lineStyle(s.half * 1.5, c, 0.85 * dry); g.strokePoints(pts, false);
        g.lineStyle(s.half * 0.4, lit(c, 0.35), 0.6 * dry); g.strokePoints(pts.map((p) => ({ x: p.x - 4, y: p.y - 5 })), false);
        for (let i = 1; i < pts.length; i += 2) {
          const a = pts[i - 1], b = pts[i];
          const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
          for (const o of [-0.7, -0.2, 0.4, 0.8]) {
            g.lineStyle(1, dim(c, 0.3), 0.5 * dry);
            g.lineBetween(a.x + Math.cos(ang) * s.half * o, a.y + Math.sin(ang) * s.half * o, b.x + Math.cos(ang) * s.half * o, b.y + Math.sin(ang) * s.half * o);
          }
        }
        if (s.hue === 'red' && k >= 1) {
          for (let i = 0; i < s.pts.length; i += 3) {
            const p = s.pts[i]; const ph = (time / 260 + i * 0.37) % 1;
            g.fillStyle(VERMILION_LIT, (1 - ph) * dry); g.fillTriangle(p.x - 4, p.y, p.x + 4, p.y, p.x, p.y - 10 - ph * 14);
          }
        }
        if (s.hue === 'yellow' && k >= 1 && !s.crackled) {
          const w = clamp(1 - (s.crackleAt - time) / 650, 0, 1);
          g.lineStyle(2, 0xffffff, 0.3 + w * 0.6);
          for (let i = 1; i < s.pts.length; i++) {
            const a = s.pts[i - 1], b = s.pts[i];
            const j = Math.sin(time / 25 + i * 3) * 10 * w;
            g.lineBetween(a.x, a.y + j, b.x, b.y - j);
          }
        }
      }
    },
    drawAir(g, time) {
      // The brush itself, riding the head of each stroke as it is laid.
      for (const s of strokes) {
        if (time < s.paintAt || time > s.paintAt + s.paintMs) continue;
        const k = clamp((time - s.paintAt) / s.paintMs, 0, 1);
        const i = Math.min(s.pts.length - 2, Math.floor(k * (s.pts.length - 1)));
        const a = s.pts[i], b = s.pts[i + 1];
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        brush(g, a.x - Math.cos(ang) * 70, a.y - Math.sin(ang) * 70 - 20, ang + 0.3, 60, HUE_COL[s.hue], 7);
        for (let d = 0; d < 6; d++) { g.fillStyle(HUE_LITC[s.hue], 0.8); g.fillCircle(a.x + (Math.random() - 0.5) * 40, a.y + (Math.random() - 0.5) * 30, 2); }
      }
    },
    onPhaseEnd() { strokes = []; },
  };
};

// ── Signature: Spatter ────────────────────────────────────────────────
// A flick of the wrist: drops of colour arc from his brush to landing-marks round you, each
// mark swelling until its drop comes down in a splat.

interface Drop { x: number; y: number; fromX: number; fromY: number; launch: number; land: number; c: number; landed: boolean; r: number }

const spatter = (tk: BossToolkit): SignatureMove => {
  let drops: Drop[] = [];
  let stains: { x: number; y: number; r: number; c: number; until: number; seed: number }[] = [];
  return {
    durationMs: 1700,
    windupMs: 450,
    gesture: 'point',
    tell: 'SPATTER',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 11 : 9;
      drops = [];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 50 + Math.random() * 130;
        const x = tk.clampX(p.x + Math.cos(a) * r), y = tk.clampY(p.y + Math.sin(a) * r);
        if (drops.some((d) => dist(d.x, d.y, x, y) < 46)) continue;
        const launch = time + i * 70;
        drops.push({ x, y, fromX: tk.bossX, fromY: tk.bossY - 30, launch, land: launch + tk.warn(900), c: PIGMENTS[Math.floor(Math.random() * PIGMENTS.length)], landed: false, r: 32 });
      }
      brushColor = drops[0]?.c ?? VERMILION;
      tk.sfx('slime-splat');
    },
    update(time) {
      const p = tk.player;
      for (const d of drops) {
        if (d.landed || time < d.land) continue;
        d.landed = true;
        tk.sfx('slime-splat');
        if (p.active && p.hp > 0 && dist(d.x, d.y, p.x, p.y) < d.r + 18) tk.hitPlayer(10, p.x, p.y);
        stains.push({ x: d.x, y: d.y, r: d.r, c: d.c, until: time + 2600, seed: Math.random() * 10 });
      }
      drops = drops.filter((d) => !d.landed);
      stains = stains.filter((s) => time < s.until);
    },
    drawGround(g, time) {
      for (const s of stains) {
        const f = clamp((s.until - time) / 800, 0, 1);
        const rng = mulberry(Math.floor(s.seed * 1000));
        splat(g, s.x, s.y, s.r * 0.6, s.c, rng, 0.7 * f);
      }
      for (const d of drops) {
        if (time < d.launch) continue;
        const k = clamp((time - d.launch) / Math.max(1, d.land - d.launch), 0, 1);
        g.fillStyle(d.c, 0.12 + k * 0.25); g.fillEllipse(d.x, d.y, d.r * 2 * (0.4 + k * 0.6), d.r * 1.3 * (0.4 + k * 0.6));
        g.lineStyle(2, d.c, 0.4 + k * 0.5); g.strokeEllipse(d.x, d.y, d.r * 2, d.r * 1.3);
      }
    },
    drawAir(g, time) {
      for (const d of drops) {
        if (time < d.launch) continue;
        const k = clamp((time - d.launch) / Math.max(1, d.land - d.launch), 0, 1);
        const x = d.fromX + (d.x - d.fromX) * k, y = d.fromY + (d.y - d.fromY) * k - Math.sin(k * Math.PI) * 120;
        g.fillStyle(dim(d.c, 0.2), 1); g.fillEllipse(x, y, 10, 13);
        g.fillStyle(d.c, 1); g.fillEllipse(x, y - 1, 8, 11);
        g.fillStyle(0xffffff, 0.6); g.fillCircle(x - 2, y - 3, 1.6);
      }
    },
    onPhaseEnd() { drops = []; stains = []; },
  };
};

// ── Signature: Painted Wolves ─────────────────────────────────────────
// Two easels appear at the edges; their canvases fill with wolves; the wolves step out. Each
// lunges three times along a scratched line toward you. Strike a wolf to smear it away.

interface Wolf {
  x: number; y: number; easel: Pt;
  bornAt: number; out: boolean;
  lunges: number; aimAt: number; aimA: number; lungeAt: number; lungeEnd: number; hit: boolean;
  hp: number; target: StrikeTarget | null; goneAt: number; face: number;
}

const wolves = (tk: BossToolkit): SignatureMove => {
  let pack: Wolf[] = [];
  const AIM_MS = 650, LUNGE_MS = 520, LUNGE_V = 620;
  function aim(w: Wolf, time: number): void {
    w.aimAt = time;
    w.aimA = Math.atan2(tk.player.y - w.y, tk.player.x - w.x);
    w.lungeAt = time + tk.warn(AIM_MS);
    w.lungeEnd = w.lungeAt + LUNGE_MS;
    w.hit = false;
    w.face = Math.cos(w.aimA) < 0 ? -1 : 1;
  }
  return {
    durationMs: 1800,
    windupMs: 700,
    gesture: 'raise',
    hold: 'draw',
    tell: 'MASTERPIECE: WOLVES',
    cast(time) {
      for (const w of pack) w.target?.remove();
      pack = [];
      const spots: Pt[] = [{ x: 90, y: TOP + 90 }, { x: tk.W - 90, y: TOP + 90 }, { x: 90, y: tk.H - 70 }, { x: tk.W - 90, y: tk.H - 70 }];
      spots.sort((a, b) => dist(b.x, b.y, tk.player.x, tk.player.y) - dist(a.x, a.y, tk.player.x, tk.player.y));
      const n = tk.hard ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const e = spots[i];
        const w: Wolf = {
          x: e.x, y: e.y + 30, easel: e, bornAt: time + tk.warn(1100), out: false, lunges: 0, aimAt: 0, aimA: 0, lungeAt: 0, lungeEnd: 0,
          hit: false, hp: tk.hard ? 3 : 2, target: null, goneAt: 0, face: 1,
        };
        pack.push(w);
      }
      brushColor = UMBER_WOLF;
      tk.sfx('roar');
    },
    update(time, dt) {
      const p = tk.player;
      for (const w of pack) {
        if (w.goneAt) continue;
        if (!w.out) {
          if (time < w.bornAt) continue;
          w.out = true;
          w.target = tk.spawnTarget({
            x: w.x, y: w.y, r: 24,
            onStruck: () => {
              if (w.goneAt) return;
              w.hp--;
              tk.sfx('slime-splat');
              if (w.hp <= 0) { w.goneAt = tk.now; w.target?.remove(); w.target = null; }
            },
          });
          aim(w, time);
          tk.sfx('roar');
          continue;
        }
        if (time >= w.lungeAt && time < w.lungeEnd) {
          w.x = clamp(w.x + Math.cos(w.aimA) * LUNGE_V * dt, 30, tk.W - 30);
          w.y = clamp(w.y + Math.sin(w.aimA) * LUNGE_V * dt, TOP + 20, tk.H - 20);
          w.target?.moveTo(w.x, w.y);
          if (!w.hit && p.active && p.hp > 0 && dist(w.x, w.y, p.x, p.y) < 34) { w.hit = true; tk.hitPlayer(13, p.x, p.y); tk.sfx('slash'); }
        } else if (time >= w.lungeEnd) {
          w.lunges++;
          if (w.lunges >= 3) { w.goneAt = time; w.target?.remove(); w.target = null; continue; }
          aim(w, time + 260);
        }
      }
      pack = pack.filter((w) => !w.goneAt || time - w.goneAt < 700);
    },
    drawGround(g, time) {
      for (const w of pack) {
        // The scratched line it will lunge along.
        if (w.out && !w.goneAt && time >= w.aimAt && time < w.lungeAt) {
          const k = clamp((time - w.aimAt) / Math.max(1, w.lungeAt - w.aimAt), 0, 1);
          const len = LUNGE_V * LUNGE_MS / 1000;
          for (const o of [-8, 0, 8]) {
            const ox = Math.cos(w.aimA + Math.PI / 2) * o, oy = Math.sin(w.aimA + Math.PI / 2) * o;
            g.lineStyle(2, UMBER_WOLF, 0.25 + k * 0.6);
            for (let s = 20; s < len; s += 26) g.lineBetween(w.x + ox + Math.cos(w.aimA) * s, w.y + oy + Math.sin(w.aimA) * s, w.x + ox + Math.cos(w.aimA) * (s + 14), w.y + oy + Math.sin(w.aimA) * (s + 14));
          }
        }
        g.fillStyle(0x000000, 0.15); g.fillEllipse(w.x, w.y + 14, 40, 10);
      }
    },
    drawAir(g, time) {
      for (const w of pack) {
        // The easel it came from.
        const e = w.easel;
        const paintK = clamp(1 - (w.bornAt - time) / 1100, 0, 1);
        if (!w.out || time - w.bornAt < 1200) easelWithCanvas(g, e.x, e.y, w.out ? 1 - clamp((time - w.bornAt) / 1200, 0, 1) : 1, paintK);
        if (!w.out) continue;
        const fade = w.goneAt ? clamp(1 - (time - w.goneAt) / 700, 0, 1) : clamp((time - w.bornAt) / 300, 0, 1);
        const lunging = time >= w.lungeAt && time < w.lungeEnd;
        paintedWolf(g, w.x, w.y, w.face, fade, time, lunging, w.goneAt > 0);
      }
    },
    onPhaseEnd() { for (const w of pack) w.target?.remove(); pack = []; },
  };
};

const UMBER_WOLF = 0x6a4a3a;

/** A field easel with its canvas, the painting `paint` of the way done, fading by `a`. */
function easelWithCanvas(g: G, x: number, y: number, a: number, paint: number): void {
  if (a <= 0) return;
  g.lineStyle(3, TIMBER_DARK, a); g.lineBetween(x - 16, y + 34, x - 6, y - 40); g.lineBetween(x + 16, y + 34, x + 6, y - 40);
  g.lineStyle(3, TIMBER, a); g.lineBetween(x - 22, y + 4, x + 22, y + 4);
  g.fillStyle(GOLD, a); g.fillRect(x - 24, y - 44, 48, 46);
  g.fillStyle(CANVAS, a); g.fillRect(x - 21, y - 41, 42, 40);
  g.fillStyle(lit(VIRIDIAN, 0.4), a * paint); g.fillRect(x - 21, y - 41, 42, 40 * paint);
  if (paint > 0.5) {
    const k = (paint - 0.5) * 2;
    g.fillStyle(UMBER_WOLF, a * k); g.fillEllipse(x, y - 18, 26, 12); g.fillCircle(x + 12, y - 26, 6);
    g.fillTriangle(x + 9, y - 32, x + 13, y - 31, x + 11, y - 38);
  }
}

/** A painted wolf: thick strokes of umber and ochre, a white-dab eye, wet paint dripping as it runs. */
function paintedWolf(g: G, x: number, y: number, face: number, a: number, time: number, lunging: boolean, smear: boolean): void {
  if (a <= 0) return;
  const stretch = lunging ? 1.35 : 1;
  const bob = Math.sin(time / (lunging ? 50 : 160)) * 2;
  if (smear) {
    g.fillStyle(UMBER_WOLF, 0.5 * a); g.fillEllipse(x, y, 50, 14);
    for (let i = 0; i < 4; i++) { g.fillStyle(UMBER_WOLF, 0.4 * a); g.fillEllipse(x - 20 + i * 12, y + 10 + (1 - a) * 12, 4, 10); }
    return;
  }
  // Legs.
  for (const k of [-1, 1]) {
    const sw = Math.sin(time / (lunging ? 40 : 120) + k) * 6;
    g.lineStyle(4, dim(UMBER_WOLF, 0.2), a); g.lineBetween(x + k * 10 * stretch, y + 2, x + k * 12 * stretch + sw, y + 14);
  }
  // Body: three heavy brushstrokes.
  for (let i = 0; i < 3; i++) {
    g.lineStyle(9 - i * 2, i === 1 ? 0xb07a48 : UMBER_WOLF, a);
    g.lineBetween(x - 18 * face * stretch, y - 4 + bob + i * 3, x + 12 * face * stretch, y - 8 + bob + i * 3);
  }
  // Tail.
  g.lineStyle(5, UMBER_WOLF, a); g.lineBetween(x - 18 * face * stretch, y - 6 + bob, x - 30 * face * stretch, y - 16 + bob + Math.sin(time / 90) * 3);
  // Head, ear, jaw.
  const hx = x + 20 * face * stretch, hy = y - 14 + bob;
  g.fillStyle(UMBER_WOLF, a); g.fillEllipse(hx, hy, 18, 12);
  g.fillTriangle(hx - 4 * face, hy - 4, hx + 2 * face, hy - 5, hx - 2 * face, hy - 14);
  g.fillStyle(0xb07a48, a); g.fillEllipse(hx + 8 * face, hy + 3, 12, 6);
  g.fillStyle(0xffffff, a); g.fillCircle(hx + 2 * face, hy - 2, 2);
  if (lunging) { g.lineStyle(2, 0xffffff, a); g.lineBetween(hx + 6 * face, hy + 5, hx + 13 * face, hy + 6); }
  // Drips.
  for (let i = 0; i < 3; i++) { g.fillStyle(UMBER_WOLF, 0.7 * a); g.fillEllipse(x - 10 + i * 10, y + 16 + ((time / 10 + i * 9) % 8), 3, 5); }
}

// ── Signature: Painted Swallows ───────────────────────────────────────
// A flock of painted swallows sweeps across the arena on a wave. The wave is dotted in first;
// then they come, one after another, along it. Get off the wave.

interface Flock { horiz: boolean; c: number; amp: number; dir: number; warnAt: number; goAt: number; n: number; hit: boolean[]; colors: number[] }

const swallows = (tk: BossToolkit): SignatureMove => {
  let flocks: Flock[] = [];
  const SPEED = 380, GAP = 0.13, WAVE = 260;
  const pos = (f: Flock, i: number, time: number): Pt => {
    const s = (time - f.goAt) / 1000 - i * GAP;
    const along = f.dir > 0 ? -30 + s * SPEED : (f.horiz ? tk.W : tk.H) + 30 - s * SPEED;
    const across = f.c + Math.sin((along / WAVE) * Math.PI * 2) * f.amp;
    return f.horiz ? { x: along, y: across } : { x: across, y: along };
  };
  return {
    durationMs: 1600,
    windupMs: 500,
    gesture: 'clap',
    tell: 'MASTERPIECE: SWALLOWS',
    cast(time) {
      const p = tk.player;
      const two = tk.hard || tk.phase >= 2;
      flocks = [];
      for (let k = 0; k < (two ? 2 : 1); k++) {
        const horiz = k === 0 ? Math.random() < 0.6 : !flocks[0].horiz;
        const c = horiz ? clamp(p.y, TOP + 90, tk.H - 80) : clamp(p.x, 90, tk.W - 90);
        const warnAt = time + k * 700;
        flocks.push({
          horiz, c, amp: 70, dir: Math.random() < 0.5 ? 1 : -1, warnAt, goAt: warnAt + tk.warn(950), n: 8, hit: new Array(8).fill(false),
          colors: [ULTRAMARINE, VIOLET, MADDER, ULTRAMARINE, VIRIDIAN, ULTRAMARINE, MADDER, VIOLET],
        });
      }
      brushColor = ULTRAMARINE;
      tk.sfx('wings');
    },
    update(time) {
      const p = tk.player;
      for (const f of flocks) {
        if (time < f.goAt) continue;
        for (let i = 0; i < f.n; i++) {
          if (f.hit[i]) continue;
          const b = pos(f, i, time);
          if (p.active && p.hp > 0 && dist(b.x, b.y, p.x, p.y) < 12 + 20) { f.hit[i] = true; tk.hitPlayer(8, p.x, p.y); }
        }
      }
      const span = (Math.max(tk.W, tk.H) + 100) / SPEED * 1000 + 8 * GAP * 1000;
      flocks = flocks.filter((f) => time < f.goAt + span);
    },
    drawGround(g, time) {
      for (const f of flocks) {
        if (time > f.goAt + 400) continue;
        const k = clamp((time - f.warnAt) / Math.max(1, f.goAt - f.warnAt), 0, 1);
        const len = f.horiz ? tk.W : tk.H;
        for (let s = 0; s < len; s += 16) {
          const across = f.c + Math.sin((s / WAVE) * Math.PI * 2) * f.amp;
          const x = f.horiz ? s : across, y = f.horiz ? across : s;
          if (!f.horiz && y < TOP) continue;
          g.fillStyle(ULTRAMARINE, 0.12 + k * 0.4); g.fillCircle(x, y, 3);
          g.fillStyle(ULTRAMARINE, 0.04 + k * 0.06); g.fillCircle(x, y, 30);
        }
      }
    },
    drawAir(g, time) {
      for (const f of flocks) {
        if (time < f.goAt) continue;
        for (let i = 0; i < f.n; i++) {
          if (f.hit[i]) continue;
          const b = pos(f, i, time), b2 = pos(f, i, time + 30);
          const ang = Math.atan2(b2.y - b.y, b2.x - b.x);
          swallow(g, b.x, b.y, ang, f.colors[i], time + i * 50);
        }
      }
    },
    onPhaseEnd() { flocks = []; },
  };
};

/** A painted swallow: forked tail, swept wings in a single loaded stroke, a madder throat. */
function swallow(g: G, x: number, y: number, ang: number, c: number, time: number): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (fx: number, fy: number): Pt => ({ x: x + fx * ca - fy * sa, y: y + fx * sa + fy * ca });
  const flap = Math.sin(time / 50) * 6;
  const body = [P(12, 0), P(-6, -3), P(-6, 3)];
  g.fillStyle(c, 1); g.fillTriangle(body[0].x, body[0].y, body[1].x, body[1].y, body[2].x, body[2].y);
  for (const k of [-1, 1]) {
    const w0 = P(2, 0), w1 = P(-8, k * (14 + flap)), w2 = P(-2, k * 4);
    g.fillStyle(dim(c, 0.15), 1); g.fillTriangle(w0.x, w0.y, w1.x, w1.y, w2.x, w2.y);
    const t0 = P(-6, k * 1), t1 = P(-16, k * 6);
    g.lineStyle(2, c, 1); g.lineBetween(t0.x, t0.y, t1.x, t1.y);
  }
  const th = P(8, 1);
  g.fillStyle(MADDER, 1); g.fillCircle(th.x, th.y, 2);
  g.fillStyle(0xffffff, 0.7); g.fillCircle(P(9, -1).x, P(9, -1).y, 1);
}

// ── Signature: Turpentine ─────────────────────────────────────────────
// The solvent goes on. Bands of the floor drip from the top — the drips crawl down as the
// warning — and then the whole band runs, a wash of melted colour pouring down it.

interface Band { x0: number; w: number; c: number; warnAt: number; meltAt: number; meltMs: number; hit: boolean; bareUntil: number }

const turpentine = (tk: BossToolkit): SignatureMove => {
  let bands: Band[] = [];
  const COLS = 8;
  return {
    durationMs: 2600,
    windupMs: 650,
    gesture: 'slam',
    tell: 'TURPENTINE',
    cast(time) {
      const bw = tk.W / COLS;
      const pcol = clamp(Math.floor(tk.player.x / bw), 0, COLS - 1);
      const pick = new Set<number>([pcol]);
      const want = tk.hard ? 4 : 3;
      for (let tries = 0; pick.size < want && tries < 40; tries++) {
        const c = Math.floor(Math.random() * COLS);
        // Never three in a row: there is always somewhere to stand.
        if (pick.has(c - 1) && pick.has(c + 1)) continue;
        if (pick.has(c - 1) && pick.has(c - 2)) continue;
        if (pick.has(c + 1) && pick.has(c + 2)) continue;
        pick.add(c);
      }
      bands = [...pick].map((c, i) => {
        const warnAt = time + i * 280;
        const meltAt = warnAt + tk.warn(1250);
        return { x0: c * bw, w: bw, c: PIGMENTS[c % PIGMENTS.length], warnAt, meltAt, meltMs: 520, hit: false, bareUntil: meltAt + 520 + 1800 };
      });
      brushColor = 0xd8d0c0;
      tk.sfx('oil-splash');
    },
    update(time) {
      const p = tk.player;
      for (const b of bands) {
        if (b.hit || time < b.meltAt || time > b.meltAt + b.meltMs) continue;
        const front = TOP + ((time - b.meltAt) / b.meltMs) * (tk.H - TOP);
        if (p.active && p.hp > 0 && p.x > b.x0 - 12 && p.x < b.x0 + b.w + 12 && p.y < front + 20) {
          b.hit = true;
          tk.hitPlayer(14, p.x, p.y);
          tk.slowPlayer(0.6, 900);
          tk.sfx('splash');
        }
      }
      bands = bands.filter((b) => time < b.bareUntil);
    },
    drawGround(g, time) {
      for (const b of bands) {
        if (time < b.meltAt) {
          // The drips crawl down from the top of the band.
          const k = clamp((time - b.warnAt) / Math.max(1, b.meltAt - b.warnAt), 0, 1);
          g.fillStyle(b.c, 0.12 + k * 0.12); g.fillRect(b.x0, TOP, b.w, tk.H - TOP);
          for (let i = 0; i < 6; i++) {
            const dx = b.x0 + 10 + i * (b.w - 20) / 5;
            const len = (tk.H - TOP) * k * (0.5 + ((i * 37) % 10) / 20);
            g.lineStyle(5, b.c, 0.75); g.lineBetween(dx, TOP, dx, TOP + len);
            g.fillStyle(b.c, 0.9); g.fillCircle(dx, TOP + len, 4.5);
          }
          g.lineStyle(2, lit(b.c, 0.3), 0.4 + k * 0.4); g.strokeRect(b.x0 + 2, TOP, b.w - 4, tk.H - TOP);
          continue;
        }
        const k = clamp((time - b.meltAt) / b.meltMs, 0, 1);
        const front = TOP + k * (tk.H - TOP);
        // The wash pouring down, and bare primed canvas left behind it.
        g.fillStyle(CANVAS, 0.85 * clamp((b.bareUntil - time) / 500, 0, 1)); g.fillRect(b.x0, TOP, b.w, front - TOP);
        g.lineStyle(1, CANVAS_DARK, 0.5);
        for (let yy = TOP + 8; yy < front; yy += 10) g.lineBetween(b.x0, yy, b.x0 + b.w, yy + 2);
        if (k < 1) {
          g.fillStyle(b.c, 0.9); g.fillRect(b.x0, front - 30, b.w, 30);
          for (let i = 0; i < 8; i++) { g.fillStyle(lit(b.c, 0.3), 0.9); g.fillEllipse(b.x0 + 6 + i * (b.w - 12) / 7, front + 4 + Math.sin(i * 3 + time / 40) * 5, 10, 16); }
        }
      }
    },
    onPhaseEnd() { bands = []; },
  };
};

// ── The prince ────────────────────────────────────────────────────────

export const HUE_BOSS: WorldBossDef = {
  worldId: 'isle:hue',
  name: 'Prince Hue',
  title: 'the Painter Royal',
  color: HUE,
  colorLit: HUE_LIT,
  colorDark: HUE_DARK,
  accent: GOLD,
  // Tier 2 of the tenth isle.
  damageMult: 1.4,

  intro: [
    'Mind the drop-cloth. And the light — it comes straight down in here, I had the roof made so.',
    'You have been scuffing my court, stranger. Shadows everywhere you go. Let me paint you properly.',
  ],
  banter: [
    'Every wall in the court is His likeness. I did the first one. I was eleven.',
    'A shadow is a lie about the light. I don\'t paint lies. I was taught not to.',
    'Hold still. I\'ll make you luminous.',
    'Ombretta? I don\'t know the name. I never knew it. I never drew for her.',
    'Colour is obedience. You put it where it is told to go.',
  ],
  defeatLine: 'THE PAINT RUNS',
  resumeLine: 'You again. Still casting that shadow. I\'ve a fresh canvas for you.',

  phases: [
    {
      name: 'Brushwork',
      line: 'Red for the robe. Blue for the sky. Yellow for the sun. That is all the colour anyone needs.',
      hp: 570,
      cycle: [
        'sig:brushwork', 'volley', 'sig:spatter', 'hazard', 'sig:brushwork',
        'radial', 'sig:spatter', 'homing', 'sig:brushwork', 'spiral',
      ],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1150,
      harassMs: 3300,
    },
    {
      name: 'Masterpiece',
      line: 'Enough strokes. I\'ll paint you something that bites.',
      hp: 650,
      cycle: [
        'sig:wolves', 'sig:swallows', 'lanes', 'sig:brushwork', 'sig:wolves',
        'barrage', 'sig:swallows', 'sig:spatter', 'minefield',
      ],
      harass: ['h-flak', 'h-rune', 'h-orbs'],
      restMs: 1050,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'TURPENTINE TAKES EVERYTHING OFF',
    extraPhase: {
      name: 'Turpentine',
      line: 'Fine. Then none of it stays. Not the robe, not the sun, not the floor. Watch it run.',
      hp: 490,
      cycle: [
        'sig:turpentine', 'sig:spatter', 'sig:swallows', 'sweep',
        'sig:turpentine', 'sig:brushwork', 'sig:wolves', 'homing',
      ],
      harass: ['h-mines', 'h-lane'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 6, speed: 230, spreadRad: 0.55 },
    radial: { count: 16, speed: 190 },
    hazard: { radius: 62 },
    spiral: { arms: 4, speed: 170 },
  },

  signatures: {
    brushwork,
    spatter,
    wolves,
    swallows,
    turpentine,
  },

  look: {
    crest: 'plume', pattern: 'drip', aura: 'none', hands: 'ball',
    torsoR: 34, mouth: 'grin', eyes: 2, eyeColor: GOLD_LIT,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'gold', look: { pattern: 'swirl', mouth: 'line' } },
    { movement: 'blink', gimmick: 'none', tint: 'pale', look: { pattern: 'drip', hands: 'wisp', mouth: 'stitch' } },
  ],

  /**
   * The Painter Royal's tells. A great floppy beret of ultramarine with a gilt sun pin, a ruff of a
   * smock collar smeared with every colour, a painted gilt halo behind his head (he paints himself
   * the way he paints the Despot), the palette on his thumb and a long brush loaded with whatever
   * colour he is about to use. In Masterpiece an empty gilt frame hangs behind him, waiting; in
   * Turpentine he is running — colour sliding off him in drips, the beret sagging, the halo gone.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const masterpiece = s.phaseIdx === 1;
    const turps = s.hard && s.phaseIdx >= 2;
    // Masterpiece: the empty frame behind him.
    if (masterpiece) {
      g.lineStyle(7, GOLD_DARK, 0.95); g.strokeRect(s.x - R * 1.9, s.y - R * 2.4, R * 3.8, R * 3.4);
      g.lineStyle(4, GOLD, 1); g.strokeRect(s.x - R * 1.9, s.y - R * 2.4, R * 3.8, R * 3.4);
      for (const [cx, cy] of [[-1.9, -2.4], [1.9, -2.4], [-1.9, 1], [1.9, 1]]) { g.fillStyle(GOLD_LIT, 1); g.fillCircle(s.x + cx * R, s.y + cy * R, 4); }
    }
    // The halo: painted rays, the way the Mural does the Despot's head.
    if (!turps) {
      for (let i = 0; i < 14; i++) {
        const a = -Math.PI / 2 + (i - 6.5) * 0.22;
        const len = (i % 2 ? 1.5 : 1.85) * R;
        g.fillStyle(i % 2 ? GOLD : GOLD_LIT, 0.85);
        g.fillTriangle(s.x + Math.cos(a - 0.06) * R * 0.95, s.y - R * 0.4 + Math.sin(a - 0.06) * R * 0.95, s.x + Math.cos(a + 0.06) * R * 0.95, s.y - R * 0.4 + Math.sin(a + 0.06) * R * 0.95, s.x + Math.cos(a) * len, s.y - R * 0.4 + Math.sin(a) * len);
      }
    }
    // Smock collar: a pleated ruff smeared with paint.
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.15 + (i / 8) * Math.PI * 0.7;
      const px = s.x + Math.cos(a) * R * 0.9, py = s.y + Math.sin(a) * R * 0.55 + R * 0.35;
      g.fillStyle(CANVAS, 1); g.fillEllipse(px, py, R * 0.42, R * 0.3);
      g.fillStyle(PIGMENTS[i % PIGMENTS.length], 0.8); g.fillEllipse(px + 2, py + 1, R * 0.16, R * 0.1);
    }
    // The beret: tilted, floppy, a gilt sun pin.
    const sag = turps ? 0.35 : 0;
    const bx = s.x + R * 0.25, by = s.y - R * 0.95 + sag * R;
    g.fillStyle(HUE_DARK, 1); g.fillEllipse(bx + 2, by + 3, R * 1.9, R * (0.75 + sag));
    g.fillStyle(turps ? dim(ULTRAMARINE, 0.2) : ULTRAMARINE, 1); g.fillEllipse(bx, by, R * 1.85, R * (0.7 + sag));
    g.fillStyle(ULTRA_LIT, 0.5); g.fillEllipse(bx - R * 0.35, by - R * 0.15, R * 0.6, R * 0.18);
    g.fillStyle(HUE_DARK, 1); g.fillCircle(bx + R * 0.1, by - R * 0.32, 3);
    g.fillStyle(GOLD, 1); g.fillCircle(bx + R * 0.6, by + R * 0.05, 5);
    g.fillStyle(GOLD_LIT, 1); g.fillCircle(bx + R * 0.58, by + R * 0.02, 2);
    for (let i = 0; i < 5; i++) { g.fillStyle(PIGMENTS[(i * 3) % PIGMENTS.length], 0.9); g.fillCircle(bx - R * 0.6 + i * R * 0.28, by + Math.sin(i * 2) * R * 0.15, 1.8); }
    // Palette on the first hand, brush in the second.
    const h0 = s.hands[0], h1 = s.hands[1];
    if (h0) palette(g, h0.x - 4, h0.y - 4, 0.9, s.facing + Math.PI, 1);
    if (h1) {
      const ang = -Math.PI / 2 + 0.5 + Math.sin(s.t / 300) * 0.2 - s.castGlow * 0.6;
      brush(g, h1.x, h1.y + 8, ang, 44, brushColor, 4);
      if (s.castGlow > 0.2) glow(g, h1.x + Math.cos(ang) * 56, h1.y + 8 + Math.sin(ang) * 56, 10, brushColor, 0.1 * s.castGlow, 2);
    }
    // Turpentine: he runs. Colour sliding off in drips.
    if (turps) {
      for (let i = 0; i < 7; i++) {
        const ph = (s.t / 900 + i / 7) % 1;
        const dx = s.x - R * 0.8 + i * R * 0.27;
        g.fillStyle(PIGMENTS[i % PIGMENTS.length], 0.85 * (1 - ph * 0.6));
        g.fillEllipse(dx, s.y + R * 0.7 + ph * R * 1.4, 5, 9 + ph * 6);
        g.lineStyle(3, PIGMENTS[i % PIGMENTS.length], 0.6); g.lineBetween(dx, s.y + R * 0.4, dx, s.y + R * 0.7 + ph * R * 1.4);
      }
    } else {
      // Paint on his chest: a stroke of today's colour.
      g.lineStyle(5, brushColor, 0.6); g.lineBetween(s.x - R * 0.5, s.y + R * 0.1, s.x + R * 0.2, s.y - R * 0.15);
    }
    if (s.enraged) { g.lineStyle(1.5, GOLD_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The Shadowless Gallery: white marble chequered with ivory, veined grey; skylight squares
   * blazing on the floor from the glass roof, with not one shadow among them; tall gilt frames
   * along the back wall holding the Despot at noon over and over; a vast paint-spattered
   * drop-cloth in the middle where the Prince works; and a canvas being prepared, primed white.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x4ae1a7);
    const T = 64;
    for (let y = 0; y < H; y += T) {
      for (let x = 0; x < W; x += T) {
        const k = ((x / T) + (y / T)) % 2;
        g.fillStyle(k ? STONE : STONE_LIT, 1); g.fillRect(x, y, T, T);
        g.lineStyle(1, STONE_DARK, 0.4); g.strokeRect(x, y, T, T);
      }
    }
    // Veins in the marble.
    for (let i = 0; i < 18; i++) {
      let x = rng() * W, y = 110 + rng() * (H - 110);
      g.lineStyle(1, VEIN, 0.5);
      for (let k = 0; k < 6; k++) { const nx = x + (rng() - 0.3) * 50, ny = y + (rng() - 0.5) * 30; g.lineBetween(x, y, nx, ny); x = nx; y = ny; }
    }
    // Skylight squares blazing on the floor.
    for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
      const x = 70 + col * 180, y = 150 + row * 160;
      g.fillStyle(0xffffff, 0.28); g.fillRect(x, y, 110, 90);
      g.lineStyle(3, 0xfff6d0, 0.4); g.strokeRect(x, y, 110, 90);
      g.lineStyle(1, 0xfff6d0, 0.3); g.lineBetween(x + 55, y, x + 55, y + 90); g.lineBetween(x, y + 45, x + 110, y + 45);
    }
    // The back wall under the HUD: tall gilt frames, the Despot in each.
    g.fillStyle(STONE_DARK, 1); g.fillRect(0, 0, W, 110);
    g.fillStyle(STONE, 1); g.fillRect(0, 0, W, 104);
    for (let i = 0; i < 6; i++) {
      const fx = 40 + i * 160, fw = 120;
      g.fillStyle(GOLD_DARK, 1); g.fillRect(fx - 4, 6, fw + 8, 96);
      g.fillStyle(GOLD, 1); g.fillRect(fx - 2, 8, fw + 4, 92);
      g.fillStyle(0xbfe2f6, 1); g.fillRect(fx + 4, 14, fw - 8, 80);
      g.fillStyle(0xffffff, 0.3); g.fillRect(fx + 4, 14, fw - 8, 30);
      auriel(g, fx + fw / 2, 92, 0.6);
      g.fillStyle(GLASS, 0.15); g.fillRect(fx + 4, 14, fw - 8, 80);
    }
    g.fillStyle(GOLD, 1); g.fillRect(0, 104, W, 5);
    // The drop-cloth in the middle, spattered.
    const cx = W / 2, cy = (H + 110) / 2;
    g.fillStyle(CANVAS_DARK, 1); g.fillRect(cx - 214, cy - 124, 432, 252);
    g.fillStyle(CANVAS, 1); g.fillRect(cx - 216, cy - 126, 432, 252);
    g.lineStyle(1, CANVAS_DARK, 0.8);
    for (let k = 1; k < 6; k++) g.lineBetween(cx - 216 + k * 72 + (rng() - 0.5) * 8, cy - 126, cx - 216 + k * 72 + (rng() - 0.5) * 8, cy + 126);
    for (let i = 0; i < 40; i++) splat(g, cx - 200 + rng() * 400, cy - 110 + rng() * 220, 2 + rng() * 7, PIGMENTS[Math.floor(rng() * PIGMENTS.length)], rng, 0.8);
    // A huge brushstroke of gold across it, the start of something.
    g.lineStyle(26, GOLD_DARK, 0.6); g.lineBetween(cx - 150, cy + 60, cx + 120, cy - 70);
    g.lineStyle(20, GOLD, 0.8); g.lineBetween(cx - 150, cy + 58, cx + 120, cy - 72);
    // Pots and jars lined along the side walls.
    for (let y = 170; y < H - 40; y += 90) {
      for (const x of [24, W - 24]) {
        const c = PIGMENTS[Math.floor(rng() * PIGMENTS.length)];
        g.fillStyle(0x8a8a90, 1); g.fillRect(x - 8, y - 14, 16, 14);
        g.fillStyle(c, 1); g.fillEllipse(x, y - 14, 16, 5);
        g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x - 2, y - 14, x - 6, y - 30);
      }
    }
    // The noon through the roof: a faint white haze down from the top.
    for (let i = 0; i < 5; i++) { g.fillStyle(0xffffff, 0.035); g.fillRect(0, 110, W, 60 + i * 60); }
  },
};
