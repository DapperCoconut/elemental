import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../../boss/framework/StrikeTargets';
import { glow, mixC, mulberry } from '../../../../art/IsleArt';
import { glint, sunburst, sunburstInlay } from './art';
import {
  BEAM, BEAM_HOT, GLASS, GLASS_EDGE, GOLD, GOLD_DARK, GOLD_LIT, GROUT, IRON_DARK, LUMEN, LUMEN_DARK,
  LUMEN_LIT, MARBLE, MARBLE_DARK, MARBLE_DEEP, MARBLE_LIT, PRISM_BLUE, SCORCH, SCORCH_DARK, SPECTRUM, SUN, VEIN,
} from './palette';
import { clamp, dist, lineDist, rayEnd, segDist } from './util';

/**
 * Prince Lumen, the Unshadowed — the Despot's Radiance over the Noon Court.
 *
 * Lumen was the first thing the Endless Noon was ever done to. When the Heliostat was raised he
 * was a boy who was frightened of his own shadow, and his father had it burnt off him under the
 * Burning Glass so he would never be frightened again. He has not cast a shadow since; he keeps
 * the Glass because it is the only thing that has ever understood him. He fights the way light
 * behaves:
 *
 * • **Prism** (hovering, gold): he sets a crystal prism in the air and splits his beam through
 *   it into seven rays that fan and sweep — red ones burn, violet ones slow; and he throws three
 *   gilt hand-mirrors round you and bounces one beam between them (shatter a mirror and the
 *   beam stops there).
 * • **Afterimage** (blinking, pale): he moves at the speed of light, hop after hop round you,
 *   and every place he stood leaves an afterimage that fires a beam at you when he stops; and he
 *   drops bars of solid sunlight across the floor in two alternating waves.
 * • **Zenith** (hard, anchored, hot): he hauls the sun down on its chain — a white orb sinks
 *   toward you, its light scorching a widening disc on the floor, until it lands.
 */

const TOP = 96;
const alive = (tk: BossToolkit) => tk.player.active && tk.player.hp > 0;

/** The ray from (x, y) at angle a reaches the player (half-line, body radius + halfW). */
function rayHits(tk: BossToolkit, x: number, y: number, a: number, halfW: number): boolean {
  const p = tk.player;
  const ahead = (p.x - x) * Math.cos(a) + (p.y - y) * Math.sin(a);
  return ahead > -8 && lineDist(p.x, p.y, x, y, a) < halfW + 18;
}

// ── Signature: Prism ─────────────────────────────────────────────────
// A crystal prism hangs in the air between you. His white beam strikes it and splits into seven
// coloured rays in a fan, the gaps between them just wider than you. Then the fan sweeps: walk
// with your gap. Red rays leave you burning; violet rays leave you slow.

interface Ray { a: number; color: number; nextHit: number }

const prism = (tk: BossToolkit): SignatureMove => {
  let px = 0, py = 0, base = 0, dir = 1;
  let warnAt = 0, fireAt = 0, endAt = 0;
  let rays: Ray[] = [];
  const SWEEP_MS = 1800, GAP = 0.2, HALF = 7;
  const angleOf = (i: number, time: number): number => {
    const k = time < fireAt ? 0 : clamp((time - fireAt) / SWEEP_MS, 0, 1);
    return base + (i - 3) * GAP + dir * (GAP * 0.5 + k * GAP * 2.2);
  };
  return {
    durationMs: 3300,
    windupMs: 600,
    gesture: 'raise',
    hold: 'charge',
    tell: 'PRISM',
    cast(time) {
      const p = tk.player;
      px = tk.clampX(tk.bossX + (p.x - tk.bossX) * 0.32, 80); py = tk.clampY(tk.bossY + (p.y - tk.bossY) * 0.32, 80);
      base = Math.atan2(p.y - py, p.x - px);
      dir = Math.random() < 0.5 ? 1 : -1;
      warnAt = time; fireAt = time + tk.warn(1000); endAt = fireAt + SWEEP_MS;
      rays = SPECTRUM.map((color) => ({ a: 0, color, nextHit: 0 }));
      tk.sfx('prism');
    },
    update(time) {
      if (!rays.length) return;
      if (time > endAt + 300) { rays = []; return; }
      if (time < fireAt || time > endAt || !alive(tk)) return;
      rays.forEach((r, i) => {
        r.a = angleOf(i, time);
        if (time < r.nextHit || !rayHits(tk, px, py, r.a, HALF)) return;
        r.nextHit = time + 650;
        const p = tk.player;
        tk.hitPlayer(7, p.x, p.y);
        if (i === 0) {
          // Red burns: three more licks of heat.
          for (let k = 1; k <= 3; k++) tk.schedule(k * 450, () => { if (alive(tk)) tk.hitPlayer(2, tk.player.x, tk.player.y); });
          tk.sfx('status-burn');
        } else if (i === 6) {
          tk.slowPlayer(0.5, 1400);
          tk.sfx('status-slow');
        }
      });
    },
    drawGround(g, time) {
      if (!rays.length) return;
      const firing = time >= fireAt && time <= endAt;
      rays.forEach((r, i) => {
        const a = angleOf(i, time);
        const e = rayEnd(px, py, a, tk.W, TOP, tk.H);
        g.lineStyle(firing ? HALF * 4 : HALF * 2, r.color, firing ? 0.18 : 0.06 + clamp((time - warnAt) / Math.max(1, fireAt - warnAt), 0, 1) * 0.1);
        g.lineBetween(px, py, e.x, e.y);
      });
    },
    drawAir(g, time) {
      if (!rays.length) return;
      const firing = time >= fireAt && time <= endAt;
      const k = clamp((time - warnAt) / Math.max(1, fireAt - warnAt), 0, 1);
      // His beam into the prism.
      g.lineStyle(firing ? 8 : 2, 0xffffff, firing ? 0.95 : 0.3 + k * 0.4); g.lineBetween(tk.bossX, tk.bossY - 10, px, py);
      if (firing) { g.lineStyle(18, SUN, 0.25); g.lineBetween(tk.bossX, tk.bossY - 10, px, py); }
      // The rays.
      rays.forEach((r, i) => {
        const a = angleOf(i, time);
        const e = rayEnd(px, py, a, tk.W, TOP, tk.H);
        if (firing) {
          g.lineStyle(HALF * 2 + 6, r.color, 0.35); g.lineBetween(px, py, e.x, e.y);
          g.lineStyle(HALF * 2, r.color, 0.9); g.lineBetween(px, py, e.x, e.y);
          g.lineStyle(2, 0xffffff, 0.7); g.lineBetween(px, py, e.x, e.y);
        } else {
          // Warning: each ray drawn as a dotted thread of its colour.
          const len = Math.hypot(e.x - px, e.y - py);
          for (let d = 20; d < len; d += 18) {
            g.fillStyle(r.color, 0.3 + k * 0.6);
            g.fillCircle(px + Math.cos(a) * d, py + Math.sin(a) * d, 1.6 + k * 1.4);
          }
        }
      });
      // The prism itself: a turning triangle of crystal, white at its heart.
      const spin = time / 500;
      const R = 22;
      const pts = [0, 1, 2].map((j) => ({ x: px + Math.cos(spin + (j * Math.PI * 2) / 3) * R, y: py + Math.sin(spin + (j * Math.PI * 2) / 3) * R * 0.8 }));
      glow(g, px, py, 40, 0xffffff, 0.08, 3);
      g.fillStyle(PRISM_BLUE, 0.7); g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
      g.fillStyle(0xffffff, 0.75); g.fillTriangle(pts[0].x, pts[0].y, (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2, px, py);
      g.lineStyle(2, 0xffffff, 1); g.strokeTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
    },
    onPhaseEnd() { rays = []; },
  };
};

// ── Signature: Gilt Mirrors ──────────────────────────────────────────
// Three gilt hand-mirrors spin out of his sleeves and stand in the air round you. One beam,
// thrown from his hand, bounces mirror to mirror and on through where you stood. The path is
// drawn first; then each leg fires in turn. Strike a mirror before the beam reaches it and it
// shatters — the beam ends there.

interface Mirror { x: number; y: number; broken: boolean; target: StrikeTarget | null }
interface Leg { x0: number; y0: number; x1: number; y1: number; at: number; dealt: boolean; open: boolean }

const giltMirrors = (tk: BossToolkit): SignatureMove => {
  let mirrors: Mirror[] = [];
  let legs: Leg[] = [];
  let castAt = 0, fireAt = 0;
  let aimX = 0, aimY = 0;
  const LEG_MS = 360, STAGGER = 260, HALF = 12;
  function clearTargets(): void { for (const m of mirrors) m.target?.remove(); }
  function rebuild(): void {
    // The beam's path, ending at the first broken mirror.
    const pts = [{ x: tk.bossX, y: tk.bossY }];
    let open = false;
    for (const m of mirrors) { pts.push({ x: m.x, y: m.y }); if (m.broken) { open = true; break; } }
    if (!open) {
      const last = pts[pts.length - 1];
      const a = Math.atan2(aimY - last.y, aimX - last.x);
      pts.push(rayEnd(last.x, last.y, a, tk.W, TOP, tk.H));
    }
    legs = [];
    for (let i = 0; i < pts.length - 1; i++) legs.push({ x0: pts[i].x, y0: pts[i].y, x1: pts[i + 1].x, y1: pts[i + 1].y, at: fireAt + i * STAGGER, dealt: false, open: open && i === pts.length - 2 });
  }
  return {
    durationMs: 3200,
    windupMs: 550,
    gesture: 'point',
    tell: 'GILT MIRRORS',
    cast(time) {
      clearTargets();
      const p = tk.player;
      aimX = p.x; aimY = p.y;
      castAt = time; fireAt = time + tk.warn(1150);
      const a0 = Math.random() * Math.PI * 2;
      const rough = [0, 1, 2].map((i) => {
        const a = a0 + (i * Math.PI * 2) / 3;
        return { x: tk.clampX(p.x + Math.cos(a) * 210, 70), y: tk.clampY(p.y + Math.sin(a) * 180, 70) };
      });
      // Bounce nearest-first from Lumen, so the beam winds round you.
      rough.sort((m, n) => dist(m.x, m.y, tk.bossX, tk.bossY) - dist(n.x, n.y, tk.bossX, tk.bossY));
      mirrors = rough.map((pt) => {
        const m: Mirror = { x: pt.x, y: pt.y, broken: false, target: null };
        m.target = tk.spawnTarget({
          x: pt.x, y: pt.y, r: 20,
          onStruck() {
            if (m.broken || tk.now > fireAt + legs.length * STAGGER) return;
            m.broken = true;
            m.target?.remove(); m.target = null;
            tk.sfx('crystal-shatter');
            rebuild();
          },
        });
        return m;
      });
      rebuild();
      tk.sfx('crystal-chime');
    },
    update(time) {
      if (!legs.length) return;
      const p = tk.player;
      for (const l of legs) {
        if (l.dealt || time < l.at || time > l.at + LEG_MS) continue;
        if (alive(tk) && segDist(p.x, p.y, l.x0, l.y0, l.x1, l.y1) < HALF + 20) { l.dealt = true; tk.hitPlayer(9, p.x, p.y); }
      }
      if (time > fireAt + legs.length * STAGGER + LEG_MS + 200) { clearTargets(); mirrors = []; legs = []; }
    },
    drawGround(g, time) {
      for (const l of legs) {
        if (time >= l.at) continue;
        const k = clamp((time - castAt) / Math.max(1, l.at - castAt), 0, 1);
        g.lineStyle(HALF * 2, GOLD_LIT, 0.05 + k * 0.12); g.lineBetween(l.x0, l.y0, l.x1, l.y1);
      }
    },
    drawAir(g, time) {
      for (const l of legs) {
        if (time < l.at) {
          const k = clamp((time - castAt) / Math.max(1, l.at - castAt), 0, 1);
          g.lineStyle(1.5, GOLD_LIT, 0.3 + k * 0.6); g.lineBetween(l.x0, l.y0, l.x1, l.y1);
        } else if (time < l.at + LEG_MS) {
          const k = (time - l.at) / LEG_MS;
          g.lineStyle(HALF * 2 + 8, BEAM, 0.3 * (1 - k)); g.lineBetween(l.x0, l.y0, l.x1, l.y1);
          g.lineStyle(HALF, BEAM_HOT, 1 - k * 0.6); g.lineBetween(l.x0, l.y0, l.x1, l.y1);
          g.lineStyle(2, 0xffffff, 1 - k); g.lineBetween(l.x0, l.y0, l.x1, l.y1);
          if (l.open) for (let i = 0; i < 8; i++) { const a = i * 0.8 + time / 100; glint(g, l.x1 + Math.cos(a) * 14 * k, l.y1 + Math.sin(a) * 14 * k, 4, 1 - k); }
        }
      }
      // The mirrors: gilt ovals on handles, spinning in from his hands, glinting when the beam lands.
      for (const m of mirrors) {
        if (m.broken) continue;
        const k = clamp((time - castAt) / 400, 0, 1);
        const x = tk.bossX + (m.x - tk.bossX) * k, y = tk.bossY + (m.y - tk.bossY) * k;
        const turn = Math.sin(time / 180 + m.x) * 0.5;
        g.lineStyle(3, GOLD_DARK, 1); g.lineBetween(x, y + 14, x + turn * 4, y + 30);
        g.fillStyle(GOLD_DARK, 1); g.fillEllipse(x, y, 30 * (0.6 + Math.abs(turn) * 0.4), 34);
        g.fillStyle(GOLD, 1); g.fillEllipse(x, y - 1, 27 * (0.6 + Math.abs(turn) * 0.4), 31);
        g.fillStyle(GLASS, 1); g.fillEllipse(x, y - 1, 21 * (0.6 + Math.abs(turn) * 0.4), 25);
        g.fillStyle(0xffffff, 0.85); g.fillEllipse(x - 3, y - 6, 6, 9);
        sunburst(g, x, y - 20, 5, 8, 1);
        if (time >= fireAt) glint(g, x, y, 12, 0.9);
      }
    },
    onPhaseEnd() { clearTargets(); mirrors = []; legs = []; },
  };
};

// ── Signature: Afterimage ────────────────────────────────────────────
// He moves at the speed of light: four or five hops round you, too fast to follow, and every
// place he stood keeps his image, glowing. When he stops, each image draws a line on you; a beat
// later every image fires.

interface Image { x: number; y: number; at: number; aim: number; dealt: boolean }

const afterimage = (tk: BossToolkit): SignatureMove => {
  let images: Image[] = [];
  let hops: { x: number; y: number }[] = [];
  let castAt = 0, stopAt = 0, fireAt = 0;
  let hopIdx = 0;
  const HOP_MS = 240, FIRE_MS = 300, HALF = 9;
  return {
    durationMs: 3400,
    windupMs: 400,
    locksBody: true,
    gesture: 'flex',
    tell: 'AFTERIMAGE',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 5 : 4;
      const a0 = Math.random() * Math.PI * 2;
      const dirn = Math.random() < 0.5 ? 1 : -1;
      hops = [];
      for (let i = 0; i < n; i++) {
        const a = a0 + dirn * (i * Math.PI * 2) / n + (Math.random() - 0.5) * 0.4;
        hops.push({ x: tk.clampX(p.x + Math.cos(a) * 250, 80), y: tk.clampY(p.y + Math.sin(a) * 210, 80) });
      }
      images = [{ x: tk.bossX, y: tk.bossY, at: time, aim: 0, dealt: false }];
      castAt = time; hopIdx = 0;
      stopAt = time + n * HOP_MS + 120;
      fireAt = 0;
      tk.sfx('blink');
    },
    update(time) {
      if (!hops.length && !images.length) return;
      while (hopIdx < hops.length && time >= castAt + (hopIdx + 1) * HOP_MS) {
        const h = hops[hopIdx++];
        tk.host.setBossPos(h.x, h.y);
        images.push({ x: h.x, y: h.y, at: time, aim: 0, dealt: false });
        tk.sfx('teleport');
      }
      if (!fireAt && time >= stopAt) {
        // He stops: every image takes its aim at you, now.
        const p = tk.player;
        for (const im of images) im.aim = Math.atan2(p.y - im.y, p.x - im.x);
        fireAt = time + tk.warn(760);
        tk.sfx('beam-charge');
      }
      if (fireAt && time >= fireAt && time <= fireAt + FIRE_MS) {
        if (time - fireAt < 40) tk.sfx('light-beam');
        for (const im of images) {
          if (im.dealt || !alive(tk) || !rayHits(tk, im.x, im.y, im.aim, HALF)) continue;
          im.dealt = true;
          tk.hitPlayer(8, tk.player.x, tk.player.y);
        }
      }
      if (fireAt && time > fireAt + FIRE_MS + 250) { images = []; hops = []; fireAt = 0; }
    },
    drawGround(g, time) {
      if (!fireAt) return;
      const k = clamp((time - (fireAt - tk.warn(760))) / tk.warn(760), 0, 1);
      for (const im of images) {
        const e = rayEnd(im.x, im.y, im.aim, tk.W, TOP, tk.H);
        g.lineStyle(HALF * 2 + 10, LUMEN, time < fireAt ? 0.05 + k * 0.12 : 0.22); g.lineBetween(im.x, im.y, e.x, e.y);
      }
    },
    drawAir(g, time) {
      // The light-streaks between hops.
      for (let i = 1; i < images.length; i++) {
        const a = images[i - 1], b = images[i];
        const k = clamp((time - b.at) / 500, 0, 1);
        g.lineStyle(10 * (1 - k) + 1, 0xffffff, 0.6 * (1 - k) + 0.08); g.lineBetween(a.x, a.y, b.x, b.y);
      }
      // The images: Lumen-shaped ghosts of light, flickering.
      for (const im of images) {
        const fl = 0.55 + Math.sin(time / 40 + im.x) * 0.15;
        glow(g, im.x, im.y, 34, LUMEN, 0.06, 3);
        g.fillStyle(LUMEN_LIT, 0.35 * fl); g.fillCircle(im.x, im.y, 30);
        g.lineStyle(2, LUMEN, 0.8 * fl); g.strokeCircle(im.x, im.y, 30);
        for (let j = 0; j < 7; j++) {
          const a = -Math.PI / 2 + (j - 3) * 0.32;
          g.lineStyle(2, SPECTRUM[j], 0.6 * fl);
          g.lineBetween(im.x + Math.cos(a) * 30, im.y + Math.sin(a) * 30, im.x + Math.cos(a) * 46, im.y + Math.sin(a) * 46);
        }
        if (fireAt) {
          const e = rayEnd(im.x, im.y, im.aim, tk.W, TOP, tk.H);
          if (time < fireAt) {
            const k = clamp(1 - (fireAt - time) / tk.warn(760), 0, 1);
            g.lineStyle(1.5, 0xffffff, 0.3 + k * 0.6); g.lineBetween(im.x, im.y, e.x, e.y);
          } else if (time < fireAt + FIRE_MS) {
            const k = (time - fireAt) / FIRE_MS;
            g.lineStyle(HALF * 2 + 6, LUMEN, 0.5 * (1 - k)); g.lineBetween(im.x, im.y, e.x, e.y);
            g.lineStyle(HALF, 0xffffff, 1 - k); g.lineBetween(im.x, im.y, e.x, e.y);
          }
        }
      }
    },
    onPhaseEnd() { images = []; hops = []; fireAt = 0; },
  };
};

// ── Signature: Sunbars ───────────────────────────────────────────────
// Bars of solid sunlight drop across the floor in two waves — first every other bar, then the
// ones between. A gold line on the floor shows where each will fall.

interface Bar { c: number; wave: number; warnAt: number; fallAt: number; dealt: boolean }

const sunbars = (tk: BossToolkit): SignatureMove => {
  let bars: Bar[] = [];
  let vertical = true;
  const HALF = 34, SLAM = 520;
  return {
    durationMs: 2600,
    windupMs: 650,
    gesture: 'slam',
    tell: 'SUNBARS',
    cast(time) {
      vertical = Math.random() < 0.55;
      const lo = vertical ? 60 : TOP + 40, hi = vertical ? tk.W - 60 : tk.H - 40;
      const span = hi - lo;
      const n = Math.floor(span / 120) + 1;
      const off = lo + (span - (n - 1) * 120) / 2;
      const first = tk.warn(950);
      bars = [];
      for (let i = 0; i < n; i++) {
        const wave = i % 2;
        bars.push({ c: off + i * 120, wave, warnAt: time + (wave ? first * 0.6 : 0), fallAt: time + first + wave * 760, dealt: false });
      }
      tk.sfx('holy-chord');
    },
    update(time) {
      if (!bars.length) return;
      const p = tk.player;
      for (const b of bars) {
        if (b.dealt || time < b.fallAt || time > b.fallAt + 160) continue;
        b.dealt = true;
        if (alive(tk) && Math.abs((vertical ? p.x : p.y) - b.c) < HALF + 16) tk.hitPlayer(9, p.x, p.y);
      }
      if (bars.some((b) => Math.abs(time - b.fallAt) < 18)) tk.sfx('gravity-slam');
      if (bars.every((b) => time > b.fallAt + SLAM)) bars = [];
    },
    drawGround(g, time) {
      for (const b of bars) {
        if (time < b.warnAt || time > b.fallAt + SLAM) continue;
        const x0 = vertical ? b.c - HALF : 0, y0 = vertical ? TOP : b.c - HALF;
        const w = vertical ? HALF * 2 : tk.W, h = vertical ? tk.H - TOP : HALF * 2;
        if (time < b.fallAt) {
          const k = clamp((time - b.warnAt) / Math.max(1, b.fallAt - b.warnAt), 0, 1);
          g.fillStyle(GOLD_LIT, 0.06 + k * 0.14); g.fillRect(x0, y0, w, h);
          g.lineStyle(2, GOLD, 0.3 + k * 0.6);
          if (vertical) { g.lineBetween(b.c - HALF, TOP, b.c - HALF, tk.H); g.lineBetween(b.c + HALF, TOP, b.c + HALF, tk.H); }
          else { g.lineBetween(0, b.c - HALF, tk.W, b.c - HALF); g.lineBetween(0, b.c + HALF, tk.W, b.c + HALF); }
        } else {
          const k = (time - b.fallAt) / SLAM;
          g.fillStyle(SCORCH, 0.22 * (1 - k)); g.fillRect(x0, y0, w, h);
        }
      }
    },
    drawAir(g, time) {
      for (const b of bars) {
        if (time < b.fallAt - 200 || time > b.fallAt + SLAM) continue;
        const pre = time < b.fallAt;
        const k = pre ? 1 - (b.fallAt - time) / 200 : (time - b.fallAt) / SLAM;
        const a = pre ? 0.25 * k : 1 - k;
        const shrink = pre ? 0.3 + k * 0.7 : 1 - k * 0.5;
        const hw = HALF * shrink;
        if (vertical) {
          g.fillStyle(SUN, 0.35 * a); g.fillRect(b.c - hw - 8, TOP, hw * 2 + 16, tk.H - TOP);
          g.fillStyle(BEAM_HOT, 0.85 * a); g.fillRect(b.c - hw, TOP, hw * 2, tk.H - TOP);
          g.fillStyle(0xffffff, a); g.fillRect(b.c - hw * 0.3, TOP, hw * 0.6, tk.H - TOP);
        } else {
          g.fillStyle(SUN, 0.35 * a); g.fillRect(0, b.c - hw - 8, tk.W, hw * 2 + 16);
          g.fillStyle(BEAM_HOT, 0.85 * a); g.fillRect(0, b.c - hw, tk.W, hw * 2);
          g.fillStyle(0xffffff, a); g.fillRect(0, b.c - hw * 0.3, tk.W, hw * 0.6);
        }
      }
    },
    onPhaseEnd() { bars = []; },
  };
};

// ── Signature: Zenith ────────────────────────────────────────────────
// He hauls on the sun's chain and the sun comes down: a white orb sinking out of the sky toward
// you, its light scorching a widening disc on the floor beneath. It follows you as it sinks,
// slower than a walk, then stops following and lands.

const zenith = (tk: BossToolkit): SignatureMove => {
  let on = false;
  let gx = 0, gy = 0;
  let castAt = 0, followUntil = 0, landAt = 0, landed = 0;
  let tickAt = 0;
  const FALL = 3400;
  const radius = (time: number): number => 30 + clamp((time - castAt) / FALL, 0, 1) * 136;
  return {
    durationMs: 4200,
    windupMs: 700,
    gesture: 'raise',
    hold: 'reach',
    tell: 'ZENITH',
    cast(time) {
      on = true;
      gx = tk.player.x; gy = tk.player.y;
      castAt = time; followUntil = time + 2400; landAt = time + tk.warn(FALL); landed = 0;
      tk.sfx('boss-phase');
    },
    update(time, dt) {
      if (!on) return;
      const p = tk.player;
      if (time < followUntil) {
        const d = dist(gx, gy, p.x, p.y);
        if (d > 1) { const s = Math.min(d, 64 * dt); gx += ((p.x - gx) / d) * s; gy += ((p.y - gy) / d) * s; }
      }
      const r = radius(time);
      if (!landed && time >= tickAt && alive(tk) && dist(p.x, p.y, gx, gy) < r) { tickAt = time + 450; tk.hitPlayer(2, p.x, p.y); }
      if (!landed && time >= landAt) {
        landed = time;
        tk.sfx('explosion-large');
        tk.boom(gx, gy, 170, 0xffffff);
        if (alive(tk) && dist(p.x, p.y, gx, gy) < 170) tk.hitPlayer(12, p.x, p.y);
      }
      if (landed && time > landed + 1400) on = false;
    },
    drawGround(g, time) {
      if (!on) return;
      if (landed) {
        const k = clamp((time - landed) / 1400, 0, 1);
        g.fillStyle(SCORCH_DARK, 0.4 * (1 - k)); g.fillCircle(gx, gy, 170);
        g.fillStyle(SCORCH, 0.4 * (1 - k)); g.fillCircle(gx, gy, 110);
        return;
      }
      const r = radius(time);
      const k = clamp((time - castAt) / Math.max(1, landAt - castAt), 0, 1);
      // The landing zone, ringed in gold, and the widening disc of scorching light.
      g.lineStyle(2, GOLD, 0.3 + k * 0.5); g.strokeCircle(gx, gy, 170);
      for (let i = 0; i < 4; i++) {
        const rr = r * (1 - i * 0.22);
        g.fillStyle(mixC(GOLD_LIT, 0xffffff, i / 3), 0.1 + k * 0.08); g.fillCircle(gx, gy, rr);
      }
      g.lineStyle(3, 0xffffff, 0.7); g.strokeCircle(gx, gy, r);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + time / 900; glint(g, gx + Math.cos(a) * r, gy + Math.sin(a) * r, 4, 0.6); }
    },
    drawAir(g, time) {
      if (!on || landed) return;
      const k = clamp((time - castAt) / Math.max(1, landAt - castAt), 0, 1);
      const oy = TOP - 30 + (gy - 40 - (TOP - 30)) * k * k;
      // The chain, from the top of the sky down to the orb.
      for (let y = TOP - 30; y < oy - 20; y += 12) {
        g.lineStyle(3, IRON_DARK, 1); g.strokeEllipse(gx + Math.sin(y / 40) * 2, y, (y / 12) % 2 < 1 ? 6 : 4, (y / 12) % 2 < 1 ? 9 : 11);
      }
      const R = 22 + k * 20;
      glow(g, gx, oy, R * 3, SUN, 0.07 + k * 0.05, 5);
      sunburst(g, gx, oy, R * 1.7, 18, 0.7, GOLD_LIT);
      g.fillStyle(0xffffff, 1); g.fillCircle(gx, oy, R);
      g.fillStyle(SUN, 1); g.fillCircle(gx - R * 0.2, oy - R * 0.2, R * 0.6);
      // The shaft of light from orb to disc.
      g.fillStyle(SUN, 0.12 + k * 0.1); g.fillTriangle(gx - R, oy, gx + R, oy, gx, gy);
    },
    onPhaseEnd() { on = false; },
  };
};

export const LUMEN_BOSS: WorldBossDef = {
  worldId: 'isle:lumen',
  name: 'Prince Lumen',
  title: 'the Unshadowed',
  color: LUMEN,
  colorLit: LUMEN_LIT,
  colorDark: LUMEN_DARK,
  accent: PRISM_BLUE,
  // Tier 1 of the tenth isle.
  damageMult: 1.3,

  intro: [
    'Stand still. Let me look at you. …There it is. Under your feet. That dark little thing that follows you.',
    'I had one once. Father had it taken off. I have never been afraid since. I have never been anything since.',
  ],
  banter: [
    'Light goes in straight lines. So do I.',
    'You keep putting your shadow between us. It is very rude.',
    'Seven colours in one white. Do you know how hard it is to stay white?',
    'I am everywhere I have been. Look behind you.',
    'The Glass taught me everything. Hold still and it will teach you.',
  ],
  defeatLine: 'THE PRINCE CASTS A SHADOW',
  resumeLine: 'You again. And your shadow. It came back with you. They always do, I suppose.',

  phases: [
    {
      name: 'Prism',
      line: 'Everything is made of light. Let me show you what you are made of.',
      hp: 530,
      cycle: [
        'sig:prism', 'volley', 'sig:mirrors', 'radial', 'sig:prism',
        'homing', 'sig:mirrors', 'sweep',
      ],
      harass: ['h-snipe', 'h-orbs'],
      restMs: 1250,
      harassMs: 3400,
    },
    {
      name: 'Afterimage',
      line: 'Faster, then. Faster than looking. You will only ever see where I was.',
      hp: 610,
      cycle: [
        'sig:afterimage', 'sig:sunbars', 'lanes', 'sig:afterimage',
        'barrage', 'sig:sunbars', 'spiral', 'sig:prism',
      ],
      harass: ['h-snipe', 'h-lane'],
      restMs: 1100,
      harassMs: 3000,
    },
  ],

  hard: {
    introLine: 'THE SUN COMES DOWN ON ITS CHAIN',
    extraPhase: {
      name: 'Zenith',
      line: 'Father pinned it up there for me. I can bring it down for you.',
      hp: 450,
      cycle: [
        'sig:zenith', 'sig:afterimage', 'sig:prism', 'radial',
        'sig:zenith', 'sig:sunbars', 'sig:mirrors', 'homing',
      ],
      harass: ['h-orbs', 'h-rune'],
      restMs: 1000,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 230, spreadRad: 0.45 },
    radial: { count: 16, speed: 190 },
    spiral: { arms: 3, speed: 175 },
    sweep: { halfW: 16 },
  },

  signatures: {
    prism,
    mirrors: giltMirrors,
    afterimage,
    sunbars,
    zenith,
  },

  look: {
    crest: 'halo', pattern: 'facets', aura: 'sparks', hands: 'orb',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: 0xffffff,
  },
  phaseStyles: [
    { movement: 'hover', gimmick: 'none', tint: 'gold' },
    { movement: 'blink', gimmick: 'none', tint: 'pale', look: { aura: 'glitch', hands: 'wisp', mouth: 'none' } },
    { movement: 'anchor', gimmick: 'none', tint: 'hot', look: { crest: 'crown', aura: 'flame', hands: 'gauntlet', mouth: 'grate' } },
  ],

  /**
   * The Unshadowed's tells. Over his head turns a crown of long crystal shards, each throwing a
   * thread of rainbow; in his second hand he holds a prism with a little spectrum fanning out of
   * it. Under his feet is the thing that is *not* there — a dotted outline where his shadow ought
   * to be. In Afterimage three ghost-copies of him trail behind; in Zenith his raised hand holds
   * the sun's chain, running up out of the room, and the crown burns down to a corona.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const zen = s.hard && s.phaseIdx >= 2;
    // The missing shadow.
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.fillStyle(0x6a6a7a, 0.35); g.fillCircle(s.x + Math.cos(a) * R * 0.9, s.y + R * 1.05 + Math.sin(a) * R * 0.28, 1.6);
    }
    // Afterimage ghosts trailing away from you.
    if (s.phaseIdx === 1) {
      for (let i = 3; i >= 1; i--) {
        const bx = s.x - Math.cos(s.facing) * i * 16, by = s.y - Math.sin(s.facing) * i * 16;
        g.fillStyle(SPECTRUM[(i * 2) % 7], 0.12); g.fillCircle(bx, by, R * (1 - i * 0.08));
        g.lineStyle(1.5, LUMEN_LIT, 0.25 / i); g.strokeCircle(bx, by, R * (1 - i * 0.08));
      }
    }
    // The crown of crystal shards (a corona of flame-white rays in Zenith).
    const n = zen ? 16 : 9;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * (zen ? 0.38 : 0.26) + (zen ? Math.sin(s.t / 300 + i) * 0.05 : 0);
      const len = zen ? R * (0.6 + 0.25 * Math.sin(s.t / 120 + i * 1.3)) : R * (i % 2 ? 0.7 : 1.05);
      const bx = s.x + Math.cos(a) * R * 0.85, by = s.y + Math.sin(a) * R * 0.85;
      const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len;
      const w = zen ? 0.09 : 0.06;
      g.fillStyle(zen ? BEAM_HOT : GLASS, 0.95);
      g.fillTriangle(s.x + Math.cos(a - w) * R * 0.85, s.y + Math.sin(a - w) * R * 0.85, s.x + Math.cos(a + w) * R * 0.85, s.y + Math.sin(a + w) * R * 0.85, tx, ty);
      g.lineStyle(1, zen ? 0xffffff : GLASS_EDGE, 0.9); g.lineBetween(bx, by, tx, ty);
      if (!zen) { g.lineStyle(1, SPECTRUM[i % 7], 0.6); g.lineBetween(tx, ty, tx + Math.cos(a + 0.4) * 10, ty + Math.sin(a + 0.4) * 10); }
    }
    // The prism in his second hand, a little spectrum fanning from it.
    const hand = s.hands[1];
    if (hand && !zen) {
      const px = hand.x, py = hand.y - 12;
      g.fillStyle(PRISM_BLUE, 0.85); g.fillTriangle(px - 9, py + 7, px + 9, py + 7, px, py - 10);
      g.fillStyle(0xffffff, 0.8); g.fillTriangle(px - 4, py + 5, px, py + 5, px, py - 6);
      for (let i = 0; i < 7; i++) {
        const a = s.facing + (i - 3) * 0.08;
        g.lineStyle(1.5, SPECTRUM[i], 0.5 + s.castGlow * 0.4);
        g.lineBetween(px + 6, py, px + 6 + Math.cos(a) * (18 + s.castGlow * 20), py + Math.sin(a) * (18 + s.castGlow * 20));
      }
    }
    // Zenith: the sun's chain held in his raised hand, running up out of the room.
    const h0 = s.hands[0];
    if (zen && h0) {
      for (let y = h0.y - 6; y > TOP - 20; y -= 12) {
        g.lineStyle(2.5, IRON_DARK, 1); g.strokeEllipse(h0.x + Math.sin(y / 30 + s.t / 400) * 2, y, ((h0.y - y) / 12) % 2 < 1 ? 5 : 3, ((h0.y - y) / 12) % 2 < 1 ? 8 : 10);
      }
    }
    if (s.castGlow > 0.1) glow(g, s.x, s.y, R * 1.6, 0xffffff, 0.05 * s.castGlow, 3);
    if (s.enraged) { g.lineStyle(1.5, LUMEN_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The Solarium floor: white marble laid in a great chequer of polished and honed squares, a
   * gilt sunburst inlaid at the heart, the glass-and-mirror wall of the hall along the top, and
   * the crystal dome's rainbows lying across the floor in long slanting bands. A crystal prism
   * stands on a plinth in each corner. Nothing on this floor has ever cast a shadow.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x1a7e11);
    const T = 64;
    g.fillStyle(GROUT, 1); g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += T) {
      for (let x = 0; x < W; x += T) {
        const k = ((x / T) + (y / T)) % 2;
        g.fillStyle(k ? MARBLE_LIT : MARBLE, 1); g.fillRect(x + 1, y + 1, T - 2, T - 2);
        if (rng() < 0.5) { g.lineStyle(1, VEIN, 0.3); g.lineBetween(x + rng() * T, y + 2, x + rng() * T, y + T - 2); }
        g.fillStyle(GOLD, 0.5); g.fillRect(x - 2, y - 2, 4, 4);
      }
    }
    // Rainbows from the dome, in slanting bands.
    for (let b = 0; b < 3; b++) {
      const x0 = 120 + b * 300 + rng() * 60;
      for (let i = 0; i < SPECTRUM.length; i++) {
        g.lineStyle(9, SPECTRUM[i], 0.07);
        g.lineBetween(x0 + i * 9, 100, x0 + i * 9 + 260, H);
      }
    }
    // The heart of the floor.
    sunburstInlay(g, W / 2, (H + 100) / 2, 240, 24, 0.62, 0.7);
    g.fillStyle(MARBLE_LIT, 1); g.fillEllipse(W / 2, (H + 100) / 2, 60, 38);
    g.lineStyle(3, GOLD, 0.8); g.strokeEllipse(W / 2, (H + 100) / 2, 60, 38);
    // The glass-and-mirror wall under the HUD.
    g.fillStyle(GLASS, 1); g.fillRect(0, 0, W, 104);
    for (let x = 0; x < W; x += 60) {
      const mirror = (x / 60) % 3 === 1;
      g.fillStyle(mirror ? mixC(GLASS_EDGE, 0xffffff, 0.45) : GLASS, 1); g.fillRect(x, 0, 60, 104);
      if (mirror) { g.fillStyle(0xffffff, 0.6); g.fillTriangle(x + 4, 8, x + 40, 8, x + 4, 70); }
      g.fillStyle(0xffffff, 0.5); g.fillRect(x + 6, 4, 2, 96);
      g.lineStyle(4, GOLD_DARK, 1); g.lineBetween(x, 0, x, 104);
      g.lineStyle(1.5, GOLD_LIT, 1); g.lineBetween(x + 2, 0, x + 2, 104);
    }
    g.fillStyle(MARBLE_DEEP, 1); g.fillRect(0, 100, W, 10);
    g.fillStyle(MARBLE_LIT, 1); g.fillRect(0, 100, W, 4);
    for (let x = 20; x < W; x += 40) sunburst(g, x, 106, 4, 8, 0.9);
    // Prisms on plinths in the corners.
    for (const [x, y] of [[44, 150], [W - 44, 150], [44, H - 40], [W - 44, H - 40]] as [number, number][]) {
      g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 14, y - 22, 28, 22);
      g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 13, y - 22, 26, 3);
      g.fillStyle(PRISM_BLUE, 0.8); g.fillTriangle(x - 12, y - 22, x + 12, y - 22, x, y - 48);
      g.fillStyle(0xffffff, 0.8); g.fillTriangle(x - 6, y - 23, x, y - 23, x, y - 42);
      for (let i = 0; i < SPECTRUM.length; i++) {
        const a = (x < W / 2 ? 0.3 : Math.PI - 0.3) + (i - 3) * 0.05;
        g.lineStyle(2, SPECTRUM[i], 0.25); g.lineBetween(x, y - 34, x + Math.cos(a) * 120, y - 34 + Math.sin(a) * 120);
      }
    }
    // A gilt border.
    g.lineStyle(6, GOLD_DARK, 1); g.strokeRect(3, 110, W - 6, H - 113);
    g.lineStyle(2, GOLD_LIT, 1); g.strokeRect(6, 113, W - 12, H - 119);
  },
};
