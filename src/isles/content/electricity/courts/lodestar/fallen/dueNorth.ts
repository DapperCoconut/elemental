import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  AURORA_GREEN, AURORA_VIOLET, BRASS, BRASS_DARK, BRASS_LIT, IRON, IRON_DARK, IRON_LIT, NORTH, NORTH_LIT, SLATE_DEEP, SOUTH, SOUTH_LIT, SPARK,
} from '../palette';
import { alive, clamp, dist, wrapAngle } from '../util';

/**
 * Due North — Pole-Lamp Keeper Severin Ayle of the Polar Observatory, who sets the pole-lamp the
 * whole crag takes its bearings from, and in the King's telling set it wherever the Prince wished
 * north to be that night.
 *
 * On the crag every fighter is a compass needle. The pole-lamp stands planted in the yard, and a
 * needle of brass swings under each fighter's feet to point at it. Face true — within a few points
 * of the lamp — and your cooldowns run fast and blows glance off you. Turn your back on it and you
 * are reversed: the field jolts you every beat until you turn. Since you face where you aim, the
 * question is always where the lamp stands against your foe.
 *
 * Severin re-plants it every few seconds — always behind you, so that facing him is facing south.
 * Strike the lamp to knock it down behind *him* instead: then you aim true and he aims reversed.
 * Past half he re-plants it faster, and the reversed arc widens.
 */

const ID = fallenId('lodestar', 'due-north');
const TRUE_ARC = (50 * Math.PI) / 180;
const JOLT_MS = 600;
const JOLT_DMG = 3;
const WARN_MS = 1200;

type State = 'true' | 'off' | 'reversed';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  let lamp: Pt = { x: W / 2, y: (top + H) / 2 };
  let ghost: Pt | null = null;
  let plantAt = 0;
  let nextPlant = 0;
  let target: StrikeTarget | null = null;
  let started = false;
  const jolt = new Map<Fighter, number>();
  let knockedAt = -1e9;

  const half = () => npc.hp < npc.maxHp * 0.5;
  const southArc = () => (half() ? (115 * Math.PI) / 180 : (135 * Math.PI) / 180);
  const hurt = (f: Fighter, n: number) => { if (f === player) tk.hitPlayer(n, f.x, f.y); else ctx.hit(f, n, f.x, f.y); };
  const bearing = (f: Fighter) => Math.atan2(lamp.y - f.y, lamp.x - f.x);
  const state = (f: Fighter): State => {
    if (dist(f.x, f.y, lamp.x, lamp.y) < 34) return 'off';
    const d = Math.abs(wrapAngle(ctx.facing(f) - bearing(f)));
    return d < TRUE_ARC ? 'true' : d > southArc() ? 'reversed' : 'off';
  };

  /** A spot 170 px beyond `near`, on the line from `far` through it. */
  function behind(near: Fighter, far: Fighter): Pt {
    const d = dist(far.x, far.y, near.x, near.y) || 1;
    return { x: clamp(near.x + ((near.x - far.x) / d) * 170, 60, W - 60), y: clamp(near.y + ((near.y - far.y) / d) * 170, top + 60, H - 40) };
  }

  function setLamp(p: Pt): void {
    lamp = p;
    target?.moveTo(p.x, p.y - 20);
    ctx.flash(p.x, p.y - 40, BRASS_LIT);
  }

  return {
    update(time) {
      if (!started) {
        started = true;
        nextPlant = time + 2200;
        target = ctx.target({
          x: lamp.x, y: lamp.y - 20, r: 26,
          onStruck: (by) => {
            const now = ctx.scene.time.now;
            if (now < knockedAt + 700) return;
            knockedAt = now;
            const striker = by === 'player' ? player : npc, foe = by === 'player' ? npc : player;
            setLamp(behind(foe, striker));
            ghost = null;
            nextPlant = Math.max(nextPlant, now + 2600);
            ctx.sfx('clang');
            ctx.sfx('gear-turn');
          },
        });
      }
      // Severin calls the next north: a ghost lamp behind you, then the plant.
      if (!ghost && time >= nextPlant) { ghost = behind(player, npc); plantAt = time + tk.warn(WARN_MS); ctx.sfx('clock-tick'); }
      if (ghost && time >= plantAt) {
        setLamp(ghost);
        ghost = null;
        nextPlant = time + (half() ? 4300 : 6400);
        ctx.sfx('stone-rise');
      }
      // Reversed needles are jolted on their own clock.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        if (state(f) !== 'reversed') { jolt.set(f, Math.max(jolt.get(f) ?? 0, time + 250)); continue; }
        if (time >= (jolt.get(f) ?? 0)) {
          jolt.set(f, time + JOLT_MS);
          hurt(f, JOLT_DMG);
          ctx.sfx('zap');
        }
      }
      // The lamp's foot is solid.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const d = dist(f.x, f.y, lamp.x, lamp.y);
        if (d < 30 && d > 0) ctx.nudge(f, ((f.x - lamp.x) / d) * (30 - d), ((f.y - lamp.y) / d) * (30 - d));
      }
    },

    playerCooldownRate: () => (alive(player) && state(player) === 'true' ? 1.5 : 1),
    npcCooldownRate: () => (alive(npc) && state(npc) === 'true' ? 1.5 : 1),
    playerTakenMult: () => (alive(player) && state(player) === 'true' ? 0.85 : 1),
    npcTakenMult: () => (alive(npc) && state(npc) === 'true' ? 0.85 : 1),

    npcSeek() {
      if (!alive(npc)) return null;
      // Stand so you are between me and the lamp: facing you is facing north.
      const d = dist(lamp.x, lamp.y, player.x, player.y) || 1;
      const ux = (player.x - lamp.x) / d, uy = (player.y - lamp.y) / d;
      const p = { x: clamp(player.x + ux * 200, 60, W - 60), y: clamp(player.y + uy * 200, top + 50, H - 50) };
      // Near the wall the line runs out: walk round to the lamp and knock it behind you instead.
      if (dist(p.x, p.y, player.x, player.y) < 120) return { x: clamp(lamp.x + (lamp.x - player.x) * 0.2, 60, W - 60), y: clamp(lamp.y + (lamp.y - player.y) * 0.2, top + 50, H - 50) };
      return p;
    },

    drawGround(g, time) {
      // The meridian: the lamp's bearing laid across the floor as a brass-studded line, and a rose.
      drawRose(g, lamp, time);
      if (ghost) {
        const k = clamp(1 - (plantAt - time) / WARN_MS, 0, 1);
        g.lineStyle(2, BRASS_LIT, 0.3 + 0.5 * k); g.strokeCircle(ghost.x, ghost.y, 30 + (1 - k) * 30);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.lineBetween(ghost.x + Math.cos(a) * 20, ghost.y + Math.sin(a) * 10, ghost.x + Math.cos(a) * 28, ghost.y + Math.sin(a) * 14);
        }
        g.lineStyle(1.5, BRASS_LIT, 0.4 * k); g.lineBetween(lamp.x, lamp.y, ghost.x, ghost.y);
      }
      for (const f of [player, npc]) if (alive(f)) drawNeedle(g, f, bearing(f), state(f), time);
    },

    drawAir(g, time) {
      drawLamp(g, lamp, time);
      if (ghost) {
        const k = clamp(1 - (plantAt - time) / WARN_MS, 0, 1);
        g.lineStyle(2, BRASS_LIT, 0.25 + 0.35 * k); g.lineBetween(ghost.x, ghost.y, ghost.x, ghost.y - 70);
        g.fillStyle(BRASS_LIT, 0.2 + 0.4 * k); g.fillCircle(ghost.x, ghost.y - 76, 7);
      }
      // A reversed fighter crackles.
      for (const f of [player, npc]) {
        if (!alive(f) || state(f) !== 'reversed') continue;
        for (let i = 0; i < 3; i++) {
          const a = time / 50 + i * 2.1;
          g.lineStyle(1.5, i % 2 ? NORTH_LIT : SPARK, 0.85);
          g.lineBetween(f.x + Math.cos(a) * 14, f.y - 20 + Math.sin(a) * 18, f.x + Math.cos(a + 0.6) * 24, f.y - 20 + Math.sin(a + 0.6) * 26);
        }
      }
    },

    drawHud(g) {
      // Two dials: your needle and his, green when true, red when reversed.
      const rows: [Fighter, number][] = [[player, W / 2 - 40], [npc, W / 2 + 40]];
      for (const [f, x] of rows) {
        const st = alive(f) ? state(f) : 'off';
        const y = H - 26;
        g.fillStyle(SLATE_DEEP, 0.85); g.fillCircle(x, y, 17);
        g.lineStyle(2, BRASS, 1); g.strokeCircle(x, y, 17);
        g.fillStyle(st === 'true' ? AURORA_GREEN : st === 'reversed' ? NORTH : BRASS_DARK, 0.35); g.fillCircle(x, y, 14);
        const a = st === 'true' ? -Math.PI / 2 : st === 'reversed' ? Math.PI / 2 : 0;
        g.lineStyle(3, NORTH, 1); g.lineBetween(x, y, x + Math.cos(a) * 12, y + Math.sin(a) * 12);
        g.lineStyle(3, SOUTH, 1); g.lineBetween(x, y, x - Math.cos(a) * 10, y - Math.sin(a) * 10);
        g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y, 2.5);
        g.fillStyle(f === player ? SOUTH_LIT : NORTH_LIT, 1); g.fillCircle(x, y + 22, 3);
      }
    },

    destroy() { target?.remove(); },
  };
}

/** The meridian rose round the lamp's foot: thirty-two points cut in brass, north toward the lamp. */
function drawRose(g: G, p: Pt, time: number): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(p.x + 3, p.y + 6, 120, 46);
  g.fillStyle(BRASS_DARK, 0.9); g.fillEllipse(p.x, p.y, 112, 42);
  g.lineStyle(2, BRASS, 1); g.strokeEllipse(p.x, p.y, 112, 42);
  g.lineStyle(1, BRASS_LIT, 0.6); g.strokeEllipse(p.x, p.y, 90, 33);
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2 + time / 9000;
    const r0 = i % 8 === 0 ? 20 : i % 4 === 0 ? 30 : 38;
    g.lineStyle(i % 8 === 0 ? 2 : 1, BRASS_LIT, i % 8 === 0 ? 0.9 : 0.5);
    g.lineBetween(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0 * 0.37, p.x + Math.cos(a) * 54, p.y + Math.sin(a) * 20);
  }
}

/** The pole-lamp: an iron pole with a star-lantern of brass and green glass, the aurora drawn down to it. */
function drawLamp(g: G, p: Pt, time: number): void {
  const top = p.y - 92;
  // Aurora ribbon pouring down onto the lamp.
  for (let i = 0; i < 4; i++) {
    const sway = Math.sin(time / 600 + i) * 10;
    g.lineStyle(6 - i, i % 2 ? AURORA_VIOLET : AURORA_GREEN, 0.12);
    g.lineBetween(p.x + sway - 30 + i * 18, top - 140, p.x + (i - 1.5) * 4, top);
  }
  g.fillStyle(IRON_DARK, 1); g.fillRect(p.x - 4, top, 8, 92);
  g.fillStyle(IRON_LIT, 1); g.fillRect(p.x - 3, top, 2, 90);
  g.fillStyle(IRON, 1); g.fillRect(p.x - 10, p.y - 6, 20, 8);
  // The lantern: an eight-pointed brass star round a green glass heart.
  glow(g, p.x, top - 8, 46, AURORA_GREEN, 0.08 + 0.03 * Math.sin(time / 250), 4);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + time / 4000;
    const r = i % 2 ? 11 : 19;
    g.fillStyle(i % 2 ? BRASS : BRASS_LIT, 1);
    g.fillTriangle(p.x + Math.cos(a - 0.3) * 6, top - 8 + Math.sin(a - 0.3) * 6, p.x + Math.cos(a + 0.3) * 6, top - 8 + Math.sin(a + 0.3) * 6, p.x + Math.cos(a) * r, top - 8 + Math.sin(a) * r);
  }
  g.fillStyle(AURORA_GREEN, 0.9); g.fillCircle(p.x, top - 8, 6);
  g.fillStyle(0xe8fff4, 0.9); g.fillCircle(p.x - 1.5, top - 9.5, 2.2);
  // The north pennant.
  g.fillStyle(NORTH, 1); g.fillTriangle(p.x + 4, top + 12, p.x + 22, top + 17, p.x + 4, top + 22);
}

/** The brass needle under a fighter's feet, its red tip on the lamp; the arc of their facing. */
function drawNeedle(g: G, f: Fighter, bearing: number, st: State, time: number): void {
  const x = f.x, y = f.y + 18;
  g.lineStyle(1.5, st === 'true' ? AURORA_GREEN : st === 'reversed' ? NORTH_LIT : BRASS, 0.7);
  g.strokeEllipse(x, y, 58, 22);
  const c = Math.cos(bearing), s = Math.sin(bearing) * 0.38;
  const wob = st === 'reversed' ? Math.sin(time / 40) * 0.08 : 0;
  const cw = Math.cos(bearing + wob), sw = Math.sin(bearing + wob) * 0.38;
  g.fillStyle(NORTH, 1); g.fillTriangle(x - s * 5, y + c * 2, x + s * 5, y - c * 2, x + cw * 27, y + sw * 27);
  g.fillStyle(SOUTH, 1); g.fillTriangle(x - s * 5, y + c * 2, x + s * 5, y - c * 2, x - cw * 22, y - sw * 22);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y, 2.6);
}

export const FALLEN_DUE_NORTH: GimmickDef = {
  id: ID,
  rules: 'Face the pole-lamp: cooldowns race, blows glance. Turn your back: jolted. He plants it behind you; strike it to knock it behind him.',
  make,
};
