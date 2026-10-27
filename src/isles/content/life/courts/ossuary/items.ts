import type Phaser from 'phaser';
import type {
  FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import { Clock, O, OCOL, alive, dist, drawBone, drawLily, drawMarrow, inTriangle, jit } from './util';

/**
 * The Ossuary Court's goods: four charms from Knell & Daughter, the bone-carvers on the Lily Road,
 * Prince Sinew's artifact, and the three fish that live in the Deep Marrow Well. Every charm is a
 * piece of the court's quiet trade in the dead — a spoon for the marrow, a wishbone, a trellis
 * pin, a funeral lily — and the artifact is the Rood itself.
 */

// ── Charm: Marrow Spoon ──────────────────────────────────────────────

/**
 * A long horn spoon for getting the last of the marrow out of a bone. Your hits knock gobs of
 * marrow-jelly out of the foe onto the floor nearby; walk over one to eat it and mend a little.
 * They spoil if you leave them.
 */
const marrowSpoon: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  const gobs: { x: number; y: number; at: number; seed: number; eaten: number }[] = [];
  let lastDrop = -9999;
  let now = 0;
  const LIFE = 7000;
  return {
    update(time: number) {
      clock.tick(time);
      now = time;
      const p = ctx.player;
      for (const gb of gobs) {
        if (gb.eaten > 0) continue;
        if (alive(p) && dist(p.x, p.y + 12, gb.x, gb.y) < 26) {
          gb.eaten = time;
          ctx.heal(p, 5);
          ctx.float(p.x, p.y - 44, '+5 MARROW', OCOL.marrow);
          ctx.sfx('slime-splat');
        }
      }
      for (let i = gobs.length - 1; i >= 0; i--) {
        const gb = gobs[i];
        if ((gb.eaten > 0 && time - gb.eaten > 300) || time - gb.at > LIFE) gobs.splice(i, 1);
      }
    },
    onHitDealt() {
      if (now - lastDrop < 1200 || gobs.length >= 4) return;
      lastDrop = now;
      const n = ctx.npc;
      const a = ctx.rng() * Math.PI * 2, d = 44 + ctx.rng() * 34;
      gobs.push({ x: Math.max(40, Math.min(ctx.W - 40, n.x + Math.cos(a) * d)), y: Math.max(110, Math.min(ctx.H - 30, n.y + 16 + Math.sin(a) * d * 0.6)), at: now, seed: ctx.rng() * 10, eaten: 0 });
    },
    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      for (const gb of gobs) {
        const age = (time - gb.at) / LIFE;
        const k = gb.eaten > 0 ? 1 - (time - gb.eaten) / 300 : Math.min(1, (time - gb.at) / 150);
        // A quivering gob, going grey as it spoils.
        drawMarrow(g, gb.x, gb.y, 11 * k, 7 * k, time / 1000, gb.seed, 0.7 - age * 0.6, Math.max(0, 1 - age * 0.5));
        if (age > 0.7 && Math.floor(time / 180) % 2 === 0) { g.lineStyle(1, O.marrowLit, 0.6); g.strokeEllipse(gb.x, gb.y, 30, 20); }
      }
    },
  };
};

// ── Charm: Wishbone ──────────────────────────────────────────────────

/**
 * A dried wishbone from a goose the Empress's kitchen sent down to be composted. Every fourteen
 * seconds it is whole again over your shoulder; the next hit you take snaps it, and whoever has
 * had the better of the last six seconds gets the long half. If that is you, it mends you and
 * quickens your step. If it is not, you are left holding the short end.
 */
const wishbone: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  const dealt: { at: number; n: number }[] = [];
  const taken: { at: number; n: number }[] = [];
  let readyAt = -1;
  let snappedAt = -9999;
  let won = false;
  let now = 0;
  const sum = (xs: { at: number; n: number }[]) => xs.reduce((a, b) => a + b.n, 0);
  return {
    update(time: number) {
      clock.tick(time);
      now = time;
      if (readyAt < 0) readyAt = time + 4000;
      while (dealt.length && time - dealt[0].at > 6000) dealt.shift();
      while (taken.length && time - taken[0].at > 6000) taken.shift();
    },
    onHitDealt(amount: number) { dealt.push({ at: now, n: amount }); },
    onHitTaken(amount: number) {
      taken.push({ at: now, n: amount });
      if (readyAt < 0 || now < readyAt) return;
      readyAt = now + 14000;
      snappedAt = now;
      won = sum(dealt) >= sum(taken);
      const p = ctx.player;
      ctx.sfx('snap-back');
      if (won) {
        ctx.heal(p, 14);
        ctx.boostSpeed(1.2, 1500);
        ctx.float(p.x, p.y - 50, 'THE LONG HALF', OCOL.green);
      } else ctx.float(p.x, p.y - 50, 'THE SHORT END', OCOL.red);
    },
    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      const p = ctx.player;
      const x = p.x - 24, y = p.y - 40;
      if (readyAt > 0 && time >= readyAt) {
        // Whole: a little V of bone bobbing over your shoulder.
        const b = Math.sin(time / 300) * 2;
        drawBone(g, x, y + b + 8, x - 6, y + b - 4, 2.2, O.bone, 1);
        drawBone(g, x, y + b + 8, x + 6, y + b - 4, 2.2, O.bone, 1);
        return;
      }
      const since = time - snappedAt;
      if (since < 900) {
        // Snapped: the two halves fly apart, one long, one short.
        const k = since / 900;
        drawBone(g, x - k * 14, y + 6 - k * 10, x - 6 - k * 18, y - 6 - k * 6, 2.2, won ? O.boneLit : O.boneShade, 1 - k);
        drawBone(g, x + k * 14, y + 6 + k * 12, x + 3 + k * 16, y + k * 16, 2.2, won ? O.boneShade : O.boneLit, 1 - k);
      }
    },
  };
};

// ── Charm: Trellis Pin ───────────────────────────────────────────────

/**
 * One of the sharpened finger-bones the Ossuary's gardeners pin the rose trellises with. Each hit
 * you land drives a bone stake into the floor where your foe stands (three at most). When the third
 * goes in, ligaments draw out between them — and snap tight a moment later. If the foe is still
 * standing inside the triangle, it closes on them.
 */
const trellisPin: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  let stakes: { x: number; y: number; at: number }[] = [];
  let drawAt = -1;
  let snapAt = -1;
  let snapped = -9999;
  let coolUntil = 0;
  let now = 0;
  return {
    update(time: number) {
      clock.tick(time);
      now = time;
      stakes = stakes.filter((s) => time - s.at < 9000 || drawAt > 0);
      if (snapAt > 0 && time >= snapAt) {
        const n = ctx.npc;
        const [a, b, c] = stakes;
        if (a && b && c && alive(n) && inTriangle(n.x, n.y, a.x, a.y, b.x, b.y, c.x, c.y)) {
          ctx.hit(n, 22, n.x, n.y);
          ctx.boostDamage(1.15, 2000);
          ctx.float(n.x, n.y - 50, 'TRELLISED', OCOL.sinew);
          ctx.sfx('whip');
        } else ctx.sfx('snap-back');
        snapped = time;
        stakes = [];
        drawAt = -1; snapAt = -1;
        coolUntil = time + 3000;
      }
    },
    onHitDealt() {
      if (drawAt > 0 || now < coolUntil) return;
      const n = ctx.npc;
      if (stakes.length >= 3) stakes.shift();
      stakes.push({ x: n.x, y: n.y + 14, at: now });
      ctx.sfx('stab');
      if (stakes.length === 3) {
        // Only a real triangle counts: three stakes in a heap don't trellis anything.
        const [a, b, c] = stakes;
        const area = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
        if (area > 1800) { drawAt = now; snapAt = now + 700; ctx.sfx('chain'); }
      }
    },
    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      if (drawAt > 0 && stakes.length === 3) {
        const k = Math.min(1, (time - drawAt) / 700);
        g.fillStyle(O.sinew, 0.06 + k * 0.12);
        g.fillTriangle(stakes[0].x, stakes[0].y, stakes[1].x, stakes[1].y, stakes[2].x, stakes[2].y);
        for (let i = 0; i < 3; i++) {
          const a = stakes[i], b = stakes[(i + 1) % 3];
          const sag = 14 * (1 - k);
          g.lineStyle(1.5 + k * 2, O.sinew, 0.5 + k * 0.4);
          g.beginPath(); g.moveTo(a.x, a.y - 16);
          for (let s = 1; s <= 8; s++) { const u = s / 8; g.lineTo(a.x + (b.x - a.x) * u, a.y - 16 + (b.y - a.y) * u + Math.sin(u * Math.PI) * sag); }
          g.strokePath();
        }
      }
      if (time - snapped < 300) {
        const f = 1 - (time - snapped) / 300;
        g.fillStyle(O.sinewLit, 0.3 * f); g.fillCircle(ctx.npc.x, ctx.npc.y, 40 * (1.3 - f));
      }
    },
    drawAir(g: Phaser.GameObjects.Graphics) {
      for (const s of stakes) {
        drawBone(g, s.x, s.y, s.x + 1, s.y - 20, 3.2, O.bone, 1);
        g.fillStyle(0x000000, 0.3); g.fillEllipse(s.x, s.y + 2, 12, 4);
      }
    },
  };
};

// ── Charm: Funeral Lily ──────────────────────────────────────────────

/**
 * A pressed white lily from the Long Beds. Every blow you take plants one at your feet (no more
 * than one every two seconds, three at a time). Four seconds later it opens: if you are standing
 * near it, its scent mends you; if you have wandered off, the scent drifts to the foe instead as
 * a grave-chill.
 */
const funeralLily: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  let lilies: { x: number; y: number; at: number; seed: number; done: boolean; doneAt: number; mended: boolean }[] = [];
  let lastPlant = -9999;
  let now = 0;
  const BLOOM = 4000;
  const NEAR = 90;
  return {
    update(time: number) {
      clock.tick(time);
      now = time;
      for (const l of lilies) {
        if (l.done || time - l.at < BLOOM) continue;
        l.done = true; l.doneAt = time;
        const p = ctx.player, n = ctx.npc;
        if (alive(p) && dist(p.x, p.y, l.x, l.y) < NEAR) {
          l.mended = true;
          ctx.heal(p, 8);
          ctx.float(l.x, l.y - 40, '+8 LILY', OCOL.lily);
          ctx.sfx('heal');
        } else if (alive(n)) {
          l.mended = false;
          ctx.hit(n, 9, n.x, n.y);
          ctx.float(n.x, n.y - 46, 'GRAVE-SCENT', OCOL.dusk);
          ctx.sfx('curse-cast');
        }
      }
      lilies = lilies.filter((l) => !l.done || time - l.doneAt < 900);
    },
    onHitTaken() {
      if (now - lastPlant < 2000 || lilies.filter((l) => !l.done).length >= 3) return;
      lastPlant = now;
      const p = ctx.player;
      lilies.push({ x: p.x + (ctx.rng() - 0.5) * 20, y: p.y + 18, at: now, seed: ctx.rng() * 10, done: false, doneAt: 0, mended: false });
      ctx.sfx('spore');
    },
    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      for (const l of lilies) {
        if (l.done) continue;
        const k = (time - l.at) / BLOOM;
        g.lineStyle(1, O.lily, 0.15 + k * 0.3); g.strokeCircle(l.x, l.y, NEAR);
        g.lineStyle(2, O.lily, 0.6);
        g.beginPath(); g.arc(l.x, l.y + 6, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
      }
    },
    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      for (const l of lilies) {
        if (!l.done) {
          const k = Math.min(1, (time - l.at) / BLOOM);
          drawLily(g, l.x, l.y, 4 + k * 5, k, Math.sin(time / 500 + l.seed) * 0.4);
          continue;
        }
        // The scent: a drift of white motes toward you, or a violet wisp toward the foe.
        const f = (time - l.doneAt) / 900;
        const tx = l.mended ? ctx.player.x : ctx.npc.x, ty = l.mended ? ctx.player.y : ctx.npc.y;
        for (let i = 0; i < 6; i++) {
          const u = Math.min(1, f * 1.4 - i * 0.05);
          if (u <= 0) continue;
          const x = l.x + (tx - l.x) * u + Math.sin(u * 6 + i) * 8, y = l.y - 20 + (ty - l.y + 20) * u - Math.sin(u * Math.PI) * 30;
          g.fillStyle(l.mended ? O.lily : O.dusk, 0.7 * (1 - f)); g.fillCircle(x, y, 2.5 + jit(l.seed, i) * 2);
        }
        drawLily(g, l.x, l.y, 9, 1, 0, 1 - f);
      }
    },
  };
};

// ── Artifact: The Rood ───────────────────────────────────────────────

/**
 * Prince Sinew's control cross, cut down. Every thirteen seconds its strings drop onto your foe
 * for four seconds, and while they hang, half of every blow the foe lands on you is pulled back
 * through the strings into their own body (up to 36 a time). The puppet hits itself.
 */
const rood: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  let next = -1;
  let from = 0;
  let until = 0;
  let bank = 0;
  let now = 0;
  let lastJerk = -9999;
  return {
    update(time: number) {
      clock.tick(time);
      now = time;
      if (next < 0) next = time + 6000;
      const n = ctx.npc;
      if (until === 0 && time >= next && alive(n)) {
        from = time; until = time + 4000; bank = 0;
        ctx.sfx('chain');
        ctx.float(n.x, n.y - 56, 'STRUNG', OCOL.sinew);
      }
      if (until > 0 && time >= until) { until = 0; next = time + 13000; ctx.sfx('snap-back'); }
    },
    onHitTaken(amount: number) {
      if (until === 0 || now >= until || bank >= 36) return;
      const back = Math.min(36 - bank, Math.max(1, Math.round(amount * 0.5)));
      bank += back;
      const n = ctx.npc;
      ctx.hit(n, back, n.x, n.y);
      ctx.float(n.x, n.y - 50, `THE PUPPET STRIKES ITSELF −${back}`, OCOL.sinew);
      lastJerk = now;
    },
    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      if (until === 0) return;
      const n = ctx.npc;
      const k = Math.min(1, (time - from) / 300);
      const cy = n.y - 120;
      const jerk = time - lastJerk < 200 ? Math.sin((time - lastJerk) / 20) * 6 : 0;
      // The cross over their head, and four strings down to them.
      g.fillStyle(O.timber, k); g.fillRect(n.x - 30, cy - 3 + jerk, 60, 6); g.fillRect(n.x - 3, cy - 16 + jerk, 6, 28);
      g.lineStyle(1.5, O.sinewLit, 0.9 * k);
      g.lineBetween(n.x - 28, cy + jerk, n.x - 20, n.y - 6);
      g.lineBetween(n.x + 28, cy + jerk, n.x + 20, n.y - 6);
      g.lineBetween(n.x, cy + 10 + jerk, n.x, n.y - 24);
      g.lineBetween(n.x - 10, cy + jerk, n.x - 8, n.y + 16);
      // The clock: the strings' remaining time as a shrinking bar on the crossbar.
      const left = (until - time) / 4000;
      g.fillStyle(O.sinewLit, 0.9); g.fillRect(n.x - 28, cy - 8 + jerk, 56 * left, 2);
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const OSSUARY_ITEMS: IsleItemDef[] = [
  {
    id: 'ossuary-marrow-spoon', name: 'Marrow Spoon', emoji: '🥄', kind: 'charm', price: 220, isle: 'life',
    flavor: 'A long horn spoon, worn thin at the bowl. In the Ossuary they say a spoon like this has fed three generations off one bone.',
    effect: { maxHp: 6 },
    script: 'ossuary-marrow-spoon',
    scriptText: ['Your hits knock gobs of marrow out onto the floor near the foe (one per 1.2s, 4 at most).', 'Walk over a gob to eat it: +5 HP. They spoil after 7s.'],
  },
  {
    id: 'ossuary-wishbone', name: 'Wishbone', emoji: '🦴', kind: 'charm', price: 310, isle: 'life',
    flavor: 'From a goose the Glasshouse kitchens sent down to be composted. Knell\'s daughter dried it on the chapel sill and made a wish. She won\'t say what.',
    effect: { dodgeChance: 0.02 },
    script: 'ossuary-wishbone',
    scriptText: ['Every 14s a wishbone forms; the next hit you take snaps it.', 'If you dealt at least as much as you took in the last 6s: +14 HP and +20% speed for 1.5s.'],
  },
  {
    id: 'ossuary-trellis-pin', name: 'Trellis Pin', emoji: '📌', kind: 'charm', price: 450, isle: 'life',
    flavor: 'A sharpened finger-bone, one of the thousands that pin the Ossuary\'s rose trellises. Nobody asks whose fingers.',
    effect: { critChance: 0.02 },
    script: 'ossuary-trellis-pin',
    scriptText: ['Each hit you land drives a bone stake where the foe stands (3 at most, 9s).', 'Three in a real triangle: ligaments snap tight after 0.7s — foe inside takes 22 and your hits land 15% harder for 2s.'],
  },
  {
    id: 'ossuary-funeral-lily', name: 'Funeral Lily', emoji: '🪷', kind: 'charm', price: 640, isle: 'life',
    flavor: 'Pressed from the Long Beds, where the soil is richest. The lilies there are the whitest on Thornwild, and everyone knows why.',
    effect: { damageTakenMult: 0.97 },
    script: 'ossuary-funeral-lily',
    scriptText: ['Taking a hit plants a lily at your feet (one per 2s, 3 at a time); it opens 4s later.', 'Near it when it opens: +8 HP. Wandered off: its grave-scent deals 9 to the foe instead.'],
  },
  {
    id: 'art-sinew', name: 'The Rood', emoji: '✝️', kind: 'artifact', isle: 'life',
    flavor: 'Prince Sinew\'s control cross, its ligaments cut. It still twitches when someone nearby lifts a hand in anger.',
    effect: { maxHp: 16, damageTakenMult: 0.96 },
    script: 'art-sinew',
    scriptText: ['Every 13s strings drop onto your foe for 4s.', 'While strung, half of every hit they land on you is dealt back to them (up to 36 per stringing).'],
  },
  {
    id: 'fish-marrow-lamprey', name: 'Marrow Lamprey', emoji: '🐍', kind: 'fish', sell: 22, isle: 'life',
    flavor: 'A pale eel with a round mouth of teeth that it fastens on the well\'s sunk bones. Rich, red-fleshed, and better not thought about.',
    effect: { lifestealFrac: 0.03 },
  },
  {
    id: 'fish-bonefish', name: 'Bonefish', emoji: '🐟', kind: 'fish', sell: 46, isle: 'life',
    flavor: 'So thin-fleshed you can count every rib through its sides. It grows its own armour of fine bone plates in the dark.',
    effect: { damageTakenMult: 0.95 },
  },
  {
    id: 'fish-reliquary-carp', name: 'Reliquary Carp', emoji: '🐠', kind: 'fish', sell: 88, isle: 'life',
    flavor: 'A great gold-scaled carp older than the court. The wellmen swear it swallowed a saint\'s knuckle, and it has been blessed ever since.',
    effect: { maxHp: 18 },
  },
];

export const OSSUARY_SCRIPTS: Record<string, ItemScriptFactory> = {
  'ossuary-marrow-spoon': marrowSpoon,
  'ossuary-wishbone': wishbone,
  'ossuary-trellis-pin': trellisPin,
  'ossuary-funeral-lily': funeralLily,
  'art-sinew': rood,
};

export const OSSUARY_SHOPS: ShopDef[] = [
  { id: 'ossuary-shop', name: 'Knell & Daughter, Bone-Carvers', stock: ['ossuary-marrow-spoon', 'ossuary-wishbone', 'ossuary-trellis-pin', 'ossuary-funeral-lily'], buys: true },
];

export const OSSUARY_FISHERIES: FisheryDef[] = [{ id: 'ossuary-well', name: 'The Deep Marrow Well', kind: 'abyss' }];

export const OSSUARY_FISH: FishDef[] = [
  { id: 'fish-marrow-lamprey', fisheries: ['ossuary-well'], weight: 8, fight: 2, size: [30, 70] },
  { id: 'fish-bonefish', fisheries: ['ossuary-well'], weight: 5, fight: 3, size: [24, 58] },
  { id: 'fish-reliquary-carp', fisheries: ['ossuary-well'], weight: 2, fight: 5, size: [60, 130] },
];
