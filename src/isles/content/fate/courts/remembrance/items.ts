import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { fmn, photo } from './art';
import { FMN_BLUE, FMN_LIT, GILT, GILT_DARK, GILT_LIT, HINDSIGHT_EYE, INK, MEM_AMBER, PAPER, PAPER_DARK, RECALL, RECALL_LIT, SEPIA_DEEP, SEPIA_LIT } from './palette';
import { alive, clamp, dist } from './util';

/**
 * The Remembrance Court's goods: Agatha Keepsake's four charms, Prince Hindsight's spyglass, and
 * the Lethe's three fish. Every charm is a thing people here use to *keep* — a ticket, a string
 * on the finger, a locket, a flower in the buttonhole — and each one plays the court's rule of
 * the past coming back in your favour. Scripts are registered below under their item ids.
 */

const ISLE = 'fate';

export const CHARM_TICKET = 'remembrance-charm-pawn-ticket';
export const CHARM_STRING = 'remembrance-charm-finger-string';
export const CHARM_LOCKET = 'remembrance-charm-keepsake-locket';
export const CHARM_BUTTONHOLE = 'remembrance-charm-buttonhole';
export const ART_HINDSIGHT = 'art-hindsight';

export const FISH_FLUKE = 'fish-forgetful-fluke';
export const FISH_LAMPREY = 'fish-lethe-lamprey';
export const FISH_KOI = 'fish-keepsake-koi';
export const FISHERY = 'remembrance-lethe';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Pawn Ticket ──────────────────────────────────────────────────────
// Every blow you take is written on the ticket. Land a hit within 5s and you redeem it: 60% of
// what the ticket holds lands on the foe as well. An unredeemed ticket lapses.

const pawnTicket: ItemScriptFactory = (ctx) => {
  let held = 0;
  let lapseAt = 0;
  let redeemFx = 0;
  return {
    update(time) { if (held > 0 && time > lapseAt) held = 0; },
    onHitTaken(amount) {
      held = Math.min(30, held + amount);
      lapseAt = ctx.scene.time.now + 5000;
    },
    onHitDealt() {
      if (held <= 0 || !foeLive(ctx)) return;
      const n = Math.max(3, Math.round(held * 0.6));
      held = 0;
      redeemFx = ctx.scene.time.now;
      ctx.hit(ctx.npc, n, ctx.npc.x, ctx.npc.y - 20);
      ctx.float(ctx.npc.x, ctx.npc.y - 50, `REDEEMED ${n}`, '#f6b84a');
      ctx.sfx('money');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 24, y = p.y - 36 + Math.sin(time / 300) * 2;
      if (held > 0) {
        const left = clamp((lapseAt - time) / 5000, 0, 1);
        g.fillStyle(PAPER_DARK, 1); g.fillRect(x - 9, y - 6, 18, 12);
        g.fillStyle(PAPER, 1); g.fillRect(x - 8, y - 5, 16, 10);
        g.fillStyle(MEM_AMBER, 1); g.fillRect(x - 6, y - 3, 12 * (held / 30), 3);
        g.fillStyle(INK, 0.6); g.fillRect(x - 6, y + 1, 9, 1.5);
        g.lineStyle(1.5, left < 0.3 ? 0xb0302a : GILT, 0.9); g.beginPath(); g.arc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
      }
      if (time - redeemFx < 400 && foeLive(ctx)) {
        const k = (time - redeemFx) / 400;
        g.lineStyle(3 * (1 - k), MEM_AMBER, 1 - k); g.strokeCircle(ctx.npc.x, ctx.npc.y, 20 + k * 30);
      }
    },
  };
};

// ── String Round the Finger ──────────────────────────────────────────
// Each of Click, E, R and F you cast ties a knot. With all four tied the string pulls tight:
// every other ability you cast gets 1.4s back, and your next hit lands 12 harder.

const fingerString: ItemScriptFactory = (ctx) => {
  const knots = new Map<string, string>();
  let armed = false;
  let tightFx = 0;
  return {
    onCast(abilityId, slot) {
      if (!slot || slot === 'q') return;
      knots.set(slot, abilityId);
      if (knots.size >= 4 && !armed) {
        armed = true;
        tightFx = ctx.scene.time.now;
        for (const [, id] of knots) if (id !== abilityId) ctx.refund(id, 1400);
        knots.clear();
        ctx.float(ctx.player.x, ctx.player.y - 50, 'REMEMBERED', '#f6b84a');
        ctx.sfx('snap-back');
      }
    },
    onHitDealt() {
      if (!armed || !foeLive(ctx)) return;
      armed = false;
      ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y - 24);
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const cx = p.x - 22, cy = p.y - 8;
      // A loop of red string with a knot for each slot tied.
      g.lineStyle(1.5, 0xc03a30, 1); g.strokeEllipse(cx, cy, 14, 8);
      const slots = ['click', 'e', 'r', 'f'];
      slots.forEach((s, i) => {
        const a = -Math.PI / 2 + (i / 4) * Math.PI * 2;
        const kx = cx + Math.cos(a) * 7, ky = cy + Math.sin(a) * 4;
        if (knots.has(s)) { g.fillStyle(0xe05a48, 1); g.fillCircle(kx, ky, 2.4); }
        else { g.fillStyle(0x6a2a24, 0.5); g.fillCircle(kx, ky, 1.2); }
      });
      if (armed) { glow(g, cx, cy, 14, 0xe05a48, 0.07, 2); g.lineStyle(1, 0xffb0a0, 0.6 + Math.sin(time / 80) * 0.3); g.strokeEllipse(cx, cy, 20, 12); }
      if (time - tightFx < 500) { const k = (time - tightFx) / 500; g.lineStyle(2, 0xe05a48, 1 - k); g.strokeEllipse(cx, cy, 14 + k * 40, 8 + k * 24); }
    },
  };
};

// ── Keepsake Locket ──────────────────────────────────────────────────
// Every 5s the locket takes your likeness — where you stood and how you were. Once a fight, when
// you drop under 30%, it opens: you are drawn back to the likeness and healed up to how you were
// then (at most 40).

const locket: ItemScriptFactory = (ctx) => {
  let snapAt = -1;
  let snap = { x: 0, y: 0, hp: 0 };
  let used = false;
  let openedAt = -9999;
  return {
    update(time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (snapAt < 0 || time - snapAt >= 5000) {
        // Only a better day is worth keeping: it keeps the higher of the old and new health.
        if (snapAt < 0 || p.hp >= snap.hp * 0.85) snap = { x: p.x, y: p.y, hp: p.hp };
        snapAt = time;
      }
      if (!used && p.hp < p.maxHp * 0.3 && snap.hp > p.hp) {
        used = true;
        openedAt = time;
        ctx.nudge(p, snap.x - p.x, snap.y - p.y);
        ctx.heal(p, Math.min(40, Math.round(snap.hp - p.hp)));
        ctx.float(p.x, p.y - 50, 'AS YOU WERE', '#f2d68a');
        ctx.sfx('time-warp');
      }
    },
    drawGround(g, time) {
      if (used || snapAt < 0 || !live(ctx)) return;
      // Where the likeness was taken: a faint photograph on the floor.
      photo(g, snap.x, snap.y + 12, 18, 13, 0.2, 0.5, 3);
      g.lineStyle(1, GILT, 0.3 + Math.sin(time / 400) * 0.15); g.strokeCircle(snap.x, snap.y + 12, 16);
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x, y = p.y + 16;
      const open = time - openedAt < 900;
      g.fillStyle(GILT_DARK, 1); g.fillCircle(x, y, 5);
      g.fillStyle(used && !open ? GILT_DARK : GILT, 1); g.fillCircle(x, y, 4);
      if (open) {
        const k = (time - openedAt) / 900;
        g.fillStyle(GILT_LIT, 1); g.fillCircle(x + 6, y - 2, 4);
        g.lineStyle(3 * (1 - k), GILT_LIT, 1 - k); g.strokeCircle(x, y - 16, 20 + k * 50);
      }
    },
  };
};

// ── Forget-Me-Not Buttonhole ─────────────────────────────────────────
// Unhurt, a bloom opens on your coat every 2.5s, up to three. Each hit you land plucks one for 7
// extra damage and a quick step. Hurt, every bloom you wore falls — and each heals you 3.

const buttonhole: ItemScriptFactory = (ctx) => {
  let blooms = 0;
  let since = -1;
  let shedAt = -9999;
  let shed = 0;
  return {
    update(time) {
      if (since < 0) since = time;
      if (blooms < 3 && time - since >= 2500) { blooms++; since = time; }
      if (blooms >= 3) since = time;
    },
    onHitDealt() {
      if (blooms <= 0 || !foeLive(ctx)) return;
      blooms--;
      ctx.hit(ctx.npc, 7, ctx.npc.x, ctx.npc.y - 20);
      ctx.boostSpeed(1.15, 1200);
    },
    onHitTaken() {
      if (blooms <= 0) { since = ctx.scene.time.now; return; }
      shed = blooms;
      ctx.heal(ctx.player, blooms * 3);
      blooms = 0;
      shedAt = ctx.scene.time.now;
      since = shedAt;
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      for (let i = 0; i < blooms; i++) fmn(g, p.x - 8 + i * 7, p.y - 14 + Math.sin(time / 400 + i) * 1, 2.6, 1, i % 2 ? FMN_LIT : FMN_BLUE);
      if (time - shedAt < 700) {
        const k = (time - shedAt) / 700;
        for (let i = 0; i < shed; i++) fmn(g, p.x - 8 + i * 7 + k * (i - 1) * 16, p.y - 14 + k * 30, 2.6, 1 - k, FMN_BLUE);
      }
    },
  };
};

// ── Hindsight's Spyglass (artifact) ──────────────────────────────────
// Every blow you take is seen again, too late, 2.2s on — an amber echo strikes your foe for 40%
// of it. And while your foe stands where it stood 2s ago, your blows land 25% harder.

const spyglass: ItemScriptFactory = (ctx) => {
  const echoes: { at: number; n: number }[] = [];
  const trail: { x: number; y: number; t: number }[] = [];
  let boostUntil = 0;
  let still = false;
  let fx: { x: number; y: number; at: number }[] = [];
  return {
    update(time) {
      const n = ctx.npc;
      if (foeLive(ctx)) {
        const last = trail[trail.length - 1];
        if (!last || time - last.t > 100) trail.push({ x: n.x, y: n.y, t: time });
        while (trail.length && time - trail[0].t > 2400) trail.shift();
        const past = trail.find((p) => time - p.t <= 2000) ?? trail[0];
        still = !!past && time - past.t > 1500 && dist(past.x, past.y, n.x, n.y) < 60;
        if (still && live(ctx) && time >= boostUntil) { ctx.boostDamage(1.25, 220); boostUntil = time + 220; }
      }
      for (let i = echoes.length - 1; i >= 0; i--) {
        const e = echoes[i];
        if (time < e.at) continue;
        echoes.splice(i, 1);
        if (!foeLive(ctx)) continue;
        ctx.hit(n, e.n, n.x, n.y - 20);
        fx.push({ x: n.x, y: n.y, at: time });
        ctx.sfx('hit-light');
      }
      fx = fx.filter((f) => time - f.at < 500);
    },
    onHitTaken(amount) {
      echoes.push({ at: ctx.scene.time.now + 2200, n: clamp(Math.round(amount * 0.4), 2, 16) });
    },
    drawGround(g, time) {
      if (!foeLive(ctx) || !trail.length) return;
      const past = trail.find((p) => time - p.t <= 2000) ?? trail[0];
      // Where your foe was two seconds ago, through the glass: a gilt ring, bright when they're in it.
      g.lineStyle(still ? 2.5 : 1.2, still ? HINDSIGHT_EYE : SEPIA_LIT, still ? 0.8 : 0.35);
      g.strokeCircle(past.x, past.y + 10, 60 * 0.5);
      if (still) glow(g, past.x, past.y + 10, 30, HINDSIGHT_EYE, 0.05, 2);
    },
    drawAir(g, time) {
      for (const f of fx) {
        const k = (time - f.at) / 500;
        g.lineStyle(3 * (1 - k), RECALL, 1 - k); g.strokeCircle(f.x, f.y, 16 + k * 26);
        g.fillStyle(RECALL_LIT, 0.6 * (1 - k)); g.fillCircle(f.x, f.y - 20, 6 * (1 - k));
      }
      if (!live(ctx)) return;
      const p = ctx.player;
      // The little spyglass at your shoulder, the wrong way round, ticking down any echoes owed.
      g.lineStyle(4, GILT_DARK, 1); g.lineBetween(p.x - 26, p.y - 30, p.x - 12, p.y - 38);
      g.lineStyle(2.5, GILT, 1); g.lineBetween(p.x - 26, p.y - 30, p.x - 12, p.y - 38);
      g.fillStyle(HINDSIGHT_EYE, 0.8); g.fillCircle(p.x - 27, p.y - 29, 2.4);
      echoes.forEach((e, i) => { g.fillStyle(SEPIA_DEEP, 1); g.fillCircle(p.x - 30 + i * 5, p.y - 44, 2); g.fillStyle(RECALL, clamp(1 - (e.at - time) / 2200, 0, 1)); g.fillCircle(p.x - 30 + i * 5, p.y - 44, 1.6); });
      if (!foeLive(ctx) || !still) return;
      // Seen through the glass: a little amber eye over a foe that hasn't moved on.
      const n = ctx.npc;
      g.fillStyle(PAPER, 0.9); g.fillEllipse(n.x, n.y - 50, 16, 8);
      g.fillStyle(HINDSIGHT_EYE, 1); g.fillCircle(n.x, n.y - 50, 3.2);
      g.fillStyle(INK, 1); g.fillCircle(n.x, n.y - 50, 1.4);
    },
  };
};

export const REMEMBRANCE_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_TICKET, name: 'Pawn Ticket', emoji: '🎟️', kind: 'charm', price: 420, isle: ISLE,
    flavor: 'A pledge ticket from Tally & Daughters, never redeemed. The number on it is nobody\'s now.',
    script: CHARM_TICKET,
    scriptText: [
      'Every blow you take is written on the ticket (up to 30). It lapses 5s after the last one.',
      'Land a hit before it lapses to redeem it: 60% of what it holds strikes your foe.',
    ],
  },
  {
    id: CHARM_STRING, name: 'String Round the Finger', emoji: '🧶', kind: 'charm', price: 560, isle: ISLE,
    flavor: 'A loop of red thread, the way the court ties things it must not forget. Agatha sells it by the yard.',
    script: CHARM_STRING,
    scriptText: [
      'Casting your Click, E, R and F each ties a knot. With all four tied the string pulls tight:',
      'the other three get 1.4s back off their cooldowns, and your next hit deals 12 extra.',
    ],
  },
  {
    id: CHARM_LOCKET, name: 'Keepsake Locket', emoji: '📿', kind: 'charm', price: 780, isle: ISLE,
    flavor: 'A gilt locket with a likeness inside that changes when you are not looking. It keeps your best.',
    effect: { maxHp: 6 },
    script: CHARM_LOCKET,
    scriptText: [
      'Every 5s the locket takes your likeness: where you stood, and your health (it keeps the better day).',
      'Once a fight, under 30% health, it opens: you are drawn back there and healed up to it (at most 40).',
    ],
  },
  {
    id: CHARM_BUTTONHOLE, name: 'Forget-Me-Not Buttonhole', emoji: '💠', kind: 'charm', price: 980, isle: ISLE,
    flavor: 'Myosotis picks them at dawn. Worn on the coat, they open one by one while you stay out of trouble.',
    script: CHARM_BUTTONHOLE,
    scriptText: [
      'While unhurt, a bloom opens on your coat every 2.5s (up to 3). Each hit you land plucks one:',
      '7 extra damage and a quick step. When you are hit, every bloom falls and each heals you 3.',
    ],
  },
  {
    id: ART_HINDSIGHT, name: 'Hindsight\'s Spyglass', emoji: '🔭', kind: 'artifact', isle: ISLE,
    flavor: 'A brass glass the Prince held the wrong way round all his life. Through it, everything is a little late.',
    effect: { maxHp: 15 },
    script: ART_HINDSIGHT,
    scriptText: [
      'Every blow you take echoes 2.2s later onto your foe for 40% of it (2–16).',
      'While your foe stands where it stood 2s ago, your blows deal +25% damage.',
    ],
  },
  {
    id: FISH_FLUKE, name: 'Forgetful Fluke', emoji: '🐟', kind: 'fish', sell: 32, isle: ISLE,
    flavor: 'A pale flatfish that feeds on what is poured into the Lethe. Its belly sometimes glows.',
    effect: { cooldownMult: 0.97 },
  },
  {
    id: FISH_LAMPREY, name: 'Lethe Lamprey', emoji: '🪱', kind: 'fish', sell: 50, isle: ISLE,
    flavor: 'It fastens to whatever sinks past and drinks the colour out of it. Grey, cold, ungrateful.',
    effect: { lifestealFrac: 0.03 },
  },
  {
    id: FISH_KOI, name: 'Keepsake Koi', emoji: '🎏', kind: 'fish', sell: 88, isle: ISLE,
    flavor: 'Gold and sepia, with a pattern on its back that looks, if you stare, like somebody\'s face.',
    effect: { maxHp: 10 },
  },
];

export const REMEMBRANCE_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_TICKET]: pawnTicket,
  [CHARM_STRING]: fingerString,
  [CHARM_LOCKET]: locket,
  [CHARM_BUTTONHOLE]: buttonhole,
  [ART_HINDSIGHT]: spyglass,
};

export const REMEMBRANCE_SHOPS: ShopDef[] = [
  { id: 'remembrance-shop', name: 'Keepsake\'s Curios', stock: [CHARM_TICKET, CHARM_STRING, CHARM_LOCKET, CHARM_BUTTONHOLE], buys: true },
];

export const REMEMBRANCE_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Lethe', kind: 'lethe' }];

export const REMEMBRANCE_FISH: FishDef[] = [
  { id: FISH_FLUKE, fisheries: [FISHERY], weight: 6, fight: 2, size: [14, 34] },
  { id: FISH_LAMPREY, fisheries: [FISHERY], weight: 3, fight: 4, size: [30, 70] },
  { id: FISH_KOI, fisheries: [FISHERY], weight: 1, fight: 5, size: [24, 58] },
];
