import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { drawCat, drawOwl, drawToad, rune } from '../art';
import { CHALK, GOLD, SIDE_NPC, SIDE_PLAYER, VIOLET_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Familiars — Witch Grimalkin.
 *
 * Three familiars wander the circle, unbound, each inside a little chalk ring: a black cat, a
 * barn owl and a fat toad. Walk into one to bind it, and for fourteen seconds it follows you and
 * works for you:
 *
 * • the **owl** swoops at your foe every few seconds and *marks* them — marked, they take a third
 *   more from everything;
 * • the **cat** crouches (a line shows where) and *pounces* on your foe, claws and a shove;
 * • the **toad** squats between you and your foe and *swallows* the first shot of theirs that
 *   comes near — then sits digesting for a while.
 *
 * Grimalkin binds them too, and she knows them all by name. A familiar is a timid thing: take
 * enough punishment while one is bound to you and it bolts, unbound, for whoever is quicker.
 */

type Kind = 'cat' | 'owl' | 'toad';
type Side = 'player' | 'npc';

const BIND_MS = 14000;
const SHAKE_DMG = 30;
const TOUCH_R = 32;

interface Familiar {
  kind: Kind;
  x: number; y: number;
  owner: Side | null;
  boundUntil: number;
  /** Damage its owner has taken since it was bound. */
  shaken: number;
  /** No rebinding until then (just bolted). */
  shyUntil: number;
  wx: number; wy: number;
  nextAct: number;
  /** Mid-action: owl swoop, cat crouch/pounce. */
  actAt: number;
  actKind: 'none' | 'swoop' | 'crouch' | 'pounce';
  fromX: number; fromY: number; toX: number; toY: number;
  /** Toad: digesting until. */
  fullUntil: number;
  gulpAt: number;
  face: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const fighter = (s: Side): Fighter => (s === 'player' ? player : npc);
  const enemyOf = (s: Side): Fighter => (s === 'player' ? npc : player);
  const markUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const randPt = () => ({ x: 120 + rng() * (W - 240), y: top + 80 + rng() * (H - top - 140) });
  const fams: Familiar[] = (['cat', 'owl', 'toad'] as Kind[]).map((kind, i) => {
    const p = { x: W * (0.25 + i * 0.25), y: i === 1 ? top + 110 : H - 110 };
    return {
      kind, x: p.x, y: p.y, owner: null, boundUntil: 0, shaken: 0, shyUntil: 0, wx: p.x, wy: p.y,
      nextAct: 0, actAt: 0, actKind: 'none', fromX: 0, fromY: 0, toX: 0, toY: 0, fullUntil: 0, gulpAt: -9999, face: 1,
    };
  });
  const NAMES: Record<Kind, string> = { cat: 'CAT', owl: 'OWL', toad: 'TOAD' };
  const now = () => ctx.scene.time.now;

  function bind(f: Familiar, s: Side, time: number): void {
    f.owner = s;
    f.boundUntil = time + BIND_MS + (s === 'npc' && ctx.hard ? 2000 : 0);
    f.shaken = 0;
    f.nextAct = time + 1200;
    f.actKind = 'none';
    const who = fighter(s);
    ctx.float(who.x, who.y - 52, `BOUND: ${NAMES[f.kind]}`, s === 'player' ? '#9ae8ff' : '#ffb09a');
    ctx.sfx('sparkle');
  }

  function release(f: Familiar, time: number, bolt: boolean): void {
    if (bolt) {
      ctx.float(f.x, f.y - 30, `THE ${NAMES[f.kind]} BOLTS`, '#f0e6ff');
      ctx.sfx('whoosh');
    }
    f.owner = null;
    f.shyUntil = time + 1600;
    f.actKind = 'none';
    const p = randPt();
    f.wx = p.x; f.wy = p.y;
  }

  function hurt(s: Side, amount: number): void {
    const t = now();
    for (const f of fams) {
      if (f.owner !== s) continue;
      f.shaken += amount;
      if (f.shaken >= SHAKE_DMG) release(f, t, true);
    }
  }

  function act(f: Familiar, time: number): void {
    if (!f.owner) return;
    const me = fighter(f.owner), foe = enemyOf(f.owner);
    if (!alive(me) || !alive(foe)) return;
    if (f.kind === 'owl') {
      f.actKind = 'swoop'; f.actAt = time;
      f.fromX = f.x; f.fromY = f.y; f.toX = foe.x; f.toY = foe.y - 30;
      ctx.sfx('wings');
    } else if (f.kind === 'cat') {
      if (dist(f.x, f.y, foe.x, foe.y) > 300) { f.nextAct = time + 600; return; }
      f.actKind = 'crouch'; f.actAt = time;
      f.fromX = f.x; f.fromY = f.y; f.toX = foe.x; f.toY = foe.y;
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      for (const f of fams) {
        // Binding by touch.
        if (!f.owner && time >= f.shyUntil) {
          for (const s of ['player', 'npc'] as Side[]) {
            const who = fighter(s);
            if (alive(who) && dist(who.x, who.y, f.x, f.y) < TOUCH_R + 14) { bind(f, s, time); break; }
          }
        }
        if (f.owner && time >= f.boundUntil) release(f, time, false);

        if (!f.owner) {
          // Wander between chalk marks.
          if (dist(f.x, f.y, f.wx, f.wy) < 8) { const p = randPt(); f.wx = p.x; f.wy = p.y; }
          const a = Math.atan2(f.wy - f.y, f.wx - f.x);
          const sp = f.kind === 'toad' ? 26 : f.kind === 'owl' ? 44 : 38;
          f.x += Math.cos(a) * sp * dt; f.y += Math.sin(a) * sp * dt;
          f.face = Math.cos(a) >= 0 ? 1 : -1;
          continue;
        }

        const me = fighter(f.owner), foe = enemyOf(f.owner);
        // Mid-action motion.
        if (f.actKind === 'swoop') {
          const k = (time - f.actAt) / 420;
          if (k < 1) {
            f.toX = foe.x; f.toY = foe.y - 30;
            f.x = f.fromX + (f.toX - f.fromX) * k; f.y = f.fromY + (f.toY - f.fromY) * k - Math.sin(k * Math.PI) * 50;
            continue;
          }
          if (alive(foe)) {
            markUntil.set(foe, time + 3000);
            ctx.float(foe.x, foe.y - 56, 'MARKED', '#f0d070');
            ctx.sfx('screech');
          }
          f.actKind = 'none'; f.nextAct = time + (f.owner === 'npc' && ctx.hard ? 3000 : 3600);
        } else if (f.actKind === 'crouch') {
          if (time - f.actAt >= 560) {
            f.actKind = 'pounce'; f.actAt = time; f.fromX = f.x; f.fromY = f.y;
            ctx.sfx('slash');
          } else { f.face = f.toX >= f.x ? 1 : -1; continue; }
        }
        if (f.actKind === 'pounce') {
          const k = (time - f.actAt) / 240;
          f.x = f.fromX + (f.toX - f.fromX) * Math.min(1, k); f.y = f.fromY + (f.toY - f.fromY) * Math.min(1, k) - Math.sin(Math.min(1, k) * Math.PI) * 24;
          if (k >= 1) {
            if (alive(foe) && dist(foe.x, foe.y, f.toX, f.toY) < 46) {
              ctx.hit(foe, 8, foe.x, foe.y - 10);
              const a = Math.atan2(foe.y - f.fromY, foe.x - f.fromX);
              ctx.nudge(foe, Math.cos(a) * 46, Math.sin(a) * 46);
              ctx.float(foe.x, foe.y - 46, 'POUNCE', '#ffe0c0');
            } else ctx.float(f.toX, f.toY - 20, 'missed', '#c8c0d8');
            f.actKind = 'none'; f.nextAct = time + (f.owner === 'npc' && ctx.hard ? 3800 : 4500);
          }
          continue;
        }
        // Following: the owl on the shoulder, the cat at heel, the toad squatting between.
        let tx = me.x - 30, ty = me.y + 8;
        if (f.kind === 'owl') { tx = me.x + 18; ty = me.y - 4; }
        else if (f.kind === 'toad' && alive(foe)) {
          const a = Math.atan2(foe.y - me.y, foe.x - me.x);
          tx = me.x + Math.cos(a) * 40; ty = me.y + Math.sin(a) * 40;
        } else if (f.kind === 'cat') { tx = me.x - 26; ty = me.y + 14; }
        const k = Math.min(1, dt * (f.kind === 'owl' ? 10 : 6));
        f.x += (tx - f.x) * k; f.y += (ty - f.y) * k;
        f.face = alive(foe) && foe.x >= f.x ? 1 : -1;
        if (time >= f.nextAct && f.kind !== 'toad') act(f, time);
        // The toad's tongue.
        if (f.kind === 'toad' && time >= f.fullUntil) {
          for (const s of ctx.shotsNear(f.x, f.y - 6, 36)) {
            if (s.owner === f.owner) continue;
            s.block();
            f.gulpAt = time;
            f.fullUntil = time + 5000;
            ctx.float(f.x, f.y - 30, 'GULP', '#c8f080');
            ctx.sfx('slime-splat');
            break;
          }
        }
      }
    },

    onPlayerHurt(n) { hurt('player', n); },
    onNpcHurt(n) { hurt('npc', n); },

    playerTakenMult() { return now() < (markUntil.get(player) ?? 0) ? 1.3 : 1; },
    npcTakenMult() { return now() < (markUntil.get(npc) ?? 0) ? 1.3 : 1; },

    npcSeek() {
      // Grimalkin goes for a free familiar — the owl first, she likes the owl.
      const t = now();
      const free = fams.filter((f) => !f.owner && t >= f.shyUntil);
      if (!free.length) return null;
      free.sort((a, b) => (dist(a.x, a.y, npc.x, npc.y) - (a.kind === 'owl' ? 120 : 0)) - (dist(b.x, b.y, npc.x, npc.y) - (b.kind === 'owl' ? 120 : 0)));
      return { x: free[0].x, y: free[0].y };
    },

    drawGround(g, time) {
      for (const f of fams) {
        if (!f.owner) {
          // A chalk ring that walks with it: the binding circle.
          const pulse = 0.5 + Math.sin(time / 300 + f.x) * 0.3;
          g.lineStyle(1.5, CHALK, 0.5 + pulse * 0.3); g.strokeEllipse(f.x, f.y + 2, TOUCH_R * 2.2, TOUCH_R * 1.2);
          for (let i = 0; i < 6; i++) {
            const a = time / 1600 + (i / 6) * Math.PI * 2;
            rune(g, f.x + Math.cos(a) * TOUCH_R * 1.1, f.y + 2 + Math.sin(a) * TOUCH_R * 0.6, 3, i, CHALK, 0.6, 1);
          }
        } else {
          const me = fighter(f.owner);
          const c = f.owner === 'player' ? SIDE_PLAYER : SIDE_NPC;
          const left = clamp((f.boundUntil - time) / BIND_MS, 0, 1);
          g.lineStyle(1.5, c, 0.25 + left * 0.35); g.lineBetween(me.x, me.y + 4, f.x, f.y);
          g.lineStyle(1.5, c, 0.6); g.beginPath(); g.arc(f.x, f.y + 2, 16, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
        }
        // The cat's pounce line while crouched.
        if (f.actKind === 'crouch') {
          const k = clamp((time - f.actAt) / 560, 0, 1);
          g.lineStyle(2, 0xffe0c0, 0.25 + k * 0.6); g.lineBetween(f.x, f.y, f.toX, f.toY);
          g.lineStyle(1.5, 0xffe0c0, 0.4 + k * 0.5); g.strokeCircle(f.toX, f.toY, 22 + (1 - k) * 20);
        }
      }
    },

    drawAir(g, time) {
      for (const f of fams) {
        const c = f.owner === 'player' ? SIDE_PLAYER : f.owner === 'npc' ? SIDE_NPC : VIOLET_LIT;
        if (f.owner) glow(g, f.x, f.y - 10, 16, c, 0.05, 2);
        if (f.kind === 'cat') drawCat(g, f.x, f.y, 1.1, f.face, 0x221e28, f.owner ? lit(c, 0.3) : 0xf6dc52, f.actKind === 'crouch' ? 1 : 0);
        else if (f.kind === 'owl') {
          const flying = f.actKind === 'swoop';
          drawOwl(g, f.x, f.y, 1.05, 0xd0b088, f.owner ? lit(c, 0.2) : 0xf0a838, flying ? 0.8 + Math.sin(time / 50) * 0.2 : f.owner ? 0 : Math.max(0, Math.sin(time / 500)) * 0.3);
        } else {
          const gulp = clamp(1 - (time - f.gulpAt) / 500, 0, 1);
          const full = time < f.fullUntil;
          drawToad(g, f.x, f.y, 1.15, 0x7a8a3a, full ? 0.5 + Math.sin(time / 200) * 0.2 : Math.max(0, Math.sin(time / 350)) * 0.4 + gulp);
          if (full) { g.lineStyle(1, 0xc8f080, 0.5); g.beginPath(); g.arc(f.x, f.y - 24, 6, -Math.PI / 2, -Math.PI / 2 + clamp((f.fullUntil - time) / 5000, 0, 1) * Math.PI * 2, false); g.strokePath(); }
          if (gulp > 0) { g.lineStyle(2, 0xe86a7a, gulp); g.lineBetween(f.x, f.y - 6, f.x + f.face * 28 * gulp, f.y - 8); }
        }
      }
      // The owl's mark: a gold eye over the marked.
      for (const [who, until] of markUntil) {
        if (!alive(who) || now() >= until) continue;
        const x = who.x, y = who.y - 62 + Math.sin(time / 200) * 2;
        g.lineStyle(2, GOLD, 0.9); g.strokeEllipse(x, y, 24, 12);
        g.fillStyle(GOLD, 0.9); g.fillCircle(x, y, 4);
        g.fillStyle(0x000000, 1); g.fillCircle(x, y, 1.6);
        for (const k of [-1, 1]) { g.lineStyle(1.2, GOLD, 0.7); g.lineBetween(x + k * 12, y, x + k * 18, y - 4); }
      }
    },

    drawHud(g) {
      // Three pips: whose each familiar is.
      fams.forEach((f, i) => {
        const x = W / 2 - 40 + i * 40, y = top + 16;
        const c = f.owner === 'player' ? SIDE_PLAYER : f.owner === 'npc' ? SIDE_NPC : 0x8a8a9a;
        g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 13);
        g.lineStyle(2, c, 1); g.strokeCircle(x, y, 13);
        if (f.kind === 'cat') drawCat(g, x, y + 8, 0.6, 1, 0x221e28, 0xf6dc52);
        else if (f.kind === 'owl') drawOwl(g, x, y + 9, 0.55, 0xd0b088, 0xf0a838);
        else drawToad(g, x, y + 6, 0.6, 0x7a8a3a);
      });
    },
  };
}

export const FAMILIARS: GimmickDef = {
  id: 'arcane-familiars',
  rules: 'Touch a wandering familiar to bind it: the owl marks your foe, the cat pounces, the toad swallows a shot. Take a beating and it bolts.',
  make,
};
