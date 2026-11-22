import type { Fighter } from '../../../../../entities/Fighter';
import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { bell, carvedNumber, coffin, greyedGhost } from './art';
import { BRONZE, BRONZE_DARK, BRONZE_LIT, GREY, GREY_LIT, IRON_LIT, PETAL, PETAL_LIT, SLAB, SLAB_DARK, SLAB_LIT, WISP } from './palette';
import { alive, clamp, dist, ticker } from './util';

/**
 * The Grave Court's goods: Ossian Lathe's four charms (a coffin-maker sells what the churchyard
 * leaves over), Prince Mortis's grave-pennies, and the Lych Pool's three fish. Every charm plays
 * one of the court's own rules in your favour — the safety bell, the coffin lid, the mourners'
 * petals, the stonecutter's count. Scripts are registered below under their item ids.
 */

const ISLE = 'slime';

export const CHARM_BELL = 'grave-charm-safety-bell';
export const CHARM_NAIL = 'grave-charm-coffin-nail';
export const CHARM_CRAPE = 'grave-charm-mourners-crape';
export const CHARM_CHISEL = 'grave-charm-stonecutters-chisel';
export const ART_MORTIS = 'art-mortis';

export const FISH_BONEFISH = 'fish-lych-bonefish';
export const FISH_ROACH = 'fish-wraith-roach';
export const FISH_COFFIN = 'fish-coffinfish';
export const FISHERY = 'grave-pool';

const up = (f: Fighter) => alive(f);

// ── Safety Bell ──────────────────────────────────────────────────────
// A little bell on a cord round your wrist. When a hit leaves you under 40% health it rings (at
// most every 10s), and a grey ghost comes up beside you and drifts at your foe.

const safetyBell: ItemScriptFactory = (ctx: ItemScriptCtx) => {
  const ghosts: { x: number; y: number; born: number; seed: number }[] = [];
  let rangAt = -99999;
  const dt = ticker();
  return {
    onHitTaken() {
      const now = ctx.scene.time.now;
      const p = ctx.player;
      if (!up(p) || p.hp / Math.max(1, p.maxHp) >= 0.4 || now - rangAt < 10000) return;
      rangAt = now;
      ghosts.push({ x: p.x - 30, y: p.y + 10, born: now, seed: Math.random() * 6 });
      ctx.float(p.x, p.y - 50, 'THE BELL RINGS', '#b8f0d8');
      ctx.sfx('holy-chord');
    },
    update(time) {
      const step = dt(time);
      const n = ctx.npc;
      for (let i = ghosts.length - 1; i >= 0; i--) {
        const gh = ghosts[i];
        if (time - gh.born > 8000 || !up(n)) { ghosts.splice(i, 1); continue; }
        const d = Math.max(1, dist(gh.x, gh.y, n.x, n.y));
        gh.x += ((n.x - gh.x) / d) * 90 * step;
        gh.y += ((n.y - gh.y) / d) * 90 * step;
        if (d < 28) {
          ctx.hit(n, 14, n.x, n.y);
          ctx.float(n.x, n.y - 46, 'GRAVE-COLD', '#c9cfd3');
          ctx.sfx('frost-blast');
          ghosts.splice(i, 1);
        }
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (up(p)) {
        const swing = time - rangAt < 1500 ? Math.sin((time - rangAt) / 80) * 0.6 : 0;
        bell(g, p.x + 20, p.y - 12, 3, swing, BRONZE);
      }
      for (const gh of ghosts) greyedGhost(g, gh.x, gh.y, 0.8, clamp((8000 - (time - gh.born)) / 600, 0, 0.85), time, gh.seed, 0.9);
    },
  };
};

// ── Coffin Nail ──────────────────────────────────────────────────────
// Every hit you land drives a nail into a coffin lid that hangs over your foe. The fourth shuts
// it: stunned 0.6s and 10 damage. Go 3s without a hit and the nails work loose one by one.

const coffinNail: ItemScriptFactory = (ctx) => {
  let nails = 0;
  let lastHit = 0;
  let shutAt = -99999;
  return {
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || !up(ctx.npc) || !up(ctx.player)) return;
      lastHit = now;
      nails++;
      ctx.sfx('anvil');
      if (nails >= 4) {
        nails = 0;
        shutAt = now;
        ctx.stun(ctx.npc, 600);
        ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y - 30);
        ctx.float(ctx.npc.x, ctx.npc.y - 60, 'LID SHUT', '#e6dfc8');
        ctx.sfx('stone-slam');
      }
    },
    update(time) {
      if (nails > 0 && time - lastHit > 3000) { nails--; lastHit = time - 2200; }
    },
    drawAir(g, time) {
      const n = ctx.npc;
      if (!up(n)) return;
      const since = time - shutAt;
      if (since < 700) {
        const k = since / 700;
        coffin(g, n.x, n.y - 40 + k * 10, 54, 18, 0, 0, false);
        g.lineStyle(3, 0xe6dfc8, 1 - k); g.strokeCircle(n.x, n.y - 20, 30 + k * 30);
        return;
      }
      if (nails === 0) return;
      // The lid hanging over them, a nail for each hit.
      coffin(g, n.x, n.y - 58, 46, 14, 0, 0, false);
      for (let i = 0; i < 4; i++) {
        const x = n.x - 15 + i * 10;
        if (i < nails) { g.fillStyle(IRON_LIT, 1); g.fillCircle(x, n.y - 58, 2.2); g.lineStyle(1, IRON_LIT, 1); g.lineBetween(x, n.y - 58, x, n.y - 52); }
        else { g.lineStyle(1, IRON_LIT, 0.3); g.strokeCircle(x, n.y - 58, 2); }
      }
    },
  };
};

// ── Mourner's Crape ──────────────────────────────────────────────────
// A black crape ribbon. Each hit you take drops a rose petal where you stand (up to 6, 9s each).
// Walk back over one to gather it and heal 4 — a wake of your own to retreat along.

const mournersCrape: ItemScriptFactory = (ctx) => {
  const petals: { x: number; y: number; at: number; rot: number }[] = [];
  return {
    onHitTaken() {
      const p = ctx.player;
      if (!up(p)) return;
      if (petals.length >= 6) petals.shift();
      petals.push({ x: p.x + (Math.random() - 0.5) * 20, y: p.y + 8, at: ctx.scene.time.now + 500, rot: Math.random() * 6 });
    },
    update(time) {
      const p = ctx.player;
      for (let i = petals.length - 1; i >= 0; i--) {
        const pe = petals[i];
        if (time - pe.at > 9000) { petals.splice(i, 1); continue; }
        // A petal can be gathered half a second after it falls (so it is not taken the moment it drops).
        if (time >= pe.at && up(p) && dist(p.x, p.y, pe.x, pe.y) < 24) {
          ctx.heal(p, 4);
          ctx.flash(pe.x, pe.y, PETAL_LIT);
          petals.splice(i, 1);
        }
      }
    },
    drawGround(g, time) {
      for (const pe of petals) {
        const k = clamp(1 - (time - pe.at) / 9000, 0, 1);
        const ready = time >= pe.at;
        g.fillStyle(PETAL, (ready ? 0.9 : 0.5) * k); g.fillEllipse(pe.x, pe.y, 10, 6);
        g.fillStyle(PETAL_LIT, 0.7 * k); g.fillEllipse(pe.x + Math.cos(pe.rot) * 3, pe.y - 1, 6, 3);
        if (ready) { g.lineStyle(1, PETAL_LIT, 0.3 * k); g.strokeCircle(pe.x, pe.y, 12); }
      }
    },
  };
};

// ── Stonecutter's Chisel ─────────────────────────────────────────────
// A small headstone floats at your foe's shoulder, its count running down from 12 a second at a
// time; every hit you land chips one more off. At nought their grave erupts under them for 22.

const stonecuttersChisel: ItemScriptFactory = (ctx) => {
  let count = 12;
  let eruptAt = -99999;
  const dt = ticker();
  return {
    onHitDealt(amount) {
      if (amount < 2 || !up(ctx.npc)) return;
      count = Math.max(0.01, count - 1);
      ctx.sfx('stab');
    },
    update(time) {
      const step = dt(time);
      if (!up(ctx.npc) || !up(ctx.player)) return;
      count -= step;
      if (count <= 0) {
        count = 12;
        eruptAt = time;
        ctx.hit(ctx.npc, 22, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 56, 'HERE LIES', '#e2b462');
        ctx.sfx('quake');
      }
    },
    drawAir(g, time) {
      const n = ctx.npc;
      if (!up(n)) return;
      const x = n.x + 30, y = n.y - 40;
      g.fillStyle(SLAB_DARK, 1); g.fillRect(x - 11, y - 14, 22, 24);
      g.fillStyle(SLAB, 1); g.fillRect(x - 10, y - 14, 20, 23); g.fillEllipse(x, y - 14, 20, 12);
      g.fillStyle(SLAB_LIT, 0.8); g.fillRect(x - 10, y - 14, 2, 23);
      const hot = count < 3;
      carvedNumber(g, x, y - 3, Math.ceil(count), 10, hot ? (Math.floor(time / 150) % 2 ? 0xc04020 : 0x7a2a14) : SLAB_DARK, SLAB_LIT, 1);
      const ek = (time - eruptAt) / 700;
      if (ek >= 0 && ek < 1) {
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + ((i / 9) - 0.5) * 2;
          g.fillStyle(i % 3 ? 0x4a3524 : 0xe6dfc8, 1 - ek);
          g.fillCircle(n.x + Math.cos(a) * 70 * ek, n.y + 10 + Math.sin(a) * 70 * ek + 90 * ek * ek, 3.5);
        }
      }
    },
  };
};

// ── Mortis's Grave-Pennies ───────────────────────────────────────────
// If your foe stands still a second, rigor sets in: they take +25% damage until they move; still
// for 2.5s and they stiffen (stunned 0.5s, 12 damage). Once a fight, falling under 30% health,
// the pennies fall from your eyes: heal 30 over 3s and move 30% faster for 3s.

const gravePennies: ItemScriptFactory = (ctx) => {
  let lx = 0, ly = 0;
  let still = 0;
  let boostUntil = 0;
  let stiffAt = -99999;
  let fell = false;
  let fellAt = -99999;
  let healLeft = 0;
  let healAcc = 0;
  let primed = false;
  const dt = ticker();
  return {
    update(time) {
      const step = dt(time);
      const n = ctx.npc, p = ctx.player;
      if (!primed) { primed = true; lx = n.x; ly = n.y; }
      if (up(n) && up(p)) {
        const moved = dist(n.x, n.y, lx, ly);
        lx = n.x; ly = n.y;
        still = step > 0 && moved / step < 30 ? still + step : 0;
        if (still >= 1 && time >= boostUntil) { ctx.boostDamage(1.25, 250); boostUntil = time + 250; }
        if (still >= 2.5 && time - stiffAt > 3000) {
          stiffAt = time;
          still = 0;
          ctx.stun(n, 500);
          ctx.hit(n, 12, n.x, n.y);
          ctx.float(n.x, n.y - 50, 'RIGOR', '#c9cfd3');
          ctx.sfx('ice-shatter');
        }
      }
      if (!fell && up(p) && p.hp / Math.max(1, p.maxHp) < 0.3) {
        fell = true;
        fellAt = time;
        healLeft = 30;
        ctx.boostSpeed(1.3, 3000);
        ctx.float(p.x, p.y - 56, 'THE PENNIES FALL', '#e2b462');
        ctx.sfx('money');
      }
      if (healLeft > 0 && up(p)) {
        healAcc += step * 10;
        if (healAcc >= 2) { const h = Math.min(healLeft, 2); ctx.heal(p, h); healLeft -= h; healAcc -= 2; }
      }
    },
    drawGround(g) {
      const n = ctx.npc;
      if (!up(n) || still < 0.4) return;
      const k = clamp(still / 2.5, 0, 1);
      g.lineStyle(2 + k * 2, GREY_LIT, 0.25 + k * 0.5); g.strokeCircle(n.x, n.y + 4, 46 - k * 20);
    },
    drawAir(g, time) {
      const n = ctx.npc, p = ctx.player;
      if (up(n) && still >= 1) {
        // Two pennies hovering over the foe's eyes while rigor has them.
        for (const k of [-1, 1]) {
          g.fillStyle(BRONZE_DARK, 1); g.fillCircle(n.x + k * 7, n.y - 36, 4.5);
          g.fillStyle(BRONZE, 1); g.fillCircle(n.x + k * 7, n.y - 36, 3.8);
          g.fillStyle(BRONZE_LIT, 1); g.fillCircle(n.x + k * 7 - 1, n.y - 37, 1.3);
        }
        g.fillStyle(GREY, 0.2); g.fillCircle(n.x, n.y - 10, 24);
      }
      const since = time - fellAt;
      if (since < 1200 && up(p)) {
        const k = since / 1200;
        for (const s of [-1, 1]) {
          g.fillStyle(BRONZE, 1 - k); g.fillCircle(p.x + s * (7 + k * 20), p.y - 36 + k * 50 - Math.sin(k * Math.PI) * 20, 4);
        }
        glow(g, p.x, p.y - 20, 30, WISP, 0.05 * (1 - k), 3);
      }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const GRAVE_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_BELL, name: 'Safety Bell', emoji: '🔔', kind: 'charm', price: 380, isle: ISLE,
    flavor: 'The little bell off a grave-post in Toll\'s field, its cord cut. Lathe says it rang once. Lathe says a lot.',
    script: CHARM_BELL,
    scriptText: [
      'When a hit leaves you under 40% health, the bell rings (at most every 10s).',
      'A grey ghost rises beside you and drifts at your foe; its touch deals 14. It fades after 8s.',
    ],
  },
  {
    id: CHARM_NAIL, name: 'Coffin Nail', emoji: '📌', kind: 'charm', price: 560, isle: ISLE,
    flavor: 'A square iron nail from Lathe\'s own bench, bent once and straightened. Four of them hold any lid.',
    script: CHARM_NAIL,
    scriptText: [
      'Each hit you land drives a nail into a lid over your foe. The 4th shuts it: stunned 0.6s and 10 damage.',
      'Go 3s without landing a hit and the nails work loose, one at a time.',
    ],
  },
  {
    id: CHARM_CRAPE, name: 'Mourner\'s Crape', emoji: '🎗️', kind: 'charm', price: 720, isle: ISLE,
    flavor: 'A black crape ribbon with a dried rose pinned through it. The keeners wear them to every funeral but their own.',
    effect: { damageTakenMult: 0.98 },
    script: CHARM_CRAPE,
    scriptText: [
      'Each hit you take drops a rose petal where you stand (up to 6; each lasts 9s).',
      'Walk back over a petal to gather it and heal 4.',
    ],
  },
  {
    id: CHARM_CHISEL, name: 'Stonecutter\'s Chisel', emoji: '🪦', kind: 'charm', price: 940, isle: ISLE,
    flavor: 'Elegy\'s second-best chisel, the edge kept keen on her whetstone. It has cut forty dates this moon.',
    script: CHARM_CHISEL,
    scriptText: [
      'A headstone at your foe\'s shoulder counts down from 12, one a second; each hit you land chips 1 more off.',
      'At nought their grave erupts under them for 22, and the count starts again.',
    ],
  },
  {
    id: ART_MORTIS, name: 'Mortis\'s Grave-Pennies', emoji: '🪙', kind: 'artifact', isle: ISLE,
    flavor: 'Two bronze pennies the Prince laid on his own eyes. They are cold, and they do not warm in the hand.',
    effect: { maxHp: 15 },
    script: ART_MORTIS,
    scriptText: [
      'If your foe stands still for 1s, rigor sets in: they take +25% damage until they move.',
      'Still for 2.5s, they stiffen: stunned 0.5s and 12 damage.',
      'Once a fight, dropping under 30% health, the pennies fall: heal 30 over 3s and move 30% faster for 3s.',
    ],
  },
  {
    id: FISH_BONEFISH, name: 'Lych Bonefish', emoji: '🐟', kind: 'fish', sell: 24, isle: ISLE,
    flavor: 'A long pale fish so thin you can see its bones by lamplight. The gravediggers fry them on their spades.',
    effect: { regenPerSecond: 0.5 },
  },
  {
    id: FISH_ROACH, name: 'Wraith Roach', emoji: '🐠', kind: 'fish', sell: 34, isle: ISLE,
    flavor: 'A grey roach that swims under the lamps\' reflections and vanishes when you look straight at it.',
    effect: { dodgeChance: 0.03 },
  },
  {
    id: FISH_COFFIN, name: 'Coffinfish', emoji: '⚰️', kind: 'fish', sell: 82, isle: ISLE,
    flavor: 'Boxy, black, hinged at the jaw, found nosing round the drowned rows. Nobody admits to having eaten one.',
    effect: { damageTakenMult: 0.95 },
  },
];

export const GRAVE_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_BELL]: safetyBell,
  [CHARM_NAIL]: coffinNail,
  [CHARM_CRAPE]: mournersCrape,
  [CHARM_CHISEL]: stonecuttersChisel,
  [ART_MORTIS]: gravePennies,
};

export const GRAVE_SHOPS: ShopDef[] = [
  { id: 'grave-shop', name: 'Lathe & Daughter, Coffins & Comforts', stock: [CHARM_BELL, CHARM_NAIL, CHARM_CRAPE, CHARM_CHISEL], buys: true },
];

export const GRAVE_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Lych Pool', kind: 'blackwater' }];

export const GRAVE_FISH: FishDef[] = [
  { id: FISH_BONEFISH, fisheries: [FISHERY], weight: 6, fight: 2, size: [18, 44] },
  { id: FISH_ROACH, fisheries: [FISHERY], weight: 4, fight: 3, size: [14, 32] },
  { id: FISH_COFFIN, fisheries: [FISHERY], weight: 1, fight: 5, size: [40, 96] },
];
