import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { MOON, MOON_DIM, STONE, STONE_DARK, STONE_LIT } from '../palette';
import { alive, clamp, dist, wrapAngle } from '../util';

/**
 * Sundown — Sundialer Gnomon.
 *
 * Gnomon keeps the only sundial in Umbral that has a sun: a lamp of white glass hung over its
 * blade, lit once a year for the Prince's birthday and lit today for you. The blade's shadow
 * sweeps the yard like a clock-hand. Inside its wedge it is night, and night here is *cold* —
 * anyone in it is chilled: slowed, and every blow lands harder on them.
 *
 * Round the dial run twelve hour-marks. One of them is always lit: the hour that is coming. Stand
 * on it and the dial stops — the hand held where it lies for a few seconds. Gnomon knows the trick
 * and uses it to pin the wedge on you. Use it to pin the wedge on him.
 */

const HALF = 0.3;
const MARK_R = 30;
const HOLD_MS = 500;
const CHILL_SPEED = 0.7;
const CHILL_TAKEN = 1.35;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const cx = W / 2, cy = top + (H - top) / 2 + 10;
  const RX = 330, RY = 215;
  const SPEED = ctx.hard ? 0.62 : 0.46;
  const STOP_MS = ctx.hard ? 3000 : 4000;
  let hand = -Math.PI / 2;
  let stoppedUntil = 0;
  /** The lit hour-mark: index into 12. */
  let mark = 3;
  let onMarkSince = new Map<Fighter, number>([[player, -1], [npc, -1]]);
  let markUsedAt = -9999;
  let lastPass = 0;

  const markPt = (i: number): Pt => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * RX, y: cy + Math.sin(a) * RY };
  };
  /** The wedge, in the floor's squashed frame: compare angles after un-squashing y. */
  const inWedge = (x: number, y: number) => {
    const a = Math.atan2((y - cy) * (RX / RY), x - cx);
    return Math.abs(wrapAngle(a - hand)) < HALF && dist(x, y, cx, cy) > 26;
  };
  /** The next hour the hand will reach, a quarter-turn ahead. */
  const nextMark = () => {
    let i = Math.round(((hand + Math.PI / 2) / (Math.PI * 2)) * 12 + 3);
    i = ((i % 12) + 12) % 12;
    return i;
  };
  const chilled = (f: Fighter) => alive(f) && inWedge(f.x, f.y);

  return {
    update(time, dt) {
      const stopped = time < stoppedUntil;
      if (!stopped) hand = wrapAngle(hand + SPEED * Math.min(0.1, dt));
      if (!stopped && time - markUsedAt > 800) mark = nextMark();
      // A chime each time the hand passes an hour.
      const hour = Math.floor(((hand + Math.PI / 2 + Math.PI * 4) % (Math.PI * 2)) / (Math.PI / 6));
      if (hour !== lastPass) { lastPass = hour; ctx.sfx('clock-tick'); }

      // Standing on the lit mark stops the dial.
      const mp = markPt(mark);
      for (const f of [player, npc]) {
        const on = alive(f) && dist(f.x, f.y, mp.x, mp.y) < MARK_R + 8;
        const since = onMarkSince.get(f) ?? -1;
        if (!on) { onMarkSince.set(f, -1); continue; }
        if (since < 0) { onMarkSince.set(f, time); continue; }
        if (!stopped && time - since > HOLD_MS && time - markUsedAt > STOP_MS + 1200) {
          stoppedUntil = time + STOP_MS;
          markUsedAt = time;
          ctx.banner(f === player ? 'YOU STOP THE DIAL' : 'GNOMON STOPS THE DIAL', '#c8d8ff');
          ctx.sfx('time-warp');
          onMarkSince = new Map([[player, -1], [npc, -1]]);
          break;
        }
      }
    },

    playerSpeedMult: () => (chilled(player) ? CHILL_SPEED : 1),
    npcSpeedMult: () => (chilled(npc) ? CHILL_SPEED : 1),
    playerTakenMult: () => (chilled(player) ? CHILL_TAKEN : 1),
    npcTakenMult: () => (chilled(npc) ? CHILL_TAKEN : 1),

    npcSeek() {
      const time = ctx.scene.time.now;
      const pa = Math.atan2((player.y - cy) * (RX / RY), player.x - cx);
      const ahead = wrapAngle(pa - hand);
      // The wedge is on the player or about to sweep them: run to the lit mark and hold it there.
      if (time >= stoppedUntil && time - markUsedAt > STOP_MS + 1200 && ((ahead > -HALF && ahead < 0.9) || chilled(player))) return markPt(mark);
      // Otherwise stay out of the night: a step behind the hand, near the player.
      const safeA = hand - 1.4;
      const r = 0.55;
      return {
        x: clamp(cx + Math.cos(safeA) * RX * r + (player.x - cx) * 0.3, 60, W - 60),
        y: clamp(cy + Math.sin(safeA) * RY * r + (player.y - cy) * 0.3, top + 50, H - 40),
      };
    },

    drawGround(g, time) {
      // The dial: a great disc of night-stone with the hour-ring round it.
      g.fillStyle(STONE_DARK, 0.85); g.fillEllipse(cx, cy + 6, RX * 2 + 70, RY * 2 + 52);
      g.fillStyle(STONE, 0.5); g.fillEllipse(cx, cy, RX * 2 + 60, RY * 2 + 44);
      g.lineStyle(2, STONE_LIT, 0.4); g.strokeEllipse(cx, cy, RX * 2 - 70, RY * 2 - 48);
      g.lineStyle(1, STONE_LIT, 0.25);
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const r0 = i % 4 ? 0.9 : 0.82;
        g.lineBetween(cx + Math.cos(a) * RX * r0, cy + Math.sin(a) * RY * r0, cx + Math.cos(a) * RX * 0.97, cy + Math.sin(a) * RY * 0.97);
      }
      // The hour-marks: brass studs, the coming hour lit.
      for (let i = 0; i < 12; i++) {
        const p = markPt(i);
        const lit = i === mark && time - markUsedAt > STOP_MS + 1200;
        g.fillStyle(STONE_DARK, 1); g.fillEllipse(p.x, p.y + 2, MARK_R * 1.6, MARK_R);
        g.fillStyle(lit ? 0xe8d48a : 0x8a7a4a, 1); g.fillEllipse(p.x, p.y, MARK_R * 1.4, MARK_R * 0.82);
        // The hour numeral as pips.
        for (let k = 0; k < ((i % 12) || 12) && k < 12; k++) g.fillStyle(0x5a4a22, 1).fillCircle(p.x - 10 + (k % 6) * 4, p.y - 3 + Math.floor(k / 6) * 6, 1.1);
        if (lit) {
          const pulse = 0.5 + Math.sin(time / 180) * 0.5;
          g.lineStyle(2 + pulse * 2, 0xfff2b0, 0.4 + pulse * 0.4); g.strokeEllipse(p.x, p.y, MARK_R * 2.2, MARK_R * 1.3);
          // A hold ring, filling as someone stands on it.
          for (const f of [player, npc]) {
            const since = onMarkSince.get(f) ?? -1;
            if (since < 0) continue;
            const k = clamp((time - since) / HOLD_MS, 0, 1);
            g.lineStyle(3, f === player ? 0x9ac8ff : 0xffb08a, 0.9);
            g.beginPath(); g.arc(p.x, p.y, MARK_R + 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          }
        }
      }
      // The wedge of night: the blade's shadow, long and cold, with frost at its rim.
      const L = 760;
      const steps = 8;
      const stopped = time < stoppedUntil;
      for (let i = 0; i < steps; i++) {
        const a0 = hand - HALF + (i / steps) * HALF * 2, a1 = hand - HALF + ((i + 1) / steps) * HALF * 2;
        g.fillStyle(0x06061a, 0.42);
        g.fillTriangle(cx, cy, cx + Math.cos(a0) * L, cy + Math.sin(a0) * L * (RY / RX), cx + Math.cos(a1) * L, cy + Math.sin(a1) * L * (RY / RX));
      }
      for (const s of [-1, 1]) {
        const a = hand + s * HALF;
        g.lineStyle(2, stopped ? 0xfff2b0 : MOON, stopped ? 0.7 : 0.45);
        g.lineBetween(cx, cy, cx + Math.cos(a) * L, cy + Math.sin(a) * L * (RY / RX));
      }
      // Stars come out inside it.
      for (let i = 0; i < 26; i++) {
        const u = ((i * 37) % 100) / 100, v = ((i * 61) % 100) / 100 - 0.5;
        const a = hand + v * HALF * 1.8, d = 60 + u * 520;
        const tw = 0.5 + Math.sin(time / 200 + i) * 0.5;
        g.fillStyle(MOON, 0.3 + tw * 0.5); g.fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d * (RY / RX), 1.1);
      }
      if (stopped) {
        const k = (stoppedUntil - time) / STOP_MS;
        g.lineStyle(3, 0xfff2b0, 0.6); g.beginPath(); g.arc(cx, cy, 44, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },

    drawAir(g, time) {
      // The blade: a tall black-iron gnomon with a white-glass sun lamp hung over it.
      const bx = cx, by = cy;
      g.fillStyle(STONE_DARK, 1); g.fillRect(bx - 18, by - 8, 36, 12);
      g.fillStyle(STONE, 1); g.fillRect(bx - 16, by - 10, 32, 8);
      const tipX = bx - Math.cos(hand) * 18, tipY = by - 96;
      g.fillStyle(0x1a1620, 1); g.fillTriangle(bx - 5, by - 8, bx + 5, by - 8, tipX, tipY);
      g.fillStyle(0x3a3440, 1); g.fillTriangle(bx - 5, by - 8, bx - 2, by - 8, tipX, tipY);
      // The sun lamp: white glass, opposite the hand.
      const sx = bx - Math.cos(hand) * 40, sy = by - 120 - Math.sin(hand) * 10;
      g.lineStyle(1.5, 0x3a3440, 1); g.lineBetween(tipX, tipY, sx, sy + 10);
      glow(g, sx, sy, 40, 0xfff6d8, 0.06, 4);
      g.fillStyle(0xfff6d8, 1); g.fillCircle(sx, sy, 9);
      g.fillStyle(0xffffff, 1); g.fillCircle(sx - 2, sy - 2, 4);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + time / 2000;
        g.lineStyle(1.5, 0xfff2b0, 0.5); g.lineBetween(sx + Math.cos(a) * 12, sy + Math.sin(a) * 12, sx + Math.cos(a) * 18, sy + Math.sin(a) * 18);
      }
      // Chilled fighters: breath frosting.
      for (const f of [player, npc]) {
        if (!chilled(f)) continue;
        const k = (time / 700) % 1;
        g.fillStyle(MOON_DIM, 0.5 * (1 - k)); g.fillCircle(f.x + 10 + k * 10, f.y - 30 - k * 10, 3 + k * 5);
      }
    },
  };
}

export const SUNDOWN: GimmickDef = {
  id: 'umbral-sundown',
  rules: 'The dial\'s shadow sweeps the floor: inside its wedge you are chilled — slowed and hit harder. Stand on the lit hour-mark and the dial stops a moment, holding the wedge where it lies.',
  make,
};
