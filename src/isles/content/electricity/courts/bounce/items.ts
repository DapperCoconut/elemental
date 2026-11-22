import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { balloon, superball, windKey } from './art';
import { BRASS, BRASS_DARK, BRASS_LIT, CREPE, LATEX_LIT, SPROCKET, TOY_BLUE, TOY_PINK, TOY_RED, TOY_YELLOW } from './palette';
import { alive, clamp, clock, dist } from './util';

/**
 * The Bounce Court's goods: Gutta Percival's four charms, Prince Sprocket's mainspring, and the
 * latex pool's two fish. Every charm is a rubber-town thing that does what rubber does — gives,
 * stores, springs back — and every one plays a little game with the fight. Scripts are
 * registered below under their item ids.
 */

const ISLE = 'electricity';

export const CHARM_GASBAG = 'bounce-charm-gasbag';
export const CHARM_SNAPBACK = 'bounce-charm-snapback-band';
export const CHARM_SUPERBALL = 'bounce-charm-pocket-superball';
export const CHARM_KEY = 'bounce-charm-wind-up-key';
export const ART_SPROCKET = 'art-sprocket';

export const FISH_GUPPY = 'fish-rubber-guppy';
export const FISH_BASS = 'fish-bounce-bass';
export const FISHERY = 'bounce-latex';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Wrist Gasbag ─────────────────────────────────────────────────────
// A little balloon tied to your wrist fills over 8s. Full, the next hit you take pops it
// instead: that hit's damage is given back (up to 12), and the burst floats you away fast.

const gasbag: ItemScriptFactory = (ctx) => {
  const FILL = 8000;
  let since = -1;
  let popAt = -9999;
  return {
    update(time) { if (since < 0) since = time; },
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (since < 0 || now - since < FILL || amount < 1 || !live(ctx)) return;
      since = now;
      popAt = now;
      ctx.heal(ctx.player, Math.min(12, Math.round(amount)));
      ctx.boostSpeed(1.4, 1500);
      ctx.float(ctx.player.x, ctx.player.y - 60, 'POP!', '#ffb0d8');
      ctx.sfx('explosion-small');
    },
    drawAir(g, time) {
      if (!live(ctx) || since < 0) return;
      const p = ctx.player;
      const k = clamp((time - since) / FILL, 0, 1);
      if (time - popAt < 400) {
        const q = (time - popAt) / 400;
        for (let i = 0; i < 7; i++) { const a = i * 0.9; g.fillStyle(TOY_PINK, 1 - q); g.fillCircle(p.x + 20 + Math.cos(a) * q * 30, p.y - 56 + Math.sin(a) * q * 30, 2.5); }
        return;
      }
      balloon(g, p.x + 18, p.y - 10, 4 + k * 8, k >= 1 ? TOY_PINK : 0xd8a0b8, 22 + k * 10, Math.sin(time / 500) * 4);
      if (k >= 1) glow(g, p.x + 18, p.y - 50, 16, TOY_PINK, 0.05, 2);
    },
  };
};

// ── Snapback Band ────────────────────────────────────────────────────
// Taking a hit stretches the band on your wrist, storing half the damage (up to 20). Land a hit
// within 3s to snap it back into the foe. Miss the window and it snaps back on you, for 3.

const snapback: ItemScriptFactory = (ctx) => {
  const WINDOW = 3000;
  let stored = 0;
  let storedAt = 0;
  let snapFx = -9999;
  return {
    update(time) {
      if (stored > 0 && time - storedAt > WINDOW) {
        stored = 0;
        if (live(ctx)) { ctx.hit(ctx.player, 3, ctx.player.x, ctx.player.y); ctx.float(ctx.player.x, ctx.player.y - 50, 'THWAP', '#ffd0a0'); }
      }
    },
    onHitTaken(amount) {
      if (stored > 0 || amount < 2) return;
      stored = Math.min(20, Math.round(amount * 0.5));
      storedAt = ctx.scene.time.now;
      ctx.sfx('whip');
    },
    onHitDealt() {
      if (stored <= 0 || !foeLive(ctx)) return;
      ctx.hit(ctx.npc, stored, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x, ctx.npc.y - 54, `SNAPBACK ${stored}`, '#ffd080');
      ctx.sfx('snap-back');
      stored = 0;
      snapFx = ctx.scene.time.now;
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (stored > 0) {
        // The band pulled back off the wrist, shaking as the window runs out.
        const k = clamp((time - storedAt) / WINDOW, 0, 1);
        const len = 14 + stored * 1.6;
        const shake = Math.sin(time / 30) * k * 3;
        const ax = p.x - 16, ay = p.y - 4;
        g.lineStyle(4 - k * 2, CREPE, 1); g.lineBetween(ax, ay, ax - len, ay - 10 + shake);
        g.lineStyle(1, LATEX_LIT, 0.7); g.lineBetween(ax, ay - 1, ax - len, ay - 11 + shake);
        g.lineStyle(2, TOY_RED, 0.8);
        g.beginPath(); g.arc(p.x, p.y - 6, 28, -Math.PI / 2, -Math.PI / 2 + (1 - k) * Math.PI * 2, false); g.strokePath();
      } else {
        g.lineStyle(3, CREPE, 1); g.strokeEllipse(p.x - 16, p.y - 4, 8, 4);
      }
      const sk = (time - snapFx) / 300;
      if (sk >= 0 && sk < 1 && foeLive(ctx)) {
        g.lineStyle(3 * (1 - sk), TOY_YELLOW, 1 - sk); g.lineBetween(p.x, p.y - 6, ctx.npc.x, ctx.npc.y - 6);
      }
    },
  };
};

// ── Pocket Superball ─────────────────────────────────────────────────
// A little superball bounces round the arena with you, faster off every wall. Rolling into the
// foe it hits for 3 + 1 per wall since its last hit (up to 12). Touch it to send it at them.

const pocketBall: ItemScriptFactory = (ctx) => {
  const R = 8;
  const top = 96;
  const tick = clock();
  const b = { x: 0, y: 0, vx: 170, vy: -140, walls: 0, cd: 0, init: false, spin: 0 };
  const sp = () => Math.hypot(b.vx, b.vy);
  const setSp = (s: number) => { const k = s / (sp() || 1); b.vx *= k; b.vy *= k; };
  return {
    update(time) {
      const dt = tick(time);
      if (!live(ctx)) return;
      if (!b.init) { b.init = true; b.x = ctx.player.x + 30; b.y = ctx.player.y; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.spin += sp() * dt * 0.05;
      const wall = () => { b.walls++; setSp(Math.min(620, sp() * 1.08)); };
      if (b.x < 30 + R) { b.x = 30 + R; b.vx = Math.abs(b.vx); wall(); }
      if (b.x > ctx.W - 30 - R) { b.x = ctx.W - 30 - R; b.vx = -Math.abs(b.vx); wall(); }
      if (b.y < top + 20 + R) { b.y = top + 20 + R; b.vy = Math.abs(b.vy); wall(); }
      if (b.y > ctx.H - 24 - R) { b.y = ctx.H - 24 - R; b.vy = -Math.abs(b.vy); wall(); }
      if (time < b.cd) return;
      const p = ctx.player, n = ctx.npc;
      if (dist(b.x, b.y, p.x, p.y) < R + 20 && foeLive(ctx)) {
        // Sent at the foe.
        const a = Math.atan2(n.y - b.y, n.x - b.x);
        const s = Math.max(260, sp());
        b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s;
        b.cd = time + 250;
        ctx.sfx('boing');
      } else if (foeLive(ctx) && dist(b.x, b.y, n.x, n.y) < R + 22) {
        const dmg = Math.min(12, 3 + b.walls);
        ctx.hit(n, dmg, n.x, n.y);
        ctx.float(n.x, n.y - 50, b.walls >= 4 ? `BONK ×${b.walls}` : 'BONK', '#ffe080');
        ctx.sfx('hit-light');
        const a = Math.atan2(b.y - n.y, b.x - n.x);
        b.vx = Math.cos(a) * 200; b.vy = Math.sin(a) * 200;
        b.walls = 0;
        b.cd = time + 500;
      }
    },
    drawGround(g) {
      if (!b.init || !live(ctx)) return;
      g.fillStyle(0x000000, 0.3); g.fillEllipse(b.x + 2, b.y + R + 2, R * 2, R * 0.7);
    },
    drawAir(g) {
      if (!b.init || !live(ctx)) return;
      const c = b.walls >= 6 ? TOY_RED : b.walls >= 3 ? TOY_YELLOW : TOY_BLUE;
      superball(g, b.x, b.y, R, c, b.spin);
      if (b.walls >= 3) { g.lineStyle(1.5, c, 0.5); g.strokeCircle(b.x, b.y, R + 3 + Math.min(6, b.walls)); }
    },
  };
};

// ── Wind-Up Key ──────────────────────────────────────────────────────
// Every cast winds the key in your back one turn. At five turns it springs: every ability you
// have cast this fight comes back 2.5s sooner. Go 4s without casting and it runs down a turn.

const windUpKey: ItemScriptFactory = (ctx) => {
  const TURNS = 5;
  let turns = 0;
  let lastCast = 0;
  let sprungAt = -9999;
  const known = new Map<string, string>();
  let angle = 0;
  const tick = clock();
  return {
    update(time) {
      const dt = tick(time);
      angle += dt * turns * 0.8;
      if (turns > 0 && time - lastCast > 4000) { turns--; lastCast = time; }
    },
    onCast(abilityId, slot) {
      const now = ctx.scene.time.now;
      if (slot) known.set(slot, abilityId);
      lastCast = now;
      turns++;
      angle += Math.PI / 2;
      ctx.sfx('gear-turn');
      if (turns < TURNS) return;
      turns = 0;
      sprungAt = now;
      for (const id of known.values()) ctx.refund(id, 2500);
      ctx.float(ctx.player.x, ctx.player.y - 60, 'SPRUNG!', '#f4d488');
      ctx.sfx('clock-tick');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 14, y = p.y - 26;
      windKey(g, x, y, angle, 12, time - sprungAt < 400 ? BRASS_LIT : BRASS);
      for (let i = 0; i < TURNS; i++) {
        g.fillStyle(i < turns ? BRASS_LIT : BRASS_DARK, i < turns ? 1 : 0.5); g.fillCircle(p.x - 16 + i * 8, p.y - 48, 2.2);
      }
      const sk = (time - sprungAt) / 500;
      if (sk >= 0 && sk < 1) { g.lineStyle(3 * (1 - sk), BRASS_LIT, 1 - sk); g.strokeCircle(p.x, p.y - 6, 24 + sk * 40); }
    },
  };
};

// ── Sprocket's Mainspring (artifact) ─────────────────────────────────
// Every hit you land winds it. Eight winds and it lets go: the recoil strikes the foe for 10,
// and for 4s you hit 25% harder and move 30% faster. Once a fight, dropping under a quarter of
// your health, it unwinds into you instead: 25 health back over 2.5s.

const mainspring: ItemScriptFactory = (ctx) => {
  const WINDS = 8;
  let winds = 0;
  let releasedAt = -9999;
  let used = false;
  let healLeft = 0;
  let healNext = 0;
  return {
    update(time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (!used && p.hp > 0 && p.hp < p.maxHp * 0.25) {
        used = true;
        healLeft = 25;
        healNext = time;
        ctx.float(p.x, p.y - 60, 'UNWINDING', '#f4d488');
        ctx.sfx('heal');
      }
      if (healLeft > 0 && time >= healNext) {
        healNext = time + 500;
        ctx.heal(p, 5);
        healLeft -= 5;
      }
    },
    onHitDealt(amount) {
      if (amount < 2 || !foeLive(ctx)) return;
      winds++;
      if (winds < WINDS) return;
      winds = 0;
      releasedAt = ctx.scene.time.now;
      ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y);
      ctx.boostDamage(1.25, 4000);
      ctx.boostSpeed(1.3, 4000);
      ctx.float(ctx.player.x, ctx.player.y - 60, 'MAINSPRING!', '#ff8a6a');
      ctx.sfx('snap-back');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const going = time - releasedAt < 4000;
      // A coil at your back, tightening with each wind; loose and glowing while it runs.
      const turns = going ? 3 : 1 + winds * 0.6;
      const r = going ? 12 + Math.sin(time / 60) * 2 : 12 - winds * 0.6;
      g.lineStyle(2, going ? SPROCKET : BRASS, 1);
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * Math.PI * 2 * turns + (going ? time / 80 : 0);
        const rr = r * (i / 40);
        const x = p.x - 18 + Math.cos(a) * rr, y = p.y - 30 + Math.sin(a) * rr;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
      if (going) glow(g, p.x, p.y - 6, 30, SPROCKET, 0.04, 3);
      if (healLeft > 0) { g.lineStyle(2, BRASS_LIT, 0.6); g.strokeCircle(p.x, p.y - 6, 26 + Math.sin(time / 90) * 3); }
    },
  };
};

export const BOUNCE_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_GASBAG, name: 'Wrist Gasbag', emoji: '🎈', kind: 'charm', price: 320, isle: ISLE,
    flavor: 'A little balloon on a loop of string, the kind Puff ties on children who have been very brave at the doctor\'s.',
    script: CHARM_GASBAG,
    scriptText: [
      'A balloon on your wrist fills over 8s.',
      'Full, the next hit you take pops it: that hit\'s damage is given back (up to 12) and you float away 40% faster for 1.5s.',
    ],
  },
  {
    id: CHARM_SNAPBACK, name: 'Snapback Band', emoji: '➰', kind: 'charm', price: 440, isle: ISLE,
    flavor: 'A band from Elastica\'s test walk that would not snap. She gave up on it. It has been waiting ever since.',
    script: CHARM_SNAPBACK,
    scriptText: [
      'Taking a hit stretches the band, storing half the damage (up to 20).',
      'Land a hit within 3s to snap it into the foe. Miss the window and it snaps back on you for 3.',
    ],
  },
  {
    id: CHARM_SUPERBALL, name: 'Pocket Superball', emoji: '🔴', kind: 'charm', price: 580, isle: ISLE,
    flavor: 'One of the Ball Court\'s confiscated balls, slipped out of Ricochet\'s sack. It has never once stopped bouncing.',
    effect: { speedMult: 1.03 },
    script: CHARM_SUPERBALL,
    scriptText: [
      'A superball bounces round the arena, faster off every wall. Touch it to send it at your foe.',
      'It hits them for 3 + 1 per wall it struck since its last hit (up to 12).',
    ],
  },
  {
    id: CHARM_KEY, name: 'Wind-Up Key', emoji: '🗝️', kind: 'charm', price: 780, isle: ISLE,
    flavor: 'A brass key from old Hobb\'s bench, made for a toy that was never finished. It fits any back.',
    effect: { maxHp: 6 },
    script: CHARM_KEY,
    scriptText: [
      'Every cast winds the key one turn. At 5 turns it springs: every ability you have cast comes back 2.5s sooner.',
      'Go 4s without casting and it runs down a turn.',
    ],
  },
  {
    id: ART_SPROCKET, name: 'Sprocket\'s Mainspring', emoji: '🌀', kind: 'artifact', isle: ISLE,
    flavor: 'The spring out of the Prince\'s pogo stick. He kept it wound for twelve years. He gave it away with a laugh.',
    effect: { maxHp: 14 },
    script: ART_SPROCKET,
    scriptText: [
      'Every hit you land winds it. At 8 winds it lets go: 10 to the foe, then +25% damage and +30% speed for 4s.',
      'Once a fight, under 25% health, it unwinds into you instead: 25 health back over 2.5s.',
    ],
  },
  {
    id: FISH_GUPPY, name: 'Rubber Guppy', emoji: '🐠', kind: 'fish', sell: 14, isle: ISLE,
    flavor: 'Bright yellow and springy to the touch. Squeaks when squeezed. Children of the plantation keep them as pets.',
    effect: { dodgeChance: 0.03 },
  },
  {
    id: FISH_BASS, name: 'Bounce Bass', emoji: '🐟', kind: 'fish', sell: 32, isle: ISLE,
    flavor: 'A fat cream-white bass that lives in the thick of the latex and leaps clear of it, boing, when hooked.',
    effect: { maxHp: 8 },
  },
];

export const BOUNCE_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_GASBAG]: gasbag,
  [CHARM_SNAPBACK]: snapback,
  [CHARM_SUPERBALL]: pocketBall,
  [CHARM_KEY]: windUpKey,
  [ART_SPROCKET]: mainspring,
};

export const BOUNCE_SHOPS: ShopDef[] = [
  { id: 'bounce-shop', name: 'Percival\'s Elastics & Notions', stock: [CHARM_GASBAG, CHARM_SNAPBACK, CHARM_SUPERBALL, CHARM_KEY], buys: true },
];

export const BOUNCE_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Latex Pool', kind: 'syrup' }];

export const BOUNCE_FISH: FishDef[] = [
  { id: FISH_GUPPY, fisheries: [FISHERY], weight: 6, fight: 2, size: [6, 16] },
  { id: FISH_BASS, fisheries: [FISHERY], weight: 2, fight: 4, size: [24, 52] },
];
