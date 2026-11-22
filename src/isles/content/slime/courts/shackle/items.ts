import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow, lit } from '../../../../art/IsleArt';
import { chainLinks, ironBall, key, manacle, sagPoints } from './art';
import { BRASS, BRASS_LIT, BRUISE_LIT, FETTER_KEY, HOT_LIT, INK, IRON, IRON_DARK, IRON_LIT, PAPER, TIMBER, TIMBER_LIT } from './palette';
import { alive, clamp, clock, dist } from './util';

/**
 * The Shackle Court's goods: Mother Hock's four pledges (charms nobody came back to redeem),
 * Prince Fetter's last key, and the chain moat's two fish. Every charm plays one of the court's
 * own rules in your favour — the tally, the books balanced, the ball on the chain, the keys on
 * the ring. Scripts are registered below under their item ids.
 */

const ISLE = 'slime';

export const CHARM_TALLY = 'shackle-charm-tally-stick';
export const CHARM_QUILL = 'shackle-charm-ledger-quill';
export const CHARM_SHOT = 'shackle-charm-plumb-shot';
export const CHARM_KEYRING = 'shackle-charm-keyring';
export const ART_FETTER = 'art-fetter';

export const FISH_SHAD = 'fish-shackle-shad';
export const FISH_IRONGILL = 'fish-irongill';
export const FISHERY = 'shackle-moat';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Tally Stick ──────────────────────────────────────────────────────
// Every hit you take cuts a notch in the stick (six at most). The next hit you land settles the
// tally: 3 extra damage per notch, and the stick is split and starts clean.

const tallyStick: ItemScriptFactory = (ctx) => {
  let notches = 0;
  let splitAt = -9999;
  let busy = false;
  return {
    onHitTaken(amount) {
      if (amount < 1 || !live(ctx)) return;
      notches = Math.min(6, notches + 1);
    },
    onHitDealt(amount) {
      if (busy || amount < 1 || notches === 0 || !foeLive(ctx)) return;
      busy = true;
      const extra = notches * 3;
      ctx.hit(ctx.npc, extra, ctx.npc.x, ctx.npc.y - 20);
      ctx.float(ctx.npc.x, ctx.npc.y - 52, `SETTLED +${extra}`, '#f0d48a');
      ctx.sfx('snap-back');
      notches = 0;
      splitAt = ctx.scene.time.now;
      busy = false;
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 24, y = p.y - 36;
      if (time - splitAt < 400) {
        const k = (time - splitAt) / 400;
        g.fillStyle(TIMBER_LIT, 1 - k); g.fillRect(x - 12 - k * 10, y - 3, 12, 5); g.fillRect(x + k * 10, y - 3, 12, 5);
        return;
      }
      g.fillStyle(TIMBER, 1); g.fillRoundedRect(x - 13, y - 3, 26, 6, 2);
      g.fillStyle(TIMBER_LIT, 0.8); g.fillRect(x - 12, y - 3, 24, 1.5);
      for (let i = 0; i < notches; i++) { g.fillStyle(INK, 1); g.fillTriangle(x - 10 + i * 4, y - 3, x - 8 + i * 4, y - 3, x - 9 + i * 4, y + 1); }
      if (notches >= 4) glow(g, x, y, 14, BRASS_LIT, 0.05, 2);
    },
  };
};

// ── Ledger Quill ─────────────────────────────────────────────────────
// Every 8 s the quill balances your books for those 8 s. In credit (you dealt more than you
// took): 3 s of +20% damage. In arrears: the difference is written off — you heal a third of it
// (at most 12).

const ledgerQuill: ItemScriptFactory = (ctx) => {
  const PERIOD = 8000;
  let since = -1;
  let dealt = 0, taken = 0;
  let resultAt = -9999;
  let credit = true;
  return {
    update(time) {
      if (since < 0) since = time;
      if (time - since < PERIOD) return;
      since = time;
      if (!live(ctx)) { dealt = 0; taken = 0; return; }
      if (dealt > taken && dealt > 0) {
        credit = true;
        ctx.boostDamage(1.2, 3000);
        ctx.float(ctx.player.x, ctx.player.y - 56, 'IN CREDIT', '#f0d48a');
        ctx.sfx('money');
        resultAt = time;
      } else if (taken > dealt) {
        credit = false;
        const h = Math.min(12, Math.round((taken - dealt) / 3));
        if (h > 0) { ctx.heal(ctx.player, h); ctx.float(ctx.player.x, ctx.player.y - 56, 'WRITTEN OFF', '#c8a0d8'); ctx.sfx('heal'); }
        resultAt = time;
      }
      dealt = 0; taken = 0;
    },
    onHitDealt(amount) { dealt += amount; },
    onHitTaken(amount) { taken += amount; },
    drawAir(g, time) {
      if (!live(ctx) || since < 0) return;
      const p = ctx.player;
      const x = p.x + 26, y = p.y - 38;
      // A little open book with the period ticking round it, and the quill.
      g.fillStyle(0x3a1a20, 1); g.fillRect(x - 9, y - 6, 18, 12);
      g.fillStyle(PAPER, 1); g.fillRect(x - 8, y - 5, 7.5, 10); g.fillRect(x + 0.5, y - 5, 7.5, 10);
      const k = clamp((time - since) / PERIOD, 0, 1);
      g.lineStyle(2, dealt >= taken ? BRASS : BRUISE_LIT, 0.8);
      g.beginPath(); g.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      g.lineStyle(1.4, 0xf4f0e6, 1); g.lineBetween(x + 3, y + 2, x + 12, y - 14);
      if (time - resultAt < 600) {
        const q = (time - resultAt) / 600;
        g.lineStyle(2, credit ? BRASS_LIT : BRUISE_LIT, 1 - q); g.strokeCircle(x, y, 14 + q * 20);
      }
    },
  };
};

// ── Plumb Shot ───────────────────────────────────────────────────────
// A plum-sized iron ball rides on a short chain at your heel. It trails you like the gang's balls
// do; dash and it whips round, and a whipping ball that meets your foe hits them for 9 and shoves
// them along its swing (once every 1.2 s).

const plumbShot: ItemScriptFactory = (ctx) => {
  const L = 62;
  const p0 = ctx.player;
  let x = p0.x - 30, y = p0.y + 20, px = x, py = y;
  let lx = p0.x, ly = p0.y;
  let speed = 0;
  let hitAt = -9999;
  const tick = clock();
  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0 || !live(ctx)) { lx = ctx.player.x; ly = ctx.player.y; return; }
      const p = ctx.player;
      const fvx = (p.x - lx) / dt, fvy = (p.y - ly) / dt;
      lx = p.x; ly = p.y;
      const fv = Math.hypot(fvx, fvy);
      if (fv > 430 && fv < 6000) {
        // Whip it: a kick across the chain.
        const cx = x - p.x, cy = y - p.y, cl = Math.hypot(cx, cy) || 1;
        const tx = -cy / cl, ty = cx / cl;
        const sign = Math.sign(tx * fvx + ty * fvy) || 1;
        px = x - tx * sign * 9; py = y - ty * sign * 9;
      }
      const damp = Math.pow(0.16, dt);
      let nx = x + (x - px) * damp, ny = y + (y - py) * damp;
      const d = dist(nx, ny, p.x, p.y);
      if (d > L) { nx = p.x + ((nx - p.x) * L) / d; ny = p.y + ((ny - p.y) * L) / d; }
      px = x; py = y; x = nx; y = ny;
      speed = dist(x, y, px, py) / dt;
      const n = ctx.npc;
      if (foeLive(ctx) && speed > 240 && time - hitAt > 1200 && dist(x, y, n.x, n.y) < 32) {
        hitAt = time;
        const ux = (x - px) / (dist(x, y, px, py) || 1), uy = (y - py) / (dist(x, y, px, py) || 1);
        ctx.hit(n, 9, n.x, n.y);
        ctx.nudge(n, ux * 40, uy * 40);
        ctx.flash(x, y, 0xd8dce4);
        ctx.sfx('anvil');
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const d = dist(p.x, p.y + 12, x, y - 7);
      const sag = d < L ? Math.sqrt(Math.max(0, L * L - d * d)) * 0.25 : 0;
      chainLinks(g, sagPoints(p.x, p.y + 12, x, y - 7, sag, 6), 6, IRON, 1.2);
      if (speed > 240) { g.fillStyle(IRON_DARK, 0.2); g.fillCircle(x - (x - px) * 1.5, y - (y - py) * 1.5, 7); }
      ironBall(g, x, y, 7, 0.3);
      if (time - hitAt < 250) { g.lineStyle(2, HOT_LIT, 1 - (time - hitAt) / 250); g.strokeCircle(x, y, 10 + (time - hitAt) / 15); }
    },
  };
};

// ── Gaoler's Keyring ─────────────────────────────────────────────────
// Every E, R and F you cast hangs its key on the ring for 7 s. With all three keys on the ring at
// once the lock turns: each of the three comes 1.5 s off cooldown, the foe is stunned for 0.6 s,
// and the ring is emptied.

const keyring: ItemScriptFactory = (ctx) => {
  const keys = new Map<string, { id: string; at: number }>();
  let turnAt = -9999;
  return {
    update(time) {
      for (const [slot, k] of keys) if (time - k.at > 7000) keys.delete(slot);
    },
    onCast(abilityId, slot) {
      if (!live(ctx) || (slot !== 'e' && slot !== 'r' && slot !== 'f')) return;
      const now = ctx.scene.time.now;
      keys.set(slot, { id: abilityId, at: now });
      if (keys.size < 3) return;
      for (const k of keys.values()) ctx.refund(k.id, 1500);
      if (foeLive(ctx)) { ctx.stun(ctx.npc, 600); ctx.float(ctx.npc.x, ctx.npc.y - 54, 'LOCKED', '#f0d48a'); }
      ctx.sfx('gear-turn');
      keys.clear();
      turnAt = now;
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 20, y = p.y + 10;
      g.lineStyle(2, BRASS, 1); g.strokeCircle(x, y, 5);
      const slots = ['e', 'r', 'f'];
      slots.forEach((s, i) => {
        const on = keys.has(s);
        const a = Math.PI * 0.35 + i * 0.4 + (time - turnAt < 500 ? (time - turnAt) / 80 : 0);
        if (on) key(g, x + Math.cos(a) * 9, y + Math.sin(a) * 9, 0.7, a, i === 1 ? lit(BRASS, 0.2) : BRASS);
        else { g.fillStyle(BRASS, 0.25); g.fillCircle(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 1.5); }
      });
      if (time - turnAt < 500) { const k = (time - turnAt) / 500; g.lineStyle(2, BRASS_LIT, 1 - k); g.strokeCircle(x, y, 8 + k * 20); }
    },
  };
};

// ── Fetter's Last Key (artifact) ─────────────────────────────────────
// Every 4th hit you land drives an iron ring into the floor under your foe and locks them to it
// for 3 s: they cannot get more than 90 px from it, and your blows land 15% harder while they
// are held. Once a fight, under 30% health, the key turns in your own irons: you shrug off the
// chain and heal 25.

const lastKey: ItemScriptFactory = (ctx) => {
  const HOLD = 3000, LEN = 90;
  let count = 0;
  let ring: { x: number; y: number; until: number; at: number } | null = null;
  let saved = false;
  let savedAt = -9999;
  return {
    update(time) {
      if (ring && (time >= ring.until || !foeLive(ctx))) ring = null;
      if (ring) {
        const n = ctx.npc;
        const d = dist(n.x, n.y, ring.x, ring.y);
        if (d > LEN) ctx.nudge(n, (ring.x - n.x) * (1 - LEN / d), (ring.y - n.y) * (1 - LEN / d));
      }
      const p = ctx.player;
      if (!saved && live(ctx) && p.hp < p.maxHp * 0.3) {
        saved = true;
        savedAt = time;
        ctx.heal(p, 25);
        ctx.float(p.x, p.y - 56, 'THE LAST KEY', '#f0d48a');
        ctx.sfx('gear-turn');
      }
    },
    onHitDealt(amount) {
      if (amount < 1 || !foeLive(ctx) || ring) return;
      count++;
      if (count % 4 !== 0) return;
      const now = ctx.scene.time.now;
      ring = { x: ctx.npc.x, y: ctx.npc.y + 14, until: now + HOLD, at: now };
      ctx.boostDamage(1.15, HOLD);
      ctx.float(ctx.npc.x, ctx.npc.y - 56, 'CHAINED', '#d8dce4');
      ctx.sfx('chain');
    },
    drawGround(g) {
      if (!ring) return;
      g.lineStyle(1.5, FETTER_KEY, 0.3); g.strokeCircle(ring.x, ring.y, LEN);
      g.lineStyle(3, IRON, 1); g.strokeCircle(ring.x, ring.y, 8);
      g.fillStyle(IRON_DARK, 1); g.fillCircle(ring.x, ring.y, 4);
    },
    drawAir(g, time) {
      if (ring && foeLive(ctx)) {
        const n = ctx.npc;
        const d = dist(n.x, n.y + 12, ring.x, ring.y);
        chainLinks(g, sagPoints(ring.x, ring.y, n.x, n.y + 12, Math.max(0, (LEN - d) * 0.25), 6), 7, IRON_LIT, 1.5);
        manacle(g, n.x, n.y + 14, 6, -Math.PI / 2, 0, 0);
        const k = clamp((ring.until - time) / HOLD, 0, 1);
        g.lineStyle(2.5, FETTER_KEY, 0.9); g.beginPath(); g.arc(n.x, n.y - 58, 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      if (time - savedAt < 700) {
        const p = ctx.player, k = (time - savedAt) / 700;
        key(g, p.x, p.y - 40 - k * 20, 2, k * Math.PI * 2, FETTER_KEY);
        for (let i = 0; i < 6; i++) { g.fillStyle(IRON_LIT, 1 - k); g.fillCircle(p.x + Math.cos(i) * k * 34, p.y + 10 + Math.sin(i) * k * 14, 2.4); }
      }
    },
  };
};

export const SHACKLE_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_TALLY, name: 'Tally Stick', emoji: '🪵', kind: 'charm', price: 340, isle: ISLE,
    flavor: 'A hazel stick notched for every week a debtor served. Split, it was proof of payment. This one was never split.',
    script: CHARM_TALLY,
    scriptText: [
      'Every hit you take cuts a notch in the stick (6 at most).',
      'Your next hit settles the tally: 3 extra damage per notch. Then the stick starts clean.',
    ],
  },
  {
    id: CHARM_QUILL, name: 'Ledger Quill', emoji: '🪶', kind: 'charm', price: 560, isle: ISLE,
    flavor: 'A clerk\'s goose quill, the nib stained red to the shaft. Pledged by a clerk who could not bear to use it again.',
    script: CHARM_QUILL,
    scriptText: [
      'Every 8s the quill balances what you dealt against what you took in those 8s.',
      'In credit: +20% damage for 3s. In arrears: heal a third of the difference (up to 12).',
    ],
  },
  {
    id: CHARM_SHOT, name: 'Plumb Shot', emoji: '⚫', kind: 'charm', price: 780, isle: ISLE,
    flavor: 'The smallest ball the Works ever cast — a child\'s, from the days they chained the children too. Pledged by its last wearer.',
    effect: { maxHp: 5 },
    script: CHARM_SHOT,
    scriptText: [
      'A little iron ball trails you on a chain. Dash and it whips round you.',
      'A whipping ball that meets your foe deals 9 and shoves them (at most every 1.2s).',
    ],
  },
  {
    id: CHARM_KEYRING, name: 'Gaoler\'s Keyring', emoji: '🗝️', kind: 'charm', price: 1020, isle: ISLE,
    flavor: 'A turnkey\'s ring with three keys on it. He pawned it for a dose and was passed over the next new moon anyway.',
    script: CHARM_KEYRING,
    scriptText: [
      'Each E, R and F you cast hangs its key on the ring for 7s.',
      'All three on the ring at once: each comes 1.5s off cooldown, and your foe is stunned 0.6s.',
    ],
  },
  {
    id: ART_FETTER, name: 'Fetter\'s Last Key', emoji: '🔑', kind: 'artifact', isle: ISLE,
    flavor: 'The one key on the Prince\'s ring he could never name a lock for. It opens his own irons. He never tried it.',
    effect: { maxHp: 15 },
    script: ART_FETTER,
    scriptText: [
      'Every 4th hit you land chains your foe to the floor for 3s: they can\'t stray 90px, and take +15% damage.',
      'Once a fight, dropping under 30% health, the key turns in your own irons: heal 25.',
    ],
  },
  {
    id: FISH_SHAD, name: 'Shackle Shad', emoji: '🐟', kind: 'fish', sell: 16, isle: ISLE,
    flavor: 'A bony silver shad that lives along the moat chains and feeds on whatever falls from the gaol windows.',
    effect: { regenPerSecond: 0.5 },
  },
  {
    id: FISH_IRONGILL, name: 'Irongill', emoji: '🐠', kind: 'fish', sell: 38, isle: ISLE,
    flavor: 'Its gills are rust-red and hard as plate; it hangs in the moat\'s deep among the sunk cages and bites like a trap.',
    effect: { damageTakenMult: 0.97 },
  },
];

export const SHACKLE_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_TALLY]: tallyStick,
  [CHARM_QUILL]: ledgerQuill,
  [CHARM_SHOT]: plumbShot,
  [CHARM_KEYRING]: keyring,
  [ART_FETTER]: lastKey,
};

export const SHACKLE_SHOPS: ShopDef[] = [
  { id: 'shackle-shop', name: 'The Hock & Chain', stock: [CHARM_TALLY, CHARM_QUILL, CHARM_SHOT, CHARM_KEYRING], buys: true },
];

export const SHACKLE_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Chain Moat', kind: 'pond' }];

export const SHACKLE_FISH: FishDef[] = [
  { id: FISH_SHAD, fisheries: [FISHERY], weight: 6, fight: 2, size: [14, 32] },
  { id: FISH_IRONGILL, fisheries: [FISHERY], weight: 2, fight: 4, size: [28, 64] },
];

