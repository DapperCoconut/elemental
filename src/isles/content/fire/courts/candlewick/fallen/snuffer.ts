import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, mixC, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRASS, SOOT, WICK, dist, flame, smokeCurl } from '../art';

/**
 * The Snuffing — Curfew-Snuffer Gall, who in the King's telling walks Wick Street after dark with
 * a pole and a brass cone and puts out every window that is burning "too fast".
 *
 * Gall's snuffer bells come down out of the dark: a shadow on the floor tightens and a brass cone
 * drops on it. Whoever is under it when it lands is snuffed — stunned and scorched. A landed bell
 * stays standing, and that is the second layer: a standing bell can be STRUCK. Struck, it shivers
 * for a beat and then rings, a shockwave that throws back and hurts whoever stands beside it —
 * except the one who rang it. The exploit is the same for both sides: ring the bell your foe is
 * standing next to. Halfway down, Gall takes up the Great Snuffer and the bells walk toward you in
 * a line of three.
 */

const DROP_EVERY_MS = 3000;
const DROP_EVERY_LATE_MS = 3600;
const FALL_MS = 1150;
const LINE_STEP_MS = 260;
const BELL_R = 44;
const SNUFF_DAMAGE = 14;
const SNUFF_STUN_MS = 850;
const RING_WARN_MS = 650;
const RING_R = 128;
const RING_DAMAGE = 18;
const RING_SHOVE = 70;
const RING_COOLDOWN_MS = 1100;
const BELL_LIFE_MS = 10000;
const MAX_BELLS = 4;
const FIGHTER_R = 20;

/** A bell on its way down. */
interface Drop { x: number; y: number; bornAt: number; landAt: number }
/** A bell standing on the floor: strikeable, and maybe shivering toward a ring. */
interface Bell {
  x: number; y: number; bornAt: number; dieAt: number; target: StrikeTarget;
  /** When the current ring goes off (0 = not ringing) and who rang it. */
  ringAt: number; ringer: Fighter | null; lastRang: number; rungAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const fieldTop = top + 40;
  let drops: Drop[] = [];
  let bells: Bell[] = [];
  let nextDropAt = 1800;
  let dropCount = 0;
  let great = false;
  let announced = false;
  /** When each side's snuffing lets go (scene ms) — only for the smoke curl. */
  const snuffedUntil = new Map<Fighter, number>();

  const clampPt = (x: number, y: number): Pt => ({
    x: Math.max(60, Math.min(W - 60, x)), y: Math.max(fieldTop + 20, Math.min(H - 50, y)),
  });
  const other = (f: Fighter): Fighter => (f === ctx.player ? ctx.npc : ctx.player);

  const queueDrop = (p: Pt, time: number): void => {
    drops.push({ x: p.x, y: p.y, bornAt: time, landAt: time + FALL_MS });
  };

  const ring = (b: Bell, time: number): void => {
    b.ringAt = time + RING_WARN_MS;
    b.lastRang = time;
    ctx.sfx('clang');
  };

  const addBell = (d: Drop, time: number): void => {
    while (bells.length >= MAX_BELLS) {
      const old = bells.shift();
      old?.target.remove();
    }
    const bell: Bell = {
      x: d.x, y: d.y, bornAt: time, dieAt: time + BELL_LIFE_MS, ringAt: 0, ringer: null, lastRang: -9999, rungAt: -9999,
      target: ctx.target({
        x: d.x, y: d.y - 18, r: 30,
        onStruck(by) {
          const now = ctx.scene.time.now;
          if (bell.ringAt > 0 || now - bell.lastRang < RING_COOLDOWN_MS) return;
          bell.ringer = by === 'player' ? ctx.player : ctx.npc;
          ring(bell, now);
        },
      }),
    };
    bells.push(bell);
  };

  const land = (d: Drop, time: number): void => {
    ctx.sfx('anvil');
    for (const f of [ctx.player, ctx.npc]) {
      if (!f.active || f.hp <= 0) continue;
      if (dist(d.x, d.y, f.x, f.y) < BELL_R + FIGHTER_R * 0.4) {
        ctx.hit(f, SNUFF_DAMAGE, f.x, f.y);
        ctx.stun(f, SNUFF_STUN_MS);
        snuffedUntil.set(f, time + SNUFF_STUN_MS);
        ctx.flash(f.x, f.y, SOOT);
      }
    }
    addBell(d, time);
  };

  const burst = (b: Bell, time: number): void => {
    b.ringAt = 0;
    b.rungAt = time;
    ctx.sfx('sonic-pulse');
    // The ringer stands in the bell's hush; everyone else in reach is thrown back.
    for (const f of [ctx.player, ctx.npc]) {
      if (f === b.ringer || !f.active || f.hp <= 0) continue;
      const d = dist(b.x, b.y, f.x, f.y);
      if (d > RING_R + FIGHTER_R * 0.5) continue;
      const a = d > 1 ? Math.atan2(f.y - b.y, f.x - b.x) : rng() * Math.PI * 2;
      ctx.hit(f, RING_DAMAGE, f.x, f.y);
      ctx.nudge(f, Math.cos(a) * RING_SHOVE, Math.sin(a) * RING_SHOVE);
    }
    b.ringer = null;
  };

  /** Gall picks the spot: mostly the player, every third drop somewhere near the middle of the room. */
  const schedule = (time: number): void => {
    dropCount++;
    const p = ctx.player;
    if (great) {
      // The Great Snuffer: three bells stepping from Gall toward the player.
      const n = ctx.npc;
      const a = Math.atan2(p.y - n.y, p.x - n.x);
      const reach = Math.max(120, Math.min(320, dist(n.x, n.y, p.x, p.y)));
      for (let i = 0; i < 3; i++) {
        const k = (i + 1) / 3;
        const at = clampPt(n.x + Math.cos(a) * reach * k, n.y + Math.sin(a) * reach * k);
        ctx.tk.schedule(i * LINE_STEP_MS, () => queueDrop(at, ctx.scene.time.now));
      }
      return;
    }
    if (dropCount % 3 === 0) queueDrop(clampPt(W / 2 + (rng() - 0.5) * 420, H / 2 + (rng() - 0.3) * 260), time);
    else queueDrop(clampPt(p.x + (rng() - 0.5) * 50, p.y + (rng() - 0.5) * 50), time);
  };

  return {
    update(time) {
      if (!announced) { announced = true; ctx.banner('CURFEW — THE SNUFFERS ARE OUT', '#ffd7a0'); }
      if (!great && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        great = true;
        ctx.banner('THE GREAT SNUFFER', '#ffb070');
        ctx.sfx('boss-phase');
      }
      if (time >= nextDropAt) {
        nextDropAt = time + (great ? DROP_EVERY_LATE_MS : DROP_EVERY_MS) * (0.85 + rng() * 0.3);
        schedule(time);
      }
      for (const d of drops) if (time >= d.landAt) land(d, time);
      drops = drops.filter((d) => time < d.landAt);
      for (const b of bells) if (b.ringAt > 0 && time >= b.ringAt) burst(b, time);
      for (const b of bells) if (time >= b.dieAt && b.ringAt === 0) b.target.remove();
      bells = bells.filter((b) => b.target.alive);
    },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      // A shadow tightening over Gall: step out of it.
      for (const d of drops) {
        const dd = dist(d.x, d.y, n.x, n.y);
        if (dd < BELL_R + 34) {
          const a = dd > 1 ? Math.atan2(n.y - d.y, n.x - d.x) : Math.atan2(n.y - p.y, n.x - p.x);
          return { x: d.x + Math.cos(a) * (BELL_R + 80), y: d.y + Math.sin(a) * (BELL_R + 80) };
        }
      }
      // A bell shivering beside him that he did not ring: get clear of it.
      for (const b of bells) {
        if (b.ringAt > 0 && b.ringer !== n && dist(b.x, b.y, n.x, n.y) < RING_R + 30) {
          const a = Math.atan2(n.y - b.y, n.x - b.x);
          return { x: b.x + Math.cos(a) * (RING_R + 70), y: b.y + Math.sin(a) * (RING_R + 70) };
        }
      }
      // A quiet bell beside the player: walk up to it from the far side and ring it as he casts.
      const ready = bells.filter((b) => b.ringAt === 0 && ctx.scene.time.now - b.lastRang > RING_COOLDOWN_MS
        && dist(b.x, b.y, p.x, p.y) < RING_R - 10);
      if (ready.length) {
        const b = ready.reduce((m, c) => (dist(c.x, c.y, n.x, n.y) < dist(m.x, m.y, n.x, n.y) ? c : m));
        const a = Math.atan2(b.y - p.y, b.x - p.x);
        return { x: b.x + Math.cos(a) * 70, y: b.y + Math.sin(a) * 70 };
      }
      return null;
    },

    drawGround(g, time) {
      // Shadows of the falling bells, tightening to the bell's mouth as it nears the floor.
      for (const d of drops) {
        const k = Math.min(1, (time - d.bornAt) / (d.landAt - d.bornAt));
        const r = BELL_R * (1.8 - k * 0.8);
        g.fillStyle(0x000000, 0.12 + k * 0.3); g.fillEllipse(d.x, d.y, r * 2, r * 1.2);
        g.lineStyle(2, BRASS, 0.3 + k * 0.6); g.strokeEllipse(d.x, d.y, BELL_R * 2, BELL_R * 1.2);
        if (k > 0.7 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(3, 0xffe0a0, 0.6); g.strokeEllipse(d.x, d.y, BELL_R * 2, BELL_R * 1.2); }
      }
      // Ring telegraphs and the ring itself.
      for (const b of bells) {
        if (b.ringAt > 0) {
          const k = 1 - (b.ringAt - time) / RING_WARN_MS;
          const c = b.ringer === ctx.player ? 0x8ad0ff : 0xff9a5a;
          g.fillStyle(c, 0.06 + k * 0.1); g.fillEllipse(b.x, b.y, RING_R * 2, RING_R * 1.3);
          g.lineStyle(2, c, 0.5 + k * 0.4); g.strokeEllipse(b.x, b.y, RING_R * 2, RING_R * 1.3);
          g.lineStyle(1.5, c, 0.6); g.strokeEllipse(b.x, b.y, RING_R * 2 * k, RING_R * 1.3 * k);
          if (b.ringer) {
            // The ringer's hush: a pale cone of quiet back toward whoever rang it.
            g.lineStyle(1, 0xffffff, 0.35); g.lineBetween(b.x, b.y, b.ringer.x, b.ringer.y);
          }
        }
        const since = time - b.rungAt;
        if (since < 420) {
          const k = since / 420;
          for (let i = 0; i < 3; i++) {
            const rr = RING_R * (0.4 + k * 0.7) - i * 14;
            if (rr <= 0) continue;
            g.lineStyle(4 - i, 0xfff0c8, (1 - k) * (0.8 - i * 0.2)); g.strokeEllipse(b.x, b.y, rr * 2, rr * 1.3);
          }
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // Standing bells: brass snuffer cones with a hook handle, soot round the rim, a smoke wisp from the vent.
      for (const b of bells) {
        const shiver = b.ringAt > 0 ? Math.sin(time * 0.09) * 3 : 0;
        const fade = Math.min(1, (b.dieAt - time) / 600);
        snufferBell(g, b.x + shiver, b.y, 1, fade, t, b.bornAt);
      }
      // Falling bells, swinging slightly on Gall's pole-line from the dark above.
      for (const d of drops) {
        const k = Math.min(1, (time - d.bornAt) / (d.landAt - d.bornAt));
        const h = (1 - k * k) * 220;
        g.lineStyle(1.5, WICK, 0.5); g.lineBetween(d.x, top, d.x, d.y - h - 56);
        snufferBell(g, d.x, d.y - h, 1, 1, t, d.bornAt);
      }
      // Who is snuffed: a curl of smoke off their head, like a wick just pinched.
      for (const f of [ctx.player, ctx.npc]) {
        if (time < (snuffedUntil.get(f) ?? 0)) smokeCurl(g, f.x, f.y - 40, t, 0.5, 34);
      }
    },

    drawHud(g, time) {
      // Standing bells as four little brass cones top-right; a ringing one glows; the Great Snuffer pole when late.
      const x0 = ctx.W - 150, y0 = 70;
      for (let i = 0; i < MAX_BELLS; i++) {
        const b = bells[i];
        const x = x0 + i * 30;
        g.fillStyle(0x000000, 0.35); g.fillRoundedRect(x - 12, y0 - 26, 24, 30, 5);
        if (b) {
          const c = b.ringAt > 0 ? (Math.floor(time / 90) % 2 ? 0xfff0c8 : BRASS) : BRASS;
          g.fillStyle(c, 1); g.fillTriangle(x - 9, y0, x + 9, y0, x, y0 - 18);
          g.fillStyle(dim(c, 0.35), 1); g.fillRect(x - 9, y0 - 1, 18, 3);
        } else {
          g.lineStyle(1, BRASS, 0.4); g.strokeTriangle(x - 9, y0, x + 9, y0, x, y0 - 18);
        }
      }
      if (great) {
        g.lineStyle(3, dim(BRASS, 0.2), 1); g.lineBetween(x0 - 34, y0 - 26, x0 - 16, y0 + 2);
        g.fillStyle(BRASS, 1); g.fillTriangle(x0 - 26, y0 + 4, x0 - 8, y0 + 4, x0 - 17, y0 - 10);
      }
    },

    destroy() {
      for (const b of bells) b.target.remove();
      bells = [];
    },
  };
}

/**
 * A brass snuffer bell — a tall cone with a rolled rim, a soot-black mouth, a vent knob and Gall's
 * hook handle — drawn with its mouth at (x, y). `fade` shrinks it into the floor as it is lifted away.
 */
function snufferBell(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, fade: number, t: number, seed: number): void {
  const w = 40 * s * fade, h = 56 * s * fade;
  shadow(g, x, y + 3, w * 1.6, w * 0.4, 0.3 * fade);
  // Body: a darker back face and a lit front face so the cone reads round.
  g.fillStyle(dim(BRASS, 0.4), 1); g.fillTriangle(x - w, y, x + w, y, x, y - h);
  g.fillStyle(BRASS, 1); g.fillTriangle(x - w * 0.86, y - 1, x + w * 0.5, y - 1, x - w * 0.08, y - h + 2);
  g.fillStyle(lit(BRASS, 0.35), 0.9); g.fillTriangle(x - w * 0.62, y - 2, x - w * 0.36, y - 2, x - w * 0.1, y - h + 8);
  // Soot creeping up from the mouth, and the engraved Inchwarden band.
  g.fillStyle(mixC(SOOT, BRASS, 0.25), 0.7); g.fillTriangle(x - w, y, x + w, y, x, y - h * 0.22);
  g.lineStyle(1.5, dim(BRASS, 0.5), 0.9); g.lineBetween(x - w * 0.55, y - h * 0.45, x + w * 0.55, y - h * 0.45);
  for (let i = -2; i <= 2; i++) { g.fillStyle(dim(BRASS, 0.45), 1); g.fillCircle(x + i * w * 0.18, y - h * 0.45 - 3, 1.4); }
  // Rolled rim and the dark mouth.
  g.fillStyle(0x140e0a, 1); g.fillEllipse(x, y, w * 2, w * 0.36);
  g.lineStyle(2.5, lit(BRASS, 0.15), 1); g.strokeEllipse(x, y, w * 2, w * 0.36);
  // The vent knob and the hook for Gall's pole.
  g.fillStyle(lit(BRASS, 0.2), 1); g.fillCircle(x, y - h, 4 * s * fade);
  g.lineStyle(2.5, dim(BRASS, 0.3), 1);
  g.beginPath(); g.arc(x + 6 * s, y - h - 4, 7 * s * fade, Math.PI * 0.9, Math.PI * 2.2); g.strokePath();
  // A last ember caught under the rim, breathing.
  const e = 0.4 + Math.sin(t * 4 + seed * 0.01) * 0.3;
  if (fade > 0.6) flame(g, x + w * 0.62, y + 1, 2.2, t, seed % 7, 0);
  g.fillStyle(0xff7a2a, e * 0.5); g.fillEllipse(x + w * 0.6, y + 1, 10, 3);
}

export const SNUFFER: GimmickDef = {
  id: fallenId('candlewick', 'snuffer'),
  rules: 'Snuffer bells drop on shadows: caught under one, you are snuffed. Strike a standing bell and it rings — hurting all beside it but you.',
  make,
};
