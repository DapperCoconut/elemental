import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { WAX, WICK, WOOD, BRASS, dist, waxPuddle, waxBlock, flame } from '../art';

/**
 * Drip — Chandler Brigid's dipping shop.
 *
 * A dipping rack rides a rail across the ceiling, a row of half-dipped tapers hanging off it,
 * and wax drips off them onto whoever is underneath. The rack's column is the read: every drip
 * falls somewhere beneath it, and every third one aims at the row of whoever stands nearest the
 * rack. A landing drip scalds and leaves a molten puddle that drags at anyone wading through;
 * after a few seconds the puddle skins over and sets into a wax block — and anyone still
 * standing in it when it sets is set *with* it, stuck fast for a beat. Set blocks are solid:
 * fighters are shouldered out of them.
 *
 * The rule is symmetrical, which is the exploit: Brigid wades through puddles to reach you, so
 * lead her across the rack's column and leave her in a puddle as it sets.
 */

const DRIP_EVERY_MS = 900;
const DRIP_EVERY_HARD_MS = 650;
const FALL_MS = 900;
const FALL_HARD_MS = 760;
const DRIP_DAMAGE = 9;
const DRIP_HIT_R = 32;
const PUDDLE_R = 44;
const PUDDLE_MAX_R = 72;
const MOLTEN_MS = 3200;
/** The last stretch of the molten window, during which the skin visibly forms. */
const SKIN_MS = 1000;
const PUDDLE_SLOW = 0.55;
const SET_ROOT_MS = 1100;
const SET_DAMAGE = 10;
const BLOCK_LIFE_MS = 8000;
const RACK_SPEED = 0.38;
const FIGHTER_R = 20;

interface Drop { x: number; y: number; bornAt: number; landAt: number; seed: number }
interface Puddle { x: number; y: number; r: number; bornAt: number; setAt: number; seed: number; brigidLeaves: boolean }
interface Block { x: number; y: number; r: number; bornAt: number; dieAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const fieldTop = top + 30;
  const dripEvery = ctx.hard ? DRIP_EVERY_HARD_MS : DRIP_EVERY_MS;
  const fallMs = ctx.hard ? FALL_HARD_MS : FALL_MS;

  let drops: Drop[] = [];
  let puddles: Puddle[] = [];
  let blocks: Block[] = [];
  let nextDripAt = 1600;
  let dripCount = 0;
  let rackX = W / 2;
  let rackT = rng() * Math.PI * 2;
  let announced = false;
  /** Rooted (set in wax) until — per side. */
  let playerSetUntil = 0;
  let npcSetUntil = 0;

  const fighters = (): Fighter[] => [ctx.player, ctx.npc];

  const nearestToRack = (): Fighter => {
    const p = ctx.player, n = ctx.npc;
    return Math.abs(p.x - rackX) <= Math.abs(n.x - rackX) ? p : n;
  };

  const spawnDrop = (time: number): void => {
    dripCount++;
    const aimed = dripCount % 3 === 0;
    const x = Math.max(40, Math.min(W - 40, rackX + (rng() - 0.5) * 40));
    const y = aimed
      ? Math.max(fieldTop + 20, Math.min(H - 50, nearestToRack().y + (rng() - 0.5) * 30))
      : fieldTop + 20 + rng() * (H - fieldTop - 70);
    drops.push({ x, y, bornAt: time, landAt: time + fallMs, seed: rng() * 10 });
  };

  const land = (d: Drop, time: number): void => {
    ctx.sfx('slime-splat');
    for (const f of fighters()) {
      if (f.active && f.hp > 0 && dist(d.x, d.y, f.x, f.y) < DRIP_HIT_R + FIGHTER_R * 0.5) {
        ctx.hit(f, DRIP_DAMAGE, d.x, d.y);
      }
    }
    // A drop into a block re-dips it: the block lasts longer and grows.
    const blk = blocks.find((b) => dist(b.x, b.y, d.x, d.y) < b.r + 6);
    if (blk) {
      blk.dieAt = Math.max(blk.dieAt, time + BLOCK_LIFE_MS);
      blk.r = Math.min(46, blk.r + 3);
      ctx.float(blk.x, blk.y - blk.r - 18, 'RE-DIPPED', '#f3e3bf');
      return;
    }
    // A drop into a puddle feeds it — bigger, and molten again.
    const pud = puddles.find((p) => dist(p.x, p.y, d.x, d.y) < p.r);
    if (pud) {
      pud.r = Math.min(PUDDLE_MAX_R, pud.r + 9);
      pud.setAt = time + MOLTEN_MS;
      return;
    }
    puddles.push({
      x: d.x, y: d.y, r: PUDDLE_R, bornAt: time, setAt: time + MOLTEN_MS, seed: d.seed,
      // Brigid reads most puddles — not all. The ones she misreads are the player's chance.
      brigidLeaves: rng() < (ctx.hard ? 0.85 : 0.65),
    });
  };

  const setPuddle = (p: Puddle, time: number): void => {
    ctx.sfx('stone-rise');
    const br = Math.max(24, p.r * 0.62);
    blocks.push({ x: p.x, y: p.y, r: br, bornAt: time, dieAt: time + BLOCK_LIFE_MS });
    for (const f of fighters()) {
      if (!f.active || f.hp <= 0) continue;
      if (dist(p.x, p.y, f.x, f.y) < p.r * 0.92) {
        ctx.hit(f, SET_DAMAGE, f.x, f.y);
        ctx.float(f.x, f.y - 46, 'SET IN WAX', f === ctx.player ? '#ffe6a8' : '#ffb08a');
        if (f === ctx.player) playerSetUntil = time + SET_ROOT_MS;
        else npcSetUntil = time + SET_ROOT_MS;
      }
    }
  };

  const inMolten = (f: Fighter, time: number): boolean =>
    puddles.some((p) => time < p.setAt && dist(p.x, p.y, f.x, f.y) < p.r * 0.92);

  /** Shoulder a fighter out of any set block (once its own setting has let go of it). */
  const shoulderOut = (f: Fighter, rootedUntil: number, time: number): void => {
    if (time < rootedUntil) return;
    for (const b of blocks) {
      const d = dist(b.x, b.y, f.x, f.y);
      const need = b.r + FIGHTER_R * 0.8;
      if (d < need) {
        const a = d > 0.5 ? Math.atan2(f.y - b.y, f.x - b.x) : rng() * Math.PI * 2;
        const push = Math.min(need - d, 9);
        ctx.nudge(f, Math.cos(a) * push, Math.sin(a) * push);
      }
    }
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; ctx.banner('THE RACK IS DRIPPING', '#f3e3bf'); }
      rackT += dt * RACK_SPEED;
      rackX = W / 2 + Math.sin(rackT) * (W / 2 - 90);

      if (time >= nextDripAt) {
        nextDripAt = time + dripEvery * (0.8 + rng() * 0.4);
        spawnDrop(time);
      }
      for (const d of drops) if (time >= d.landAt) land(d, time);
      drops = drops.filter((d) => time < d.landAt);

      for (const p of puddles) if (time >= p.setAt) setPuddle(p, time);
      puddles = puddles.filter((p) => time < p.setAt);
      blocks = blocks.filter((b) => time < b.dieAt);

      shoulderOut(ctx.player, playerSetUntil, time);
      shoulderOut(ctx.npc, npcSetUntil, time);
    },

    playerSpeedMult() {
      const t = ctx.scene.time.now;
      if (t < playerSetUntil) return 0.05;
      return inMolten(ctx.player, t) ? PUDDLE_SLOW : 1;
    },
    npcSpeedMult() {
      const t = ctx.scene.time.now;
      if (t < npcSetUntil) return 0.05;
      return inMolten(ctx.npc, t) ? PUDDLE_SLOW : 1;
    },

    npcSeek(): Pt | null {
      const t = ctx.scene.time.now;
      const n = ctx.npc;
      // A puddle about to set under her: wade for the nearest shore.
      for (const p of puddles) {
        if (!p.brigidLeaves) continue;
        if (p.setAt - t > 1300) continue;
        const d = dist(p.x, p.y, n.x, n.y);
        if (d > p.r + 6) continue;
        const a = d > 1 ? Math.atan2(n.y - p.y, n.x - p.x) : Math.atan2(ctx.player.y - p.y, ctx.player.x - p.x);
        return { x: p.x + Math.cos(a) * (p.r + 40), y: p.y + Math.sin(a) * (p.r + 40) };
      }
      // Standing under the rack is a bad idea; step out of the column.
      if (Math.abs(n.x - rackX) < 50 && drops.some((d) => dist(d.x, d.y, n.x, n.y) < 70)) {
        return { x: n.x + (n.x < rackX ? -110 : 110), y: n.y };
      }
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      for (const p of puddles) {
        const left = p.setAt - time;
        const set = left < SKIN_MS ? 1 - left / SKIN_MS : 0;
        waxPuddle(g, p.x, p.y, p.r, t, set * 0.85, 0xf6d48c, p.seed);
        if (set > 0) {
          // The skin closing: a ring tightening from the rim inward.
          g.lineStyle(2, 0xffffff, 0.35 + set * 0.4);
          g.strokeEllipse(p.x, p.y, p.r * 2 * (1 - set * 0.6), p.r * 1.44 * (1 - set * 0.6));
          if (set > 0.75 && Math.floor(time / 90) % 2 === 0) {
            g.lineStyle(3, 0xffffff, 0.5); g.strokeEllipse(p.x, p.y, p.r * 2, p.r * 1.44);
          }
        }
      }
      // Shadows of falling drops — the shadow tightens as the drop nears the floor.
      for (const d of drops) {
        const k = Math.min(1, (time - d.bornAt) / (d.landAt - d.bornAt));
        g.fillStyle(0x000000, 0.12 + k * 0.22);
        g.fillEllipse(d.x, d.y, (DRIP_HIT_R * 2) * (1.3 - k * 0.5), DRIP_HIT_R * (1.3 - k * 0.5));
        g.lineStyle(1.5, WAX, 0.3 + k * 0.5);
        g.strokeEllipse(d.x, d.y, DRIP_HIT_R * 2, DRIP_HIT_R);
      }
      for (const b of blocks) {
        // A block about to soften slumps into itself over its last half-second.
        const fade = Math.min(1, (b.dieAt - time) / 500);
        waxBlock(g, b.x, b.y + b.r * 0.4, b.r * (0.55 + fade * 0.45));
      }
      // Fighters set fast: a collar of wax around their feet.
      for (const [f, until] of [[ctx.player, playerSetUntil], [ctx.npc, npcSetUntil]] as [Fighter, number][]) {
        if (time >= until) continue;
        g.fillStyle(0xeee4cc, 0.95); g.fillEllipse(f.x, f.y + 14, 52, 22);
        g.fillStyle(lit(0xeee4cc, 0.2), 1); g.fillEllipse(f.x, f.y + 11, 40, 12);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // The rail and the rack riding it — overhead, so kept faint enough to see through.
      g.fillStyle(WOOD, 0.22); g.fillRect(0, top + 4, W, 10);
      g.fillStyle(dim(WOOD, 0.3), 0.5); g.fillRect(rackX - 46, top + 2, 92, 14);
      g.lineStyle(3, BRASS, 0.45); g.lineBetween(rackX, top + 16, rackX, H - 8);
      g.lineStyle(10, WOOD, 0.1); g.lineBetween(rackX, top + 16, rackX, H - 8);
      for (let y = fieldTop + 24; y < H - 30; y += 64) {
        const sw = Math.sin(t * 2 + y * 0.05) * 3;
        for (const side of [-1, 1]) {
          const cx = rackX + side * 12 + sw;
          g.lineStyle(1, WICK, 0.45); g.lineBetween(rackX, y - 10, cx, y);
          g.fillStyle(WAX, 0.42); g.fillRoundedRect(cx - 3, y, 6, 20, 3);
          g.fillStyle(lit(WAX, 0.3), 0.5); g.fillCircle(cx, y + 21, 2.6);
        }
      }
      // The chandler's lamp on the carriage, so the rack reads even in a busy fight.
      flame(g, rackX, top + 2, 5, t, 3, 0.05);
      // Falling drops.
      for (const d of drops) {
        const k = Math.min(1, (time - d.bornAt) / (d.landAt - d.bornAt));
        const h = (1 - k * k) * 170;
        g.fillStyle(lit(WAX, 0.2), 0.95);
        g.fillCircle(d.x, d.y - h - 6, 6);
        g.fillTriangle(d.x - 5.5, d.y - h - 7, d.x + 5.5, d.y - h - 7, d.x, d.y - h - 20);
        g.fillStyle(0xffffff, 0.7); g.fillCircle(d.x - 2, d.y - h - 8, 1.6);
      }
    },
  };
}

export const DRIP: GimmickDef = {
  id: 'candlewick-drip',
  rules: 'Wax drips under the rack. Puddles slow, then SET — anyone still in one is stuck fast. Blocks are solid.',
  make,
};
