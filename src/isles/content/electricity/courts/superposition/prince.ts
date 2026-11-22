import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mixC, mulberry } from '../../../../art/IsleArt';
import { crownGlyph, sealedBox, stencilEye } from './art';
import {
  ARC, BASALT, BASALT_DARK, BOTH, BOTH_ACCENT, BOTH_LIT, BOTH_PRINCE, BOTH_PRINCE_DARK, BOTH_PRINCE_LIT, BRASS, BRASS_DARK,
  COPPER, COPPER_DARK, COPPER_LIT, IRON, STATE_A, STATE_A_DARK, STATE_A_LIT, STATE_B, STATE_B_DARK, STATE_B_LIT,
} from './palette';
import { clamp, dist, wrapAngle } from './util';

/**
 * Prince Both — Empress Ohmrine's child, governor of the Superposition Court.
 *
 * Both was born in the top ring of the Crown Coil in the worst storm of a stormy year, and the
 * midwives could not say whether the child had lived. The Empress, who decides everything, would
 * not decide that: she had the cradle sealed, and for seven years her child was alive and not
 * until anyone looked. He has never quite collapsed since. He governs a court where every house
 * is metered twice, once for each state, and owes the Draw on both; he thinks this is fair.
 *
 * • **Here and There** (blinking): he stands in two places — the body and a double — and both
 *   loose darts, but only one volley at a time is real. Aim at a body and you collapse it: the one
 *   you look at becomes the real one. He sends spin-up and spin-down orbs out in curling rings,
 *   and strikes where Uncertainty says you are (still, a sharp strike on you; moving, a smear
 *   down your path).
 * • **Collapse** (anchored, pale): every attack is a cloud of maybes that collapses into one
 *   strike — a cloud of candidate blasts that picks one (the brightest are likeliest), and two
 *   lattices of lanes of which only one is real.
 * • **Many Worlds** (hard, orbiting, void): the Both of other worlds step through rifts and fight
 *   beside him, and the room branches into worlds that strike one after the other.
 */

const TOP = 96;

/**
 * The player's look. A signature has no GimmickCtx (so no `facing`): read the aim straight off
 * the arena pointer, the same way the fight kit does; with no pointer, straight at the prince.
 */
function lookAngle(tk: BossToolkit): number {
  const p = tk.player;
  const ptr = tk.scene.input?.activePointer;
  if (ptr) return Math.atan2(ptr.worldY - p.y, ptr.worldX - p.x);
  return Math.atan2(tk.bossY - p.y, tk.bossX - p.x);
}

/** Is the player looking at (x, y) (within `half` radians of their aim)? */
function looksAt(tk: BossToolkit, x: number, y: number, half = 0.32): boolean {
  const p = tk.player;
  return Math.abs(wrapAngle(Math.atan2(y - p.y, x - p.x) - lookAngle(tk))) < half;
}

/** A ghost of the prince: a translucent body, a doubled outline, a crown that will not settle. */
function ghostBody(g: Phaser.GameObjects.Graphics, x: number, y: number, time: number, tint: number, a: number, crisp = 0): void {
  const r = 34;
  const off = Math.sin(time / 120) * 5 * (1 - crisp);
  glow(g, x, y, r + 16, tint, 0.05 * a, 3);
  g.fillStyle(dim(tint, 0.5), 0.45 * a); g.fillCircle(x, y, r);
  g.lineStyle(2, STATE_A, 0.7 * a); g.strokeCircle(x - off, y, r);
  g.lineStyle(2, STATE_B, 0.7 * a); g.strokeCircle(x + off, y, r);
  g.fillStyle(BOTH_ACCENT, 0.8 * a); g.fillCircle(x - 10, y - 6, 3.5); g.fillCircle(x + 10, y - 6, 3.5);
  crownGlyph(g, x, y - r - 2 - Math.abs(off), 12, BRASS, 0.8 * a);
}

// ── Signature: Here and There ────────────────────────────────────────
// A double steps out of him, across the room. Three volleys of darts come from both bodies at
// once, but each volley only one body is real; the other's darts are hollow and pass harmlessly.
// Unwatched, reality picks at random. Aimed at, a body collapses: the one you look at is real.

interface Ghost { x: number; y: number; vx: number; vy: number; dieAt: number }

const hereAndThere = (tk: BossToolkit): SignatureMove => {
  let double: { x: number; y: number } | null = null;
  let volleys: { at: number; done: boolean }[] = [];
  let ghosts: Ghost[] = [];
  let realFlash: { x: number; y: number; at: number; real: boolean }[] = [];
  let endAt = 0;
  return {
    durationMs: 3800,
    windupMs: 600,
    gesture: 'point',
    tell: 'HERE AND THERE',
    cast(time) {
      const p = tk.player;
      // Across the room from himself, never on top of you.
      let dx = tk.W - tk.bossX, dy = TOP + tk.H - tk.bossY;
      if (dist(dx, dy, p.x, p.y) < 200) { dx = tk.W / 2 + (tk.W / 2 - p.x) * 0.8; dy = (TOP + tk.H) / 2 + ((TOP + tk.H) / 2 - p.y) * 0.8; }
      double = { x: tk.clampX(dx, 90), y: tk.clampY(dy, 90) };
      const n = tk.hard ? 4 : 3;
      volleys = [];
      for (let i = 0; i < n; i++) volleys.push({ at: time + tk.warn(900) + i * 900, done: false });
      endAt = time + tk.warn(900) + n * 900 + 2500;
      tk.sfx('blink');
    },
    update(time, dt) {
      if (!double) return;
      for (const v of volleys) {
        if (v.done || time < v.at) continue;
        v.done = true;
        const bodies = [{ x: tk.bossX, y: tk.bossY }, double];
        const seen = bodies.findIndex((b) => looksAt(tk, b.x, b.y));
        const real = seen >= 0 ? seen : Math.random() < 0.5 ? 0 : 1;
        bodies.forEach((b, i) => {
          const a = tk.angleToPlayer(b.x, b.y);
          for (const k of [-2, -1, 0, 1, 2]) {
            const ang = a + k * 0.17;
            if (i === real) tk.spawnBullet({ x: b.x, y: b.y, angle: ang, speed: 250, damage: 7, r: 6, lifeMs: 4500, color: BOTH_PRINCE_LIT });
            else ghosts.push({ x: b.x, y: b.y, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, dieAt: time + 4500 });
          }
          realFlash.push({ x: b.x, y: b.y, at: time, real: i === real });
        });
        tk.sfx('zap');
      }
      for (const gh of ghosts) { gh.x += gh.vx * dt; gh.y += gh.vy * dt; }
      ghosts = ghosts.filter((gh) => time < gh.dieAt && gh.x > -20 && gh.x < tk.W + 20 && gh.y > TOP - 20 && gh.y < tk.H + 20);
      realFlash = realFlash.filter((f) => time - f.at < 500);
      if (time > endAt) { double = null; volleys = []; }
    },
    drawGround(g, time) {
      if (!double) return;
      // A thread of violet joining the two bodies — they are one thing in two places.
      const n = 14;
      g.lineStyle(1.5, BOTH, 0.35);
      g.beginPath();
      for (let k = 0; k <= n; k++) {
        const f = k / n;
        const x = tk.bossX + (double.x - tk.bossX) * f, y = tk.bossY + (double.y - tk.bossY) * f + Math.sin(f * 12 + time / 90) * 8 * Math.sin(f * Math.PI);
        if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
      // The body you are looking at shows its rim on the floor: collapsing under your eye.
      for (const b of [{ x: tk.bossX, y: tk.bossY }, double]) {
        if (!looksAt(tk, b.x, b.y)) continue;
        g.lineStyle(3, BOTH_LIT, 0.7); g.strokeEllipse(b.x, b.y + 30, 90, 26);
      }
    },
    drawAir(g, time) {
      if (!double) return;
      const seenDouble = looksAt(tk, double.x, double.y);
      ghostBody(g, double.x, double.y, time, BOTH_PRINCE, seenDouble ? 0.95 : 0.6, seenDouble ? 1 : 0);
      if (seenDouble) stencilEye(g, double.x, double.y - 64, 6, BOTH_LIT, 0.9);
      for (const gh of ghosts) {
        g.lineStyle(1.5, BOTH_LIT, 0.5); g.strokeCircle(gh.x, gh.y, 6);
        g.lineStyle(1, BOTH_LIT, 0.25); g.lineBetween(gh.x, gh.y, gh.x - gh.vx * 0.03, gh.y - gh.vy * 0.03);
      }
      for (const f of realFlash) {
        const k = (time - f.at) / 500;
        g.lineStyle(3, f.real ? 0xffffff : BOTH, (1 - k) * (f.real ? 1 : 0.4)); g.strokeCircle(f.x, f.y, 40 + k * 30);
      }
    },
    onPhaseEnd() { double = null; volleys = []; ghosts = []; realFlash = []; },
  };
};

// ── Signature: Spin Up, Spin Down ────────────────────────────────────
// A ring of orbs forms round him, each marked with an arrow: spin up or spin down. They fly out
// together; the ups curl one way and the downs the other, so the ring shears into a lattice of
// crossing paths with diamond gaps between them.

interface Spin { x: number; y: number; a: number; dir: number; speed: number; dieAt: number; hit: boolean }

const spinUpDown = (tk: BossToolkit): SignatureMove => {
  let orbs: Spin[] = [];
  let forming: { at: number; launchAt: number; n: number; base: number } | null = null;
  return {
    durationMs: 2400,
    windupMs: 500,
    gesture: 'raise',
    tell: 'SPIN UP · SPIN DOWN',
    cast(time) {
      forming = { at: time, launchAt: time + tk.warn(800), n: tk.hard ? 16 : 12, base: Math.random() * Math.PI * 2 };
      tk.sfx('electric-charge');
    },
    update(time, dt) {
      if (forming && time >= forming.launchAt) {
        for (let i = 0; i < forming.n; i++) {
          const a = forming.base + (i / forming.n) * Math.PI * 2;
          orbs.push({ x: tk.bossX + Math.cos(a) * 46, y: tk.bossY + Math.sin(a) * 46, a, dir: i % 2 ? 1 : -1, speed: 165, dieAt: time + 5200, hit: false });
        }
        forming = null;
        tk.sfx('plasma-arc');
      }
      const p = tk.player;
      for (const o of orbs) {
        o.a += o.dir * 0.85 * dt;
        o.x += Math.cos(o.a) * o.speed * dt;
        o.y += Math.sin(o.a) * o.speed * dt;
        if (!o.hit && p.active && p.hp > 0 && dist(o.x, o.y, p.x, p.y) < 20 + 7) { o.hit = true; tk.hitPlayer(7, p.x, p.y); }
      }
      orbs = orbs.filter((o) => !o.hit && time < o.dieAt && o.x > -30 && o.x < tk.W + 30 && o.y > TOP - 30 && o.y < tk.H + 30);
    },
    drawGround(g, time) {
      if (!forming) return;
      const k = clamp((time - forming.at) / Math.max(1, forming.launchAt - forming.at), 0, 1);
      for (let i = 0; i < forming.n; i++) {
        const a = forming.base + (i / forming.n) * Math.PI * 2;
        const dir = i % 2 ? 1 : -1;
        // The first stretch of each orb's curl, so the lattice can be read before it flies.
        g.lineStyle(1.2, dir > 0 ? STATE_A : STATE_B, 0.15 + k * 0.35);
        g.beginPath();
        let x = tk.bossX + Math.cos(a) * 46, y = tk.bossY + Math.sin(a) * 46, aa = a;
        g.moveTo(x, y);
        for (let s = 0; s < 14; s++) { aa += dir * 0.85 * 0.1; x += Math.cos(aa) * 16.5; y += Math.sin(aa) * 16.5; g.lineTo(x, y); }
        g.strokePath();
      }
    },
    drawAir(g, time) {
      const draw = (x: number, y: number, dir: number, a: number) => {
        const c = dir > 0 ? STATE_A : STATE_B;
        glow(g, x, y, 14, c, 0.08, 2);
        g.fillStyle(dim(c, 0.4), 1); g.fillCircle(x, y, 8);
        g.fillStyle(c, 1); g.fillCircle(x, y, 6);
        // The spin arrow, turning.
        const sa = a + time / 150 * dir;
        g.lineStyle(1.5, 0xffffff, 0.9);
        g.beginPath(); g.arc(x, y, 4, sa, sa + Math.PI * 1.3, false); g.strokePath();
        g.fillStyle(0xffffff, 1); g.fillCircle(x + Math.cos(sa + Math.PI * 1.3) * 4, y + Math.sin(sa + Math.PI * 1.3) * 4, 1.5);
        g.fillTriangle(x - 2, y + dir * 2, x + 2, y + dir * 2, x, y - dir * 3);
      };
      if (forming) {
        const k = clamp((time - forming.at) / Math.max(1, forming.launchAt - forming.at), 0, 1);
        for (let i = 0; i < forming.n; i++) {
          const a = forming.base + (i / forming.n) * Math.PI * 2 + (1 - k) * 1.5;
          draw(tk.bossX + Math.cos(a) * 46 * k, tk.bossY + Math.sin(a) * 46 * k, i % 2 ? 1 : -1, a);
        }
      }
      for (const o of orbs) draw(o.x, o.y, o.dir, o.a);
    },
    onPhaseEnd() { orbs = []; forming = null; },
  };
};

// ── Signature: Uncertainty ───────────────────────────────────────────
// He measures you. Stand still and your position is certain: one sharp strike, right on you, quick.
// Move and your momentum is what he knows: a smear of strikes laid down your path ahead, wide.

const uncertainty = (tk: BossToolkit): SignatureMove => {
  let lastX = NaN, lastY = NaN, vx = 0, vy = 0;
  let mark: { x: number; y: number; at: number; still: boolean; pts: { x: number; y: number }[] } | null = null;
  return {
    durationMs: 1600,
    windupMs: 450,
    gesture: 'clap',
    tell: 'UNCERTAINTY',
    cast(time) {
      const p = tk.player;
      const sp = Math.hypot(vx, vy);
      const still = sp < 40;
      const pts: { x: number; y: number }[] = [];
      if (still) {
        tk.spawnZone({ x: p.x, y: p.y, radius: 64, warnMs: 800, damage: 15 });
        pts.push({ x: p.x, y: p.y });
      } else {
        const ux = vx / sp, uy = vy / sp;
        const n = tk.hard ? 6 : 5;
        for (let i = 0; i < n; i++) {
          const d = 50 + i * 85;
          const sx = tk.clampX(p.x + ux * d + (Math.random() - 0.5) * 40), sy = tk.clampY(p.y + uy * d + (Math.random() - 0.5) * 40);
          tk.spawnZone({ x: sx, y: sy, radius: 58, warnMs: 1150 + i * 120, damage: 11 });
          pts.push({ x: sx, y: sy });
        }
      }
      mark = { x: p.x, y: p.y, at: time, still, pts };
      tk.sfx('clock-tick');
    },
    update(_time, dt) {
      const p = tk.player;
      if (!Number.isNaN(lastX) && dt > 0) {
        const k = Math.min(1, dt * 6);
        vx += ((p.x - lastX) / dt - vx) * k;
        vy += ((p.y - lastY) / dt - vy) * k;
      }
      lastX = p.x; lastY = p.y;
      if (mark && tk.now - mark.at > 1800) mark = null;
    },
    drawAir(g, time) {
      if (!mark) return;
      const k = clamp((time - mark.at) / 1200, 0, 1);
      // Δx · Δp: a measuring bracket on you, and the probability smear he read off you.
      const p = tk.player;
      g.lineStyle(2, BOTH_LIT, 1 - k);
      g.lineBetween(p.x - 26, p.y - 44, p.x - 26, p.y - 30); g.lineBetween(p.x + 26, p.y - 44, p.x + 26, p.y - 30);
      g.lineBetween(p.x - 26, p.y - 37, p.x + 26, p.y - 37);
      if (!mark.still) {
        for (let i = 0; i < mark.pts.length - 1; i++) {
          const a = mark.pts[i], b = mark.pts[i + 1];
          for (let s = 0; s < 6; s++) {
            const f = s / 6;
            g.fillStyle(BOTH, 0.4 * (1 - k)); g.fillCircle(a.x + (b.x - a.x) * f + Math.sin(time / 80 + s) * 6, a.y + (b.y - a.y) * f + Math.cos(time / 90 + s) * 6, 2);
          }
        }
      } else {
        g.lineStyle(1.5, ARC, 1 - k); g.strokeCircle(mark.x, mark.y, 10 + k * 60);
      }
    },
    onPhaseEnd() { mark = null; },
  };
};

// ── Signature: Wavefunction ──────────────────────────────────────────
// A cloud of nine maybe-blasts opens round you, each as bright as it is likely. It shimmers; then
// it collapses — one blast, chosen by those odds, is marked white for a breath and strikes hard.
// Stand where the cloud is faint. In hard mode it collapses twice.

interface Candidate { x: number; y: number; w: number }

const wavefunction = (tk: BossToolkit): SignatureMove => {
  let cands: Candidate[] = [];
  let at = 0, collapseAt = 0, strikeAt = 0;
  let chosen: number[] = [];
  let struck = 0;
  const R = 74;
  return {
    durationMs: 2600,
    windupMs: 500,
    hold: 'conduct',
    tell: 'WAVEFUNCTION',
    cast(time) {
      const p = tk.player;
      cands = [];
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const x = tk.clampX(p.x + i * 120 + (Math.random() - 0.5) * 30, 60), y = tk.clampY(p.y + j * 110 + (Math.random() - 0.5) * 30, 60);
        // Likelier toward where you are, never certain.
        const w = 0.35 + Math.random() * 0.65 + (i === 0 && j === 0 ? 0.4 : 0);
        cands.push({ x, y, w });
      }
      at = time;
      collapseAt = time + tk.warn(1300);
      strikeAt = collapseAt + tk.warn(420);
      chosen = []; struck = 0;
      tk.sfx('glitch');
    },
    update(time) {
      if (!cands.length) return;
      const strikes = tk.hard ? 2 : 1;
      const pick = () => {
        const sum = cands.reduce((s, c, i) => s + (chosen.includes(i) ? 0 : c.w), 0);
        let r = Math.random() * sum;
        for (let i = 0; i < cands.length; i++) { if (chosen.includes(i)) continue; r -= cands[i].w; if (r <= 0) return i; }
        return cands.findIndex((_, i) => !chosen.includes(i));
      };
      if (chosen.length < strikes && chosen.length === struck && time >= collapseAt) { chosen.push(pick()); tk.sfx('beam-charge'); }
      if (struck < chosen.length && time >= strikeAt) {
        const c = cands[chosen[struck]];
        tk.explode(c.x, c.y, R, 18, BOTH_PRINCE_LIT);
        tk.sfx('explosion-medium');
        struck++;
        if (struck < strikes) { collapseAt = time + 250; strikeAt = collapseAt + tk.warn(420); }
      }
      if (struck >= strikes && time > strikeAt + 500) cands = [];
    },
    drawGround(g, time) {
      if (!cands.length || struck >= (tk.hard ? 2 : 1)) return;
      const k = clamp((time - at) / Math.max(1, collapseAt - at), 0, 1);
      const maxW = cands.reduce((m, c) => Math.max(m, c.w), 0.01);
      cands.forEach((c, i) => {
        const isChosen = chosen.length > struck && chosen[chosen.length - 1] === i;
        const done = chosen.slice(0, struck).includes(i);
        if (done) return;
        const pr = c.w / maxW;
        if (chosen.length > struck && !isChosen) {
          // Collapsed away: the maybe drains out.
          g.lineStyle(1, BOTH, 0.12); g.strokeCircle(c.x, c.y, R);
          return;
        }
        const sh = 0.5 + 0.5 * Math.sin(time / 70 + i * 1.7);
        g.fillStyle(isChosen ? 0xffffff : mixC(BOTH, BOTH_LIT, pr), isChosen ? 0.35 : (0.05 + 0.18 * pr) * (0.7 + 0.3 * sh) * (0.4 + 0.6 * k));
        g.fillCircle(c.x, c.y, R);
        g.lineStyle(isChosen ? 3 : 1.5, isChosen ? 0xffffff : BOTH_LIT, isChosen ? 0.95 : 0.2 + 0.5 * pr);
        g.strokeCircle(c.x, c.y, R);
        // A probability figure: dots, as many as it is likely.
        const dots = Math.round(3 + pr * 9);
        for (let d = 0; d < dots; d++) { const a = d * 2.4 + i; g.fillStyle(BOTH_LIT, 0.4 + 0.4 * pr); g.fillCircle(c.x + Math.cos(a) * (R * 0.2 + d * 3), c.y + Math.sin(a) * (R * 0.15 + d * 2.5), 1.6); }
      });
    },
    drawAir(g, time) {
      if (chosen.length <= struck || !cands.length) return;
      // Lines of the collapse: every maybe falling into the one.
      const c = cands[chosen[chosen.length - 1]];
      const k = clamp((time - collapseAt) / 420, 0, 1);
      for (const o of cands) {
        if (o === c) continue;
        g.lineStyle(1.5, BOTH_LIT, 0.5 * (1 - k));
        g.lineBetween(o.x + (c.x - o.x) * k, o.y + (c.y - o.y) * k, c.x, c.y);
      }
    },
    onPhaseEnd() { cands = []; chosen = []; },
  };
};

// ── Signature: Either Way ────────────────────────────────────────────
// Two lattices of lanes are laid over you at once, one magenta and one cyan, crossing. Only one is
// real; at the collapse the other goes out and the real one fires. The squares between the lines
// of both lattices are safe whichever way it falls.

const eitherWay = (tk: BossToolkit): SignatureMove => {
  let fam: { angle: number; color: number }[] = [];
  let at = 0, collapseAt = 0, pick = -1;
  let cx = 0, cy = 0;
  const GAP = 150;
  /** One lane of each lattice runs through where you stood when he cast. */
  const OFFS = [-2, -1, 0, 1, 2].map((k) => k * GAP);
  return {
    durationMs: 2600,
    windupMs: 500,
    gesture: 'sweep',
    tell: 'EITHER WAY',
    cast(time) {
      const base = Math.random() * Math.PI;
      fam = [
        { angle: base, color: STATE_A },
        { angle: base + Math.PI / 2, color: STATE_B },
      ];
      cx = tk.player.x; cy = tk.player.y;
      at = time;
      collapseAt = time + tk.warn(1250);
      pick = -1;
      tk.sfx('beam-charge');
    },
    update(time) {
      if (!fam.length || pick >= 0 || time < collapseAt) return;
      pick = Math.random() < 0.5 ? 0 : 1;
      const f = fam[pick];
      const nx = -Math.sin(f.angle), ny = Math.cos(f.angle);
      for (const o of OFFS) tk.spawnLane({ x: cx + nx * o, y: cy + ny * o, angle: f.angle, halfW: 26, warnMs: 450, damage: 13 });
      tk.sfx('beam-fire');
    },
    drawGround(g, time) {
      if (!fam.length) return;
      if (time > collapseAt + 1400) { fam = []; return; }
      const k = clamp((time - at) / Math.max(1, collapseAt - at), 0, 1);
      fam.forEach((f, i) => {
        if (pick >= 0 && pick !== i) {
          // The way it didn't go: fading out.
          const fade = clamp(1 - (time - collapseAt) / 400, 0, 1);
          if (fade <= 0) return;
          for (const o of OFFS) laneLine(g, cx, cy, f.angle, o, f.color, 0.3 * fade, 1);
          return;
        }
        if (pick >= 0) return; // the toolkit draws the real lanes now
        for (const o of OFFS) laneLine(g, cx, cy, f.angle, o, f.color, 0.12 + 0.3 * k, 1.5 + Math.sin(time / 60 + i) * 0.5);
      });
      // The safe squares, where neither lattice runs, shown faintly as the collapse nears.
      if (pick < 0 && k > 0.4) {
        const [a, b] = fam;
        for (const i of [-1.5, -0.5, 0.5, 1.5]) for (const j of [-1.5, -0.5, 0.5, 1.5]) {
          const ax = -Math.sin(a.angle) * i * GAP + -Math.sin(b.angle) * j * GAP;
          const ay = Math.cos(a.angle) * i * GAP + Math.cos(b.angle) * j * GAP;
          g.fillStyle(BOTH_LIT, 0.05 * (k - 0.4) * 2); g.fillCircle(cx + ax, cy + ay, 30);
        }
      }
    },
    onPhaseEnd() { fam = []; pick = -1; },
  };
};

/** A faint infinite lane line (for the Either Way lattice, before it collapses). */
function laneLine(g: Phaser.GameObjects.Graphics, cx: number, cy: number, angle: number, off: number, color: number, a: number, w: number): void {
  const nx = -Math.sin(angle), ny = Math.cos(angle);
  const x = cx + nx * off, y = cy + ny * off;
  const dx = Math.cos(angle) * 1400, dy = Math.sin(angle) * 1400;
  g.fillStyle(color, a * 0.35);
  const hw = 26;
  g.fillPoints([
    { x: x - dx + nx * hw, y: y - dy + ny * hw }, { x: x + dx + nx * hw, y: y + dy + ny * hw },
    { x: x + dx - nx * hw, y: y + dy - ny * hw }, { x: x - dx - nx * hw, y: y - dy - ny * hw },
  ], true);
  g.lineStyle(w, color, a); g.lineBetween(x - dx, y - dy, x + dx, y + dy);
}

// ── Signature: Many Worlds ───────────────────────────────────────────
// Three rifts tear open round the room and the Both of other worlds step through: a gilded Both
// (the world where he was crowned) who fires a lane, a boxed Both (the world where they never
// opened the cradle) who drops a ring of blasts, and a grey Both (the world where he did not
// live) who looses a closing ring with one gap. Then they step back.

interface World { x: number; y: number; kind: 0 | 1 | 2; openAt: number; actAt: number; closeAt: number; acted: boolean }

const WORLD_TINT = [BRASS, 0xb89a6a, 0x9aa0b0];

const manyWorlds = (tk: BossToolkit): SignatureMove => {
  let worlds: World[] = [];
  return {
    durationMs: 3600,
    windupMs: 600,
    gesture: 'flex',
    tell: 'MANY WORLDS',
    cast(time) {
      const p = tk.player;
      worlds = [];
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < 3; i++) {
        const a = base + (i / 3) * Math.PI * 2;
        const x = tk.clampX(p.x + Math.cos(a) * 280, 80), y = tk.clampY(p.y + Math.sin(a) * 220, 80);
        worlds.push({ x, y, kind: i as 0 | 1 | 2, openAt: time + i * 260, actAt: time + tk.warn(900) + i * 650, closeAt: time + tk.warn(900) + i * 650 + 1600, acted: false });
      }
      tk.sfx('portal');
    },
    update(time) {
      const p = tk.player;
      for (const w of worlds) {
        if (w.acted || time < w.actAt) continue;
        w.acted = true;
        if (w.kind === 0) {
          tk.spawnLane({ x: w.x, y: w.y, angle: tk.angleToPlayer(w.x, w.y), halfW: 30, warnMs: 650, damage: 13 });
          tk.sfx('light-beam');
        } else if (w.kind === 1) {
          for (let k = 0; k < 4; k++) {
            const a = (k / 4) * Math.PI * 2 + Math.random();
            tk.spawnZone({ x: tk.clampX(p.x + Math.cos(a) * 90), y: tk.clampY(p.y + Math.sin(a) * 90), radius: 56, warnMs: 800, damage: 11 });
          }
          tk.sfx('trap-set');
        } else {
          tk.spawnRing({ cx: w.x, cy: w.y, delayMs: 300, speed: 260, gapCentre: tk.angleToPlayer(w.x, w.y) + (Math.random() < 0.5 ? 0.9 : -0.9), gapHalf: 0.5, band: 18, damage: 12 });
          tk.sfx('sonic-pulse');
        }
      }
      worlds = worlds.filter((w) => time < w.closeAt);
    },
    drawGround(g, time) {
      for (const w of worlds) {
        const k = clamp((time - w.openAt) / 400, 0, 1) * clamp((w.closeAt - time) / 400, 0, 1);
        g.fillStyle(0x000000, 0.3 * k); g.fillEllipse(w.x, w.y + 30, 80, 22);
        g.lineStyle(2, WORLD_TINT[w.kind], 0.4 * k); g.strokeEllipse(w.x, w.y + 30, 90, 26);
      }
    },
    drawAir(g, time) {
      for (const w of worlds) {
        if (time < w.openAt) continue;
        const k = clamp((time - w.openAt) / 400, 0, 1) * clamp((w.closeAt - time) / 400, 0, 1);
        // The rift: a torn vertical slit of another world's light.
        const rh = 90 * k;
        g.fillStyle(0x05040a, 0.9 * k);
        g.fillPoints([{ x: w.x, y: w.y - rh }, { x: w.x + 18 * k, y: w.y - rh * 0.3 }, { x: w.x + 10 * k, y: w.y + rh * 0.5 }, { x: w.x, y: w.y + rh * 0.6 }, { x: w.x - 12 * k, y: w.y + rh * 0.2 }, { x: w.x - 16 * k, y: w.y - rh * 0.4 }], true);
        g.lineStyle(2, lit(WORLD_TINT[w.kind], 0.3), k);
        g.strokeTriangle(w.x, w.y - rh, w.x + 18 * k, w.y - rh * 0.3, w.x - 16 * k, w.y - rh * 0.4);
        // The other Both, stepping out.
        const step = clamp((time - w.openAt - 300) / 500, 0, 1) * k;
        if (step <= 0) continue;
        const bx = w.x + 26 * step, by = w.y;
        ghostBody(g, bx, by, time, WORLD_TINT[w.kind], step, 1);
        if (w.kind === 0) { crownGlyph(g, bx, by - 50, 16, BRASS, step); crownGlyph(g, bx, by - 64, 10, lit(BRASS, 0.4), step); }
        else if (w.kind === 1) sealedBox(g, bx, by - 34, 26, 3);
        else { g.lineStyle(2, 0x9aa0b0, step * 0.8); g.lineBetween(bx - 12, by - 6, bx - 4, by - 6); g.lineBetween(bx + 4, by - 6, bx + 12, by - 6); }
        if (!w.acted) { const a = clamp(1 - (w.actAt - time) / 700, 0, 1); g.lineStyle(2, WORLD_TINT[w.kind], a); g.strokeCircle(bx, by, 40 - a * 10); }
      }
    },
    onPhaseEnd() { worlds = []; },
  };
};

// ── Signature: The Worlds Branch ─────────────────────────────────────
// The room splits into tall strips, alternately this world and the next. The strips of one world
// strike; then, a beat later, the strips of the other. Stand in one, then cross into a struck one.

const branch = (tk: BossToolkit): SignatureMove => {
  let strips: { x: number; world: 0 | 1 }[] = [];
  let at = 0, fireA = 0, fireB = 0;
  const N = 6;
  return {
    durationMs: 3000,
    windupMs: 550,
    gesture: 'slam',
    tell: 'THE WORLDS BRANCH',
    cast(time) {
      const sw = tk.W / N;
      const first = Math.random() < 0.5 ? 0 : 1;
      strips = [];
      for (let i = 0; i < N; i++) strips.push({ x: sw * (i + 0.5), world: ((i + first) % 2) as 0 | 1 });
      at = time;
      fireA = time + tk.warn(1150);
      fireB = time + tk.warn(2250);
      for (const s of strips) {
        tk.spawnLane({ x: s.x, y: (TOP + tk.H) / 2, angle: Math.PI / 2, halfW: sw / 2 - 18, warnMs: s.world === 0 ? 1150 : 2250, damage: 12 });
      }
      tk.sfx('time-warp');
    },
    drawGround(g, time) {
      if (!strips.length) return;
      if (time > fireB + 600) { strips = []; return; }
      const sw = tk.W / N;
      for (const s of strips) {
        const c = s.world === 0 ? STATE_A : STATE_B;
        const fires = s.world === 0 ? fireA : fireB;
        const done = time > fires;
        g.fillStyle(dim(c, 0.6), done ? 0.04 : 0.1);
        g.fillRect(s.x - sw / 2, TOP, sw, tk.H - TOP);
        // Each world's own sky in the strip: stars in one, lines of rain in the other.
        for (let i = 0; i < 8; i++) {
          const yy = TOP + ((i * 83 + (s.world ? time / 6 : 0)) % (tk.H - TOP));
          if (s.world) { g.lineStyle(1, STATE_B_LIT, 0.25); g.lineBetween(s.x - sw * 0.3 + i * 9, yy, s.x - sw * 0.3 + i * 9 - 4, yy + 12); }
          else { g.fillStyle(STATE_A_LIT, 0.3 + 0.2 * Math.sin(time / 200 + i)); g.fillCircle(s.x - sw * 0.35 + ((i * 37) % (sw * 0.7)), yy, 1.6); }
        }
        if (!done) {
          const k = clamp((time - at) / Math.max(1, fires - at), 0, 1);
          g.lineStyle(2, c, 0.2 + k * 0.5); g.lineBetween(s.x - sw / 2 + 2, TOP, s.x - sw / 2 + 2, tk.H); g.lineBetween(s.x + sw / 2 - 2, TOP, s.x + sw / 2 - 2, tk.H);
        }
      }
    },
    onPhaseEnd() { strips = []; },
  };
};

// ── The prince ───────────────────────────────────────────────────────

export const BOTH_BOSS: WorldBossDef = {
  worldId: 'isle:both',
  name: 'Prince Both',
  title: 'the Undecided',
  color: BOTH_PRINCE,
  colorLit: BOTH_PRINCE_LIT,
  colorDark: BOTH_PRINCE_DARK,
  accent: BOTH_ACCENT,
  // Tier 4 of the sixth isle.
  damageMult: 1.4,

  intro: [
    'You came in through the door and you also did not. I like that. Most people only manage one.',
    'Mother sealed my cradle so she would never have to know. I was seven before anyone looked. Look at me.',
  ],
  banter: [
    'Every house here pays the Draw twice. Once for each state. It is only fair to both of them.',
    'You hit me. Or you will have. It is very hard to tell from in here.',
    'Switched off and switched on is just a meter that has not been read yet.',
    'Mother decides everything except me. I am the one thing she could not bear to know.',
    'Look at me properly. Go on. Nobody ever does it twice.',
  ],
  defeatLine: 'BOTH COLLAPSES INTO ONE',
  resumeLine: 'Back again, and back again. One of you was always going to be.',

  phases: [
    {
      name: 'Here and There',
      line: 'I am here. I am also over there. Only one of us is lying, and it changes.',
      hp: 540,
      cycle: [
        'sig:here', 'volley', 'sig:spin', 'hazard', 'sig:uncertainty',
        'sig:here', 'radial', 'sig:spin', 'sig:uncertainty',
      ],
      harass: ['h-snipe', 'h-orbs'],
      restMs: 1150,
      harassMs: 3300,
    },
    {
      name: 'Collapse',
      line: 'You looked. Now I have to be one thing. I hate it. Everything I do is a maybe until it lands.',
      hp: 640,
      cycle: [
        'sig:wavefunction', 'sig:either', 'lanes', 'sig:uncertainty', 'sig:wavefunction',
        'barrage', 'sig:either', 'sig:here',
      ],
      harass: ['h-rune', 'h-lane', 'h-flak'],
      restMs: 1050,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'IN EVERY WORLD, A PRINCE',
    extraPhase: {
      name: 'Many Worlds',
      line: 'In one world I was crowned. In one they never opened the box. In one I did not live. They came.',
      hp: 470,
      cycle: [
        'sig:worlds', 'sig:branch', 'sig:spin', 'sig:worlds',
        'spiral', 'sig:wavefunction', 'sig:branch', 'sig:either',
      ],
      harass: ['h-orbs', 'h-mines'],
      restMs: 950,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 5, speed: 230, spreadRad: 0.45 },
    radial: { count: 16, speed: 185 },
    hazard: { radius: 62 },
    lanes: { count: 3, halfW: 24 },
    barrage: { count: 7 },
    spiral: { arms: 4, speed: 170 },
  },

  signatures: {
    here: hereAndThere,
    spin: spinUpDown,
    uncertainty,
    wavefunction,
    either: eitherWay,
    worlds: manyWorlds,
    branch,
  },

  look: {
    crest: 'orbs', pattern: 'swirl', aura: 'glitch', hands: 'orb',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: BOTH_ACCENT,
  },
  phaseStyles: [
    { movement: 'blink', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'pale', look: { pattern: 'static', crest: 'halo', aura: 'sparks' } },
    { movement: 'orbit', gimmick: 'none', tint: 'void', look: { pattern: 'rings', crest: 'crown', aura: 'glitch', eyes: 3 } },
  ],

  /**
   * Both's tells. In Here and There his whole outline is doubled — a magenta rim and a cyan rim a
   * hand apart, sliding over each other — and his crown is in two places at once, one on his head
   * and one hovering over it, trading solidity. He carries a sealed box in one hand and a Bloch
   * sphere (a glass ball with an equator and a turning arrow) in the other. In Collapse the two
   * rims snap into one hard white outline, the crown settles on his brow, the box is open and empty,
   * and a halo of probability dots breathes in and out round him. In Many Worlds faint copies of
   * him fan out behind, each a different world's colour, and the crown has become a ring of crowns.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const collapsed = s.phaseIdx === 1;
    const many = s.hard && s.phaseIdx >= 2;
    const t = s.t;
    if (many) {
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.7;
        const ox = s.x + Math.cos(a) * R * 0.9 - Math.cos(t / 400 + i) * 4, oy = s.y + Math.sin(a) * R * 0.5 + R * 0.3;
        g.fillStyle(WORLD_TINT[i], 0.18); g.fillCircle(ox, oy, R * 0.95);
        g.lineStyle(1.5, WORLD_TINT[i], 0.35); g.strokeCircle(ox, oy, R * 0.95);
      }
    }
    if (!collapsed) {
      const off = Math.sin(t / 260) * 5;
      g.lineStyle(2.5, STATE_A, 0.75); g.strokeCircle(s.x - off, s.y, R + 2);
      g.lineStyle(2.5, STATE_B, 0.75); g.strokeCircle(s.x + off, s.y, R + 2);
    } else {
      g.lineStyle(3, 0xffffff, 0.85); g.strokeCircle(s.x, s.y, R + 2);
      const br = R * (1.5 + Math.sin(t / 500) * 0.15);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + t / 3000;
        g.fillStyle(BOTH_LIT, 0.35 + 0.25 * Math.sin(t / 200 + i)); g.fillCircle(s.x + Math.cos(a) * br, s.y + Math.sin(a) * br * 0.9, 1.8);
      }
    }
    // The crown(s).
    if (many) {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.42;
        crownGlyph(g, s.x + Math.cos(a) * R * 1.15, s.y + Math.sin(a) * R * 1.15 - 4, 7, i % 2 ? BRASS : lit(BRASS, 0.3), 0.9);
      }
    } else if (collapsed) {
      crownGlyph(g, s.x, s.y - R + 2, 13, BRASS, 1);
      g.fillStyle(BRASS_DARK, 1); g.fillRect(s.x - 13, s.y - R + 1, 26, 3);
    } else {
      const sw = (Math.sin(t / 700) + 1) / 2;
      crownGlyph(g, s.x, s.y - R + 2, 13, BRASS, 0.35 + 0.65 * sw);
      crownGlyph(g, s.x, s.y - R - 18, 13, BOTH_LIT, 0.35 + 0.65 * (1 - sw));
    }
    // The sealed box in one hand: shut, or (collapsed) opened and empty.
    const h0 = s.hands[0];
    if (h0) {
      if (!collapsed) sealedBox(g, h0.x - 4, h0.y + 4, 16, 7);
      else {
        g.fillStyle(0xb89a6a, 1); g.fillRect(h0.x - 12, h0.y - 10, 16, 14);
        g.fillStyle(0x100c08, 1); g.fillRect(h0.x - 11, h0.y - 10, 14, 4);
        g.fillStyle(0xd8be8c, 1); g.fillRect(h0.x - 16, h0.y - 22, 16, 4);
      }
    }
    // The Bloch sphere in the other.
    const h1 = s.hands[1];
    if (h1) {
      const bx = h1.x + 4, by = h1.y - 22 - s.castGlow * 6;
      glow(g, bx, by, 18, BOTH, 0.05 + s.castGlow * 0.05, 2);
      g.fillStyle(lit(BOTH, 0.5), 0.3); g.fillCircle(bx, by, 11);
      g.lineStyle(1.2, BOTH_LIT, 0.9); g.strokeCircle(bx, by, 11); g.strokeEllipse(bx, by, 22, 7);
      const a = collapsed ? -Math.PI / 2 : t / 300;
      g.lineStyle(2, collapsed ? 0xffffff : STATE_A_LIT, 1); g.lineBetween(bx, by, bx + Math.cos(a) * 10, by + Math.sin(a) * 7 - (collapsed ? 3 : 0));
      g.fillStyle(collapsed ? 0xffffff : STATE_B_LIT, 1); g.fillCircle(bx + Math.cos(a) * 10, by + Math.sin(a) * 7 - (collapsed ? 3 : 0), 2);
    }
    if (s.enraged) { g.lineStyle(1.5, BOTH_ACCENT, 0.35 + Math.sin(t / 110) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The Hall of Both: a floor in two states split down the middle. The left half is the Gothic
   * house — black and magenta marble chequer, lancet light lying across it; the right half is the
   * power house — copper deck-grating lit cyan from below, rivet lines and cable trays. Down the seam
   * runs a crack of violet light. Under the HUD, the back wall carries two thrones that are one
   * throne, and stacked sealed boxes line both walls.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xb0742);
    const mid = W / 2;
    // Left: the marble chequer.
    const T = 48;
    for (let y = 0; y < H; y += T) for (let x = 0; x < mid; x += T) {
      const k = ((x / T) + (y / T)) % 2;
      g.fillStyle(k ? 0x1a1018 : STATE_A_DARK, 1); g.fillRect(x, y, T, T);
      g.fillStyle(0xffffff, k ? 0.02 : 0.05); g.fillRect(x, y, T, 3);
      if (rng() < 0.3) { g.lineStyle(1, k ? 0x3a2030 : lit(STATE_A_DARK, 0.2), 0.6); g.lineBetween(x + rng() * T, y, x + rng() * T, y + T); }
    }
    // Lancet light across the marble.
    for (let i = 0; i < 4; i++) {
      const x = 60 + i * 110;
      g.fillStyle(STATE_A_LIT, 0.05);
      g.fillPoints([{ x, y: 110 }, { x: x + 40, y: 110 }, { x: x + 160, y: H }, { x: x + 80, y: H }], true);
    }
    // Right: copper grating.
    g.fillStyle(0x0c1418, 1); g.fillRect(mid, 0, W - mid, H);
    for (let y = 100; y < H; y += 12) { g.lineStyle(3, COPPER_DARK, 1); g.lineBetween(mid, y, W, y); }
    for (let x = mid; x < W; x += 12) { g.lineStyle(1.5, COPPER, 0.5); g.lineBetween(x, 100, x, H); }
    for (let i = 0; i < 6; i++) { const y = 150 + i * 85; g.fillStyle(STATE_B, 0.05); g.fillRect(mid, y, W - mid, 30); }
    for (let x = mid + 40; x < W; x += 160) { g.fillStyle(IRON, 1); g.fillRect(x, 100, 10, H - 100); for (let y = 120; y < H; y += 40) { g.fillStyle(COPPER_LIT, 0.7); g.fillCircle(x + 5, y, 1.8); } }
    // The seam.
    for (let i = 0; i < 5; i++) { g.lineStyle(30 - i * 6, BOTH, 0.04 + i * 0.03); g.lineBetween(mid, 100, mid, H); }
    g.lineStyle(2, BOTH_LIT, 1);
    g.beginPath(); g.moveTo(mid, 100);
    for (let y = 100; y <= H; y += 20) g.lineTo(mid + (rng() - 0.5) * 8, y);
    g.strokePath();
    // The back wall under the HUD.
    g.fillStyle(BASALT_DARK, 1); g.fillRect(0, 0, W, 104);
    for (let x = 0; x < W; x += 40) { g.fillStyle(x < mid ? 0x2a1a24 : 0x1a2630, 1); g.fillRect(x + 2, 6, 36, 92); }
    g.fillStyle(BASALT, 1); g.fillRect(0, 98, W, 8);
    // The throne that is two thrones.
    g.fillStyle(STATE_A_DARK, 1); g.fillRoundedRect(mid - 60, 20, 58, 82, { tl: 28, tr: 0, bl: 0, br: 0 });
    g.fillStyle(STATE_B_DARK, 1); g.fillRoundedRect(mid + 2, 20, 58, 82, { tl: 0, tr: 28, bl: 0, br: 0 });
    g.lineStyle(2, BRASS, 1); g.strokeRoundedRect(mid - 60, 20, 120, 82, 28);
    crownGlyph(g, mid, 34, 12, BRASS, 1);
    // Box stacks down both walls.
    for (let y = 190; y < H - 40; y += 120) { sealedBox(g, 28, y, 34, y); sealedBox(g, W - 52, y + 50, 34, y + 3); }
    sealedBox(g, 24, H - 20, 34, 11); sealedBox(g, W - 60, H - 30, 34, 13);
    // Two great lamps: one magenta-lit, one cyan-lit.
    for (const [x, c] of [[120, STATE_A], [W - 120, STATE_B]] as [number, number][]) { glow(g, x, 140, 60, c, 0.04, 4); g.fillStyle(c, 0.8); g.fillCircle(x, 140, 6); }
    g.lineStyle(1, BOTH, 0.4); g.strokeRect(4, 104, W - 8, H - 108);
  },
};

