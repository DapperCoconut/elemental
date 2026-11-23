import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { candle, handbell } from './art';
import {
  BRONZE, CANDLELIGHT, EVENGOLD, FLAME, GILT, GILT_LIT, GLASS_BLUE, GLASS_GOLD, GLASS_RED, LEAD, SMOKE, VESPER_DARK,
  VESPER_LIT, WAX,
} from './palette';
import { alive, clamp, clock, dist } from './util';

/**
 * The Cathedral Court's goods: Brother Tallowby's four "holy things", Prince Vesper's bare gilt
 * pin, and the cloister pond's three fish. Every charm plays one of the summit's devotions in
 * your favour — the told bead, the votive at your feet, the change-ringer's rule, the pane of
 * coloured light. Scripts are registered below under their item ids.
 */

const ISLE = 'sound';

export const CHARM_BEADS = 'cathedral-charm-telling-beads';
export const CHARM_VOTIVE = 'cathedral-charm-votive-stub';
export const CHARM_BELL = 'cathedral-charm-change-bell';
export const CHARM_PANE = 'cathedral-charm-flash-pane';
export const ART_VESPER = 'art-vesper';

export const FISH_CHAR = 'fish-chorister-char';
export const FISH_SALMON = 'fish-psalm-salmon';
export const FISH_VENDACE = 'fish-vesper-vendace';
export const FISHERY = 'cathedral-cloister';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Telling Beads ────────────────────────────────────────────────────
// Five beads circle you on a string. When the foe is inside the circle's reach, a bead that
// swings through them strikes and is spent; the string re-threads a bead every 2.5s.

const beads: ItemScriptFactory = (ctx) => {
  const N = 5, R = 58;
  let spin = 0;
  let strung = N;
  let threadAt = 0;
  let strikeAt = 0;
  let fx: { x: number; y: number; at: number } | null = null;
  const tick = clock();
  return {
    update(time) {
      const dt = tick(time);
      spin += dt * 2.4;
      if (!live(ctx)) return;
      if (strung < N && time >= threadAt) { strung++; threadAt = time + 2500; }
      if (!foeLive(ctx) || strung === 0 || time < strikeAt) return;
      const p = ctx.player, n = ctx.npc;
      for (let i = 0; i < strung; i++) {
        const a = spin + (i / N) * Math.PI * 2;
        const bx = p.x + Math.cos(a) * R, by = p.y + Math.sin(a) * R * 0.8;
        if (dist(bx, by, n.x, n.y) < 24) {
          strung--;
          if (threadAt < time) threadAt = time + 2500;
          strikeAt = time + 350;
          ctx.hit(n, 4, bx, by);
          fx = { x: bx, y: by, at: time };
          ctx.sfx('crystal-chime');
          break;
        }
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      g.lineStyle(1, GILT, 0.35); g.strokeEllipse(p.x, p.y, R * 2, R * 1.6);
      for (let i = 0; i < strung; i++) {
        const a = spin + (i / N) * Math.PI * 2;
        const bx = p.x + Math.cos(a) * R, by = p.y + Math.sin(a) * R * 0.8;
        g.fillStyle(VESPER_DARK, 1); g.fillCircle(bx, by, 5);
        g.fillStyle(VESPER_LIT, 1); g.fillCircle(bx, by, 3.6);
        g.fillStyle(0xffffff, 0.7); g.fillCircle(bx - 1, by - 1, 1.2);
      }
      if (fx && time - fx.at < 400) {
        const k = (time - fx.at) / 400;
        g.lineStyle(2, EVENGOLD, 1 - k); g.strokeCircle(fx.x, fx.y, 6 + k * 18);
      }
    },
  };
};

// ── Votive Stub ──────────────────────────────────────────────────────
// Stand still for a second and you set a candle down at your feet. Near it you mend 2 a second.
// It keeps burning 7s after you step away — and sears the foe 5 if they stand on it.

const votive: ItemScriptFactory = (ctx) => {
  let still = 0, lx = 0, ly = 0;
  let c: { x: number; y: number; at: number; leftAt: number } | null = null;
  let healAcc = 0, searAt = 0;
  const tick = clock();
  return {
    update(time) {
      const dt = tick(time);
      if (!live(ctx)) return;
      const p = ctx.player;
      still = dist(p.x, p.y, lx, ly) < 1.6 ? still + dt : 0;
      lx = p.x; ly = p.y;
      if (still > 1 && (!c || dist(c.x, c.y, p.x, p.y) > 56)) { c = { x: p.x, y: p.y + 8, at: time, leftAt: 0 }; ctx.sfx('sizzle'); }
      if (!c) return;
      const near = dist(c.x, c.y, p.x, p.y) < 56;
      if (near) { c.leftAt = 0; healAcc += 2 * dt; if (healAcc >= 2) { ctx.heal(p, 2); healAcc -= 2; } }
      else if (!c.leftAt) c.leftAt = time;
      if (c.leftAt && time - c.leftAt > 7000) { c = null; return; }
      if (foeLive(ctx) && time >= searAt && dist(c.x, c.y, ctx.npc.x, ctx.npc.y) < 40) {
        searAt = time + 800;
        ctx.hit(ctx.npc, 5, c.x, c.y);
        ctx.flash(c.x, c.y - 10, FLAME);
      }
    },
    drawGround(g) {
      if (!c) return;
      g.fillStyle(WAX, 0.4); g.fillEllipse(c.x, c.y + 2, 18, 6);
      glow(g, c.x, c.y - 10, 56, CANDLELIGHT, 0.035, 3);
      g.lineStyle(1, CANDLELIGHT, 0.3); g.strokeCircle(c.x, c.y, 56);
    },
    drawAir(g, time) {
      if (!c) return;
      const fade = c.leftAt ? clamp(1 - (time - c.leftAt) / 7000, 0, 1) : 1;
      candle(g, c.x, c.y, 6 + fade * 8, true, WAX, Math.sin(time / 90));
      if (fade < 0.3) { g.fillStyle(SMOKE, 0.3); g.fillCircle(c.x, c.y - 24 - (time % 900) / 40, 3); }
    },
  };
};

// ── Change-Ringer's Handbell ─────────────────────────────────────────
// Change-ringing: never strike the same bell twice running. Cast three different abilities in a
// row (no slot repeated, within 4s) and the handbell rings — 10 to the foe if within 220px, and
// a 0.6s stun.

const changeBell: ItemScriptFactory = (ctx) => {
  let row: { slot: string; at: number }[] = [];
  let rangAt = -9999;
  return {
    onCast(_id, slot) {
      if (!slot || !live(ctx)) return;
      const now = ctx.scene.time.now;
      row = row.filter((r) => now - r.at < 4000);
      if (row.some((r) => r.slot === slot)) row = [];
      row.push({ slot, at: now });
      if (row.length < 3) return;
      row = [];
      rangAt = now;
      ctx.sfx('clang');
      ctx.float(ctx.player.x, ctx.player.y - 56, 'A CHANGE RUNG', '#f0d48a');
      if (foeLive(ctx) && dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < 220) {
        ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y);
        ctx.stun(ctx.npc, 600);
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const ring = time - rangAt < 700 ? 1 - (time - rangAt) / 700 : 0;
      handbell(g, p.x + 24, p.y - 26, 0.5, BRONZE, ring);
      // Pips for the changes rung so far.
      for (let i = 0; i < 3; i++) { g.fillStyle(i < row.length ? GILT_LIT : LEAD, 0.9); g.fillCircle(p.x + 16 + i * 6, p.y - 46, 1.8); }
      if (ring > 0) { g.lineStyle(3 * ring, GILT_LIT, ring); g.strokeCircle(p.x, p.y, 220 * (1 - ring) + 30); }
    },
  };
};

// ── Pane of Flash Glass ──────────────────────────────────────────────
// A pane of coloured light lies on the floor near you, moving every 5s and changing colour: red,
// blue, gold. Stand in it — red: +30% damage; blue: mend 2 a second; gold: half of each hit taken
// (up to 6) is given back.

const flashPane: ItemScriptFactory = (ctx) => {
  const COLORS = [GLASS_RED, GLASS_BLUE, GLASS_GOLD];
  let idx = 0, x = ctx.W / 2, y = ctx.H / 2, movedAt = -1, boostUntil = 0, healAcc = 0;
  const tick = clock();
  const inside = () => live(ctx) && Math.abs(ctx.player.x - x) < 46 && Math.abs(ctx.player.y - y) < 34;
  return {
    update(time) {
      const dt = tick(time);
      if (!live(ctx)) return;
      if (movedAt < 0 || time - movedAt > 5000) {
        if (movedAt >= 0) idx = (idx + 1) % 3;
        movedAt = time;
        const a = ctx.rng() * Math.PI * 2;
        x = clamp(ctx.player.x + Math.cos(a) * 110, 60, ctx.W - 60);
        y = clamp(ctx.player.y + Math.sin(a) * 90, 130, ctx.H - 50);
      }
      if (!inside()) return;
      if (idx === 0 && time >= boostUntil) { ctx.boostDamage(1.3, 260); boostUntil = time + 260; }
      if (idx === 1) { healAcc += 2 * dt; if (healAcc >= 2) { ctx.heal(ctx.player, 2); healAcc -= 2; } }
    },
    onHitTaken(amount) {
      if (idx === 2 && inside()) ctx.heal(ctx.player, Math.min(6, Math.round(amount / 2)));
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      const c = COLORS[idx];
      const on = inside();
      g.fillStyle(c, on ? 0.32 : 0.2 + Math.sin(time / 300) * 0.04); g.fillRect(x - 46, y - 34, 92, 68);
      g.lineStyle(4, LEAD, 0.7); g.strokeRect(x - 46, y - 34, 92, 68);
      g.lineStyle(2, LEAD, 0.5); g.lineBetween(x, y - 34, x, y + 34); g.lineBetween(x - 46, y, x + 46, y);
      // How long before it moves: the lead along the top lights.
      const k = clamp((time - movedAt) / 5000, 0, 1);
      g.lineStyle(2, GILT_LIT, 0.7); g.lineBetween(x - 46, y - 34, x - 46 + 92 * (1 - k), y - 34);
    },
  };
};

// ── The Vesper Pin (artifact) ────────────────────────────────────────
// Every 12s a pillar of evening light comes down on where the foe stands (1.1s warning on the
// floor) — 18 if they are still under it. Once a fight, dropping under 30% health, you rise:
// healed 30 over 3s and 40% faster for those 3s.

const vesperPin: ItemScriptFactory = (ctx) => {
  let nextAt = -1;
  let pillar: { x: number; y: number; at: number; dealt: boolean } | null = null;
  let risen = false, riseUntil = 0, healAcc = 0;
  const tick = clock();
  return {
    update(time) {
      const dt = tick(time);
      if (!live(ctx)) return;
      if (nextAt < 0) nextAt = time + 6000;
      if (time >= nextAt && foeLive(ctx)) {
        nextAt = time + 12000;
        pillar = { x: ctx.npc.x, y: ctx.npc.y, at: time + 1100, dealt: false };
      }
      if (pillar && !pillar.dealt && time >= pillar.at) {
        pillar.dealt = true;
        ctx.sfx('light-beam');
        if (foeLive(ctx) && dist(pillar.x, pillar.y, ctx.npc.x, ctx.npc.y) < 60) ctx.hit(ctx.npc, 18, pillar.x, pillar.y);
      }
      if (pillar && pillar.dealt && time > pillar.at + 500) pillar = null;
      if (!risen && ctx.player.hp < ctx.player.maxHp * 0.3) {
        risen = true;
        riseUntil = time + 3000;
        ctx.boostSpeed(1.4, 3000);
        ctx.float(ctx.player.x, ctx.player.y - 60, 'RAPTURE', '#ffe8a0');
        ctx.sfx('wings');
      }
      if (time < riseUntil) { healAcc += 10 * dt; if (healAcc >= 2) { ctx.heal(ctx.player, 2); healAcc -= 2; } }
    },
    drawGround(g, time) {
      if (!pillar) return;
      if (!pillar.dealt) {
        const k = clamp(1 - (pillar.at - time) / 1100, 0, 1);
        g.fillStyle(EVENGOLD, 0.08 + k * 0.16); g.fillCircle(pillar.x, pillar.y, 60);
        g.lineStyle(2, EVENGOLD, 0.4 + k * 0.5); g.strokeCircle(pillar.x, pillar.y, 60 * (1.4 - k * 0.4));
      }
    },
    drawAir(g, time) {
      if (pillar && pillar.dealt) {
        const f = clamp((time - pillar.at) / 500, 0, 1);
        g.fillStyle(0xfff6d8, 0.5 * (1 - f)); g.fillRect(pillar.x - 40, 96, 80, pillar.y - 96);
      }
      if (time < riseUntil && live(ctx)) {
        const p = ctx.player;
        for (let i = 0; i < 8; i++) {
          const a = -Math.PI / 2 + (i - 3.5) * 0.25;
          g.lineStyle(2, i % 2 ? EVENGOLD : 0xffffff, 0.4); g.lineBetween(p.x, p.y - 20, p.x + Math.cos(a) * 50, p.y - 20 + Math.sin(a) * 40);
        }
      }
    },
  };
};

export const CATHEDRAL_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_BEADS, name: 'Telling Beads', emoji: '📿', kind: 'charm', price: 520, isle: ISLE,
    flavor: 'Five violet beads on a gilt string, worn smooth by somebody\'s thumb. Tallowby says they were "left in a pew".',
    script: CHARM_BEADS,
    scriptText: [
      'Five beads circle you at arm\'s length. A bead that swings through your foe strikes for 4 and is spent.',
      'The string re-threads a bead every 2.5s.',
    ],
  },
  {
    id: CHARM_VOTIVE, name: 'Votive Stub', emoji: '🕯️', kind: 'charm', price: 680, isle: ISLE,
    flavor: 'A pauper\'s candle-end, begged from the gutter of the stair. It has never been paid for and it will not go out.',
    script: CHARM_VOTIVE,
    scriptText: [
      'Stand still for a second to set it at your feet. Within reach of it you mend 2 a second.',
      'It burns 7s after you step away, and sears the foe for 5 if they stand on it.',
    ],
  },
  {
    id: CHARM_BELL, name: 'Change-Ringer\'s Handbell', emoji: '🔔', kind: 'charm', price: 880, isle: ISLE,
    flavor: 'One of Carol\'s choir, the treble. Old Simeon rang it once, his own way. It never forgot.',
    effect: { cooldownMult: 0.98 },
    script: CHARM_BELL,
    scriptText: [
      'Never strike the same bell twice running: cast three different abilities in a row, within 4s,',
      'and it rings — your foe takes 10 and is stunned 0.6s, if within 220px.',
    ],
  },
  {
    id: CHARM_PANE, name: 'Pane of Flash Glass', emoji: '🪟', kind: 'charm', price: 1120, isle: ISLE,
    flavor: 'A quarry of Ysolde Quarrel\'s glass, flashed three colours deep. Hold it to the light and the light comes with you.',
    effect: { maxHp: 6 },
    script: CHARM_PANE,
    scriptText: [
      'A pane of light lies near you, moving and changing colour every 5s. Stand in it:',
      'red, +30% damage; blue, mend 2 a second; gold, half of each hit taken (up to 6) given back.',
    ],
  },
  {
    id: ART_VESPER, name: 'The Vesper Pin', emoji: '📍', kind: 'artifact', isle: ISLE,
    flavor: 'The bare gilt pin from Vesper\'s collar, where her own Part hung for ten years. Nothing hangs on it now. It still sings.',
    effect: { maxHp: 14 },
    script: ART_VESPER,
    scriptText: [
      'Every 12s a pillar of evening light falls where your foe stands (1.1s warning): 18 if they stay.',
      'Once a fight, below 30% health, you rise: heal 30 over 3s and move 40% faster.',
    ],
  },
  {
    id: FISH_CHAR, name: 'Chorister Char', emoji: '🐟', kind: 'fish', sell: 34, isle: ISLE,
    flavor: 'Small and speckled, rose-bellied under the ice. The choir school\'s infirmarian swears by it for a sore throat.',
    effect: { regenPerSecond: 0.6 },
  },
  {
    id: FISH_SALMON, name: 'Psalm Salmon', emoji: '🐟', kind: 'fish', sell: 54, isle: ISLE,
    flavor: 'A silver salmon that rises in slow verses — up, a pause, up again — as if it were reading the line.',
    effect: { damageTakenMult: 0.97 },
  },
  {
    id: FISH_VENDACE, name: 'Vesper Vendace', emoji: '🐠', kind: 'fish', sell: 80, isle: ISLE,
    flavor: 'A little violet whitefish that only comes up to the holes at evensong. Hold it up and it shimmers like a lit window.',
    effect: { cooldownMult: 0.97 },
  },
];

export const CATHEDRAL_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_BEADS]: beads,
  [CHARM_VOTIVE]: votive,
  [CHARM_BELL]: changeBell,
  [CHARM_PANE]: flashPane,
  [ART_VESPER]: vesperPin,
};

export const CATHEDRAL_SHOPS: ShopDef[] = [
  { id: 'cathedral-shop', name: 'Tallowby\'s Chandlery & Votives', stock: [CHARM_BEADS, CHARM_VOTIVE, CHARM_BELL, CHARM_PANE], buys: true },
];

export const CATHEDRAL_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Cloister Pond', kind: 'ice' }];

export const CATHEDRAL_FISH: FishDef[] = [
  { id: FISH_CHAR, fisheries: [FISHERY], weight: 6, fight: 2, size: [14, 32] },
  { id: FISH_SALMON, fisheries: [FISHERY], weight: 3, fight: 3, size: [42, 84] },
  { id: FISH_VENDACE, fisheries: [FISHERY], weight: 1.5, fight: 4, size: [10, 24] },
];

