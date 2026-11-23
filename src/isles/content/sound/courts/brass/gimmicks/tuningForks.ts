import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget, Striker } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { note, tuningFork } from '../art';
import { CREAM, PITCH_HIGH, PITCH_LOW, PITCH_MID } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Tuning Forks — Tuner Pitch.
 *
 * Nine tall forks stand in the floor on sounding-boxes, banded in three pitches: low (copper),
 * middle (gold) and high (blue), three of each, spread so no two of a pitch stand together.
 * Strike a fork and every fork of its pitch hums in sympathy: their tines blur, a ring is
 * marked round each, and then each throws out a ring of sound that hurts whoever is near it —
 * except the one who struck. Pitch the Tuner sings his forks into humming too, choosing the
 * pitch you stand nearest.
 *
 * The forks don't care who strikes them. Strike the fork beside you to ring the one across
 * the room that he is standing at.
 */

const RING_R = 118;
const HUM_DMG = 12;
const EXTRA_DMG = 4;
const PITCH_NAMES = ['LOW', 'MIDDLE', 'HIGH'];
const PITCH_COLORS = [PITCH_LOW, PITCH_MID, PITCH_HIGH];

interface Fork { x: number; y: number; pitch: number; target: StrikeTarget; struckAt: number }
interface Pitch { humAt: number; striker: Striker | null; releaseAt: number; coolUntil: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const HUM = ctx.hard ? 540 : 680;
  const COOL = 2600;
  const singEvery = ctx.hard ? 5600 : 7200;
  const pitches: Pitch[] = [0, 1, 2].map(() => ({ humAt: -1, striker: null, releaseAt: -9999, coolUntil: 0 }));
  const forks: Fork[] = [];
  const cols = [W * 0.2, W * 0.5, W * 0.8];
  const rows = [top + 110, (top + H) / 2 + 20, H - 70];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const x = cols[j] + (i === 1 ? (j - 1) * 24 : 0), y = rows[i];
      const f: Fork = { x, y, pitch: (i + j) % 3, target: null as unknown as StrikeTarget, struckAt: -9999 };
      f.target = ctx.target({ x, y: y - 40, r: 24, passThrough: true, onStruck(by) { strike(f, by, ctx.scene.time.now); } });
      forks.push(f);
    }
  }
  let nextSing = 0;
  let lastNpcStrike = -9999;
  let started = false;

  function strike(f: Fork, by: Striker, time: number): void {
    const p = pitches[f.pitch];
    f.struckAt = time;
    if (p.humAt >= 0 || time < p.coolUntil) return;
    p.humAt = time;
    p.striker = by;
    if (by === 'npc') lastNpcStrike = time;
    ctx.float(f.x, f.y - 100, `${PITCH_NAMES[f.pitch]} — HMMMM`, by === 'player' ? '#9ad0ff' : '#ffb08a');
    ctx.sfx('crystal-chime');
  }

  function release(pi: number, time: number): void {
    const p = pitches[pi];
    const by = p.striker;
    p.humAt = -1;
    p.releaseAt = time;
    p.coolUntil = time + COOL;
    ctx.sfx('sonic-pulse');
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      if ((by === 'player' && f === player) || (by === 'npc' && f === npc)) continue;
      const near = forks.filter((k) => k.pitch === pi && dist(k.x, k.y - 10, f.x, f.y) < RING_R).length;
      if (!near) continue;
      ctx.hit(f, HUM_DMG + (near - 1) * EXTRA_DMG, f.x, f.y);
      ctx.float(f.x, f.y - 46, near > 1 ? 'IN SYMPATHY' : 'RUNG', '#e8f4ff');
    }
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextSing = time + 3200; ctx.banner('STRIKE A FORK — ITS PITCH ANSWERS', '#e8f4ff'); }
      for (let i = 0; i < 3; i++) if (pitches[i].humAt >= 0 && time >= pitches[i].humAt + HUM) release(i, time);
      // Pitch sings the pitch you stand nearest into humming, if he hasn't rung one lately.
      if (time >= nextSing) {
        nextSing = time + singEvery;
        if (alive(npc) && alive(player) && time - lastNpcStrike > 2500) {
          let bi = -1, bd = Infinity;
          for (const f of forks) {
            const d = dist(f.x, f.y, player.x, player.y);
            if (d < bd && pitches[f.pitch].humAt < 0 && time >= pitches[f.pitch].coolUntil) { bd = d; bi = f.pitch; }
          }
          const f = forks.find((k) => k.pitch === bi);
          if (f) {
            ctx.banner(`PITCH SINGS THE ${PITCH_NAMES[bi]} NOTE`, '#ffd0a8');
            strike(f, 'npc', time);
          }
        }
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const now = ctx.scene.time.now;
      // Out of the ring of any fork the player set humming.
      for (let i = 0; i < 3; i++) {
        const p = pitches[i];
        if (p.humAt < 0 || p.striker === 'npc') continue;
        for (const f of forks) {
          if (f.pitch !== i || dist(f.x, f.y, npc.x, npc.y) > RING_R + 30) continue;
          const a = Math.atan2(npc.y - f.y, npc.x - f.x);
          return { x: clamp(f.x + Math.cos(a) * (RING_R + 80), 60, W - 60), y: clamp(f.y + Math.sin(a) * (RING_R + 80), top + 50, H - 40) };
        }
      }
      // Stand at a fork whose pitch has a sister near you, and far from you itself.
      let best: Fork | null = null;
      let bs = -Infinity;
      for (const f of forks) {
        const p = pitches[f.pitch];
        if (p.humAt >= 0 || now < p.coolUntil) continue;
        const sister = forks.reduce((m, k) => (k !== f && k.pitch === f.pitch ? Math.min(m, dist(k.x, k.y, player.x, player.y)) : m), Infinity);
        const s = -sister + dist(f.x, f.y, player.x, player.y) * 0.4 - dist(f.x, f.y, npc.x, npc.y) * 0.3;
        if (s > bs) { bs = s; best = f; }
      }
      if (best) return { x: best.x + (best.x < W / 2 ? 42 : -42), y: best.y + 14 };
      return { x: clamp(player.x + 220, 60, W - 60), y: clamp(player.y, top + 60, H - 50) };
    },

    drawGround(g, time) {
      for (const f of forks) {
        const p = pitches[f.pitch];
        const c = PITCH_COLORS[f.pitch];
        // The pitch-coloured base mark under each fork.
        g.fillStyle(dim(c, 0.5), 0.35); g.fillEllipse(f.x, f.y + 2, 60, 18);
        if (p.humAt >= 0) {
          // The ring's reach, closing in as the hum builds.
          const k = clamp((time - p.humAt) / HUM, 0, 1);
          g.fillStyle(c, 0.06 + k * 0.1); g.fillCircle(f.x, f.y - 10, RING_R);
          g.lineStyle(2 + k * 2, c, 0.4 + k * 0.5); g.strokeCircle(f.x, f.y - 10, RING_R);
          g.lineStyle(1.5, lit(c, 0.5), 0.6); g.strokeCircle(f.x, f.y - 10, RING_R * (1 - k) + 14);
        }
        const rk = (time - p.releaseAt) / 360;
        if (rk >= 0 && rk < 1) {
          for (let w = 0; w < 3; w++) {
            const r = RING_R * clamp(rk * 1.2 - w * 0.15, 0, 1);
            if (r <= 4) continue;
            g.lineStyle(6 - w * 1.5, lit(c, 0.3), (1 - rk) * (0.9 - w * 0.25)); g.strokeCircle(f.x, f.y - 10, r);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const f of forks) {
        const p = pitches[f.pitch];
        const humK = p.humAt >= 0 ? clamp((time - p.humAt) / HUM, 0.25, 1) : time - f.struckAt < 250 ? 0.5 : 0;
        tuningFork(g, f.x, f.y, 0.82, PITCH_COLORS[f.pitch], humK, time);
        if (p.humAt >= 0) {
          // Notes lifting off the tines.
          for (let i = 0; i < 2; i++) {
            const ph = ((time - p.humAt) / 700 + i * 0.5) % 1;
            note(g, f.x + (i ? 14 : -14) + Math.sin(ph * 6) * 4, f.y - 74 - ph * 30, 3.2, PITCH_COLORS[f.pitch], 'crotchet', 1 - ph);
          }
        }
      }
    },

    drawHud(g, time) {
      // Three pitch pips: lit when ready, ringing when humming, an arc while they rest.
      const cx = W / 2, y = top + 14;
      for (let i = 0; i < 3; i++) {
        const x = cx - 40 + i * 40;
        const p = pitches[i];
        g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 10);
        const ready = p.humAt < 0 && time >= p.coolUntil;
        g.fillStyle(PITCH_COLORS[i], ready ? 1 : 0.35); g.fillCircle(x, y, 7);
        if (p.humAt >= 0) { g.lineStyle(2, CREAM, 0.6 + Math.sin(time / 40) * 0.3); g.strokeCircle(x, y, 10); }
        else if (!ready) {
          const k = 1 - (p.coolUntil - time) / COOL;
          g.lineStyle(2, CREAM, 0.7); g.beginPath(); g.arc(x, y, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
      }
    },

    destroy() { for (const f of forks) f.target.remove(); },
  };
}

export const TUNING_FORKS: GimmickDef = {
  id: 'brass-tuning-forks',
  rules: 'Strike a fork and every fork of its pitch hums, then rings out — hurting whoever stands near one, except the striker. Pitch sings the pitch nearest you.',
  make,
};
