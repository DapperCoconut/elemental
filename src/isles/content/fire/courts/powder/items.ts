import type Phaser from 'phaser';
import type {
  FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import { Clock, P, PCOL, dist, drawKeg, drawPuff, drawSpark } from './util';

/**
 * The Powder Court's goods: four charms from the Quartermastery, Prince Fuse's artifact, and the
 * two moat fish. Every charm runs a script that plays with the court's one idea — something lit
 * that goes off later, on purpose.
 */

// ── Charm: Slow-Match Coil ───────────────────────────────────────────

/**
 * Each hit you land ties a smouldering wick onto the foe (up to five). Stop hitting for a beat
 * and every wick pops at once. Rewards a burst of hits followed by a breath — the gunner's rhythm.
 */
const slowMatch: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  let wicks = 0;
  let lastHit = 0;
  let now = 0;
  const POP_MS = 2400;
  return {
    update(time: number) {
      clock.tick(time);
      now = time;
      if (wicks > 0 && time - lastHit > POP_MS) {
        const n = ctx.npc;
        ctx.hit(n, wicks * 3, n.x, n.y);
        ctx.flash(n.x, n.y, P.spark);
        ctx.float(n.x, n.y - 48, `POP ×${wicks}`, PCOL.spark);
        ctx.sfx('explosion-small');
        wicks = 0;
      }
    },
    onHitDealt() {
      wicks = Math.min(5, wicks + 1);
      lastHit = now;
    },
    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      if (!wicks) return;
      const n = ctx.npc;
      const k = Math.min(1, (time - lastHit) / POP_MS);
      for (let i = 0; i < wicks; i++) {
        const a = time / 500 + (i / wicks) * Math.PI * 2;
        const x = n.x + Math.cos(a) * 28, y = n.y - 6 + Math.sin(a) * 12;
        g.lineStyle(2, 0x6a5238, 1); g.lineBetween(x, y, x + 3, y - 10 + k * 6);
        drawSpark(g, x + 3, y - 10 + k * 6, time + i * 70, 0.5 + k * 0.4);
      }
    },
  };
};

// ── Charm: Gunner's Ramrod ───────────────────────────────────────────

/**
 * Rams a charge home with every ability you cast; the fourth is double-shotted, and for a couple
 * of seconds after it everything you throw hits harder. Four pips over your head count it out.
 */
const ramrod: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let rammed = 0;
  let firedAt = -9999;
  return {
    onCast() {
      rammed++;
      if (rammed >= 4) {
        rammed = 0;
        firedAt = ctx.scene.time.now;
        ctx.boostDamage(1.35, 2200);
        ctx.float(ctx.player.x, ctx.player.y - 52, 'DOUBLE-SHOTTED', PCOL.brass);
        ctx.sfx('reload');
      }
    },
    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      const p = ctx.player;
      const hot = time - firedAt < 2200;
      for (let i = 0; i < 4; i++) {
        const on = hot || i < rammed;
        const x = p.x - 15 + i * 10, y = p.y - 44;
        g.fillStyle(0x000000, 0.4); g.fillRect(x - 3, y - 4, 6, 8);
        g.fillStyle(hot ? P.flame : on ? P.brass : P.iron, on ? 1 : 0.5); g.fillRect(x - 2, y - 3, 4, 6);
      }
    },
  };
};

// ── Charm: Sandbag Charm ─────────────────────────────────────────────

/**
 * Stand still for a moment and you dig in: a ring of sandbags rises round your feet, and while it
 * stands, part of every hit you take is soaked back up as health. Take a step and it is gone.
 */
const sandbag: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  let ax = 0, ay = 0, still = 0;
  let dug = false;
  let started = false;
  return {
    update(time: number) {
      const dt = clock.tick(time);
      const p = ctx.player;
      if (!started) { ax = p.x; ay = p.y; started = true; }
      if (dist(p.x, p.y, ax, ay) > 8) {
        if (dug) ctx.float(p.x, p.y - 40, 'UP AND OUT', PCOL.smoke);
        ax = p.x; ay = p.y; still = 0; dug = false;
        return;
      }
      still += dt;
      if (!dug && still > 0.8) { dug = true; ctx.sfx('stone-rise'); ctx.float(p.x, p.y - 40, 'DUG IN', PCOL.brass); }
    },
    onHitTaken(amount: number) {
      if (!dug) return;
      const back = Math.max(1, Math.round(amount * 0.4));
      ctx.heal(ctx.player, back);
    },
    drawGround(g: Phaser.GameObjects.Graphics) {
      if (!dug) return;
      const p = ctx.player;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const x = p.x + Math.cos(a) * 30, y = p.y + 6 + Math.sin(a) * 14;
        g.fillStyle(0x6e5c3c, 1); g.fillEllipse(x, y + 2, 15, 9);
        g.fillStyle(P.sandbag, 1); g.fillEllipse(x, y, 13, 7);
      }
    },
  };
};

// ── Charm: Signal Flare ──────────────────────────────────────────────

/**
 * When you fall under half health, a flare goes up and calls the battery: red smoke marks where
 * the foe is standing, and a moment later three shells land on the mark. Foes can walk out of it —
 * so fight to keep them there.
 */
const flare: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  let readyAt = 0;
  let mark: { x: number; y: number; at: number } | null = null;
  let up: { x: number; y: number; at: number } | null = null;
  let shells = 0;
  return {
    update(time: number) {
      clock.tick(time);
      const p = ctx.player;
      if (!mark && time >= readyAt && p.hp > 0 && p.hp < p.maxHp * 0.5) {
        readyAt = time + 18000;
        up = { x: p.x, y: p.y, at: time };
        mark = { x: ctx.npc.x, y: ctx.npc.y, at: time };
        shells = 0;
        ctx.sfx('whoosh');
        ctx.float(p.x, p.y - 50, 'FLARE UP', PCOL.red);
      }
      if (mark) {
        const t = time - mark.at;
        while (shells < 3 && t > 1600 + shells * 220) {
          const n = ctx.npc;
          ctx.flash(mark.x, mark.y, P.flame);
          ctx.sfx('explosion-medium');
          if (dist(n.x, n.y, mark.x, mark.y) < 80) ctx.hit(n, 10, n.x, n.y);
          shells++;
        }
        if (shells >= 3) mark = null;
      }
    },
    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      if (!mark) return;
      const k = Math.min(1, (time - mark.at) / 1600);
      g.fillStyle(P.redcoat, 0.12 + k * 0.12); g.fillCircle(mark.x, mark.y, 80);
      g.lineStyle(2, P.redcoat, 0.7); g.strokeCircle(mark.x, mark.y, 80);
      drawPuff(g, mark.x, mark.y - 10, 18, 0xd04040, 0.35, 5);
    },
    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      if (!up) return;
      const t = (time - up.at) / 900;
      if (t > 1.6) { up = null; return; }
      const y = up.y - 40 - Math.min(1, t) * 260;
      g.fillStyle(0xff4040, Math.max(0, 1.6 - t)); g.fillCircle(up.x, y, 5);
      g.fillStyle(0xff4040, 0.2 * Math.max(0, 1.6 - t)); g.fillCircle(up.x, y, 22);
    },
  };
};

// ── Artifact: Fuse's Linstock ────────────────────────────────────────

/**
 * Prince Fuse's own linstock. Every nine seconds it summons a keg that rolls up beside you on the
 * side away from your foe. Walk into it and it rolls off at the foe and bursts — it is your keg, so
 * it only hurts them. Leave it and the fuse fizzles out.
 */
const linstock: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  let next = -1;
  let keg: { x: number; y: number; born: number; vx: number; vy: number; kicked: boolean; roll: number } | null = null;
  return {
    update(time: number) {
      const dt = clock.tick(time);
      if (next < 0) next = time + 5000;
      const p = ctx.player, n = ctx.npc;
      if (!keg && time >= next) {
        const away = Math.atan2(p.y - n.y, p.x - n.x);
        const side = away + (Math.random() < 0.5 ? 0.9 : -0.9);
        keg = {
          x: Math.max(60, Math.min(ctx.W - 60, p.x + Math.cos(side) * 90)),
          y: Math.max(130, Math.min(ctx.H - 50, p.y + Math.sin(side) * 90)),
          born: time, vx: 0, vy: 0, kicked: false, roll: 0,
        };
        ctx.sfx('drum-hit');
      }
      if (!keg) return;
      if (!keg.kicked) {
        if (time - keg.born > 6000) { keg = null; next = time + 9000; ctx.sfx('sizzle'); return; }
        if (dist(p.x, p.y, keg.x, keg.y) < 34) {
          const a = Math.atan2(n.y - keg.y, n.x - keg.x);
          keg.kicked = true; keg.vx = Math.cos(a) * 380; keg.vy = Math.sin(a) * 380;
          ctx.sfx('whoosh');
        }
        return;
      }
      // Homes a little: it is the prince's keg, and it knows where it is going.
      const want = Math.atan2(n.y - keg.y, n.x - keg.x);
      const cur = Math.atan2(keg.vy, keg.vx);
      let d = want - cur;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const na = cur + Math.max(-2 * dt, Math.min(2 * dt, d));
      keg.vx = Math.cos(na) * 380; keg.vy = Math.sin(na) * 380;
      keg.x += keg.vx * dt; keg.y += keg.vy * dt; keg.roll += dt * 20;
      const out = keg.x < 10 || keg.x > ctx.W - 10 || keg.y < 90 || keg.y > ctx.H - 10;
      if (dist(n.x, n.y, keg.x, keg.y) < 40 || out || time - keg.born > 9000) {
        ctx.flash(keg.x, keg.y, P.flame);
        ctx.sfx('explosion-medium');
        if (dist(n.x, n.y, keg.x, keg.y) < 90) {
          ctx.hit(n, 24, n.x, n.y);
          ctx.float(n.x, n.y - 50, 'BY ROYAL APPOINTMENT', PCOL.spark);
        }
        keg = null;
        next = time + 9000;
      }
    },
    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      if (!keg) return;
      const h = keg.kicked ? Math.atan2(keg.vy, keg.vx) + Math.PI / 2 : Math.PI / 2;
      drawKeg(g, keg.x, keg.y, 15, h, keg.roll);
      if (!keg.kicked) {
        g.lineStyle(1.5, P.spark, 0.4 + Math.sin(time / 120) * 0.2); g.strokeCircle(keg.x, keg.y, 28);
      }
    },
    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      if (keg && !keg.kicked) drawSpark(g, keg.x + 4, keg.y - 18, time, 0.8);
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const POWDER_ITEMS: IsleItemDef[] = [
  {
    id: 'powder-slow-match', name: 'Slow-Match Coil', emoji: '🪢', kind: 'charm', price: 180, isle: 'fire',
    flavor: 'A coil of cord soaked in saltpetre. It burns an inch a minute and never, ever goes out.',
    effect: { statusDurMult: 1.1 },
    script: 'powder-slow-match',
    scriptText: ['Each hit you land ties a smouldering wick onto the foe (max 5).', 'Stop hitting for 2.4s and every wick pops for 3 damage.'],
  },
  {
    id: 'powder-ramrod', name: "Gunner's Ramrod", emoji: '🦯', kind: 'charm', price: 260, isle: 'fire',
    flavor: 'Brass-tipped hickory. Sponge, load, ram, fire — the drill is older than the King.',
    effect: { cooldownMult: 0.97 },
    script: 'powder-ramrod',
    scriptText: ['Every 4th ability you cast is double-shotted: +35% damage for 2.2s.'],
  },
  {
    id: 'powder-sandbag', name: 'Sandbag Charm', emoji: '🧱', kind: 'charm', price: 220, isle: 'fire',
    flavor: 'A thumb-sized sandbag on a lanyard. Sappers swear by it. Sappers swear by most things.',
    effect: { maxHp: 10 },
    script: 'powder-sandbag',
    scriptText: ['Stand still for 0.8s to dig in.', 'While dug in, 40% of every hit you take is healed back.'],
  },
  {
    id: 'powder-flare', name: 'Signal Flare', emoji: '🎆', kind: 'charm', price: 380, isle: 'fire',
    flavor: 'Red for "fire on my mark". Corporal Lanyard insists you learn the other colours. You do not.',
    effect: { critChance: 0.03 },
    script: 'powder-flare',
    scriptText: ['Under half health, fire a flare (every 18s): it marks the foe\'s spot.', '1.6s later three shells land on the mark, 10 damage each.'],
  },
  {
    id: 'art-fuse', name: "Fuse's Linstock", emoji: '🔥', kind: 'artifact', isle: 'fire',
    flavor: 'A forked pole that held the Prince\'s match. It still smells of every salvo he ever loved.',
    effect: { maxHp: 15 },
    script: 'art-fuse',
    scriptText: ['Every 9s a keg rolls up beside you, away from the foe.', 'Walk into it: it rolls at the foe and bursts for 24. Only they get hurt.'],
  },
  {
    id: 'fish-flint-pike', name: 'Flint Pike', emoji: '🐟', kind: 'fish', sell: 26, isle: 'fire',
    flavor: 'Teeth like struck flint — they spark when it snaps. Bites best after the noon gun.',
    effect: { critChance: 0.04 },
  },
  {
    id: 'fish-fuse-minnow', name: 'Fuse Minnow', emoji: '🐠', kind: 'fish', sell: 8, isle: 'fire',
    flavor: 'A thin black minnow whose tail-tip glows like a lit match. Schools look like a fuse burning.',
    effect: { speedMult: 1.05 },
  },
];

export const POWDER_SCRIPTS: Record<string, ItemScriptFactory> = {
  'powder-slow-match': slowMatch,
  'powder-ramrod': ramrod,
  'powder-sandbag': sandbag,
  'powder-flare': flare,
  'art-fuse': linstock,
};

export const POWDER_SHOPS: ShopDef[] = [
  { id: 'powder-shop', name: "Saltpetre's Quartermastery", stock: ['powder-slow-match', 'powder-ramrod', 'powder-sandbag', 'powder-flare'], buys: true },
];

export const POWDER_FISHERIES: FisheryDef[] = [{ id: 'powder-moat', name: 'The Powder Moat', kind: 'pond' }];

export const POWDER_FISH: FishDef[] = [
  { id: 'fish-fuse-minnow', fisheries: ['powder-moat'], weight: 7, fight: 2, size: [4, 9] },
  { id: 'fish-flint-pike', fisheries: ['powder-moat'], weight: 3, fight: 4, size: [38, 92] },
];
