import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mulberry, type G } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import { soulLantern, soulWisp } from './art';
import {
  BRASS, BRASS_DARK, BRASS_LIT, CREPE, GOLD, GOLD_LIT, IRON, LIME, LIME_DARK, LIME_DEEP, LIME_LIT, SOUL, SOUL_DARK,
  SOUL_DEEP, SOUL_LIT, SOULFIRE, SOULFIRE_LIT, WISP, WISP_DARK, WISP_LIT, WISP_WICK,
} from './palette';
import { alongPath, clamp, dist, segDist, wrapAngle } from './util';

/**
 * Prince Wisp, the Lamplighter — Radiance of the Lantern Court.
 *
 * When Wisp was six, before the Noon, his little sister walked out one night and was not found
 * until morning, at the bottom of a dry well. He had been holding her hand in the dark and let go.
 * When Auriel pinned the sun, he made the boy a promise: no one would ever be lost in the dark
 * again. Wisp has kept it for twenty-two years. Every soul on Solmara is caught on its last breath
 * and hung in a lantern; he trims the Columbarium's ten thousand wicks himself. In its lowest niche
 * he keeps a small lantern that has always been empty. He fights like a man carrying a light:
 *
 * • **Lantern Bearer** (hovering): he swings the great lantern on its pole in pendulum arcs and
 *   souls stream out along the swing; he opens its four shutters and throws four wedges of light
 *   that turn and flare; and he lowers lanterns on wires from the dark overhead, which drop, shatter
 *   and spill their souls.
 * • **Unbound** (lunging, the cold tint): he sets the lantern down and becomes a ghost. He can only
 *   be struck inside the lantern's light, and the lost souls file after him in a trail. He glides
 *   back to tend the lantern, leads processions of the lost across the floor, and kicks the lantern
 *   to a new spot, spilling hunting souls.
 * • **Soulfire** (hard, stalking): he picks the lantern up again and it burns green-blue: tongues of
 *   soulfire creep in from the edges and converge where you stood, and the Columbarium's tiles flare
 *   in a chequer, half and then the other half.
 */

const TOP = 96;
/** In the Unbound phase, he is solid only within this far of the lantern. */
const NEAR = 180;

/** The great lantern, set down in the Unbound phase. One per fight: reset when the fight's moves are made. */
interface Lantern { x: number; y: number; down: boolean; fromX: number; fromY: number; moveAt: number; moveMs: number }
const LANTERN: Lantern = { x: 480, y: 360, down: false, fromX: 480, fromY: 360, moveAt: 0, moveMs: 0 };
/** The angle of the pendulum while it swings (null = the lantern hangs at his side). */
let swingA: number | null = null;

const lanternAt = (time: number): Pt => {
  if (LANTERN.moveMs <= 0 || time >= LANTERN.moveAt + LANTERN.moveMs) return { x: LANTERN.x, y: LANTERN.y };
  const k = clamp((time - LANTERN.moveAt) / LANTERN.moveMs, 0, 1);
  return { x: LANTERN.fromX + (LANTERN.x - LANTERN.fromX) * k, y: LANTERN.fromY + (LANTERN.y - LANTERN.fromY) * k - Math.sin(k * Math.PI) * 60 };
};

/** The bright glint on glass panes. */
const GLASS_SHINE = 0xffffff;

const playerUp = (tk: BossToolkit): boolean => tk.player.active && tk.player.hp > 0;

/** The great lantern itself, drawn big: a brass crown, four leaded panes, a soul the size of a fist. */
function greatLantern(g: G, x: number, y: number, s: number, t: number, fire = false, open = 0): void {
  const core = fire ? SOULFIRE : SOUL;
  glow(g, x, y + 22 * s, 60 * s, core, 0.06, 4);
  g.fillStyle(BRASS_DARK, 1); g.fillTriangle(x - 20 * s, y + 4 * s, x + 20 * s, y + 4 * s, x, y - 14 * s);
  g.fillStyle(BRASS, 1); g.fillTriangle(x - 15 * s, y + 3 * s, x + 6 * s, y + 3 * s, x, y - 12 * s);
  g.lineStyle(2 * s, IRON, 1); g.strokeCircle(x, y - 17 * s, 4 * s);
  g.fillStyle(dim(core, 0.55), 0.95); g.fillRect(x - 16 * s, y + 4 * s, 32 * s, 38 * s);
  const fl = Math.sin(t * 8) * 2 * s;
  g.fillStyle(lit(core, 0.4), 0.95);
  g.fillTriangle(x - 8 * s, y + 30 * s, x + 8 * s, y + 30 * s, x + fl, y + 8 * s);
  g.fillCircle(x, y + 28 * s, 8 * s);
  g.fillStyle(fire ? SOULFIRE_LIT : SOUL_LIT, 1); g.fillCircle(x, y + 27 * s, 4 * s);
  g.fillStyle(SOUL_DARK, 0.8); g.fillCircle(x - 3 * s, y + 25 * s, 1.3 * s); g.fillCircle(x + 3 * s, y + 25 * s, 1.3 * s);
  // Panes: shutters hinged at the corners, swung back by `open`.
  g.lineStyle(2 * s, BRASS_DARK, 1); g.strokeRect(x - 16 * s, y + 4 * s, 32 * s, 38 * s);
  g.lineBetween(x, y + 4 * s, x, y + 42 * s); g.lineBetween(x - 16 * s, y + 23 * s, x + 16 * s, y + 23 * s);
  if (open > 0) {
    for (const k of [-1, 1]) {
      g.fillStyle(BRASS, 0.9);
      g.fillRect(x + k * 16 * s + (k < 0 ? -10 * s * open : 0), y + 6 * s, 10 * s * open, 34 * s);
    }
  }
  g.fillStyle(GLASS_SHINE, 0.5); g.fillRect(x - 12 * s, y + 8 * s, 2 * s, 12 * s);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 18 * s, y + 42 * s, 36 * s, 5 * s);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y + 50 * s, 3 * s);
}

// ── Signature: Pendulum ──────────────────────────────────────────────
// He plants and swings the great lantern on its pole, side to side across you. First the swing is
// only light — a cone sweeping the floor — then souls stream out of it all along the arc.

const pendulum = (tk: BossToolkit): SignatureMove => {
  let start = -1;
  let centre = 0;
  let lastSpawn = 0;
  const WARN = 800, RUN = 2600, AMP = 0.9, PERIOD = 1500;
  const angleAt = (time: number) => centre + AMP * Math.sin(((time - start) / PERIOD) * Math.PI * 2);
  return {
    durationMs: WARN + RUN + 250,
    windupMs: 500,
    gesture: 'sweep',
    locksBody: true,
    tell: 'THE LANTERN SWINGS',
    cast(time) {
      start = time;
      centre = tk.angleToPlayer();
      lastSpawn = 0;
      tk.sfx('whoosh');
    },
    update(time) {
      if (start < 0) { swingA = null; return; }
      const w = tk.warn(WARN);
      if (time > start + w + RUN) { start = -1; swingA = null; return; }
      swingA = angleAt(time);
      if (time < start + w) return;
      if (time - lastSpawn >= (tk.hard ? 95 : 120)) {
        lastSpawn = time;
        const a = swingA;
        tk.spawnBullet({
          x: tk.bossX + Math.cos(a) * 56, y: tk.bossY + Math.sin(a) * 56, angle: a + (Math.random() - 0.5) * 0.1,
          speed: 230, damage: 8, r: 7, lifeMs: 3500, color: tk.phase >= 2 ? SOULFIRE : SOUL,
        });
        if (Math.random() < 0.12) tk.sfx('wings');
      }
    },
    drawGround(g, time) {
      if (start < 0) return;
      const w = tk.warn(WARN);
      const a = angleAt(time);
      const live = time >= start + w;
      // The whole arc of the swing, chalked faintly while it winds up.
      if (!live) {
        const k = clamp((time - start) / w, 0, 1);
        for (const s of [-1, 1]) {
          const b = centre + s * AMP;
          g.lineStyle(1.5, SOUL, 0.2 + k * 0.4);
          g.lineBetween(tk.bossX, tk.bossY, tk.bossX + Math.cos(b) * 520, tk.bossY + Math.sin(b) * 520);
        }
      }
      // The cone of lantern-light on the floor.
      const L = 520, half = 0.2;
      g.fillStyle(tk.phase >= 2 ? SOULFIRE : SOUL, live ? 0.2 : 0.1);
      g.fillTriangle(tk.bossX, tk.bossY, tk.bossX + Math.cos(a - half) * L, tk.bossY + Math.sin(a - half) * L, tk.bossX + Math.cos(a + half) * L, tk.bossY + Math.sin(a + half) * L);
      g.fillStyle(SOUL_LIT, live ? 0.12 : 0.05);
      g.fillTriangle(tk.bossX, tk.bossY, tk.bossX + Math.cos(a - half * 0.4) * L, tk.bossY + Math.sin(a - half * 0.4) * L, tk.bossX + Math.cos(a + half * 0.4) * L, tk.bossY + Math.sin(a + half * 0.4) * L);
    },
    drawAir(g, time) {
      if (start < 0) return;
      const a = angleAt(time);
      const hx = tk.bossX + Math.cos(a) * 20, hy = tk.bossY - 20;
      const lx = tk.bossX + Math.cos(a) * 56, ly = tk.bossY + Math.sin(a) * 56 - 30;
      g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(hx, hy, lx, ly - 10);
      g.lineStyle(1.5, IRON, 1); g.lineBetween(lx, ly - 10, lx, ly);
      greatLantern(g, lx, ly, 0.7, time / 1000, tk.phase >= 2);
    },
    onPhaseEnd() { start = -1; swingA = null; },
  };
};

// ── Signature: Open the Shutters ─────────────────────────────────────
// He throws back the lantern's four shutters and four wedges of light fall from him across the
// floor, turning as they charge. They flare; then the panes turn an eighth and flare again.

interface Flare { at: number; a: number; dealt: boolean }

const shutters = (tk: BossToolkit): SignatureMove => {
  let flares: Flare[] = [];
  let ox = 0, oy = 0, castAt = 0, dir = 1, base = 0;
  const HALF = 0.3, L = 680;
  const angleOf = (f: Flare, time: number) => (f.dealt ? f.a : f.a - dir * 0.35 * clamp((f.at - time) / tk.warn(1300), 0, 1));
  return {
    durationMs: 2900,
    windupMs: 600,
    gesture: 'raise',
    hold: 'brace',
    locksBody: true,
    tell: 'OPEN THE SHUTTERS',
    cast(time) {
      ox = tk.bossX; oy = tk.bossY; castAt = time;
      dir = Math.random() < 0.5 ? 1 : -1;
      base = tk.angleToPlayer() + Math.PI / 4 + (Math.random() - 0.5) * 0.4;
      flares = [
        { at: time + tk.warn(1300), a: base, dealt: false },
        { at: time + tk.warn(1300) + tk.warn(900), a: base + Math.PI / 4, dealt: false },
      ];
      tk.sfx('beam-charge');
    },
    update(time) {
      const p = tk.player;
      for (const f of flares) {
        if (f.dealt || time < f.at) continue;
        f.dealt = true;
        tk.sfx('light-beam');
        if (!playerUp(tk)) continue;
        const pa = Math.atan2(p.y - oy, p.x - ox), pd = dist(p.x, p.y, ox, oy);
        for (let k = 0; k < 4; k++) {
          if (pd < L && pd > 24 && Math.abs(wrapAngle(pa - (f.a + (k * Math.PI) / 2))) < HALF + 12 / Math.max(60, pd)) { tk.hitPlayer(13, p.x, p.y); break; }
        }
      }
      flares = flares.filter((f) => !f.dealt || time < f.at + 450);
    },
    drawGround(g, time) {
      for (const f of flares) {
        const a0 = angleOf(f, time);
        const k = f.dealt ? 1 : clamp(1 - (f.at - time) / tk.warn(1300), 0, 1);
        const fade = f.dealt ? clamp(1 - (time - f.at) / 450, 0, 1) : 1;
        for (let q = 0; q < 4; q++) {
          const a = a0 + (q * Math.PI) / 2;
          const c = f.dealt ? 0xffffff : SOUL;
          g.fillStyle(c, (f.dealt ? 0.55 : 0.08 + k * 0.16) * fade);
          g.fillTriangle(ox, oy, ox + Math.cos(a - HALF) * L, oy + Math.sin(a - HALF) * L, ox + Math.cos(a + HALF) * L, oy + Math.sin(a + HALF) * L);
          if (!f.dealt) {
            g.lineStyle(1.5, SOUL_LIT, 0.3 + k * 0.5);
            g.lineBetween(ox, oy, ox + Math.cos(a - HALF) * L, oy + Math.sin(a - HALF) * L);
            g.lineBetween(ox, oy, ox + Math.cos(a + HALF) * L, oy + Math.sin(a + HALF) * L);
            // Leading-lines across the wedge, like light through a leaded pane.
            for (let r = 80; r < L; r += 90) {
              g.lineStyle(1, SOUL_DEEP, 0.25 * k);
              g.lineBetween(ox + Math.cos(a - HALF) * r, oy + Math.sin(a - HALF) * r, ox + Math.cos(a + HALF) * r, oy + Math.sin(a + HALF) * r);
            }
          }
        }
      }
    },
    drawAir(g, time) {
      if (!flares.length) return;
      const open = clamp((time - castAt) / 400, 0, 1);
      greatLantern(g, ox, oy - 64, 0.6, time / 1000, tk.phase >= 2, open);
    },
    onPhaseEnd() { flares = []; },
  };
};

// ── Signature: Hang Them High ────────────────────────────────────────
// Lanterns come down on wires out of the glare overhead, one over you and four round you, swinging.
// Each one drops on its mark and shatters, and its soul bursts out in a little ring.

interface Hung { x: number; y: number; bornAt: number; dropAt: number; dealt: boolean; sway: number }

const hang = (tk: BossToolkit): SignatureMove => {
  let hung: Hung[] = [];
  const R = 46;
  return {
    durationMs: 2000,
    windupMs: 600,
    gesture: 'point',
    tell: 'HANG THEM HIGH',
    cast(time) {
      const p = tk.player;
      const rot = Math.random() * Math.PI * 2;
      const pts: Pt[] = [{ x: p.x, y: p.y }];
      for (let i = 0; i < 4; i++) { const a = rot + (i / 4) * Math.PI * 2; pts.push({ x: p.x + Math.cos(a) * 150, y: p.y + Math.sin(a) * 120 }); }
      hung = pts.map((q, i) => ({
        x: tk.clampX(q.x, 50), y: clamp(q.y, TOP + 60, tk.H - 40), bornAt: time,
        dropAt: time + tk.warn(1150) + (i === 0 ? 0 : 200 + i * 160), dealt: false, sway: Math.random() * 6,
      }));
      tk.sfx('chain');
    },
    update(time) {
      const p = tk.player;
      for (const h of hung) {
        if (h.dealt || time < h.dropAt) continue;
        h.dealt = true;
        tk.sfx('crystal-shatter');
        if (playerUp(tk) && dist(p.x, p.y, h.x, h.y) < R + 14) tk.hitPlayer(12, p.x, p.y);
        for (let k = 0; k < 6; k++) tk.spawnBullet({ x: h.x, y: h.y, angle: (k / 6) * Math.PI * 2 + h.sway, speed: 150, damage: 6, r: 6, lifeMs: 2400, color: SOUL });
      }
      hung = hung.filter((h) => !h.dealt || time < h.dropAt + 500);
    },
    drawGround(g, time) {
      for (const h of hung) {
        if (h.dealt) {
          const k = clamp((time - h.dropAt) / 500, 0, 1);
          g.fillStyle(SOUL_LIT, 0.4 * (1 - k)); g.fillCircle(h.x, h.y, R * (1 + k * 0.4));
          for (let i = 0; i < 8; i++) { const a = i * 0.8 + h.sway; g.fillStyle(0xffffff, 0.8 * (1 - k)); g.fillTriangle(h.x + Math.cos(a) * 10, h.y + Math.sin(a) * 6, h.x + Math.cos(a + 0.2) * (14 + k * 30), h.y + Math.sin(a + 0.2) * (8 + k * 18), h.x + Math.cos(a) * (18 + k * 34), h.y + Math.sin(a) * (10 + k * 20)); }
          continue;
        }
        const k = clamp((time - h.bornAt) / Math.max(1, h.dropAt - h.bornAt), 0, 1);
        g.fillStyle(SOUL, 0.08 + k * 0.18); g.fillCircle(h.x, h.y, R);
        g.lineStyle(1.5, SOUL_LIT, 0.3 + k * 0.6); g.strokeCircle(h.x, h.y, R);
        g.fillStyle(0x000000, 0.12 + k * 0.2); g.fillEllipse(h.x, h.y, 16 + k * 14, 6 + k * 5);
      }
    },
    drawAir(g, time) {
      for (const h of hung) {
        if (h.dealt) continue;
        const k = clamp((time - h.bornAt) / Math.max(1, h.dropAt - h.bornAt), 0, 1);
        const sw = Math.sin(time / 260 + h.sway) * 10 * (1 - k);
        const ly = TOP + (h.y - 70 - TOP) * Math.min(1, k * 1.4);
        g.lineStyle(1.2, IRON, 0.8); g.lineBetween(h.x, TOP, h.x + sw, ly);
        soulLantern(g, h.x + sw, ly, 1.3, 1, time / 1000);
      }
    },
    onPhaseEnd() { hung = []; },
  };
};

// ── Passive: the Unbound ghost ───────────────────────────────────────
// Not in any cycle. It sets the lantern down as the Unbound phase begins and picks it up after;
// while it is down he is only solid inside its light, and the lost souls trail after him.

const ghost = (tk: BossToolkit): SignatureMove => {
  LANTERN.down = false; LANTERN.moveMs = 0; swingA = null;
  let trail: Pt[] = [];
  let lastStamp = 0;
  let lastHit = 0;
  const SOULS = 7, GAP = 34;
  const soulsAlong = (): Pt[] => {
    const out: Pt[] = [];
    let acc = 0, want = GAP, i = trail.length - 1;
    while (i > 0 && out.length < SOULS) {
      const a = trail[i], b = trail[i - 1];
      const l = dist(a.x, a.y, b.x, b.y);
      if (acc + l >= want) {
        const k = (want - acc) / (l || 1);
        out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
        want += GAP;
      } else { acc += l; i--; }
    }
    return out;
  };
  return {
    durationMs: 0,
    cast() { /* passive */ },
    update(time) {
      if (tk.phase === 1 && !LANTERN.down) {
        LANTERN.down = true;
        LANTERN.x = clamp(tk.bossX, 160, tk.W - 160); LANTERN.y = clamp(tk.bossY + 30, TOP + 110, tk.H - 90);
        LANTERN.moveMs = 0;
        trail = [];
        tk.boom(LANTERN.x, LANTERN.y, 60, SOUL);
        tk.sfx('hush');
      } else if (tk.phase !== 1 && LANTERN.down) {
        LANTERN.down = false;
        trail = [];
      }
      if (!LANTERN.down) return;
      if (time - lastStamp > 30) {
        lastStamp = time;
        trail.push({ x: tk.bossX, y: tk.bossY + 10 });
        if (trail.length > 160) trail.shift();
      }
      if (playerUp(tk) && time - lastHit > 700) {
        const p = tk.player;
        if (soulsAlong().some((s) => dist(s.x, s.y, p.x, p.y) < 11 + 20)) { lastHit = time; tk.hitPlayer(7, p.x, p.y); tk.sfx('screech'); }
      }
    },
    takenMult() {
      if (tk.phase !== 1 || !LANTERN.down) return 1;
      const l = lanternAt(tk.now);
      return dist(tk.bossX, tk.bossY, l.x, l.y) < NEAR ? 1 : 0;
    },
    drawGround(g, time) {
      if (!LANTERN.down) return;
      const l = lanternAt(time);
      // The lantern's pool of light: the one place he is solid.
      const solid = dist(tk.bossX, tk.bossY, l.x, l.y) < NEAR;
      g.fillStyle(SOUL, solid ? 0.16 : 0.09); g.fillCircle(l.x, l.y, NEAR);
      g.fillStyle(SOUL_LIT, 0.06); g.fillCircle(l.x, l.y, NEAR * 0.55);
      g.lineStyle(2, solid ? GOLD_LIT : SOUL_LIT, 0.55 + Math.sin(time / 200) * 0.15); g.strokeCircle(l.x, l.y, NEAR);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + time / 4000;
        g.fillStyle(SOUL_LIT, 0.5); g.fillCircle(l.x + Math.cos(a) * NEAR, l.y + Math.sin(a) * NEAR, 2);
      }
      g.fillStyle(0x000000, 0.25); g.fillEllipse(l.x, l.y + 4, 46, 12);
    },
    drawAir(g, time) {
      if (!LANTERN.down) return;
      const l = lanternAt(time);
      greatLantern(g, l.x, l.y - 52, 0.85, time / 1000);
      // The lost souls, filing after him.
      const t = time / 1000;
      soulsAlong().forEach((s, i) => soulWisp(g, s.x, s.y - 14, 8 - i * 0.4, t + i * 0.7, i % 2 ? SOUL : lit(SOUL, 0.2), 0.85, i === 0, Math.atan2(tk.bossY - s.y, tk.bossX - s.x)));
    },
    onPhaseEnd() { trail = []; },
  };
};

// ── Signature: Back to the Light ─────────────────────────────────────
// He glides back to the lantern along a lane you can see, and kneels to tend it: the lantern pulses
// out a ring of soul-light with one gap. While he kneels he is in its light — strike him there.

const tend = (tk: BossToolkit): SignatureMove => {
  let pulseAt = 0;
  let kneelUntil = 0;
  return {
    durationMs: 3200,
    windupMs: 450,
    gesture: 'point',
    hold: 'reach',
    locksBody: true,
    tell: 'BACK TO THE LIGHT',
    cast(time) {
      const l = lanternAt(time);
      const a = Math.atan2(tk.bossY - l.y, tk.bossX - l.x);
      const tx = l.x + Math.cos(a) * 56, ty = l.y + Math.sin(a) * 40;
      tk.spawnCharge({ toX: tk.clampX(tx, 60), toY: clamp(ty, 118, tk.H - 74), warnMs: 650, travelMs: 520, halfW: 28, damage: 11 });
      pulseAt = time + tk.warn(650) + 520 + 350;
      kneelUntil = time + 3200;
      tk.sfx('wings');
    },
    update(time) {
      if (!pulseAt || time < pulseAt) return;
      pulseAt = 0;
      const l = lanternAt(time);
      tk.spawnRing({ cx: l.x, cy: l.y, delayMs: 250, speed: 270, gapCentre: tk.angleToPlayer(l.x, l.y) + (Math.random() - 0.5) * 1.6, gapHalf: 0.5, band: 18, damage: 10 });
      tk.sfx('holy-chord');
    },
    drawAir(g, time) {
      if (time > kneelUntil || pulseAt) return;
      const l = lanternAt(time);
      g.lineStyle(2, GOLD_LIT, 0.5 + Math.sin(time / 90) * 0.3); g.lineBetween(tk.bossX, tk.bossY - 10, l.x, l.y - 40);
    },
    onPhaseEnd() { pulseAt = 0; kneelUntil = 0; },
  };
};

// ── Signature: The Procession ────────────────────────────────────────
// A column of the lost files in from one edge, along a path chalked first in little footprints of
// light, bends through where you stand, and files out the other side.

const procession = (tk: BossToolkit): SignatureMove => {
  let path: Pt[] = [];
  let startAt = 0;
  let lastHit = 0;
  const N = 9, GAP = 46, SPEED = 175;
  let len = 0;
  return {
    durationMs: 1600,
    windupMs: 550,
    gesture: 'point',
    hold: 'conduct',
    tell: 'THE PROCESSION',
    cast(time) {
      const p = tk.player;
      const fromLeft = p.x > tk.W / 2;
      const y0 = TOP + 60 + Math.random() * (tk.H - TOP - 140), y2 = TOP + 60 + Math.random() * (tk.H - TOP - 140);
      path = [
        { x: fromLeft ? -20 : tk.W + 20, y: y0 },
        { x: fromLeft ? p.x * 0.5 : p.x + (tk.W - p.x) * 0.5, y: (y0 + p.y) / 2 },
        { x: p.x, y: p.y },
        { x: fromLeft ? tk.W + 20 : -20, y: y2 },
      ];
      len = 0;
      for (let i = 1; i < path.length; i++) len += dist(path[i - 1].x, path[i - 1].y, path[i].x, path[i].y);
      startAt = time + tk.warn(1200);
      tk.sfx('heartbeat');
    },
    update(time) {
      if (!path.length || time < startAt) return;
      const head = ((time - startAt) / 1000) * SPEED;
      if (head - (N - 1) * GAP > len + 40) { path = []; return; }
      if (!playerUp(tk) || time - lastHit < 650) return;
      const p = tk.player;
      for (let i = 0; i < N; i++) {
        const d = head - i * GAP;
        if (d < 0 || d > len) continue;
        const s = alongPath(path, d / len);
        if (dist(s.x, s.y, p.x, p.y) < 13 + 20) { lastHit = time; tk.hitPlayer(10, p.x, p.y); tk.sfx('screech'); break; }
      }
    },
    drawGround(g, time) {
      if (!path.length) return;
      // Footprints of light along the way, appearing one after another.
      const k = clamp(1 - (startAt - time) / tk.warn(1200), 0, 1);
      const steps = Math.floor(len / 26);
      for (let i = 0; i < steps; i++) {
        if (i / steps > k + 0.05) break;
        const s = alongPath(path, i / steps);
        const side = i % 2 ? 1 : -1;
        const nx = -Math.sin(s.a) * 6 * side, ny = Math.cos(s.a) * 6 * side;
        g.fillStyle(SOUL_LIT, 0.45); g.fillEllipse(s.x + nx, s.y + ny, 7, 4);
      }
    },
    drawAir(g, time) {
      if (!path.length || time < startAt) return;
      const head = ((time - startAt) / 1000) * SPEED;
      const t = time / 1000;
      for (let i = 0; i < N; i++) {
        const d = head - i * GAP;
        if (d < 0 || d > len) continue;
        const s = alongPath(path, d / len);
        // Each of the lost: a hooded little shade carrying its own tiny light.
        g.fillStyle(0x000000, 0.12); g.fillEllipse(s.x, s.y + 6, 20, 6);
        soulWisp(g, s.x, s.y - 12, 10, t + i, i % 3 === 0 ? lit(SOUL, 0.2) : SOUL, 0.85, false, s.a);
        g.fillStyle(CREPE, 0.6); g.fillTriangle(s.x - 9, s.y - 14, s.x + 9, s.y - 14, s.x, s.y - 30);
      }
    },
    onPhaseEnd() { path = []; },
  };
};

// ── Signature: Spilled Light ─────────────────────────────────────────
// He kicks the lantern across the floor to a new spot far from you; souls spill out of it where it
// stood and come hunting, slow and curling.

const spill = (tk: BossToolkit): SignatureMove => ({
  durationMs: 1500,
  windupMs: 500,
  gesture: 'recoil',
  tell: 'MIND THE LIGHT',
  cast(time) {
    if (!LANTERN.down) {
      for (let k = 0; k < 5; k++) tk.spawnBullet({ x: tk.bossX, y: tk.bossY, angle: tk.angleToPlayer() + (k - 2) * 0.5, speed: 140, damage: 8, r: 7, turn: 1.4, lifeMs: 4200, color: SOUL });
      return;
    }
    const from = lanternAt(time);
    const p = tk.player;
    let best: Pt = from, bs = -1;
    for (let i = 0; i < 10; i++) {
      const c = { x: 160 + Math.random() * (tk.W - 320), y: TOP + 110 + Math.random() * (tk.H - TOP - 200) };
      const s = Math.min(dist(c.x, c.y, p.x, p.y), 420) + Math.min(dist(c.x, c.y, from.x, from.y), 300) * 0.5;
      if (s > bs) { bs = s; best = c; }
    }
    LANTERN.fromX = from.x; LANTERN.fromY = from.y;
    LANTERN.x = best.x; LANTERN.y = best.y;
    LANTERN.moveAt = time; LANTERN.moveMs = 700;
    for (let k = 0; k < 5; k++) {
      tk.spawnBullet({ x: from.x, y: from.y - 20, angle: (k / 5) * Math.PI * 2 + Math.random() * 0.4, speed: 135, damage: 8, r: 7, turn: 1.5, lifeMs: 4200, color: SOUL_LIT });
    }
    tk.sfx('clang');
  },
});

// ── Signature: Soulfire (hard) ───────────────────────────────────────
// Eight tongues of green-blue soulfire start at the edges and creep in toward where you stood, each
// leaving a burning track behind it; when they meet, the spot bursts. Slip out between the tracks.

interface Tongue { sx: number; sy: number }

const soulfire = (tk: BossToolkit): SignatureMove => {
  let tongues: Tongue[] = [];
  let P: Pt = { x: 0, y: 0 };
  let castAt = 0, creepAt = 0, meetAt = 0, burst = false;
  let lastHit = 0;
  const CREEP = 2600, LINGER = 1300;
  const headOf = (t: Tongue, time: number): Pt => {
    const k = clamp((time - creepAt) / CREEP, 0, 1);
    return { x: t.sx + (P.x - t.sx) * k, y: t.sy + (P.y - t.sy) * k };
  };
  return {
    durationMs: 2400,
    windupMs: 600,
    gesture: 'slam',
    tell: 'SOULFIRE',
    cast(time) {
      const p = tk.player;
      P = { x: p.x, y: p.y };
      castAt = time; creepAt = time + tk.warn(800); meetAt = creepAt + CREEP; burst = false;
      const rot = Math.random() * Math.PI;
      tongues = [];
      for (let i = 0; i < 8; i++) {
        const a = rot + (i / 8) * Math.PI * 2;
        const c = Math.cos(a), s = Math.sin(a);
        const tx = c > 0 ? (tk.W - 24 - P.x) / c : c < 0 ? (24 - P.x) / c : Infinity;
        const ty = s > 0 ? (tk.H - 20 - P.y) / s : s < 0 ? (TOP + 8 - P.y) / s : Infinity;
        const r = Math.min(tx, ty);
        tongues.push({ sx: P.x + c * r, sy: P.y + s * r });
      }
      tk.sfx('inferno');
    },
    update(time) {
      if (!tongues.length) return;
      if (!burst && time >= meetAt) {
        burst = true;
        tk.explode(P.x, P.y, 92, 14, SOULFIRE);
        tk.sfx('explosion-medium');
      }
      if (time > meetAt + LINGER) { tongues = []; return; }
      if (time < creepAt || !playerUp(tk) || time - lastHit < 600) return;
      const p = tk.player;
      for (const t of tongues) {
        const h = headOf(t, time);
        if (segDist(p.x, p.y, t.sx, t.sy, h.x, h.y) < 12 + 18) { lastHit = time; tk.hitPlayer(9, p.x, p.y); tk.slowPlayer(0.75, 400); break; }
      }
    },
    drawGround(g, time) {
      if (!tongues.length) return;
      const t = time / 1000;
      const fade = time > meetAt ? clamp(1 - (time - meetAt) / LINGER, 0, 1) : 1;
      if (time < creepAt) {
        const k = clamp((time - castAt) / Math.max(1, creepAt - castAt), 0, 1);
        for (const tg of tongues) { g.lineStyle(1.5, SOULFIRE, 0.15 + k * 0.35); g.lineBetween(tg.sx, tg.sy, P.x, P.y); }
      }
      // The meeting point: a ring that tightens as the tongues close.
      if (!burst) {
        const k = clamp((time - castAt) / Math.max(1, meetAt - castAt), 0, 1);
        g.fillStyle(SOULFIRE, 0.06 + k * 0.16); g.fillCircle(P.x, P.y, 92);
        g.lineStyle(2, SOULFIRE_LIT, 0.4 + k * 0.5); g.strokeCircle(P.x, P.y, 92 * (1.5 - k * 0.5));
      }
      for (const tg of tongues) {
        if (time < creepAt) continue;
        const h = headOf(tg, time);
        g.lineStyle(14, SOULFIRE, 0.22 * fade); g.lineBetween(tg.sx, tg.sy, h.x, h.y);
        g.lineStyle(5, SOULFIRE_LIT, 0.5 * fade); g.lineBetween(tg.sx, tg.sy, h.x, h.y);
        // Flickering flame licks along the track.
        const L = dist(tg.sx, tg.sy, h.x, h.y);
        for (let d = 10; d < L; d += 22) {
          const k = d / Math.max(1, L);
          const fx = tg.sx + (h.x - tg.sx) * k, fy = tg.sy + (h.y - tg.sy) * k;
          const fl = 6 + Math.sin(t * 12 + d) * 3;
          g.fillStyle(SOULFIRE_LIT, 0.6 * fade); g.fillTriangle(fx - 4, fy, fx + 4, fy, fx + Math.sin(t * 9 + d) * 2, fy - fl);
        }
      }
    },
    drawAir(g, time) {
      if (!tongues.length || time < creepAt || burst) return;
      const t = time / 1000;
      for (const tg of tongues) { const h = headOf(tg, time); soulWisp(g, h.x, h.y - 6, 9, t + tg.sx, SOULFIRE, 1, true, Math.atan2(P.y - tg.sy, P.x - tg.sx)); }
    },
    onPhaseEnd() { tongues = []; },
  };
};

// ── Signature: The Pyre (hard) ───────────────────────────────────────
// The Columbarium's floor tiles light from beneath in a chequer: half flare, then the other half.

const pyre = (tk: BossToolkit): SignatureMove => {
  const CELL = 120;
  let fires: { parity: number; warnAt: number; at: number; dealt: boolean }[] = [];
  const cellParity = (x: number, y: number) => (Math.floor(x / CELL) + Math.floor((y - TOP) / CELL)) % 2;
  return {
    durationMs: 2600,
    windupMs: 550,
    gesture: 'clap',
    tell: 'THE PYRE',
    cast(time) {
      const first = cellParity(tk.player.x, tk.player.y);
      const a = time + tk.warn(1100);
      fires = [{ parity: first, warnAt: time, at: a, dealt: false }, { parity: 1 - first, warnAt: a - tk.warn(300), at: a + tk.warn(850), dealt: false }];
      tk.sfx('fireball');
    },
    update(time) {
      const p = tk.player;
      for (const f of fires) {
        if (f.dealt || time < f.at) continue;
        f.dealt = true;
        tk.sfx('flame-burst');
        if (playerUp(tk) && cellParity(p.x, p.y) === f.parity) tk.hitPlayer(12, p.x, p.y);
      }
      fires = fires.filter((f) => !f.dealt || time < f.at + 400);
    },
    drawGround(g, time) {
      const t = time / 1000;
      for (const f of fires) {
        if (time < f.warnAt) continue;
        const k = f.dealt ? 1 : clamp((time - f.warnAt) / Math.max(1, f.at - f.warnAt), 0, 1);
        const fade = f.dealt ? clamp(1 - (time - f.at) / 400, 0, 1) : 1;
        for (let cy = TOP; cy < tk.H; cy += CELL) {
          for (let cx = 0; cx < tk.W; cx += CELL) {
            if (cellParity(cx + 1, cy + 1) !== f.parity) continue;
            const h = Math.min(CELL, tk.H - cy);
            g.fillStyle(f.dealt ? SOULFIRE_LIT : SOULFIRE, (f.dealt ? 0.45 : 0.06 + k * 0.16) * fade); g.fillRect(cx + 3, cy + 3, CELL - 6, h - 6);
            g.lineStyle(2, SOULFIRE_LIT, (0.25 + k * 0.5) * fade); g.strokeRect(cx + 3, cy + 3, CELL - 6, h - 6);
            // A flame rising out of the tile's centre as it charges.
            const fx = cx + CELL / 2, fy = cy + h / 2 + 10;
            const fh = 8 + k * 26 + Math.sin(t * 10 + cx) * 3;
            g.fillStyle(SOULFIRE_LIT, 0.6 * fade); g.fillTriangle(fx - 7, fy, fx + 7, fy, fx + Math.sin(t * 7 + cy) * 3, fy - fh);
          }
        }
      }
    },
    onPhaseEnd() { fires = []; },
  };
};

export const WISP_BOSS: WorldBossDef = {
  worldId: 'isle:wisp',
  name: 'Prince Wisp',
  title: 'the Lamplighter',
  color: WISP,
  colorLit: WISP_LIT,
  colorDark: WISP_DARK,
  accent: WISP_WICK,
  // Tier 2 of the tenth isle.
  damageMult: 1.4,

  intro: [
    'Shh. Not so loud on the steps. Ten thousand of them are listening, and they have nowhere else to go.',
    'I promised nobody would ever be lost in the dark again. Do you know how many wicks that is? I do.',
  ],
  banter: [
    'Every one of them is safe. Every one. I check.',
    'The dark takes people. I was there. I was holding her hand.',
    'You think a lantern is a cage. A lantern is a light someone left on for you.',
    'Trim, wipe, top. Ten thousand times a day. I have never once been late.',
    'If I let one go, where would it go? Into the dark? Is that what you want for them?',
  ],
  defeatLine: 'THE LAMPLIGHTER LETS GO',
  resumeLine: 'You came back. Through the doors, in the light. Good. Nobody should come here in the dark.',

  phases: [
    {
      name: 'Lantern Bearer',
      line: 'Come into the light, where I can see you. Where I can always see you.',
      hp: 560,
      cycle: [
        'sig:pendulum', 'volley', 'sig:hang', 'radial', 'sig:shutters',
        'homing', 'sig:pendulum', 'sig:hang', 'spiral', 'sig:shutters',
      ],
      harass: ['h-orbs', 'h-snipe'],
      restMs: 1150,
      harassMs: 3300,
    },
    {
      name: 'Unbound',
      line: 'There. I have set it down. Now I am like them. Now you cannot touch me — except in the light.',
      hp: 640,
      cycle: [
        'sig:tend', 'sig:procession', 'lanes', 'sig:spill', 'sig:tend',
        'barrage', 'sig:procession', 'sweep', 'sig:spill',
      ],
      harass: ['h-flak', 'h-rune'],
      restMs: 1050,
      harassMs: 3000,
    },
  ],

  hard: {
    introLine: 'NOT ONE SHALL GO OUT',
    extraPhase: {
      name: 'Soulfire',
      line: 'Then I will burn them brighter. So bright the dark cannot ever come back. Look. LOOK.',
      hp: 480,
      cycle: [
        'sig:soulfire', 'sig:pyre', 'sig:pendulum', 'homing',
        'sig:soulfire', 'sig:hang', 'sig:pyre', 'radial',
      ],
      harass: ['h-orbs', 'h-mines'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 215, spreadRad: 0.5 },
    radial: { count: 16, speed: 175 },
    spiral: { arms: 4, speed: 165 },
    homing: { count: 3, speed: 150 },
  },

  signatures: {
    pendulum,
    shutters,
    hang,
    ghost,
    tend,
    procession,
    spill,
    soulfire,
    pyre,
  },

  look: {
    crest: 'none', pattern: 'smooth', aura: 'none', hands: 'ball',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: WISP_WICK,
  },
  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'rush', gimmick: 'none', tint: 'cold', look: { aura: 'smoke', hands: 'wisp', mouth: 'none' } },
    { movement: 'stalk', gimmick: 'none', tint: 'pale', look: { aura: 'flame', hands: 'wisp', mouth: 'grate' } },
  ],

  /**
   * The Lamplighter's tells. A tall pointed lamplighter's hood in deep indigo, its peak ending in a
   * live wick that burns white-blue; a short cape of white mourning crepe at the shoulders; and in his
   * first hand the long brass lamplighter's pole with the great lantern hanging from its hook. Unbound,
   * the lantern is gone from his hand and his body thins below the waist into a streaming wisp — washed
   * out and see-through when he is outside the lantern's light, rimmed gold when he is inside it. In
   * Soulfire the wick on his hood roars green-blue and a crown of soul-flames rings his head.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const t = s.t / 1000;
    const unbound = s.phaseIdx === 1;
    const fire = s.hard && s.phaseIdx >= 2;
    // The crepe cape at the shoulders.
    for (const k of [-1, 1]) {
      g.fillStyle(CREPE, unbound ? 0.5 : 0.95);
      g.fillTriangle(s.x + k * R * 0.2, s.y - R * 0.55, s.x + k * R * 1.05, s.y - R * 0.2, s.x + k * R * 0.75, s.y + R * 0.6 + Math.sin(t * 2 + k) * 2);
    }
    // The hood: a tall indigo cone, deep shadow at the face.
    const peakY = s.y - R * 2.05;
    g.fillStyle(WISP_DARK, unbound ? 0.6 : 1);
    g.fillTriangle(s.x - R * 0.95, s.y - R * 0.3, s.x + R * 0.95, s.y - R * 0.3, s.x + Math.sin(t * 1.3) * 3, peakY);
    g.fillStyle(lit(WISP_DARK, 0.15), unbound ? 0.5 : 0.9);
    g.fillTriangle(s.x - R * 0.8, s.y - R * 0.35, s.x - R * 0.05, s.y - R * 0.35, s.x + Math.sin(t * 1.3) * 3, peakY + 6);
    g.lineStyle(2, BRASS, unbound ? 0.5 : 1); g.lineBetween(s.x - R * 0.95, s.y - R * 0.3, s.x + R * 0.95, s.y - R * 0.3);
    // The wick at the peak.
    const wx = s.x + Math.sin(t * 1.3) * 3, wy = peakY - 2;
    const wc = fire ? SOULFIRE : WISP_WICK;
    glow(g, wx, wy - 8, fire ? 30 : 20, wc, 0.07, 3);
    g.fillStyle(wc, 0.9); g.fillEllipse(wx + Math.sin(t * 9) * 1.5, wy - 8, fire ? 12 : 8, fire ? 22 : 14);
    g.fillStyle(0xffffff, 0.9); g.fillEllipse(wx, wy - 5, 3, 6);
    if (fire) {
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.42;
        const fx = s.x + Math.cos(a) * R * 1.15, fy = s.y - R * 0.5 + Math.sin(a) * R * 0.75;
        const fh = 10 + Math.sin(t * 8 + i) * 4;
        g.fillStyle(SOULFIRE, 0.8); g.fillTriangle(fx - 5, fy, fx + 5, fy, fx + Math.sin(t * 6 + i) * 2, fy - fh);
        g.fillStyle(SOULFIRE_LIT, 0.9); g.fillTriangle(fx - 2, fy, fx + 2, fy, fx, fy - fh * 0.6);
      }
    }
    if (unbound) {
      // Below the waist he thins into a streaming tail.
      for (let i = 1; i <= 5; i++) {
        const sw = Math.sin(t * 3 + i * 0.9) * (4 + i * 2);
        g.fillStyle(i % 2 ? WISP : WISP_LIT, 0.45 - i * 0.06);
        g.fillEllipse(s.x + sw, s.y + R * 0.7 + i * R * 0.32, R * (1.5 - i * 0.22), R * 0.5);
      }
      const l = lanternAt(s.t);
      const solid = dist(s.x, s.y, l.x, l.y) < NEAR;
      if (solid) {
        g.lineStyle(3, GOLD_LIT, 0.6 + Math.sin(t * 8) * 0.2); g.strokeCircle(s.x, s.y, R * 1.15);
      } else {
        // Washed out: a pale veil over the whole body and a dashed outline.
        g.fillStyle(WISP_LIT, 0.35); g.fillCircle(s.x, s.y, R * 1.05);
        for (let i = 0; i < 12; i++) {
          if (i % 2) continue;
          const a = (i / 12) * Math.PI * 2 + t;
          g.lineStyle(2, WISP_LIT, 0.6);
          g.beginPath(); g.arc(s.x, s.y, R * 1.15, a, a + Math.PI / 12, false); g.strokePath();
        }
      }
    } else if (swingA === null) {
      // The lamplighter's pole in his first hand, the great lantern on its hook.
      const h = s.hands[0];
      if (h) {
        const tipX = h.x - 26, tipY = h.y - 60 - s.castGlow * 6;
        g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(h.x, h.y + 10, tipX, tipY);
        g.lineStyle(1.5, BRASS_LIT, 1); g.lineBetween(h.x - 1, h.y + 9, tipX - 1, tipY);
        g.lineStyle(2, IRON, 1); g.beginPath(); g.arc(tipX - 6, tipY, 6, -Math.PI / 2, Math.PI / 2, true); g.strokePath();
        greatLantern(g, tipX - 10, tipY + 12 + Math.sin(t * 2) * 2, 0.55, t, fire);
      }
    }
    if (s.enraged) { g.lineStyle(1.5, fire ? SOULFIRE_LIT : WISP_LIT, 0.35 + Math.sin(t * 8) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The Columbarium floor: polished white marble that throws back the glare, a great inlaid ring of
   * blue glass with a lamplighter's star in it, and walls of niches on three sides — every niche a
   * lantern, every lantern a soul — with one small dark niche low in the middle of the back wall.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x1a47e2);
    // Marble: large slabs with soft veins.
    g.fillStyle(LIME_LIT, 1); g.fillRect(0, 0, W, H);
    const S = 80;
    for (let y = 100; y < H; y += S) {
      for (let x = 0; x < W; x += S) {
        g.fillStyle(((x + y) / S) % 2 ? LIME_LIT : 0xf2eee2, 1); g.fillRect(x, y, S, S);
        g.lineStyle(1, LIME_DARK, 0.4); g.strokeRect(x, y, S, S);
        if (rng() < 0.6) {
          g.lineStyle(1, LIME_DARK, 0.25);
          g.beginPath(); g.moveTo(x + rng() * S, y); g.lineTo(x + rng() * S, y + S * 0.5); g.lineTo(x + rng() * S, y + S); g.strokePath();
        }
      }
    }
    // The back wall of niches, under the HUD.
    g.fillStyle(LIME_DARK, 1); g.fillRect(0, 0, W, 104);
    g.fillStyle(LIME, 1); g.fillRect(0, 0, W, 98);
    for (let r = 0; r < 3; r++) {
      for (let x = 22; x < W; x += 36) {
        const y = 8 + r * 30;
        const low = r === 2 && Math.abs(x - W / 2) < 18;
        g.fillStyle(LIME_DEEP, 1); g.fillRoundedRect(x - 10, y, 20, 24, { tl: 10, tr: 10, bl: 0, br: 0 });
        g.fillStyle(low ? 0x10141c : SOUL_DARK, 1); g.fillRoundedRect(x - 8, y + 2, 16, 21, { tl: 8, tr: 8, bl: 0, br: 0 });
        if (!low) { g.fillStyle(SOUL, 0.85); g.fillRoundedRect(x - 3, y + 8, 6, 9, 2); g.fillStyle(SOUL_LIT, 0.5); g.fillCircle(x, y + 12, 5); }
        else { g.lineStyle(1, BRASS, 1); g.strokeRoundedRect(x - 3, y + 8, 6, 9, 2); }
      }
    }
    g.fillStyle(BRASS_DARK, 1); g.fillRect(0, 98, W, 6);
    // Side walls: columns of niches.
    for (const x0 of [0, W - 40]) {
      g.fillStyle(LIME, 1); g.fillRect(x0, 104, 40, H - 104);
      g.fillStyle(LIME_DARK, 1); g.fillRect(x0 === 0 ? 38 : W - 40, 104, 2, H - 104);
      for (let y = 120; y < H - 20; y += 34) {
        const cx = x0 + 20;
        g.fillStyle(LIME_DEEP, 1); g.fillRoundedRect(cx - 9, y, 18, 24, { tl: 9, tr: 9, bl: 0, br: 0 });
        g.fillStyle(SOUL_DARK, 1); g.fillRoundedRect(cx - 7, y + 2, 14, 21, { tl: 7, tr: 7, bl: 0, br: 0 });
        g.fillStyle(SOUL, 0.85); g.fillRoundedRect(cx - 3, y + 8, 6, 9, 2);
        // The niche-light reflected in the polished floor.
        g.fillStyle(SOUL, 0.06); g.fillEllipse(x0 === 0 ? 70 : W - 70, y + 14, 50, 14);
      }
    }
    // The inlaid ring of blue glass, and the lamplighter's star.
    const cx = W / 2, cy = (H + 104) / 2;
    g.lineStyle(10, SOUL_DEEP, 0.3); g.strokeCircle(cx, cy, 210);
    g.lineStyle(4, SOUL, 0.5); g.strokeCircle(cx, cy, 210);
    g.lineStyle(2, BRASS, 0.6); g.strokeCircle(cx, cy, 222); g.strokeCircle(cx, cy, 198);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 ? 120 : 190;
      g.fillStyle(i % 2 ? SOUL : SOUL_DEEP, 0.18);
      g.fillTriangle(cx + Math.cos(a - 0.14) * 30, cy + Math.sin(a - 0.14) * 30, cx + Math.cos(a + 0.14) * 30, cy + Math.sin(a + 0.14) * 30, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.fillStyle(SOUL_LIT, 0.35); g.fillCircle(cx, cy, 24);
    g.lineStyle(2, BRASS, 0.7); g.strokeCircle(cx, cy, 24);
    // Gold lettering round the ring (dashes — no one reads it any more).
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      g.fillStyle(GOLD, 0.45); g.fillRect(cx + Math.cos(a) * 232 - 2, cy + Math.sin(a) * 232 - 1, 4, 2);
    }
    // Hairline shadows of the wires that cross the ceiling, and wax worn into the floor by his rounds.
    for (let i = 1; i < 8; i++) { g.lineStyle(1, IRON, 0.07); g.lineBetween((i * W) / 8, 104, (i * W) / 8 + 30, H); }
    for (let i = 0; i < 30; i++) {
      const a = rng() * Math.PI * 2, d = 240 + rng() * 60;
      g.fillStyle(0xf3e7c6, 0.7); g.fillEllipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, 5, 2.5);
    }
    glow(g, cx, cy, 300, SOUL_LIT, 0.012, 4);
  },
};
