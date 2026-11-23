import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { fireworkBurst, mask } from './art';
import { GILT, HARLE_GREEN, HARLE_RED, HARLE_YELLOW, MIRROR_LIT, OAK_LIT, SEQUINS, SEQ_GOLD, TEAR } from './palette';
import { alive, clamp, dist, wrapAngle } from './util';

/**
 * The Masquerade Court's goods: Ottavia Gesso's four charms, Prince Facade's two faces, and the
 * canal's two fish. Every charm is a masquerade trick that plays one of the court's own rules in
 * your favour — the decoy that pops, the glass that dazzles, the spent stick, Harlequin's swap.
 * Scripts are registered below under their item ids.
 */

const ISLE = 'sound';

export const CHARM_DOMINO = 'masque-charm-domino';
export const CHARM_GLASS = 'masque-charm-hand-glass';
export const CHARM_STICK = 'masque-charm-rocket-stick';
export const CHARM_SLAPSTICK = 'masque-charm-slapstick';
export const ART_FACADE = 'art-facade';

export const FISH_HAKE = 'fish-harlequin-hake';
export const FISH_DORY = 'fish-domino-dory';
export const FISHERY = 'masque-canal';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Domino Half-Mask ─────────────────────────────────────────────────
// Taking a hit leaves a glittering double of you where you stood (at most every 9s, it lasts
// 5s). If your foe comes within reach of it, it pops in their face.

const domino: ItemScriptFactory = (ctx) => {
  let decoy: { x: number; y: number; at: number } | null = null;
  let readyAt = 0;
  let popAt = -9999;
  let popX = 0, popY = 0;
  return {
    onHitTaken() {
      const now = ctx.scene.time.now;
      if (now < readyAt || !live(ctx)) return;
      readyAt = now + 9000;
      decoy = { x: ctx.player.x, y: ctx.player.y, at: now };
      ctx.float(ctx.player.x, ctx.player.y - 50, 'A DOUBLE', '#c8b4f0');
      ctx.sfx('blink');
    },
    update(time) {
      if (!decoy) return;
      if (time - decoy.at > 5000) { decoy = null; return; }
      if (time - decoy.at > 300 && foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, decoy.x, decoy.y) < 70) {
        ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y);
        ctx.stun(ctx.npc, 600);
        ctx.float(decoy.x, decoy.y - 50, 'POP!', '#ffd24a');
        ctx.sfx('sparkle');
        popAt = time; popX = decoy.x; popY = decoy.y;
        decoy = null;
      }
    },
    drawAir(g, time) {
      if (decoy) {
        const fade = clamp((5000 - (time - decoy.at)) / 600, 0, 1);
        g.fillStyle(0x8a6ac8, 0.35 * fade); g.fillCircle(decoy.x, decoy.y - 18, 20);
        mask(g, decoy.x, decoy.y - 30, 0.6, 'moretta', 0x16101c, GILT);
        for (let i = 0; i < 6; i++) {
          const a = time / 400 + i;
          g.fillStyle(SEQUINS[i % 5], 0.7 * fade); g.fillCircle(decoy.x + Math.cos(a) * 24, decoy.y - 18 + Math.sin(a) * 20, 1.6);
        }
      }
      if (time - popAt < 700) fireworkBurst(g, popX, popY - 24, 70, (time - popAt) / 700, SEQ_GOLD, 16);
    },
  };
};

// ── Silvered Hand-Glass ──────────────────────────────────────────────
// Every 8s a glint gathers at your shoulder for a second and flashes. If your foe is where you
// are aiming at the flash (within about 35°, 420px), they are dazzled.

const handGlass: ItemScriptFactory = (ctx) => {
  const PERIOD = 8000, CHARGE = 1000;
  let start = -1;
  let flashAt = -9999;
  let hitFoe = false;
  return {
    update(time) {
      if (start < 0) start = time;
      if (!live(ctx)) return;
      if (time - start >= PERIOD) {
        start = time;
        flashAt = time;
        hitFoe = false;
        if (foeLive(ctx)) {
          const p = ctx.player, n = ctx.npc;
          const a = Math.atan2(n.y - p.y, n.x - p.x);
          if (Math.abs(wrapAngle(a - ctx.facing(p))) < 0.6 && dist(p.x, p.y, n.x, n.y) < 420) {
            hitFoe = true;
            ctx.hit(n, 6, n.x, n.y);
            ctx.stun(n, 700);
            ctx.float(n.x, n.y - 50, 'DAZZLED', '#f2f8ff');
          }
        }
        ctx.sfx('crystal-chime');
      }
    },
    drawAir(g, time) {
      if (!live(ctx) || start < 0) return;
      const p = ctx.player;
      const left = PERIOD - (time - start);
      const x = p.x + 22, y = p.y - 40;
      g.fillStyle(GILT, 1); g.fillEllipse(x, y, 10, 13); g.fillRect(x - 1, y + 6, 2, 6);
      g.fillStyle(MIRROR_LIT, 0.9); g.fillEllipse(x, y, 7, 10);
      if (left < CHARGE) {
        const k = 1 - left / CHARGE;
        glow(g, x, y, 10 + k * 10, 0xffffff, 0.05 + k * 0.08, 2);
        const a = ctx.facing(p);
        g.lineStyle(1, MIRROR_LIT, 0.2 + k * 0.4);
        g.lineBetween(p.x, p.y - 20, p.x + Math.cos(a - 0.6) * 120, p.y - 20 + Math.sin(a - 0.6) * 120);
        g.lineBetween(p.x, p.y - 20, p.x + Math.cos(a + 0.6) * 120, p.y - 20 + Math.sin(a + 0.6) * 120);
      }
      if (time - flashAt < 300) {
        const k = (time - flashAt) / 300;
        const a = ctx.facing(p);
        g.fillStyle(0xffffff, 0.35 * (1 - k));
        g.fillTriangle(p.x, p.y - 20, p.x + Math.cos(a - 0.6) * 420, p.y - 20 + Math.sin(a - 0.6) * 420, p.x + Math.cos(a + 0.6) * 420, p.y - 20 + Math.sin(a + 0.6) * 420);
        if (hitFoe && foeLive(ctx)) { g.lineStyle(3, 0xffffff, 1 - k); g.strokeCircle(ctx.npc.x, ctx.npc.y - 20, 24 + k * 20); }
      }
    },
  };
};

// ── Gerbe's Spent Stick ──────────────────────────────────────────────
// Every 5th cast sends a rocket up from your feet. It chalks a ring under your foe and bursts
// there 1.2s later — for 14, if they have not stepped out.

const rocketStick: ItemScriptFactory = (ctx) => {
  let casts = 0;
  const shells: { x: number; y: number; fromX: number; fromY: number; at: number; done: boolean }[] = [];
  const bursts: { x: number; y: number; at: number }[] = [];
  return {
    onCast() {
      if (!live(ctx) || !foeLive(ctx)) return;
      casts++;
      if (casts % 5) return;
      shells.push({ x: ctx.npc.x, y: ctx.npc.y, fromX: ctx.player.x, fromY: ctx.player.y, at: ctx.scene.time.now, done: false });
      ctx.sfx('mortar-launch');
    },
    update(time) {
      for (const s of shells) {
        if (s.done || time - s.at < 1200) continue;
        s.done = true;
        bursts.push({ x: s.x, y: s.y, at: time });
        ctx.sfx('explosion-small');
        if (foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, s.x, s.y) < 60) ctx.hit(ctx.npc, 14, s.x, s.y);
      }
      for (let i = shells.length - 1; i >= 0; i--) if (shells[i].done) shells.splice(i, 1);
      for (let i = bursts.length - 1; i >= 0; i--) if (time - bursts[i].at > 700) bursts.splice(i, 1);
    },
    drawGround(g, time) {
      for (const s of shells) {
        const k = clamp((time - s.at) / 1200, 0, 1);
        g.lineStyle(2, SEQ_GOLD, 0.4 + k * 0.5); g.strokeCircle(s.x, s.y, 60);
        g.beginPath(); g.arc(s.x, s.y, 52, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },
    drawAir(g, time) {
      for (const s of shells) {
        const k = clamp((time - s.at) / 1200, 0, 1);
        const x = s.fromX + (s.x - s.fromX) * k, y = s.fromY + (s.y - s.fromY) * k - Math.sin(k * Math.PI) * 160;
        g.lineStyle(2, OAK_LIT, 1); g.lineBetween(x, y, x - (s.x - s.fromX) * 0.03, y + 12);
        g.fillStyle(SEQ_GOLD, 1); g.fillCircle(x, y, 3);
      }
      for (const b of bursts) fireworkBurst(g, b.x, b.y - 20, 70, (time - b.at) / 700, SEQUINS[Math.floor(b.x) % 5], 14);
    },
  };
};

// ── Harlequin's Slapstick ────────────────────────────────────────────
// When your foe hits you from close by (within 160px), CRACK: you swap places, and they take the
// stick for 8 and a short stun. At most once every 12s.

const slapstick: ItemScriptFactory = (ctx) => {
  let readyAt = 0;
  let crackAt = -9999;
  let ax = 0, ay = 0, bx = 0, by = 0;
  return {
    onHitTaken() {
      const now = ctx.scene.time.now;
      if (now < readyAt || !live(ctx) || !foeLive(ctx)) return;
      const p = ctx.player, n = ctx.npc;
      if (dist(p.x, p.y, n.x, n.y) > 160) return;
      readyAt = now + 12000;
      crackAt = now;
      ax = p.x; ay = p.y; bx = n.x; by = n.y;
      const dx = n.x - p.x, dy = n.y - p.y;
      ctx.nudge(p, dx, dy);
      ctx.nudge(n, -dx, -dy);
      ctx.hit(n, 8, n.x, n.y);
      ctx.stun(n, 400);
      ctx.float(n.x, n.y - 50, 'CRACK!', '#f0c838');
      ctx.sfx('whip');
    },
    drawAir(g, time) {
      const k = (time - crackAt) / 450;
      if (k < 0 || k > 1) return;
      const cs = [HARLE_RED, HARLE_GREEN, HARLE_YELLOW];
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const x = ax + (bx - ax) * t, y = ay + (by - ay) * t - Math.sin(t * Math.PI) * 50;
        g.fillStyle(cs[i % 3], 1 - k); g.fillTriangle(x - 5, y, x, y - 6, x + 5, y); g.fillTriangle(x - 5, y, x, y + 6, x + 5, y);
      }
    },
  };
};

// ── Facade's Two Faces (artifact) ────────────────────────────────────
// Your mask turns every 6s: Comedy (each hit you land heals 2) or Tragedy (each hit you land
// lets a tear fall on the foe 0.8s later, for 5, if they are still under it). Once a fight,
// dropping under 30% health: Curtain Call — the house rises, your foe is stunned and you heal.

const twoFaces: ItemScriptFactory = (ctx) => {
  const PERIOD = 6000;
  let t0 = -1;
  const tears: { x: number; y: number; at: number; done: boolean }[] = [];
  let curtainDone = false;
  let curtainAt = -9999;
  const comedy = (time: number) => t0 < 0 || Math.floor((time - t0) / PERIOD) % 2 === 0;
  return {
    update(time) {
      if (t0 < 0) t0 = time;
      for (const t of tears) {
        if (t.done || time - t.at < 800) continue;
        t.done = true;
        if (foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, t.x, t.y) < 40) ctx.hit(ctx.npc, 5, t.x, t.y);
      }
      for (let i = tears.length - 1; i >= 0; i--) if (tears[i].done) tears.splice(i, 1);
      if (!curtainDone && live(ctx) && ctx.player.hp < ctx.player.maxHp * 0.3) {
        curtainDone = true;
        curtainAt = time;
        ctx.heal(ctx.player, 24);
        if (foeLive(ctx)) ctx.stun(ctx.npc, 1200);
        ctx.float(ctx.player.x, ctx.player.y - 60, 'CURTAIN CALL', '#ffd24a');
        ctx.sfx('holy-chord');
      }
    },
    onHitDealt(amount) {
      if (amount < 2 || !live(ctx) || !foeLive(ctx)) return;
      const now = ctx.scene.time.now;
      if (comedy(now)) ctx.heal(ctx.player, 2);
      else if (tears.length < 6) tears.push({ x: ctx.npc.x, y: ctx.npc.y, at: now, done: false });
    },
    drawGround(g, time) {
      for (const t of tears) {
        const k = clamp((time - t.at) / 800, 0, 1);
        g.fillStyle(TEAR, 0.15 + k * 0.25); g.fillEllipse(t.x, t.y, 30 + k * 20, 10 + k * 6);
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      mask(g, p.x - 24, p.y - 44, 0.38, comedy(time) ? 'comedy' : 'tragedy', 0xf2ece4, GILT);
      for (const t of tears) {
        const k = clamp((time - t.at) / 800, 0, 1);
        g.fillStyle(TEAR, 0.9); g.fillCircle(t.x, t.y - 120 * (1 - k) - 10, 4);
        g.fillTriangle(t.x - 4, t.y - 120 * (1 - k) - 11, t.x + 4, t.y - 120 * (1 - k) - 11, t.x, t.y - 120 * (1 - k) - 20);
      }
      if (time - curtainAt < 1200) {
        const k = (time - curtainAt) / 1200;
        g.fillStyle(0xa01e3a, 0.35 * (1 - k)); g.fillRect(0, 0, ctx.W, 96 + k * 60);
        fireworkBurst(g, p.x, p.y - 40, 90, k, SEQ_GOLD, 18);
      }
    },
  };
};

export const MASQUE_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_DOMINO, name: 'Domino Half-Mask', emoji: '🎭', kind: 'charm', price: 480, isle: ISLE,
    flavor: 'Black velvet, a sequin rim, no Part on the brow. Domino\'s spares. She has a drawer of them and never wears one twice.',
    script: CHARM_DOMINO,
    scriptText: [
      'Taking a hit leaves a glittering double where you stood (at most every 9s; it lasts 5s).',
      'If your foe comes within reach of it, it pops: 12 damage and a 0.6s stun.',
    ],
  },
  {
    id: CHARM_GLASS, name: 'Silvered Hand-Glass', emoji: '🪞', kind: 'charm', price: 640, isle: ISLE,
    flavor: 'A gilt hand-mirror the size of a palm. Silver backs them herself. It shows you a face, which is why it is sold under the counter.',
    script: CHARM_GLASS,
    scriptText: [
      'Every 8s a glint gathers at your shoulder for a second, then flashes where you aim.',
      'A foe within about 35° of your aim (and 420px) is dazzled: 6 damage and a 0.7s stun.',
    ],
  },
  {
    id: CHARM_STICK, name: 'Gerbe\'s Spent Stick', emoji: '🎆', kind: 'charm', price: 820, isle: ISLE,
    flavor: 'A burnt rocket-stick with the paper still curled on it. Gerbe tied a ribbon round it. "Lucky," he said. "It went up."',
    effect: { statusDmgMult: 1.04 },
    script: CHARM_STICK,
    scriptText: [
      'Every 5th cast sends a rocket up from your feet; it chalks a ring under your foe.',
      'It bursts there 1.2s later for 14, if they have not stepped out of the ring.',
    ],
  },
  {
    id: CHARM_SLAPSTICK, name: 'Harlequin\'s Slapstick', emoji: '🃏', kind: 'charm', price: 1050, isle: ISLE,
    flavor: 'Two slats of painted lath bound at the grip, made to crack loud and hurt little. Patch has hurt a great many people a little.',
    effect: { maxHp: 5 },
    script: CHARM_SLAPSTICK,
    scriptText: [
      'When your foe hits you from within 160px: CRACK — you swap places with them.',
      'They take 8 and a 0.4s stun. At most once every 12s.',
    ],
  },
  {
    id: ART_FACADE, name: 'Facade\'s Two Faces', emoji: '🎭', kind: 'artifact', isle: ISLE,
    flavor: 'The Prince\'s own mask, porcelain, laughing on one side and weeping on the other. Under it, for twenty-two years, a face.',
    effect: { maxHp: 14 },
    script: ART_FACADE,
    scriptText: [
      'Your mask turns every 6s. Comedy: each hit you land heals 2. Tragedy: each hit lets a tear fall',
      'on your foe 0.8s later (5 damage if they are still under it). Once a fight, under 30% health:',
      'Curtain Call — your foe is stunned 1.2s and you heal 24.',
    ],
  },
  {
    id: FISH_HAKE, name: 'Harlequin Hake', emoji: '🐟', kind: 'fish', sell: 22, isle: ISLE,
    flavor: 'Patched all over in red, green and gold diamonds, as if it dressed for the ball. It leaps when the band plays.',
    effect: { speedMult: 1.03 },
  },
  {
    id: FISH_DORY, name: 'Domino Dory', emoji: '🐠', kind: 'fish', sell: 34, isle: ISLE,
    flavor: 'A flat silver dory with a black band across its eyes like a mask. Cooked in saor — onions, raisins — it is the court\'s Sunday dish.',
    effect: { critChance: 0.04 },
  },
];

export const MASQUE_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_DOMINO]: domino,
  [CHARM_GLASS]: handGlass,
  [CHARM_STICK]: rocketStick,
  [CHARM_SLAPSTICK]: slapstick,
  [ART_FACADE]: twoFaces,
};

export const MASQUE_SHOPS: ShopDef[] = [
  { id: 'masque-shop', name: 'Gesso\'s Masks & Mirrors', stock: [CHARM_DOMINO, CHARM_GLASS, CHARM_STICK, CHARM_SLAPSTICK], buys: true },
];

export const MASQUE_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Rio dei Mascherai', kind: 'sea' }];

export const MASQUE_FISH: FishDef[] = [
  { id: FISH_HAKE, fisheries: [FISHERY], weight: 6, fight: 3, size: [30, 72] },
  { id: FISH_DORY, fisheries: [FISHERY], weight: 3, fight: 4, size: [22, 50] },
];
