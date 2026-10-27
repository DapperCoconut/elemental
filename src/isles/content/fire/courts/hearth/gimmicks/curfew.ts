import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { EMBER, EMBER_LIT, GLOW, IRON, SMOKE } from '../palette';
import { alive, darknessGrid, dist, frameClock, type Light } from './util';

/**
 * Curfew — Lamplighter Fenn.
 *
 * The room is a street after curfew: black, but for four iron street-lamps. Fenn is the curfew
 * lamplighter and his job is putting them out — he walks to a lit lamp, reaches up with his
 * snuffer, and it's dark there. Walk into a dark lamp and you relight it.
 *
 * Out of the light you take 40% more damage — he hits harder in the dark. The exploit is the
 * mirror: lamplight shows a lamplighter's seams, and Fenn takes 30% more while *he* stands in
 * it. Every sixteen seconds the curfew bell rings and the lamp nearest *you* gutters out after a
 * flickering warning — so the fight keeps moving.
 *
 * The bot snuffs the lit lamp furthest from you while two or more burn (`npcSeek`), and hunts
 * you in the dark once they're out. His eyes still catch the light — you can see where he is.
 */

const LIGHT_R = 165;
const SNUFF_R = 38;
const SNUFF_MS = 380;
const DARK_MULT = 1.4;
const LIT_MULT = 1.3;
const BELL_WARN = 1500;

interface Lamp { x: number; y: number; lit: boolean; changedAt: number; snuffT: number; bellAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const step = frameClock();
  const fy = (k: number) => top + (H - top) * k;
  const lamps: Lamp[] = [
    { x: W * 0.2, y: fy(0.26), lit: true, changedAt: 0, snuffT: 0, bellAt: 0 },
    { x: W * 0.8, y: fy(0.26), lit: true, changedAt: 0, snuffT: 0, bellAt: 0 },
    { x: W * 0.2, y: fy(0.8), lit: true, changedAt: 0, snuffT: 0, bellAt: 0 },
    { x: W * 0.8, y: fy(0.8), lit: true, changedAt: 0, snuffT: 0, bellAt: 0 },
  ];
  const bellEvery = ctx.hard ? 12000 : 16000;
  let nextBell = 0;
  let started = false;
  let dark = 0;
  let ringUntil = 0;

  const inLight = (x: number, y: number) => lamps.some((l) => l.lit && dist(l.x, l.y, x, y) < LIGHT_R * 0.9);

  function snuff(l: Lamp, time: number, by: string): void {
    l.lit = false;
    l.changedAt = time;
    l.snuffT = 0;
    l.bellAt = 0;
    ctx.float(l.x, l.y - 70, by, '#b8b2a8');
    ctx.sfx('hush');
  }

  return {
    update(time) {
      const dt = step(time);
      if (!started) { started = true; nextBell = time + bellEvery; }
      for (const l of lamps) {
        // Relight by touch.
        if (!l.lit && alive(player) && dist(player.x, player.y, l.x, l.y) < SNUFF_R && time - l.changedAt > 250) {
          l.lit = true;
          l.changedAt = time;
          ctx.float(l.x, l.y - 70, 'LIT', '#ffc070');
          ctx.sfx('flame-burst');
        }
        // Fenn reaches up with the snuffer.
        if (l.lit && alive(npc) && dist(npc.x, npc.y, l.x, l.y) < SNUFF_R) {
          l.snuffT += dt * 1000;
          if (l.snuffT >= SNUFF_MS) snuff(l, time, 'SNUFFED');
        } else {
          l.snuffT = 0;
        }
        // The bell's gutter.
        if (l.lit && l.bellAt && time >= l.bellAt) snuff(l, time, 'CURFEW');
      }
      if (time >= nextBell) {
        nextBell = time + bellEvery;
        ringUntil = time + 1200;
        ctx.banner('CURFEW', '#d8ccb0');
        ctx.sfx('drum-hit');
        let best: Lamp | null = null;
        for (const l of lamps) {
          if (!l.lit) continue;
          if (!best || dist(player.x, player.y, l.x, l.y) < dist(player.x, player.y, best.x, best.y)) best = l;
        }
        if (best) best.bellAt = time + BELL_WARN;
      }
      const litN = lamps.filter((l) => l.lit).length;
      dark += ((0.62 + (4 - litN) * 0.06) - dark) * Math.min(1, dt * 3);
    },

    playerTakenMult: () => (inLight(player.x, player.y) ? 1 : (ctx.hard ? DARK_MULT + 0.1 : DARK_MULT)),
    npcTakenMult: () => (inLight(npc.x, npc.y) ? LIT_MULT : 1),

    npcSeek() {
      const lit = lamps.filter((l) => l.lit);
      if (lit.length < 2) return null;
      // Snuff the lamp the player is furthest from — the one they can't save in time.
      let best = lit[0];
      let score = -1e9;
      for (const l of lit) {
        const s = dist(player.x, player.y, l.x, l.y) - dist(npc.x, npc.y, l.x, l.y) * 0.6;
        if (s > score) { score = s; best = l; }
      }
      return { x: best.x, y: best.y + 6 };
    },

    drawGround(g, time) {
      for (const l of lamps) {
        if (l.lit) {
          const flick = 1 + Math.sin(time / 90 + l.x) * 0.03 + (l.bellAt ? Math.sin(time / 30) * 0.08 : 0);
          glow(g, l.x, l.y, LIGHT_R * flick, GLOW, 0.05, 5);
          g.lineStyle(1, EMBER_LIT, 0.25); g.strokeCircle(l.x, l.y, LIGHT_R * 0.9);
        } else {
          g.lineStyle(1.5, 0x5a5550, 0.35);
          g.strokeCircle(l.x, l.y, SNUFF_R);
        }
        // Cobbles round the post, where the light (or nothing) falls.
        g.fillStyle(0x000000, 0.35); g.fillEllipse(l.x, l.y + 4, 40, 12);
      }
    },

    drawAir(g, time) {
      for (const l of lamps) drawLamp(g, l, time);
    },

    drawHud(g, time) {
      // Night. The only light is the lamps, and a little round you.
      const lights: Light[] = [{ x: player.x, y: player.y, r: 95 }];
      for (const l of lamps) if (l.lit) lights.push({ x: l.x, y: l.y, r: LIGHT_R });
      darknessGrid(g, W, H, top, lights, dark, 0x05060c);
      // A cold lamp still shows as a ghost of its cage — you have to be able to find it.
      for (const l of lamps) {
        if (l.lit) continue;
        const a = 0.25 + Math.sin(time / 300 + l.x) * 0.1;
        g.lineStyle(1.5, 0xb8b2a8, a);
        g.strokeRect(l.x - 10, l.y - 88, 20, 22);
        g.lineBetween(l.x, l.y - 66, l.x, l.y);
        g.strokeCircle(l.x, l.y, SNUFF_R);
      }
      // His eyes catch the light even in the dark.
      if (alive(npc) && !inLight(npc.x, npc.y)) {
        const blink = Math.floor(time / 2600) % 7 === 0 && (time % 2600) < 140;
        if (!blink) {
          g.fillStyle(0xffe08a, 0.85);
          g.fillCircle(npc.x - 6, npc.y - 4, 2.4);
          g.fillCircle(npc.x + 6, npc.y - 4, 2.4);
          g.fillStyle(0xffe08a, 0.15);
          g.fillCircle(npc.x, npc.y - 4, 14);
        }
      }
      // Lamp tally and the bell.
      const y = top + 18;
      for (let i = 0; i < 4; i++) {
        const x = W / 2 - 42 + i * 28;
        const on = lamps[i].lit;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 9, y - 11, 18, 22, 4);
        g.fillStyle(on ? GLOW : 0x2b2725, 1); g.fillRect(x - 5, y - 7, 10, 12);
        g.fillStyle(IRON, 1); g.fillRect(x - 6, y + 5, 12, 3);
      }
      const k = Math.max(0, Math.min(1, 1 - (nextBell - time) / bellEvery));
      const bx = W / 2 + 84;
      const swing = time < ringUntil ? Math.sin(time / 50) * 0.5 : 0;
      g.fillStyle(0x000000, 0.5); g.fillCircle(bx, y, 13);
      g.lineStyle(2.5, 0xd8ccb0, 0.9);
      g.beginPath(); g.arc(bx, y, 11, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      g.fillStyle(0xd8ccb0, 1);
      g.fillTriangle(bx - 6 + swing * 4, y + 5, bx + 6 + swing * 4, y + 5, bx + swing * 2, y - 6);
    },
  };
}

/** An iron street-lamp: post, cage, flame — or a cold cage trailing smoke. */
function drawLamp(g: Phaser.GameObjects.Graphics, l: Lamp, time: number): void {
  const x = l.x, y = l.y;
  g.fillStyle(IRON, 1);
  g.fillRect(x - 3, y - 64, 6, 64);
  g.fillRect(x - 10, y - 4, 20, 5);
  g.fillRect(x - 9, y - 66, 18, 3);
  // Cage.
  g.fillStyle(0x1a1716, 1); g.fillRect(x - 10, y - 88, 20, 22);
  g.fillTriangle(x - 13, y - 88, x + 13, y - 88, x, y - 98);
  if (l.lit) {
    const gutter = l.bellAt ? (Math.floor(time / 70) % 3 === 0 ? 0.3 : 1) : 1;
    g.fillStyle(GLOW, 0.95 * gutter); g.fillRect(x - 7, y - 85, 14, 16);
    const h = 9 + Math.sin(time / 80 + x) * 2;
    g.fillStyle(EMBER_LIT, gutter); g.fillTriangle(x - 4, y - 72, x + 4, y - 72, x, y - 72 - h);
    g.fillStyle(EMBER, 0.2 * gutter); g.fillCircle(x, y - 78, 24);
  } else {
    g.fillStyle(0x2b2725, 1); g.fillRect(x - 7, y - 85, 14, 16);
    for (let i = 0; i < 4; i++) {
      const ph = ((time / 1400) + i / 4) % 1;
      g.fillStyle(SMOKE, 0.4 * (1 - ph));
      g.fillCircle(x + Math.sin(ph * 6 + i) * 5, y - 96 - ph * 40, 3 + ph * 6);
    }
  }
  g.lineStyle(1.5, IRON, 1);
  g.lineBetween(x - 3, y - 88, x - 3, y - 66);
  g.lineBetween(x + 3, y - 88, x + 3, y - 66);
  // Snuffer progress when Fenn is reaching up.
  if (l.snuffT > 0) {
    const k = l.snuffT / SNUFF_MS;
    g.lineStyle(3, 0x9a9590, 0.9);
    g.beginPath(); g.arc(x, y - 78, 18, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
  }
}

export const CURFEW: GimmickDef = {
  id: 'hearth-curfew',
  rules: 'Dark room, four lamps. You take +40% damage out of the light; Fenn takes +30% in it. He snuffs lamps, you relight them by touch.',
  make,
};
