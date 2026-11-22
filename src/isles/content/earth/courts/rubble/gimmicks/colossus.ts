import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, lit, type G } from '../../../../../art/IsleArt';
import { colossusHand, colossusHead } from '../art';
import { LANTERN, LIME, LIME_DARK, LIME_DEEP, LIME_LIT } from '../palette';
import { alive, clamp, dist, shoveOut, stepDt, turnToward } from '../util';

/**
 * Colossus — Sculptor Pell.
 *
 * The Old King's colossus lies where the Regent pulled it down, its great stone head on its cheek
 * in the yard and one hand fallen palm-up by the wall. The head is not quite dead. Strike it — a
 * shot, a swing, a blast — and its eyes open on *you*: it glares a beam of light along the
 * ground that turns, slowly, to follow whoever last struck it, burning anyone it crosses.
 * Meanwhile the fallen hand rises and slaps down on the other fighter's shadow.
 *
 * Pell carved half the colossus's curls as an apprentice and still talks to it. Every so often he
 * whispers in its ear and its gaze swings onto you. Strike the brow and take the gaze back, then
 * walk so that he stands between you and the eyes: the beam follows you through him.
 */

const HEAD_R = 72;
/** The head's strike body sits a little up its brow; the bot stands this far out to strike it. */
const HEAD_UP = 20;
const STAND_R = HEAD_R + 18;
/** One fighter's blows on the head count once per this long (a flurry is one strike). */
const STRIKE_CD = 1400;
const KINDLE_MS = 1100;
const GLARE_MS = 6500;
const SLEEP_MS = 2600;
const BEAM_HALF = 18;

interface Slap { x: number; y: number; at: number; hitAt: number; dealt: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const head: Pt = { x: W / 2, y: top + 140 };
  const eye: Pt = { x: head.x - 16, y: head.y - 70 };
  const handHome: Pt = { x: 150, y: H - 70 };
  const turnRate = ctx.hard ? 0.62 : 0.5;
  let target: Fighter | null = null;
  let wakeAt = -9999;
  let sleepUntil = 0;
  let beamA = Math.PI / 2;
  let tickAt = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const lastStrike = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  const whisperEvery = ctx.hard ? 7600 : 9600;
  let nextWhisper = 0;
  let whisperAt = -9999;
  const slapEvery = ctx.hard ? 5000 : 6200;
  let nextSlap = 0;
  let slap: Slap | null = null;
  let started = false;

  const awake = (time: number) => target !== null && time >= wakeAt + KINDLE_MS && time < wakeAt + KINDLE_MS + GLARE_MS;
  const kindling = (time: number) => target !== null && time >= wakeAt && time < wakeAt + KINDLE_MS;
  const inBeam = (f: Fighter) => {
    const dx = f.x - eye.x, dy = f.y - eye.y;
    const along = dx * Math.cos(beamA) + dy * Math.sin(beamA);
    if (along < 30) return false;
    return Math.abs(-dx * Math.sin(beamA) + dy * Math.cos(beamA)) < BEAM_HALF + 14;
  };

  function wake(f: Fighter, time: number, why: string): void {
    const fresh = target === null || time >= wakeAt + KINDLE_MS + GLARE_MS;
    target = f;
    // Already burning: it only blinks before turning its glare on the new face.
    wakeAt = fresh ? time : time - KINDLE_MS + 500;
    if (fresh) beamA = Math.atan2(f.y - eye.y, f.x - eye.x) + (rng() < 0.5 ? 0.9 : -0.9);
    ctx.float(head.x, head.y - 110, why, '#fff0b0');
    ctx.sfx('beam-charge');
  }

  const brow = ctx.target({
    x: head.x, y: head.y - HEAD_UP, r: HEAD_R,
    onStruck: (by) => {
      const f = by === 'player' ? player : npc;
      const time = ctx.scene.time.now;
      if (!alive(f) || time - (lastStrike.get(f) ?? -9999) < STRIKE_CD) return;
      lastStrike.set(f, time);
      if (target !== f || !awake(time)) wake(f, time, f === player ? 'ITS EYES OPEN ON YOU' : 'ITS EYES OPEN ON PELL');
    },
  });

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextWhisper = time + 4500; nextSlap = time + 3000; sleepUntil = time + 1800; }
      // The head is stone: nobody walks through it.
      for (const f of [player, npc]) if (alive(f)) shoveOut(f, head, HEAD_R + 10, (ff, dx, dy) => ctx.nudge(ff, dx, dy));
      // Pell's whisper: the gaze swings onto you.
      if (time >= nextWhisper && alive(npc) && alive(player)) {
        nextWhisper = time + whisperEvery;
        if (target !== player || !awake(time)) {
          whisperAt = time;
          wake(player, time, 'PELL WHISPERS');
          ctx.banner('PELL WHISPERS TO THE COLOSSUS', '#fff0b0');
        }
      }
      // Glare done: the eyes close a while; then, if no one wakes it, it opens on the nearer face.
      if (target && time >= wakeAt + KINDLE_MS + GLARE_MS) { target = null; sleepUntil = time + SLEEP_MS; ctx.sfx('stone-rise'); }
      if (!target && time >= sleepUntil) {
        const near = dist(player.x, player.y, head.x, head.y) < dist(npc.x, npc.y, head.x, head.y) ? player : npc;
        if (alive(near)) wake(near, time, 'THE COLOSSUS STIRS');
      }
      // The beam turns toward its target and burns whoever it crosses.
      if (target && alive(target) && (awake(time) || kindling(time))) {
        beamA = turnToward(beamA, Math.atan2(target.y - eye.y, target.x - eye.x), turnRate * dt * (kindling(time) ? 1.6 : 1));
      }
      if (awake(time)) {
        for (const f of [player, npc]) {
          if (!alive(f) || !inBeam(f) || time < (tickAt.get(f) ?? 0)) continue;
          tickAt.set(f, time + 450);
          ctx.hit(f, ctx.hard ? 10 : 8, f.x, f.y);
          ctx.sfx('sizzle');
        }
      }
      // The fallen hand slaps down on the shadow of whoever the eyes are not on.
      if (!slap && time >= nextSlap) {
        nextSlap = time + slapEvery;
        const victim = target === player ? npc : target === npc ? player : rng() < 0.6 ? player : npc;
        if (alive(victim)) {
          slap = { x: victim.x, y: victim.y, at: time, hitAt: time + 1200, dealt: false };
          ctx.sfx('whoosh');
        }
      }
      if (slap && !slap.dealt && time >= slap.hitAt) {
        slap.dealt = true;
        ctx.sfx('gravity-slam');
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, slap.x, slap.y) > 70) continue;
          ctx.hit(f, ctx.hard ? 17 : 14, f.x, f.y);
          ctx.stun(f, 500);
          ctx.float(f.x, f.y - 40, 'SLAPPED', '#e6d2a8');
        }
      }
      if (slap && time > slap.hitAt + 900) slap = null;
      void tickAt;
    },

    destroy() { brow.remove(); },

    npcSeek() {
      const time = ctx.scene.time.now;
      // Watched himself: walk so you are between him and the eyes — the beam follows him through you.
      if (target === npc && (awake(time) || kindling(time))) {
        const a = Math.atan2(player.y - eye.y, player.x - eye.x);
        const d = dist(player.x, player.y, eye.x, eye.y) + 170;
        return { x: clamp(eye.x + Math.cos(a) * d, 60, W - 60), y: clamp(eye.y + Math.sin(a) * d, top + 50, H - 40) };
      }
      // You are watched: stand well off the beam, at range.
      if (target === player) {
        const perp = beamA + (Math.sin(time / 2000) > 0 ? Math.PI / 2 : -Math.PI / 2);
        return { x: clamp(player.x + Math.cos(perp) * 220, 60, W - 60), y: clamp(player.y + Math.sin(perp) * 180, top + 50, H - 40) };
      }
      // Asleep: go and strike it before you do — then lead the beam.
      if (time - (lastStrike.get(npc) ?? 0) > 5000 && dist(player.x, player.y, head.x, head.y) > 200) {
        return { x: head.x + (npc.x < head.x ? -1 : 1) * STAND_R, y: head.y + 30 };
      }
      return { x: clamp(player.x + (player.x < W / 2 ? 220 : -220), 60, W - 60), y: clamp(player.y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The fallen hand at rest by the wall, or its shadow swelling over a fighter.
      if (!slap || slap.dealt) colossusHand(g, handHome.x, handHome.y, 0.55, rng, false);
      else { g.fillStyle(LIME_DEEP, 0.4); g.fillEllipse(handHome.x, handHome.y - 6, 80, 24); }
      if (slap) {
        if (!slap.dealt) {
          const k = clamp((time - slap.at) / (slap.hitAt - slap.at), 0, 1);
          // The hand's shadow: palm and four fingers, darkening as it comes down.
          g.fillStyle(0x000000, 0.12 + k * 0.32);
          g.fillEllipse(slap.x, slap.y, 90 * (0.6 + k * 0.4), 60 * (0.6 + k * 0.4));
          for (let i = 0; i < 4; i++) g.fillEllipse(slap.x + 40 * (0.6 + k * 0.4), slap.y - 30 + i * 18, 44 * (0.6 + k * 0.4), 14);
          g.lineStyle(2, 0xffd0a0, 0.3 + k * 0.5); g.strokeCircle(slap.x, slap.y, 70);
        } else {
          // Down: the hand lies on the floor a moment, dust ringing out.
          const k = clamp((time - slap.hitAt) / 900, 0, 1);
          colossusHand(g, slap.x + 20, slap.y + 24, 0.55, rng, false);
          g.lineStyle(3, LIME_LIT, 0.6 * (1 - k)); g.strokeCircle(slap.x, slap.y, 70 + k * 60);
        }
      }
      // The beam's scorch along the floor.
      const show = awake(time) || kindling(time);
      if (show) {
        const len = 1200;
        const ex = eye.x + Math.cos(beamA) * len, ey = eye.y + Math.sin(beamA) * len;
        if (kindling(time)) {
          const k = clamp((time - wakeAt) / KINDLE_MS, 0, 1);
          g.lineStyle(2, LANTERN, 0.2 + k * 0.5); g.lineBetween(eye.x, eye.y, ex, ey);
        } else {
          g.lineStyle(BEAM_HALF * 2 + 10, LANTERN, 0.12); g.lineBetween(eye.x, eye.y, ex, ey);
          g.lineStyle(BEAM_HALF * 2, lit(LANTERN, 0.3), 0.35); g.lineBetween(eye.x, eye.y, ex, ey);
          g.lineStyle(6, 0xffffff, 0.7); g.lineBetween(eye.x, eye.y, ex, ey);
          for (let i = 0; i < 8; i++) {
            const d = 80 + ((time / 3 + i * 97) % 700);
            g.fillStyle(0xffffff, 0.6); g.fillCircle(eye.x + Math.cos(beamA) * d, eye.y + Math.sin(beamA) * d, 2);
          }
        }
      }
      // Who it watches.
      if (target && alive(target)) { g.lineStyle(2, LANTERN, 0.5 + Math.sin(time / 100) * 0.2); g.strokeEllipse(target.x, target.y + 8, 50, 18); }
    },

    drawAir(g, time) {
      // The head itself, eyes kindling or blazing.
      const eyes = kindling(time) ? clamp((time - wakeAt) / KINDLE_MS, 0, 1) * 0.7 : awake(time) ? 1 : 0;
      colossusHead(g, head.x, head.y + 52, 0.66, eyes, beamA);
      if (eyes > 0) glow(g, eye.x, eye.y, 30, LANTERN, 0.05 * eyes, 3);
      // Pell's whisper: words curling toward its ear.
      if (time - whisperAt < 1400 && alive(npc)) {
        const k = (time - whisperAt) / 1400;
        for (let i = 0; i < 5; i++) {
          const t = clamp(k * 1.4 - i * 0.12, 0, 1);
          const x = npc.x + (head.x + 50 - npc.x) * t, y = npc.y - 40 + (head.y - 30 - npc.y + 40) * t - Math.sin(t * Math.PI) * 40;
          g.fillStyle(0xfff0b0, 0.7 * (1 - t)); g.fillCircle(x, y, 3);
        }
      }
      // The hand in the air while it comes down.
      if (slap && !slap.dealt) {
        const k = clamp((time - slap.at) / (slap.hitAt - slap.at), 0, 1);
        const hx = handHome.x + (slap.x - handHome.x) * Math.min(1, k * 1.5), hy = handHome.y + (slap.y - handHome.y) * Math.min(1, k * 1.5) - (1 - k) * 160;
        drawHandAloft(g, hx, hy, 0.5 + k * 0.1);
      }
    },
  };
}

/** The fallen hand, risen: seen from below as it comes down — palm, the bronze ring, fingers spread. */
function drawHandAloft(g: G, x: number, y: number, s: number): void {
  g.fillStyle(LIME_DARK, 1); g.fillEllipse(x, y, 110 * s, 80 * s);
  g.fillStyle(LIME, 1); g.fillEllipse(x - 4 * s, y - 4 * s, 100 * s, 70 * s);
  for (let i = 0; i < 4; i++) {
    const fy = y - 40 * s + i * 24 * s;
    g.fillStyle(LIME_DARK, 1); g.fillRoundedRect(x + 30 * s, fy - 9 * s, 70 * s, 18 * s, 8 * s);
    g.fillStyle(LIME, 1); g.fillRoundedRect(x + 30 * s, fy - 10 * s, 66 * s, 15 * s, 7 * s);
  }
  g.fillStyle(LIME_DARK, 1); g.fillEllipse(x - 40 * s, y - 40 * s, 40 * s, 24 * s);
  g.fillStyle(LIME_LIT, 0.5); g.fillEllipse(x - 14 * s, y - 16 * s, 40 * s, 18 * s);
}

export const COLOSSUS: GimmickDef = {
  id: 'rubble-colossus',
  rules: 'Strike the colossus\'s head and its eyes open on you: a beam turns to follow whoever last struck it, burning all it crosses. Its hand slaps the other\'s shadow. Pell whispers it onto you.',
  make,
};
