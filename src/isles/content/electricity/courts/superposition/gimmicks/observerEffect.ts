import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { stencilEye } from '../art';
import { BOTH, BOTH_DARK, BOTH_LIT, STATE_A, STATE_B } from '../palette';
import { alive, clamp, dist, Gaze, stepDt } from '../util';

/**
 * Observer Effect — Watcher Heisen.
 *
 * The room is full of *maybes*: knots of spines that are only there when nobody is looking. Each
 * fighter looks down a wide cone (the player where they aim, Heisen where he walks), shown on the
 * floor. A maybe inside anyone's cone fades to a ghost and freezes; one that nobody is looking at
 * becomes real — solid, spined, and creeping toward the nearest back. A real maybe that touches a
 * fighter strikes and bursts, and reforms somewhere else.
 *
 * So whatever is behind you is real, and whatever you face fades. Heisen closes his eyes every so
 * often (his cone goes dark) and everything he was holding still lunges: that is when the maybes
 * behind *him* come for him too — keep him looking at you while they gather at his back.
 */

const CONE_HALF = 0.72;
const CONE_REACH = 520;
const N = 7;
const CREEP = 44;
const HIT = 11;
const BLINK_EVERY = 7600;
const BLINK_MS = 1600;

interface Maybe {
  x: number; y: number;
  seed: number;
  /** 0 = fully observed ghost … 1 = fully real. */
  real: number;
  /** Not yet re-formed after a burst. */
  formAt: number;
  hitAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const gazes = new Map<Fighter, Gaze>([
    [player, new Gaze(ctx.facing, player, false)],
    [npc, new Gaze(ctx.facing, npc, true)],
  ]);
  const maybes: Maybe[] = [];
  let blinkWarnAt = -1;
  let blinkUntil = 0;
  let nextBlink = 0;
  let started = false;
  const reach = ctx.hard ? CONE_REACH - 60 : CONE_REACH;

  function spot(): { x: number; y: number } {
    for (let i = 0; i < 30; i++) {
      const x = 70 + rng() * (W - 140), y = top + 50 + rng() * (H - top - 100);
      if (dist(x, y, player.x, player.y) > 170 && dist(x, y, npc.x, npc.y) > 170 && maybes.every((m) => dist(m.x, m.y, x, y) > 90)) return { x, y };
    }
    return { x: 70 + rng() * (W - 140), y: top + 50 + rng() * (H - top - 100) };
  }

  /** Is the maybe at (x, y) looked at by anyone? Heisen does not count while his eyes are shut. */
  function watched(x: number, y: number, time: number): boolean {
    if (alive(player) && gazes.get(player)?.sees(x, y, CONE_HALF, reach)) return true;
    if (alive(npc) && time >= blinkUntil && gazes.get(npc)?.sees(x, y, CONE_HALF, reach)) return true;
    return false;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextBlink = time + BLINK_EVERY;
        for (let i = 0; i < N; i++) { const s = spot(); maybes.push({ ...s, seed: rng() * 10, real: 0, formAt: time + 600 + i * 200, hitAt: 0 }); }
      }
      for (const gz of gazes.values()) gz.update(dt);
      // Heisen's blink.
      if (blinkWarnAt < 0 && time >= nextBlink - 1000) { blinkWarnAt = time; ctx.float(npc.x, npc.y - 52, 'his eyes close…', '#d2c0ff'); }
      if (time >= nextBlink) {
        nextBlink = time + (ctx.hard ? BLINK_EVERY - 1400 : BLINK_EVERY);
        blinkWarnAt = -1;
        blinkUntil = time + BLINK_MS;
        ctx.banner('HEISEN BLINKS', '#d2c0ff');
        ctx.sfx('hush');
      }
      for (const m of maybes) {
        if (time < m.formAt) continue;
        const seen = watched(m.x, m.y, time);
        m.real = clamp(m.real + (seen ? -dt * 4 : dt * 1.6), 0, 1);
        if (m.real < 0.7) continue;
        // Real: creep at the nearest fighter.
        let tgt: Fighter | null = null;
        let td = Infinity;
        for (const f of [player, npc]) { if (!alive(f)) continue; const d = dist(m.x, m.y, f.x, f.y); if (d < td) { td = d; tgt = f; } }
        if (!tgt) continue;
        const sp = CREEP * (ctx.hard ? 1.25 : 1) * (time < blinkUntil ? 1.6 : 1);
        m.x += ((tgt.x - m.x) / (td || 1)) * sp * dt;
        m.y += ((tgt.y - m.y) / (td || 1)) * sp * dt;
        if (td < 32 && time - m.hitAt > 600) {
          m.hitAt = time;
          if (tgt === player) ctx.tk.hitPlayer(HIT, tgt.x, tgt.y); else ctx.hit(tgt, HIT, tgt.x, tgt.y);
          ctx.flash(m.x, m.y, BOTH_LIT);
          ctx.sfx('thorn');
          const s = spot();
          m.x = s.x; m.y = s.y; m.real = 0; m.formAt = time + 2200;
        }
      }
    },

    npcSeek() {
      // Heisen circles you at range, walking so his cone sweeps the maybes at his own back last.
      const t = ctx.scene.time.now / 2400;
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + 0.5;
      let x = player.x + Math.cos(a) * 250, y = player.y + Math.sin(a) * 210;
      // Step away from any real maybe close by.
      for (const m of maybes) {
        if (m.real < 0.6) continue;
        const d = dist(m.x, m.y, npc.x, npc.y);
        if (d < 120) { x += (npc.x - m.x) * 1.2; y += (npc.y - m.y) * 1.2; }
      }
      x += Math.cos(t) * 30;
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The cones of sight.
      for (const [f, gz] of gazes) {
        if (!alive(f)) continue;
        const shut = f === npc && time < blinkUntil;
        const c = f === player ? STATE_B : STATE_A;
        g.fillStyle(c, shut ? 0.015 : 0.05);
        g.slice(f.x, f.y, reach, gz.angle - CONE_HALF, gz.angle + CONE_HALF, false); g.fillPath();
        g.lineStyle(1.2, c, shut ? 0.08 : 0.25);
        for (const s of [-1, 1]) g.lineBetween(f.x, f.y, f.x + Math.cos(gz.angle + s * CONE_HALF) * reach, f.y + Math.sin(gz.angle + s * CONE_HALF) * reach);
        // The back: a darker half-disc, where the maybes are real.
        g.fillStyle(BOTH_DARK, 0.08);
        g.slice(f.x, f.y, 140, gz.angle + Math.PI - 1.2, gz.angle + Math.PI + 1.2, false); g.fillPath();
      }
      for (const m of maybes) {
        if (time < m.formAt) continue;
        g.fillStyle(0x000000, 0.25 * m.real); g.fillEllipse(m.x, m.y + 14, 40, 12);
      }
    },

    drawAir(g, time) {
      for (const m of maybes) {
        if (time < m.formAt) {
          // Re-forming: a swirl of motes gathering.
          const k = clamp(1 - (m.formAt - time) / 2200, 0, 1);
          for (let i = 0; i < 8; i++) { const a = i * 0.785 + time / 300; g.fillStyle(BOTH_LIT, 0.4 * k); g.fillCircle(m.x + Math.cos(a) * (40 - k * 30), m.y + Math.sin(a) * (40 - k * 30), 1.6); }
          continue;
        }
        const r = m.real;
        // The ghost: a dotted outline of the knot.
        if (r < 0.95) {
          g.lineStyle(1, BOTH_LIT, 0.35 * (1 - r) + 0.08);
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 + m.seed;
            g.lineBetween(m.x + Math.cos(a) * 10, m.y + Math.sin(a) * 10, m.x + Math.cos(a) * 20, m.y + Math.sin(a) * 20);
          }
        }
        if (r <= 0.05) continue;
        // The real knot: a dark core, spines that twitch, a magenta/cyan rim that will not settle.
        const twitch = Math.sin(time / 60 + m.seed) * 2 * r;
        glow(g, m.x, m.y, 30, BOTH, 0.05 * r, 3);
        g.fillStyle(dim(BOTH_DARK, 0.4), 0.9 * r); g.fillCircle(m.x, m.y, 13);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + m.seed + time / 2000;
          const len = 18 + ((i * 7) % 5) * 3 + twitch;
          g.lineStyle(2.5, i % 2 ? STATE_A : STATE_B, r);
          g.lineBetween(m.x + Math.cos(a) * 8, m.y + Math.sin(a) * 8, m.x + Math.cos(a) * len, m.y + Math.sin(a) * len);
          g.fillStyle(lit(BOTH, 0.4), r); g.fillCircle(m.x + Math.cos(a) * len, m.y + Math.sin(a) * len, 1.5);
        }
        g.fillStyle(0xffffff, 0.7 * r); g.fillCircle(m.x - 3, m.y - 3, 2.5);
      }
      // Heisen's eye over him: open, closing, shut.
      if (alive(npc)) {
        const shut = time < blinkUntil;
        const closing = blinkWarnAt >= 0;
        const ex = npc.x, ey = npc.y - 56;
        if (shut) { g.lineStyle(2, BOTH_LIT, 0.9); g.lineBetween(ex - 9, ey, ex + 9, ey); }
        else stencilEye(g, ex, ey, closing ? 5 : 7, closing ? BOTH_LIT : STATE_A, 0.6);
      }
    },

    drawHud(g, time) {
      // Heisen's blink clock.
      const x = W - 150, y = top + 10;
      const shut = time < blinkUntil;
      const k = shut ? 1 : clamp(1 - (nextBlink - time) / (ctx.hard ? BLINK_EVERY - 1400 : BLINK_EVERY), 0, 1);
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 2, y - 2, 134, 12, 5);
      g.fillStyle(shut ? BOTH_LIT : STATE_A, 0.9); g.fillRoundedRect(x, y, 130 * k, 8, 4);
    },
  };
}

export const OBSERVER_EFFECT: GimmickDef = {
  id: 'superposition-observer',
  rules: 'Spined maybes are real only where nobody looks: what you face fades, what is behind you creeps in. Heisen blinks — then his back is open too.',
  make,
};
