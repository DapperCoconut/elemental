import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { candle, feather, heartJar, soulLantern, soulWisp } from './art';
import { BRASS, BRASS_DARK, CREPE, ECTO, FLAME, GOLD_LIT, IRON, MINE, SOUL, SOUL_LIT, WAX } from './palette';
import { alive, clamp, dist } from './util';

/**
 * The Lantern Court's goods: Wenna Lamplugh's four charms, Prince Wisp's lantern, and the Lantern
 * Lake's three fish. Every charm is a piece of the gorge's soul-work turned to your side — a caught
 * soul that takes a blow, the wick-trimmer's timing, the Psychopomp's weighing, the medium's silver
 * cord. Scripts are registered below under their item ids.
 */

const ISLE = 'light';

export const CHARM_SOUL = 'lantern-charm-caught-soul';
export const CHARM_SHEARS = 'lantern-charm-wick-shears';
export const CHARM_FEATHER = 'lantern-charm-truth-feather';
export const CHARM_CORD = 'lantern-charm-silver-cord';
export const ART_WISP = 'art-wisp';

export const FISH_LOACH = 'fish-wick-loach';
export const FISH_CARP = 'fish-soul-carp';
export const FISH_PIKE = 'fish-ghostlight-pike';
export const FISHERY = 'lantern-lake';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Caught Soul ──────────────────────────────────────────────────────
// A soul in a little tin lantern circles you. When a heavy blow lands on you, it flies out of its
// lantern at your foe and you are eased; twelve seconds later another is caught.

const caughtSoul: ItemScriptFactory = (ctx) => {
  const RECATCH = 12000;
  let readyAt = 0;
  let flight: { at: number; x: number; y: number } | null = null;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 8 || now < readyAt || !live(ctx) || !foeLive(ctx)) return;
      readyAt = now + RECATCH;
      flight = { at: now, x: ctx.player.x, y: ctx.player.y - 30 };
      ctx.heal(ctx.player, 5);
      ctx.sfx('wings');
    },
    update(time) {
      if (flight && time - flight.at >= 320) {
        if (foeLive(ctx)) { ctx.hit(ctx.npc, 14, ctx.npc.x, ctx.npc.y - 20); ctx.float(ctx.npc.x, ctx.npc.y - 50, 'THE SOUL STRIKES', '#bfe6ff'); }
        flight = null;
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const t = time / 1000;
      const a = t * 2;
      const lx = p.x + Math.cos(a) * 30, ly = p.y - 30 + Math.sin(a) * 10;
      const ready = time >= readyAt;
      soulLantern(g, lx, ly - 10, 0.6, ready ? 1 : 0, t);
      if (!ready && !flight) {
        g.lineStyle(1.5, SOUL, 0.5);
        g.beginPath(); g.arc(lx, ly, 9, -Math.PI / 2, -Math.PI / 2 + (1 - (readyAt - time) / RECATCH) * Math.PI * 2, false); g.strokePath();
      }
      if (flight) {
        const k = clamp((time - flight.at) / 320, 0, 1);
        const n = ctx.npc;
        const x = flight.x + (n.x - flight.x) * k, y = flight.y + (n.y - 20 - flight.y) * k - Math.sin(k * Math.PI) * 30;
        soulWisp(g, x, y, 8, t, SOUL_LIT, 1, true, Math.atan2(n.y - flight.y, n.x - flight.x));
      }
    },
  };
};

// ── Wick Shears ──────────────────────────────────────────────────────
// A candle burns at your shoulder over eight seconds; in its last two the flame flares tall. Cast
// while it flares to trim it: that ability's cooldown is cut and your next blows land harder. Let it
// gutter and it takes a second to relight.

const wickShears: ItemScriptFactory = (ctx) => {
  const BURN = 8000, FLARE = 2000, RELIGHT = 1000;
  let since = -1;
  let outUntil = 0;
  let trimFx = 0;
  const phase = (time: number) => (since < 0 ? 0 : time - since);
  return {
    update(time) {
      if (since < 0) since = time;
      if (time < outUntil) return;
      if (outUntil && time >= outUntil) { outUntil = 0; since = time; }
      if (phase(time) > BURN) { outUntil = time + RELIGHT; since = -1; }
    },
    onCast(abilityId) {
      const now = ctx.scene.time.now;
      if (now < outUntil || since < 0 || !live(ctx)) return;
      if (phase(now) < BURN - FLARE) return;
      ctx.refund(abilityId, 2000);
      ctx.boostDamage(1.4, 2000);
      since = now;
      trimFx = now;
      ctx.float(ctx.player.x, ctx.player.y - 56, 'TRIMMED', '#ffe2a0');
      ctx.sfx('snap-back');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 24, y = p.y - 26;
      const out = time < outUntil || since < 0;
      const k = out ? 0 : clamp(phase(time) / BURN, 0, 1);
      const flaring = !out && k > 1 - FLARE / BURN;
      g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y + 1, 14, 5);
      candle(g, x, y, 4 + (1 - k) * 12, 5, !out, time / 1000, WAX);
      if (flaring) {
        glow(g, x, y - 20, 18, FLAME, 0.08, 2);
        g.fillStyle(FLAME, 0.8); g.fillEllipse(x, y - (4 + (1 - k) * 12) - 12, 6, 16 + Math.sin(time / 50) * 3);
      }
      if (time - trimFx < 400) {
        const f = (time - trimFx) / 400;
        g.lineStyle(2, MINE, 1 - f); g.lineBetween(x - 8 - f * 6, y - 22, x + 8 + f * 6, y - 22);
      }
    },
  };
};

// ── Feather of Truth ─────────────────────────────────────────────────
// A little scale rides over your head and weighs what you do every ten seconds. Took more than you
// gave? You are eased by part of the difference. Gave a good deal more? A jaw of light snaps on your foe.

const truthFeather: ItemScriptFactory = (ctx) => {
  const EVERY = 10000;
  let dealt = 0, taken = 0;
  let nextAt = -1;
  let fx: { at: number; heavy: boolean } | null = null;
  return {
    onHitDealt(amount) { dealt += amount; },
    onHitTaken(amount) { taken += amount; },
    update(time) {
      if (nextAt < 0) nextAt = time + EVERY;
      if (time < nextAt) return;
      nextAt = time + EVERY;
      if (!live(ctx)) return;
      if (taken > dealt) {
        const heal = Math.round(Math.min(18, (taken - dealt) * 0.3));
        if (heal > 0) { ctx.heal(ctx.player, heal); ctx.float(ctx.player.x, ctx.player.y - 56, 'EASED', '#ffe2a0'); ctx.sfx('heal'); }
        fx = { at: time, heavy: false };
      } else if (dealt > taken + 5 && foeLive(ctx)) {
        ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 56, 'JUDGED', '#fff2c0');
        ctx.sfx('judgement');
        fx = { at: time, heavy: true };
      }
      dealt = 0; taken = 0;
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x, y = p.y - 62;
      const tilt = clamp((taken - dealt) / 60, -1, 1) * 0.35;
      g.lineStyle(2, BRASS, 1); g.lineBetween(x - Math.cos(tilt) * 14, y - Math.sin(tilt) * 14, x + Math.cos(tilt) * 14, y + Math.sin(tilt) * 14);
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, 2);
      feather(g, x - Math.cos(tilt) * 14 - 6, y - Math.sin(tilt) * 14 + 4, 12, -0.2, CREPE, 0.9);
      heartJar(g, x + Math.cos(tilt) * 14, y + Math.sin(tilt) * 14 + 8, 0.35, 0xd8505e, 0.5);
      if (fx && time - fx.at < 600 && foeLive(ctx)) {
        const k = (time - fx.at) / 600;
        const tx = fx.heavy ? ctx.npc.x : p.x, ty = fx.heavy ? ctx.npc.y : p.y;
        g.lineStyle(3 * (1 - k), fx.heavy ? GOLD_LIT : MINE, 1 - k); g.strokeCircle(tx, ty, 20 + k * 40);
      }
    },
  };
};

// ── Silver Cord ──────────────────────────────────────────────────────
// Every nine seconds your astral double steps out where you stand and stays four seconds. Each blow
// you land while it is out, it echoes with a soul-bolt from where it stands. When it fades, if you
// are back beside it, you rejoin it and are restored a little.

const silverCord: ItemScriptFactory = (ctx) => {
  const EVERY = 9000, OUT = 4000;
  let nextAt = -1;
  let dbl: { x: number; y: number; at: number } | null = null;
  let lastBolt = 0;
  let bolts: { x: number; y: number; at: number }[] = [];
  return {
    update(time) {
      if (nextAt < 0) nextAt = time + 3000;
      if (!dbl && time >= nextAt && live(ctx)) { dbl = { x: ctx.player.x, y: ctx.player.y, at: time }; ctx.sfx('portal'); }
      if (dbl && time - dbl.at >= OUT) {
        if (live(ctx) && dist(ctx.player.x, ctx.player.y, dbl.x, dbl.y) < 90) {
          ctx.heal(ctx.player, 8);
          ctx.float(ctx.player.x, ctx.player.y - 56, 'REJOINED', '#d8c8ff');
          ctx.sfx('heal');
        }
        dbl = null;
        nextAt = time + EVERY;
      }
      bolts = bolts.filter((b) => time - b.at < 260);
    },
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (!dbl || now - lastBolt < 400 || !foeLive(ctx)) return;
      lastBolt = now;
      ctx.hit(ctx.npc, 5, ctx.npc.x, ctx.npc.y - 10);
      bolts.push({ x: dbl.x, y: dbl.y - 20, at: now });
    },
    drawAir(g, time) {
      if (dbl && live(ctx)) {
        const left = clamp(1 - (time - dbl.at) / OUT, 0, 1);
        const p = ctx.player;
        // The double: a lilac copy of you, and the cord back to you.
        g.lineStyle(1.5, 0xe8eef8, 0.6); g.lineBetween(dbl.x, dbl.y - 12, p.x, p.y - 12);
        glow(g, dbl.x, dbl.y - 10, 30, ECTO, 0.06, 2);
        g.fillStyle(ECTO, 0.45); g.fillCircle(dbl.x, dbl.y - 10, 18);
        g.fillStyle(ECTO, 0.3); g.fillEllipse(dbl.x, dbl.y + 8, 22, 10);
        g.lineStyle(1.5, ECTO, 0.7);
        g.beginPath(); g.arc(dbl.x, dbl.y - 10, 24, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
        g.lineStyle(1, ECTO, 0.3); g.strokeCircle(dbl.x, dbl.y, 90);
      }
      for (const b of bolts) {
        if (!foeLive(ctx)) break;
        const k = (time - b.at) / 260;
        const n = ctx.npc;
        g.lineStyle(3 * (1 - k), ECTO, 1 - k); g.lineBetween(b.x, b.y, b.x + (n.x - b.x) * Math.min(1, k * 2), b.y + (n.y - 10 - b.y) * Math.min(1, k * 2));
      }
    },
  };
};

// ── Wisp's Hooded Lantern ────────────────────────────────────────────
// Every fifth blow you land catches a soul off your foe into the lantern (three at most). Take a solid
// blow while you carry them and they all fly out at your foe. Once a fight, near death, the lantern
// flares: you are restored and your foe is dazzled.

const hoodedLantern: ItemScriptFactory = (ctx) => {
  let hits = 0;
  let souls = 0;
  let flared = false;
  let healLeft = 0;
  let healAt = 0;
  let release: { at: number; n: number; x: number; y: number } | null = null;
  let flareFx = 0;
  return {
    onHitDealt(amount) {
      if (amount < 2 || !live(ctx)) return;
      hits++;
      if (hits % 5 === 0 && souls < 3) { souls++; ctx.sfx('sparkle'); }
    },
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (live(ctx) && amount >= 6 && souls > 0 && !release) {
        release = { at: now, n: souls, x: ctx.player.x, y: ctx.player.y - 30 };
        souls = 0;
        ctx.sfx('wings');
      }
      if (!flared && live(ctx) && ctx.player.hp < ctx.player.maxHp * 0.25) {
        flared = true;
        flareFx = now;
        healLeft = 24;
        healAt = now;
        if (foeLive(ctx)) ctx.stun(ctx.npc, 900);
        ctx.float(ctx.player.x, ctx.player.y - 60, 'THE LANTERN FLARES', '#e4f5ff');
        ctx.sfx('holy-chord');
      }
    },
    update(time) {
      if (release && time - release.at >= 360) {
        if (foeLive(ctx)) ctx.hit(ctx.npc, 7 * release.n, ctx.npc.x, ctx.npc.y - 20);
        release = null;
      }
      if (healLeft > 0 && time - healAt >= 250 && live(ctx)) {
        healAt = time;
        const h = Math.min(3, healLeft);
        healLeft -= h;
        ctx.heal(ctx.player, h);
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const t = time / 1000;
      // The little hooded lantern bobbing at your hip, its souls inside.
      const lx = p.x - 24, ly = p.y - 16 + Math.sin(t * 2) * 2;
      g.lineStyle(1, IRON, 1); g.lineBetween(lx, ly - 8, lx, ly - 2);
      soulLantern(g, lx, ly - 2, 0.7, souls > 0 ? 0.5 + souls * 0.17 : 0.15, t);
      for (let i = 0; i < souls; i++) {
        const a = t * 3 + (i / 3) * Math.PI * 2;
        g.fillStyle(SOUL_LIT, 0.9); g.fillCircle(lx + Math.cos(a) * 12, ly + 6 + Math.sin(a) * 4, 2);
      }
      if (release && foeLive(ctx)) {
        const k = clamp((time - release.at) / 360, 0, 1);
        const n = ctx.npc;
        for (let i = 0; i < release.n; i++) {
          const off = (i - (release.n - 1) / 2) * 0.6;
          const x = release.x + (n.x - release.x) * k + Math.cos(off + k * 3) * 14 * (1 - k);
          const y = release.y + (n.y - 20 - release.y) * k - Math.sin(k * Math.PI) * (20 + i * 10);
          soulWisp(g, x, y, 7, t + i, SOUL_LIT, 1, true, Math.atan2(n.y - release.y, n.x - release.x));
        }
      }
      if (time - flareFx < 900) {
        const k = (time - flareFx) / 900;
        g.lineStyle(4 * (1 - k), SOUL_LIT, 1 - k); g.strokeCircle(p.x, p.y, 30 + k * 120);
        g.fillStyle(0xffffff, 0.2 * (1 - k)); g.fillCircle(p.x, p.y, 40 + k * 60);
      }
    },
  };
};

export const LANTERN_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_SOUL, name: 'Caught Soul', emoji: '🏮', kind: 'charm', price: 520, isle: ISLE,
    flavor: 'A soul in a tin lantern the size of a thimble. Wenna won\'t say whose. "Somebody who wanted to be useful."',
    script: CHARM_SOUL,
    scriptText: [
      'A soul circles you. When a blow of 8+ lands on you, it flies at your foe for 14 and you heal 5.',
      'Another is caught 12s later.',
    ],
  },
  {
    id: CHARM_SHEARS, name: 'Wick Shears', emoji: '✂️', kind: 'charm', price: 680, isle: ISLE,
    flavor: 'Tobias\'s second-best trimming shears, the blades worn thin as a fingernail. They still cut a wick clean.',
    script: CHARM_SHEARS,
    scriptText: [
      'A candle burns at your shoulder over 8s; in its last 2s the flame flares.',
      'Cast while it flares to trim it: that ability\'s cooldown drops 2s and you deal +40% for 2s.',
      'Let it gutter and it takes 1s to relight.',
    ],
  },
  {
    id: CHARM_FEATHER, name: 'Feather of Truth', emoji: '🪶', kind: 'charm', price: 880, isle: ISLE,
    flavor: 'Moulted from the Psychopomp\'s scale. It weighs exactly nothing, which is the point of it.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_FEATHER,
    scriptText: [
      'Every 10s it weighs the damage you dealt against the damage you took.',
      'Took more: heal 30% of the difference (up to 18). Dealt 5+ more: a jaw of light strikes your foe for 10.',
    ],
  },
  {
    id: CHARM_CORD, name: 'Silver Cord', emoji: '🪢', kind: 'charm', price: 1150, isle: ISLE,
    flavor: 'A thread of the stuff that ties a soul to its body. Séance swears it\'s spare. Nobody believes Séance.',
    effect: { maxHp: 6 },
    script: CHARM_CORD,
    scriptText: [
      'Every 9s your astral double steps out where you stand for 4s.',
      'Each hit you land while it is out, it echoes a soul-bolt at your foe for 5 (at most every 0.4s).',
      'When it fades, stand within 90px of it to rejoin it and heal 8.',
    ],
  },
  {
    id: ART_WISP, name: 'Wisp\'s Hooded Lantern', emoji: '🪔', kind: 'artifact', isle: ISLE,
    flavor: 'The small lantern from the Columbarium\'s lowest niche. It was always empty. He gave it to you to fill.',
    effect: { maxHp: 14 },
    script: ART_WISP,
    scriptText: [
      'Every 5th hit you land catches a soul (3 at most). Taking a hit of 6+ sends them all at your foe, 7 each.',
      'Once a fight, dropping under 25% health, the lantern flares: heal 24 over 2s and stun your foe 0.9s.',
    ],
  },
  {
    id: FISH_LOACH, name: 'Wick Loach', emoji: '🐟', kind: 'fish', sell: 26, isle: ISLE,
    flavor: 'A thin grey loach that nibbles the wax drips off the paper boats. Tastes faintly of candles.',
    effect: { regenPerSecond: 0.5 },
  },
  {
    id: FISH_CARP, name: 'Soul Carp', emoji: '🐠', kind: 'fish', sell: 46, isle: ISLE,
    flavor: 'A big pale carp with a light in its belly. The old folk say it carries the lanterns\' drips down into the dark.',
    effect: { shieldHp: 6 },
  },
  {
    id: FISH_PIKE, name: 'Ghostlight Pike', emoji: '🐡', kind: 'fish', sell: 94, isle: ISLE,
    flavor: 'You can see its bones through it, glowing. It hunts the lanterns that fall in, and never misses one.',
    effect: { damageMult: 1.04 },
  },
];

export const LANTERN_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_SOUL]: caughtSoul,
  [CHARM_SHEARS]: wickShears,
  [CHARM_FEATHER]: truthFeather,
  [CHARM_CORD]: silverCord,
  [ART_WISP]: hoodedLantern,
};

export const LANTERN_SHOPS: ShopDef[] = [
  { id: 'lantern-shop', name: 'Lamplugh\'s Lanterns & Wicks', stock: [CHARM_SOUL, CHARM_SHEARS, CHARM_FEATHER, CHARM_CORD], buys: true },
];

export const LANTERN_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Lantern Lake', kind: 'lethe' }];

export const LANTERN_FISH: FishDef[] = [
  { id: FISH_LOACH, fisheries: [FISHERY], weight: 6, fight: 2, size: [8, 22] },
  { id: FISH_CARP, fisheries: [FISHERY], weight: 3, fight: 3, size: [24, 62] },
  { id: FISH_PIKE, fisheries: [FISHERY], weight: 1, fight: 5, size: [50, 112] },
];
