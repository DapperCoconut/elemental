import type { BakeryDef, FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, Pt, ShopDef } from '../../../../IslesTypes';
import { glow, mixC } from '../../../../art/IsleArt';
import { awningCanvas, glint, mirrorPost } from './art';
import { BEAM, BEAM_HOT, BRASS, BRASS_DARK, DUSK, GLASS, GOLD, GOLD_LIT, LUMEN, MADDER, CANVAS, PRISM_BLUE, SPECTRUM } from './palette';
import { alive, clamp, dist, segDist } from './util';

/**
 * The Noon Court's goods: Ottavia Squint's four charms, Prince Lumen's prism, the reflecting
 * pool's three fish, and the Sunrise Bun's bakes. Every charm is a piece of the court's own
 * light turned to your use — a smoked lens, a pocket burning-glass, a signal mirror, the tassel
 * off a licensed awning. Scripts are registered below under their item ids.
 */

const ISLE = 'light';

export const CHARM_SPECS = 'noon-charm-smoked-specs';
export const CHARM_LENS = 'noon-charm-pocket-glass';
export const CHARM_SIGNAL = 'noon-charm-signal-mirror';
export const CHARM_TASSEL = 'noon-charm-awning-tassel';
export const ART_LUMEN = 'art-lumen';

export const FISH_BREAM = 'fish-blaze-bream';
export const FISH_GOBY = 'fish-glare-goby';
export const FISH_KOI = 'fish-zenith-koi';
export const FISHERY = 'noon-pool';

export const FLOUR = 'noon-flour';
export const FOOD_BUN = 'noon-food-sunrise-bun';
export const FOOD_BLOOMER = 'noon-food-blaze-bloomer';
export const FOOD_GLAZE = 'noon-food-goby-glaze';
export const FOOD_CROUTE = 'noon-food-zenith-croute';
export const BAKERY_ID = 'noon-bun';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Smoked Spectacles ────────────────────────────────────────────────
// Every blow you take darkens the lenses a shade (up to four). While they are smoked you can
// see through the glare: each hit you land spends a shade for 6 extra damage. Left alone 4s,
// the shades lift one a second.

const specs: ItemScriptFactory = (ctx) => {
  let shades = 0;
  let lastTaken = -9999;
  let lastShade = -9999;
  let lastFade = 0;
  let spendFx = -9999;
  return {
    update(time) {
      if (shades > 0 && time - lastTaken > 4000 && time - lastFade > 1000) { shades--; lastFade = time; }
    },
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 1 || now - lastShade < 450) return;
      lastShade = now; lastTaken = now;
      shades = Math.min(4, shades + 1);
    },
    onHitDealt(amount) {
      if (amount < 2 || shades <= 0 || !foeLive(ctx)) return;
      shades--;
      spendFx = ctx.scene.time.now;
      ctx.hit(ctx.npc, 6, ctx.npc.x, ctx.npc.y - 20);
      ctx.float(ctx.npc.x, ctx.npc.y - 50, 'THROUGH THE GLARE', '#c8d0d8');
      ctx.sfx('hit-light');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x, y = p.y - 30;
      const tint = mixC(0xdcf2fb, 0x3a4048, shades / 4);
      for (const k of [-1, 1]) {
        g.fillStyle(tint, 0.85); g.fillCircle(x + k * 7, y, 5.5);
        g.lineStyle(1.5, GOLD, 1); g.strokeCircle(x + k * 7, y, 5.5);
        g.fillStyle(0xffffff, 0.6); g.fillCircle(x + k * 7 - 2, y - 2, 1.4);
      }
      g.lineStyle(1.5, GOLD, 1); g.lineBetween(x - 1.5, y - 1, x + 1.5, y - 1);
      for (let i = 0; i < shades; i++) { g.fillStyle(0x3a4048, 0.9); g.fillCircle(x - 6 + i * 4, y + 10, 1.5); }
      if (time - spendFx < 300) glint(g, ctx.npc.x, ctx.npc.y - 20, 14 * (1 - (time - spendFx) / 300), 0.9);
    },
  };
};

// ── Pocket Burning Glass ─────────────────────────────────────────────
// A palm-sized lens hangs at your shoulder and throws a focus spot that creeps after your foe,
// slower than they walk. Hold it on them 1.6s and it scorches: 12 damage, then it starts again
// from your feet.

const pocketGlass: ItemScriptFactory = (ctx) => {
  const spot: Pt = { x: 0, y: 0 };
  let init = false;
  let heat = 0;
  let restUntil = 0;
  let burnFx = -9999;
  return {
    update(time, dt) {
      if (!live(ctx)) return;
      const p = ctx.player, n = ctx.npc;
      if (!init) { init = true; spot.x = p.x; spot.y = p.y; }
      const step = clamp(dt, 0, 0.1);
      if (time < restUntil || !foeLive(ctx)) { spot.x = p.x; spot.y = p.y + 10; heat = 0; return; }
      const d = dist(spot.x, spot.y, n.x, n.y);
      if (d > 1) { const s = Math.min(d, 95 * step); spot.x += ((n.x - spot.x) / d) * s; spot.y += ((n.y - spot.y) / d) * s; }
      heat = d < 30 ? Math.min(1, heat + step / 1.6) : Math.max(0, heat - step * 0.5);
      if (heat >= 1) {
        heat = 0; restUntil = time + 1200; burnFx = time;
        ctx.hit(n, 12, n.x, n.y);
        ctx.float(n.x, n.y - 50, 'FOCUSED', '#ffffff');
        ctx.sfx('sizzle');
      }
    },
    drawGround(g, time) {
      if (!live(ctx) || !init) return;
      const c = mixC(GOLD, 0xffffff, heat);
      g.fillStyle(c, 0.18 + heat * 0.3); g.fillEllipse(spot.x, spot.y, 34, 20);
      g.fillStyle(0xffffff, 0.2 + heat * 0.6); g.fillEllipse(spot.x, spot.y, 8 + heat * 10, 5 + heat * 6);
      if (time - burnFx < 400) { const k = (time - burnFx) / 400; g.lineStyle(3 * (1 - k), 0xffffff, 1 - k); g.strokeEllipse(ctx.npc.x, ctx.npc.y, 40 + k * 50, 24 + k * 30); }
    },
    drawAir(g) {
      if (!live(ctx) || !init) return;
      const p = ctx.player;
      const lx = p.x + 24, ly = p.y - 40;
      g.fillStyle(BEAM, 0.06 + heat * 0.12); g.fillTriangle(lx - 8, ly, lx + 8, ly, spot.x, spot.y);
      g.fillStyle(BRASS_DARK, 1); g.fillEllipse(lx, ly, 20, 10);
      g.fillStyle(GLASS, 1); g.fillEllipse(lx, ly - 1, 15, 7);
      g.fillStyle(0xffffff, 0.8); g.fillEllipse(lx - 3, ly - 2, 5, 2);
      g.lineStyle(1.5, BRASS, 1); g.lineBetween(lx + 9, ly + 1, lx + 15, ly + 8);
    },
  };
};

// ── Signal Mirror ────────────────────────────────────────────────────
// Every 6s you plant a little mirror-post where you stand, and a live link of light runs from it
// to you wherever you go. A foe who crosses the link is dazzled: 8 damage and a 0.5s stun (at
// most every 3s). Lead them across it.

const signalMirror: ItemScriptFactory = (ctx) => {
  let post: Pt | null = null;
  let nextPlant = 0;
  let dazzleCd = 0;
  let flashFx = -9999;
  return {
    update(time) {
      if (!live(ctx)) return;
      const p = ctx.player, n = ctx.npc;
      if (time >= nextPlant) { nextPlant = time + 6000; post = { x: p.x, y: p.y }; ctx.sfx('crystal-chime'); }
      if (!post || !foeLive(ctx) || time < dazzleCd) return;
      if (dist(post.x, post.y, p.x, p.y) < 40) return;
      if (segDist(n.x, n.y, post.x, post.y, p.x, p.y) < 18) {
        dazzleCd = time + 3000; flashFx = time;
        ctx.hit(n, 8, n.x, n.y);
        ctx.stun(n, 500);
        ctx.float(n.x, n.y - 50, 'DAZZLED', '#ffffff');
        ctx.sfx('zap');
      }
    },
    drawGround(g) {
      if (!post || !live(ctx)) return;
      const p = ctx.player;
      g.lineStyle(10, BEAM, 0.12); g.lineBetween(post.x, post.y, p.x, p.y);
    },
    drawAir(g, time) {
      if (!post || !live(ctx)) return;
      const p = ctx.player;
      const fl = clamp(1 - (time - flashFx) / 300, 0, 1);
      mirrorPost(g, post.x, post.y, Math.atan2(p.y - post.y, p.x - post.x), 0.6, fl);
      const far = dist(post.x, post.y, p.x, p.y) >= 40;
      g.lineStyle(3, BEAM_HOT, far ? 0.7 : 0.2); g.lineBetween(post.x, post.y - 32, p.x, p.y - 10);
      g.lineStyle(1, 0xffffff, far ? 0.9 : 0.3); g.lineBetween(post.x, post.y - 32, p.x, p.y - 10);
      const t = (time / 300) % 1;
      g.fillStyle(0xffffff, 0.9); g.fillCircle(post.x + (p.x - post.x) * t, post.y - 32 + (p.y - 10 - post.y + 32) * t, 2);
    },
  };
};

// ── Awning Tassel ────────────────────────────────────────────────────
// Stand still 1.2s and you pitch a little licensed awning over yourself. Under it you heal 1.5
// a second. If your foe steps under it, it comes down on them: 12 damage and a 0.4s stun. Walk
// out from under it and it folds. Pitching again takes 6s after a drop, 2s after a fold.

const tassel: ItemScriptFactory = (ctx) => {
  const AW = 120, AH = 86;
  let anchor: Pt = { x: 0, y: 0 };
  let stillSince = 0;
  let aw: Pt | null = null;
  let pitchedAt = 0;
  let readyAt = 0;
  let healAcc = 0;
  let dropFx: { x: number; y: number; at: number } | null = null;
  const under = (a: Pt, x: number, y: number, m = 0) => Math.abs(x - a.x) < AW / 2 + m && Math.abs(y - a.y) < AH / 2 + m;
  return {
    update(time, dt) {
      if (!live(ctx)) return;
      const p = ctx.player, n = ctx.npc;
      if (dist(anchor.x, anchor.y, p.x, p.y) > 12) { anchor = { x: p.x, y: p.y }; stillSince = time; }
      if (!aw && time >= readyAt && time - stillSince > 1200) { aw = { x: p.x, y: p.y }; pitchedAt = time; ctx.sfx('whoosh'); }
      if (!aw) return;
      if (!under(aw, p.x, p.y, 10)) { aw = null; readyAt = time + 2000; return; }
      healAcc += 1.5 * clamp(dt, 0, 0.1);
      if (healAcc >= 1) { const h = Math.floor(healAcc); healAcc -= h; ctx.heal(p, h); }
      if (foeLive(ctx) && under(aw, n.x, n.y)) {
        dropFx = { x: aw.x, y: aw.y, at: time };
        aw = null; readyAt = time + 6000;
        ctx.hit(n, 12, n.x, n.y);
        ctx.stun(n, 400);
        ctx.float(n.x, n.y - 50, 'UNDER THE CANVAS', '#f0e2c4');
        ctx.sfx('trap-snap');
      }
    },
    drawGround(g) {
      if (!aw) return;
      g.fillStyle(DUSK, 0.2); g.fillRect(aw.x - AW / 2, aw.y - AH / 2, AW, AH);
    },
    drawAir(g, time) {
      if (dropFx && time - dropFx.at < 600) {
        const k = (time - dropFx.at) / 600;
        awningCanvas(g, dropFx.x, dropFx.y - 30 * (1 - k), AW, AH * 0.9, 1 - k, 10, [MADDER, CANVAS]);
      }
      if (!aw) return;
      const k = clamp((time - pitchedAt) / 300, 0, 1);
      const lift = 34 * k;
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const fx = aw.x + dx * (AW / 2 - 6), fy = aw.y + dy * (AH / 2 - 4);
        g.lineStyle(2.5, BRASS_DARK, 1); g.lineBetween(fx, fy, fx, fy - lift);
      }
      awningCanvas(g, aw.x, aw.y - lift, AW, AH, 0.92, 3, [MADDER, CANVAS]);
      // The tassel itself, swinging from the front corner.
      const sw = Math.sin(time / 300) * 4;
      g.lineStyle(1.5, GOLD, 1); g.lineBetween(aw.x - AW / 2, aw.y - lift + AH / 2, aw.x - AW / 2 + sw, aw.y - lift + AH / 2 + 14);
      g.fillStyle(GOLD_LIT, 1); g.fillTriangle(aw.x - AW / 2 + sw - 4, aw.y - lift + AH / 2 + 22, aw.x - AW / 2 + sw + 4, aw.y - lift + AH / 2 + 22, aw.x - AW / 2 + sw, aw.y - lift + AH / 2 + 12);
    },
  };
};

// ── Lumen's Prism (artifact) ─────────────────────────────────────────
// Every 5th hit you land splits through the prism into three rays at the foe: red burns 8,
// gold heals you 5, violet stuns them 0.35s. Once a fight, dropping under 30% health, you leave
// an afterimage and flicker 160px away from the foe, healing 22 over 2s; 0.6s later the
// afterimage fires a beam into them for 10.

const lumensPrism: ItemScriptFactory = (ctx) => {
  let hits = 0;
  let rayFx = -9999;
  let rayA = 0;
  let used = false;
  let image: { x: number; y: number; at: number; fired: boolean } | null = null;
  let healLeft = 0;
  let healAcc = 0;
  return {
    onHitDealt(amount) {
      if (amount < 2 || !foeLive(ctx) || !live(ctx)) return;
      hits++;
      if (hits % 5 !== 0) return;
      const p = ctx.player, n = ctx.npc;
      rayFx = ctx.scene.time.now;
      rayA = Math.atan2(n.y - p.y, n.x - p.x);
      ctx.hit(n, 8, n.x, n.y);
      ctx.heal(p, 5);
      ctx.stun(n, 350);
      ctx.float(n.x, n.y - 52, 'SPECTRUM', '#8ad8ff');
      ctx.sfx('prism');
    },
    update(time, dt) {
      if (!live(ctx)) return;
      const p = ctx.player, n = ctx.npc;
      if (!used && p.hp < p.maxHp * 0.3) {
        used = true;
        image = { x: p.x, y: p.y, at: time, fired: false };
        const a = foeLive(ctx) ? Math.atan2(p.y - n.y, p.x - n.x) : 0;
        ctx.nudge(p, Math.cos(a) * 160, Math.sin(a) * 160);
        healLeft = 22; healAcc = 0;
        ctx.float(p.x, p.y - 50, 'AFTERIMAGE', '#fff0a4');
        ctx.sfx('blink');
      }
      if (healLeft > 0) {
        healAcc += 11 * clamp(dt, 0, 0.1);
        if (healAcc >= 1) { const h = Math.min(healLeft, Math.floor(healAcc)); healAcc -= h; healLeft -= h; ctx.heal(p, h); }
      }
      if (image && !image.fired && time - image.at > 600) {
        image.fired = true;
        if (foeLive(ctx)) { ctx.hit(n, 10, n.x, n.y); ctx.flash(n.x, n.y, 0xffffff); ctx.sfx('light-beam'); }
      }
      if (image && time - image.at > 1100) image = null;
    },
    drawAir(g, time) {
      const p = ctx.player, n = ctx.npc;
      if (time - rayFx < 320 && foeLive(ctx)) {
        const k = (time - rayFx) / 320;
        const cols = [SPECTRUM[0], GOLD_LIT, SPECTRUM[6]];
        cols.forEach((c, i) => {
          const a = rayA + (i - 1) * 0.12;
          const len = dist(p.x, p.y, n.x, n.y) + 30;
          g.lineStyle(5 * (1 - k) + 1, c, 1 - k); g.lineBetween(p.x, p.y - 12, p.x + Math.cos(a) * len, p.y - 12 + Math.sin(a) * len);
        });
        g.fillStyle(PRISM_BLUE, 1 - k); g.fillTriangle(p.x - 7, p.y - 6, p.x + 7, p.y - 6, p.x, p.y - 20);
      }
      if (image) {
        const k = clamp((time - image.at) / 1100, 0, 1);
        glow(g, image.x, image.y, 30, LUMEN, 0.07 * (1 - k), 3);
        g.lineStyle(2, LUMEN, 0.8 * (1 - k)); g.strokeCircle(image.x, image.y, 22);
        if (image.fired && foeLive(ctx) && time - image.at < 900) {
          const f = (time - image.at - 600) / 300;
          g.lineStyle(8 * (1 - f), 0xffffff, 1 - f); g.lineBetween(image.x, image.y, n.x, n.y);
        }
      }
    },
  };
};

// ── Goby Glaze (a meal) ──────────────────────────────────────────────
// Every 8s a glint gathers on the glaze: your next hit dazzles the foe for 0.3s.

const gobyGlaze: ItemScriptFactory = (ctx) => {
  let readyAt = 0;
  return {
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || now < readyAt || !foeLive(ctx)) return;
      readyAt = now + 8000;
      ctx.stun(ctx.npc, 300);
      ctx.float(ctx.npc.x, ctx.npc.y - 46, 'GLINT', '#ffffff');
    },
    drawAir(g, time) {
      if (!live(ctx) || time < readyAt) return;
      glint(g, ctx.player.x + 16, ctx.player.y - 44, 5 + Math.sin(time / 120) * 2, 0.9);
    },
  };
};

export const NOON_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_SPECS, name: 'Smoked Spectacles', emoji: '🕶️', kind: 'charm', price: 460, isle: ISLE,
    flavor: 'Licensed smoked glass, ground by Squint herself, with a brass certificate on the hinge. Worth a week\'s bread.',
    script: CHARM_SPECS,
    scriptText: [
      'Each blow you take darkens the lenses a shade, up to 4 (at most every 0.45s).',
      'Each hit you land spends a shade for 6 extra damage. Untouched 4s, the shades lift one a second.',
    ],
  },
  {
    id: CHARM_LENS, name: 'Pocket Burning Glass', emoji: '🔍', kind: 'charm', price: 680, isle: ISLE,
    flavor: 'A lens off a lensman\'s apprentice bench, ground a hair too strong to pass. It still knows what it is for.',
    script: CHARM_LENS,
    scriptText: [
      'A focus spot creeps after your foe at a slow walk.',
      'Held on them 1.6s, it scorches for 12, then starts again from your feet.',
    ],
  },
  {
    id: CHARM_SIGNAL, name: 'Signal Mirror', emoji: '🪞', kind: 'charm', price: 920, isle: ISLE,
    flavor: 'A heliograph mirror the size of a saucer on a folding brass stand. Flash\'s old spare, sold to Squint for salve.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_SIGNAL,
    scriptText: [
      'Every 6s you plant a mirror-post where you stand; a live link of light joins it to you.',
      'A foe crossing the link takes 8 and is stunned 0.5s (at most every 3s).',
    ],
  },
  {
    id: CHARM_TASSEL, name: 'Awning Tassel', emoji: '⛱️', kind: 'charm', price: 1150, isle: ISLE,
    flavor: 'The gold tassel off a licensed awning, with its licence still sewn in. Shake it out and it remembers being shade.',
    effect: { maxHp: 8 },
    script: CHARM_TASSEL,
    scriptText: [
      'Stand still 1.2s to pitch a small awning over yourself; under it you heal 1.5 a second.',
      'If your foe steps under it, it drops on them: 12 damage, stunned 0.4s. Walk out and it folds.',
    ],
  },
  {
    id: ART_LUMEN, name: 'Lumen\'s Prism', emoji: '🔺', kind: 'artifact', isle: ISLE,
    flavor: 'The Prince\'s own prism. Turn it in your hand and, very faintly, it throws your shadow on your palm.',
    effect: { maxHp: 15 },
    script: ART_LUMEN,
    scriptText: [
      'Every 5th hit splits into three rays at the foe: red deals 8, gold heals you 5, violet stuns 0.35s.',
      'Once a fight, under 30% health: you flicker 160px away, heal 22 over 2s, and your afterimage beams the foe for 10.',
    ],
  },
  {
    id: FISH_BREAM, name: 'Blaze Bream', emoji: '🐟', kind: 'fish', sell: 14, isle: ISLE,
    flavor: 'A broad bream gone gold from living in the brightest water on Solmara. Warm to the touch when landed.',
    effect: { regenPerSecond: 0.4 },
  },
  {
    id: FISH_GOBY, name: 'Glare Goby', emoji: '🐠', kind: 'fish', sell: 22, isle: ISLE,
    flavor: 'A little goby so pale it is nearly glass. In the pool all you ever see of one is a dark speck. Darkness!',
    effect: { critChance: 0.03 },
  },
  {
    id: FISH_KOI, name: 'Zenith Koi', emoji: '🎏', kind: 'fish', sell: 46, isle: ISLE,
    flavor: 'White and gold with one black spot on its crown like a stopped sundial\'s shadow. Rare, wary, and very old.',
    effect: { damageMult: 1.04 },
  },
  {
    id: FLOUR, name: 'Sun-Bleached Flour', emoji: '🌾', kind: 'material', price: 22, sell: 7, isle: ISLE,
    flavor: 'Flour so white it hurts. The mill on the lower terrace bleaches it in the open sun, by law, like everything.',
  },
  {
    id: FOOD_BUN, name: 'Sunrise Bun', emoji: '🥯', kind: 'food', sell: 20, isle: ISLE,
    flavor: 'A round gold bun scored with a half-sun coming *up*. Honor bakes it the way her mother did, before the Noon.',
    effect: { maxHp: 10 },
  },
  {
    id: FOOD_BLOOMER, name: 'Blaze Bream Bloomer', emoji: '🥖', kind: 'food', sell: 46, isle: ISLE,
    flavor: 'A long loaf baked round a whole blaze bream, the crust slashed in rays. Eaten hot on the steps of the pool.',
    effect: { damageMult: 1.04, regenPerSecond: 0.3 },
  },
  {
    id: FOOD_GLAZE, name: 'Goby Glaze', emoji: '🍯', kind: 'food', sell: 58, isle: ISLE,
    flavor: 'Little gobies set in a clear sugar glaze, so you can see each tiny dark shape. Children stare into it for hours.',
    script: FOOD_GLAZE,
    scriptText: ['Every 8s a glint gathers on the glaze: your next hit dazzles the foe for 0.3s.'],
  },
  {
    id: FOOD_CROUTE, name: 'Zenith Koi en Croûte', emoji: '🥧', kind: 'food', sell: 96, isle: ISLE,
    flavor: 'A zenith koi and a noonfish baked in a pastry sun, the black spot left showing on top. Honor\'s finest.',
    effect: { maxHp: 16, damageMult: 1.05, speedMult: 1.03 },
  },
];

export const NOON_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_SPECS]: specs,
  [CHARM_LENS]: pocketGlass,
  [CHARM_SIGNAL]: signalMirror,
  [CHARM_TASSEL]: tassel,
  [ART_LUMEN]: lumensPrism,
  [FOOD_GLAZE]: gobyGlaze,
};

export const NOON_SHOPS: ShopDef[] = [
  { id: 'noon-shop', name: 'Squint\'s Smoked Glass & Salves', stock: [CHARM_SPECS, CHARM_LENS, CHARM_SIGNAL, CHARM_TASSEL], buys: true },
  { id: 'noon-mill', name: 'The Mill Cart', stock: [FLOUR], buys: true },
];

export const NOON_BAKERIES: BakeryDef[] = [{
  id: BAKERY_ID,
  name: 'The Sunrise Bun',
  recipes: [
    { id: 'noon-r-sunrise-bun', name: 'Sunrise Bun', inputs: [{ item: FLOUR, count: 2 }], coins: 22, output: FOOD_BUN, makes: 2 },
    { id: 'noon-r-blaze-bloomer', name: 'Blaze Bream Bloomer', inputs: [{ item: FISH_BREAM, count: 1 }, { item: FLOUR, count: 1 }], coins: 30, output: FOOD_BLOOMER },
    { id: 'noon-r-goby-glaze', name: 'Goby Glaze', inputs: [{ item: FISH_GOBY, count: 2 }, { item: FLOUR, count: 1 }], coins: 36, output: FOOD_GLAZE },
    {
      id: 'noon-r-zenith-croute', name: 'Zenith Koi en Croûte',
      inputs: [{ item: FISH_KOI, count: 1 }, { item: 'fish-noonfish', count: 1 }, { item: FLOUR, count: 1 }], coins: 52, output: FOOD_CROUTE,
    },
  ],
}];

export const NOON_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Reflecting Pool', kind: 'sunpool' }];

export const NOON_FISH: FishDef[] = [
  { id: FISH_BREAM, fisheries: [FISHERY], weight: 6, fight: 2, size: [16, 40] },
  { id: FISH_GOBY, fisheries: [FISHERY], weight: 4, fight: 3, size: [6, 18] },
  { id: FISH_KOI, fisheries: [FISHERY], weight: 1, fight: 5, size: [32, 74] },
];
