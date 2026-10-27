import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { mixC } from '../../../../art/IsleArt';
import { ABY, abyssDark, angDiff, clamp, drawEsca, drawFish, drawJaws } from './palette';

/**
 * Prince Lanternjaw, the Lamp Below — Queen Maresa's youngest, governor of the Abyssal Court
 * and the last prince before the Undertow. He is an anglerfish who learned to walk: a round
 * dark body, a jaw too big for it, eyes too small for the dark, and from his brow the illicium
 * — the stalk that carries his lure. Every house the Queen means to leave under, he hangs his
 * light over at night; the sleepers follow it down the maelstrom stair.
 *
 * Phase one, *The Lure*: the room is dark and he is somewhere in it. You see the lure, not him
 * — he sends it out to hang by you, casts hooked lines through the black and reels them home,
 * and fills the room with false lights that burst. Phase two, *Feeding Frenzy*: the light is
 * forgotten; he rushes you, jaws open on the floor after you in a chain, a shoal of lanternfish
 * sweeps the room with one gap in it, and he opens his mouth and simply inhales. Hard mode,
 * *The Trench*: the floor of his hall cracks into strips and falls away into the deep, and he
 * puts his own light out so the only warning is the glint of teeth.
 */

const BODY = 0x26303e;
const BODY_LIT = 0x7f9cb8;
const BODY_DARK = 0x0a0e16;
const LURE = ABY.lure;
const FIELD_TOP = 96;

/**
 * Shared between the signatures (which drive it) and `drawDecor` (which paints it): whether
 * his esca is out on the line (so his brow is bare), and whether he has doused it. One prince
 * fight runs at a time and every signature resets its part on phase end.
 */
const lamp = { out: 0, doused: false };

/** Where the tip of his illicium hangs, given his body and facing — decor and signatures agree. */
function escaAt(x: number, y: number, r: number, facing: number, t: number): { x: number; y: number } {
  const dir = Math.cos(facing) >= 0 ? 1 : -1;
  return { x: x + dir * r * 0.95 + Math.sin(t * 1.3) * 3, y: y - r * 1.55 + Math.cos(t * 1.1) * 2 };
}

// ── Signature: The Lure ──────────────────────────────────────────────
// His esca leaves his brow on its line and hangs beside you — warm, bright, pulling at you a
// little the way it pulls at everything down here. Three times it settles and three times a
// mouth comes up under it. Walk out of the light against the pull before it bites.

const lure = (tk: BossToolkit): SignatureMove => {
  interface Hang { x: number; y: number; bornAt: number; snapAt: number; done: boolean; doneAt: number }
  const R = 82;
  const WARN = 1300;
  let hangs: Hang[] = [];
  let lastX = 0, lastY = 0;
  return {
    durationMs: 3900,
    windupMs: 600,
    gesture: 'raise',
    tell: 'THE LURE',
    cast() {
      tk.sfx('beam-charge');
      hangs = [];
      lamp.out++;
      const n = tk.hard ? 4 : 3;
      for (let i = 0; i < n; i++) {
        tk.schedule(i * 1150, () => {
          const p = tk.player;
          const a = Math.random() * Math.PI * 2;
          const d = 30 + Math.random() * 60;
          const x = tk.clampX(p.x + Math.cos(a) * d, 70), y = tk.clampY(p.y + Math.sin(a) * d, 70);
          const warn = tk.warn(WARN);
          hangs.push({ x, y, bornAt: tk.now, snapAt: tk.now + warn, done: false, doneAt: 0 });
          tk.pull(x, y, 62, warn * 0.85);
        });
      }
      tk.schedule((n - 1) * 1150 + tk.warn(WARN) + 500, () => { lamp.out = Math.max(0, lamp.out - 1); });
    },
    update(time) {
      lastX = tk.bossX; lastY = tk.bossY;
      for (const h of hangs) {
        if (h.done || time < h.snapAt) continue;
        h.done = true; h.doneAt = time;
        tk.sfx('slash');
        const p = tk.player;
        if (Math.hypot(p.x - h.x, p.y - h.y) < R) tk.hitPlayer(20, p.x, p.y);
      }
      hangs = hangs.filter((h) => !h.done || time - h.doneAt < 600);
    },
    drawGround(g, time) {
      for (const h of hangs) {
        if (h.done) {
          const k = (time - h.doneAt) / 600;
          drawJaws(g, h.x, h.y + 6, R, 0, 1 - k, 13);
          continue;
        }
        const k = clamp((time - h.bornAt) / (h.snapAt - h.bornAt), 0, 1);
        g.fillStyle(LURE, 0.1); g.fillEllipse(h.x, h.y + 6, R * 2.6, R * 1.5);
        g.fillStyle(ABY.gum, 0.12 + k * 0.2); g.fillEllipse(h.x, h.y + 6, R * 2, R * 1.2);
        drawJaws(g, h.x, h.y + 6, R, 1 - k * 0.4, 0.35 + k * 0.6, 13);
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      for (const h of hangs) {
        if (h.done) continue;
        const ex = h.x, ey = h.y - 44;
        // The line runs back to his brow, wherever in the dark he is.
        const tip = escaAt(lastX, lastY, 40, Math.atan2(ey - lastY, ex - lastX), t);
        g.lineStyle(1.5, ABY.lureHot, 0.4);
        g.beginPath(); g.moveTo(tip.x, tip.y);
        for (let i = 1; i <= 10; i++) {
          const s = i / 10;
          g.lineTo(tip.x + (ex - tip.x) * s, tip.y + (ey - tip.y) * s - Math.sin(s * Math.PI) * 60);
        }
        g.strokePath();
        drawEsca(g, ex, ey, 8, t, 1);
      }
      // When it is home on his brow, the lamp still shows over the dark: you always know where
      // the prince is standing, because he wants you to.
      if (!lamp.out && !lamp.doused) {
        const tip = escaAt(tk.bossX, tk.bossY, 40, tk.angleToPlayer(), t);
        drawEsca(g, tip.x, tip.y, 6, t, 0.9);
      }
    },
    onPhaseEnd() { hangs = []; lamp.out = 0; },
  };
};

// ── Signature: Cast and Reel ─────────────────────────────────────────
// He casts a hooked line straight through where you stand and out to the far wall. It lies
// glowing on the floor; then he reels, and the hook comes skipping home along it. Be off the
// line when it does — a hooked fighter is hurt, slowed and dragged a step toward his mouth.

const reel = (tk: BossToolkit): SignatureMove => {
  interface Line { ox: number; oy: number; fx: number; fy: number; castAt: number; landAt: number; reelAt: number; homeAt: number; hit: boolean }
  const SPEED = 600;
  let lines: Line[] = [];
  const hookAt = (l: Line, time: number): { x: number; y: number } => {
    if (time < l.landAt) {
      const k = (time - l.castAt) / (l.landAt - l.castAt);
      return { x: l.ox + (l.fx - l.ox) * k, y: l.oy + (l.fy - l.oy) * k - Math.sin(k * Math.PI) * 90 };
    }
    if (time < l.reelAt) return { x: l.fx, y: l.fy };
    const k = clamp((time - l.reelAt) / (l.homeAt - l.reelAt), 0, 1);
    return { x: l.fx + (l.ox - l.fx) * k, y: l.fy + (l.oy - l.fy) * k };
  };
  return {
    durationMs: 2900,
    windupMs: 500,
    gesture: 'point',
    tell: 'CAST AND REEL',
    cast(time) {
      tk.sfx('whip');
      const base = tk.angleToPlayer();
      const angles = tk.hard ? [base - 0.32, base + 0.32] : [base];
      lines = angles.map((a) => {
        // Run the line out to the wall.
        let fx = tk.bossX, fy = tk.bossY;
        for (let d = 0; d < 1200; d += 20) {
          const x = tk.bossX + Math.cos(a) * d, y = tk.bossY + Math.sin(a) * d;
          if (x < 30 || x > tk.W - 30 || y < FIELD_TOP + 10 || y > tk.H - 20) break;
          fx = x; fy = y;
        }
        const landAt = time + 420;
        const reelAt = landAt + tk.warn(850);
        const len = Math.hypot(fx - tk.bossX, fy - tk.bossY);
        return { ox: tk.bossX, oy: tk.bossY, fx, fy, castAt: time, landAt, reelAt, homeAt: reelAt + (len / SPEED) * 1000, hit: false };
      });
      tk.schedule(420, () => tk.sfx('trap-set'));
    },
    update(time) {
      const p = tk.player;
      for (const l of lines) {
        if (l.hit || time < l.reelAt || time > l.homeAt) continue;
        const h = hookAt(l, time);
        if (Math.hypot(p.x - h.x, p.y - h.y) < 26) {
          l.hit = true;
          tk.hitPlayer(14, p.x, p.y);
          tk.slowPlayer(0.5, 800);
          tk.pull(l.ox, l.oy, 120, 600);
          tk.host.showFloatingText(p.x, p.y - 44, 'HOOKED', '#ffcf5a');
          tk.sfx('reload');
        }
      }
      if (lines.length && lines.every((l) => time > l.homeAt + 200)) lines = [];
    },
    drawGround(g, time) {
      for (const l of lines) {
        if (time < l.landAt) continue;
        const reeling = time >= l.reelAt;
        const k = reeling ? 1 : (time - l.landAt) / (l.reelAt - l.landAt);
        // The line lies on the floor, a hair of light, brightening till the reel.
        g.lineStyle(14, LURE, 0.05 + k * 0.08); g.lineBetween(l.ox, l.oy, l.fx, l.fy);
        g.lineStyle(1.5, ABY.lureHot, 0.4 + k * 0.5); g.lineBetween(l.ox, l.oy, l.fx, l.fy);
        // Little bead-floats every so often along it.
        const n = Math.floor(Math.hypot(l.fx - l.ox, l.fy - l.oy) / 70);
        for (let i = 1; i < n; i++) {
          const s = i / n;
          g.fillStyle(ABY.coralRose, 0.7); g.fillCircle(l.ox + (l.fx - l.ox) * s, l.oy + (l.fy - l.oy) * s, 2.5);
        }
      }
    },
    drawAir(g, time) {
      for (const l of lines) {
        if (time > l.homeAt) continue;
        const h = hookAt(l, time);
        if (time < l.landAt) { g.lineStyle(1.2, ABY.lureHot, 0.5); g.lineBetween(l.ox, l.oy, h.x, h.y); }
        // The hook: a barbed J of bone, trailing spray when it skips home.
        const a = time >= l.reelAt ? Math.atan2(l.oy - l.fy, l.ox - l.fx) : Math.atan2(l.fy - l.oy, l.fx - l.ox);
        const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
        g.lineStyle(4, ABY.boneShadow, 1); g.lineBetween(h.x - ux * 14, h.y - uy * 14, h.x + ux * 6, h.y + uy * 6);
        g.lineStyle(3, ABY.bone, 1); g.lineBetween(h.x - ux * 14, h.y - uy * 14, h.x + ux * 6, h.y + uy * 6);
        g.beginPath(); g.arc(h.x + nx * 6, h.y + ny * 6, 7, a - Math.PI / 2, a + Math.PI * 0.6, false); g.strokePath();
        g.fillStyle(ABY.tooth, 1); g.fillTriangle(h.x + nx * 13, h.y + ny * 13, h.x + nx * 8 - ux * 6, h.y + ny * 8 - uy * 6, h.x + nx * 15 - ux * 4, h.y + ny * 15 - uy * 4);
        if (time >= l.reelAt) {
          for (let i = 1; i <= 4; i++) { g.fillStyle(ABY.membrane, 0.5 - i * 0.1); g.fillCircle(h.x - ux * i * 12, h.y - uy * i * 12, 3 - i * 0.5); }
        }
      }
    },
    onPhaseEnd() { lines = []; },
  };
};

// ── Signature: False Lights ──────────────────────────────────────────
// Little blue lights wink on all over the dark room, each one dangling like a lure. They are
// not lures. One after another they burst into a ring of stinging sparks — slow enough to step
// between, if you were watching which one was next.

const falseLights = (tk: BossToolkit): SignatureMove => {
  interface Light { x: number; y: number; bornAt: number; burstAt: number; done: boolean }
  let lights: Light[] = [];
  return {
    durationMs: 3200,
    windupMs: 500,
    hold: 'conduct',
    tell: 'FALSE LIGHTS',
    cast(time) {
      tk.sfx('sparkle');
      lights = [];
      const n = tk.hard ? 9 : 7;
      const p = tk.player;
      for (let i = 0; i < n; i++) {
        let x = 0, y = 0;
        for (let tries = 0; tries < 8; tries++) {
          x = 80 + Math.random() * (tk.W - 160);
          y = FIELD_TOP + 60 + Math.random() * (tk.H - FIELD_TOP - 110);
          if (Math.hypot(x - p.x, y - p.y) > 90 && lights.every((l) => Math.hypot(l.x - x, l.y - y) > 110)) break;
        }
        lights.push({ x, y, bornAt: time, burstAt: time + tk.warn(1500) + i * 240, done: false });
      }
    },
    update(time) {
      for (const l of lights) {
        if (l.done || time < l.burstAt) continue;
        l.done = true;
        tk.sfx('zap');
        const spokes = tk.hard ? 8 : 6;
        const a0 = Math.random() * Math.PI;
        for (let k = 0; k < spokes; k++) {
          const a = a0 + (k / spokes) * Math.PI * 2;
          tk.spawnBullet({ x: l.x, y: l.y, angle: a, speed: 150, damage: 8, r: 6, lifeMs: 2400, color: ABY.photo });
        }
        tk.boom(l.x, l.y, 26, ABY.photo);
      }
      if (lights.length && lights.every((l) => l.done)) lights = [];
    },
    drawGround(g, time) {
      for (const l of lights) {
        if (l.done) continue;
        const k = clamp((time - l.bornAt) / (l.burstAt - l.bornAt), 0, 1);
        g.lineStyle(1.5, ABY.photo, 0.2 + k * 0.4); g.strokeCircle(l.x, l.y + 8, 22 - k * 8);
      }
    },
    drawAir(g, time) {
      // The next to burst is the only one that flickers.
      const next = lights.filter((l) => !l.done).sort((a, b) => a.burstAt - b.burstAt)[0];
      for (const l of lights) {
        if (l.done) continue;
        const k = clamp((time - l.bornAt) / (l.burstAt - l.bornAt), 0, 1);
        const flick = l === next ? (Math.sin(time / 40) > 0 ? 1 : 0.35) : 0.75;
        g.lineStyle(1, ABY.photo, 0.3); g.lineBetween(l.x, l.y - 8, l.x + Math.sin(time / 500 + l.x) * 10, FIELD_TOP);
        g.fillStyle(ABY.photo, 0.12 * flick); g.fillCircle(l.x, l.y - 8, 18 + k * 8);
        g.fillStyle(ABY.photo, flick); g.fillCircle(l.x, l.y - 8, 4 + k * 2);
        g.fillStyle(0xffffff, 0.8 * flick); g.fillCircle(l.x - 1, l.y - 9, 1.6);
      }
    },
    onPhaseEnd() { lights = []; },
  };
};

// ── Signature: Feeding Frenzy ────────────────────────────────────────
// A chain of mouths opens in the floor, each one where you are about to be. The first takes
// a breath to show itself; the rest come faster. Change direction — they lead your running.

const frenzy = (tk: BossToolkit): SignatureMove => {
  interface Mouth { x: number; y: number; bornAt: number; snapAt: number; done: boolean; doneAt: number }
  const R = 60;
  let mouths: Mouth[] = [];
  let px = 0, py = 0, vx = 0, vy = 0, lastT = 0;
  return {
    durationMs: 3400,
    windupMs: 450,
    gesture: 'clap',
    tell: 'FEEDING FRENZY',
    cast() {
      tk.sfx('roar');
      mouths = [];
      const n = tk.hard ? 9 : 7;
      for (let i = 0; i < n; i++) {
        tk.schedule(i * 330, () => {
          const p = tk.player;
          const lead = 0.32;
          const x = tk.clampX(p.x + clamp(vx * lead, -90, 90), 60), y = tk.clampY(p.y + clamp(vy * lead, -90, 90), 60);
          mouths.push({ x, y, bornAt: tk.now, snapAt: tk.now + tk.warn(i === 0 ? 1050 : 820), done: false, doneAt: 0 });
        });
      }
    },
    update(time) {
      const p = tk.player;
      const dt = Math.max(0.001, (time - lastT) / 1000);
      if (lastT > 0 && dt < 0.2) { vx += ((p.x - px) / dt - vx) * 0.2; vy += ((p.y - py) / dt - vy) * 0.2; }
      px = p.x; py = p.y; lastT = time;
      for (const m of mouths) {
        if (m.done || time < m.snapAt) continue;
        m.done = true; m.doneAt = time;
        tk.sfx('slash');
        if (Math.hypot(p.x - m.x, p.y - m.y) < R) tk.hitPlayer(15, p.x, p.y);
      }
      mouths = mouths.filter((m) => !m.done || time - m.doneAt < 500);
    },
    drawGround(g, time) {
      for (const m of mouths) {
        if (m.done) {
          const k = (time - m.doneAt) / 500;
          drawJaws(g, m.x, m.y, R, 0, 1 - k, 11);
          g.fillStyle(ABY.blood, 0.25 * (1 - k)); g.fillEllipse(m.x, m.y, R * 2.2, R * 1.2);
          continue;
        }
        const k = clamp((time - m.bornAt) / (m.snapAt - m.bornAt), 0, 1);
        // The shape of the fish rising under the floor, then its mouth.
        g.fillStyle(0x000000, 0.25 + k * 0.2); g.fillEllipse(m.x + 30, m.y + 8, R * 3, R * 1.1);
        g.fillStyle(ABY.gum, 0.2 + k * 0.3); g.fillEllipse(m.x, m.y, R * 2, R * 1.25);
        drawJaws(g, m.x, m.y, R, 1 - k * 0.5, 0.4 + k * 0.6, 11);
      }
    },
    onPhaseEnd() { mouths = []; },
  };
};

// ── Signature: The Shoal ─────────────────────────────────────────────
// A wall of lanternfish sweeps across the room from one side, so thick you cannot pass
// through it — except at one gap, lit along its edges. A second wall follows; its gap is
// never far from the first.

const shoal = (tk: BossToolkit): SignatureMove => {
  interface Wave { fromLeft: boolean; gapY: number; startAt: number; hit: boolean }
  const SPEED = 250;
  const GAP_HALF = 72;
  const THICK = 22;
  let waves: Wave[] = [];
  const wallX = (w: Wave, time: number): number => {
    const d = ((time - w.startAt) / 1000) * SPEED - 40;
    return w.fromLeft ? d : tk.W - d;
  };
  return {
    durationMs: 3600,
    windupMs: 600,
    hold: 'reach',
    tell: 'THE SHOAL',
    cast(time) {
      tk.sfx('sonic-pulse');
      const fromLeft = tk.player.x > tk.W / 2;
      const g1 = clamp(tk.player.y + (Math.random() - 0.5) * 220, FIELD_TOP + 70, tk.H - 70);
      const g2 = clamp(g1 + (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 25), FIELD_TOP + 70, tk.H - 70);
      const warn = tk.warn(900);
      waves = [
        { fromLeft, gapY: g1, startAt: time + warn, hit: false },
        { fromLeft, gapY: g2, startAt: time + warn + 1150, hit: false },
      ];
      if (tk.hard) waves.push({ fromLeft, gapY: clamp(g2 + (g2 > g1 ? 50 : -50), FIELD_TOP + 70, tk.H - 70), startAt: time + warn + 2300, hit: false });
    },
    update(time) {
      const p = tk.player;
      for (const w of waves) {
        if (w.hit || time < w.startAt) continue;
        const x = wallX(w, time);
        if (Math.abs(p.x - x) < THICK && Math.abs(p.y - w.gapY) > GAP_HALF) {
          w.hit = true;
          tk.hitPlayer(10, p.x, p.y);
          tk.slowPlayer(0.75, 500);
        }
      }
      if (waves.length && waves.every((w) => { const x = wallX(w, time); return x < -60 || x > tk.W + 60; })) waves = [];
    },
    drawGround(g, time) {
      for (const w of waves) {
        if (time >= w.startAt) continue;
        // The side it is coming from glows, and the gap is shown as a lit doorway.
        const k = 1 - (w.startAt - time) / tk.warn(900);
        const x = w.fromLeft ? 0 : tk.W - 22;
        g.fillStyle(ABY.photo, 0.15 + k * 0.25); g.fillRect(x, FIELD_TOP, 22, tk.H - FIELD_TOP);
        g.fillStyle(0x000000, 0.6); g.fillRect(x, w.gapY - GAP_HALF, 22, GAP_HALF * 2);
        g.lineStyle(2, ABY.lureHot, 0.6 + k * 0.4);
        g.lineBetween(x, w.gapY - GAP_HALF, x + 60 * (w.fromLeft ? 1 : -1) + 22 * (w.fromLeft ? 0 : 1), w.gapY - GAP_HALF);
        g.lineBetween(x, w.gapY + GAP_HALF, x + 60 * (w.fromLeft ? 1 : -1) + 22 * (w.fromLeft ? 0 : 1), w.gapY + GAP_HALF);
      }
    },
    drawAir(g, time) {
      for (const w of waves) {
        if (time < w.startAt) continue;
        const x = wallX(w, time);
        if (x < -40 || x > tk.W + 40) continue;
        const a = w.fromLeft ? 0 : Math.PI;
        for (let y = FIELD_TOP + 8; y < tk.H; y += 15) {
          if (Math.abs(y - w.gapY) < GAP_HALF) continue;
          for (let c = 0; c < 3; c++) {
            const fx = x - (w.fromLeft ? 1 : -1) * c * 13 + Math.sin(time / 90 + y * 0.3 + c) * 3;
            drawFish(g, fx, y + (c % 2) * 6, a + Math.sin(time / 120 + y) * 0.12, 6, 0x101a24, ABY.photo, 1);
          }
        }
        // The edges of the gap, lit by the lead fish.
        g.fillStyle(ABY.lure, 0.8); g.fillCircle(x, w.gapY - GAP_HALF, 3); g.fillCircle(x, w.gapY + GAP_HALF, 3);
      }
    },
    onPhaseEnd() { waves = []; },
  };
};

// ── Signature: Gulper ────────────────────────────────────────────────
// He plants and opens his mouth wider than his body. A cone of water floods into it, dragging
// you toward him; then the jaw slams shut on everything in the cone. Walk out of it sideways.

const gulp = (tk: BossToolkit): SignatureMove => {
  const LEN = 440;
  const HALF = 0.48;
  const WARN = 1550;
  let aim = 0;
  let bornAt = 0, snapAt = 0, doneAt = 0;
  let ox = 0, oy = 0;
  let active = false;
  return {
    durationMs: 2500,
    windupMs: 500,
    hold: 'brace',
    locksBody: true,
    tell: 'GULPER',
    cast(time) {
      tk.sfx('gust');
      aim = tk.angleToPlayer();
      ox = tk.bossX; oy = tk.bossY;
      bornAt = time; snapAt = time + tk.warn(WARN); doneAt = 0;
      active = true;
      tk.pull(ox, oy, 95, snapAt - time);
    },
    update(time) {
      if (!active || doneAt || time < snapAt) return;
      doneAt = time;
      tk.sfx('hit-heavy');
      const p = tk.player;
      const d = Math.hypot(p.x - ox, p.y - oy);
      if (d < LEN && Math.abs(angDiff(Math.atan2(p.y - oy, p.x - ox), aim)) < HALF) tk.hitPlayer(26, p.x, p.y);
    },
    drawGround(g, time) {
      if (!active) return;
      if (doneAt && time - doneAt > 500) { active = false; return; }
      const k = doneAt ? 1 : clamp((time - bornAt) / (snapAt - bornAt), 0, 1);
      const pts: Phaser.Geom.Point[] = [new Phaser.Geom.Point(ox, oy)];
      for (let i = 0; i <= 12; i++) {
        const a = aim - HALF + (HALF * 2 * i) / 12;
        pts.push(new Phaser.Geom.Point(ox + Math.cos(a) * LEN, oy + Math.sin(a) * LEN));
      }
      g.fillStyle(doneAt ? ABY.blood : ABY.membraneDim, doneAt ? 0.3 * (1 - (time - doneAt) / 500) : 0.1 + k * 0.15);
      g.fillPoints(pts, true, true);
      g.lineStyle(2, ABY.membrane, 0.4 + k * 0.4); g.strokePoints(pts, true, true);
      if (!doneAt) {
        // Water streaming into the mouth.
        for (let i = 0; i < 16; i++) {
          const a = aim + ((i % 8) / 7 - 0.5) * HALF * 1.8;
          const ph = ((time / 600) + i / 16) % 1;
          const r = LEN * (1 - ph);
          g.lineStyle(2, ABY.membrane, 0.5 * ph);
          g.lineBetween(ox + Math.cos(a) * r, oy + Math.sin(a) * r, ox + Math.cos(a) * (r - 26), oy + Math.sin(a) * (r - 26));
        }
      }
    },
    drawAir(g, time) {
      if (!active) return;
      const k = doneAt ? 0 : clamp((time - bornAt) / (snapAt - bornAt), 0, 1);
      const mx = ox + Math.cos(aim) * 34, my = oy + Math.sin(aim) * 34;
      drawJaws(g, mx, my, 54 + k * 26, doneAt ? 0 : 0.4 + k * 0.6, doneAt ? Math.max(0, 1 - (time - doneAt) / 500) : 1, 13);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Floor Falls Away (hard) ───────────────────────────
// His hall is laid in long strips of bone over the trench. Three of them — always the one under
// you — crack along their seams and drop away into the deep. Stand on nothing and the dark
// takes a bite of you every moment, and slows you as it does. The strips rise again later.

const trench = (tk: BossToolkit): SignatureMove => {
  const STRIPS = 8;
  const WARN = 1400;
  const DOWN = 5600;
  const RISE = 700;
  interface Drop { idx: number; crackAt: number; fallAt: number; riseAt: number; upAt: number }
  let drops: Drop[] = [];
  let lastHit = 0;
  const sw = (): number => tk.W / STRIPS;
  const stripOf = (x: number): number => clamp(Math.floor(x / sw()), 0, STRIPS - 1);
  const down = (idx: number, time: number): boolean => drops.some((d) => d.idx === idx && time >= d.fallAt && time < d.riseAt);
  return {
    durationMs: 2000,
    windupMs: 650,
    hold: 'brace',
    tell: 'THE FLOOR FALLS AWAY',
    cast(time) {
      tk.sfx('quake');
      const mine = stripOf(tk.player.x);
      const pick = new Set<number>([mine]);
      while (pick.size < 3) pick.add(Math.floor(Math.random() * STRIPS));
      // Never the whole room: keep at least one standing strip either side of the player's.
      const warn = tk.warn(WARN);
      drops = drops.filter((d) => d.upAt > time && !pick.has(d.idx));
      for (const idx of pick) drops.push({ idx, crackAt: time, fallAt: time + warn, riseAt: time + warn + DOWN, upAt: time + warn + DOWN + RISE });
      tk.schedule(warn, () => tk.sfx('stone-slam'));
    },
    update(time) {
      drops = drops.filter((d) => time < d.upAt + 50);
      if (time - lastHit < 450) return;
      const p = tk.player;
      if (down(stripOf(p.x), time)) {
        lastHit = time;
        tk.hitPlayer(7, p.x, p.y);
        tk.slowPlayer(0.6, 500);
      }
    },
    drawGround(g, time) {
      const W = sw();
      for (const d of drops) {
        const x0 = d.idx * W, x1 = x0 + W;
        const top = FIELD_TOP, bot = tk.H;
        if (time < d.fallAt) {
          // Cracks running down both seams, bone chips jumping out of them.
          const k = (time - d.crackAt) / (d.fallAt - d.crackAt);
          g.fillStyle(0x000000, 0.12 + k * 0.2); g.fillRect(x0, top, W, bot - top);
          g.lineStyle(2 + k * 3, mixC(ABY.boneMid, ABY.abyss, k), 0.9);
          for (const sx of [x0 + 2, x1 - 2]) {
            g.beginPath(); g.moveTo(sx, top);
            const len = (bot - top) * k;
            for (let y = 0; y <= len; y += 22) g.lineTo(sx + Math.sin(y * 0.15 + sx) * 5, top + y);
            g.strokePath();
          }
          g.lineStyle(3, ABY.lure, 0.3 + Math.sin(time / 70) * 0.25); g.strokeRect(x0 + 3, top + 2, W - 6, bot - top - 4);
        } else if (time < d.upAt) {
          // The drop: the slab shrinking away into the deep, the walls of the shaft either side.
          const sinkK = time < d.riseAt ? clamp((time - d.fallAt) / 500, 0, 1) : 1 - (time - d.riseAt) / RISE;
          g.fillStyle(ABY.abyss, 1); g.fillRect(x0, top, W, bot - top);
          g.fillStyle(0x0b1626, 1); g.fillRect(x0, top, 8, bot - top); g.fillRect(x1 - 8, top, 8, bot - top);
          const inset = sinkK * W * 0.32;
          g.fillStyle(mixC(ABY.boneDark, ABY.abyss, sinkK * 0.85), 1);
          g.fillRect(x0 + inset, top + inset * 0.6, W - inset * 2, bot - top - inset * 1.2);
          // Far below, things with lights turn to look up.
          for (let i = 0; i < 5; i++) {
            const lx = x0 + W * (0.2 + ((i * 37) % 60) / 100), ly = top + 60 + ((i * 113 + d.idx * 71) % (bot - top - 120));
            g.fillStyle(i % 2 ? ABY.photo : ABY.coralRose, 0.4 + 0.3 * Math.sin(time / 300 + i)); g.fillCircle(lx, ly, 1.8);
          }
          g.lineStyle(2, ABY.membraneDim, 0.5); g.strokeRect(x0 + 1, top + 1, W - 2, bot - top - 2);
        }
      }
    },
    onPhaseEnd() { drops = []; },
  };
};

// ── Signature: Lights Out (hard) ─────────────────────────────────────
// He douses his lamp. The dark comes all the way in, close round you. Then teeth glint in it —
// four times, each where you were standing a heartbeat ago — and bite.

const lightsOut = (tk: BossToolkit): SignatureMove => {
  interface Bite { x: number; y: number; bornAt: number; snapAt: number; done: boolean; doneAt: number }
  const R = 66;
  let bites: Bite[] = [];
  let darkFrom = 0, darkUntil = 0;
  return {
    durationMs: 3500,
    windupMs: 550,
    hold: 'charge',
    tell: 'LIGHTS OUT',
    cast(time) {
      tk.sfx('hush');
      lamp.doused = true;
      bites = [];
      darkFrom = time; darkUntil = time + 3600;
      for (let i = 0; i < 4; i++) {
        tk.schedule(300 + i * 650, () => {
          const p = tk.player;
          bites.push({ x: p.x, y: p.y, bornAt: tk.now, snapAt: tk.now + tk.warn(1050), done: false, doneAt: 0 });
        });
      }
      tk.schedule(3600, () => { lamp.doused = false; });
    },
    update(time) {
      for (const b of bites) {
        if (b.done || time < b.snapAt) continue;
        b.done = true; b.doneAt = time;
        tk.sfx('slash');
        const p = tk.player;
        if (Math.hypot(p.x - b.x, p.y - b.y) < R) tk.hitPlayer(18, p.x, p.y);
      }
      bites = bites.filter((b) => !b.done || time - b.doneAt < 450);
    },
    drawAir(g, time) {
      if (time >= darkFrom && time < darkUntil) {
        const k = Math.min(1, (time - darkFrom) / 400, (darkUntil - time) / 400);
        const p = tk.player;
        abyssDark(g, tk.W, tk.H, FIELD_TOP, [{ x: p.x, y: p.y, r: 120 }], 0.7 * k, 40);
      }
      for (const b of bites) {
        if (b.done) {
          const k = (time - b.doneAt) / 450;
          drawJaws(g, b.x, b.y, R, 0, 1 - k, 12);
          continue;
        }
        const k = clamp((time - b.bornAt) / (b.snapAt - b.bornAt), 0, 1);
        // Only the glints: the tips of the teeth catching what little light there is.
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const tw = 0.5 + 0.5 * Math.sin(time / 60 + i * 2.3);
          g.fillStyle(ABY.tooth, (0.35 + k * 0.6) * tw);
          g.fillTriangle(
            b.x + Math.cos(a) * R, b.y + Math.sin(a) * R * 0.8,
            b.x + Math.cos(a + 0.08) * R * (1 - 0.25 * k), b.y + Math.sin(a + 0.08) * R * 0.8 * (1 - 0.25 * k),
            b.x + Math.cos(a - 0.08) * R * (1 - 0.25 * k), b.y + Math.sin(a - 0.08) * R * 0.8 * (1 - 0.25 * k),
          );
        }
        g.lineStyle(1, ABY.tooth, 0.15 + k * 0.3); g.strokeEllipse(b.x, b.y, R * 2, R * 1.6);
      }
    },
    onPhaseEnd() { bites = []; darkUntil = 0; lamp.doused = false; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const LANTERNJAW_BOSS: WorldBossDef = {
  worldId: 'isle:lanternjaw',
  name: 'Prince Lanternjaw',
  title: 'the Lamp Below',
  color: BODY,
  colorLit: BODY_LIT,
  colorDark: BODY_DARK,
  accent: LURE,
  damageMult: 1.2,

  intro: [
    'You followed the light. Everyone does, in the end.',
    'Come closer. I can hardly see you, little dry thing — and I see everything down here.',
  ],
  banter: [
    'Mother lets the sea in. I only show the sleepers the way down.',
    'Every lamp in this city is one of mine. I let them think they keep them.',
    'Air is not free. Nothing at the bottom of the sea is free.',
    'My brothers and sisters fell to you? They lived in the sun. Of course they fell.',
    'Look at the light. Just look at it. Doesn\'t it want you?',
    'Two hundred and eleven sleepers carried down. I counted every one by lamplight.',
    'The dark is not empty. It is full of mouths.',
  ],
  defeatLine: 'THE LAMP GOES OUT',
  resumeLine: 'Another one, wandering toward the light. They always come back to it.',

  phases: [
    {
      name: 'The Lure',
      line: 'Douse the lamps. Let the lure do the talking.',
      hp: 450,
      cycle: [
        'sig:lure', 'homing', 'sig:reel', 'lanes',
        'sig:falselights', 'sig:lure', 'volley', 'sig:reel', 'sig:falselights',
      ],
      harass: ['h-orbs', 'h-rune', 'h-snipe'],
      restMs: 1150,
      harassMs: 3400,
    },
    {
      name: 'Feeding Frenzy',
      line: 'Enough bait. I am HUNGRY.',
      hp: 540,
      cycle: [
        'sig:frenzy', 'sig:shoal', 'charge', 'sig:gulp',
        'spiral', 'sig:frenzy', 'hazard', 'sig:shoal', 'sig:gulp', 'charge',
      ],
      harass: ['h-snipe', 'h-mines', 'h-flak', 'h-lane'],
      restMs: 950,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'THE LAMP BELOW REMEMBERS THE TRENCH',
    extraPhase: {
      name: 'The Trench',
      line: 'Down. All the way down. Where the light has never been.',
      hp: 390,
      cycle: [
        'sig:trench', 'sig:lightsout', 'sig:gulp', 'sig:trench',
        'sig:lure', 'sweep', 'sig:lightsout', 'sig:frenzy', 'sig:shoal',
      ],
      harass: ['h-orbs', 'h-snipe', 'h-rune', 'h-mines'],
      restMs: 820,
      harassMs: 2400,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.15, speed: 220 },
    homing: { count: 3, speed: 150 },
    lanes: { halfW: 28 },
    spiral: { arms: 3, speed: 170 },
    charge: { halfW: 46 },
  },

  signatures: {
    lure,
    reel,
    falselights: falseLights,
    frenzy,
    shoal,
    gulp,
    trench,
    lightsout: lightsOut,
  },

  /**
   * His hall is the inside of his own mouth. The floor is a tongue of dark, glossy flesh laid
   * with bone plates; the walls are a ring of needle teeth pointing in at you, longest at the
   * corners; up the top wall gapes the gullet, and in its dark the lamps of the sleepers he
   * carried down hang like a string of pearls.
   */
  drawArena(g, W, H) {
    g.fillStyle(0x12070c, 1); g.fillRect(0, 0, W, H);
    const cx = W / 2, cy = (FIELD_TOP + H) / 2;
    // The tongue: dark plum flesh, ridged.
    g.fillStyle(0x2a1018, 1); g.fillEllipse(cx, cy + 20, W * 0.94, (H - FIELD_TOP) * 1.02);
    g.fillStyle(0x3a1620, 1); g.fillEllipse(cx, cy + 30, W * 0.78, (H - FIELD_TOP) * 0.84);
    g.lineStyle(2, 0x4a1e2a, 0.7);
    for (let i = 1; i < 7; i++) g.strokeEllipse(cx, cy + 30, W * 0.78 * (i / 7), (H - FIELD_TOP) * 0.84 * (i / 7));
    g.lineStyle(3, 0x1a0a10, 0.8); g.lineBetween(cx, FIELD_TOP + 60, cx, H - 30);
    // Bone plates laid down the middle for the court to stand on.
    for (let r = 0; r < 6; r++) {
      for (let c = -3; c <= 3; c++) {
        const x = cx + c * 70 + (r % 2) * 35, y = FIELD_TOP + 90 + r * 78;
        if (Math.hypot((x - cx) / (W * 0.36), (y - cy - 20) / ((H - FIELD_TOP) * 0.4)) > 1) continue;
        g.fillStyle(0x000000, 0.35); g.fillRoundedRect(x - 30, y - 18, 60, 38, 10);
        g.fillStyle(mixC(ABY.boneDark, ABY.boneMid, ((r + c + 9) % 3) * 0.25), 1); g.fillRoundedRect(x - 29, y - 21, 58, 36, 10);
        g.lineStyle(1, ABY.bone, 0.3); g.lineBetween(x - 22, y - 16, x + 10, y - 18);
      }
    }
    // The gullet at the top wall, and the sleepers' lamps hanging in it.
    g.fillStyle(0x020104, 1); g.fillEllipse(cx, FIELD_TOP + 10, 360, 90);
    for (let i = 0; i < 9; i++) {
      const x = cx - 150 + i * 37, y = FIELD_TOP + 6 + Math.sin(i * 0.8) * 10;
      g.lineStyle(1, ABY.lureHot, 0.25); g.lineBetween(x, FIELD_TOP - 30, x, y);
      g.fillStyle(LURE, 0.08); g.fillCircle(x, y, 10);
      g.fillStyle(LURE, 0.7); g.fillCircle(x, y, 2.4);
    }
    // The teeth: a ring of needles along all four walls, pointing inward.
    const tooth = (bx: number, by: number, a: number, len: number, w: number): void => {
      const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len;
      const nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
      g.fillStyle(0x1a0a10, 1); g.fillTriangle(bx - nx * 1.3, by - ny * 1.3, bx + nx * 1.3, by + ny * 1.3, tx, ty);
      g.fillStyle(ABY.tooth, 1); g.fillTriangle(bx - nx, by - ny, bx + nx, by + ny, tx, ty);
      g.fillStyle(0xffffff, 0.5); g.fillTriangle(bx - nx * 0.25, by - ny * 0.25, bx + nx * 0.25, by + ny * 0.25, tx, ty);
    };
    for (let x = 20; x < W; x += 46) {
      const corner = Math.min(x, W - x) < 140 ? 1.5 : 1;
      if (Math.abs(x - cx) > 190) tooth(x, FIELD_TOP - 4, Math.PI / 2 + (x - cx) / W * 0.4, 34 * corner + ((x * 7) % 12), 7);
      tooth(x + 23, H + 4, -Math.PI / 2 + (x - cx) / W * 0.4, 38 * corner + ((x * 11) % 14), 8);
    }
    for (let y = FIELD_TOP + 30; y < H; y += 48) {
      tooth(-4, y, (y - cy) / H * 0.5, 36 + ((y * 5) % 14), 8);
      tooth(W + 4, y, Math.PI - (y - cy) / H * 0.5, 36 + ((y * 3) % 14), 8);
    }
    // Gum line round the edge.
    g.lineStyle(10, ABY.gum, 0.8); g.strokeRect(5, FIELD_TOP - 6, W - 10, H - FIELD_TOP);
  },

  look: { crest: 'none', pattern: 'scales', aura: 'bubbles', hands: 'claw', torsoR: 40, mouth: 'maw', eyes: 2, eyeColor: 0xdfe8f0 },

  /**
   * The anglerfish: the illicium springing from his brow and arching forward, the esca glowing
   * at its tip (bare when it is out on the line, dark when doused); a vast underslung jaw of
   * needle teeth across the lower half of his body, wider in the frenzy; and, in the trench,
   * rows of blue photophores down his flanks and long filaments trailing from his chin.
   */
  drawDecor(g, s) {
    /** The rig's clock is in ms; everything here sways in seconds. */
    const t = s.t / 1000;
    const r = s.radius;
    const dir = Math.cos(s.facing) >= 0 ? 1 : -1;
    const frenzy = s.phaseIdx === 1;
    const deep = s.hard && s.phaseIdx >= 2;
    // The jaw: an underbite of needles hanging past the body's edge.
    const jawW = r * (frenzy ? 1.9 : 1.55);
    const jy = s.y + r * 0.28;
    g.fillStyle(ABY.gum, 0.95); g.fillEllipse(s.x + dir * r * 0.1, jy + r * 0.18, jawW, r * (frenzy ? 0.62 : 0.44));
    g.fillStyle(0x0a0406, 1); g.fillEllipse(s.x + dir * r * 0.1, jy + r * 0.12, jawW * 0.82, r * (frenzy ? 0.42 : 0.26));
    const teeth = frenzy ? 11 : 9;
    for (let i = 0; i < teeth; i++) {
      const u = (i + 0.5) / teeth - 0.5;
      const bx = s.x + dir * r * 0.1 + u * jawW * 0.86;
      const len = r * (0.26 + (i % 2) * 0.14) * (1 - Math.abs(u) * 0.8) * (frenzy ? 1.35 : 1);
      g.fillStyle(ABY.tooth, 1);
      g.fillTriangle(bx - 2.4, jy + r * 0.3, bx + 2.4, jy + r * 0.3, bx + u * 3, jy + r * 0.3 - len);
      if (i % 2 === 0) g.fillTriangle(bx - 2, jy - r * 0.02, bx + 2, jy - r * 0.02, bx - u * 3, jy - r * 0.02 + len * 0.7);
    }
    // The illicium.
    const tip = escaAt(s.x, s.y, r, s.facing, t);
    const bx = s.x - dir * r * 0.2, by = s.y - r * 0.85;
    g.lineStyle(5, BODY_DARK, 1);
    g.beginPath(); g.moveTo(bx, by);
    for (let i = 1; i <= 10; i++) {
      const u = i / 10;
      g.lineTo(bx + (tip.x - bx) * u, by + (tip.y - by) * u - Math.sin(u * Math.PI) * r * 0.55);
    }
    g.strokePath();
    g.lineStyle(3, mixC(BODY, BODY_LIT, 0.4), 1);
    g.beginPath(); g.moveTo(bx, by);
    for (let i = 1; i <= 10; i++) {
      const u = i / 10;
      g.lineTo(bx + (tip.x - bx) * u, by + (tip.y - by) * u - Math.sin(u * Math.PI) * r * 0.55);
    }
    g.strokePath();
    if (lamp.doused) {
      g.fillStyle(0x0a0e16, 1); g.fillCircle(tip.x, tip.y, 6);
      g.lineStyle(1, ABY.membraneDim, 0.7); g.strokeCircle(tip.x, tip.y, 6);
    } else if (lamp.out) {
      // The line runs off toward wherever the lure is hanging.
      g.fillStyle(BODY_DARK, 1); g.fillCircle(tip.x, tip.y, 3);
    } else {
      drawEsca(g, tip.x, tip.y, 6 + s.castGlow * 3, t, 1);
    }
    if (deep) {
      // Photophores down both flanks and trailing barbels: the trench has changed him.
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.15 + i * 0.12);
        for (const sgn of [-1, 1]) {
          const px = s.x + sgn * Math.cos(a) * r * 0.86, py = s.y + Math.sin(a - Math.PI * 0.4) * r * 0.7;
          g.fillStyle(ABY.photo, 0.55 + 0.4 * Math.sin(t * 3 + i)); g.fillCircle(px, py, 2);
        }
      }
      for (let i = 0; i < 4; i++) {
        const fx = s.x + (i - 1.5) * r * 0.3;
        g.lineStyle(1.5, ABY.photo, 0.5);
        g.beginPath(); g.moveTo(fx, jy + r * 0.4);
        for (let k = 1; k <= 6; k++) g.lineTo(fx + Math.sin(t * 2 + k + i) * 5, jy + r * 0.4 + k * 8);
        g.strokePath();
        g.fillStyle(ABY.photo, 0.9); g.fillCircle(fx + Math.sin(t * 2 + 6 + i) * 5, jy + r * 0.4 + 48, 2);
      }
    }
    if (s.hurt) { g.fillStyle(ABY.blood, 0.25); g.fillCircle(s.x, s.y, r * 0.9); }
  },

  phaseStyles: [
    { movement: 'blink', gimmick: 'gloom' },
    { movement: 'rush', gimmick: 'none', tint: 'blood', look: { aura: 'bubbles', pattern: 'drip', hands: 'claw', mouth: 'maw' } },
    { movement: 'hover', gimmick: 'gloom', tint: 'void', look: { aura: 'none', pattern: 'rings', hands: 'wisp', eyeColor: 0x6ec2ff } },
  ],
};
