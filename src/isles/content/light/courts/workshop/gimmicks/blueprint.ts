import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { gear, lens } from '../art';
import {
  BLUEPRINT, BLUEPRINT_DARK, BRASS, BRASS_DARK, CYAN, CYAN_LIT, IRON, IRON_DARK, IRON_LIT, SIDE_NPC, SIDE_PLAYER,
} from '../palette';
import { alive, clamp, dist, ease, lerp, stepDt } from '../util';

/**
 * Blueprint — Draughtsman Plan.
 *
 * A lens-turret is chalked on the floor in cyan: six ghost outlines (three legs, the gear-box, the
 * barrel, the lens), each with a chalk line running out to the edge of the floor. One by one, a
 * hook on a chain lowers each part at the end of its line, and the part slides in along it to its
 * outline. Whoever is standing nearer a part when it clicks home *built* it — it takes their
 * colour. Strike a part, in transit or already home, to knock it clean off the plan: it clatters
 * away and has to be lowered again, and whoever built it loses the credit.
 *
 * When all six are home the turret wakes, swings its lens and fires a string of burning bolts at
 * whoever built *least* of it. Then it is knocked down, and Plan chalks a new one somewhere else.
 * Build your share — or knock his parts off and let him be the one it turns on.
 */

type PartKind = 'leg' | 'gear' | 'barrel' | 'lens';

interface Part {
  kind: PartKind;
  /** Where on the plan it fits, relative to the plan's centre. */
  off: Pt;
  /** The end of its chalk line, where the hook lowers it. */
  drop: Pt;
  state: 'waiting' | 'drop' | 'slide' | 'home' | 'scrap';
  /** When the current state began. */
  at: number;
  x: number; y: number;
  /** Who built it (when home). */
  by: 'player' | 'npc' | null;
  /** Where it was knocked to, and from where. */
  fromX: number; fromY: number; toX: number; toY: number;
  spin: number;
  target: StrikeTarget | null;
}

const DROP_MS = 650;
const SLIDE_MS = 3000;
const SCRAP_MS = 2600;
const STAGGER_MS = 1500;
const CREDIT_R = 210;

const SLOTS: [PartKind, number, number][] = [
  ['leg', -56, 44], ['leg', 56, 44], ['leg', 0, 64], ['gear', 0, 6], ['barrel', 0, -34], ['lens', 0, -66],
];

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const midY = (top + H) / 2 + 10;
  const centres: Pt[] = [{ x: W / 2, y: midY }, { x: W * 0.3, y: midY }, { x: W * 0.7, y: midY }];
  let planIdx = 0;
  let plan: Pt = centres[0];
  let parts: Part[] = [];
  /** 'build' while parts come in; 'wake' as it assembles; 'fire' while it shoots; 'down' between plans. */
  let phase: 'build' | 'wake' | 'fire' | 'down' = 'down';
  let phaseAt = 0;
  let started = false;
  let victim: 'player' | 'npc' | 'both' = 'both';
  let shotsLeft = 0;
  let nextShot = 0;
  let aimA = 0;
  let aimLockAt = 0;
  let flashAt = -9999;
  let shotNo = 0;
  const SHOTS = ctx.hard ? 7 : 6;
  const DMG = ctx.hard ? 14 : 12;

  const fighterOf = (s: 'player' | 'npc'): Fighter => (s === 'player' ? player : npc);

  function newPlan(time: number): void {
    plan = centres[planIdx % centres.length];
    planIdx++;
    for (const p of parts) p.target?.remove();
    parts = SLOTS.map(([kind, ox, oy], i) => {
      // Lines fan out from the plan to the floor's edges, one per part.
      const a = -Math.PI / 2 + (i / SLOTS.length) * Math.PI * 2 + 0.35;
      const drop = { x: clamp(plan.x + Math.cos(a) * 330, 70, W - 70), y: clamp(midY + Math.sin(a) * 230, top + 60, H - 50) };
      return {
        kind, off: { x: ox, y: oy }, drop, state: 'waiting' as const, at: time + 600 + i * STAGGER_MS,
        x: drop.x, y: drop.y, by: null, fromX: 0, fromY: 0, toX: 0, toY: 0, spin: rng() * 6, target: null,
      };
    });
    phase = 'build';
    phaseAt = time;
    ctx.banner('A NEW PLAN IS CHALKED', '#d8f8ff');
    ctx.sfx('trap-set');
  }

  function knock(p: Part, by: 'player' | 'npc', time: number): void {
    if (p.state !== 'slide' && p.state !== 'home') return;
    const striker = fighterOf(by);
    const a = Math.atan2(p.y - striker.y, p.x - striker.x) + (rng() - 0.5) * 0.6;
    p.fromX = p.x; p.fromY = p.y;
    p.toX = clamp(p.x + Math.cos(a) * 170, 50, W - 50);
    p.toY = clamp(p.y + Math.sin(a) * 140, top + 40, H - 40);
    if (p.by) ctx.float(p.x, p.y - 26, p.by === 'player' ? 'YOUR PART — OFF!' : 'HIS PART — OFF!', p.by === 'player' ? '#9ad8ff' : '#ffb0a0');
    else ctx.float(p.x, p.y - 26, 'OFF THE PLAN', '#d8f8ff');
    p.by = null;
    p.state = 'scrap';
    p.at = time;
    p.target?.remove();
    p.target = null;
    ctx.sfx('clang');
  }

  function attach(p: Part): void {
    p.target?.remove();
    p.target = ctx.target({ x: p.x, y: p.y, r: 20, onStruck: (by) => knock(p, by, ctx.scene.time.now) });
  }

  function credit(p: Part): void {
    const dp = alive(player) ? dist(player.x, player.y, p.x, p.y) : Infinity;
    const dn = alive(npc) ? dist(npc.x, npc.y, p.x, p.y) : Infinity;
    const best = Math.min(dp, dn);
    p.by = best > CREDIT_R ? null : dp <= dn ? 'player' : 'npc';
    if (p.by) ctx.float(p.x, p.y - 24, p.by === 'player' ? 'YOU BUILT IT' : 'PLAN BUILT IT', p.by === 'player' ? '#9ad8ff' : '#ffb0a0');
    ctx.sfx('gear-turn');
  }

  const count = (s: 'player' | 'npc') => parts.filter((p) => p.state === 'home' && p.by === s).length;

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; newPlan(time); }

      if (phase === 'build') {
        for (const p of parts) {
          if (p.state === 'waiting' && time >= p.at) { p.state = 'drop'; p.at = time; p.x = p.drop.x; p.y = p.drop.y; ctx.sfx('whoosh'); }
          else if (p.state === 'drop' && time - p.at >= DROP_MS) { p.state = 'slide'; p.at = time; attach(p); ctx.sfx('land'); }
          else if (p.state === 'slide') {
            const k = clamp((time - p.at) / SLIDE_MS, 0, 1);
            const e = ease(k);
            p.x = lerp(p.drop.x, plan.x + p.off.x, e);
            p.y = lerp(p.drop.y, plan.y + p.off.y, e);
            p.target?.moveTo(p.x, p.y);
            if (k >= 1) { p.state = 'home'; p.at = time; credit(p); }
          } else if (p.state === 'scrap') {
            const k = clamp((time - p.at) / 400, 0, 1);
            p.x = lerp(p.fromX, p.toX, k); p.y = lerp(p.fromY, p.toY, k) - Math.sin(k * Math.PI) * 30;
            p.spin += 0.3;
            if (time - p.at >= SCRAP_MS) { p.state = 'drop'; p.at = time; p.x = p.drop.x; p.y = p.drop.y; ctx.sfx('whoosh'); }
          }
        }
        if (parts.every((p) => p.state === 'home')) {
          phase = 'wake';
          phaseAt = time;
          for (const p of parts) { p.target?.remove(); p.target = null; }
          const cp = count('player'), cn = count('npc');
          victim = cp < cn ? 'player' : cn < cp ? 'npc' : 'both';
          ctx.banner(victim === 'player' ? `THE TURRET WAKES — YOU BUILT ${cp} OF 6` : victim === 'npc' ? `THE TURRET WAKES — PLAN BUILT ${cn} OF 6` : 'THE TURRET WAKES — A TIE: IT FIRES AT BOTH', '#d8f8ff');
          ctx.sfx('gear-turn');
        }
      } else if (phase === 'wake' && time - phaseAt >= 900) {
        phase = 'fire';
        phaseAt = time;
        shotsLeft = SHOTS;
        shotNo = 0;
        nextShot = time + 700;
        aimLockAt = nextShot - 450;
        ctx.sfx('beam-charge');
      } else if (phase === 'fire') {
        const tgtSide: 'player' | 'npc' = victim === 'both' ? (shotNo % 2 ? 'npc' : 'player') : victim;
        const tgt = fighterOf(tgtSide);
        const lx = plan.x, ly = plan.y - 66;
        // The lens tracks its victim until a beat before each shot, then holds.
        if (time < aimLockAt && alive(tgt)) {
          const want = Math.atan2(tgt.y - ly, tgt.x - lx);
          aimA += Math.atan2(Math.sin(want - aimA), Math.cos(want - aimA)) * 0.25;
        }
        if (time >= nextShot && shotsLeft > 0) {
          shotsLeft--;
          shotNo++;
          flashAt = time;
          if (alive(tgt)) {
            tk.spawnBullet({
              x: lx + Math.cos(aimA) * 20, y: ly + Math.sin(aimA) * 20, angle: aimA, speed: 430, damage: DMG, r: 7,
              color: 0xfff4c0, lifeMs: 2500, hits: tgtSide === 'player' ? [player] : [npc],
            });
          }
          ctx.sfx('light-beam');
          nextShot = time + (ctx.hard ? 560 : 640);
          aimLockAt = nextShot - 420;
        }
        if (shotsLeft <= 0 && time - flashAt > 500) {
          phase = 'down';
          phaseAt = time;
          // The turret is knocked flat: its parts scatter.
          for (const p of parts) {
            p.fromX = p.x; p.fromY = p.y;
            const a = rng() * Math.PI * 2;
            p.toX = clamp(p.x + Math.cos(a) * 120, 50, W - 50); p.toY = clamp(p.y + Math.sin(a) * 90, top + 40, H - 40);
            p.state = 'scrap'; p.at = time; p.by = null;
          }
          ctx.sfx('crystal-shatter');
        }
      } else if (phase === 'down') {
        for (const p of parts) {
          const k = clamp((time - p.at) / 400, 0, 1);
          p.x = lerp(p.fromX, p.toX, k); p.y = lerp(p.fromY, p.toY, k) - Math.sin(k * Math.PI) * 30;
        }
        if (time - phaseAt >= 2200) newPlan(time);
      }
    },

    npcSeek() {
      if (phase === 'fire' && (victim === 'npc' || victim === 'both')) {
        // Duck sideways to the lens's line.
        const a = Math.atan2(npc.y - plan.y, npc.x - plan.x) + Math.PI / 2;
        return { x: clamp(npc.x + Math.cos(a) * 140, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 140, top + 50, H - 40) };
      }
      if (phase !== 'build') return { x: clamp(player.x + (player.x < W / 2 ? 200 : -200), 60, W - 60), y: clamp(player.y, top + 50, H - 40) };
      // Escort whichever sliding part is nearest home — or go knock off one of the stranger's.
      let best: Part | null = null;
      let bs = Infinity;
      for (const p of parts) {
        if (p.state === 'slide') {
          const left = SLIDE_MS - (ctx.scene.time.now - p.at);
          const s = left + dist(npc.x, npc.y, p.x, p.y) * 6;
          if (s < bs) { bs = s; best = p; }
        } else if (p.state === 'home' && p.by === 'player') {
          const s = 2600 + dist(npc.x, npc.y, p.x, p.y) * 6;
          if (s < bs) { bs = s; best = p; }
        }
      }
      if (best) {
        const tx = best.state === 'slide' ? plan.x + best.off.x : best.x;
        const ty = best.state === 'slide' ? plan.y + best.off.y : best.y;
        return { x: clamp(lerp(best.x, tx, 0.6), 60, W - 60), y: clamp(lerp(best.y, ty, 0.6) + 30, top + 50, H - 40) };
      }
      return { x: plan.x, y: clamp(plan.y + 110, top + 50, H - 40) };
    },

    drawGround(g, time) {
      if (phase === 'down') return;
      // The blueprint sheet the plan is chalked on.
      g.fillStyle(BLUEPRINT_DARK, 0.5); g.fillRoundedRect(plan.x - 110, plan.y - 110, 220, 210, 10);
      g.fillStyle(BLUEPRINT, 0.55); g.fillRoundedRect(plan.x - 106, plan.y - 106, 212, 202, 8);
      g.lineStyle(1, CYAN, 0.18);
      for (let x = plan.x - 100; x < plan.x + 106; x += 14) g.lineBetween(x, plan.y - 104, x, plan.y + 94);
      for (let y = plan.y - 100; y < plan.y + 96; y += 14) g.lineBetween(plan.x - 104, y, plan.x + 104, y);
      // Chalk lines from each drop point to its outline, dashed, brightening while a part rides them.
      for (const p of parts) {
        const sx = plan.x + p.off.x, sy = plan.y + p.off.y;
        const len = dist(p.drop.x, p.drop.y, sx, sy);
        const riding = p.state === 'slide' || p.state === 'drop';
        const n = Math.floor(len / 16);
        for (let i = 0; i < n; i += 1) {
          if (i % 2) continue;
          const k0 = i / n, k1 = (i + 1) / n;
          const flow = riding ? 0.4 + 0.5 * Math.max(0, Math.sin(time / 120 - i * 0.7)) : 0.35;
          g.lineStyle(2, CYAN, flow);
          g.lineBetween(lerp(p.drop.x, sx, k0), lerp(p.drop.y, sy, k0), lerp(p.drop.x, sx, k1), lerp(p.drop.y, sy, k1));
        }
        // The cross at the drop point.
        g.lineStyle(2, CYAN_LIT, 0.6);
        g.lineBetween(p.drop.x - 8, p.drop.y - 8, p.drop.x + 8, p.drop.y + 8); g.lineBetween(p.drop.x + 8, p.drop.y - 8, p.drop.x - 8, p.drop.y + 8);
        // The ghost outline at its slot.
        if (p.state !== 'home') drawPart(g, p.kind, sx, sy, 0, 'ghost', time);
      }
      // Dimension lines and the title block, the way a draughtsman finishes a sheet.
      g.lineStyle(1, CYAN_LIT, 0.45);
      g.lineBetween(plan.x - 96, plan.y + 84, plan.x + 96, plan.y + 84);
      g.lineBetween(plan.x - 96, plan.y + 79, plan.x - 96, plan.y + 89); g.lineBetween(plan.x + 96, plan.y + 79, plan.x + 96, plan.y + 89);
      g.strokeRect(plan.x + 50, plan.y - 100, 50, 18);
      // Credit pips in the title block: who has built what.
      parts.forEach((p, i) => {
        const c = p.state === 'home' ? (p.by === 'player' ? SIDE_PLAYER : p.by === 'npc' ? SIDE_NPC : CYAN_LIT) : dim(CYAN, 0.4);
        g.fillStyle(c, p.state === 'home' ? 1 : 0.5); g.fillCircle(plan.x + 56 + i * 7.6, plan.y - 91, 2.8);
      });
    },

    drawAir(g, time) {
      for (const p of parts) {
        if (p.state === 'waiting') continue;
        if (p.state === 'drop') {
          // The hook lowering it on a chain from the top of the floor.
          const k = clamp((time - p.at) / DROP_MS, 0, 1);
          const y = lerp(top - 20, p.drop.y, ease(k));
          g.lineStyle(2, IRON_DARK, 1); g.lineBetween(p.drop.x, top - 40, p.drop.x, y - 18);
          for (let cy = top; cy < y - 18; cy += 9) { g.lineStyle(1, IRON_LIT, 0.8); g.strokeEllipse(p.drop.x, cy, 3, 6); }
          g.lineStyle(2.5, IRON, 1);
          g.beginPath(); g.arc(p.drop.x + 4, y - 14, 5, Math.PI * 0.2, Math.PI * 1.4, false); g.strokePath();
          g.fillStyle(0x000000, 0.15 + k * 0.2); g.fillEllipse(p.drop.x, p.drop.y + 12, 30 * k, 9 * k);
          drawPart(g, p.kind, p.drop.x, y, p.spin, null, time);
          continue;
        }
        const tint = p.state === 'home' ? p.by : null;
        if (p.state === 'scrap' || phase === 'down') { drawPart(g, p.kind, p.x, p.y, p.spin, 'scrap', time); continue; }
        drawPart(g, p.kind, p.x, p.y, p.state === 'home' ? 0 : p.spin + (time - p.at) / 500, tint, time);
        // A sliding part shows who is closer to it — a faint tether to the nearer fighter within reach.
        if (p.state === 'slide') {
          const dp = alive(player) ? dist(player.x, player.y, p.x, p.y) : Infinity;
          const dn = alive(npc) ? dist(npc.x, npc.y, p.x, p.y) : Infinity;
          const near = dp <= dn ? player : npc;
          if (Math.min(dp, dn) < CREDIT_R) {
            g.lineStyle(1.5, dp <= dn ? SIDE_PLAYER : SIDE_NPC, 0.4);
            g.lineBetween(p.x, p.y, near.x, near.y);
          }
        }
      }
      // The assembled turret: legs splay, the gear-box turns, the lens swings to aim.
      if (phase === 'wake' || phase === 'fire') {
        const lx = plan.x, ly = plan.y - 66;
        const k = phase === 'wake' ? clamp((time - phaseAt) / 900, 0, 1) : 1;
        gear(g, plan.x, plan.y + 6, 14, 12, BRASS, 1, time / 200);
        glow(g, lx, ly, 26 + k * 10, 0xfff4c0, 0.06 + k * 0.05, 3);
        g.lineStyle(9, BRASS_DARK, 1); g.lineBetween(lx, ly, lx + Math.cos(aimA) * 30, ly + Math.sin(aimA) * 30);
        g.lineStyle(6, BRASS, 1); g.lineBetween(lx, ly, lx + Math.cos(aimA) * 30, ly + Math.sin(aimA) * 30);
        lens(g, lx + Math.cos(aimA) * 30, ly + Math.sin(aimA) * 30, 9);
        if (phase === 'fire') {
          const tgtSide: 'player' | 'npc' = victim === 'both' ? (shotNo % 2 ? 'npc' : 'player') : victim;
          const locked = time >= aimLockAt;
          // The aim line: thin while tracking, bright and steady once it locks.
          g.lineStyle(locked ? 3 : 1.5, tgtSide === 'player' ? SIDE_PLAYER : SIDE_NPC, locked ? 0.75 : 0.35);
          g.lineBetween(lx + Math.cos(aimA) * 40, ly + Math.sin(aimA) * 40, lx + Math.cos(aimA) * 900, ly + Math.sin(aimA) * 900);
          if (time - flashAt < 160) { g.fillStyle(0xffffff, 0.8); g.fillCircle(lx + Math.cos(aimA) * 40, ly + Math.sin(aimA) * 40, 16); }
        }
      }
    },

    drawHud(g) {
      if (phase === 'down') return;
      const cp = count('player'), cn = count('npc');
      const x = W / 2 - 66, y = top + 8;
      g.fillStyle(BLUEPRINT_DARK, 0.75); g.fillRoundedRect(x - 6, y - 4, 144, 20, 6);
      for (let i = 0; i < 6; i++) {
        const c = i < cp ? SIDE_PLAYER : i >= 6 - cn ? SIDE_NPC : dim(CYAN, 0.5);
        g.fillStyle(c, 1); g.fillRoundedRect(x + i * 22, y, 18, 12, 3);
      }
      g.lineStyle(1, CYAN_LIT, 0.6); g.strokeRoundedRect(x - 6, y - 4, 144, 20, 6);
      g.fillStyle(lit(CYAN, 0.4), 1); g.fillTriangle(x + 63, y + 16, x + 69, y + 16, x + 66, y + 20);
    },

    destroy() { for (const p of parts) p.target?.remove(); },
  };
}

/** One turret part. `tint` paints who built it; 'ghost' is the chalk outline; 'scrap' is knocked flat. */
function drawPart(g: G, kind: PartKind, x: number, y: number, rot: number, tint: 'player' | 'npc' | 'ghost' | 'scrap' | null, time: number): void {
  if (tint === 'ghost') {
    g.lineStyle(1.5, CYAN_LIT, 0.55 + Math.sin(time / 300) * 0.15);
    switch (kind) {
      case 'leg': g.strokeRect(x - 4, y - 18, 8, 30); break;
      case 'gear': g.strokeCircle(x, y, 15); g.strokeCircle(x, y, 5); break;
      case 'barrel': g.strokeRect(x - 9, y - 16, 18, 32); break;
      case 'lens': g.strokeCircle(x, y, 13); break;
    }
    return;
  }
  const alpha = tint === 'scrap' ? 0.75 : 1;
  const band = tint === 'player' ? SIDE_PLAYER : tint === 'npc' ? SIDE_NPC : null;
  g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y + 16, 26, 7);
  switch (kind) {
    case 'leg': {
      const c = Math.cos(rot) * 4;
      g.lineStyle(7, BRASS_DARK, alpha); g.lineBetween(x - c, y - 18, x + c, y + 12);
      g.lineStyle(4, BRASS, alpha); g.lineBetween(x - c, y - 18, x + c, y + 12);
      g.fillStyle(IRON, alpha); g.fillCircle(x + c, y + 13, 4);
      if (band) { g.fillStyle(band, 1); g.fillRect(x - 5, y - 5, 10, 4); }
      break;
    }
    case 'gear':
      gear(g, x, y, 14, 12, BRASS, alpha, rot);
      if (band) { g.lineStyle(3, band, 1); g.strokeCircle(x, y, 6); }
      break;
    case 'barrel': {
      g.fillStyle(IRON_DARK, alpha); g.fillRoundedRect(x - 10, y - 17, 20, 34, 4);
      g.fillStyle(IRON, alpha); g.fillRoundedRect(x - 8, y - 16, 16, 32, 3);
      g.fillStyle(IRON_LIT, alpha); g.fillRect(x - 6, y - 15, 3, 30);
      g.fillStyle(BRASS, alpha); g.fillRect(x - 10, y - 17, 20, 4); g.fillRect(x - 10, y + 13, 20, 4);
      if (band) { g.fillStyle(band, 1); g.fillRect(x - 10, y - 2, 20, 4); }
      break;
    }
    case 'lens':
      lens(g, x, y, 11, alpha);
      if (band) { g.lineStyle(2.5, band, 1); g.strokeCircle(x, y, 15); }
      break;
  }
}

export const BLUEPRINT_GIMMICK: GimmickDef = {
  id: 'workshop-blueprint',
  rules: 'Turret parts slide along chalk lines into the plan — the nearer fighter builds each one. Strike a part to knock it off. The finished turret fires at whoever built least.',
  make,
};
