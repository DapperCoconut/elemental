import type { BakeryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../IslesTypes';
import { OBS } from '../../../art/PinnacleArt';
import { ISLE_COLOR } from './art';

/**
 * The Muster's goods: Hesper Quill's four dear charms (made for the climb and nothing else), four
 * strong counter foods, and the four "last supper" meals Dottie Firkin cooks from fish of several isles.
 *
 * Every script keeps its own clock (scene `time`), draws what it is doing on the fighter it belongs
 * to, and says so out loud when it fires. The charms are about the camp itself: the ten who came,
 * the King's shell, the ones who came before, and rowing in time.
 */

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};
const css = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

// ── Charm: The Muster Roll ───────────────────────────────────────────

/** The ten names on the roll, in Muster order, each with its isle colour and its answer. */
const ROLL: { name: string; color: number; text: string }[] = [
  { name: 'TAMSIN', color: ISLE_COLOR.fire, text: 'SEARED 10' },
  { name: 'ODO', color: ISLE_COLOR.water, text: '+8 HEALTH' },
  { name: 'WENDELINE', color: ISLE_COLOR.life, text: 'THE LADIES' },
  { name: 'BARNABY', color: ISLE_COLOR.air, text: 'TAILWIND' },
  { name: 'GIDEON', color: ISLE_COLOR.earth, text: 'HONEST WALL' },
  { name: 'WREN', color: ISLE_COLOR.electricity, text: 'RELIT' },
  { name: 'TANSY', color: ISLE_COLOR.slime, text: 'VENOM' },
  { name: 'MARLO', color: ISLE_COLOR.fate, text: 'A COIN' },
  { name: 'LARK', color: ISLE_COLOR.sound, text: 'ONE NOTE' },
  { name: 'SABLE', color: ISLE_COLOR.light, text: 'THE LAMP' },
];

/**
 * Ten names on a roll of sailcloth. Every tenth of the foe's health you take off, the next name on
 * the roll answers — each in their own way: a sear, a heal, bees, a tailwind, a wall, every cooldown
 * relit, venom, a coin-flip, a stunning note, and a lamp that makes your hits count for more.
 */
const musterRoll: ItemScriptFactory = (ctx) => {
  let dealt = 0;
  let called = 0;
  let inCall = false;
  let calledAt = -9999;
  let wallUntil = 0;
  const pending: { at: number; amount: number }[] = [];
  const cast = new Set<string>();
  const answer = (i: number, now: number): void => {
    const r = ROLL[i];
    const p = ctx.player, n = ctx.npc;
    ctx.float(p.x, p.y - 62, `${r.name} — ${r.text}`, css(r.color));
    ctx.flash(p.x, p.y - 40, r.color);
    switch (i) {
      case 0: ctx.hit(n, 10, n.x, n.y); ctx.sfx('flame-burst'); break;
      case 1: ctx.heal(p, 8); ctx.sfx('splash'); break;
      case 2: for (let k = 1; k <= 3; k++) pending.push({ at: now + k * 500, amount: 3 }); ctx.sfx('spore'); break;
      case 3: ctx.boostSpeed(1.35, 2000); ctx.sfx('gust'); break;
      case 4: wallUntil = now + 4000; ctx.sfx('stone-rise'); break;
      case 5: for (const id of cast) ctx.refund(id, 1500); ctx.sfx('zap'); break;
      case 6: for (let k = 1; k <= 6; k++) pending.push({ at: now + k * 500, amount: 2 }); ctx.sfx('status-poison'); break;
      case 7: if (ctx.rng() < 0.5) ctx.hit(n, 18, n.x, n.y); else ctx.heal(p, 9); ctx.sfx('dice'); break;
      case 8: ctx.stun(n, 600); ctx.sfx('sonic-pulse'); break;
      default: ctx.boostDamage(1.25, 3000); ctx.sfx('light-beam'); break;
    }
  };
  return {
    update(time) {
      for (let i = pending.length - 1; i >= 0; i--) {
        if (time < pending[i].at) continue;
        const amt = pending[i].amount;
        pending.splice(i, 1);
        if (!alive(ctx, 'npc')) continue;
        inCall = true;
        ctx.hit(ctx.npc, amt, ctx.npc.x, ctx.npc.y);
        inCall = false;
      }
    },
    onCast(abilityId) { cast.add(abilityId); },
    onHitDealt(amount) {
      if (inCall || called >= ROLL.length) return;
      dealt += amount;
      const step = Math.max(1, ctx.npc.maxHp * 0.1);
      if (dealt < step) return;
      dealt -= step;
      const now = ctx.scene.time.now;
      inCall = true;
      answer(called, now);
      inCall = false;
      called++;
      calledAt = now;
    },
    onHitTaken(amount) {
      if (ctx.scene.time.now > wallUntil || !alive(ctx, 'player')) return;
      wallUntil = 0;
      const back = Math.min(15, Math.max(1, Math.round(amount * 0.5)));
      ctx.heal(ctx.player, back);
      ctx.float(ctx.player.x, ctx.player.y - 50, `THE WALL HOLDS +${back}`, css(ISLE_COLOR.earth));
    },
    drawAir(g, time) {
      const p = ctx.player;
      // Ten pips in an arc over the head: dim until their name has answered.
      for (let i = 0; i < ROLL.length; i++) {
        const a = Math.PI * (1.15 + (i / 9) * 0.7);
        const x = p.x + Math.cos(a) * 30, y = p.y - 8 + Math.sin(a) * 30;
        const on = i < called;
        g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 3.2);
        g.fillStyle(ROLL[i].color, on ? 1 : 0.25); g.fillCircle(x, y, on ? 2.6 : 1.8);
        if (i === called - 1 && time - calledAt < 700) {
          g.lineStyle(1.5, ROLL[i].color, 1 - (time - calledAt) / 700); g.strokeCircle(x, y, 4 + (time - calledAt) / 40);
        }
      }
      if (time < wallUntil) {
        g.lineStyle(3, ISLE_COLOR.earth, 0.5); g.beginPath(); g.arc(p.x, p.y, 30, Math.PI * 0.1, Math.PI * 0.9, false); g.strokePath();
      }
    },
  };
};

// ── Charm: Splinter of the Shell ─────────────────────────────────────

/**
 * A splinter of the King's own shell, pale-edged, a hair of starlight in its crack. Every hit you
 * land cracks the foe's "shell" (two cracks from behind them). Six cracks and it breaks: the
 * starlight under it burns them for 24 and stuns them 0.4s. Cracks heal one at a time after 3.5s
 * without a hit.
 */
const shellSplinter: ItemScriptFactory = (ctx) => {
  let cracks = 0;
  let lastAdd = -9999;
  let lastHeal = 0;
  let brokeAt = -9999;
  let busy = false;
  return {
    update(time) {
      if (cracks > 0 && time - lastAdd > 3500 && time - lastHeal > 800) { cracks--; lastHeal = time; }
    },
    onHitDealt() {
      if (busy || !alive(ctx, 'npc')) return;
      const now = ctx.scene.time.now;
      if (now - brokeAt < 1000) return;
      const n = ctx.npc, p = ctx.player;
      const f = ctx.facing(n);
      const dx = p.x - n.x, dy = p.y - n.y, d = Math.hypot(dx, dy) || 1;
      const behind = (Math.cos(f) * dx + Math.sin(f) * dy) / d < -0.3;
      cracks = Math.min(6, cracks + (behind ? 2 : 1));
      lastAdd = now;
      if (behind) ctx.float(n.x, n.y - 46, 'FROM BEHIND — CRACK', css(OBS.seamLit));
      if (cracks < 6) return;
      cracks = 0;
      brokeAt = now;
      busy = true;
      ctx.hit(n, 24, n.x, n.y);
      busy = false;
      ctx.stun(n, 400);
      ctx.flash(n.x, n.y - 20, OBS.star);
      ctx.sfx('crystal-shatter');
      ctx.float(n.x, n.y - 60, 'THE SHELL BREAKS — STARLIGHT', css(OBS.star));
    },
    drawAir(g, time) {
      const n = ctx.npc;
      if (!alive(ctx, 'npc')) return;
      // A broken ring of shell over the foe: one more seam per crack.
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.32;
        const x = n.x + Math.cos(a) * 30, y = n.y - 10 + Math.sin(a) * 30;
        g.fillStyle(OBS.glass, 0.9); g.fillTriangle(x - 4, y + 3, x + 4, y + 3, x, y - 5);
        g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(x, y - 5, x + 4, y + 3);
        if (i < cracks) { g.fillStyle(i >= 4 ? OBS.star : OBS.seamLit, 0.9); g.fillCircle(x, y, 1.6); }
      }
      if (time - brokeAt < 600) {
        const q = (time - brokeAt) / 600;
        g.fillStyle(OBS.star, 0.4 * (1 - q)); g.fillCircle(n.x, n.y - 10, 20 + q * 40);
        for (let k = 0; k < 8; k++) {
          const a = k / 8 * Math.PI * 2;
          g.fillStyle(OBS.facet, 1 - q); g.fillTriangle(n.x + Math.cos(a) * (20 + q * 50), n.y - 10 + Math.sin(a) * (20 + q * 50), n.x + Math.cos(a + 0.2) * (14 + q * 50), n.y - 10 + Math.sin(a + 0.2) * (14 + q * 50), n.x + Math.cos(a) * (12 + q * 40), n.y - 10 + Math.sin(a) * (12 + q * 40));
        }
      }
    },
  };
};

// ── Charm: Tally Chalk ───────────────────────────────────────────────

/**
 * A stub of the chalk the ones before scratched the Tally Stone with. Five tallies are drawn over
 * your head. Take a hit of 8 or more and one is struck off: the ghost of a challenger who never came
 * back strikes the foe for 12 + a quarter of the hit (max 20). The fifth is the mark nobody ever cut —
 * the one for coming home — and it heals you 20 instead.
 */
const tallyChalk: ItemScriptFactory = (ctx) => {
  let tallies = 5;
  let lastAt = -9999;
  let ghostAt = -9999;
  let gx = 0, gy = 0;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (tallies <= 0 || amount < 8 || now - lastAt < 1200 || !alive(ctx, 'player')) return;
      lastAt = now;
      tallies--;
      if (tallies === 0) {
        ctx.heal(ctx.player, 20);
        ctx.sfx('holy-chord');
        ctx.float(ctx.player.x, ctx.player.y - 60, 'THE OTHER COLUMN — +20', css(OBS.star));
        return;
      }
      if (!alive(ctx, 'npc')) return;
      const n = ctx.npc;
      const side = ctx.rng() < 0.5 ? -1 : 1;
      gx = n.x + side * 34; gy = n.y;
      ghostAt = now;
      ctx.hit(n, Math.min(20, 12 + Math.floor(amount * 0.25)), n.x, n.y);
      ctx.sfx('slash');
      ctx.float(n.x, n.y - 50, 'FOR THE ONES BEFORE', css(OBS.seamLit));
    },
    drawAir(g, time) {
      const p = ctx.player;
      // A gate of five chalked over the head.
      for (let k = 0; k < 4; k++) {
        const on = k < Math.max(0, tallies - 1);
        g.lineStyle(2, 0xf0f0f0, on ? 0.9 : 0.15); g.lineBetween(p.x - 9 + k * 5, p.y - 44, p.x - 8 + k * 5, p.y - 34);
      }
      g.lineStyle(2, OBS.star, tallies > 0 ? 0.9 : 0.15); g.lineBetween(p.x - 12, p.y - 36, p.x + 10, p.y - 42);
      if (time - ghostAt < 650) {
        const q = (time - ghostAt) / 650;
        const a = 0.7 * (1 - q);
        g.fillStyle(0xc9b0ff, a * 0.5); g.fillEllipse(gx, gy - 4, 20, 34);
        g.fillStyle(0xe8e0ff, a); g.fillCircle(gx, gy - 26, 7);
        g.lineStyle(2, 0xffffff, a); g.lineBetween(gx, gy - 14, ctx.npc.x + (gx < ctx.npc.x ? -6 : 6), ctx.npc.y - 18 + q * 20);
      }
    },
  };
};

// ── Charm: The Second Oar ────────────────────────────────────────────

/**
 * A spare oar-pin off the Ferryman's boat. Row in time: cast E, R, F or Q, never the same slot twice
 * running, each within 2.6s of the last. Four strokes and you PULL — the foe is hauled up to 110px
 * toward you and takes 14, and you get 1.5s of +20% speed. Lose the rhythm and the stroke resets.
 */
const secondOar: ItemScriptFactory = (ctx) => {
  const WINDOW = 2600;
  let stroke = 0;
  let lastSlot: string | null = null;
  let lastAt = -9999;
  let pullAt = -9999;
  let fromX = 0, fromY = 0;
  return {
    update(time) { if (stroke > 0 && time - lastAt > WINDOW) { stroke = 0; lastSlot = null; } },
    onCast(_abilityId, slot) {
      if (!slot || slot === 'click') return;
      const now = ctx.scene.time.now;
      stroke = slot !== lastSlot && now - lastAt <= WINDOW ? stroke + 1 : 1;
      lastSlot = slot; lastAt = now;
      if (stroke < 4) { ctx.sfx('whoosh'); return; }
      stroke = 0; lastSlot = null;
      if (!alive(ctx, 'npc')) return;
      const p = ctx.player, n = ctx.npc;
      const dx = p.x - n.x, dy = p.y - n.y, d = Math.hypot(dx, dy) || 1;
      const pull = Math.min(110, Math.max(0, d - 60));
      fromX = n.x; fromY = n.y; pullAt = now;
      ctx.nudge(n, (dx / d) * pull, (dy / d) * pull);
      ctx.hit(n, 14, n.x, n.y);
      ctx.boostSpeed(1.2, 1500);
      ctx.sfx('splash');
      ctx.float(p.x, p.y - 56, 'PULL!', '#c9b0ff');
    },
    drawGround(g, time) {
      const p = ctx.player;
      // Two oars at your sides, raised one notch per stroke.
      for (const s of [-1, 1]) {
        const lift = stroke * 0.18;
        const a = Math.PI / 2 + s * (0.9 - lift);
        const x1 = p.x + Math.cos(a) * 34 * s * s, y1 = p.y + 10 - Math.sin(lift) * 14;
        g.lineStyle(2, 0x9a7452, 0.75); g.lineBetween(p.x + s * 10, p.y + 6, x1 + s * 22, y1);
        g.fillStyle(0x9a7452, 0.75); g.fillEllipse(x1 + s * 26, y1, 10, 5);
      }
      if (time - pullAt < 500) {
        const q = (time - pullAt) / 500;
        g.lineStyle(4, 0xc9b0ff, 0.5 * (1 - q)); g.lineBetween(fromX, fromY, ctx.npc.x, ctx.npc.y);
        g.fillStyle(0xe8e0ff, 0.3 * (1 - q)); g.fillEllipse(fromX, fromY + 10, 40 + q * 30, 10);
      }
    },
  };
};

// ── Meals ────────────────────────────────────────────────────────────

/** Last Supper Stew: every third of the foe's health you take, a mouthful — +12 health (twice). */
const lastSupperStew: ItemScriptFactory = (ctx) => {
  let mouthfuls = 0;
  return {
    update() {
      if (mouthfuls >= 2 || !alive(ctx, 'player') || ctx.npc.maxHp <= 0) return;
      const frac = ctx.npc.hp / ctx.npc.maxHp;
      if (frac <= (2 - mouthfuls) / 3) {
        mouthfuls++;
        ctx.heal(ctx.player, 12);
        ctx.sfx('heal');
        ctx.float(ctx.player.x, ctx.player.y - 50, 'A MOUTHFUL OF HOME +12', '#ffd8a0');
      }
    },
  };
};

/** Stormcrust Pie: the first cast of each of E, R, F and Q this fight cracks the crust — the foe takes 8. */
const stormcrustPie: ItemScriptFactory = (ctx) => {
  const used = new Set<string>();
  return {
    onCast(_id, slot) {
      if (!slot || slot === 'click' || used.has(slot) || !alive(ctx, 'npc')) return;
      used.add(slot);
      ctx.hit(ctx.npc, 8, ctx.npc.x, ctx.npc.y);
      ctx.sfx('zap');
      ctx.float(ctx.npc.x, ctx.npc.y - 48, `CRUST (${slot.toUpperCase()}) 8`, css(ISLE_COLOR.electricity));
    },
  };
};

/** Fen & Fortune Skillet: every 6s a coin flips — heads, your next hit lands +12; tails, +6 health now. */
const fenFortuneSkillet: ItemScriptFactory = (ctx) => {
  let next = -1;
  let heads = false;
  let busy = false;
  let flipAt = -9999;
  return {
    update(time) {
      if (next < 0) next = time + 6000;
      if (time < next) return;
      next = time + 6000;
      flipAt = time;
      if (ctx.rng() < 0.5) { heads = true; ctx.float(ctx.player.x, ctx.player.y - 50, 'HEADS', css(ISLE_COLOR.fate)); }
      else { ctx.heal(ctx.player, 6); ctx.float(ctx.player.x, ctx.player.y - 50, 'TAILS +6', css(ISLE_COLOR.slime)); }
      ctx.sfx('dice');
    },
    onHitDealt() {
      if (!heads || busy || !alive(ctx, 'npc')) return;
      heads = false;
      busy = true;
      ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y);
      busy = false;
    },
    drawAir(g, time) {
      const p = ctx.player;
      const spin = time - flipAt < 500 ? Math.abs(Math.cos((time - flipAt) / 40)) : 1;
      if (!heads && time - flipAt > 500) return;
      g.fillStyle(0xe8c050, 1); g.fillEllipse(p.x + 22, p.y - 40, 9 * spin, 9);
      g.fillStyle(0xfff0a0, 0.8); g.fillEllipse(p.x + 21, p.y - 41, 4 * spin, 4);
    },
  };
};

/** Choir & Candle Supper: once, under 40% health, a song — the foe is stunned 0.8s and you heal 16. */
const choirCandleSupper: ItemScriptFactory = (ctx) => {
  let sung = false;
  let at = -9999;
  return {
    onHitTaken() {
      if (sung || !alive(ctx, 'player') || ctx.player.hp > ctx.player.maxHp * 0.4) return;
      sung = true;
      at = ctx.scene.time.now;
      ctx.heal(ctx.player, 16);
      if (alive(ctx, 'npc')) ctx.stun(ctx.npc, 800);
      ctx.sfx('holy-chord');
      ctx.float(ctx.player.x, ctx.player.y - 56, 'THE LAST LINE, SUNG', css(ISLE_COLOR.sound));
    },
    drawAir(g, time) {
      if (time - at > 900) return;
      const q = (time - at) / 900;
      const p = ctx.player;
      for (let r = 0; r < 3; r++) {
        g.lineStyle(2, ISLE_COLOR.sound, (1 - q) * 0.6); g.strokeCircle(p.x, p.y, 20 + q * 140 + r * 18);
      }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const PIN_ITEMS: IsleItemDef[] = [
  // Hesper Quill's charms
  {
    id: 'charm-pin-muster-roll', name: 'The Muster Roll', emoji: '📜', kind: 'charm', price: 2600, isle: 'pinnacle',
    flavor: 'Ten names in ten hands on a strip of sailcloth. Read it aloud on the stair. Somebody always answers.',
    script: 'charm-pin-muster-roll', effect: { maxHp: 10 },
    scriptText: [
      'Every 10% of the foe\'s health you take, the next of the ten answers: sear 10, heal 8, bees, tailwind,',
      'a wall (half your next hit back), cooldowns relit 1.5s, venom, a coin, a 0.6s stun, +25% damage for 3s.',
    ],
  },
  {
    id: 'charm-pin-shell-splinter', name: 'Splinter of the Shell', emoji: '🔮', kind: 'charm', price: 2200, isle: 'pinnacle',
    flavor: 'A sliver off the King\'s own shell, found on the stair. There is a hair of starlight in the crack. It is warm.',
    script: 'charm-pin-shell-splinter', effect: { critChance: 0.03 },
    scriptText: [
      'Hits crack the foe\'s shell (2 cracks from behind them). Six cracks: it breaks for 24 and a 0.4s stun.',
      'Cracks heal one at a time after 3.5s without a hit.',
    ],
  },
  {
    id: 'charm-pin-tally-chalk', name: 'Tally Chalk', emoji: '🖍️', kind: 'charm', price: 1600, isle: 'pinnacle',
    flavor: 'A worn stub of the chalk the ones before scratched the Tally Stone with. Nobody ever used the other column.',
    script: 'charm-pin-tally-chalk', effect: { damageTakenMult: 0.97 },
    scriptText: [
      'Five tallies. A hit of 8+ strikes one off: a ghost of the ones before hits the foe for 12 + ¼ of it (max 20).',
      'The fifth is the mark for coming home: it heals you 20 instead.',
    ],
  },
  {
    id: 'charm-pin-second-oar', name: 'The Second Oar', emoji: '🛶', kind: 'charm', price: 1900, isle: 'pinnacle',
    flavor: 'A spare oar-pin off the Ferryman\'s boat. He has never needed two. He gave it over without a word.',
    script: 'charm-pin-second-oar', effect: { cooldownMult: 0.97 },
    scriptText: [
      'Row in time: E/R/F/Q, never the same slot twice running, each within 2.6s. Four strokes — PULL:',
      'the foe is hauled up to 110px toward you and takes 14, and you gain 1.5s of +20% speed.',
    ],
  },
  // Counter food
  {
    id: 'food-pin-hardtack', name: 'Muster Hardtack', emoji: '🍘', kind: 'food', price: 90, sell: 22, isle: 'pinnacle',
    flavor: 'Ten isles\' flour in one biscuit, baked twice. Breaks teeth. Keeps for a century. Some of it may have.',
    effect: { shieldHp: 16 },
  },
  {
    id: 'food-pin-ten-isle-tea', name: 'Ten-Isle Tea', emoji: '🍵', kind: 'food', price: 120, sell: 30, isle: 'pinnacle',
    flavor: 'A leaf from every isle in one pot. It should taste terrible. It tastes like everyone talking at once.',
    effect: { regenPerSecond: 0.45, cooldownMult: 0.96 },
  },
  {
    id: 'food-pin-glasswater-grog', name: 'Glasswater Grog', emoji: '🍺', kind: 'food', price: 140, sell: 35, isle: 'pinnacle',
    flavor: 'Rum, rainwater off the glass and a squeeze of something from Tansy\'s still. Do not ask. Drink.',
    effect: { damageMult: 1.05, speedMult: 1.04 },
  },
  {
    id: 'food-pin-ferry-flask', name: 'Ferryman\'s Flask', emoji: '🫗', kind: 'food', price: 180, sell: 45, isle: 'pinnacle',
    flavor: 'He keeps it under the thwart. He has never offered it to anyone before. It is very, very strong.',
    effect: { maxHp: 16, damageTakenMult: 0.97 },
  },
  // Dottie Firkin's last suppers
  {
    id: 'meal-pin-last-supper-stew', name: 'Last Supper Stew', emoji: '🍲', kind: 'food', sell: 30, isle: 'pinnacle',
    flavor: 'Sprat from Brandmark, herring from the Reach, mullet from Thornwild, one pot. Tastes of three harbours.',
    script: 'meal-pin-last-supper-stew', effect: { maxHp: 10 },
    scriptText: ['Next fight: each time the foe drops past another third of its health, a mouthful heals you 12.'],
  },
  {
    id: 'meal-pin-stormcrust-pie', name: 'Stormcrust Pie', emoji: '🥧', kind: 'food', sell: 40, isle: 'pinnacle',
    flavor: 'Sky tuna and volt herring under a crust that crackles when cut. The fork buzzes. That is normal.',
    script: 'meal-pin-stormcrust-pie', effect: { damageMult: 1.03 },
    scriptText: ['Next fight: the first cast of each of E, R, F and Q strikes the foe for 8.'],
  },
  {
    id: 'meal-pin-fen-fortune-skillet', name: 'Fen & Fortune Skillet', emoji: '🍳', kind: 'food', sell: 40, isle: 'pinnacle',
    flavor: 'Mire mullet and lotfish fried together. Dottie flips it with a coin. Heads, more pepper.',
    script: 'meal-pin-fen-fortune-skillet', effect: { critChance: 0.02 },
    scriptText: ['Next fight: every 6s a coin flips — heads, your next hit adds 12; tails, you heal 6.'],
  },
  {
    id: 'meal-pin-choir-candle-supper', name: 'Choir & Candle Supper', emoji: '🕯️', kind: 'food', sell: 50, isle: 'pinnacle',
    flavor: 'Chimefish, noonfish and granite grouper, served by candlelight while somebody sings. Badly. On purpose.',
    script: 'meal-pin-choir-candle-supper', effect: { shieldHp: 12 },
    scriptText: ['Next fight: once, under 40% health, a song: the foe is stunned 0.8s and you heal 16.'],
  },
];

export const PIN_SCRIPTS: Record<string, ItemScriptFactory> = {
  'charm-pin-muster-roll': musterRoll,
  'charm-pin-shell-splinter': shellSplinter,
  'charm-pin-tally-chalk': tallyChalk,
  'charm-pin-second-oar': secondOar,
  'meal-pin-last-supper-stew': lastSupperStew,
  'meal-pin-stormcrust-pie': stormcrustPie,
  'meal-pin-fen-fortune-skillet': fenFortuneSkillet,
  'meal-pin-choir-candle-supper': choirCandleSupper,
};

export const PIN_SHOPS: ShopDef[] = [
  {
    id: 'pin-stores', name: 'The Muster Stores', buys: true,
    stock: [
      'charm-pin-muster-roll', 'charm-pin-shell-splinter', 'charm-pin-tally-chalk', 'charm-pin-second-oar',
      'food-pin-hardtack', 'food-pin-ten-isle-tea', 'food-pin-glasswater-grog', 'food-pin-ferry-flask',
    ],
  },
];

export const PIN_BAKERIES: BakeryDef[] = [
  {
    id: 'pin-kitchen', name: 'The Camp Kitchen',
    recipes: [
      {
        id: 'recipe-pin-last-supper-stew', name: 'Last Supper Stew', coins: 40, output: 'meal-pin-last-supper-stew', makes: 2,
        inputs: [{ item: 'fish-cinder-sprat', count: 1 }, { item: 'fish-brine-herring', count: 1 }, { item: 'fish-mossback-mullet', count: 1 }],
      },
      {
        id: 'recipe-pin-stormcrust-pie', name: 'Stormcrust Pie', coins: 50, output: 'meal-pin-stormcrust-pie',
        inputs: [{ item: 'fish-sky-tuna', count: 1 }, { item: 'fish-volt-herring', count: 2 }],
      },
      {
        id: 'recipe-pin-fen-fortune-skillet', name: 'Fen & Fortune Skillet', coins: 50, output: 'meal-pin-fen-fortune-skillet',
        inputs: [{ item: 'fish-mire-mullet', count: 1 }, { item: 'fish-lotfish', count: 2 }],
      },
      {
        id: 'recipe-pin-choir-candle-supper', name: 'Choir & Candle Supper', coins: 60, output: 'meal-pin-choir-candle-supper',
        inputs: [{ item: 'fish-chimefish', count: 2 }, { item: 'fish-noonfish', count: 1 }, { item: 'fish-granite-grouper', count: 1 }],
      },
    ],
  },
];
