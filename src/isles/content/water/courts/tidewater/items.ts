import type Phaser from 'phaser';
import type {
  BakeryDef, FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import { dim, glow } from '../../../../art/IsleArt';
import { bellBuoyBody } from './art';
import {
  BRASS, BRASS_DARK, BRASS_LIT, EBB, EBB_LIT, EBB_PEARL, FOAM, PAINT_CREAM, SEA, SEA_DEEP, SEA_LIT,
} from './palette';
import { alive, clamp, clock, dist } from './util';

/**
 * The Tidewater Court's goods: Gilly Barnacle's four charms, Prince Ebb's pearl, the two
 * tide-pool fish, the samphire and kelp salt Morwenna bakes with, and the Low-Tide Larder's four
 * meals. Every charm is something the sea left on the flats, and each plays one of the court's
 * own rules back in your favour — the tide's clock, the crab's grip, the buoy's toll, the
 * bottle's note. Scripts are registered below under their item ids.
 */

const ISLE = 'water';

// ── Ids ──────────────────────────────────────────────────────────────

export const SAMPHIRE = 'tidewater-samphire';
export const KELP_SALT = 'tidewater-kelp-salt';

export const CHARM_LOCKET = 'tidewater-charm-tide-locket';
export const CHARM_CLAW = 'tidewater-charm-crab-claw';
export const CHARM_CLAPPER = 'tidewater-charm-clapper';
export const CHARM_BOTTLE = 'tidewater-charm-corked-bottle';
export const ART_EBB = 'art-ebb';

export const FISH_BLENNY = 'fish-tidepool-blenny';
export const FISH_DAB = 'fish-sand-dab';
export const FISHERY = 'tidewater-pools';

export const FOOD_PASTY = 'tidewater-food-blenny-pasty';
export const FOOD_DAB = 'tidewater-food-dab-in-batter';
export const FOOD_STARGAZY = 'tidewater-food-stargazy-pie';
export const FOOD_CHOWDER = 'tidewater-food-low-tide-chowder';

export const RECIPE_PASTY = 'tidewater-recipe-blenny-pasty';
export const RECIPE_DAB = 'tidewater-recipe-dab-in-batter';
export const RECIPE_STARGAZY = 'tidewater-recipe-stargazy-pie';
export const RECIPE_CHOWDER = 'tidewater-recipe-low-tide-chowder';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Tide-Table Locket ────────────────────────────────────────────────
// A tide runs inside the locket: six seconds of flood (your hits land harder) and six of ebb
// (you mend). Your Q turns the tide at once — so you can hold the flood for the moment it counts.

const tideLocket: ItemScriptFactory = (ctx) => {
  const step = clock();
  const HALF = 6000;
  let flood = true;
  let turnAt = -1;
  let boostUntil = 0;
  let healAcc = 0;
  let turnFx = 0;
  const turn = (time: number, why: string) => {
    flood = !flood;
    turnAt = time + HALF;
    turnFx = time;
    ctx.float(ctx.player.x, ctx.player.y - 44, flood ? `FLOOD${why}` : `EBB${why}`, flood ? '#9fe6e8' : '#e2d1ab');
    ctx.sfx(flood ? 'water-jet' : 'splash');
  };
  return {
    update(time) {
      const dt = step(time);
      if (!live(ctx)) return;
      if (turnAt < 0) turnAt = time + HALF;
      if (time >= turnAt) turn(time, '');
      if (flood) {
        if (time >= boostUntil) { ctx.boostDamage(1.18, 300); boostUntil = time + 300; }
      } else {
        healAcc += dt * 1.6;
        if (healAcc >= 1) { ctx.heal(ctx.player, Math.floor(healAcc)); healAcc -= Math.floor(healAcc); }
      }
    },
    onCast(_id, slot) {
      if (slot === 'q' && live(ctx)) turn(ctx.scene.time.now, ' — TURNED');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 28, y = p.y - 30 + Math.sin(time / 360) * 2;
      const k = clamp(1 - (turnAt - time) / HALF, 0, 1);
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, 8);
      g.fillStyle(PAINT_CREAM, 1); g.fillCircle(x, y, 6);
      // The water inside the case rises on the flood, drains on the ebb.
      const lvl = flood ? k : 1 - k;
      g.fillStyle(flood ? SEA : SEA_LIT, 0.9); g.fillRect(x - 5, y + 5 - lvl * 10, 10, lvl * 10);
      g.lineStyle(1.5, BRASS, 1); g.strokeCircle(x, y, 7);
      g.lineStyle(1, BRASS, 1); g.lineBetween(x, y - 8, x + 4, y - 16);
      if (time - turnFx < 500) {
        const f = (time - turnFx) / 500;
        g.lineStyle(2, flood ? EBB_LIT : PAINT_CREAM, 1 - f); g.strokeCircle(p.x, p.y, 20 + f * 30);
      }
    },
  };
};

// ── Crabber's Claw ───────────────────────────────────────────────────
// Three hits inside 2.5s and the claw clamps on: it pinches the foe every half second for 4s,
// and while it holds, every blow you land lands harder. Then it lets go to rest for a while.

const crabClaw: ItemScriptFactory = (ctx) => {
  let hits: number[] = [];
  let holdUntil = 0;
  let readyAt = 0;
  let lastPinch = 0;
  let boostUntil = 0;
  return {
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || now < readyAt || now < holdUntil) return;
      hits = hits.filter((t) => now - t < 2500);
      hits.push(now);
      if (hits.length < 3) return;
      hits = [];
      holdUntil = now + 4000;
      readyAt = now + 12000;
      ctx.float(ctx.npc.x, ctx.npc.y - 44, 'CLAMPED', '#ff9a7a');
      ctx.sfx('trap-snap');
    },
    update(time) {
      if (time >= holdUntil || !foeLive(ctx)) return;
      if (time - lastPinch > 500) { lastPinch = time; ctx.hit(ctx.npc, 2, ctx.npc.x, ctx.npc.y + 12); }
      if (time >= boostUntil) { ctx.boostDamage(1.15, 250); boostUntil = time + 250; }
    },
    drawAir(g, time) {
      const now = time;
      if (now < holdUntil && foeLive(ctx)) {
        const n = ctx.npc;
        drawClaw(g, n.x + 12, n.y + 16 + Math.sin(time / 80) * 1.5, 1, true);
        return;
      }
      if (!live(ctx) || now < readyAt) return;
      const c = hits.filter((t) => now - t < 2500).length;
      for (let i = 0; i < 3; i++) {
        g.fillStyle(i < c ? 0xd2462e : 0x3a3030, 1);
        g.fillEllipse(ctx.player.x - 12 + i * 12, ctx.player.y - 46, 8, 5);
      }
    },
  };
};

function drawClaw(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, shut: boolean): void {
  g.fillStyle(0x7a2a1a, 1); g.fillEllipse(x, y, 12 * s, 9 * s);
  g.fillStyle(0xd2462e, 1); g.fillEllipse(x, y - 1, 10 * s, 7 * s);
  g.fillStyle(0xe8704a, 1);
  g.fillTriangle(x - 3 * s, y - 3 * s, x + 3 * s, y - 3 * s, x - 1 * s, y - (shut ? 9 : 13) * s);
  g.fillTriangle(x + 1 * s, y - 2 * s, x + 6 * s, y - 2 * s, x + 6 * s, y - (shut ? 8 : 12) * s);
}

// ── Bell-Buoy Clapper ────────────────────────────────────────────────
// The clapper swings back every nine seconds. Your next cast tolls it: a brass ring rolls out
// from you, and if it rings the foe they take a jolt and stand open — your damage up for a beat.

const clapper: ItemScriptFactory = (ctx) => {
  const EVERY = 9000;
  const R = 300;
  const RUN_MS = 900;
  let readyAt = 0;
  let toll: { x: number; y: number; at: number; hit: boolean } | null = null;
  let boostUntil = 0;
  let openUntil = 0;
  return {
    onCast() {
      const now = ctx.scene.time.now;
      if (!live(ctx) || now < readyAt || toll) return;
      readyAt = now + EVERY;
      toll = { x: ctx.player.x, y: ctx.player.y, at: now, hit: false };
      ctx.sfx('sonic-pulse');
    },
    update(time) {
      if (toll) {
        const r = ((time - toll.at) / RUN_MS) * R;
        if (!toll.hit && foeLive(ctx)) {
          const d = dist(toll.x, toll.y, ctx.npc.x, ctx.npc.y);
          if (Math.abs(d - r) < 22) {
            toll.hit = true;
            ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y);
            ctx.float(ctx.npc.x, ctx.npc.y - 44, 'RUNG', '#f2d58a');
            openUntil = time + 2500;
          }
        }
        if (time - toll.at > RUN_MS) toll = null;
      }
      if (time < openUntil && time >= boostUntil) { ctx.boostDamage(1.25, 250); boostUntil = time + 250; }
    },
    drawGround(g, time) {
      if (!toll) return;
      const k = (time - toll.at) / RUN_MS;
      g.lineStyle(14, BRASS, 0.18 * (1 - k)); g.strokeCircle(toll.x, toll.y, k * R);
      g.lineStyle(3, BRASS_LIT, 0.9 * (1 - k)); g.strokeCircle(toll.x, toll.y, k * R);
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const ready = time >= readyAt;
      bellBuoyBody(g, p.x + 26, p.y - 18, 0.32, Math.sin(time / (ready ? 140 : 400)) * (ready ? 0.9 : 0.2), 0);
      if (ready) glow(g, p.x + 26, p.y - 30, 12, BRASS_LIT, 0.08, 2);
      if (time < openUntil && foeLive(ctx)) {
        g.lineStyle(2, BRASS_LIT, 0.5 + Math.sin(time / 90) * 0.3); g.strokeCircle(ctx.npc.x, ctx.npc.y - 4, 28);
      }
    },
  };
};

// ── Corked Bottle ────────────────────────────────────────────────────
// Every fourteen seconds a bottle of your own washes up near you. Walk over it and read your
// note: you wrote them all yourself, so they are always good news.

type MyNote = 'harbour' | 'eight' | 'wind' | 'kraken';

const corkedBottle: ItemScriptFactory = (ctx) => {
  const EVERY = 14000;
  const LIFE = 7000;
  let nextAt = 0;
  let bottle: { x: number; y: number; at: number } | null = null;
  let kraken: { x: number; y: number; at: number; dealt: boolean } | null = null;
  return {
    update(time) {
      if (!live(ctx)) return;
      if (!nextAt) nextAt = time + 6000;
      if (!bottle && time >= nextAt) {
        nextAt = time + EVERY;
        const a = ctx.rng() * Math.PI * 2;
        bottle = {
          x: clamp(ctx.player.x + Math.cos(a) * 130, 60, ctx.W - 60),
          y: clamp(ctx.player.y + Math.sin(a) * 110, 130, ctx.H - 60),
          at: time,
        };
        ctx.sfx('bubble');
      }
      if (bottle && time - bottle.at > LIFE) bottle = null;
      if (bottle && dist(ctx.player.x, ctx.player.y, bottle.x, bottle.y) < 30) {
        bottle = null;
        ctx.sfx('crystal-shatter');
        const notes: MyNote[] = ['harbour', 'eight', 'wind', 'kraken'];
        const n = notes[Math.floor(ctx.rng() * notes.length)];
        const p = ctx.player;
        if (n === 'harbour') { ctx.heal(p, 14); ctx.float(p.x, p.y - 50, 'SAFE HARBOUR', '#9fe6e8'); }
        if (n === 'eight') { ctx.boostDamage(1.3, 5000); ctx.float(p.x, p.y - 50, 'PIECES OF EIGHT', '#f2d58a'); }
        if (n === 'wind') { ctx.boostSpeed(1.3, 5000); ctx.float(p.x, p.y - 50, 'FAIR WIND', '#a6e8c6'); }
        if (n === 'kraken' && foeLive(ctx)) {
          kraken = { x: ctx.npc.x, y: ctx.npc.y, at: time, dealt: false };
          ctx.float(p.x, p.y - 50, 'THE KRAKEN — FOR THEM', '#d68ab8');
        }
      }
      if (kraken && !kraken.dealt && time - kraken.at > 900) {
        kraken.dealt = true;
        if (foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, kraken.x, kraken.y) < 70) ctx.hit(ctx.npc, 16, ctx.npc.x, ctx.npc.y);
        ctx.sfx('stone-rise');
      }
      if (kraken && time - kraken.at > 1700) kraken = null;
    },
    drawGround(g, time) {
      if (bottle) {
        const k = (time - bottle.at) / LIFE;
        g.fillStyle(SEA, 0.35); g.fillEllipse(bottle.x, bottle.y + 6, 40, 12);
        g.lineStyle(1.5, FOAM, 0.6 * (1 - k)); g.strokeCircle(bottle.x, bottle.y, 30);
      }
      if (kraken && !kraken.dealt) {
        const k = (time - kraken.at) / 900;
        g.fillStyle(SEA_DEEP, 0.25 + k * 0.3); g.fillCircle(kraken.x, kraken.y, 70 * (0.5 + k * 0.5));
        g.lineStyle(2, 0xd68ab8, 0.8); g.strokeCircle(kraken.x, kraken.y, 70);
      }
    },
    drawAir(g, time) {
      if (bottle) {
        const bob = Math.sin(time / 200) * 2;
        g.fillStyle(0x4f9a5c, 0.9); g.fillRoundedRect(bottle.x - 5, bottle.y - 14 + bob, 10, 16, 3);
        g.fillStyle(PAINT_CREAM, 0.9); g.fillRect(bottle.x - 1, bottle.y - 10 + bob, 2, 8);
        g.fillStyle(0xb08a5a, 1); g.fillCircle(bottle.x, bottle.y - 17 + bob, 2.5);
      }
      if (kraken && kraken.dealt) {
        const f = clamp((time - kraken.at - 900) / 800, 0, 1);
        const h = Math.sin(f * Math.PI) * 90;
        for (let i = 0; i < 10; i++) {
          const t = i / 9;
          g.fillStyle(0x8a3a6a, 1); g.fillCircle(kraken.x + Math.sin(t * 3 + time / 140) * 12 * t, kraken.y - h * t, 12 * (1 - t * 0.7));
        }
      }
    },
  };
};

// ── Ebb's Slack-Water Pearl (artifact) ───────────────────────────────
// The pearl keeps a tide of its own round your feet. It rises while you go untouched — a tenth
// every second — and a hit drains a fifth of it. At high water, your next landed blow brings it
// all down: a breaker rolls off you at the foe, and the pearl empties to slack water.

const slackPearl: ItemScriptFactory = (ctx) => {
  const step = clock();
  let tide = 0;
  let wave: { x: number; y: number; a: number; at: number; dealt: boolean } | null = null;
  let fullFx = 0;
  const script: ItemScript = {
    update(time) {
      const dt = step(time);
      if (!live(ctx)) return;
      const was = tide;
      tide = Math.min(1, tide + dt / 10);
      if (was < 1 && tide >= 1) { fullFx = time; ctx.float(ctx.player.x, ctx.player.y - 50, 'HIGH WATER', '#9fe6e8'); ctx.sfx('water-jet'); }
      if (wave) {
        const r = ((time - wave.at) / 600) * 300;
        if (!wave.dealt && foeLive(ctx)) {
          const d = dist(wave.x, wave.y, ctx.npc.x, ctx.npc.y);
          let da = Math.atan2(ctx.npc.y - wave.y, ctx.npc.x - wave.x) - wave.a;
          da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
          if (da < 0.6 && d < r + 20 && d > r - 40) {
            wave.dealt = true;
            ctx.hit(ctx.npc, 22, ctx.npc.x, ctx.npc.y);
            ctx.flash(ctx.npc.x, ctx.npc.y, EBB_LIT);
          }
        }
        if (time - wave.at > 650) wave = null;
      }
    },
    onHitTaken(amount) {
      if (amount >= 2) tide = Math.max(0, tide - 0.2);
    },
    onHitDealt(amount) {
      if (amount < 2 || tide < 1 || !live(ctx) || !foeLive(ctx)) return;
      tide = 0;
      const p = ctx.player;
      wave = { x: p.x, y: p.y, a: Math.atan2(ctx.npc.y - p.y, ctx.npc.x - p.x), at: ctx.scene.time.now, dealt: false };
      ctx.float(p.x, p.y - 50, 'THE TIDE COMES DOWN', '#eef6f0');
      ctx.sfx('geyser');
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (tide > 0.02) {
        g.fillStyle(SEA, 0.18 + tide * 0.25); g.fillEllipse(p.x, p.y + 16, 30 + tide * 40, 10 + tide * 14);
        g.lineStyle(1.5, FOAM, 0.4 + tide * 0.4); g.strokeEllipse(p.x, p.y + 16, 30 + tide * 40 + Math.sin(time / 200) * 3, 10 + tide * 14);
      }
      if (time - fullFx < 600) {
        const k = (time - fullFx) / 600;
        g.lineStyle(3, EBB_LIT, 1 - k); g.strokeEllipse(p.x, p.y + 16, 70 + k * 40, 24 + k * 14);
      }
      if (wave) {
        const k = (time - wave.at) / 600;
        const r = k * 300;
        g.lineStyle(26, SEA, 0.5 * (1 - k));
        g.beginPath(); g.arc(wave.x, wave.y, Math.max(1, r), wave.a - 0.6, wave.a + 0.6, false); g.strokePath();
        g.lineStyle(6, FOAM, 0.9 * (1 - k));
        g.beginPath(); g.arc(wave.x, wave.y, Math.max(1, r + 10), wave.a - 0.6, wave.a + 0.6, false); g.strokePath();
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // The pearl rides over your shoulder, brightening as the tide climbs.
      const x = p.x + 24, y = p.y - 36 + Math.sin(time / 500) * 2;
      glow(g, x, y, 8 + tide * 10, EBB_LIT, 0.05 + tide * 0.06, 3);
      g.fillStyle(dim(EBB_PEARL, 0.25), 1); g.fillCircle(x, y, 5);
      g.fillStyle(EBB_PEARL, 1); g.fillCircle(x - 0.5, y - 0.5, 4.2);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(x - 1.8, y - 1.8, 1.4);
      g.lineStyle(2, tide >= 1 ? 0xffffff : EBB, 0.9);
      g.beginPath(); g.arc(x, y, 8, -Math.PI / 2, -Math.PI / 2 + tide * Math.PI * 2, false); g.strokePath();
    },
  };
  return script;
};

// ── Meals — The Low-Tide Larder ──────────────────────────────────────

/** Blenny Pasty: the crimped crust holds. The first time you fall under half health, you mend. */
const pasty: ItemScriptFactory = (ctx) => {
  let spent = false;
  return {
    onHitTaken() {
      const p = ctx.player;
      if (spent || !live(ctx) || p.hp > p.maxHp * 0.5) return;
      spent = true;
      ctx.heal(p, 16);
      ctx.float(p.x, p.y - 44, 'THE CRUST HOLDS', '#d9a05a');
      ctx.sfx('heal');
    },
  };
};

/** Dab in Batter: slippery. The first four hits you take each give 1s back on your last ability. */
const dabBatter: ItemScriptFactory = (ctx) => {
  let lastId: string | null = null;
  let left = 4;
  return {
    onCast(id) { lastId = id; },
    onHitTaken(amount) {
      if (!left || !lastId || amount < 3 || !live(ctx)) return;
      left--;
      ctx.refund(lastId, 1000);
      ctx.float(ctx.player.x, ctx.player.y - 40, 'SLIPPED', '#e2d1ab');
    },
  };
};

/** Stargazy Pie: every 10s the herring heads look up — for 2.5s your blows land 30% harder. */
const stargazy: ItemScriptFactory = (ctx) => {
  let nextAt = 0;
  let until = 0;
  return {
    update(time) {
      if (!live(ctx)) return;
      if (!nextAt) nextAt = time + 4000;
      if (time >= nextAt) {
        nextAt = time + 10000;
        until = time + 2500;
        ctx.boostDamage(1.3, 2500);
        ctx.sfx('sparkle');
      }
    },
    drawAir(g, time) {
      if (time >= until || !live(ctx)) return;
      const p = ctx.player;
      const tw = 0.6 + Math.sin(time / 70) * 0.4;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.35;
        g.lineStyle(1.5, BRASS_LIT, tw);
        g.lineBetween(p.x + Math.cos(a) * 30, p.y - 30 + Math.sin(a) * 30, p.x + Math.cos(a) * 38, p.y - 30 + Math.sin(a) * 38);
      }
      g.fillStyle(0xffffff, tw); g.fillCircle(p.x, p.y - 70, 2.5);
    },
  };
};

/** Low-Tide Chowder: a hit of 12 or more is softened — you get 5 of it back, at most every 4s. */
const chowder: ItemScriptFactory = (ctx) => {
  let readyAt = 0;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 12 || now < readyAt || !live(ctx)) return;
      readyAt = now + 4000;
      ctx.heal(ctx.player, 5);
      ctx.float(ctx.player.x, ctx.player.y - 40, 'WARM BELLY', '#f2d58a');
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const TIDEWATER_ITEMS: IsleItemDef[] = [
  // Materials.
  {
    id: SAMPHIRE, name: 'Marsh Samphire', emoji: '🌿', kind: 'material', price: 12, sell: 4, isle: ISLE,
    flavor: 'Sea asparagus picked off the creek banks at low water. Salty, crisp, and the only green thing on the flats.',
  },
  {
    id: KELP_SALT, name: 'Kelp Salt', emoji: '🧂', kind: 'material', price: 15, sell: 5, isle: ISLE,
    flavor: 'Kelp dried on Gilly\'s roof and ground with sea salt. Morwenna puts it in everything, including the tea.',
  },

  // Charms.
  {
    id: CHARM_LOCKET, name: 'Tide-Table Locket', emoji: '🧭', kind: 'charm', price: 190, isle: ISLE,
    flavor: 'A brass locket with a tide-table engraved inside the lid. Somebody\'s whole year of floods, kept close.',
    script: CHARM_LOCKET,
    scriptText: [
      'A tide runs in the locket: 6s of flood (+18% damage), then 6s of ebb (heal 1.6 HP/s).',
      'Casting your Q turns the tide at once.',
    ],
  },
  {
    id: CHARM_CLAW, name: 'Crabber\'s Claw', emoji: '🦀', kind: 'charm', price: 250, isle: ISLE,
    flavor: 'A shore crab\'s claw on a cord. Kip Dunwick swears it\'s still alive. Kip is probably right.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_CLAW,
    scriptText: [
      'Land 3 hits within 2.5s and the claw clamps the foe for 4s: 2 damage every 0.5s,',
      'and +15% damage from you while it holds. 12s before it clamps again.',
    ],
  },
  {
    id: CHARM_CLAPPER, name: 'Bell-Buoy Clapper', emoji: '🔔', kind: 'charm', price: 380, isle: ISLE,
    flavor: 'The clapper from a buoy that tolled for a house left under. It wants to ring for someone else now.',
    script: CHARM_CLAPPER,
    scriptText: [
      'Every 9s, your next cast tolls a brass ring out to 300px.',
      'A foe the ring passes takes 10 and stands open: +25% damage from you for 2.5s.',
    ],
  },
  {
    id: CHARM_BOTTLE, name: 'Corked Bottle', emoji: '🍾', kind: 'charm', price: 540, isle: ISLE,
    flavor: 'An empty bottle and a stub of pencil. Write yourself something nice and throw it in. It always comes back.',
    effect: { maxHp: 8 },
    script: CHARM_BOTTLE,
    scriptText: [
      'Every 14s a bottle of your own washes up near you (it lasts 7s). Walk over it to read your note:',
      'heal 14, +30% damage for 5s, +30% speed for 5s, or a kraken strikes the foe\'s spot for 16.',
    ],
  },

  // Artifact.
  {
    id: ART_EBB, name: 'Ebb\'s Slack-Water Pearl', emoji: '🦪', kind: 'artifact', isle: ISLE,
    flavor: 'The pearl from the Prince\'s staff. Hold it to your ear and you hear the flats at the turn of the tide.',
    effect: { maxHp: 15 },
    script: ART_EBB,
    scriptText: [
      'A tide rises round your feet while you go unhurt (full in 10s); each hit you take drains a fifth.',
      'At high water, your next landed hit brings a breaker down on the foe ahead of you: 22 damage.',
    ],
  },

  // Fish.
  {
    id: FISH_BLENNY, name: 'Tidepool Blenny', emoji: '🐟', kind: 'fish', sell: 9, isle: ISLE,
    flavor: 'A goggle-eyed little fish that lives in the tide pools and bites at anything, including toes.',
    effect: { shieldHp: 8 },
  },
  {
    id: FISH_DAB, name: 'Sand Dab', emoji: '🐠', kind: 'fish', sell: 16, isle: ISLE,
    flavor: 'Flat as a plate and the colour of wet sand. It lies under the flats and fights the line sideways.',
    effect: { speedMult: 1.03 },
  },

  // Meals — The Low-Tide Larder.
  {
    id: FOOD_PASTY, name: 'Blenny Pasty', emoji: '🥟', kind: 'food', sell: 22, isle: ISLE,
    flavor: 'Two blennies and a fistful of samphire in a crimped crust. Tidewater\'s lunch, eaten up a ladder.',
    effect: { shieldHp: 12 },
    script: FOOD_PASTY,
    scriptText: ['The first time you drop under half health, the crust holds: heal 16.'],
  },
  {
    id: FOOD_DAB, name: 'Dab in Batter', emoji: '🍤', kind: 'food', sell: 28, isle: ISLE,
    flavor: 'Sand dabs fried flat in kelp-salt batter. Slippery to hold, slippery to hit.',
    effect: { speedMult: 1.04 },
    script: FOOD_DAB,
    scriptText: ['The first 4 hits you take each give 1s back on the ability you cast last.'],
  },
  {
    id: FOOD_STARGAZY, name: 'Stargazy Pie', emoji: '🥧', kind: 'food', sell: 40, isle: ISLE,
    flavor: 'Brinehollow herring and a blenny baked with their heads poking through the crust, looking at the sky.',
    script: FOOD_STARGAZY,
    scriptText: ['Every 10s the pie stargazes: +30% damage for 2.5s.'],
  },
  {
    id: FOOD_CHOWDER, name: 'Low-Tide Chowder', emoji: '🍲', kind: 'food', sell: 46, isle: ISLE,
    flavor: 'Cod from the causeway, dab off the flats, kelp salt, and a crust of bread to wipe the bowl. Lasts all day.',
    effect: { regenPerSecond: 0.8 },
    script: FOOD_CHOWDER,
    scriptText: ['A hit of 12 or more gives you 5 back (at most every 4s).'],
  },
];

export const TIDEWATER_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_LOCKET]: tideLocket,
  [CHARM_CLAW]: crabClaw,
  [CHARM_CLAPPER]: clapper,
  [CHARM_BOTTLE]: corkedBottle,
  [ART_EBB]: slackPearl,
  [FOOD_PASTY]: pasty,
  [FOOD_DAB]: dabBatter,
  [FOOD_STARGAZY]: stargazy,
  [FOOD_CHOWDER]: chowder,
};

export const TIDEWATER_SHOPS: ShopDef[] = [
  {
    id: 'tidewater-shop',
    name: 'Gilly\'s Wrack & Sundries',
    stock: [CHARM_LOCKET, CHARM_CLAW, CHARM_CLAPPER, CHARM_BOTTLE, SAMPHIRE, KELP_SALT],
    buys: true,
  },
];

export const TIDEWATER_BAKERIES: BakeryDef[] = [{
  id: 'tidewater-larder',
  name: 'The Low-Tide Larder',
  recipes: [
    {
      id: RECIPE_PASTY, name: 'Blenny Pasty',
      inputs: [{ item: FISH_BLENNY, count: 2 }, { item: SAMPHIRE, count: 1 }], coins: 18, output: FOOD_PASTY,
    },
    {
      id: RECIPE_DAB, name: 'Dab in Batter',
      inputs: [{ item: FISH_DAB, count: 2 }, { item: KELP_SALT, count: 1 }], coins: 24, output: FOOD_DAB, makes: 2,
    },
    {
      id: RECIPE_STARGAZY, name: 'Stargazy Pie',
      inputs: [{ item: 'fish-brine-herring', count: 2 }, { item: FISH_BLENNY, count: 1 }, { item: SAMPHIRE, count: 1 }],
      coins: 30, output: FOOD_STARGAZY,
    },
    {
      id: RECIPE_CHOWDER, name: 'Low-Tide Chowder',
      inputs: [{ item: 'fish-gullet-cod', count: 1 }, { item: FISH_DAB, count: 1 }, { item: KELP_SALT, count: 1 }],
      coins: 36, output: FOOD_CHOWDER,
    },
  ],
}];

export const TIDEWATER_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Tide Pools', kind: 'pond' }];

export const TIDEWATER_FISH: FishDef[] = [
  { id: FISH_BLENNY, fisheries: [FISHERY], weight: 6, fight: 1, size: [6, 14] },
  { id: FISH_DAB, fisheries: [FISHERY], weight: 3, fight: 2, size: [14, 32] },
];
