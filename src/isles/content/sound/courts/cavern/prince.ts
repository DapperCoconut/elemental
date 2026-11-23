import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../IslesTypes';
import { dim, glow, lit, mixC, mulberry } from '../../../../art/IsleArt';
import { noteShot, repeatSign, soundArcs, stalagmite, wormThread } from './art';
import {
  BRONZE, BRONZE_DARK, BRONZE_LIT, FLOOR, FLOOR_DARK, FLOOR_LIT, FLOW, FLOW_DARK, FLOW_LIT, GHOST, GLOW, GLOW_SOFT,
  REPRISE, REPRISE_DARK, REPRISE_LIT, ROCK, ROCK_DARK, ROCK_DEEP, ROCK_LIT, SILVER, SILVER_DARK, SILVER_LIT, WET,
} from './palette';
import { clamp, dist } from '../../../life/courts/bloom/util';

/**
 * Prince Reprise, the Twice-Heard — the Maestro's first chair in the Echo Caves.
 *
 * Reprise keeps the Repeat: the Score sung into the cave rock so long ago that it has never
 * stopped coming back. He believes nothing worth hearing should be heard only once, and he has
 * not said a new thing in years — he says what was said, again, and finishes other people's
 * sentences with their own last words. He fights the way the cave answers:
 *
 * • **Refrain** (orbiting): every attack comes again a beat and a half later from the mirrored
 *   side of the arena — a ghost of him stands there, and what he does, it does reflected. A
 *   phrase of notes, a pair of bar-lines struck down the floor, a shout that rings out and is
 *   answered by a ring closing in, a delay line that replays your own footsteps.
 * • **Resonance** (anchored, cold): he hums one pitch. Stone pillars round the cave take it up and
 *   ring louder and louder, throwing rings; strike a ringing pillar to damp it. And he holds a
 *   drone that stands in the floor as a wave — the nodes still, the antinodes shaking.
 * • **Feedback Loop** (hard, blinking): his echoes echo. Each repeat comes back bigger and faster
 *   than the last, side to side, until he draws the final bar and starts again.
 */

const TOP = 96;
const ECHO_MS = 1500;

/** The current phase index, read off the rig every frame (0 Refrain, 1 Resonance, 2 Feedback Loop). */
let phaseNow = 0;
/** How many times each attack comes again in this phase. */
const echoes = (): number => (phaseNow === 0 ? 1 : phaseNow >= 2 ? 2 : 0);
/** Mirror a point across the arena's vertical axis. */
const mx = (tk: BossToolkit, x: number): number => tk.W - x;

// ── Shared: notes in flight ──────────────────────────────────────────

interface Note { x: number; y: number; vx: number; vy: number; r: number; dmg: number; color: number; dieAt: number; spent: boolean }

/** A little manager for the note shots Reprise sings: moved, hit-tested and drawn as notes. */
function notePool(tk: BossToolkit) {
  let notes: Note[] = [];
  return {
    fire(x: number, y: number, a: number, speed: number, r: number, dmg: number, color: number): void {
      notes.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, dmg, color, dieAt: tk.now + 5000, spent: false });
    },
    update(time: number, dt: number): void {
      const p = tk.player;
      for (const n of notes) {
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (!n.spent && p.active && p.hp > 0 && dist(n.x, n.y, p.x, p.y) < 20 + n.r) { n.spent = true; tk.hitPlayer(n.dmg, n.x, n.y); }
      }
      notes = notes.filter((n) => !n.spent && time < n.dieAt && n.x > -30 && n.x < tk.W + 30 && n.y > TOP - 30 && n.y < tk.H + 30);
    },
    draw(g: Phaser.GameObjects.Graphics): void {
      for (const n of notes) noteShot(g, n.x, n.y, n.r, Math.atan2(n.vy, n.vx), n.color, 1);
    },
    clear(): void { notes = []; },
  };
}

/** A ghost of Reprise standing at a point, fading in toward its moment: the echo is coming from here. */
function drawGhost(g: Phaser.GameObjects.Graphics, x: number, y: number, k: number, t: number): void {
  const a = clamp(k, 0, 1);
  g.lineStyle(2, GHOST, 0.25 + a * 0.55); g.strokeCircle(x, y, 30);
  g.lineStyle(1, GHOST, 0.2 + a * 0.3); g.strokeCircle(x, y, 38 + Math.sin(t / 90) * 3);
  g.fillStyle(GHOST, 0.08 + a * 0.12); g.fillCircle(x, y, 30);
  // His collar-shell, in outline.
  g.lineStyle(1.5, GHOST, 0.3 + a * 0.5);
  g.beginPath(); g.arc(x - 22, y - 18, 12, 0, Math.PI * 1.6, false); g.strokePath();
  g.beginPath(); g.arc(x - 22, y - 18, 6, 0, Math.PI * 1.6, false); g.strokePath();
  repeatSign(g, x - 6, y - 52, 18, GHOST, 0.3 + a * 0.6);
}

// ── Signature: Phrase ────────────────────────────────────────────────
// He sings a phrase: a fan of notes at you. A beat and a half later the ghost on the mirrored
// side sings it back, reflected. In the Feedback Loop it comes again a second time, bigger.

const phrase = (tk: BossToolkit): SignatureMove => {
  const notes = notePool(tk);
  let ghosts: { x: number; y: number; from: number; at: number }[] = [];
  return {
    durationMs: 1500,
    windupMs: 520,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'PHRASE',
    cast(time) {
      const ox = tk.bossX, oy = tk.bossY;
      const base = tk.angleToPlayer();
      const sing = (x: number, y: number, a0: number, i: number) => {
        const n = 5 + i * 2;
        const spread = 0.62 + i * 0.12;
        for (let k = 0; k < n; k++) {
          const a = a0 + (k / (n - 1) - 0.5) * spread;
          notes.fire(x, y, a, 200 + i * 45, 6 + i * 1.5, 10 + i * 2, i === 0 ? REPRISE_LIT : GHOST);
        }
        tk.sfx(i === 0 ? 'crystal-chime' : 'sonic-pulse');
      };
      sing(ox, oy, base, 0);
      for (let i = 1; i <= echoes(); i++) {
        // Echo i stands mirrored for odd i, back on his own side for even i.
        const odd = i % 2 === 1;
        const ex = odd ? mx(tk, ox) : ox;
        const ea = odd ? Math.PI - base : base;
        const at = time + ECHO_MS * i * (i === 1 ? 1 : 0.8);
        ghosts.push({ x: ex, y: oy, from: time, at });
        tk.schedule(at - time, () => sing(ex, oy, ea, i));
      }
    },
    update(time, dt) {
      notes.update(time, dt);
      ghosts = ghosts.filter((gh) => time < gh.at + 300);
    },
    drawAir(g, time) {
      for (const gh of ghosts) drawGhost(g, gh.x, gh.y, (time - gh.from) / (gh.at - gh.from), time);
      notes.draw(g);
    },
    onPhaseEnd() { notes.clear(); ghosts = []; },
  };
};

// ── Signature: Repeat Bars ───────────────────────────────────────────
// Two bar-lines — a thin one and a thick one, with the repeat dots beside them — are struck
// down the floor through you. Then they are struck again on the mirrored side.

interface Bar { x: number; at: number; fireAt: number; ghost: boolean; wide: number }

const bars = (tk: BossToolkit): SignatureMove => {
  let list: Bar[] = [];
  const lay = (x: number, time: number, warn: number, ghost: boolean, wide: number) => {
    const thin = 14 * wide, thick = 26 * wide;
    tk.spawnLane({ x: clamp(x - 22 * wide, 30, tk.W - 30), y: tk.H / 2, angle: Math.PI / 2, halfW: thin, warnMs: warn, damage: 12 });
    tk.spawnLane({ x: clamp(x + 26 * wide, 30, tk.W - 30), y: tk.H / 2, angle: Math.PI / 2, halfW: thick, warnMs: warn, damage: 14 });
    list.push({ x, at: time, fireAt: time + tk.warn(warn), ghost, wide });
  };
  return {
    durationMs: 1700,
    windupMs: 600,
    gesture: 'slam',
    tell: 'REPEAT BARS',
    cast(time) {
      const x = tk.player.x;
      lay(x, time, 1000, false, 1);
      for (let i = 1; i <= echoes(); i++) {
        const ex = i % 2 === 1 ? mx(tk, x) : x + (tk.player.x > tk.W / 2 ? -120 : 120);
        tk.schedule(ECHO_MS * i * 0.85, () => lay(ex, tk.now, 900 - i * 120, true, 1 + i * 0.3));
      }
      tk.sfx('drum-hit');
    },
    update(time) { list = list.filter((b) => time < b.fireAt + 500); },
    drawGround(g, time) {
      for (const b of list) {
        const k = clamp((time - b.at) / Math.max(1, b.fireAt - b.at), 0, 1);
        const c = b.ghost ? GHOST : REPRISE_LIT;
        // The repeat dots, on the floor beside the bars.
        const dx = b.x - 48 * b.wide;
        for (let y = TOP + 60; y < tk.H; y += 120) {
          g.fillStyle(c, 0.3 + k * 0.5);
          g.fillCircle(dx, y - 14, 7 * b.wide); g.fillCircle(dx, y + 14, 7 * b.wide);
        }
        if (time > b.fireAt) {
          const f = clamp((time - b.fireAt) / 500, 0, 1);
          // Struck: stone dust jumping off the bar-lines.
          for (let y = TOP + 20; y < tk.H; y += 34) {
            g.fillStyle(FLOW_LIT, 0.6 * (1 - f)); g.fillCircle(b.x - 22 * b.wide + Math.sin(y) * 10, y - f * 20, 3);
            g.fillCircle(b.x + 26 * b.wide + Math.cos(y) * 14, y - f * 24, 3.5);
          }
        }
      }
    },
    drawAir(g, time) {
      for (const b of list) {
        if (time > b.fireAt) continue;
        const k = clamp((time - b.at) / Math.max(1, b.fireAt - b.at), 0, 1);
        // The bars hovering high, ready to drop: a repeat sign hanging over the lane.
        repeatSign(g, b.x - 10 * b.wide, TOP + 26, 40 * b.wide, b.ghost ? GHOST : REPRISE_LIT, 0.3 + k * 0.6);
      }
    },
    onPhaseEnd() { list = []; },
  };
};

// ── Signature: Ricochet Call ─────────────────────────────────────────
// He shouts: a ring rings out from him with a gap beside you. A beat and a half later the cave
// answers from the mirrored side — a ring closing in on the mirror point, its gap mirrored.

const ricochet = (tk: BossToolkit): SignatureMove => {
  let marks: { x: number; y: number; at: number; gap: number; closing: boolean }[] = [];
  return {
    durationMs: 1600,
    windupMs: 640,
    gesture: 'clap',
    tell: 'RICOCHET',
    cast(time) {
      const ox = tk.bossX, oy = tk.bossY;
      const gap = tk.angleToPlayer() + (Math.random() < 0.5 ? 0.6 : -0.6);
      tk.spawnRing({ cx: ox, cy: oy, delayMs: 420, speed: 300, gapCentre: gap, gapHalf: 0.55, band: 16, damage: 13 });
      marks.push({ x: ox, y: oy, at: time, gap, closing: false });
      tk.sfx('screech');
      for (let i = 1; i <= echoes(); i++) {
        const odd = i % 2 === 1;
        const ex = odd ? mx(tk, ox) : ox;
        const eg = odd ? Math.PI - gap : gap;
        tk.schedule(ECHO_MS * i * 0.9, () => {
          tk.spawnRing({ cx: ex, cy: oy, delayMs: 380, speed: -(300 + (i - 1) * 60), gapCentre: eg, gapHalf: 0.6, band: 16, damage: 12 + i * 2, startRadius: 640 });
          marks.push({ x: ex, y: oy, at: tk.now, gap: eg, closing: true });
          tk.sfx('sonic-pulse');
        });
      }
    },
    update(time) { marks = marks.filter((m) => time < m.at + 1600); },
    drawGround(g, time) {
      for (const m of marks) {
        const k = clamp((time - m.at) / 1600, 0, 1);
        // The source: a cupped shell mark on the floor, its gap pointed out with a silver wedge.
        g.lineStyle(2, m.closing ? GHOST : REPRISE_LIT, 0.6 * (1 - k)); g.strokeCircle(m.x, m.y, 22);
        g.fillStyle(SILVER_LIT, 0.35 * (1 - k));
        g.fillTriangle(m.x, m.y, m.x + Math.cos(m.gap - 0.3) * 120, m.y + Math.sin(m.gap - 0.3) * 120, m.x + Math.cos(m.gap + 0.3) * 120, m.y + Math.sin(m.gap + 0.3) * 120);
      }
    },
    drawAir(g, time) {
      for (const m of marks) {
        const k = clamp((time - m.at) / 500, 0, 1);
        if (k >= 1) continue;
        soundArcs(g, m.x, m.y, 30 + k * 40, m.gap + Math.PI, 1.2, m.closing ? GHOST : REPRISE_LIT, 1 - k);
      }
    },
    onPhaseEnd() { marks = []; },
  };
};

// ── Signature: Delay Line ────────────────────────────────────────────
// He listens to your footsteps for two seconds — each one lights where you trod — and then
// plays them back: one after another, in the order you made them, each a little burst of
// sound. Don't double back. In the Refrain the mirror plays them too.

interface Step { x: number; y: number; at: number; fireAt: number; dealt: boolean; ghost: boolean }

const delayLine = (tk: BossToolkit): SignatureMove => {
  let steps: Step[] = [];
  let recording: { until: number; next: number; startAt: number } | null = null;
  const R = 40;
  return {
    durationMs: 2400,
    windupMs: 500,
    gesture: 'point',
    hold: 'reach',
    tell: 'DELAY LINE',
    cast(time) {
      recording = { until: time + 2000, next: time, startAt: time };
      tk.sfx('clock-tick');
    },
    update(time) {
      const p = tk.player;
      if (recording) {
        if (time >= recording.next && time < recording.until) {
          recording.next = time + 220;
          const i = steps.filter((s) => !s.ghost && s.at >= recording!.startAt).length;
          const fireAt = recording.until + tk.warn(700) + i * 170;
          steps.push({ x: p.x, y: p.y, at: time, fireAt, dealt: false, ghost: false });
          for (let e = 1; e <= echoes(); e++) {
            const odd = e % 2 === 1;
            steps.push({ x: odd ? mx(tk, p.x) : p.x, y: p.y, at: time, fireAt: fireAt + ECHO_MS * e * 0.8, dealt: false, ghost: true });
          }
        }
        if (time >= recording.until) recording = null;
      }
      for (const s of steps) {
        if (s.dealt || time < s.fireAt) continue;
        s.dealt = true;
        tk.sfx('drum-hit');
        if (p.active && p.hp > 0 && dist(s.x, s.y, p.x, p.y) < R + 16) tk.hitPlayer(s.ghost ? 9 : 10, p.x, p.y);
      }
      steps = steps.filter((s) => !s.dealt || time < s.fireAt + 400);
    },
    drawGround(g, time) {
      for (const s of steps) {
        const c = s.ghost ? GHOST : REPRISE_LIT;
        if (s.dealt) {
          const k = clamp((time - s.fireAt) / 400, 0, 1);
          g.lineStyle(3 * (1 - k), c, 1 - k); g.strokeCircle(s.x, s.y, R * (0.6 + k * 0.8));
          continue;
        }
        const k = clamp(1 - (s.fireAt - time) / 900, 0, 1);
        // A footprint pair, lit like a pressed key, and the burst reach round it.
        g.fillStyle(c, 0.12 + k * 0.25); g.fillCircle(s.x, s.y, R);
        g.lineStyle(1.5, c, 0.3 + k * 0.6); g.strokeCircle(s.x, s.y, R);
        g.fillStyle(c, 0.6); g.fillEllipse(s.x - 6, s.y - 3, 7, 11); g.fillEllipse(s.x + 6, s.y + 3, 7, 11);
      }
      // The order: a faint line threading the footprints.
      const own = steps.filter((s) => !s.ghost && !s.dealt);
      for (let i = 1; i < own.length; i++) { g.lineStyle(1, REPRISE_LIT, 0.3); g.lineBetween(own[i - 1].x, own[i - 1].y, own[i].x, own[i].y); }
    },
    drawAir(g, time) {
      if (!recording) return;
      // He listens: an ear-shell of arcs turned toward you.
      const a = tk.angleToPlayer();
      soundArcs(g, tk.bossX, tk.bossY, 30, a, 0.5, GHOST, 0.5 + Math.sin(time / 100) * 0.3);
    },
    onPhaseEnd() { steps = []; recording = null; },
  };
};

// ── Signature: The Hum (Resonance) ───────────────────────────────────
// Four stone pillars stand in the cave. He hums one pitch; the pillars nearest you take it up and
// begin to ring, louder and louder, each throwing out rings that grow with it. Strike a ringing
// pillar to damp it. Leave one long enough and it rings itself to a great final peal.

interface Pillar { x: number; y: number; target: StrikeTarget | null; ringFrom: number; nextRing: number; dampedAt: number; ringing: boolean }
interface PRing { x: number; y: number; at: number; max: number; dmg: number; hit: boolean }

const hum = (tk: BossToolkit): SignatureMove => {
  let pillars: Pillar[] = [];
  let rings: PRing[] = [];
  const RISE_MS = 7000;
  const ensure = () => {
    if (pillars.length) return;
    const spots = [[170, 210], [tk.W - 170, 210], [170, tk.H - 110], [tk.W - 170, tk.H - 110]];
    pillars = spots.map(([x, y]) => {
      const p: Pillar = { x, y, target: null, ringFrom: 0, nextRing: 0, dampedAt: -9999, ringing: false };
      p.target = tk.spawnTarget({
        x, y, r: 26,
        onStruck: (by) => {
          if (by !== 'player' || !p.ringing) return;
          p.ringing = false;
          p.dampedAt = tk.now;
          tk.sfx('hush');
        },
      });
      return p;
    });
  };
  const loud = (p: Pillar, time: number) => clamp((time - p.ringFrom) / RISE_MS, 0, 1);
  return {
    durationMs: 1800,
    windupMs: 700,
    gesture: 'flex',
    hold: 'brace',
    tell: 'THE HUM',
    cast(time) {
      ensure();
      const pl = tk.player;
      const quiet = pillars.filter((p) => !p.ringing).sort((a, b) => dist(a.x, a.y, pl.x, pl.y) - dist(b.x, b.y, pl.x, pl.y));
      for (const p of quiet.slice(0, tk.hard ? 3 : 2)) { p.ringing = true; p.ringFrom = time; p.nextRing = time + 600; }
      tk.sfx('beam-charge');
    },
    update(time) {
      const pl = tk.player;
      for (const p of pillars) {
        if (!p.ringing || time < p.nextRing) continue;
        const k = loud(p, time);
        if (k >= 1) {
          // The final peal: a wide ring, then it falls quiet.
          rings.push({ x: p.x, y: p.y, at: time, max: 520, dmg: 18, hit: false });
          p.ringing = false;
          tk.sfx('holy-chord');
          continue;
        }
        p.nextRing = time + 1150 - k * 350;
        rings.push({ x: p.x, y: p.y, at: time, max: 130 + k * 220, dmg: Math.round(6 + k * 8), hit: false });
        tk.sfx('crystal-chime');
      }
      for (const r of rings) {
        const rad = ((time - r.at) / 1000) * 230;
        if (!r.hit && pl.active && pl.hp > 0 && rad > 30 && Math.abs(dist(r.x, r.y, pl.x, pl.y) - rad) < 14) { r.hit = true; tk.hitPlayer(r.dmg, pl.x, pl.y); }
      }
      rings = rings.filter((r) => ((time - r.at) / 1000) * 230 < r.max);
    },
    drawGround(g, time) {
      for (const r of rings) {
        const rad = ((time - r.at) / 1000) * 230;
        if (rad < 30) continue;
        const a = 1 - rad / r.max;
        g.lineStyle(10, REPRISE, 0.14 * a); g.strokeCircle(r.x, r.y, rad);
        g.lineStyle(2, REPRISE_LIT, 0.8 * a); g.strokeCircle(r.x, r.y, rad);
      }
      for (const p of pillars) { g.fillStyle(0x000000, 0.3); g.fillEllipse(p.x + 4, p.y + 4, 64, 20); }
    },
    drawAir(g, time) {
      for (const p of pillars) {
        const k = p.ringing ? loud(p, time) : 0;
        const shake = p.ringing ? Math.sin(time / (30 - k * 18)) * (1 + k * 3) : 0;
        const x = p.x + shake, y = p.y;
        // A squat flowstone pillar, banded with bronze, its top rising off into the roof.
        g.fillStyle(FLOW_DARK, 1); g.fillRect(x - 22, y - 70, 44, 72);
        g.fillStyle(FLOW, 1); g.fillRect(x - 20, y - 70, 32, 70);
        g.fillStyle(FLOW_LIT, 0.6); g.fillRect(x - 16, y - 70, 6, 70);
        g.fillStyle(FLOW_DARK, 1); g.fillEllipse(x, y, 52, 14);
        g.fillStyle(FLOW, 1); g.fillEllipse(x, y - 2, 46, 10);
        for (const by of [y - 54, y - 26]) {
          g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 23, by, 46, 6);
          g.fillStyle(p.ringing ? lit(BRONZE_LIT, k * 0.4) : BRONZE, 1); g.fillRect(x - 23, by, 46, 3);
        }
        g.fillStyle(FLOW_DARK, 1); g.fillTriangle(x - 22, y - 70, x + 22, y - 70, x, y - 92);
        if (p.ringing) {
          glow(g, x, y - 36, 40 + k * 30, REPRISE_LIT, 0.04 + k * 0.06, 3);
          soundArcs(g, x, y - 40, 30 + k * 10, 0, 0.6, REPRISE_LIT, 0.4 + k * 0.5);
          soundArcs(g, x, y - 40, 30 + k * 10, Math.PI, 0.6, REPRISE_LIT, 0.4 + k * 0.5);
          // A loudness bar on the pillar's face.
          g.fillStyle(0x000000, 0.5); g.fillRect(x - 3, y - 66, 6, 40);
          g.fillStyle(mixC(REPRISE_LIT, 0xff8a6a, k), 1); g.fillRect(x - 2, y - 27 - k * 38, 4, k * 38);
        } else if (time - p.dampedAt < 600) {
          const d = (time - p.dampedAt) / 600;
          g.lineStyle(2, SILVER_LIT, 1 - d); g.strokeCircle(x, y - 36, 30 + d * 20);
        }
      }
    },
    onPhaseEnd() {
      for (const p of pillars) p.target?.remove();
      pillars = [];
      rings = [];
    },
  };
};

// ── Signature: Drone (Resonance) ─────────────────────────────────────
// He holds the note, and it stands in the floor as a wave: still nodes, shaking antinodes. The
// antinodes strike; then the wave shifts half a step, and what was still shakes.

const drone = (tk: BossToolkit): SignatureMove => {
  let beats: { offset: number; at: number; fireAt: number; dealt: boolean }[] = [];
  const WAVE = 180;
  const HALF = 44;
  const near = (x: number, off: number) => {
    const ph = ((x - off) % WAVE + WAVE) % WAVE;
    return Math.min(ph, WAVE - ph) < HALF;
  };
  return {
    durationMs: 2600,
    windupMs: 650,
    gesture: 'raise',
    hold: 'charge',
    tell: 'DRONE',
    cast(time) {
      const off = tk.player.x;
      beats = [
        { offset: off, at: time, fireAt: time + tk.warn(1100), dealt: false },
        { offset: off + WAVE / 2, at: time + tk.warn(1100), fireAt: time + tk.warn(1100) + tk.warn(950), dealt: false },
      ];
      tk.sfx('beam-charge');
    },
    update(time) {
      const p = tk.player;
      for (const b of beats) {
        if (b.dealt || time < b.fireAt) continue;
        b.dealt = true;
        tk.sfx('quake');
        if (p.active && p.hp > 0 && near(p.x, b.offset)) tk.hitPlayer(15, p.x, p.y);
      }
      beats = beats.filter((b) => !b.dealt || time < b.fireAt + 400);
    },
    drawGround(g, time) {
      for (const b of beats) {
        if (time < b.at) continue;
        const k = clamp((time - b.at) / Math.max(1, b.fireAt - b.at), 0, 1);
        for (let x0 = ((b.offset % WAVE) + WAVE) % WAVE - WAVE; x0 < tk.W + WAVE; x0 += WAVE) {
          if (b.dealt) {
            const f = clamp((time - b.fireAt) / 400, 0, 1);
            g.fillStyle(REPRISE_LIT, 0.4 * (1 - f)); g.fillRect(x0 - HALF, TOP, HALF * 2, tk.H - TOP);
            continue;
          }
          // The antinode: a standing-wave envelope shaking in the stone.
          g.fillStyle(REPRISE, 0.08 + k * 0.16); g.fillRect(x0 - HALF, TOP, HALF * 2, tk.H - TOP);
          g.lineStyle(1.5, REPRISE_LIT, 0.3 + k * 0.5);
          g.beginPath();
          for (let y = TOP; y <= tk.H; y += 12) {
            const w = Math.sin(y / 18 + time / (60 - k * 30)) * HALF * (0.5 + k * 0.5);
            if (y === TOP) g.moveTo(x0 + w, y); else g.lineTo(x0 + w, y);
          }
          g.strokePath();
          g.beginPath();
          for (let y = TOP; y <= tk.H; y += 12) {
            const w = -Math.sin(y / 18 + time / (60 - k * 30)) * HALF * (0.5 + k * 0.5);
            if (y === TOP) g.moveTo(x0 + w, y); else g.lineTo(x0 + w, y);
          }
          g.strokePath();
          // The node between is still: a calm silver line.
          g.lineStyle(1, SILVER_LIT, 0.35); g.lineBetween(x0 + WAVE / 2, TOP, x0 + WAVE / 2, tk.H);
        }
      }
    },
    onPhaseEnd() { beats = []; },
  };
};

// ── Signature: Feedback Loop (hard) ──────────────────────────────────
// He sings a phrase and it comes back from the other side bigger and faster; then back from his
// side bigger and faster again; four times, the gaps shrinking — and then he draws the final
// bar, and the loop is broken until he starts it over.

const loop = (tk: BossToolkit): SignatureMove => {
  const notes = notePool(tk);
  let ghosts: { x: number; y: number; from: number; at: number }[] = [];
  let finalAt = -9999;
  let finalX = 0, finalY = 0;
  return {
    durationMs: 3800,
    windupMs: 560,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'FEEDBACK LOOP',
    cast(time) {
      const ox = tk.bossX, oy = tk.bossY;
      const base = tk.angleToPlayer();
      let t = 0;
      const ROUNDS = tk.hard ? 4 : 3;
      for (let i = 0; i < ROUNDS; i++) {
        const odd = i % 2 === 1;
        const x = odd ? mx(tk, ox) : ox;
        const a0 = odd ? Math.PI - base : base;
        const at = time + t;
        if (i > 0) ghosts.push({ x, y: oy, from: at - 600, at });
        tk.schedule(t, () => {
          const n = 3 + i * 2;
          const spread = 0.4 + i * 0.14;
          for (let k = 0; k < n; k++) notes.fire(x, oy, a0 + (n > 1 ? (k / (n - 1) - 0.5) * spread : 0), 180 + i * 55, 5 + i * 1.6, 8 + i * 2, mixC(REPRISE_LIT, 0xff8a6a, i / ROUNDS));
          tk.sfx(i < 2 ? 'sonic-pulse' : 'screech');
        });
        t += Math.max(520, 1150 - i * 200);
      }
      tk.schedule(t, () => { finalAt = tk.now; finalX = ox; finalY = oy; tk.sfx('clang'); });
    },
    update(time, dt) {
      notes.update(time, dt);
      ghosts = ghosts.filter((gh) => time < gh.at + 300);
    },
    drawAir(g, time) {
      for (const gh of ghosts) drawGhost(g, gh.x, gh.y, (time - gh.from) / (gh.at - gh.from), time);
      notes.draw(g);
      if (time - finalAt < 800) {
        // The final bar: two heavy strokes drawn down beside him.
        const k = (time - finalAt) / 800;
        g.fillStyle(SILVER_LIT, 1 - k); g.fillRect(finalX + 40, finalY - 50, 4, 100); g.fillRect(finalX + 50, finalY - 50, 10, 100);
      }
    },
    onPhaseEnd() { notes.clear(); ghosts = []; },
  };
};

// ── Body history (for the trailing echoes of him) ────────────────────

const trail: { x: number; y: number; t: number }[] = [];

export const REPRISE_BOSS: WorldBossDef = {
  worldId: 'isle:reprise',
  name: 'Prince Reprise',
  title: 'the Twice-Heard',
  color: REPRISE,
  colorLit: REPRISE_LIT,
  colorDark: REPRISE_DARK,
  accent: GLOW,
  // Tier 2 of the ninth isle.
  damageMult: 1.35,

  intro: [
    'Again. You came again. Everyone comes again, in the end. The cave sees to it.',
    'Something said once is a rumour. Said twice, it is the Score. Shall we say it twice?',
  ],
  banter: [
    'Said twice. Said twice.',
    'Nothing new is ever sung in my caves. Nothing new needs to be.',
    'I have not said a new word in eleven years. I have never been misheard.',
    'You moved. You moved. The cave remembers where you were.',
    'The Maestro wrote it once. I keep it. I keep it.',
  ],
  defeatLine: 'ONCE… ONLY ONCE',
  resumeLine: 'Again. From the top. From the top.',

  phases: [
    {
      name: 'Refrain',
      line: 'Whatever I do, the cave does after me. Mind the other side. Mind the other side.',
      hp: 540,
      cycle: [
        'sig:phrase', 'sig:bars', 'sig:ricochet', 'sig:delay',
        'sig:phrase', 'sig:ricochet', 'sig:bars', 'sig:delay',
      ],
      harass: ['h-snipe'],
      restMs: 1350,
      harassMs: 3900,
    },
    {
      name: 'Resonance',
      line: 'One note. Hold it. Hold it. Let the stone take it up.',
      hp: 620,
      cycle: [
        'sig:hum', 'sig:drone', 'spiral', 'sig:phrase', 'sig:drone',
        'barrage', 'sig:hum', 'lanes', 'sig:drone',
      ],
      harass: ['h-orbs', 'h-flak'],
      restMs: 1200,
      harassMs: 3300,
    },
  ],

  hard: {
    introLine: 'HIS ECHOES ECHO',
    extraPhase: {
      name: 'Feedback Loop',
      line: 'Again, and louder. Again, and louder. Again —',
      hp: 460,
      cycle: [
        'sig:loop', 'sig:delay', 'sig:ricochet', 'sig:loop',
        'sig:bars', 'homing', 'sig:loop', 'sig:drone',
      ],
      harass: ['h-snipe', 'h-rune'],
      restMs: 1050,
      harassMs: 2800,
    },
  },

  tuning: {
    spiral: { arms: 4, speed: 170 },
    barrage: { count: 6 },
    lanes: { halfW: 26 },
    homing: { count: 4, speed: 170 },
  },

  signatures: { phrase, bars, ricochet, delay: delayLine, hum, drone, loop },

  look: {
    crest: 'none', pattern: 'rings', aura: 'none', hands: 'orb',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: GHOST,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'cold', look: { aura: 'frost', hands: 'ball', pattern: 'smooth' } },
    { movement: 'blink', gimmick: 'none', tint: 'void', look: { aura: 'glitch', hands: 'wisp', mouth: 'grate', eyes: 3 } },
  ],

  /**
   * The Twice-Heard's tells. A great spiral conch grows from his left shoulder like a ruff —
   * the Sounding Shell in little — and he holds a second, smaller conch to his ear in his other
   * hand, always listening. A silver circlet on his brow hangs a repeat sign over his eyes. Two
   * faint copies of him trail behind wherever he goes, a beat late; in the Refrain a third stands
   * mirrored across the arena, doing what he does. In Resonance a hum rings off his throat in
   * slow silver circles. In the Feedback Loop the copies multiply and jitter, too close and too
   * many, as if the cave cannot stop.
   */
  drawDecor(g, s) {
    phaseNow = s.phaseIdx;
    const R = s.radius;
    // The trailing copies.
    trail.push({ x: s.x, y: s.y, t: s.t });
    while (trail.length && s.t - trail[0].t > 900) trail.shift();
    if (trail.length && s.t < trail[trail.length - 1].t) trail.length = 0;
    const lags = s.phaseIdx >= 2 ? [120, 240, 360, 480] : [280, 560];
    for (let i = 0; i < lags.length; i++) {
      const want = s.t - lags[i];
      const p = trail.find((q) => q.t >= want);
      if (!p || dist(p.x, p.y, s.x, s.y) < 6) continue;
      const jx = s.phaseIdx >= 2 ? Math.sin(s.t / 30 + i) * 4 : 0;
      g.lineStyle(2, GHOST, 0.35 - i * 0.06); g.strokeCircle(p.x + jx, p.y, R);
      g.fillStyle(GHOST, 0.07); g.fillCircle(p.x + jx, p.y, R);
    }
    // The mirrored stand-in, in the Refrain.
    if (s.phaseIdx === 0) {
      const gx = 960 - s.x;
      if (Math.abs(gx - s.x) > 60) {
        g.lineStyle(1.5, GHOST, 0.28); g.strokeCircle(gx, s.y, R);
        g.lineStyle(1, GHOST, 0.18); g.strokeCircle(gx, s.y, R + 8 + Math.sin(s.t / 200) * 2);
        repeatSign(g, gx - 6, s.y - R - 26, 18, GHOST, 0.4);
        // A dotted mirror line between them.
        for (let k = 0; k < 6; k++) { g.fillStyle(GHOST, 0.25); g.fillCircle(480, s.y - 30 + k * 12, 1.5); }
      }
    }
    // The conch ruff on the left shoulder: whorls stepping in to the apex.
    const cx = s.x - R * 0.78, cy = s.y - R * 0.5;
    for (let k = 0; k < 4; k++) {
      const r = R * 0.62 * Math.pow(0.68, k);
      const ox = cx + Math.cos(k * 1.9 + 0.4) * r * 0.3, oy = cy + Math.sin(k * 1.9 + 0.4) * r * 0.25;
      g.fillStyle(dim(FLOW_LIT, 0.25), 1); g.fillEllipse(ox, oy + 2, r * 2.1, r * 1.8);
      g.fillStyle(mixC(FLOW_LIT, REPRISE_LIT, 0.25 + k * 0.1), 1); g.fillEllipse(ox, oy, r * 2, r * 1.7);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.lineStyle(1, dim(FLOW, 0.2), 0.6); g.lineBetween(ox + Math.cos(a) * r * 0.5, oy + Math.sin(a) * r * 0.4, ox + Math.cos(a) * r, oy + Math.sin(a) * r * 0.85);
      }
    }
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * 0.9 + i * 0.32, r = R * 0.62;
      const bx = cx + Math.cos(a) * r, by = cy + Math.sin(a) * r * 0.85;
      g.fillStyle(FLOW_LIT, 1); g.fillTriangle(bx - 3, by, bx + 3, by, bx + Math.cos(a) * 10, by + Math.sin(a) * 9);
    }
    g.fillStyle(REPRISE_DARK, 1); g.fillEllipse(cx + R * 0.2, cy + R * 0.18, R * 0.36, R * 0.26);
    // The silver circlet and its hanging repeat sign.
    g.lineStyle(2.5, SILVER_DARK, 1); g.beginPath(); g.arc(s.x, s.y - R * 0.15, R * 0.86, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
    g.lineStyle(1.5, SILVER_LIT, 1); g.beginPath(); g.arc(s.x, s.y - R * 0.18, R * 0.86, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
    g.lineStyle(1, SILVER, 1); g.lineBetween(s.x, s.y - R * 1.02, s.x, s.y - R * 0.86);
    repeatSign(g, s.x - 3, s.y - R * 0.7, 12, SILVER_LIT, 0.9 + s.castGlow * 0.1);
    // The listening conch in his second hand, held up toward his ear.
    const hand = s.hands[1];
    if (hand) {
      const hx = hand.x + 2, hy = hand.y - 8;
      g.fillStyle(dim(FLOW_LIT, 0.2), 1); g.fillEllipse(hx, hy, 18, 13);
      g.fillStyle(mixC(FLOW_LIT, 0xf0c8d8, 0.5), 1); g.fillEllipse(hx - 1, hy - 1, 15, 10);
      g.fillStyle(0xf0c8d8, 1); g.fillEllipse(hx - 3, hy, 6, 5);
      g.lineStyle(1, FLOW_DARK, 0.8); g.beginPath(); g.arc(hx + 3, hy - 1, 4, 0, Math.PI * 1.5, false); g.strokePath();
      if (s.castGlow > 0.2) soundArcs(g, hx, hy, 12, Math.atan2(s.y - hy, s.x - hx) + Math.PI, 0.6, GHOST, s.castGlow);
    }
    // The hum off his throat, in Resonance.
    if (s.phaseIdx === 1) {
      for (let k = 0; k < 3; k++) {
        const ph = ((s.t / 1400) + k / 3) % 1;
        g.lineStyle(1.5, SILVER_LIT, 0.5 * (1 - ph)); g.strokeEllipse(s.x, s.y + R * 0.5, R * (0.8 + ph * 2.4), R * (0.3 + ph * 0.9));
      }
    }
    if (s.enraged) { g.lineStyle(1.5, REPRISE_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.4); }
  },

  /**
   * The Sounding Shell's floor: dark slate carved in rings round the middle — the shape of a
   * sound going out — split down the centre by an inlaid silver mirror line with the repeat dots
   * on either side, so that every half of the floor is the other half reflected. Stalagmites
   * stand round the walls in matching pairs; glowworm threads hang from the roof under the HUD;
   * shallow pools on both sides hold the same blue light.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x7e9415e);
    g.fillStyle(FLOOR, 1); g.fillRect(0, 0, W, H);
    const cx = W / 2, cy = (H + TOP) / 2;
    // Carved rings, alternating shades, mirrored by construction.
    for (let k = 12; k >= 1; k--) {
      g.fillStyle(k % 2 ? FLOOR_LIT : FLOOR, 1); g.fillEllipse(cx, cy, k * 80, k * 56);
    }
    for (let k = 1; k <= 12; k++) { g.lineStyle(1, FLOOR_DARK, 0.7); g.strokeEllipse(cx, cy, k * 80, k * 56); }
    // Radial grooves.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.lineStyle(1, FLOOR_DARK, 0.5); g.lineBetween(cx + Math.cos(a) * 60, cy + Math.sin(a) * 42, cx + Math.cos(a) * 520, cy + Math.sin(a) * 364);
    }
    // The mirror line.
    g.fillStyle(SILVER_DARK, 1); g.fillRect(cx - 4, TOP, 8, H - TOP);
    g.fillStyle(SILVER_LIT, 0.9); g.fillRect(cx - 1.5, TOP, 3, H - TOP);
    for (let y = TOP + 50; y < H; y += 110) {
      for (const sx of [-1, 1]) {
        g.fillStyle(SILVER, 0.7); g.fillCircle(cx + sx * 16, y - 10, 4); g.fillCircle(cx + sx * 16, y + 10, 4);
      }
    }
    // The centre boss: a repeat sign inlaid in bronze.
    g.fillStyle(REPRISE_DARK, 1); g.fillCircle(cx, cy, 44);
    g.fillStyle(REPRISE, 0.8); g.fillCircle(cx, cy, 38);
    repeatSign(g, cx - 8, cy, 48, BRONZE_LIT, 1);
    g.lineStyle(2, BRONZE, 0.8); g.strokeCircle(cx, cy, 46);
    // Matching pools on both sides.
    for (const sx of [-1, 1]) {
      const px = cx + sx * 300, py = cy + 150;
      g.fillStyle(FLOOR_DARK, 1); g.fillEllipse(px, py, 120, 36);
      g.fillStyle(WET, 1); g.fillEllipse(px, py, 108, 28);
      g.fillStyle(GLOW_SOFT, 0.35); g.fillEllipse(px - 20, py - 4, 40, 6);
    }
    // The roof band under the HUD: rock, curtains, glowworm threads.
    g.fillStyle(ROCK_DEEP, 1); g.fillRect(0, 0, W, TOP + 6);
    for (let x = 0; x < W; x += 40) {
      g.fillStyle(ROCK_DARK, 1); g.fillEllipse(x + 20, TOP - 6, 60, 34);
      g.fillStyle(ROCK, 1); g.fillEllipse(x + 16, TOP - 12, 44, 20);
      g.fillStyle(ROCK_LIT, 0.4); g.fillEllipse(x + 10, TOP - 18, 20, 6);
    }
    for (let i = 0; i < 26; i++) wormThread(g, 18 + i * 36 + (i % 2) * 8, TOP - 8, 10 + ((i * 13) % 26), i * 0.7, i);
    // Stalagmites in mirrored pairs down the side walls.
    for (let y = TOP + 70; y < H - 30; y += 120) {
      const s = 0.7 + rng() * 0.4;
      const seed = rng() * 1000;
      stalagmite(g, 26, y, s, mulberry(seed));
      stalagmite(g, W - 26, y, s, mulberry(seed));
    }
    // Glints of wet on the rings.
    for (let i = 0; i < 60; i++) {
      const x = rng() * W / 2, y = TOP + 20 + rng() * (H - TOP - 40);
      g.fillStyle(GLOW, 0.25); g.fillCircle(x, y, 1); g.fillCircle(W - x, y, 1);
    }
  },
};
