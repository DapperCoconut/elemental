import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BLUEPRINT, BLUEPRINT_DARK, BRASS, BRASS_DARK, BRASS_LIT, CYAN, CYAN_LIT, GLASS, GLASS_EDGE, GOLD, IRON_DARK, IRON_LIT, LIME,
  LIME_DARK, OAK, OAK_DARK, OAK_LIT, ROUGE, SIDE_NPC, SIDE_PLAYER,
} from '../palette';
import { alive, clamp, dist, lerp, stepDt } from '../util';
import { hpRatio, hudPlate, rivet } from './kit';

/**
 * Writ of Seizure — Examiner Tybalt Caveat of the Patent Office, who in the King's telling seized
 * every plan a maker left unwatched "because a thing not watched is a thing made in the dark".
 *
 * Each fighter has a plan pinned to a drafting table at their own end of the yard. Every few
 * seconds the Office's glass doors open at the top of the yard and a clockwork bailiff rolls out
 * with a sealed writ. It goes for **whichever plan its maker is standing farther from** — it
 * re-reads the yard as it rolls, so it turns when you do. A bailiff that reaches a plan seizes it:
 * its maker is bound (silenced) and their cooldowns run at half while the plan is held. A bailiff
 * that bumps into anyone serves them the writ (a blow and a root). Two blows break one.
 *
 * So you can stand guard and let the foe come to you, or break bailiffs on the way, or — better —
 * pull him away from his table and let the Office do the rest. Past half they come in pairs.
 */

const ID = fallenId('workshop', 'seizure');
const DOOR_MS = 900;
const SEIZE_MS = 7000;
const SLOW_MS = 6000;

type Side = 'player' | 'npc';
interface Plan { side: Side; x: number; y: number; seizedUntil: number }
interface Bailiff {
  x: number; y: number; hp: number; goal: Side | null; reread: number; pauseUntil: number;
  served: Map<Fighter, number>; lastStruck: number; key: number; target: StrikeTarget | null;
  leaving: boolean; dead: boolean;
}
interface Wreck { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const door: Pt = { x: W / 2, y: top + 26 };
  const planY = top + (H - top) * 0.62;
  const plans: Record<Side, Plan> = {
    player: { side: 'player', x: 96, y: planY, seizedUntil: 0 },
    npc: { side: 'npc', x: W - 96, y: planY, seizedUntil: 0 },
  };
  const owner = (s: Side): Fighter => (s === 'player' ? player : npc);
  const bailiffs: Bailiff[] = [];
  const wrecks: Wreck[] = [];
  const slowUntil: Record<Side, number> = { player: 0, npc: 0 };
  let doorAt = 0;
  let nextDoor = 0;
  let pairs = false;

  /** The plan the Office wants: the one whose maker stands farther off; never one already held. */
  function choose(time: number): Side | null {
    const open = (['player', 'npc'] as Side[]).filter((s) => time >= plans[s].seizedUntil);
    if (!open.length) return null;
    if (open.length === 1) return open[0];
    const dp = alive(player) ? dist(player.x, player.y, plans.player.x, plans.player.y) : 9999;
    const dn = alive(npc) ? dist(npc.x, npc.y, plans.npc.x, plans.npc.y) : 9999;
    return dp >= dn ? 'player' : 'npc';
  }

  function release(time: number, off: number): void {
    const b: Bailiff = {
      x: door.x + off, y: door.y + 30, hp: 2, goal: choose(time), reread: time + 400, pauseUntil: 0,
      served: new Map(), lastStruck: 0, key: rng() * 6, target: null, leaving: false, dead: false,
    };
    b.target = ctx.target({
      x: b.x, y: b.y, r: 20,
      onStruck: () => {
        const now = ctx.scene.time.now;
        if (b.dead || b.leaving || now - b.lastStruck < 250) return;
        b.lastStruck = now;
        b.hp--;
        ctx.sfx('clang');
        if (b.hp <= 0) { b.dead = true; b.target?.remove(); wrecks.push({ x: b.x, y: b.y, at: now }); ctx.sfx('snap-back'); }
      },
    });
    bailiffs.push(b);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (nextDoor === 0) nextDoor = time + 2200;
      if (!pairs && hpRatio(npc) < 0.5) { pairs = true; ctx.banner('THE OFFICE SENDS TWO'); ctx.sfx('judgement'); }
      const every = pairs ? 4200 : 5200;
      const speed = pairs ? 86 : 72;
      if (!doorAt && time >= nextDoor) { doorAt = time; ctx.sfx('countdown-tick'); }
      if (doorAt && time - doorAt >= DOOR_MS) {
        if (pairs) { release(time, -26); release(time, 26); } else release(time, 0);
        doorAt = 0; nextDoor = time + every;
        ctx.sfx('gear-turn');
      }
      for (const b of bailiffs) {
        if (b.dead) continue;
        b.key += dt * 5;
        if (b.leaving) {
          // Carrying the seized plan back to the Office.
          const a = Math.atan2(door.y - b.y, door.x - b.x);
          b.x += Math.cos(a) * 110 * dt; b.y += Math.sin(a) * 110 * dt;
          if (dist(b.x, b.y, door.x, door.y) < 20) b.dead = true;
          continue;
        }
        if (time >= b.reread) { b.goal = choose(time); b.reread = time + 400; }
        if (time < b.pauseUntil) continue;
        const goal = b.goal ? plans[b.goal] : { x: W / 2, y: top + 120 };
        const d = dist(b.x, b.y, goal.x, goal.y);
        if (d > 2) {
          const a = Math.atan2(goal.y - b.y, goal.x - b.x);
          b.x += Math.cos(a) * speed * dt; b.y += Math.sin(a) * speed * dt;
        }
        b.target?.moveTo(b.x, b.y);
        // Serve whoever it runs into.
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, b.x, b.y) > 34) continue;
          if (time - (b.served.get(f) ?? -9999) < 1500) continue;
          b.served.set(f, time);
          ctx.hit(f, 8, f.x, f.y);
          ctx.root(f, 700);
          b.pauseUntil = time + 600;
          ctx.sfx('chain');
        }
        // Seize the plan.
        if (b.goal && time >= plans[b.goal].seizedUntil && d < 34) {
          const s = b.goal;
          plans[s].seizedUntil = time + SEIZE_MS;
          slowUntil[s] = time + SLOW_MS;
          const o = owner(s);
          if (alive(o)) { ctx.silence(o, 1800); ctx.hit(o, 6, o.x, o.y); }
          b.leaving = true;
          b.target?.remove();
          ctx.sfx('trap-snap');
        }
      }
      for (let i = bailiffs.length - 1; i >= 0; i--) if (bailiffs[i].dead) { bailiffs[i].target?.remove(); bailiffs.splice(i, 1); }
      while (wrecks.length && time - wrecks[0].at > 900) wrecks.shift();
    },

    playerCooldownRate: () => (ctx.scene.time.now < slowUntil.player ? 0.5 : 1),
    npcCooldownRate: () => (ctx.scene.time.now < slowUntil.npc ? 0.5 : 1),

    npcSeek() {
      const mine = plans.npc;
      // A bailiff closing on his plan: step into its road and break it.
      let threat: Bailiff | null = null, td = Infinity;
      for (const b of bailiffs) {
        if (b.dead || b.leaving || b.goal !== 'npc') continue;
        const d = dist(b.x, b.y, mine.x, mine.y);
        if (d < 320 && d < td) { td = d; threat = b; }
      }
      if (threat) return { x: lerp(threat.x, mine.x, 0.35), y: lerp(threat.y, mine.y, 0.35) };
      // Otherwise fight from near his own table, drawing the stranger off hers.
      return { x: clamp(lerp(mine.x, player.x, 0.45), 60, W - 60), y: clamp(lerp(mine.y, player.y, 0.45), top + 40, H - 40) };
    },

    drawGround(g, time) {
      drawOffice(g, door, doorAt ? clamp((time - doorAt) / DOOR_MS, 0, 1) : 0, time);
      for (const s of ['player', 'npc'] as Side[]) drawTable(g, plans[s], time, s === 'player' ? SIDE_PLAYER : SIDE_NPC, owner(s));
      // The chalked road each bailiff means to take.
      for (const b of bailiffs) {
        if (b.dead || b.leaving || !b.goal) continue;
        const p = plans[b.goal];
        const c = b.goal === 'player' ? SIDE_PLAYER : SIDE_NPC;
        const len = dist(b.x, b.y, p.x, p.y);
        const ux = (p.x - b.x) / Math.max(1, len), uy = (p.y - b.y) / Math.max(1, len);
        for (let d = 24 + ((time / 20) % 20); d < len - 20; d += 20) {
          g.fillStyle(c, 0.45); g.fillCircle(b.x + ux * d, b.y + uy * d, 2);
        }
      }
    },

    drawAir(g, time) {
      for (const b of bailiffs) if (!b.dead) drawBailiff(g, b, time);
      for (const w of wrecks) {
        const k = clamp((time - w.at) / 900, 0, 1);
        for (let i = 0; i < 8; i++) {
          const a = i * 0.785 + w.x;
          const d = 8 + k * 40;
          const px = w.x + Math.cos(a) * d, py = w.y - 16 + Math.sin(a) * d * 0.6 + k * k * 30;
          g.lineStyle(2, i % 2 ? BRASS : IRON_LIT, 1 - k);
          g.strokeCircle(px, py, 3 + (i % 3));
          g.lineBetween(px - 3, py, px + 3, py);
        }
      }
    },

    drawHud(g, time) {
      (['player', 'npc'] as Side[]).forEach((s) => {
        const x = s === 'player' ? 14 : W - 14 - 64, y = top + 6;
        hudPlate(g, x, y, 64, 30);
        const held = time < plans[s].seizedUntil;
        g.fillStyle(held ? 0x6a6a70 : BLUEPRINT, 1); g.fillRect(x + 6, y + 6, 26, 18);
        g.lineStyle(1, held ? 0x9a9a9a : CYAN, 1); g.strokeRect(x + 8, y + 8, 22, 14);
        g.strokeCircle(x + 19, y + 15, 4);
        if (held) { g.fillStyle(ROUGE, 1); g.fillCircle(x + 19, y + 15, 6); g.fillStyle(lit(ROUGE, 0.3), 1); g.fillCircle(x + 18, y + 14, 2.5); }
        // A half-speed clock while cooldowns are slowed.
        const slow = time < slowUntil[s];
        g.lineStyle(2, slow ? ROUGE : LIME_DARK, 1); g.strokeCircle(x + 48, y + 15, 9);
        if (slow) { g.fillStyle(ROUGE, 0.7); g.slice(x + 48, y + 15, 9, -Math.PI / 2, Math.PI / 2, false); g.fillPath(); }
        g.lineStyle(1.5, LIME, 1); g.lineBetween(x + 48, y + 15, x + 48 + Math.cos(time / (slow ? 600 : 300)) * 7, y + 15 + Math.sin(time / (slow ? 600 : 300)) * 7);
        g.fillStyle(s === 'player' ? SIDE_PLAYER : SIDE_NPC, 1); g.fillRect(x + 6, y + 26, 52, 2);
      });
    },

    destroy() { for (const b of bailiffs) b.target?.remove(); },
  };
}

/** The Patent Office's front on the north wall: glass doors (swinging open), a gold seal over them, steps. */
function drawOffice(g: G, d: Pt, open: number, time: number): void {
  const { x, y } = d;
  g.fillStyle(LIME_DARK, 1); g.fillRect(x - 110, y - 30, 220, 44);
  g.fillStyle(LIME, 1); g.fillRect(x - 106, y - 30, 212, 38);
  for (let i = -2; i <= 2; i++) { g.fillStyle(lit(LIME, 0.3), 1); g.fillRect(x + i * 40 - 4, y - 30, 8, 38); }
  // Steps.
  for (let i = 0; i < 3; i++) { g.fillStyle(i % 2 ? LIME : lit(LIME, 0.2), 1); g.fillRect(x - 48 + i * 4, y + 8 + i * 5, 96 - i * 8, 5); }
  // Doors: two glass leaves that narrow as they swing.
  const leaf = 22 * (1 - open * 0.8);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 26, y - 26, 52, 34);
  for (const s of [-1, 1]) {
    const lx = s < 0 ? x - 24 : x + 24 - leaf;
    g.fillStyle(GLASS, 0.85); g.fillRect(lx, y - 24, leaf, 30);
    g.lineStyle(1.5, GLASS_EDGE, 1); g.strokeRect(lx, y - 24, leaf, 30);
    g.fillStyle(0xffffff, 0.7); g.fillRect(lx + 2, y - 22, Math.max(1, leaf * 0.2), 12);
  }
  // The gold seal, and a red lamp that lights as the doors open.
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y - 38, 12);
  g.fillStyle(GOLD, 1); g.fillCircle(x, y - 38, 10);
  for (let i = 0; i < 12; i++) { const a = i * 0.524; g.lineStyle(1, BRASS_DARK, 1); g.lineBetween(x + Math.cos(a) * 5, y - 38 + Math.sin(a) * 5, x + Math.cos(a) * 9, y - 38 + Math.sin(a) * 9); }
  if (open > 0) { glow(g, x + 34, y - 20, 12, ROUGE, 0.12 * open, 3); g.fillStyle(ROUGE, 0.6 + 0.4 * Math.sin(time / 80)); g.fillCircle(x + 34, y - 20, 4); }
}

/** A drafting table with its maker's plan pinned on: blueprint cyan, or a red writ-seal while held. */
function drawTable(g: G, p: Plan, time: number, side: number, maker: Fighter): void {
  const { x, y } = p;
  const held = time < p.seizedUntil;
  // Guard ring: brighter while the maker stands inside it.
  const near = alive(maker) && dist(maker.x, maker.y, x, y) < 140;
  g.lineStyle(2, side, near ? 0.55 : 0.18);
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2 + time / 4000; g.beginPath(); g.arc(x, y, 140, a, a + 0.16, false); g.strokePath(); }
  g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y + 26, 90, 20);
  g.lineStyle(4, OAK_DARK, 1); g.lineBetween(x - 30, y + 26, x - 22, y - 4); g.lineBetween(x + 30, y + 26, x + 22, y - 4);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 40, y - 26, 80, 30);
  g.fillStyle(OAK, 1); g.fillRect(x - 38, y - 28, 76, 28);
  g.fillStyle(OAK_LIT, 1); g.fillRect(x - 38, y - 28, 76, 2);
  if (!held) {
    g.fillStyle(BLUEPRINT, 1); g.fillRect(x - 32, y - 24, 64, 20);
    g.lineStyle(1, CYAN, 0.9); g.strokeRect(x - 30, y - 22, 60, 16);
    g.strokeCircle(x - 14, y - 14, 6); g.strokeCircle(x - 14, y - 14, 2);
    g.lineBetween(x - 8, y - 14, x + 20, y - 14); g.lineBetween(x + 20, y - 20, x + 20, y - 8);
    g.lineStyle(1, CYAN_LIT, 0.6); g.lineBetween(x + 4, y - 20, x + 14, y - 8);
    for (const [px, py] of [[-30, -22], [30, -22], [-30, -6], [30, -6]]) { g.fillStyle(BRASS_LIT, 1); g.fillCircle(x + px, y + py, 1.6); }
  } else {
    // The table stripped bare but for the writ, and a fat red wax seal.
    g.fillStyle(BLUEPRINT_DARK, 0.5); g.fillRect(x - 32, y - 24, 64, 20);
    g.fillStyle(LIME, 1); g.fillRect(x - 18, y - 22, 36, 14);
    g.lineStyle(1, LIME_DARK, 1); for (let i = 0; i < 3; i++) g.lineBetween(x - 14, y - 19 + i * 4, x + 10, y - 19 + i * 4);
    g.fillStyle(dim(ROUGE, 0.2), 1); g.fillCircle(x + 12, y - 10, 7);
    g.fillStyle(ROUGE, 1); g.fillCircle(x + 12, y - 11, 6);
    g.fillStyle(lit(ROUGE, 0.35), 1); g.fillCircle(x + 10, y - 13, 2);
  }
  g.fillStyle(side, 1); g.fillTriangle(x + 34, y - 28, x + 34, y - 46, x + 46, y - 40);
  g.lineStyle(1.5, OAK_DARK, 1); g.lineBetween(x + 34, y - 28, x + 34, y - 48);
}

/** A clockwork bailiff: a brass box on two treads, a domed head with one red lamp, a writ in its arm, a turning key. */
function drawBailiff(g: G, b: Bailiff, time: number): void {
  const x = b.x, y = b.y;
  const bob = Math.sin(time / 90 + b.key) * 1.2;
  g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y + 4, 34, 10);
  // Treads.
  for (const s of [-1, 1]) {
    g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(x + s * 12 - 5, y - 8, 10, 14, 3);
    for (let i = 0; i < 3; i++) { g.fillStyle(IRON_LIT, 1); g.fillRect(x + s * 12 - 4, y - 7 + ((i * 5 + time / 40) % 14), 8, 1); }
  }
  // Body.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 11, y - 30 + bob, 22, 24);
  g.fillStyle(BRASS, 1); g.fillRect(x - 10, y - 31 + bob, 20, 22);
  g.fillStyle(BRASS_LIT, 0.7); g.fillRect(x - 10, y - 31 + bob, 3, 22);
  rivet(g, x - 6, y - 26 + bob, BRASS_LIT); rivet(g, x + 6, y - 26 + bob, BRASS_LIT);
  // Health lamps.
  for (let i = 0; i < 2; i++) { g.fillStyle(i < b.hp ? 0xffd27a : 0x3a3a3a, 1); g.fillCircle(x - 4 + i * 8, y - 16 + bob, 2.2); }
  // Head with its red eye.
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y - 34 + bob, 9);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - 35 + bob, 8);
  g.fillStyle(ROUGE, 1); g.fillCircle(x, y - 35 + bob, 3);
  glow(g, x, y - 35 + bob, 6, ROUGE, 0.12, 2);
  // Arm with the writ (or the seized plan, rolled).
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(x + 10, y - 22 + bob, x + 20, y - 18 + bob);
  g.fillStyle(b.leaving ? BLUEPRINT : LIME, 1); g.fillRect(x + 17, y - 24 + bob, 6, 14);
  g.fillStyle(ROUGE, 1); g.fillRect(x + 17, y - 18 + bob, 6, 2);
  // The key in its back, turning.
  const k = Math.cos(b.key);
  g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x - 11, y - 22 + bob, x - 17, y - 22 + bob);
  g.lineStyle(3, BRASS_LIT, 1); g.lineBetween(x - 19, y - 22 + bob - 6 * k, x - 19, y - 22 + bob + 6 * k);
}

export const SEIZURE: GimmickDef = {
  id: ID,
  rules: 'Clockwork bailiffs roll out for the plan whose maker stands farther off. Seized, you\'re bound and slowed. Two blows break one. Lure him off his.',
  make,
};
