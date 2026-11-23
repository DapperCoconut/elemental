import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { HAND_COLORS, HAND_SHAPES, handShape, ribbon, type HandShape } from './art';
import { BRONZE, BRONZE_DARK, BRONZE_LIT, FELT, FELT_DARK, FELT_OAT, HUSH, MUTE_ACCENT, SILK, SILK_SHADE } from './palette';
import { alive, clamp, dist } from './util';

/**
 * The Hush Court's goods: Fleece Hartwell's four charms, Prince Mute's white ribbon, and the still
 * mere's three fish. Every charm is a muffling thing turned round — felt that keeps blows off, a
 * clapper that rings for you, a signer's glove that rewards the right shape, slippers that let you
 * arrive unheard. Scripts are registered below under their item ids.
 */

const ISLE = 'sound';

export const CHARM_EARMUFFS = 'hush-charm-earmuffs';
export const CHARM_CLAPPER = 'hush-charm-clapper';
export const CHARM_GLOVE = 'hush-charm-signers-glove';
export const CHARM_SLIPPERS = 'hush-charm-felt-slippers';
export const ART_MUTE = 'art-mute';

export const FISH_MULLET = 'fish-mute-mullet';
export const FISH_WHITING = 'fish-whisper-whiting';
export const FISH_STURGEON = 'fish-hush-sturgeon';
export const FISHERY = 'hush-mere';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Warden's Earmuffs ────────────────────────────────────────────────
// A blow lands; the felt closes. For 2.2s after, 45% of every further hit is soaked back off you.
// Then they need 9s to plump up again.

const earmuffs: ItemScriptFactory = (ctx) => {
  const WINDOW = 2200, CD = 9000;
  let openAt = -99999;
  let readyAt = 0;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (!live(ctx)) return;
      if (now - openAt < WINDOW) {
        ctx.heal(ctx.player, Math.max(1, Math.round(amount * 0.45)));
        return;
      }
      if (now < readyAt) return;
      openAt = now;
      readyAt = now + CD;
      ctx.float(ctx.player.x, ctx.player.y - 56, 'MUFFLED', '#c9d3df');
      ctx.sfx('hush');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const on = time - openAt < WINDOW;
      const ready = time >= readyAt;
      if (on) glow(g, p.x, p.y - 10, 34, HUSH, 0.07, 3);
      g.lineStyle(3, FELT_DARK, 1);
      g.beginPath(); g.arc(p.x, p.y - 18, 20, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
      for (const k of [-1, 1]) {
        g.fillStyle(on ? SILK : ready ? FELT : FELT_DARK, 1); g.fillCircle(p.x + k * 19, p.y - 14, 6);
        g.fillStyle(FELT_OAT, 1); g.fillCircle(p.x + k * 19, p.y - 14, 1.5);
      }
      if (!ready && !on) {
        const k = 1 - clamp((readyAt - time) / CD, 0, 1);
        g.lineStyle(1.5, FELT_OAT, 0.6); g.beginPath(); g.arc(p.x, p.y - 18, 24, Math.PI * 1.1, Math.PI * (1.1 + 0.8 * k), false); g.strokePath();
      }
    },
  };
};

// ── Hush Bell Clapper ────────────────────────────────────────────────
// The real clapper's little brother, on a cord. Every 4th ability you cast rings it: a true note
// that stuns the foe for 0.5s and deals 6 if they are within 170px.

const clapper: ItemScriptFactory = (ctx) => {
  let casts = 0;
  let rungAt = -9999;
  let ringX = 0, ringY = 0;
  return {
    onCast() {
      if (!live(ctx)) return;
      casts++;
      if (casts % 4 !== 0) return;
      rungAt = ctx.scene.time.now;
      ringX = ctx.player.x; ringY = ctx.player.y;
      ctx.sfx('clang');
      if (foeLive(ctx) && dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < 170) {
        ctx.stun(ctx.npc, 500);
        ctx.hit(ctx.npc, 6, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 52, 'DONG', '#ffe2a8');
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // The clapper hanging at the hip, swinging with each cast toward the fourth.
      const k = (casts % 4) / 3;
      const a = Math.sin(time / 200) * 0.3 * k;
      const hx = p.x + 18, hy = p.y - 2;
      const bx = hx + Math.sin(a) * 12, by = hy + Math.cos(a) * 12;
      g.lineStyle(1.5, FELT_OAT, 1); g.lineBetween(hx, hy, bx, by);
      g.fillStyle(BRONZE_DARK, 1); g.fillCircle(bx + 1, by + 1, 4.5);
      g.fillStyle(casts % 4 === 3 ? BRONZE_LIT : BRONZE, 1); g.fillCircle(bx, by, 4);
      for (let i = 0; i < 3; i++) { g.fillStyle(i < casts % 4 ? BRONZE_LIT : 0x000000, i < casts % 4 ? 1 : 0.3); g.fillCircle(p.x - 6 + i * 6, p.y + 26, 2); }
      if (time - rungAt < 600) {
        const f = (time - rungAt) / 600;
        for (let j = 0; j < 2; j++) { g.lineStyle(4 - j * 2, BRONZE_LIT, (1 - f) * (0.8 - j * 0.3)); g.strokeCircle(ringX, ringY, 30 + f * 150 - j * 20); }
      }
    },
  };
};

// ── Signer's Glove ───────────────────────────────────────────────────
// Every 7s a hand-shape shows over the foe, each shape standing for one key (STOP E, HOLD R, GO F,
// HUSH Q). Cast that key's ability within 2.5s and you said it right: +12 damage to the foe and
// 1.5s off that ability's cooldown.

const SHAPE_SLOT: Record<HandShape, string> = { palm: 'e', fist: 'r', point: 'f', bell: 'q' };

const glove: ItemScriptFactory = (ctx) => {
  const EVERY = 7000, WINDOW = 2500;
  let shape: HandShape = 'palm';
  let shownAt = -99999;
  let nextAt = 3000;
  let start = -1;
  let saidAt = -9999;
  return {
    update(time) {
      if (start < 0) { start = time; nextAt = time + 3000; }
      if (time >= nextAt) {
        nextAt = time + EVERY;
        shape = HAND_SHAPES[Math.floor(ctx.rng() * 4)];
        shownAt = time;
      }
    },
    onCast(abilityId, slot) {
      const now = ctx.scene.time.now;
      if (now - shownAt > WINDOW || !foeLive(ctx) || !live(ctx)) return;
      const s = slot ?? ctx.slotOf(abilityId);
      if (s !== SHAPE_SLOT[shape]) return;
      shownAt = -99999;
      saidAt = now;
      ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y);
      ctx.refund(abilityId, 1500);
      ctx.float(ctx.npc.x, ctx.npc.y - 70, 'SAID', '#e8c8ff');
      ctx.sfx('sparkle');
    },
    drawAir(g, time) {
      if (!foeLive(ctx)) return;
      const n = ctx.npc;
      if (time - shownAt < WINDOW) {
        const k = 1 - (time - shownAt) / WINDOW;
        const x = n.x, y = n.y - 72;
        g.fillStyle(0x000000, 0.4); g.fillRoundedRect(x - 18, y - 18, 36, 40, 7);
        g.fillStyle(SILK, 0.95); g.fillRoundedRect(x - 16, y - 16, 32, 30, 6);
        handShape(g, x, y - 2, 0.8, shape, HAND_COLORS[shape]);
        g.fillStyle(HAND_COLORS[shape], 1); g.fillRect(x - 15, y + 16, 30 * k, 3);
        // The key it stands for, as pips: one for E … four for Q.
        const pips = ['e', 'r', 'f', 'q'].indexOf(SHAPE_SLOT[shape]) + 1;
        for (let i = 0; i < pips; i++) { g.fillStyle(0xffffff, 0.9); g.fillCircle(x - (pips - 1) * 3.5 + i * 7, y + 24, 2); }
      }
      if (time - saidAt < 500) {
        const k = (time - saidAt) / 500;
        g.lineStyle(3, 0xe8c8ff, 1 - k); g.strokeCircle(n.x, n.y - 10, 20 + k * 30);
      }
    },
  };
};

// ── Felt Slippers ────────────────────────────────────────────────────
// Keep moving for 2s without being struck and your footfalls vanish: your next hit arrives unheard,
// dealing 12 more and knocking the foe back a step.

const slippers: ItemScriptFactory = (ctx) => {
  const NEED = 2000;
  let lx = 0, ly = 0;
  let moving = 0;
  let unheard = false;
  let lastT = -1;
  let popAt = -9999;
  return {
    update(time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const dt = lastT < 0 ? 0 : clamp(time - lastT, 0, 100);
      lastT = time;
      const step = dist(lx, ly, p.x, p.y);
      lx = p.x; ly = p.y;
      if (step > 0.8) moving += dt; else moving = Math.max(0, moving - dt * 2);
      if (!unheard && moving >= NEED) { unheard = true; ctx.sfx('hush'); }
    },
    onHitTaken() { moving = 0; },
    onHitDealt(amount) {
      if (!unheard || amount < 2 || !foeLive(ctx) || !live(ctx)) return;
      unheard = false;
      moving = 0;
      popAt = ctx.scene.time.now;
      ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y);
      const d = Math.max(1, dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y));
      ctx.nudge(ctx.npc, ((ctx.npc.x - ctx.player.x) / d) * 50, ((ctx.npc.y - ctx.player.y) / d) * 50);
      ctx.float(ctx.npc.x, ctx.npc.y - 54, 'UNHEARD', '#dfe6ee');
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const k = clamp(moving / NEED, 0, 1);
      // Felt soles: two pale prints under you, fading out as you go unheard.
      for (const s of [-1, 1]) { g.fillStyle(FELT_OAT, 0.5 * (1 - k)); g.fillEllipse(p.x + s * 7, p.y + 18, 9, 5); }
      if (unheard) { g.lineStyle(1.5, SILK, 0.35 + Math.sin(time / 160) * 0.15); g.strokeEllipse(p.x, p.y + 16, 46, 14); }
      else if (k > 0) { g.lineStyle(1.5, HUSH, 0.5); g.beginPath(); g.arc(p.x, p.y + 16, 22, 0, Math.PI * 2 * k, false); g.strokePath(); }
      if (time - popAt < 450) { const f = (time - popAt) / 450; g.fillStyle(SILK, 0.3 * (1 - f)); g.fillCircle(ctx.npc.x, ctx.npc.y, 20 + f * 40); }
    },
  };
};

// ── Mute's White Ribbon ──────────────────────────────────────────────
// Every 9s a white ribbon unspools from your sleeve and flies to the foe. It gags them: a 0.7s
// stun, and for 3s after they take 25% more. A heavy blow on you (15+) sends the next one sooner.

const whiteRibbon: ItemScriptFactory = (ctx) => {
  const EVERY = 9000, FLIGHT = 700;
  let nextAt = -1;
  let flyAt = -99999;
  let gagAt = -99999;
  let fx = 0, fy = 0;
  return {
    update(time) {
      if (nextAt < 0) nextAt = time + 4000;
      if (!live(ctx) || !foeLive(ctx)) return;
      if (time >= nextAt && time - flyAt > FLIGHT) {
        nextAt = time + EVERY;
        flyAt = time;
        fx = ctx.player.x; fy = ctx.player.y;
        ctx.sfx('whip');
      }
      if (flyAt > 0 && time - flyAt >= FLIGHT && gagAt < flyAt) {
        gagAt = time;
        ctx.stun(ctx.npc, 700);
        ctx.boostDamage(1.25, 3000);
        ctx.float(ctx.npc.x, ctx.npc.y - 60, 'GAGGED', '#ffffff');
        ctx.sfx('status-stun');
      }
    },
    onHitTaken(amount) {
      if (amount >= 15) nextAt -= 3000;
    },
    drawAir(g, time) {
      if (!foeLive(ctx)) return;
      const n = ctx.npc;
      // In flight: a ribbon from where you stood to the foe, its head racing along.
      if (time - flyAt < FLIGHT) {
        const k = (time - flyAt) / FLIGHT;
        const hx = fx + (n.x - fx) * k, hy = fy + (n.y - 20 - fy) * k - Math.sin(k * Math.PI) * 40;
        let px = fx, py = fy;
        for (let i = 1; i <= 12; i++) {
          const t = (i / 12) * k;
          const x = fx + (n.x - fx) * t + Math.sin(t * 12 + time / 80) * 6, y = fy + (n.y - 20 - fy) * t - Math.sin(t * Math.PI) * 40;
          g.lineStyle(4, i % 2 ? SILK : SILK_SHADE, 0.95); g.lineBetween(px, py, x, y);
          px = x; py = y;
        }
        g.fillStyle(SILK, 1); g.fillCircle(hx, hy, 5);
      }
      // Gagged: silk round the foe's face, tails fluttering, for the 3s window.
      if (time - gagAt < 3000) {
        const a = 1 - (time - gagAt) / 3000;
        g.fillStyle(SILK, 0.9 * a); g.fillRoundedRect(n.x - 16, n.y - 30, 32, 8, 4);
        ribbon(g, n.x - 16, n.y - 26, 18, time / 1000, 1, SILK, a, -1);
        g.lineStyle(1.5, MUTE_ACCENT, 0.5 * a); g.strokeCircle(n.x, n.y - 6, 26);
      }
    },
  };
};

export const HUSH_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_EARMUFFS, name: 'Warden\'s Earmuffs', emoji: '🎧', kind: 'charm', price: 440, isle: ISLE,
    flavor: 'Quilted grey felt on a sprung band, a warden\'s issue. They keep out the cold, and the noise, and most of a blow.',
    script: CHARM_EARMUFFS,
    scriptText: [
      'When a hit lands on you, the earmuffs close: for 2.2s, 45% of every further hit is healed back.',
      'Then 9s to plump up again.',
    ],
  },
  {
    id: CHARM_CLAPPER, name: 'Hush Bell Clapper', emoji: '🔔', kind: 'charm', price: 660, isle: ISLE,
    flavor: 'A little bronze clapper on a cord, cast from the same pour as the Hush Bell\'s own. Agnes kept the mould.',
    effect: { damageMult: 1.02 },
    script: CHARM_CLAPPER,
    scriptText: [
      'Every 4th ability you cast rings it: a true note.',
      'A foe within 170px is stunned for 0.5s and takes 6.',
    ],
  },
  {
    id: CHARM_GLOVE, name: 'Signer\'s Glove', emoji: '🧤', kind: 'charm', price: 880, isle: ISLE,
    flavor: 'One white kid glove, the four shapes stitched on its palm. Children at the Sign School practise in pairs of them.',
    script: CHARM_GLOVE,
    scriptText: [
      'Every 7s a hand-shape shows over your foe: STOP = E, HOLD = R, GO = F, HUSH = Q (pips show the key).',
      'Cast that key within 2.5s: 12 extra damage to the foe and 1.5s off that ability\'s cooldown.',
    ],
  },
  {
    id: CHARM_SLIPPERS, name: 'Felt Slippers', emoji: '🥿', kind: 'charm', price: 1120, isle: ISLE,
    flavor: 'Three layers, a quilt of fleece between. Cordwain sews them for the wardens. This pair he sewed for you.',
    effect: { speedMult: 1.04 },
    script: CHARM_SLIPPERS,
    scriptText: [
      'Keep moving for 2s without being struck and you go unheard.',
      'Your next hit lands from nowhere: 12 extra damage, and the foe is knocked back a step.',
    ],
  },
  {
    id: ART_MUTE, name: 'Mute\'s White Ribbon', emoji: '🎀', kind: 'artifact', isle: ISLE,
    flavor: 'The ribbon Prince Mute wore at his own throat, the first one ever tied. He untied it himself and gave it to you.',
    effect: { maxHp: 18 },
    script: ART_MUTE,
    scriptText: [
      'Every 9s a white ribbon flies to your foe and gags them: stunned 0.7s, and they take 25% more for 3s.',
      'Taking a heavy blow (15+) sends the next ribbon 3s sooner.',
    ],
  },
  {
    id: FISH_MULLET, name: 'Mute Mullet', emoji: '🐟', kind: 'fish', sell: 22, isle: ISLE,
    flavor: 'A grey, round-mouthed mullet that never breaks the surface. The Quiet Table\'s soup, most nights.',
    effect: { regenPerSecond: 0.5 },
  },
  {
    id: FISH_WHITING, name: 'Whisper Whiting', emoji: '🐠', kind: 'fish', sell: 38, isle: ISLE,
    flavor: 'Pale and quick, it rises with a sound like someone breathing out. Hold it to your ear and it hushes you.',
    effect: { cooldownMult: 0.97 },
  },
  {
    id: FISH_STURGEON, name: 'Hush Sturgeon', emoji: '🐡', kind: 'fish', sell: 84, isle: ISLE,
    flavor: 'Old as the mere, armoured in bony plates, and so still on the line you think you have snagged a log.',
    effect: { maxHp: 12, damageTakenMult: 0.96 },
  },
];

export const HUSH_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_EARMUFFS]: earmuffs,
  [CHARM_CLAPPER]: clapper,
  [CHARM_GLOVE]: glove,
  [CHARM_SLIPPERS]: slippers,
  [ART_MUTE]: whiteRibbon,
};

export const HUSH_SHOPS: ShopDef[] = [
  { id: 'hush-shop', name: 'Hartwell\'s Felts, Muffs & Mufflers', stock: [CHARM_EARMUFFS, CHARM_CLAPPER, CHARM_GLOVE, CHARM_SLIPPERS], buys: true },
];

export const HUSH_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Hush Mere', kind: 'still' }];

export const HUSH_FISH: FishDef[] = [
  { id: FISH_MULLET, fisheries: [FISHERY], weight: 6, fight: 2, size: [18, 40] },
  { id: FISH_WHITING, fisheries: [FISHERY], weight: 3, fight: 3, size: [20, 38] },
  { id: FISH_STURGEON, fisheries: [FISHERY], weight: 1, fight: 5, size: [80, 190] },
];
