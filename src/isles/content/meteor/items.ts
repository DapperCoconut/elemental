import type { IsleItemDef, ItemScriptCtx, ItemScriptFactory } from '../../IslesTypes';
import { dim, lit } from '../../art/IsleArt';
import { crackPath, seam } from '../../art/PinnacleArt';
import { CROWN_COLS, FP, MOOD, P, fallenKing, glassFish } from './art';
import { FALLEN_ARTIFACT } from './spec';

/**
 * Fallpoint's finds: the Fallen King's own artifact, dropped when his appeal is dismissed inside the
 * Fall, and a charm of boiled sea-glass in the wreck-chest on the western rim.
 */

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

// ── art-fallen-star: the Fallen Star (the Retrial) ───────────────────

/**
 * The cinder, gone grey and small enough to carry, rides over your shoulder and keeps the record.
 * Every hit you deal is entered for you; every hit you take, against you. Round it ten marks — one
 * for each of the Ten Laws — light one a second. When the tenth lights, the case is HEARD AGAIN:
 * - the foe takes a third of everything you dealt in those ten seconds (at most 42), all at once;
 * - you are healed a third of everything you took (at most 30);
 * - if you dealt at least as much as you took, the appeal is DISMISSED: the foe is stunned 0.6 s;
 * - if you took more, it is UPHELD in your favour: +15% damage for 5 s, to make your case.
 * Then a fresh docket opens. A little balance under it shows how the record stands — you can read
 * the verdict coming, and play for it.
 */
const fallenStar: ItemScriptFactory = (ctx) => {
  const TERM_MS = 10000;
  const SHARE = 1 / 3;
  const MAX_ECHO = 42;
  const MAX_HEAL = 30;
  let termStart = -1;
  let dealt = 0, taken = 0;
  /** The last hearing, for the art: when, where, how it went. */
  let heardAt = -10000, heardX = 0, heardY = 0, foeX = 0, foeY = 0, verdict: 'dismissed' | 'upheld' | 'none' = 'none';
  const balance = (): number => {
    const tot = dealt + taken;
    return tot <= 0 ? 0 : (dealt - taken) / tot;
  };
  const hear = (time: number): void => {
    const p = ctx.player;
    heardAt = time; heardX = p.x; heardY = p.y;
    const echo = Math.min(MAX_ECHO, Math.round(dealt * SHARE));
    const mend = Math.min(MAX_HEAL, Math.round(taken * SHARE));
    verdict = dealt + taken <= 0 ? 'none' : dealt >= taken ? 'dismissed' : 'upheld';
    if (verdict === 'none') return;
    ctx.sfx('judgement');
    if (mend > 0) ctx.heal(p, mend);
    if (alive(ctx, 'npc')) {
      const n = ctx.npc;
      foeX = n.x; foeY = n.y;
      if (echo > 0) { ctx.hit(n, echo, n.x, n.y); ctx.flash(n.x, n.y, MOOD.open.light); }
      if (verdict === 'dismissed') ctx.stun(n, 600);
    }
    if (verdict === 'upheld') ctx.boostDamage(1.15, 5000);
    ctx.float(p.x, p.y - 86, verdict === 'dismissed' ? 'DISMISSED' : 'UPHELD', verdict === 'dismissed' ? '#ffe0a8' : '#ff9a6a');
  };
  return {
    update(time) {
      if (!alive(ctx, 'player')) return;
      if (termStart < 0) termStart = time;
      if (time - termStart >= TERM_MS) {
        hear(time);
        termStart = time;
        dealt = 0; taken = 0;
      }
    },
    onHitDealt(amount) { if (amount > 0) dealt += amount; },
    onHitTaken(amount) { if (amount > 0) taken += amount; },
    drawGround(g, time) {
      // The sentence carried out: a line of light from you to the foe, and a ring where it landed.
      const k = (time - heardAt) / 700;
      if (k < 0 || k >= 1 || verdict === 'none') return;
      const col = verdict === 'dismissed' ? MOOD.open.light : MOOD.fall.light;
      g.lineStyle(6 * (1 - k), col, 0.18 * (1 - k)); g.lineBetween(heardX, heardY, foeX, foeY);
      g.lineStyle(2 * (1 - k), lit(col, 0.5), 0.7 * (1 - k)); g.lineBetween(heardX, heardY, foeX, foeY);
      g.lineStyle(3 * (1 - k) + 1, col, 0.7 * (1 - k)); g.strokeEllipse(foeX, foeY + 10, 40 + k * 90, (40 + k * 90) * 0.45);
      g.fillStyle(col, 0.12 * (1 - k)); g.fillEllipse(heardX, heardY + 10, 60 + k * 120, (60 + k * 120) * 0.45);
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const x = p.x + 30, y = p.y - 56 + Math.sin(time / 520) * 2;
      const term = termStart < 0 ? 0 : Math.min(1, (time - termStart) / TERM_MS);
      const marks = Math.floor(term * 10);
      // Ten marks round the cinder, one per law, lit in their isle's colour as the term runs.
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const mx = x + Math.cos(a) * 15, my = y + Math.sin(a) * 15;
        const on = i < marks;
        g.fillStyle(on ? CROWN_COLS[i] : 0x2a2428, on ? 0.95 : 0.7);
        g.fillTriangle(mx + Math.cos(a) * 3, my + Math.sin(a) * 3, mx + Math.cos(a + 1.6) * 1.6, my + Math.sin(a + 1.6) * 1.6, mx + Math.cos(a - 1.6) * 1.6, my + Math.sin(a - 1.6) * 1.6);
        if (on && i === marks - 1) { g.fillStyle(CROWN_COLS[i], 0.2); g.fillCircle(mx, my, 4); }
      }
      // The cinder: grey glass, a warmth that rises as the hearing nears, cracks that show it.
      const heat = 0.25 + term * 0.75;
      g.fillStyle(MOOD.open.wash, 0.08 * heat); g.fillCircle(x, y, 13);
      g.fillStyle(0x4a4644, 1); g.fillCircle(x, y, 8);
      g.fillStyle(0x6a6662, 1); g.fillCircle(x - 2, y - 2, 5);
      g.fillStyle(0x8a8682, 0.8); g.fillCircle(x - 3, y - 3.5, 1.6);
      seam(g, crackPath({ x: x - 5, y: y + 2 }, { x: x + 5, y: y - 3 }, () => 0.62, 2, 3), 0.8, heat, term, MOOD.open.light);
      seam(g, crackPath({ x, y: y - 7 }, { x: x + 1, y: y + 6 }, () => 0.31, 2, 3), 0.6, heat * 0.8, term, MOOD.open.light);
      // The balance hung under it: the record, tipping toward whoever is ahead.
      const b = balance();
      const tilt = b * 0.45;
      const by = y + 15;
      g.lineStyle(1, 0x9a948e, 0.9); g.lineBetween(x, y + 8, x, by);
      const lx = x - Math.cos(tilt) * 10, ly = by + Math.sin(tilt) * 10;
      const rx = x + Math.cos(tilt) * 10, ry = by - Math.sin(tilt) * 10;
      g.lineStyle(1.4, 0xb8b2a8, 1); g.lineBetween(lx, ly, rx, ry);
      // Dealt sits in the left pan (gold), taken in the right (ember).
      g.fillStyle(dim(MOOD.open.light, 0.1), 0.9); g.fillPoints([P(lx - 4, ly + 4), P(lx + 4, ly + 4), P(lx + 2.5, ly + 6), P(lx - 2.5, ly + 6)], true);
      g.fillStyle(dim(MOOD.fall.light, 0.1), 0.9); g.fillPoints([P(rx - 4, ry + 4), P(rx + 4, ry + 4), P(rx + 2.5, ry + 6), P(rx - 2.5, ry + 6)], true);
      g.lineStyle(0.6, 0x9a948e, 0.8);
      g.lineBetween(lx, ly, lx - 4, ly + 4); g.lineBetween(lx, ly, lx + 4, ly + 4);
      g.lineBetween(rx, ry, rx - 4, ry + 4); g.lineBetween(rx, ry, rx + 4, ry + 4);
      // The hearing itself: the little judge stands up out of the cinder for a moment.
      const k = (time - heardAt) / 900;
      if (k >= 0 && k < 1 && verdict !== 'none') {
        const a = Math.sin(k * Math.PI);
        fallenKing(g, x, y - 6, 0.36, { t: time / 1000, heat: 1, alpha: a, mood: verdict === 'dismissed' ? 'open' : 'fall' });
      }
    },
  };
};

// ── charm-fallpoint-glass: Boiled Sea-Glass ─────────────────────────

/**
 * A sprat set in amber glass mid-flick, faster than it could flinch. Take a hit of 6 or more and the
 * glass remembers the flinch for you: a 0.9 s dart at +30% speed (once every 7 s), and the little
 * fish wakes, circles you once, and sets again. When it is ready it hangs still at your shoulder.
 */
const seaGlass: ItemScriptFactory = (ctx) => {
  const MIN_HIT = 6;
  const DART_MS = 900;
  const COOLDOWN_MS = 7000;
  let dartAt = -100000;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < MIN_HIT || now - dartAt < COOLDOWN_MS || !alive(ctx, 'player')) return;
      dartAt = now;
      ctx.boostSpeed(1.3, DART_MS);
      ctx.sfx('whoosh');
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const k = (time - dartAt) / DART_MS;
      const ready = time - dartAt >= COOLDOWN_MS;
      // The glass bead: amber, a little lit plane, the sprat inside.
      const swim = k >= 0 && k < 1;
      const a = swim ? -Math.PI / 2 + k * Math.PI * 2 : 0;
      const x = swim ? p.x + Math.cos(a) * 26 : p.x - 24, y = swim ? p.y - 20 + Math.sin(a) * 14 : p.y - 44;
      if (!swim) {
        g.fillStyle(FP.amber, ready ? 0.85 : 0.45); g.fillEllipse(x, y, 13, 10);
        g.fillStyle(FP.amberLit, ready ? 0.6 : 0.25); g.fillEllipse(x - 2, y - 2, 6, 3);
      } else {
        g.fillStyle(FP.amberLit, 0.25 * (1 - k)); g.fillCircle(p.x, p.y - 20, 30);
      }
      glassFish(g, x, y, 0.6, swim ? a + Math.PI / 2 : 0.3, ready || swim ? 0xd8b048 : 0x8a7a48, 1);
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const METEOR_ITEMS: IsleItemDef[] = [
  {
    id: FALLEN_ARTIFACT, name: 'The Fallen Star', emoji: '☄️', kind: 'artifact', isle: 'pinnacle',
    flavor: 'Grey now, and no bigger than a plum. It still keeps the record. It cannot help it. It weighs every hit as if it mattered, and it did.',
    script: FALLEN_ARTIFACT, effect: { maxHp: 40 },
    scriptText: [
      'It keeps a ten-second docket of hits dealt and taken; then the case is HEARD AGAIN, and a fresh one opens.',
      'Foe takes 1/3 of what you dealt (max 42); you heal 1/3 of what you took (max 30).',
      'Dealt ≥ taken: DISMISSED, foe stunned 0.6s. Took more: UPHELD, +15% damage for 5s.',
    ],
  },
  {
    id: 'charm-fallpoint-glass', name: 'Boiled Sea-Glass', emoji: '🫧', kind: 'charm', isle: 'pinnacle',
    flavor: 'A thumb of amber glass off the rim at Fallpoint with a sprat inside, turned mid-flick. It set around the fish faster than the fish could flinch.',
    effect: { shieldHp: 14 }, script: 'charm-fallpoint-glass',
    scriptText: ['A hit of 6+ on you: a 0.9s dart at +30% speed. Once every 7s.'],
  },
];

export const METEOR_SCRIPTS: Record<string, ItemScriptFactory> = {
  [FALLEN_ARTIFACT]: fallenStar,
  'charm-fallpoint-glass': seaGlass,
};
