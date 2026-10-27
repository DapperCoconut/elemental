import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { BRASS, BRASS_DARK, DREAM, DREAM_LIT, LINEN, MOON_GOLD, WALNUT, WALNUT_LIT, dist, nightcapOn, star, zzz } from '../art';

/**
 * Lullaby — Nanny Hush at the foot of the Belfry.
 *
 * A music box sits in the middle of the yard, playing the court's lullaby. While it plays,
 * everyone in the yard grows heavy — each bar of the tune slows you a little more — and when the
 * last bar ends, everyone is put down for a moment where they stand. Then it starts again.
 *
 * The box has a brass key in its side. Walk into the key and you strike it: the box stops dead,
 * and the slow lifts. Nanny Hush cannot bear a silent nursery; she goes to the box to wind it back
 * up, and she has to stand at the key turning it for a moment to do it. She is used to her own
 * tune, too — it slows her only half as much. Left alone, the box winds itself, eventually.
 */

const BARS = 8;
const BAR_MS = 2000;
const BAR_HARD_MS = 1700;
const SLOW_PER_BAR = 0.065;
const SLOW_MIN = 0.45;
const SLEEP_MS = 1300;
const SLEEP_HUSH_MS = 600;
const KEY_R = 34;
const KEY_COOL_MS = 3500;
const WIND_MS = 1500;
const SELF_WIND_MS = 9000;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const barMs = ctx.hard ? BAR_HARD_MS : BAR_MS;
  const BOX: Pt = { x: W / 2, y: (H + top) / 2 + 10 };
  const KEY: Pt = { x: BOX.x + 46, y: BOX.y - 4 };

  let playing = true;
  let bar = 0;
  let barAt = 0;
  let stoppedAt = -9999;
  let keyCoolUntil = 0;
  let windStart = -1;
  let sleepAt = -9999;
  let announced = false;
  const notes: { at: number; seed: number }[] = [];
  const alive = (f: Fighter): boolean => f.active && f.hp > 0;

  const slow = (): number => Math.max(SLOW_MIN, 1 - bar * SLOW_PER_BAR);

  const start = (time: number, by: string): void => {
    playing = true; bar = 0; barAt = time; windStart = -1;
    ctx.sfx('crystal-chime');
    ctx.float(BOX.x, BOX.y - 70, by, '#e4d8ff');
  };

  return {
    update(time) {
      if (!announced) { announced = true; barAt = time; ctx.banner('HUSH NOW...', '#e4d8ff'); }
      if (playing) {
        if (time - barAt >= barMs) {
          barAt = time;
          bar++;
          notes.push({ at: time, seed: bar });
          ctx.sfx(bar >= BARS ? 'hush' : 'crystal-chime');
          if (bar >= BARS) {
            // The last bar: everyone is put down for a moment.
            sleepAt = time;
            for (const f of [ctx.player, ctx.npc]) if (alive(f)) ctx.stun(f, f === ctx.npc ? SLEEP_HUSH_MS : SLEEP_MS);
            ctx.banner('FAST ASLEEP', '#b89cff');
            bar = 0;
          }
        }
        // Striking the key stops it dead. (Hush would never.)
        const p = ctx.player;
        if (time >= keyCoolUntil && alive(p) && dist(p.x, p.y + 6, KEY.x, KEY.y) < KEY_R) {
          playing = false; stoppedAt = time; keyCoolUntil = time + KEY_COOL_MS; bar = 0;
          ctx.sfx('clang');
          ctx.float(KEY.x, KEY.y - 40, 'KEY STRUCK — SILENCE', '#ffe2a0');
        }
      } else {
        // Hush winds it back up — standing at the key, turning it.
        const n = ctx.npc;
        const atKey = alive(n) && dist(n.x, n.y + 6, KEY.x, KEY.y) < KEY_R + 10;
        if (atKey && windStart < 0) { windStart = time; ctx.sfx('gear-turn'); }
        if (!atKey) windStart = -1;
        if (windStart >= 0 && time - windStart >= WIND_MS) start(time, 'HUSH WINDS THE BOX');
        else if (time - stoppedAt >= SELF_WIND_MS) start(time, 'THE BOX WINDS ITSELF');
      }
      while (notes.length && time - notes[0].at > 1600) notes.shift();
    },

    playerSpeedMult: () => (playing ? slow() : 1),
    npcSpeedMult: () => (playing ? 1 - (1 - slow()) * 0.5 : 1),

    npcSeek(): Pt | null {
      if (!playing) return { x: KEY.x + 8, y: KEY.y - 4 };
      // Guard the key when you head for it.
      const p = ctx.player;
      if (dist(p.x, p.y, KEY.x, KEY.y) < 200 && ctx.scene.time.now >= keyCoolUntil) return { x: (p.x + KEY.x) / 2, y: (p.y + KEY.y) / 2 };
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      // A rug of drowsiness spreads from the box as the bars go by.
      if (playing) {
        const k = bar / BARS + ((time - barAt) / barMs) / BARS;
        g.fillStyle(DREAM, 0.05 + 0.12 * k); g.fillCircle(BOX.x, BOX.y, 120 + k * 380);
        g.lineStyle(2, DREAM_LIT, 0.15 + 0.2 * k); g.strokeCircle(BOX.x, BOX.y, 120 + k * 380);
      }
      // Each bar sends a ring of notes out across the floor.
      for (const nt of notes) {
        const k = (time - nt.at) / 1600;
        const r = 50 + k * 460;
        g.lineStyle(2, DREAM_LIT, 0.4 * (1 - k)); g.strokeCircle(BOX.x, BOX.y, r);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + nt.seed;
          const x = BOX.x + Math.cos(a) * r, y = BOX.y + Math.sin(a) * r * 0.8;
          g.fillStyle(DREAM_LIT, 0.6 * (1 - k)); g.fillEllipse(x, y, 6, 4.5);
          g.lineStyle(1.4, DREAM_LIT, 0.6 * (1 - k)); g.lineBetween(x + 3, y, x + 3, y - 10);
        }
      }
      // The key's strike ring, bright when it can be struck.
      const ready = playing && time >= keyCoolUntil;
      g.lineStyle(2, ready ? MOON_GOLD : 0x8a84a2, ready ? 0.5 + 0.3 * Math.sin(t * 6) : 0.3); g.strokeCircle(KEY.x, KEY.y + 6, KEY_R);
      g.fillStyle(0x000000, 0.3); g.fillEllipse(BOX.x, BOX.y + 24, 120, 26);
    },

    drawAir(g, time) {
      const t = time / 1000;
      const x = BOX.x, y = BOX.y;
      // The music box: a walnut casket, lid up, a little dancer in a nightcap turning on top.
      g.fillStyle(dim(WALNUT, 0.4), 1); g.fillRoundedRect(x - 42, y - 26, 84, 44, 6);
      g.fillStyle(WALNUT, 1); g.fillRoundedRect(x - 40, y - 28, 80, 42, 6);
      g.fillStyle(WALNUT_LIT, 1); g.fillRect(x - 40, y - 28, 80, 5);
      for (let i = 0; i < 5; i++) star(g, x - 30 + i * 15, y - 6, 3, BRASS, 0.9, i);
      // Lid, open, painted with a moon inside.
      g.fillStyle(WALNUT, 1); g.fillRect(x - 40, y - 74, 80, 44);
      g.fillStyle(0x2a2a52, 1); g.fillRect(x - 36, y - 70, 72, 38);
      g.fillStyle(0xfff2c8, 1); g.fillCircle(x + 14, y - 52, 9);
      g.fillStyle(0x2a2a52, 1); g.fillCircle(x + 18, y - 54, 8);
      // The turning dancer.
      const spin = playing ? t * 2.4 : 0;
      const dx = Math.sin(spin) * 6;
      g.fillStyle(LINEN, 1); g.fillEllipse(x + dx * 0.3, y - 34, 14 + Math.cos(spin) * 4, 8);
      g.fillStyle(DREAM_LIT, 1); g.fillCircle(x + dx * 0.3, y - 44, 6);
      nightcapOn(g, x + dx * 0.3, y - 46, 6, DREAM, 1, 0.6);
      // The key in its side: turning while it plays, still when struck, rattling as Hush winds.
      const winding = !playing && windStart >= 0;
      const ka = playing ? -t * 3 : winding ? t * 9 : 0;
      g.fillStyle(BRASS_DARK, 1); g.fillRect(x + 38, y - 8, 10, 6);
      for (const s of [0, Math.PI]) {
        const a = ka + s;
        g.fillStyle(BRASS, 1); g.fillEllipse(KEY.x + 4 + Math.cos(a) * 6, KEY.y - 4 + Math.sin(a) * 9, 10, 8);
      }
      g.fillStyle(lit(BRASS, 0.3), 1); g.fillCircle(KEY.x + 4, KEY.y - 4, 3);
      // Notes drifting up off the box while it plays.
      if (playing) {
        for (let i = 0; i < 3; i++) {
          const ph = (t * 0.7 + i / 3) % 1;
          const nx = x - 20 + i * 20 + Math.sin(t * 2 + i) * 8, ny = y - 80 - ph * 50;
          g.fillStyle(DREAM_LIT, 0.8 * (1 - ph)); g.fillEllipse(nx, ny, 7, 5);
          g.lineStyle(1.5, DREAM_LIT, 0.8 * (1 - ph)); g.lineBetween(nx + 3, ny, nx + 3, ny - 11); g.lineBetween(nx + 3, ny - 11, nx + 8, ny - 8);
        }
        // Bar pips round the lid.
        for (let i = 0; i < BARS; i++) {
          g.fillStyle(i < bar ? DREAM : 0x1a1430, i < bar ? 1 : 0.6);
          g.fillCircle(x - 35 + i * 10, y - 82, 3.4);
        }
      }
      if (winding) {
        const k = Math.min(1, (time - windStart) / WIND_MS);
        g.lineStyle(4, 0x1a1430, 0.7); g.beginPath(); g.arc(KEY.x + 4, KEY.y - 4, 20, -Math.PI / 2, Math.PI * 1.5, false); g.strokePath();
        g.lineStyle(4, 0xff8a6a, 0.95); g.beginPath(); g.arc(KEY.x + 4, KEY.y - 4, 20, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      // Everyone grows heavy-eyed as the tune goes on; at the last bar, nightcaps and snores.
      const sk = (time - sleepAt) / SLEEP_MS;
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f)) continue;
        if (sk >= 0 && sk < (f === ctx.npc ? SLEEP_HUSH_MS / SLEEP_MS : 1)) {
          nightcapOn(g, f.x, f.y - 26, 14, DREAM, 0.95, 0.7, Math.sin(t * 2) * 2);
          zzz(g, f.x + 16, f.y - 44, 6, t, DREAM_LIT, 1);
        } else if (playing && bar >= 3) {
          const droop = Math.min(1, bar / BARS);
          g.lineStyle(2, LINEN, 0.3 + 0.4 * droop);
          g.lineBetween(f.x - 11, f.y - 17 + droop * 2, f.x - 3, f.y - 14); g.lineBetween(f.x + 3, f.y - 14, f.x + 11, f.y - 17 + droop * 2);
        }
      }
    },
  };
}

export const LULLABY: GimmickDef = {
  id: 'slumber-lullaby',
  rules: 'The music box slows everyone more with every bar, and the last bar puts you to sleep. Walk into its key to stop it. Hush winds it back up.',
  make,
};
