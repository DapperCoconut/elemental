import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { dim, glow, lit } from '../../../../art/IsleArt';
import { brush, trompeDoor } from './art';
import {
  CADMIUM, CADMIUM_LIT, GOLD, GOLD_DARK, GOLD_LIT, LAMPBLACK, LIME_DRY, LIME_WET, ULTRAMARINE, UMBER, VERMILION,
  VERMILION_LIT,
} from './palette';
import { alive, clamp, dist, wrapAngle } from './util';

/**
 * The Mural Court's goods: Ottavio Madder's four charms, Prince Hue's boyhood chalks, and the
 * pigment river's three fish. Every charm is a painter's thing that plays one of the court's own
 * tricks in your favour — the wet stroke, the colour wheel, the painted door, the censor's lime.
 * Scripts are registered below under their item ids.
 */

const ISLE = 'light';

export const CHARM_BRUSH = 'mural-charm-hog-brush';
export const CHARM_WHEEL = 'mural-charm-wheel-brooch';
export const CHARM_LOCKET = 'mural-charm-trompe-locket';
export const CHARM_PAIL = 'mural-charm-lime-pail';
export const ART_HUE = 'art-hue';

export const FISH_PERCH = 'fish-palette-perch';
export const FISH_EEL = 'fish-umber-eel';
export const FISH_SNAPPER = 'fish-vermilion-snapper';
export const FISHERY = 'mural-river';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Hog-Bristle Brush ─────────────────────────────────────────────────
// Wherever you walk you lay a wet stroke of vermilion behind you — the last moment and a half of
// your path. A foe who steps on it is scalded for 3, at most every 0.7s. Lead them through it.

const hogBrush: ItemScriptFactory = (ctx) => {
  const trail: { x: number; y: number; at: number }[] = [];
  const LIFE = 1800;
  let lastAt = 0;
  let burnAt = 0;
  return {
    update(time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const last = trail[trail.length - 1];
      if (time - lastAt > 60 && (!last || dist(last.x, last.y, p.x, p.y) > 8)) { trail.push({ x: p.x, y: p.y + 14, at: time }); lastAt = time; }
      while (trail.length && time - trail[0].at > LIFE) trail.shift();
      if (!foeLive(ctx) || time < burnAt) return;
      const n = ctx.npc;
      if (trail.some((s) => time - s.at > 200 && dist(s.x, s.y, n.x, n.y + 14) < 22)) {
        burnAt = time + 700;
        ctx.hit(n, 3, n.x, n.y);
        ctx.sfx('sizzle');
      }
    },
    drawGround(g, time) {
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1], b = trail[i];
        const k = clamp(1 - (time - b.at) / LIFE, 0, 1);
        g.lineStyle(16 * (0.5 + k * 0.5), dim(VERMILION, 0.15), 0.5 * k); g.lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(10 * (0.5 + k * 0.5), VERMILION, 0.7 * k); g.lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(3, VERMILION_LIT, 0.6 * k); g.lineBetween(a.x - 2, a.y - 3, b.x - 2, b.y - 3);
      }
    },
  };
};

// ── Colour-Wheel Brooch ───────────────────────────────────────────────
// A tiny wheel at your shoulder turns red → yellow → blue, a colour every 3s. Each hit you land
// carries the colour on top (at most once per 1.2s): red burns the foe for 6 over 1.5s, yellow
// quickens you for 1.5s, blue shoves the foe 60px away.

const wheelBrooch: ItemScriptFactory = (ctx) => {
  const COLS = [VERMILION, CADMIUM, ULTRAMARINE];
  const NAMES = ['RED', 'YELLOW', 'BLUE'];
  const STEP = 3000;
  let procAt = 0;
  let burns: number[] = [];
  const top = (time: number) => Math.floor(time / STEP) % 3;
  return {
    update(time) {
      if (!foeLive(ctx)) { burns = []; return; }
      for (let i = burns.length - 1; i >= 0; i--) {
        if (time < burns[i]) continue;
        burns.splice(i, 1);
        ctx.hit(ctx.npc, 2, ctx.npc.x, ctx.npc.y);
      }
    },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || now - procAt < 1200 || !foeLive(ctx) || !live(ctx)) return;
      procAt = now;
      const c = top(now);
      const n = ctx.npc, p = ctx.player;
      if (c === 0) { burns.push(now + 500, now + 1000, now + 1500); ctx.sfx('status-burn'); }
      else if (c === 1) { ctx.boostSpeed(1.3, 1500); ctx.sfx('status-buff'); }
      else {
        const a = Math.atan2(n.y - p.y, n.x - p.x);
        ctx.nudge(n, Math.cos(a) * 60, Math.sin(a) * 60);
        ctx.sfx('splash');
      }
      ctx.float(n.x, n.y - 50, NAMES[c], ['#ff7a5a', '#fff07a', '#8aa8ff'][c]);
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 28, y = p.y - 32;
      const turn = (time % STEP) / STEP;
      const base = -Math.PI / 2 - (top(time) + turn) * (Math.PI * 2 / 3);
      g.fillStyle(GOLD_DARK, 1); g.fillCircle(x, y, 9);
      for (let i = 0; i < 3; i++) {
        g.fillStyle(COLS[i], 1);
        g.slice(x, y, 7.5, base + i * (Math.PI * 2 / 3) - Math.PI / 3, base + i * (Math.PI * 2 / 3) + Math.PI / 3, false); g.fillPath();
      }
      g.fillStyle(GOLD_LIT, 1); g.fillTriangle(x - 3, y - 12, x + 3, y - 12, x, y - 8);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(x, y, 2);
      if (time - procAt < 300) glow(g, x, y, 14, COLS[top(procAt)], 0.1, 2);
    },
  };
};

// ── Trompe-l'œil Locket ───────────────────────────────────────────────
// Take a hit of 6 or more (at most every 10s) and you were never there: a painted likeness stays
// where you stood and you step out of a painted door 130px further from the foe. For 3s after,
// your blows land 50% harder.

const trompeLocket: ItemScriptFactory = (ctx) => {
  let readyAt = 0;
  let decoy: { x: number; y: number; at: number } | null = null;
  let door: { x: number; y: number; at: number } | null = null;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 6 || now < readyAt || !live(ctx) || !foeLive(ctx)) return;
      readyAt = now + 10000;
      const p = ctx.player, n = ctx.npc;
      decoy = { x: p.x, y: p.y, at: now };
      const a = Math.atan2(p.y - n.y, p.x - n.x);
      ctx.nudge(p, Math.cos(a) * 130, Math.sin(a) * 130);
      door = { x: p.x, y: p.y, at: now };
      ctx.boostDamage(1.5, 3000);
      ctx.float(decoy.x, decoy.y - 40, 'ONLY PAINT', '#fff0a0');
      ctx.sfx('portal');
    },
    drawGround(g, time) {
      if (door && time - door.at < 700) {
        const k = (time - door.at) / 700;
        trompeDoor(g, door.x, door.y + 20, 44, 70, GOLD, 1 - k);
      }
    },
    drawAir(g, time) {
      if (decoy && time - decoy.at < 1500) {
        const k = (time - decoy.at) / 1500;
        g.fillStyle(UMBER, 0.6 * (1 - k)); g.fillEllipse(decoy.x, decoy.y, 34, 44);
        g.fillStyle(lit(UMBER, 0.4), 0.6 * (1 - k)); g.fillCircle(decoy.x, decoy.y - 26, 10);
        g.lineStyle(3, GOLD, 1 - k); g.strokeRect(decoy.x - 24, decoy.y - 42, 48, 66);
        for (let i = 0; i < 4; i++) { g.fillStyle(UMBER, 0.7 * (1 - k)); g.fillEllipse(decoy.x - 12 + i * 8, decoy.y + 22 + k * 30, 3, 8); }
      }
      if (live(ctx) && ctx.scene.time.now >= readyAt) {
        // A tiny locket at your collar, a painted door on its face.
        const p = ctx.player;
        g.fillStyle(GOLD_DARK, 1); g.fillCircle(p.x + 22, p.y - 18, 5.5);
        g.fillStyle(GOLD, 1); g.fillCircle(p.x + 22, p.y - 18, 4.5);
        g.fillStyle(LAMPBLACK, 0.8); g.fillRect(p.x + 20.5, p.y - 21, 3, 5);
      }
    },
  };
};

// ── Censor's Lime Pail ────────────────────────────────────────────────
// The pail fills over 9s. Full, your next cast flings it where you are looking: a foe within
// 220px and 35° of your aim is limed — stunned 0.7s and taking 20% more for 4s.

const limePail: ItemScriptFactory = (ctx) => {
  const FILL = 9000;
  let since = -1;
  let flung: { x: number; y: number; a: number; at: number; hit: boolean } | null = null;
  return {
    update(time) { if (since < 0) since = time; },
    onCast() {
      const now = ctx.scene.time.now;
      if (since < 0 || now - since < FILL || !live(ctx)) return;
      since = now;
      const p = ctx.player;
      const a = ctx.facing(p);
      let hit = false;
      if (foeLive(ctx)) {
        const n = ctx.npc;
        const d = dist(p.x, p.y, n.x, n.y);
        if (d < 220 && Math.abs(wrapAngle(Math.atan2(n.y - p.y, n.x - p.x) - a)) < 0.62) {
          hit = true;
          ctx.stun(n, 700);
          ctx.boostDamage(1.2, 4000);
          ctx.float(n.x, n.y - 50, 'LIMED', '#f6f6f2');
        }
      }
      flung = { x: p.x, y: p.y, a, at: now, hit };
      ctx.sfx('splash');
    },
    drawGround(g, time) {
      if (!flung || time - flung.at > 900) return;
      const k = (time - flung.at) / 900;
      for (let i = 0; i < 9; i++) {
        const b = flung.a + (i - 4) * 0.12;
        const r = 60 + ((i * 37) % 5) * 30;
        g.fillStyle(LIME_WET, 0.7 * (1 - k)); g.fillEllipse(flung.x + Math.cos(b) * r, flung.y + Math.sin(b) * r, 26, 14);
      }
    },
    drawAir(g, time) {
      if (!live(ctx) || since < 0) return;
      const p = ctx.player;
      const k = clamp((time - since) / FILL, 0, 1);
      const x = p.x - 24, y = p.y + 4;
      g.fillStyle(0x7a7a80, 1); g.fillRect(x - 6, y - 9, 12, 10);
      g.fillStyle(LIME_DRY, 1); g.fillRect(x - 5, y + 1 - 9 * k, 10, 9 * k);
      g.lineStyle(1, 0x58585e, 1); g.beginPath(); g.arc(x, y - 9, 6, Math.PI, 0, false); g.strokePath();
      if (k >= 1) glow(g, x, y - 4, 12, 0xffffff, 0.06 + Math.sin(time / 150) * 0.03, 2);
      if (flung && time - flung.at < 400) {
        const t = (time - flung.at) / 400;
        g.fillStyle(LIME_WET, 1 - t); g.fillCircle(flung.x + Math.cos(flung.a) * 200 * t, flung.y + Math.sin(flung.a) * 200 * t - Math.sin(t * Math.PI) * 40, 8);
      }
    },
  };
};

// ── Hue's Boyhood Chalks ─────────────────────────────────────────────
// Every 5th hit you land chalks a shadow under the foe; 1s later it rises and bites for 12 and
// knocks them back if they're still standing on it. Once a fight, under 30% health, you step into
// a chalked shadow of your own: heal 25 and the foe, startled, is stunned 0.8s.

const hueChalks: ItemScriptFactory = (ctx) => {
  let hits = 0;
  let marks: { x: number; y: number; at: number; done: boolean }[] = [];
  let used = false;
  let hideAt = -9999;
  return {
    onHitDealt(amount) {
      if (amount < 2 || !foeLive(ctx)) return;
      hits++;
      if (hits % 5 !== 0) return;
      marks.push({ x: ctx.npc.x, y: ctx.npc.y + 12, at: ctx.scene.time.now, done: false });
      ctx.sfx('trap-set');
    },
    onHitTaken() {
      const p = ctx.player;
      if (used || !live(ctx) || p.hp / p.maxHp >= 0.3) return;
      used = true;
      hideAt = ctx.scene.time.now;
      ctx.heal(p, 25);
      if (foeLive(ctx)) ctx.stun(ctx.npc, 800);
      ctx.float(p.x, p.y - 50, 'INTO THE SHADOW', '#c8c0e0');
      ctx.sfx('hush');
    },
    update(time) {
      for (const m of marks) {
        if (m.done || time - m.at < 1000) continue;
        m.done = true;
        if (foeLive(ctx) && dist(m.x, m.y, ctx.npc.x, ctx.npc.y + 12) < 60) {
          ctx.hit(ctx.npc, 12, m.x, m.y);
          const a = Math.atan2(ctx.npc.y - ctx.player.y, ctx.npc.x - ctx.player.x);
          ctx.nudge(ctx.npc, Math.cos(a) * 50, Math.sin(a) * 50);
          ctx.sfx('snap-back');
        }
      }
      marks = marks.filter((m) => time - m.at < 1500);
    },
    drawGround(g, time) {
      for (const m of marks) {
        const k = clamp((time - m.at) / 1000, 0, 1);
        // A child's chalked shadow: a dark smudge, scribbled.
        g.fillStyle(LAMPBLACK, 0.2 + k * 0.35); g.fillEllipse(m.x, m.y, 56, 16);
        g.lineStyle(1.5, 0xf2f2f2, 0.5 + k * 0.4);
        for (let i = 0; i < 6; i++) g.lineBetween(m.x - 24 + i * 9, m.y - 5, m.x - 18 + i * 9, m.y + 5);
        if (k >= 1 && time - m.at < 1400) {
          const r = (time - m.at - 1000) / 400;
          for (let i = 0; i < 5; i++) { g.fillStyle(LAMPBLACK, 0.8 * (1 - r)); g.fillTriangle(m.x - 22 + i * 11, m.y, m.x - 16 + i * 11, m.y, m.x - 19 + i * 11, m.y - 26 * (1 - r * 0.5)); }
        }
      }
      if (time - hideAt < 1000 && live(ctx)) {
        const k = (time - hideAt) / 1000;
        g.fillStyle(LAMPBLACK, 0.5 * (1 - k)); g.fillEllipse(ctx.player.x, ctx.player.y + 14, 80, 24);
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      // A stub of chalk behind your ear, worn to a nub.
      const p = ctx.player;
      brush(g, p.x + 14, p.y - 40, -1.0, 6, CADMIUM_LIT, 2);
      if (time - hideAt < 400) glow(g, p.x, p.y, 30, 0xc8c0e0, 0.08, 2);
    },
  };
};

export const MURAL_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_BRUSH, name: 'Hog-Bristle Brush', emoji: '🖌️', kind: 'charm', price: 460, isle: ISLE,
    flavor: 'A big stiff sash brush for laying in sky. It never quite dries. Madder says that is the linseed. It isn\'t.',
    script: CHARM_BRUSH,
    scriptText: [
      'You lay a wet stroke of vermilion behind you as you move — the last 1.8s of your path.',
      'A foe who steps on it is scalded for 3, at most every 0.7s.',
    ],
  },
  {
    id: CHARM_WHEEL, name: 'Colour-Wheel Brooch', emoji: '🎨', kind: 'charm', price: 640, isle: ISLE,
    flavor: 'A gilt brooch with three enamel wedges that turn on a pin. Prism wears a bigger one. On the floor.',
    script: CHARM_WHEEL,
    scriptText: [
      'A wheel at your shoulder turns red → yellow → blue, one colour every 3s.',
      'Your hits carry the top colour (every 1.2s): red burns 6, yellow quickens you, blue shoves the foe 60px.',
    ],
  },
  {
    id: CHARM_LOCKET, name: 'Trompe-l\'œil Locket', emoji: '🚪', kind: 'charm', price: 860, isle: ISLE,
    flavor: 'Open it and there is a tiny painted door inside. Open the door and there is a smaller one. Faux won\'t say.',
    effect: { dodgeChance: 0.03 },
    script: CHARM_LOCKET,
    scriptText: [
      'Taking a hit of 6+ (every 10s): a painted likeness stays behind and you step 130px away from the foe.',
      'For 3s after, your blows deal +50% damage.',
    ],
  },
  {
    id: CHARM_PAIL, name: 'Censor\'s Lime Pail', emoji: '🪣', kind: 'charm', price: 1150, isle: ISLE,
    flavor: 'A dented pail stencilled OFFICE OF CLARITY. Agnes Whitlow says she lost it. She says it very carefully.',
    effect: { maxHp: 8 },
    script: CHARM_PAIL,
    scriptText: [
      'The pail fills over 9s. Full, your next cast flings lime where you aim.',
      'A foe within 220px and 35° of your aim is stunned 0.7s and takes +20% damage for 4s.',
    ],
  },
  {
    id: ART_HUE, name: 'Hue\'s Boyhood Chalks', emoji: '🖍️', kind: 'artifact', isle: ISLE,
    flavor: 'A tin of chalk stubs, the black one worn to a nub. Ombretta kept it twenty years. She says he\'d want you to.',
    effect: { maxHp: 18 },
    script: ART_HUE,
    scriptText: [
      'Every 5th hit chalks a shadow under the foe; 1s later it bites for 12 and knocks them back if they stayed.',
      'Once a fight, under 30% health, you step into your own shadow: heal 25 and stun the foe 0.8s.',
    ],
  },
  {
    id: FISH_PERCH, name: 'Palette Perch', emoji: '🐟', kind: 'fish', sell: 24, isle: ISLE,
    flavor: 'Striped in whatever stripe of the river it grew up in. Sepp says you can tell a perch\'s street by its colour.',
    effect: { regenPerSecond: 0.5 },
  },
  {
    id: FISH_EEL, name: 'Umber Eel', emoji: '🐍', kind: 'fish', sell: 44, isle: ISLE,
    flavor: 'Brown as an old shadow, and illegal to land: it inks umber when it bites. Painters pay well, quietly.',
    effect: { damageTakenMult: 0.96 },
  },
  {
    id: FISH_SNAPPER, name: 'Vermilion Snapper', emoji: '🐠', kind: 'fish', sell: 72, isle: ISLE,
    flavor: 'Lives in the red stripe and is redder than it. Its scales are ground for the Despot\'s robe on feast days.',
    effect: { damageMult: 1.04 },
  },
];

export const MURAL_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_BRUSH]: hogBrush,
  [CHARM_WHEEL]: wheelBrooch,
  [CHARM_LOCKET]: trompeLocket,
  [CHARM_PAIL]: limePail,
  [ART_HUE]: hueChalks,
};

export const MURAL_SHOPS: ShopDef[] = [
  { id: 'mural-shop', name: 'Madder\'s Colours', stock: [CHARM_BRUSH, CHARM_WHEEL, CHARM_LOCKET, CHARM_PAIL], buys: true },
];

export const MURAL_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Pigment River', kind: 'ink' }];

export const MURAL_FISH: FishDef[] = [
  { id: FISH_PERCH, fisheries: [FISHERY], weight: 6, fight: 2, size: [10, 26] },
  { id: FISH_EEL, fisheries: [FISHERY], weight: 3, fight: 3, size: [30, 84] },
  { id: FISH_SNAPPER, fisheries: [FISHERY], weight: 1.5, fight: 4, size: [24, 62] },
];
