import Phaser from 'phaser';
import type {
  FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import { BLUE, BLUE_DEEP, BLUE_LIT, GREY, INK, INK_SOFT, PAPER, WHITE } from './palette';
import { CSS_BLUE, CSS_BLUE_LIT, CSS_PAPER } from './palette';
import { glyph, queenSeal } from './inkArt';

/**
 * The Inkwell Court's goods: four charms from Nib & Sac, Prince Blot's redaction seal, and the
 * three fish of the Grand Canal reach. Every charm and the artifact carries a bespoke script.
 *
 * As everywhere on the isles, the engine reports *all* damage the foe takes to `onHitDealt` —
 * including a script's own `ctx.hit` — so any script that hits from inside that hook holds a
 * re-entrancy flag.
 */

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
const live = (f: { active: boolean; hp: number }): boolean => f.active && f.hp > 0;

// ── Squid Sac ───────────────────────────────────────────────────────────

/**
 * A dried squid's ink sac on a cord. Every third hit you take bursts it: a cloud of ink squirts
 * out round where you stand and hangs there for four seconds. A foe standing in your cloud cannot
 * see you properly — 40% of every hit they land on you while they are in it comes back as health.
 * You fight in your own murk; draw them into it.
 */
const squidSac: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const R = 110;
  const LIFE = 4000;
  let hits = 0;
  let cloud: { x: number; y: number; at: number } | null = null;
  const foeInside = (): boolean => !!cloud && dist(ctx.npc.x, ctx.npc.y, cloud.x, cloud.y) < R;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (cloud && now - cloud.at < LIFE && foeInside()) {
        const back = Math.max(1, Math.round(amount * 0.4));
        ctx.heal(ctx.player, back);
        ctx.float(ctx.player.x, ctx.player.y - 40, 'LOST IN THE INK', CSS_BLUE_LIT);
      }
      hits++;
      if (hits >= 3) {
        hits = 0;
        cloud = { x: ctx.player.x, y: ctx.player.y, at: now };
        ctx.sfx('splash');
        ctx.float(ctx.player.x, ctx.player.y - 52, 'SQUIRT!', CSS_PAPER);
      }
    },
    update(time) { if (cloud && time - cloud.at > LIFE) cloud = null; },
    drawGround(g, time) {
      if (!cloud) return;
      const age = time - cloud.at;
      const grow = Phaser.Math.Clamp(age / 300, 0, 1);
      const fade = Phaser.Math.Clamp((LIFE - age) / 700, 0, 1);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + time / 2600;
        g.fillStyle(INK, 0.5 * fade);
        g.fillCircle(cloud.x + Math.cos(a) * R * 0.45 * grow, cloud.y + Math.sin(a) * R * 0.35 * grow, R * 0.5 * grow);
      }
      g.lineStyle(1.5, WHITE, 0.35 * fade); g.strokeCircle(cloud.x, cloud.y, R * grow);
      if (foeInside()) { g.lineStyle(2, BLUE, 0.6 * fade); g.strokeCircle(ctx.npc.x, ctx.npc.y, 26); }
    },
    drawAir(g, time) {
      // The sac itself, hanging at your hip, swelling with each hit you take.
      const p = ctx.player;
      const x = p.x + 18, y = p.y + 4 + Math.sin(time / 300) * 1.5;
      const s = 1 + hits * 0.22;
      g.lineStyle(1, INK, 1); g.lineBetween(x - 6, y - 12, x, y - 6 * s);
      g.fillStyle(INK, 1); g.fillEllipse(x, y, 9 * s, 12 * s);
      g.fillStyle(WHITE, 0.8); g.fillEllipse(x - 2 * s, y - 3 * s, 2.5, 3.5);
    },
  };
};

// ── Moveable Type ───────────────────────────────────────────────────────

/**
 * A compositor's stick and a pocketful of type. Each ability you cast sets that slot's letter
 * in the stick. Set four *different* letters in a row and the line is printed: the four slugs fly
 * at the foe (7 each) and every one of those four abilities comes back 0.8s sooner. Set a letter
 * you have already set and you "pie" the line — the type spills and you start again.
 */
const moveableType: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let stick: { slot: string; id: string }[] = [];
  let flying: { code: number; at: number; fx: number; fy: number }[] = [];
  let pied: { at: number; x: number; y: number } | null = null;
  const codeOf = (slot: string): number => slot.charCodeAt(0) * 31 + slot.length;
  return {
    onCast(id, slot) {
      if (slot === null) return;
      if (stick.some((s) => s.slot === slot)) {
        stick = [];
        pied = { at: ctx.scene.time.now, x: ctx.player.x, y: ctx.player.y - 50 };
        ctx.float(ctx.player.x, ctx.player.y - 46, 'PIED', '#b4b0a6');
        return;
      }
      stick.push({ slot, id });
      ctx.sfx('reload');
      if (stick.length < 4) return;
      const now = ctx.scene.time.now;
      flying = stick.map((s, i) => ({ code: codeOf(s.slot), at: now + i * 90, fx: ctx.player.x - 24 + i * 16, fy: ctx.player.y - 50 }));
      for (const s of stick) ctx.refund(s.id, 800);
      stick = [];
      ctx.float(ctx.player.x, ctx.player.y - 60, 'PRINTED', CSS_BLUE_LIT);
    },
    update(time) {
      const n = ctx.npc;
      flying = flying.filter((f) => {
        if (time < f.at + 260) return true;
        if (live(n)) ctx.hit(n, 7, n.x, n.y);
        ctx.sfx('hit-light');
        return false;
      });
    },
    drawAir(g, time) {
      const p = ctx.player;
      // The composing stick over your head, slugs set in it.
      const x0 = p.x - 30, y0 = p.y - 52;
      g.fillStyle(INK, 0.85); g.fillRect(x0 - 3, y0 - 9, 66, 18);
      g.fillStyle(GREY, 1); g.fillRect(x0, y0 - 6, 60, 12);
      stick.forEach((s, i) => {
        g.fillStyle(WHITE, 1); g.fillRect(x0 + 2 + i * 15, y0 - 5, 12, 10);
        glyph(g, x0 + 8 + i * 15, y0, 7, codeOf(s.slot), INK, 1, 1.5);
      });
      // Slugs in flight, then a print-burst on the foe.
      const n = ctx.npc;
      for (const f of flying) {
        if (time < f.at) { g.fillStyle(WHITE, 1); g.fillRect(f.fx - 6, f.fy - 5, 12, 10); continue; }
        const k = Phaser.Math.Clamp((time - f.at) / 260, 0, 1);
        const x = f.fx + (n.x - f.fx) * k, y = f.fy + (n.y - f.fy) * k - Math.sin(Math.PI * k) * 30;
        g.fillStyle(WHITE, 1); g.fillRect(x - 7, y - 6, 14, 12);
        g.lineStyle(1.5, INK, 1); g.strokeRect(x - 7, y - 6, 14, 12);
        glyph(g, x, y, 8, f.code, BLUE, 1, 1.8);
      }
      if (pied) {
        const k = (time - pied.at) / 500;
        if (k > 1) pied = null;
        else for (let i = 0; i < 4; i++) {
          g.fillStyle(WHITE, 1 - k); g.fillRect(pied.x - 20 + i * 12 + k * (i - 1.5) * 20, pied.y + k * 40, 9, 8);
        }
      }
    },
  };
};

// ── Errata Slip ─────────────────────────────────────────────────────────

/**
 * Every printer's apology: a slip pasted in after the fact. When you take a hit, an erratum for
 * it is posted over your head for 2.5 seconds. Land a blow on the foe before the slip falls and
 * the error is corrected — half of that hit comes back to you as health (up to 15).
 */
const errataSlip: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const WINDOW = 2500;
  let slip: { amount: number; at: number } | null = null;
  let corrected = -99999;
  return {
    onHitTaken(amount) {
      slip = { amount, at: ctx.scene.time.now };
    },
    onHitDealt() {
      if (!slip) return;
      const now = ctx.scene.time.now;
      if (now - slip.at > WINDOW) { slip = null; return; }
      const back = Math.min(15, Math.max(1, Math.round(slip.amount * 0.5)));
      ctx.heal(ctx.player, back);
      ctx.float(ctx.player.x, ctx.player.y - 48, `CORRECTED +${back}`, CSS_BLUE_LIT);
      ctx.sfx('heal');
      corrected = now;
      slip = null;
    },
    update(time) { if (slip && time - slip.at > WINDOW) slip = null; },
    drawAir(g, time) {
      const p = ctx.player;
      if (slip) {
        const k = (time - slip.at) / WINDOW;
        const x = p.x + 26, y = p.y - 44 + k * 14;
        const tilt = Math.sin(time / 200) * 0.1;
        g.fillStyle(INK, 1); g.fillRect(x - 15, y - 9, 30, 18);
        g.fillStyle(PAPER, 1); g.fillRect(x - 13, y - 7, 26, 14);
        g.lineStyle(1, INK, 1); g.lineBetween(x - 10, y - 2 + tilt * 10, x + 10, y - 2);
        g.lineStyle(1, BLUE, 1); g.lineBetween(x - 10, y + 3, x + 10 - 20 * k, y + 3);
      }
      const since = time - corrected;
      if (since < 400) {
        const k = since / 400;
        g.lineStyle(3, BLUE, 1 - k);
        g.lineBetween(p.x - 12, p.y - 46 - k * 10, p.x - 2, p.y - 36 - k * 10);
        g.lineBetween(p.x - 2, p.y - 36 - k * 10, p.x + 16, p.y - 58 - k * 10);
      }
    },
  };
};

// ── Wet Signature ───────────────────────────────────────────────────────

/**
 * A pen that never quite dries. As you move you sign the floor — a wet line trailing behind you
 * for 2.5 seconds. A foe who walks across your signature has witnessed it: 3 damage each time,
 * and every fifth witnessing seals the contract for 14. Kite them across your own name.
 */
const wetSignature: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const LIFE = 2500;
  const STEP = 14;
  let trail: { x: number; y: number; at: number }[] = [];
  let lastX = ctx.player.x, lastY = ctx.player.y;
  let lastWitness = 0;
  let witnesses = 0;
  let sealedAt = -99999;
  return {
    update(time) {
      const p = ctx.player, n = ctx.npc;
      if (dist(p.x, p.y, lastX, lastY) >= STEP) {
        trail.push({ x: p.x, y: p.y + 16, at: time });
        lastX = p.x; lastY = p.y;
      }
      trail = trail.filter((q) => time - q.at < LIFE);
      if (!live(n) || time - lastWitness < 300) return;
      // Only the older part of the line counts — not the bit still under your own feet.
      const crossed = trail.some((q) => time - q.at > 300 && dist(q.x, q.y, n.x, n.y + 16) < 14);
      if (!crossed) return;
      lastWitness = time;
      witnesses++;
      if (witnesses >= 5) {
        witnesses = 0;
        sealedAt = time;
        ctx.hit(n, 14, n.x, n.y);
        ctx.float(n.x, n.y - 50, 'CONTRACT SEALED', CSS_BLUE);
        ctx.sfx('judgement');
      } else {
        ctx.hit(n, 3, n.x, n.y);
        ctx.float(n.x, n.y - 40, `witnessed ${witnesses}/5`, CSS_PAPER);
      }
    },
    drawGround(g, time) {
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1], b = trail[i];
        if (dist(a.x, a.y, b.x, b.y) > STEP * 3) continue;
        const k = 1 - (time - b.at) / LIFE;
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const w = 2 + Math.abs(Math.sin(ang - Math.PI / 4)) * 4;
        g.lineStyle(w, INK, 0.85 * k); g.lineBetween(a.x, a.y, b.x, b.y);
      }
      const since = time - sealedAt;
      if (since < 500) queenSeal(g, ctx.npc.x, ctx.npc.y + 16, 22 * (0.6 + since / 1250), 1 - since / 500);
    },
    drawAir(g) {
      // Witness pips over the foe.
      if (witnesses === 0) return;
      const n = ctx.npc;
      for (let i = 0; i < 5; i++) {
        g.fillStyle(i < witnesses ? BLUE : INK_SOFT, 0.9);
        g.fillCircle(n.x - 16 + i * 8, n.y - 54, 2.6);
      }
    },
  };
};

// ── Blot's Redaction Seal (artifact) ────────────────────────────────────

/**
 * The Prince's own seal, the one that blotted three thousand names. Every sixth hit you land
 * redacts the foe for 2.5 seconds — a censor's bar slams over them and every hit you land in that
 * time is entered in the record. When the bar lifts the record is **published**: everything you
 * dealt while they were redacted lands on them again at 60%.
 */
const redactionSeal: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const EVERY = 6;
  const MS = 2500;
  let count = 0;
  let until = 0;
  let record = 0;
  let entries = 0;
  let busy = false;
  let publishedAt = -99999;
  let published = 0;
  return {
    onHitDealt(amount) {
      if (busy) return;
      const now = ctx.scene.time.now;
      if (now < until) { record += amount; entries++; return; }
      count++;
      if (count < EVERY) return;
      count = 0;
      until = now + MS;
      record = 0; entries = 0;
      ctx.sfx('stone-slam');
      ctx.float(ctx.npc.x, ctx.npc.y - 50, 'REDACTED', CSS_PAPER);
    },
    update(time) {
      if (until === 0 || time < until) return;
      until = 0;
      if (record < 1) return;
      const n = ctx.npc;
      const dmg = Math.round(record * 0.6);
      if (live(n)) { busy = true; ctx.hit(n, dmg, n.x, n.y); busy = false; }
      published = dmg;
      publishedAt = time;
      ctx.float(n.x, n.y - 56, `PUBLISHED ${dmg}`, CSS_BLUE_LIT);
      ctx.sfx('crit');
      record = 0;
    },
    drawAir(g, time) {
      const n = ctx.npc;
      if (time < until) {
        // The bar over the foe, entries ticked off along it in blue.
        const k = 1 - (until - time) / MS;
        g.fillStyle(INK, 0.92); g.fillRect(n.x - 34, n.y - 16, 68, 22);
        g.lineStyle(1.5, WHITE, 0.4); g.lineBetween(n.x - 30, n.y - 11, n.x + 30, n.y - 11);
        g.fillStyle(BLUE, 1); g.fillCircle(n.x + 26, n.y - 5, 5);
        for (let i = 0; i < Math.min(entries, 8); i++) { g.fillStyle(BLUE_LIT, 1); g.fillRect(n.x - 30 + i * 6, n.y + 1, 4, 3); }
        g.lineStyle(2, BLUE, 0.8); g.lineBetween(n.x - 34, n.y + 9, n.x - 34 + 68 * (1 - k), n.y + 9);
      }
      const since = time - publishedAt;
      if (since < 450 && published > 0) {
        // The page flung open: a broadside sheet over the foe, the seal at its foot.
        const k = since / 450;
        g.fillStyle(PAPER, 1 - k); g.fillRect(n.x - 26, n.y - 70 - k * 20, 52, 40);
        g.lineStyle(2, INK, 1 - k); g.strokeRect(n.x - 26, n.y - 70 - k * 20, 52, 40);
        for (let i = 0; i < 3; i++) glyph(g, n.x - 14 + i * 14, n.y - 58 - k * 20, 9, published + i, INK, 1 - k, 1.6);
        queenSeal(g, n.x + 14, n.y - 38 - k * 20, 6, 1 - k);
      }
      // The seal's count of hits toward the next redaction, a ring of six dots at your feet.
      const p = ctx.player;
      for (let i = 0; i < EVERY; i++) {
        const a = -Math.PI / 2 + (i / EVERY) * Math.PI * 2;
        g.fillStyle(i < count ? BLUE : BLUE_DEEP, i < count ? 1 : 0.4);
        g.fillCircle(p.x + Math.cos(a) * 30, p.y + 18 + Math.sin(a) * 9, 2.2);
      }
    },
  };
};

// ── Items ───────────────────────────────────────────────────────────────

export const INKWELL_ITEMS: IsleItemDef[] = [
  {
    id: 'inkwell-squid-sac', name: 'Squid Sac', emoji: '🦑', kind: 'charm', price: 240, sell: 80, isle: 'water',
    flavor: 'A dried ink sac from the pens, on a cord. Tess swears it was given freely. The squid does not comment.',
    script: 'inkwell-squid-sac',
    scriptText: [
      'Every 3rd hit you take squirts an ink cloud where you stand (4s).',
      'While the foe stands in your cloud, 40% of each hit they land on you is healed back.',
    ],
  },
  {
    id: 'inkwell-moveable-type', name: 'Moveable Type', emoji: '🔠', kind: 'charm', price: 380, sell: 120, isle: 'water',
    flavor: 'A compositor\'s stick and a pocket of slugs. Gideon Slug lost them. Gideon Slug never loses anything.',
    script: 'inkwell-moveable-type',
    scriptText: [
      'Each cast sets its slot\'s letter. Four different letters in a row prints the line:',
      'the slugs fly at the foe (4 × 7) and those four abilities come back 0.8s sooner.',
      'Repeat a letter before the line is done and the type spills.',
    ],
  },
  {
    id: 'inkwell-errata-slip', name: 'Errata Slip', emoji: '📝', kind: 'charm', price: 300, sell: 95, isle: 'water',
    flavor: '"For \'drowned\' read \'kept\'." The Pressworks pastes these in by the thousand. This one corrects you.',
    script: 'inkwell-errata-slip',
    effect: { maxHp: 8 },
    scriptText: [
      'Taking a hit posts an erratum over your head for 2.5s.',
      'Land a blow before it falls: half that hit is healed back (up to 15).',
    ],
  },
  {
    id: 'inkwell-wet-signature', name: 'Wet Signature', emoji: '🖋️', kind: 'charm', price: 520, sell: 170, isle: 'water',
    flavor: 'Sumi\'s old practice pen. The ink never dries. Everything it signs is binding, whether it agrees or not.',
    script: 'inkwell-wet-signature',
    scriptText: [
      'You trail a wet signature for 2.5s as you move.',
      'A foe crossing it is a witness: 3 damage; every 5th witnessing seals the contract (14).',
    ],
  },
  {
    id: 'art-blot', name: 'Blot\'s Redaction Seal', emoji: '⬛', kind: 'artifact', isle: 'water',
    flavor: 'The seal that struck three thousand names from the registry. Vellum wants it melted. You want it first.',
    script: 'art-blot',
    effect: { maxHp: 15 },
    scriptText: [
      'Every 6th hit you land redacts the foe for 2.5s, and your hits on them are entered in the record.',
      'When the bar lifts the record is PUBLISHED: all of it lands again at 60%.',
    ],
  },
  {
    id: 'fish-inkfin-squid', name: 'Inkfin Squid', emoji: '🦑', kind: 'fish', sell: 26, isle: 'water',
    flavor: 'A wild cousin of the penned stock, fins edged in black. It squirts on the hook and again on the plate.',
    effect: { dodgeChance: 0.04 },
  },
  {
    id: 'fish-quill-pike', name: 'Quill Pike', emoji: '🐟', kind: 'fish', sell: 46, isle: 'water',
    flavor: 'Long, thin and still as a pen in a stand, until it strikes. Its jaw is sharp enough to rule a line.',
    effect: { critChance: 0.05 },
  },
  {
    id: 'fish-blotted-ray', name: 'Blotted Ray', emoji: '🐠', kind: 'fish', sell: 98, isle: 'water',
    flavor: 'A black ray whose back drinks ink like blotting paper. The forgers would pay anything for one.',
    effect: { damageTakenMult: 0.95, regenPerSecond: 0.4 },
  },
];

export const INKWELL_SCRIPTS: Record<string, ItemScriptFactory> = {
  'inkwell-squid-sac': squidSac,
  'inkwell-moveable-type': moveableType,
  'inkwell-errata-slip': errataSlip,
  'inkwell-wet-signature': wetSignature,
  'art-blot': redactionSeal,
};

export const INKWELL_SHOPS: ShopDef[] = [
  {
    id: 'inkwell-shop',
    name: 'Nib & Sac, Stationers',
    stock: ['inkwell-squid-sac', 'inkwell-errata-slip', 'inkwell-moveable-type', 'inkwell-wet-signature'],
    buys: true,
  },
];

export const INKWELL_FISHERIES: FisheryDef[] = [
  { id: 'inkwell-canal', name: 'The Grand Canal Reach', kind: 'ink' },
];

export const INKWELL_FISH: FishDef[] = [
  { id: 'fish-inkfin-squid', fisheries: ['inkwell-canal'], weight: 7, fight: 2, size: [14, 38] },
  { id: 'fish-quill-pike', fisheries: ['inkwell-canal'], weight: 4, fight: 4, size: [40, 92] },
  { id: 'fish-blotted-ray', fisheries: ['inkwell-canal'], weight: 1.5, fight: 5, size: [50, 120] },
];
