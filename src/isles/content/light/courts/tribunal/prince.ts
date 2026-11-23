import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mulberry } from '../../../../art/IsleArt';
import { chalkLine, gavel, glassPanel, marbleTerrace, robeSwag, scalesEmblem, sunburst, witnessStand } from './art';
import {
  BRONZE, BRONZE_DARK, CHALK, GLASS, GLASS_LIT, GOLD, GOLD_DARK, GOLD_LIT, INK, MARBLE_DEEP, MARBLE_LIT, MIRROR_DARK,
  ROBE, ROBE_DARK, ROBE_LIT, SUN, SUN_HOT, VERDICT, VERDICT_DARK, VERDICT_LIT, WAX, WIG, WIG_SHADE,
} from './palette';
import { clamp, dist, onCast, segDist } from './util';

/**
 * Prince Verdict, Radiance of the Tribunal — the Despot's judge.
 *
 * Verdict has never acquitted anyone. He does not think of it as cruelty: a court that acquits
 * is a court that admits it might be wrong, and Clarity cannot be wrong. He sits under the glass
 * dome where the whole terrace can watch him, and his sentences are read out in the time it takes
 * the accused to stand. He fights the way he tries a case:
 *
 * • **Gavel** (anchored at the bench, the court's wards orbiting him): he slams a gavel the size of
 *   a door where you stand — each slam throws a square shockwave across the floor, and every third
 *   is ORDER!, a ring out from the bench that stuns, with one gap in it. He calls witnesses: glass
 *   stands rise round the room and their testimony is a beam of noon, aimed, locked, and fired.
 * • **Blind Justice** (stalking, pale): he ties on the blindfold. He cannot see you — he strikes
 *   wherever you last *cast or dashed*, a sword of light plunged point-down and a cross of shock
 *   from it; and his great scales drift after you, their pans tipping down on the floor in turn.
 * • **Capital Sentence** (hard, blinking, the court closing in): the black cap goes on. Lines are
 *   chalked across the floor one after another, and a guillotine blade of light falls down each.
 */

const TOP = 96;
const alivePlayer = (tk: BossToolkit) => tk.player.active && tk.player.hp > 0;

// ── Signature: The Gavel ─────────────────────────────────────────────
// Three slams. Each mark is laid where you stand and a door-sized gavel comes down on it; a
// square shockwave runs out from the head. The third slam is ORDER!: a ring out from the bench
// that stuns, with one gap in it, shown as it gathers.

interface Slam { x: number; y: number; markAt: number; landAt: number; order: boolean; landed: boolean; dealt: boolean; gapA: number; ox: number; oy: number }

const gavelSig = (tk: BossToolkit): SignatureMove => {
  let slams: Slam[] = [];
  const SQ_SPEED = 380, SQ_MAX = 320, BAND = 16;
  const RING_SPEED = 320, RING_MAX = 560, GAP = 0.42;
  return {
    durationMs: 3000,
    windupMs: 600,
    gesture: 'slam',
    tell: 'THE GAVEL',
    cast(time) {
      slams = [0, 1, 2].map((i) => {
        const markAt = time + i * 780;
        return { x: 0, y: 0, markAt, landAt: markAt + tk.warn(820), order: i === 2, landed: false, dealt: false, gapA: Math.random() * Math.PI * 2, ox: 0, oy: 0 };
      });
      tk.sfx('beam-charge');
    },
    update(time) {
      const p = tk.player;
      for (const s of slams) {
        if (time < s.markAt) continue;
        if (s.x === 0 && s.y === 0) {
          if (s.order) { s.ox = tk.bossX; s.oy = tk.bossY; s.x = s.ox; s.y = s.oy; s.gapA = Math.atan2(p.y - s.oy, p.x - s.ox) + Math.PI * (0.55 + Math.random() * 0.9); }
          else { s.x = tk.clampX(p.x); s.y = tk.clampY(p.y); }
        }
        if (!s.landed && time >= s.landAt) {
          s.landed = true;
          tk.sfx(s.order ? 'judgement' : 'hammer-forge');
          tk.boom(s.x, s.y, 40, GOLD);
          if (s.order) tk.sfx('anvil');
        }
        if (!s.landed || s.dealt || !alivePlayer(tk)) continue;
        const age = (time - s.landAt) / 1000;
        if (s.order) {
          const r = 30 + age * RING_SPEED;
          if (r > RING_MAX) { s.dealt = true; continue; }
          const d = dist(p.x, p.y, s.x, s.y);
          const off = Math.abs(Math.atan2(Math.sin(Math.atan2(p.y - s.y, p.x - s.x) - s.gapA), Math.cos(Math.atan2(p.y - s.y, p.x - s.x) - s.gapA)));
          if (Math.abs(d - r) < BAND + 14 && off > GAP) { s.dealt = true; tk.hitPlayer(9, p.x, p.y); tk.stun(900); }
        } else {
          const half = 30 + age * SQ_SPEED;
          if (half > SQ_MAX) { s.dealt = true; continue; }
          const cheb = Math.max(Math.abs(p.x - s.x), Math.abs(p.y - s.y));
          if (Math.abs(cheb - half) < BAND + 12) { s.dealt = true; tk.hitPlayer(12, p.x, p.y); }
        }
      }
      if (slams.length && slams.every((s) => s.landed && (s.dealt || time - s.landAt > 1800))) slams = [];
    },
    drawGround(g, time) {
      for (const s of slams) {
        if (time < s.markAt || (s.x === 0 && s.y === 0)) continue;
        const k = clamp((time - s.markAt) / Math.max(1, s.landAt - s.markAt), 0, 1);
        if (!s.landed) {
          if (s.order) {
            // ORDER: the ring gathers at the bench, its gap left open.
            g.lineStyle(3, GOLD_LIT, 0.3 + k * 0.5);
            g.beginPath(); g.arc(s.x, s.y, 60 + k * 30, s.gapA + GAP, s.gapA + Math.PI * 2 - GAP, false); g.strokePath();
            g.lineStyle(2, CHALK, 0.6);
            g.lineBetween(s.x + Math.cos(s.gapA) * 70, s.y + Math.sin(s.gapA) * 70, s.x + Math.cos(s.gapA) * 300, s.y + Math.sin(s.gapA) * 300);
          } else {
            // The gavel's shadow: a long dark bar swelling over the mark, and a chalk square.
            g.fillStyle(VERDICT_DARK, 0.1 + k * 0.3); g.fillRect(s.x - 50 * (0.5 + k * 0.5), s.y - 24 * (0.5 + k * 0.5), 100 * (0.5 + k * 0.5), 48 * (0.5 + k * 0.5));
            g.lineStyle(2, CHALK, 0.5 + k * 0.5); g.strokeRect(s.x - 34, s.y - 34, 68, 68);
          }
          continue;
        }
        const age = (time - s.landAt) / 1000;
        if (s.order) {
          const r = 30 + age * RING_SPEED;
          if (r > RING_MAX) continue;
          g.lineStyle(BAND * 2, GOLD, 0.25); g.beginPath(); g.arc(s.x, s.y, r, s.gapA + GAP, s.gapA + Math.PI * 2 - GAP, false); g.strokePath();
          g.lineStyle(4, GOLD_LIT, 0.95); g.beginPath(); g.arc(s.x, s.y, r, s.gapA + GAP, s.gapA + Math.PI * 2 - GAP, false); g.strokePath();
        } else {
          const half = 30 + age * SQ_SPEED;
          if (half > SQ_MAX) continue;
          const fade = 1 - half / SQ_MAX;
          g.lineStyle(BAND * 2, GOLD, 0.2 * fade); g.strokeRect(s.x - half, s.y - half, half * 2, half * 2);
          g.lineStyle(3, GOLD_LIT, 0.9 * fade); g.strokeRect(s.x - half, s.y - half, half * 2, half * 2);
          // Cracks where the head struck.
          for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; g.lineStyle(2, MARBLE_DEEP, 0.8); g.lineBetween(s.x, s.y, s.x + Math.cos(a) * 34, s.y + Math.sin(a) * 26); }
        }
      }
    },
    drawAir(g, time) {
      for (const s of slams) {
        if (s.order || time < s.markAt || s.x === 0 || (s.landed && time - s.landAt > 260)) continue;
        // The door-sized gavel swinging down on the mark.
        const k = s.landed ? 1 : clamp((time - s.markAt) / Math.max(1, s.landAt - s.markAt), 0, 1);
        const a = -Math.PI / 2 - 1.4 + k * k * 1.4;
        gavel(g, s.x - 110, s.y - 20, 3.2, a + Math.PI / 2 - 0.1, ROBE_DARK);
        if (s.landed) { const f = (time - s.landAt) / 260; glow(g, s.x, s.y, 60, GOLD_LIT, 0.12 * (1 - f), 3); }
      }
    },
    onPhaseEnd() { slams = []; },
  };
};

// ── Signature: Call the Witness ──────────────────────────────────────
// Three glass witness stands rise round the room. Each in turn aims its testimony at you — a thin
// gold line that follows, then locks — and fires a beam of noon down the locked line.

interface Witness { x: number; y: number; riseAt: number; lockAt: number; fireAt: number; aim: number; fired: boolean }

const witnessSig = (tk: BossToolkit): SignatureMove => {
  let stands: Witness[] = [];
  let endAt = 0;
  const HALF = 18;
  return {
    durationMs: 2600,
    windupMs: 500,
    gesture: 'point',
    tell: 'CALL THE WITNESS',
    cast(time) {
      const spots = [{ x: 110, y: TOP + 90 }, { x: tk.W - 110, y: TOP + 90 }, { x: 110, y: tk.H - 70 }, { x: tk.W - 110, y: tk.H - 70 }];
      spots.sort(() => Math.random() - 0.5);
      const n = tk.hard ? 4 : 3;
      stands = spots.slice(0, n).map((s, i) => {
        const lockAt = time + tk.warn(900) + i * 520;
        return { x: s.x, y: s.y, riseAt: time, lockAt, fireAt: lockAt + tk.warn(420), aim: 0, fired: false };
      });
      endAt = time + tk.warn(900) + n * 520 + 1600;
      tk.sfx('crystal-chime');
    },
    update(time) {
      const p = tk.player;
      for (const s of stands) {
        if (time < s.lockAt) s.aim = Math.atan2(p.y - (s.y - 64), p.x - s.x);
        if (!s.fired && time >= s.fireAt) {
          s.fired = true;
          tk.sfx('light-beam');
          const ex = s.x + Math.cos(s.aim) * 1400, ey = s.y - 64 + Math.sin(s.aim) * 1400;
          if (alivePlayer(tk) && segDist(p.x, p.y, s.x, s.y - 64, ex, ey) < HALF + 14) tk.hitPlayer(13, p.x, p.y);
        }
      }
      if (time > endAt) stands = [];
    },
    drawGround(g) {
      for (const s of stands) { g.fillStyle(GOLD, 0.15); g.fillCircle(s.x, s.y, 30); }
    },
    drawAir(g, time) {
      for (const s of stands) {
        const rise = clamp((time - s.riseAt) / 400, 0, 1);
        witnessStand(g, s.x, s.y + (1 - rise) * 30, 1.2, rise);
        const ox = s.x, oy = s.y - 64;
        if (!s.fired) {
          const k = clamp((time - s.riseAt) / Math.max(1, s.fireAt - s.riseAt), 0, 1);
          const locked = time >= s.lockAt;
          g.lineStyle(locked ? 2.5 : 1.2, locked ? GOLD_LIT : GOLD, 0.25 + k * 0.6);
          g.lineBetween(ox, oy, ox + Math.cos(s.aim) * 1400, oy + Math.sin(s.aim) * 1400);
          if (locked) glow(g, ox, oy, 14, SUN_HOT, 0.12, 2);
        } else if (time - s.fireAt < 420) {
          const f = (time - s.fireAt) / 420;
          const ex = ox + Math.cos(s.aim) * 1400, ey = oy + Math.sin(s.aim) * 1400;
          g.lineStyle(HALF * 2.4, SUN_HOT, 0.25 * (1 - f)); g.lineBetween(ox, oy, ex, ey);
          g.lineStyle(HALF, SUN, 0.8 * (1 - f)); g.lineBetween(ox, oy, ex, ey);
          g.lineStyle(3, GLASS_LIT, 1 - f); g.lineBetween(ox, oy, ex, ey);
          for (let i = 0; i < 10; i++) { const d = ((i * 131 + time * 0.4) % 900); g.fillStyle(GOLD_LIT, 0.8 * (1 - f)); g.fillCircle(ox + Math.cos(s.aim) * d + Math.sin(i) * 8, oy + Math.sin(s.aim) * d + Math.cos(i) * 8, 2); }
        }
      }
    },
    onPhaseEnd() { stands = []; },
  };
};

// ── Signature: Blind Justice ─────────────────────────────────────────
// He cannot see you. He hears you: every cast, every dash leaves a mark where you were. Three
// times he plunges a sword of light point-down onto the latest mark — a disc where it lands and a
// cross of shock out from it a beat later. Stand still and quiet and he strikes old ground.

interface Plunge { x: number; y: number; at: number; landAt: number; crossAt: number; landed: boolean; crossed: boolean }

const blindSig = (tk: BossToolkit): SignatureMove => {
  let mark: { x: number; y: number; at: number } | null = null;
  let off: (() => void) | null = null;
  let lastX = 0, lastY = 0;
  let plunges: Plunge[] = [];
  let queue: number[] = [];
  const DISC = 74, ARM = 230, ARM_HALF = 16;
  const listen = () => {
    if (off) return;
    off = onCast(tk.player, () => { mark = { x: tk.player.x, y: tk.player.y, at: tk.now }; });
  };
  return {
    durationMs: 3400,
    windupMs: 500,
    gesture: 'raise',
    hold: 'draw',
    tell: 'BLIND JUSTICE',
    cast(time) {
      listen();
      queue = [time, time + 1000, time + 2000];
      tk.sfx('hush');
    },
    update(time, dt) {
      const p = tk.player;
      // A dash is heard too: anything faster than a run.
      if (dt > 0 && lastX && Math.hypot(p.x - lastX, p.y - lastY) / dt > 560) mark = { x: p.x, y: p.y, at: time };
      lastX = p.x; lastY = p.y;
      while (queue.length && time >= queue[0]) {
        queue.shift();
        const m = mark ?? { x: tk.W / 2 + (Math.random() - 0.5) * 300, y: (TOP + tk.H) / 2 + (Math.random() - 0.5) * 200 };
        const landAt = time + tk.warn(900);
        plunges.push({ x: tk.clampX(m.x), y: tk.clampY(m.y), at: time, landAt, crossAt: landAt + tk.warn(380), landed: false, crossed: false });
        tk.sfx('whoosh');
      }
      for (const pl of plunges) {
        if (!pl.landed && time >= pl.landAt) {
          pl.landed = true;
          tk.sfx('slash');
          tk.boom(pl.x, pl.y, DISC, SUN);
          if (alivePlayer(tk) && dist(p.x, p.y, pl.x, pl.y) < DISC + 14) tk.hitPlayer(14, p.x, p.y);
        }
        if (pl.landed && !pl.crossed && time >= pl.crossAt) {
          pl.crossed = true;
          tk.sfx('light-beam');
          if (alivePlayer(tk)) {
            for (const a of [Math.PI / 4, -Math.PI / 4]) {
              const dx = Math.cos(a) * ARM, dy = Math.sin(a) * ARM;
              if (segDist(p.x, p.y, pl.x - dx, pl.y - dy, pl.x + dx, pl.y + dy) < ARM_HALF + 14) { tk.hitPlayer(10, p.x, p.y); break; }
            }
          }
        }
      }
      plunges = plunges.filter((pl) => !pl.crossed || time - pl.crossAt < 500);
    },
    drawGround(g, time) {
      // The marks he has heard: a ripple of white where you last made a sound.
      if (mark && time - mark.at < 2500) {
        const k = ((time - mark.at) % 700) / 700;
        g.lineStyle(1.5, WIG, 0.5 * (1 - k)); g.strokeCircle(mark.x, mark.y, 10 + k * 40);
      }
      for (const pl of plunges) {
        if (!pl.landed) {
          const k = clamp((time - pl.at) / Math.max(1, pl.landAt - pl.at), 0, 1);
          g.fillStyle(SUN, 0.08 + k * 0.2); g.fillCircle(pl.x, pl.y, DISC);
          g.lineStyle(2, GOLD_LIT, 0.4 + k * 0.6); g.strokeCircle(pl.x, pl.y, DISC);
          // The cross to come, faint.
          for (const a of [Math.PI / 4, -Math.PI / 4]) chalkLine(g, pl.x - Math.cos(a) * ARM, pl.y - Math.sin(a) * ARM, pl.x + Math.cos(a) * ARM, pl.y + Math.sin(a) * ARM, 0.2 + k * 0.3);
        } else if (!pl.crossed) {
          g.fillStyle(GOLD, 0.2); g.fillCircle(pl.x, pl.y, DISC * 0.6);
          const k = clamp((time - pl.landAt) / Math.max(1, pl.crossAt - pl.landAt), 0, 1);
          for (const a of [Math.PI / 4, -Math.PI / 4]) {
            g.lineStyle(ARM_HALF * 2, SUN_HOT, 0.1 + k * 0.25);
            g.lineBetween(pl.x - Math.cos(a) * ARM, pl.y - Math.sin(a) * ARM, pl.x + Math.cos(a) * ARM, pl.y + Math.sin(a) * ARM);
          }
        } else {
          const f = clamp((time - pl.crossAt) / 500, 0, 1);
          for (const a of [Math.PI / 4, -Math.PI / 4]) {
            g.lineStyle(ARM_HALF * 2 * (1 - f), GLASS_LIT, 0.9 * (1 - f));
            g.lineBetween(pl.x - Math.cos(a) * ARM, pl.y - Math.sin(a) * ARM, pl.x + Math.cos(a) * ARM, pl.y + Math.sin(a) * ARM);
          }
        }
      }
    },
    drawAir(g, time) {
      // The sword of light, point-down, falling onto the mark.
      for (const pl of plunges) {
        if (pl.landed && time - pl.landAt > 300) continue;
        const k = clamp((time - pl.at) / Math.max(1, pl.landAt - pl.at), 0, 1);
        const tipY = pl.y - (1 - k * k) * 360;
        const a = pl.landed ? 1 - (time - pl.landAt) / 300 : 0.4 + k * 0.6;
        g.fillStyle(SUN, a * 0.9); g.fillTriangle(pl.x - 9, tipY - 110, pl.x + 9, tipY - 110, pl.x, tipY);
        g.fillStyle(GLASS_LIT, a); g.fillTriangle(pl.x - 3, tipY - 106, pl.x + 3, tipY - 106, pl.x, tipY - 6);
        g.fillStyle(GOLD, a); g.fillRect(pl.x - 26, tipY - 118, 52, 7);
        g.fillStyle(GOLD_DARK, a); g.fillRect(pl.x - 4, tipY - 150, 8, 32);
        g.fillStyle(GOLD_LIT, a); g.fillCircle(pl.x, tipY - 154, 6);
      }
    },
    onPhaseEnd() { plunges = []; queue = []; mark = null; off?.(); off = null; },
  };
};

// ── Signature: The Scales ────────────────────────────────────────────
// His great scales come loose and drift after you, a pan on each side. One pan, then the other,
// is weighed down: its shadow swells on the floor, and then it slams. Keep under the beam.

const scalesSig = (tk: BossToolkit): SignatureMove => {
  let on = false;
  let sx = 0, sy = 0;
  let startAt = 0;
  let tips: { side: number; at: number; landAt: number; x: number; y: number; dealt: boolean }[] = [];
  let nextTip = 0;
  let tipsLeft = 0;
  const ARM = 140, PAN_R = 66;
  return {
    durationMs: 1200,
    windupMs: 500,
    gesture: 'raise',
    tell: 'THE SCALES',
    cast(time) {
      on = true;
      sx = tk.bossX; sy = tk.bossY - 20;
      startAt = time;
      tips = [];
      tipsLeft = tk.hard ? 6 : 5;
      nextTip = time + 600;
      tk.sfx('gear-turn');
    },
    update(time, dt) {
      if (!on) return;
      const p = tk.player;
      // Drifts after you.
      const d = dist(sx, sy, p.x, p.y);
      if (d > 4) { const sp = Math.min(d, 78 * dt); sx += ((p.x - sx) / d) * sp; sy += ((p.y - sy) / d) * sp; }
      if (tipsLeft > 0 && time >= nextTip) {
        tipsLeft--;
        const side = tipsLeft % 2 ? -1 : 1;
        tips.push({ side, at: time, landAt: time + tk.warn(760), x: 0, y: 0, dealt: false });
        nextTip = time + 1000;
      }
      for (const t of tips) {
        if (t.dealt) continue;
        t.x = sx + t.side * ARM; t.y = sy + 30;
        if (time >= t.landAt) {
          t.dealt = true;
          tk.sfx('gravity-slam');
          tk.boom(t.x, t.y, PAN_R, GOLD);
          if (alivePlayer(tk) && dist(p.x, p.y, t.x, t.y) < PAN_R + 14) tk.hitPlayer(13, p.x, p.y);
        }
      }
      if (tipsLeft <= 0 && tips.every((t) => t.dealt) && time - startAt > 1500) { on = false; tips = []; }
    },
    drawGround(g, time) {
      if (!on) return;
      g.fillStyle(VERDICT_DARK, 0.12); g.fillEllipse(sx, sy + 30, 60, 16);
      for (const t of tips) {
        if (t.dealt) continue;
        const k = clamp((time - t.at) / Math.max(1, t.landAt - t.at), 0, 1);
        g.fillStyle(VERDICT_DARK, 0.1 + k * 0.3); g.fillEllipse(t.x, t.y, PAN_R * 2 * (0.6 + k * 0.4), PAN_R * 1.6 * (0.6 + k * 0.4));
        g.lineStyle(2, GOLD_LIT, 0.4 + k * 0.6); g.strokeEllipse(t.x, t.y, PAN_R * 2, PAN_R * 1.6);
      }
    },
    drawAir(g, time) {
      if (!on) return;
      // The beam tips toward whichever pan is about to fall.
      const live = tips.find((t) => !t.dealt);
      const k = live ? clamp((time - live.at) / Math.max(1, live.landAt - live.at), 0, 1) : 0;
      const tilt = live ? live.side * k * 0.35 : 0;
      const by = sy - 110;
      g.lineStyle(6, BRONZE_DARK, 1); g.lineBetween(sx, by, sx, by + 40);
      const ex = Math.cos(tilt) * ARM, ey = Math.sin(tilt) * ARM;
      g.lineStyle(8, BRONZE_DARK, 1); g.lineBetween(sx - ex, by - ey, sx + ex, by + ey);
      g.lineStyle(4, BRONZE, 1); g.lineBetween(sx - ex, by - ey - 1, sx + ex, by + ey - 1);
      sunburst(g, sx, by - 12, 12, GOLD, 1);
      for (const side of [-1, 1]) {
        const px = sx + side * ex, py = by + side * ey;
        const t = tips.find((tt) => !tt.dealt && tt.side === side);
        const drop = t ? clamp((time - t.at) / Math.max(1, t.landAt - t.at), 0, 1) * 70 : 0;
        const panY = py + 60 + drop;
        for (const dx of [-20, 0, 20]) { g.lineStyle(1.5, BRONZE_DARK, 1); g.lineBetween(px, py, px + dx, panY); }
        g.fillStyle(GOLD_DARK, 1); g.slice(px, panY, 26, 0, Math.PI, false); g.fillPath();
        g.fillStyle(GOLD, 1); g.fillEllipse(px, panY, 52, 11);
        g.fillStyle(GOLD_LIT, 0.8); g.fillEllipse(px - 8, panY - 1, 16, 3);
      }
    },
    onPhaseEnd() { on = false; tips = []; },
  };
};

// ── Signature: Capital Sentence ──────────────────────────────────────
// The black cap goes on. Lines are chalked across the floor one after another — one of them
// always through you — and a guillotine blade of light drops down each.

interface Line { x1: number; y1: number; x2: number; y2: number; at: number; fallAt: number; dealt: boolean }

const guillotineSig = (tk: BossToolkit): SignatureMove => {
  let lines: Line[] = [];
  const HALF = 22;
  return {
    durationMs: 3200,
    windupMs: 700,
    gesture: 'point',
    hold: 'reach',
    tell: 'CAPITAL SENTENCE',
    cast(time) {
      const p = tk.player;
      const n = 4;
      lines = [];
      for (let i = 0; i < n; i++) {
        const at = time + i * 420;
        const kind = (i + Math.floor(Math.random() * 3)) % 3;
        // One line always through you; the others offset.
        const ox = i === 1 ? p.x : clamp(p.x + (Math.random() - 0.5) * 360, 80, tk.W - 80);
        const oy = i === 1 ? p.y : clamp(p.y + (Math.random() - 0.5) * 280, TOP + 60, tk.H - 50);
        let l: Line;
        if (kind === 0) l = { x1: 0, y1: oy, x2: tk.W, y2: oy, at, fallAt: at + tk.warn(1100), dealt: false };
        else if (kind === 1) l = { x1: ox, y1: TOP, x2: ox, y2: tk.H, at, fallAt: at + tk.warn(1100), dealt: false };
        else { const s = Math.random() < 0.5 ? 1 : -1; l = { x1: ox - 600, y1: oy - s * 600, x2: ox + 600, y2: oy + s * 600, at, fallAt: at + tk.warn(1100), dealt: false }; }
        lines.push(l);
      }
      tk.sfx('curse-cast');
    },
    update(time) {
      const p = tk.player;
      for (const l of lines) {
        if (l.dealt || time < l.fallAt) continue;
        l.dealt = true;
        tk.sfx('slash');
        if (alivePlayer(tk) && segDist(p.x, p.y, l.x1, l.y1, l.x2, l.y2) < HALF + 12) tk.hitPlayer(16, p.x, p.y);
      }
      lines = lines.filter((l) => !l.dealt || time - l.fallAt < 450);
    },
    drawGround(g, time) {
      for (const l of lines) {
        if (time < l.at) continue;
        if (!l.dealt) {
          const k = clamp((time - l.at) / Math.max(1, l.fallAt - l.at), 0, 1);
          chalkLine(g, l.x1, l.y1, l.x2, l.y2, 0.5 + k * 0.5, 2 + k * 2);
          g.lineStyle(HALF * 2, WAX, 0.04 + k * 0.12); g.lineBetween(l.x1, l.y1, l.x2, l.y2);
        } else {
          const f = clamp((time - l.fallAt) / 450, 0, 1);
          g.lineStyle(HALF * 2 * (1 - f * 0.5), SUN, 0.6 * (1 - f)); g.lineBetween(l.x1, l.y1, l.x2, l.y2);
          g.lineStyle(2, MARBLE_DEEP, 0.8 * (1 - f)); g.lineBetween(l.x1, l.y1 + 2, l.x2, l.y2 + 2);
        }
      }
    },
    drawAir(g, time) {
      // The blade: a long slanted wedge of light dropping onto the chalk.
      for (const l of lines) {
        if (time < l.fallAt - 260 || time > l.fallAt + 120) continue;
        const k = clamp((time - (l.fallAt - 260)) / 260, 0, 1);
        const lift = (1 - k) * 120;
        const nx = l.x2 - l.x1, ny = l.y2 - l.y1, len = Math.hypot(nx, ny) || 1;
        const uy = ny / len;
        const n = 8;
        for (let i = 0; i < n; i++) {
          const t0 = i / n, t1 = (i + 1) / n;
          const ax = l.x1 + nx * t0, ay = l.y1 + ny * t0 - lift, bx = l.x1 + nx * t1, by = l.y1 + ny * t1 - lift;
          g.fillStyle(GLASS_LIT, 0.85); g.fillTriangle(ax, ay, bx, by, bx - uy * 4, by - 26);
          g.fillStyle(SUN, 0.6); g.fillTriangle(ax, ay, bx - uy * 4, by - 26, ax - uy * 4, ay - 26);
        }
      }
    },
    onPhaseEnd() { lines = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const VERDICT_BOSS: WorldBossDef = {
  worldId: 'isle:verdict',
  name: 'Prince Verdict',
  title: 'Radiance of the Tribunal',
  color: VERDICT,
  colorLit: VERDICT_LIT,
  colorDark: VERDICT_DARK,
  accent: GOLD,
  // Tier 4 of the tenth isle.
  damageMult: 1.6,

  intro: [
    'The accused will rise. — You are standing already. Good. It saves the court a moment.',
    'Charged with being out of doors in the Despot\'s noon with a shadow you have not declared. How do you plead?',
  ],
  banter: [
    'This court has never acquitted. Do you know why? Because it has never been wrong.',
    'Darkness is where lies live. You came in out of the dark. Therefore.',
    'The glass is so the people can watch justice done. They are watching. Wave.',
    'Objection noted. Objection overruled. Objection bleached.',
    'Stand in the light where the court can see you. It will be quicker.',
    'I have sentenced two thousand shade-thieves. I remember all their shadows. Every one was guilty.',
  ],
  defeatLine: 'THE COURT IS ADJOURNED',
  resumeLine: 'The defendant returns. Contempt of court is noted. Proceed.',

  phases: [
    {
      name: 'Gavel',
      line: 'Order. ORDER. The court will come to order, or the court will make it.',
      hp: 630,
      cycle: [
        'sig:gavel', 'volley', 'sig:witness', 'lanes',
        'sig:gavel', 'radial', 'sig:witness', 'barrage',
      ],
      harass: ['h-snipe', 'h-lane'],
      restMs: 1100,
      harassMs: 3200,
    },
    {
      name: 'Blind Justice',
      line: 'Justice is blind, they say. Let us see how you fare against a judge who does not need to look.',
      hp: 730,
      cycle: [
        'sig:blind', 'sig:scales', 'homing', 'sig:blind',
        'spiral', 'sig:scales', 'sig:blind', 'minefield',
      ],
      harass: ['h-orbs', 'h-rune'],
      restMs: 1000,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'THE BLACK CAP IS BROUGHT',
    extraPhase: {
      name: 'Capital Sentence',
      line: 'Fetch me the black cap. The sentence of this court is that you be taken from this place.',
      hp: 550,
      cycle: [
        'sig:guillotine', 'sig:gavel', 'sweep', 'sig:guillotine',
        'sig:blind', 'slamchain', 'sig:guillotine', 'sig:witness',
      ],
      harass: ['h-lane', 'h-mines'],
      restMs: 900,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 5, speed: 230, spreadRad: 0.5 },
    radial: { count: 16, speed: 190 },
    lanes: { halfW: 22 },
    spiral: { arms: 3, speed: 175 },
  },

  signatures: {
    gavel: gavelSig,
    witness: witnessSig,
    blind: blindSig,
    scales: scalesSig,
    guillotine: guillotineSig,
  },

  look: {
    crest: 'none', pattern: 'plates', aura: 'sparks', hands: 'gauntlet',
    torsoR: 36, mouth: 'line', eyes: 2, eyeColor: SUN_HOT,
  },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'wards', tint: 'gold' },
    { movement: 'stalk', gimmick: 'none', tint: 'pale', look: { aura: 'chains', mouth: 'stitch', eyes: 1 } },
    { movement: 'blink', gimmick: 'shrink', tint: 'blood', look: { aura: 'smoke', hands: 'blade', mouth: 'grate' } },
  ],

  /**
   * The Radiance's tells. A judge's full-bottomed wig — a white crown of curls falling in two long
   * cascades past his shoulders — over a black-violet robe with gilt bands down the front and a
   * gilt chain of office with the scales on it. A gavel in one hand and a small gilt balance in the
   * other. Blind Justice ties a white blindfold over his eyes (its tails stream behind as he walks)
   * and his balance swings; Capital Sentence lays the black cap flat on top of the wig.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const blind = s.phaseIdx === 1;
    const capital = s.hard && s.phaseIdx >= 2;
    // Robe bands and the chain of office.
    g.lineStyle(3, GOLD, 1); g.lineBetween(s.x - 6, s.y + R * 0.2, s.x - 8, s.y + R * 1.05); g.lineBetween(s.x + 6, s.y + R * 0.2, s.x + 8, s.y + R * 1.05);
    g.lineStyle(2.5, GOLD, 1); g.beginPath(); g.arc(s.x, s.y - R * 0.1, R * 0.62, 0.35, Math.PI - 0.35, false); g.strokePath();
    for (let i = 0; i < 7; i++) { const a = 0.35 + (i / 6) * (Math.PI - 0.7); g.fillStyle(GOLD_LIT, 1); g.fillCircle(s.x + Math.cos(a) * R * 0.62, s.y - R * 0.1 + Math.sin(a) * R * 0.62, 2); }
    g.fillStyle(GOLD_DARK, 1); g.fillCircle(s.x, s.y + R * 0.55, 7);
    scalesEmblem(g, s.x, s.y + R * 0.55, 5, GOLD_LIT, 1);
    // The wig: two cascades of curls down the sides, a crown of curls on top.
    for (const k of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const cx = s.x + k * (R * 0.78 + (i % 2) * 4), cy = s.y - R * 0.5 + i * R * 0.3;
        g.fillStyle(WIG_SHADE, 1); g.fillCircle(cx, cy + 1.5, R * 0.2);
        g.fillStyle(WIG, 1); g.fillCircle(cx, cy, R * 0.18);
        g.lineStyle(1, WIG_SHADE, 0.9); g.beginPath(); g.arc(cx, cy, R * 0.09, 0, Math.PI * 1.5, false); g.strokePath();
      }
    }
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + 0.25 + (i / 6) * (Math.PI - 0.5);
      const cx = s.x + Math.cos(a) * R * 0.8, cy = s.y - R * 0.15 + Math.sin(a) * R * 0.8;
      g.fillStyle(WIG_SHADE, 1); g.fillCircle(cx, cy + 1.5, R * 0.22);
      g.fillStyle(WIG, 1); g.fillCircle(cx, cy, R * 0.2);
    }
    if (blind) {
      // The blindfold: a white band with gilt edges, tails streaming away from you.
      g.fillStyle(WIG, 1); g.fillRect(s.x - R * 0.78, s.y - R * 0.28, R * 1.56, R * 0.3);
      g.lineStyle(1.5, GOLD, 1); g.lineBetween(s.x - R * 0.78, s.y - R * 0.28, s.x + R * 0.78, s.y - R * 0.28); g.lineBetween(s.x - R * 0.78, s.y + R * 0.02, s.x + R * 0.78, s.y + R * 0.02);
      const back = s.facing + Math.PI;
      for (const k of [-1, 1]) {
        const w = Math.sin(s.t / 160 + k) * 4;
        g.fillStyle(WIG, 0.95);
        g.fillTriangle(s.x + Math.cos(back) * R * 0.7, s.y - R * 0.2, s.x + Math.cos(back) * R * 0.7, s.y - R * 0.02,
          s.x + Math.cos(back + k * 0.4) * R * 1.6, s.y - R * 0.1 + w + k * 6);
      }
    }
    if (capital) {
      // The black cap: a square of black cloth laid flat on the wig.
      g.fillStyle(INK, 1);
      g.fillPoints([
        new Phaser.Geom.Point(s.x - R * 0.6, s.y - R * 0.95), new Phaser.Geom.Point(s.x + R * 0.1, s.y - R * 1.15),
        new Phaser.Geom.Point(s.x + R * 0.7, s.y - R * 0.95), new Phaser.Geom.Point(s.x, s.y - R * 0.75),
      ], true);
      g.lineStyle(1, ROBE_LIT, 0.6); g.lineBetween(s.x - R * 0.6, s.y - R * 0.95, s.x + R * 0.1, s.y - R * 1.15);
    }
    // The gavel in the first hand, the balance in the second.
    const h0 = s.hands[0], h1 = s.hands[1];
    if (h0) gavel(g, h0.x, h0.y, 0.7, -Math.PI / 2 - 0.5 - s.castGlow * 0.8, ROBE_DARK);
    if (h1) {
      const sw = blind ? Math.sin(s.t / 300) * 0.4 : 0.1;
      scalesEmblem(g, h1.x, h1.y - 18, 12, capital ? WAX : GOLD, 1, sw);
    }
    if (s.enraged) { g.lineStyle(1.5, GOLD_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeRect(s.x - R * 1.4, s.y - R * 1.4, R * 2.8, R * 2.8); }
  },

  /**
   * Verdict's own courtroom, under the glass dome: a purple runner down the middle from the
   * dock (bottom) to his bench (top), a great gilt compass of the sun in the floor where the
   * accused stands to hear the sentence, the faint chalk of a thousand sentences scrubbed and
   * not quite gone, the dome's ribs throwing a hard star of thin shadow, and the jury's empty
   * box along one wall — he stopped needing them some years ago.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x7e1d1c7);
    marbleTerrace(g, { x: 0, y: 0, w: W, h: H }, rng, 64);
    const cx = W / 2, cy = (H + 110) / 2;
    // The runner.
    g.fillStyle(ROBE_DARK, 1); g.fillRect(cx - 74, 96, 148, H - 96);
    g.fillStyle(ROBE, 1); g.fillRect(cx - 66, 96, 132, H - 96);
    g.lineStyle(2, GOLD, 0.9); g.lineBetween(cx - 60, 96, cx - 60, H); g.lineBetween(cx + 60, 96, cx + 60, H);
    for (let y = 130; y < H; y += 60) { g.fillStyle(GOLD_DARK, 0.6); g.fillTriangle(cx - 10, y, cx + 10, y, cx, y + 12); }
    // The dome's ribs: a thin star of shadow from the centre.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.lineStyle(3, VERDICT_DARK, 0.06); g.lineBetween(cx, cy, cx + Math.cos(a) * 700, cy + Math.sin(a) * 700);
    }
    // The sun compass where the accused stands.
    g.fillStyle(MARBLE_DEEP, 1); g.fillCircle(cx, cy + 60, 92);
    g.fillStyle(MARBLE_LIT, 1); g.fillCircle(cx, cy + 60, 86);
    sunburst(g, cx, cy + 60, 80, GOLD, 0.85);
    g.lineStyle(2, GOLD_DARK, 1); g.strokeCircle(cx, cy + 60, 90);
    // Old chalk lines, scrubbed and still there.
    for (let i = 0; i < 9; i++) {
      const y = 150 + rng() * (H - 200), x = rng() * W;
      chalkLine(g, x - 300, y - 60 + rng() * 120, x + 300, y - 60 + rng() * 120, 0.08 + rng() * 0.06, 2);
    }
    // His bench across the top: a high front of purple and gilt, the gilt sun behind it.
    g.fillStyle(VERDICT_DARK, 1); g.fillRect(0, 0, W, 108);
    sunburst(g, cx, 40, 70, GOLD_DARK, 0.6);
    g.fillStyle(ROBE_DARK, 1); g.fillRect(cx - 220, 50, 440, 56);
    g.fillStyle(ROBE, 1); g.fillRect(cx - 214, 56, 428, 44);
    g.lineStyle(2, GOLD, 1); g.strokeRect(cx - 214, 56, 428, 44);
    scalesEmblem(g, cx, 78, 16, GOLD_LIT, 1);
    for (let k = 0; k < 6; k++) robeSwag(g, k * 160, k * 160 + 160, 6, 14);
    g.fillStyle(GOLD_DARK, 1); g.fillRect(0, 104, W, 6); g.fillStyle(GOLD, 1); g.fillRect(0, 104, W, 3);
    // The empty jury box down the left wall, the dock down at the bottom.
    g.fillStyle(BRONZE_DARK, 1); g.fillRect(14, 170, 60, 300);
    g.fillStyle(dim(BRONZE, 0.2), 1); g.fillRect(18, 174, 52, 292);
    for (let i = 0; i < 12; i++) { g.fillStyle(ROBE_DARK, 0.8); g.fillRoundedRect(26 + (i % 2) * 20, 184 + Math.floor(i / 2) * 46, 16, 30, 4); }
    g.lineStyle(1.5, MIRROR_DARK, 0.9);
    for (let k = -6; k <= 6; k++) g.lineBetween(cx + k * 9, H - 50, cx + k * 9, H - 4);
    g.lineStyle(3, GOLD_DARK, 1); g.strokeEllipse(cx, H - 50, 130, 18);
    // Glass down the right wall, the plaza bright behind it.
    g.fillStyle(lit(GLASS, 0.5), 1); g.fillRect(W - 50, 110, 50, H - 110);
    for (let y = 112; y < H; y += 96) glassPanel(g, W - 46, y + 4, 42, 88, 0.8);
    g.fillStyle(GLASS_LIT, 0.3); g.fillRect(W - 40, 120, 4, H - 150);
    // A witness stand by the glass.
    witnessStand(g, W - 110, 200, 1, 0.8);
    glow(g, cx, cy + 60, 150, SUN, 0.03, 4);
  },
};
