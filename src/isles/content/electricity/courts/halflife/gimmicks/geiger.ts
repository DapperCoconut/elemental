import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { trefoil } from '../art';
import { AMBER, AMBER_DARK, AMBER_LIT, GLOW, GLOW_LIT, HAZARD_BLACK, LEAD_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Geiger Counter — Counter Click.
 *
 * Hot spots lie hidden in the yard floor: patches where the ore runs close under the slag. You
 * cannot see them. You can *hear* them — a Geiger counter rides on your hip, and its clicking
 * quickens and its needle climbs the nearer you come to one. Stand on one and it burns you, and
 * shows itself for a moment.
 *
 * Counter Click knows the floor by ear and never steps on a spot — but he cannot walk quietly:
 * every step he takes rings the slag round his boots, and a hot spot within the ring glows up
 * where you can see it. Follow where he does not tread. Every so often he sounds his great
 * counter: a wave of clicking rolls across the yard, and every spot it passes flares up
 * white-hot for a moment — anyone standing on one then is badly burnt, Click included, if you
 * have herded him on to one.
 */

const SPOT_R = 42;
const TICK_MS = 450;
const BURN = 4;
const FLARE_BURN = 9;
const FLARE_MS = 1600;
const STEP_R = 130;
const WAVE_SPEED = 430;

interface Spot { x: number; y: number; seenUntil: number; softUntil: number; flareUntil: number; fadeAt: number; bornAt: number }
interface Ring { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const N = ctx.hard ? 9 : 7;
  const soundEvery = ctx.hard ? 7200 : 9000;
  const SOUND_WARN = 1100;
  const spots: Spot[] = [];
  const steps: Ring[] = [];
  const nextTick = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let lastNpc: Pt = { x: npc.x, y: npc.y };
  let stepAcc = 0;
  let nextSound = 0;
  let soundWarnAt = -1;
  let wave: Ring | null = null;
  let nextShift = 0;
  let clickAcc = 0;
  let lastClickSfx = 0;
  let started = false;
  /** Click marks round your hip for the count — position, age. */
  const pips: { a: number; at: number }[] = [];

  const free = (x: number, y: number) =>
    spots.every((s) => dist(s.x, s.y, x, y) > 120) && dist(x, y, player.x, player.y) > 120 && dist(x, y, npc.x, npc.y) > 90;

  function placeSpot(time: number): void {
    for (let tries = 0; tries < 30; tries++) {
      const x = 80 + rng() * (W - 160), y = top + 60 + rng() * (H - top - 110);
      if (!free(x, y)) continue;
      spots.push({ x, y, seenUntil: 0, softUntil: 0, flareUntil: 0, fadeAt: 0, bornAt: time });
      return;
    }
  }

  const onSpot = (f: Fighter) => spots.find((s) => s.fadeAt === 0 && dist(s.x, s.y, f.x, f.y) < SPOT_R);
  /** 0..1: how fast your counter is clicking. */
  const rate = (f: Fighter) => spots.reduce((m, s) => (s.fadeAt ? m : Math.max(m, (1 - clamp((dist(s.x, s.y, f.x, f.y) - SPOT_R * 0.5) / 260, 0, 1)) ** 2)), 0);

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        for (let i = 0; i < N; i++) placeSpot(time);
        nextSound = time + soundEvery;
        nextShift = time + 14000;
        lastNpc = { x: npc.x, y: npc.y };
      }
      // Old spots cool and new ones come up elsewhere.
      if (time >= nextShift) {
        nextShift = time + 14000;
        const old = spots.filter((s) => s.fadeAt === 0).sort((a, b) => a.bornAt - b.bornAt).slice(0, 2);
        for (const s of old) s.fadeAt = time;
        for (let i = 0; i < old.length; i++) placeSpot(time);
      }
      for (let i = spots.length - 1; i >= 0; i--) if (spots[i].fadeAt && time - spots[i].fadeAt > 900) spots.splice(i, 1);

      // Click's footsteps ring the floor.
      if (alive(npc)) {
        stepAcc += dist(lastNpc.x, lastNpc.y, npc.x, npc.y);
        lastNpc = { x: npc.x, y: npc.y };
        if (stepAcc > 55) {
          stepAcc = 0;
          steps.push({ x: npc.x, y: npc.y + 14, at: time });
          for (const s of spots) if (dist(s.x, s.y, npc.x, npc.y) < STEP_R + SPOT_R) s.softUntil = time + 2600;
        }
      }
      for (let i = steps.length - 1; i >= 0; i--) if (time - steps[i].at > 600) steps.splice(i, 1);

      // The counter's sounding.
      if (soundWarnAt < 0 && time >= nextSound - SOUND_WARN) {
        soundWarnAt = time;
        ctx.banner('CLICK SOUNDS HIS COUNTER', '#ffe08a');
        tk.sfx('beam-charge');
      }
      if (time >= nextSound) {
        nextSound = time + soundEvery;
        soundWarnAt = -1;
        wave = { x: npc.x, y: npc.y, at: time };
        tk.sfx('sonic-pulse');
      }
      if (wave) {
        const R = ((time - wave.at) / 1000) * WAVE_SPEED;
        for (const s of spots) {
          const d = dist(s.x, s.y, wave.x, wave.y);
          if (s.fadeAt === 0 && s.flareUntil < time && d < R && d > R - WAVE_SPEED * dt - 4) {
            s.flareUntil = time + FLARE_MS;
            s.seenUntil = time + FLARE_MS;
            for (const f of [player, npc]) {
              if (!alive(f) || dist(s.x, s.y, f.x, f.y) >= SPOT_R) continue;
              if (f === player) tk.hitPlayer(FLARE_BURN, f.x, f.y); else ctx.hit(f, FLARE_BURN, f.x, f.y);
              ctx.float(f.x, f.y - 46, 'FLARE!', '#ffffff');
            }
          }
        }
        if (R > Math.hypot(W, H)) wave = null;
      }

      // Standing on a spot burns, and shows it.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const s = onSpot(f);
        if (!s) continue;
        s.seenUntil = Math.max(s.seenUntil, time + 2000);
        if (time < (nextTick.get(f) ?? 0)) continue;
        nextTick.set(f, time + TICK_MS);
        const n = time < s.flareUntil ? BURN * 2 : BURN;
        if (f === player) tk.hitPlayer(n, f.x, f.y); else ctx.hit(f, n, f.x, f.y);
        if (f === npc) ctx.float(f.x, f.y - 46, 'HOT!', '#7dff5a');
      }

      // Your counter: clicks at a rate set by the nearest spot.
      if (alive(player)) {
        const r = rate(player);
        clickAcc += dt * (1.5 + r * 22);
        while (clickAcc >= 1) {
          clickAcc -= 1;
          pips.push({ a: rng() * Math.PI * 2, at: time });
          if (r > 0.25 && time - lastClickSfx > 240 - r * 120) { lastClickSfx = time; ctx.sfx('clock-tick'); }
        }
      }
      for (let i = pips.length - 1; i >= 0; i--) if (time - pips[i].at > 260) pips.splice(i, 1);
      if (pips.length > 40) pips.splice(0, pips.length - 40);
    },

    npcSeek() {
      // Keep his distance, and never put a boot on a spot — unless you are standing on one, in
      // which case he comes close to keep you there.
      const onIt = onSpot(player);
      const want = onIt ? 140 : 240;
      let best: Pt | null = null;
      let bs = -Infinity;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const x = clamp(player.x + Math.cos(a) * want, 60, W - 60), y = clamp(player.y + Math.sin(a) * want * 0.9, top + 50, H - 40);
        const margin = spots.reduce((m, s) => (s.fadeAt ? m : Math.min(m, dist(s.x, s.y, x, y) - SPOT_R - 20)), 200);
        const sc = (margin < 0 ? -500 : Math.min(margin, 80)) - dist(x, y, npc.x, npc.y) * 0.25;
        if (sc > bs) { bs = sc; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      // The yard's slag: faint hatched seams the eye can't read.
      for (const s of spots) {
        const fade = s.fadeAt ? clamp(1 - (time - s.fadeAt) / 900, 0, 1) : 1;
        const seen = time < s.seenUntil, soft = time < s.softUntil, flare = time < s.flareUntil;
        if (!seen && !soft && !flare && !s.fadeAt) continue;
        const a = (flare ? 0.55 : seen ? 0.38 : s.fadeAt ? 0.25 : 0.16) * fade;
        g.fillStyle(flare ? GLOW_LIT : GLOW, a); g.fillCircle(s.x, s.y, SPOT_R);
        g.fillStyle(GLOW_LIT, a * 0.8); g.fillCircle(s.x, s.y, SPOT_R * 0.4);
        g.lineStyle(flare ? 3 : 1.5, flare ? 0xffffff : GLOW, a * 1.6); g.strokeCircle(s.x, s.y, SPOT_R);
        if (seen || flare) trefoil(g, s.x, s.y, 12, HAZARD_BLACK, undefined, a);
        if (flare) glow(g, s.x, s.y, SPOT_R * 1.6, GLOW_LIT, 0.06, 3);
      }
      // Click's footsteps: small rings of sound in the slag.
      for (const r of steps) {
        const k = (time - r.at) / 600;
        g.lineStyle(1.5, AMBER_LIT, 0.4 * (1 - k)); g.strokeEllipse(r.x, r.y, STEP_R * 2 * k, STEP_R * 1.4 * k);
      }
      // The sounding: the warning hum round him, then the wave.
      if (soundWarnAt >= 0 && alive(npc)) {
        const k = clamp((time - soundWarnAt) / SOUND_WARN, 0, 1);
        for (let i = 0; i < 3; i++) { g.lineStyle(2, AMBER, (0.2 + k * 0.5) * (1 - i * 0.25)); g.strokeCircle(npc.x, npc.y, 30 + i * 14 + k * 20); }
      }
      if (wave) {
        const R = ((time - wave.at) / 1000) * WAVE_SPEED;
        g.lineStyle(10, AMBER, 0.18); g.strokeCircle(wave.x, wave.y, R);
        g.lineStyle(2, AMBER_LIT, 0.6); g.strokeCircle(wave.x, wave.y, R);
        // Ticks riding the wavefront.
        for (let i = 0; i < 40; i++) {
          const a = (i / 40) * Math.PI * 2 + (time / 400);
          g.lineStyle(2, AMBER_LIT, 0.6);
          g.lineBetween(wave.x + Math.cos(a) * (R - 6), wave.y + Math.sin(a) * (R - 6), wave.x + Math.cos(a) * (R + 6), wave.y + Math.sin(a) * (R + 6));
        }
      }
    },

    drawAir(g, time) {
      // The counter on your hip: the clicks as little sparks of sound round you.
      if (!alive(player)) return;
      for (const p of pips) {
        const k = (time - p.at) / 260;
        const r = 28 + k * 16;
        g.lineStyle(1.5, AMBER_LIT, 0.8 * (1 - k));
        g.lineBetween(player.x + Math.cos(p.a) * r, player.y - 10 + Math.sin(p.a) * r, player.x + Math.cos(p.a) * (r + 6), player.y - 10 + Math.sin(p.a) * (r + 6));
      }
    },

    drawHud(g, time) {
      // A Geiger counter, bottom left: a brass box, a dial, a needle twitching up to the reading.
      const x = 26, y = H - 70;
      const r = alive(player) ? rate(player) : 0;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 6, y - 6, 132, 60, 8);
      g.fillStyle(LEAD_DARK, 1); g.fillRoundedRect(x, y, 120, 48, 6);
      g.fillStyle(AMBER_DARK, 1); g.fillRoundedRect(x + 6, y + 6, 70, 36, 4);
      g.fillStyle(0xf0e8d0, 1); g.slice(x + 41, y + 38, 30, Math.PI, 0, false); g.fillPath();
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        g.lineStyle(1, i > 5 ? 0xd83a2a : HAZARD_BLACK, 1);
        g.lineBetween(x + 41 + Math.cos(a) * 22, y + 38 + Math.sin(a) * 22, x + 41 + Math.cos(a) * 28, y + 38 + Math.sin(a) * 28);
      }
      const jitter = Math.sin(time / 23) * 0.04 * (0.3 + r);
      const na = Math.PI + clamp(r + jitter, 0, 1) * Math.PI;
      g.lineStyle(2, 0xd83a2a, 1); g.lineBetween(x + 41, y + 38, x + 41 + Math.cos(na) * 26, y + 38 + Math.sin(na) * 26);
      g.fillStyle(HAZARD_BLACK, 1); g.fillCircle(x + 41, y + 38, 3);
      // The wand on its curly cord, and the lamp that blinks with every click.
      g.fillStyle(LEAD_DARK, 1); g.fillRoundedRect(x + 86, y + 10, 26, 10, 4);
      const lit = pips.length > 0 && time - pips[pips.length - 1].at < 60;
      g.fillStyle(lit ? GLOW_LIT : GLOW, lit ? 1 : 0.3); g.fillCircle(x + 99, y + 34, 6);
    },
  };
}

export const GEIGER: GimmickDef = {
  id: 'halflife-geiger',
  rules: 'Hidden hot spots burn whoever stands on them. Your counter clicks faster near one; Click\'s footsteps light them up. When he sounds his counter, every spot flares.',
  make,
};
