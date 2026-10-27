import Phaser from 'phaser';
import type {
  FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import { CAP_RED, GLOW, GLOW_DEEP, GLOW_WASH, ROT, ROT_LIT, SPORE, STEM, WHITE, WISP, WISP_DEEP } from './palette';
import { CSS_GLOW, CSS_ROT, CSS_SPORE, CSS_STEM, CSS_WISP } from './palette';
import { dist, glowcaps, hypha, puffball, rotPatch, sporeCloud, toadstool } from './sporeArt';

/**
 * The Spore Court's goods: four charms from the Gill & Gather, Prince Mycel's Ear, and the three
 * catches of the Black Mere. Every charm and the artifact carries a bespoke script.
 *
 * The engine reports *all* damage the foe takes to `onHitDealt` — including a script's own
 * `ctx.hit` — so any script that hits from inside that hook holds a re-entrancy flag.
 */

const live = (f: { active: boolean; hp: number }): boolean => f.active && f.hp > 0;

// ── Puffball Pouch ──────────────────────────────────────────────────────

/**
 * A forager's pouch of unripe puffballs. Every fourth hit you take shakes one loose at your feet
 * (up to three on the floor, ten seconds each). If the foe walks within reach of one it bursts in
 * their face: 10 damage and three seconds of spore-cough (2 a second). Kite them across your trail.
 */
const puffballPouch: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const LIFE = 10000;
  let hits = 0;
  let balls: { x: number; y: number; at: number; seed: number }[] = [];
  let cough: { until: number; next: number } | null = null;
  const pops: { x: number; y: number; at: number }[] = [];
  return {
    onHitTaken() {
      hits++;
      if (hits < 4) return;
      hits = 0;
      const p = ctx.player;
      balls.push({ x: p.x, y: p.y + 14, at: ctx.scene.time.now, seed: Math.floor(ctx.rng() * 99) });
      if (balls.length > 3) balls.shift();
      ctx.sfx('boing');
    },
    update(time) {
      const n = ctx.npc;
      balls = balls.filter((b) => {
        if (time - b.at > LIFE) return false;
        if (time - b.at < 400 || !live(n) || dist(n.x, n.y + 12, b.x, b.y) > 40) return true;
        ctx.hit(n, 10, n.x, n.y);
        cough = { until: time + 3000, next: time + 500 };
        pops.push({ x: b.x, y: b.y, at: time });
        ctx.float(n.x, n.y - 46, 'PUFF!', CSS_SPORE);
        ctx.sfx('spore');
        return false;
      });
      if (cough && live(n) && time >= cough.next) {
        cough.next = time + 500;
        ctx.hit(n, 1, n.x, n.y);
      }
      if (cough && time > cough.until) cough = null;
      while (pops.length && time - pops[0].at > 700) pops.shift();
    },
    drawGround(g, time) {
      for (const b of balls) puffball(g, b.x, b.y, 9, Phaser.Math.Clamp((time - b.at) / LIFE, 0, 1), b.seed);
      for (const p of pops) sporeCloud(g, p.x, p.y - 6, 30 + (time - p.at) / 20, SPORE, 1 - (time - p.at) / 700, time / 1000, p.x);
    },
    drawAir(g, time) {
      // The pouch at your hip, one puffball peeking out per hit toward the next.
      const p = ctx.player;
      const x = p.x - 18, y = p.y + 6 + Math.sin(time / 320) * 1.2;
      g.fillStyle(0x5e4630, 1); g.fillRoundedRect(x - 7, y - 6, 14, 12, 4);
      for (let i = 0; i < hits; i++) { g.fillStyle(STEM, 1); g.fillCircle(x - 4 + i * 4, y - 6, 2.4); }
      if (cough) { const n = ctx.npc; g.fillStyle(SPORE, 0.4); g.fillCircle(n.x + 10, n.y - 16, 5 + Math.sin(time / 90) * 2); }
    },
  };
};

// ── Glowcap Lantern ─────────────────────────────────────────────────────

/**
 * A jar of glowcaps on a cord. Every three seconds you go without being hit, one cap in the jar
 * lights (up to four). A hit douses one lit cap — and the light it held comes back to you as
 * 60% of that hit, healed. Keep your footwork clean and the jar keeps you.
 */
const glowcapLantern: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const EVERY = 3000;
  let lit = 1;
  let calmSince = ctx.scene.time.now;
  let doused = -99999;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      calmSince = now;
      if (lit <= 0) return;
      lit--;
      const back = Math.max(1, Math.round(amount * 0.6));
      ctx.heal(ctx.player, back);
      ctx.float(ctx.player.x, ctx.player.y - 48, `GLOW +${back}`, CSS_GLOW);
      ctx.sfx('heal');
      doused = now;
    },
    update(time) {
      if (lit < 4 && time - calmSince >= EVERY) {
        lit++;
        calmSince = time;
        ctx.sfx('crystal-chime');
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x + 20, y = p.y - 2 + Math.sin(time / 280) * 1.5;
      g.lineStyle(1, STEM, 0.8); g.lineBetween(x, y - 14, x - 4, y - 22);
      g.fillStyle(GLOW, 0.05 * lit); g.fillCircle(x, y, 22);
      g.fillStyle(0x1a2a26, 0.85); g.fillRoundedRect(x - 7, y - 12, 14, 18, 4);
      for (let i = 0; i < 4; i++) {
        g.fillStyle(i < lit ? GLOW : GLOW_DEEP, i < lit ? 1 : 0.4);
        g.fillEllipse(x - 3 + (i % 2) * 6, y + 2 - Math.floor(i / 2) * 7, 5, 3.5);
      }
      g.lineStyle(1, GLOW_WASH, 0.5); g.strokeRoundedRect(x - 7, y - 12, 14, 18, 4);
      const since = time - doused;
      if (since < 400) { g.lineStyle(2, GLOW_WASH, 1 - since / 400); g.strokeCircle(p.x, p.y, 24 + since / 10); }
    },
  };
};

// ── Rot Ward ────────────────────────────────────────────────────────────

/**
 * A twist of Morel's compost in a cloth. Every 30 damage you take, the rot you have soaked up is
 * passed on: a bruise of rot opens at the foe's feet, and four seconds later it fruits and bursts
 * on them for 14 — wherever they have gone, it goes with them.
 */
const rotWard: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const EVERY = 30;
  let soaked = 0;
  let blooms: { at: number; seed: number }[] = [];
  let bursts: { x: number; y: number; at: number }[] = [];
  return {
    onHitTaken(amount) {
      soaked += amount;
      while (soaked >= EVERY) {
        soaked -= EVERY;
        blooms.push({ at: ctx.scene.time.now, seed: Math.floor(ctx.rng() * 99) });
        ctx.float(ctx.npc.x, ctx.npc.y - 44, 'ROT TAKES', CSS_ROT);
      }
    },
    update(time) {
      const n = ctx.npc;
      blooms = blooms.filter((b) => {
        if (time - b.at < 4000) return true;
        if (live(n)) { ctx.hit(n, 14, n.x, n.y); bursts.push({ x: n.x, y: n.y + 12, at: time }); ctx.sfx('explosion-small'); }
        return false;
      });
      bursts = bursts.filter((b) => time - b.at < 600);
    },
    drawGround(g, time) {
      const n = ctx.npc;
      blooms.forEach((b, i) => {
        const k = (time - b.at) / 4000;
        rotPatch(g, n.x + i * 10, n.y + 16, 12 + k * 10, 1, b.seed);
        if (k > 0.5) toadstool(g, n.x + i * 10, n.y + 18, 4 + (k - 0.5) * 18, k > 0.85 ? CAP_RED : ROT_LIT, k > 0.85, 1, b.seed);
      });
      for (const b of bursts) sporeCloud(g, b.x, b.y - 8, 30 + (time - b.at) / 15, ROT_LIT, 1 - (time - b.at) / 600, time / 1000, b.x);
    },
    drawAir(g) {
      // How much rot you are carrying: a stain spreading at your feet.
      const p = ctx.player;
      if (soaked > 0) { g.fillStyle(ROT, 0.35 + 0.35 * (soaked / EVERY)); g.fillEllipse(p.x, p.y + 18, 16 + soaked, 6 + soaked * 0.3); }
    },
  };
};

// ── Fen-Light ───────────────────────────────────────────────────────────

/**
 * A wisp that took a liking to you. It circles you, and every six seconds it darts to the foe and
 * back: if they are within 320px it takes 6 of their health and brings it home to you. Every hit
 * you take makes it anxious — its next dart comes 1.5 seconds sooner.
 */
const fenLight: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const EVERY = 6000;
  let nextAt = ctx.scene.time.now + 3000;
  let dart: { at: number; struck: boolean } | null = null;
  const DART_MS = 700;
  return {
    onHitTaken() { nextAt -= 1500; },
    update(time) {
      if (!dart && time >= nextAt) {
        const n = ctx.npc, p = ctx.player;
        nextAt = time + EVERY;
        if (live(n) && dist(n.x, n.y, p.x, p.y) < 320) { dart = { at: time, struck: false }; ctx.sfx('whoosh'); }
      }
      if (dart && !dart.struck && time - dart.at >= DART_MS / 2) {
        dart.struck = true;
        const n = ctx.npc;
        if (live(n)) {
          ctx.hit(n, 6, n.x, n.y);
          ctx.float(n.x, n.y - 44, 'the light takes', CSS_WISP);
        }
      }
      if (dart && time - dart.at > DART_MS) {
        dart = null;
        ctx.heal(ctx.player, 6);
        ctx.float(ctx.player.x, ctx.player.y - 44, '+6', CSS_STEM);
      }
    },
    drawAir(g, time) {
      const p = ctx.player, n = ctx.npc;
      let x = p.x + Math.cos(time / 500) * 32, y = p.y - 26 + Math.sin(time / 500) * 12;
      if (dart) {
        const k = Phaser.Math.Clamp((time - dart.at) / DART_MS, 0, 1);
        const out = k < 0.5 ? k * 2 : 2 - k * 2;
        x = x + (n.x - x) * out; y = y + (n.y - 20 - y) * out;
        g.lineStyle(2, WISP, 0.3); g.lineBetween(p.x, p.y - 20, x, y);
      }
      g.fillStyle(WISP, 0.15); g.fillCircle(x, y, 14);
      g.fillStyle(WISP, 0.7); g.fillCircle(x, y, 6);
      g.fillStyle(WHITE, 0.9); g.fillCircle(x - 1, y - 1, 2.5);
      g.lineStyle(1, WISP_DEEP, 0.6); g.strokeCircle(x, y, 9);
    },
  };
};

// ── Mycel's Ear (artifact) ──────────────────────────────────────────────

/**
 * The Prince's ear, a fan of grey gill the size of a hand, still faintly warm. The network listens
 * for you now: every fourth ability the foe casts, the Ear hears it coming — a thread erupts under
 * them for 14, and your next blow within two seconds lands 40% harder.
 */
const mycelEar: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const EVERY = 4;
  let seen = ctx.npc.lastPressAt ?? 0;
  let heard = 0;
  let eruptAt = -99999;
  let ex = 0, ey = 0;
  return {
    update(time) {
      const n = ctx.npc;
      const at = n.lastPressAt ?? 0;
      if (at <= seen) return;
      seen = at;
      heard++;
      if (heard < EVERY || !live(n)) return;
      heard = 0;
      eruptAt = time; ex = n.x; ey = n.y + 14;
      ctx.hit(n, 14, n.x, n.y);
      ctx.boostDamage(1.4, 2000);
      ctx.float(n.x, n.y - 50, 'THE EAR HEARD THAT', CSS_GLOW);
      ctx.sfx('zap');
    },
    drawGround(g, time) {
      const since = time - eruptAt;
      if (since < 0 || since > 600) return;
      const q = since / 600;
      const p = ctx.player;
      hypha(g, { x: p.x, y: p.y + 16 }, { x: ex, y: ey }, 2, GLOW, 1 - q, 9, 0.2);
      glowcaps(g, ex, ey, 6 + (1 - q) * 6, 1 - q, 4);
    },
    drawAir(g, time) {
      // Four pips over the foe's head: how close the Ear is to hearing them.
      const n = ctx.npc;
      for (let i = 0; i < EVERY; i++) {
        g.fillStyle(i < heard ? GLOW : GLOW_DEEP, i < heard ? 0.95 : 0.4);
        g.fillCircle(n.x - 12 + i * 8, n.y - 56 + Math.sin(time / 200 + i) * 1, 2.4);
      }
    },
  };
};

// ── Items ───────────────────────────────────────────────────────────────

export const SPORE_ITEMS: IsleItemDef[] = [
  {
    id: 'spore-puffball-pouch', name: 'Puffball Pouch', emoji: '🍄', kind: 'charm', price: 240, sell: 80, isle: 'life',
    flavor: 'Gill\'s spare harvest pouch. The puffballs in it are not ripe. They are, however, very rude.',
    script: 'spore-puffball-pouch',
    scriptText: [
      'Every 4th hit you take drops a puffball at your feet (max 3, 10s).',
      'A foe who walks into one: 10 damage and 3s of spore-cough.',
    ],
  },
  {
    id: 'spore-glowcap-lantern', name: 'Glowcap Lantern', emoji: '🏮', kind: 'charm', price: 360, sell: 115, isle: 'life',
    flavor: 'Brother Russula fills these by hand. He says the caps light for people who are careful. He is right.',
    script: 'spore-glowcap-lantern',
    effect: { maxHp: 6 },
    scriptText: [
      'Every 3s without being hit lights a cap in the jar (max 4).',
      'A hit douses one lit cap and heals back 60% of that hit.',
    ],
  },
  {
    id: 'spore-rot-ward', name: 'Rot Ward', emoji: '🪱', kind: 'charm', price: 480, sell: 150, isle: 'life',
    flavor: 'A twist of Morel\'s compost in muslin. Smells exactly as you fear. Works exactly as she promised.',
    script: 'spore-rot-ward',
    scriptText: [
      'Every 30 damage you take opens rot at the foe\'s feet.',
      'It follows them, fruits and bursts 4s later for 14.',
    ],
  },
  {
    id: 'spore-fen-light', name: 'Fen-Light', emoji: '✨', kind: 'charm', price: 640, sell: 200, isle: 'life',
    flavor: 'A wisp in a lidless jar. It does not leave. Fen says that means it has chosen. Fen says a lot of things.',
    script: 'spore-fen-light',
    effect: { regenPerSecond: 0.3 },
    scriptText: [
      'Every 6s your wisp darts to a foe within 320px: it takes 6 and heals you 6.',
      'Each hit you take brings the next dart 1.5s sooner.',
    ],
  },
  {
    id: 'art-mycel', name: 'Mycel\'s Ear', emoji: '👂', kind: 'artifact', isle: 'life',
    flavor: 'A fan of grey gill the size of a hand, still warm. Put it to the ground and you can hear the whole bog breathe.',
    script: 'art-mycel',
    effect: { maxHp: 15 },
    scriptText: [
      'Every 4th ability the foe casts, a thread erupts under them for 14,',
      'and your hits land 40% harder for 2s.',
    ],
  },
  {
    id: 'fish-bog-loach', name: 'Bog Loach', emoji: '🐟', kind: 'fish', sell: 28, isle: 'life',
    flavor: 'A whiskered brown eel-let that lives in the peat itself. Tastes of the bottom, which is the point.',
    effect: { regenPerSecond: 0.35 },
  },
  {
    id: 'fish-glowcap-eel', name: 'Glowcap Eel', emoji: '🐍', kind: 'fish', sell: 54, isle: 'life',
    flavor: 'It grazes on drowned glowcaps and glows in its own right. Eat it in the dark and your teeth light up.',
    effect: { critChance: 0.05 },
  },
  {
    id: 'fish-mire-frog', name: 'Mire Frog', emoji: '🐸', kind: 'fish', sell: 96, isle: 'life',
    flavor: 'Big as a loaf, black as the Mere, with a song that carries a mile. The tithe-weighers take them by the sack.',
    effect: { dodgeChance: 0.05, speedMult: 1.04 },
  },
];

export const SPORE_SCRIPTS: Record<string, ItemScriptFactory> = {
  'spore-puffball-pouch': puffballPouch,
  'spore-glowcap-lantern': glowcapLantern,
  'spore-rot-ward': rotWard,
  'spore-fen-light': fenLight,
  'art-mycel': mycelEar,
};

export const SPORE_SHOPS: ShopDef[] = [
  {
    id: 'spore-shop',
    name: 'The Gill & Gather',
    stock: ['spore-puffball-pouch', 'spore-glowcap-lantern', 'spore-rot-ward', 'spore-fen-light'],
    buys: true,
  },
];

export const SPORE_FISHERIES: FisheryDef[] = [
  { id: 'spore-bog', name: 'The Black Mere', kind: 'bog' },
];

export const SPORE_FISH: FishDef[] = [
  { id: 'fish-bog-loach', fisheries: ['spore-bog'], weight: 7, fight: 2, size: [12, 34] },
  { id: 'fish-glowcap-eel', fisheries: ['spore-bog'], weight: 4, fight: 4, size: [40, 110] },
  { id: 'fish-mire-frog', fisheries: ['spore-bog'], weight: 1.6, fight: 3, size: [14, 30] },
];
