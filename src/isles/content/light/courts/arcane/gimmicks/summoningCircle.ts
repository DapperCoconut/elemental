import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { candle, rune } from '../art';
import { CHALK, GOLD, SCORCH, SIDE_NPC, SIDE_PLAYER } from '../palette';
import { alive, clamp, dist, polygon, segDist, stepDt } from '../util';

/**
 * Summoning Circle — Conjurer Evoke.
 *
 * A five-pointed star is chalked across the flags inside a ring, with a tall candle at each point.
 * Stand on a point and its candle lights in your colour (a foe's candle takes longer to relight
 * than a cold one). Two of your candles joined by a line of the star set that line burning —
 * your foe is scorched crossing it. Hold all five and the circle answers: an imp is summoned on
 * your side for a while, flitting round your foe and spitting fire at them — and then every
 * candle gutters out and the race starts again. An imp can be struck down; it is small and mean.
 */

type Side = 'player' | 'npc';

const R = 185;
const POINT_R = 38;
const LIGHT_COLD_S = 0.8;
const LIGHT_HOT_S = 1.35;
const LINE_DMG = 4;
const LINE_TICK = 500;
const IMP_MS = 11000;
const IMP_HP = 34;

interface Point { x: number; y: number; owner: Side | null; prog: Record<Side, number>; litAt: number }
interface Imp { side: Side; x: number; y: number; bornAt: number; dieAt: number; hp: number; nextShot: number; orbit: number; target: StrikeTarget | null; hurtAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const cx = W / 2, cy = top + (H - top) / 2 + 8;
  const pts: Point[] = polygon(cx, cy, R, 5).map((p) => ({ ...p, owner: null, prog: { player: 0, npc: 0 }, litAt: -9999 }));
  /** The star's lines: point i to i+2. */
  const lines = pts.map((_, i) => [i, (i + 2) % 5] as [number, number]);
  const fighter = (s: Side): Fighter => (s === 'player' ? player : npc);
  const enemyOf = (s: Side): Fighter => (s === 'player' ? npc : player);
  const lineTickAt = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let imps: Imp[] = [];
  let gutterAt = 0;
  let gutterSide: Side | null = null;
  const sideCss = (s: Side) => (s === 'player' ? '#9ae8ff' : '#ffb09a');
  const sideColor = (s: Side | null) => (s === 'player' ? SIDE_PLAYER : s === 'npc' ? SIDE_NPC : CHALK);

  function summon(s: Side, time: number): void {
    const me = fighter(s);
    const imp: Imp = { side: s, x: me.x, y: me.y - 40, bornAt: time, dieAt: time + IMP_MS + (s === 'npc' && ctx.hard ? 2500 : 0), hp: IMP_HP, nextShot: time + 900, orbit: ctx.rng() * 6, target: null, hurtAt: -9999 };
    imp.target = ctx.target({
      x: imp.x, y: imp.y, r: 18,
      onStruck: (by, amount) => {
        if (by === s) return;
        imp.hp -= amount;
        imp.hurtAt = ctx.scene.time.now;
        if (imp.hp <= 0) { imp.dieAt = 0; ctx.float(imp.x, imp.y - 20, 'BANISHED', '#f0e6ff'); ctx.sfx('portal'); }
      },
    });
    imps = imps.filter((i) => i.side !== s || (i.target?.remove(), false));
    imps.push(imp);
    ctx.banner(s === 'player' ? 'THE CIRCLE ANSWERS YOU' : 'THE CIRCLE ANSWERS EVOKE', sideCss(s));
    ctx.sfx('portal');
    ctx.flash(cx, cy, 0xffe0a0);
    gutterAt = time + 900;
    gutterSide = s;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      // The candles gutter after a summoning.
      if (gutterSide && time >= gutterAt) {
        for (const p of pts) { p.owner = null; p.prog.player = 0; p.prog.npc = 0; }
        gutterSide = null;
        ctx.sfx('hush');
      }
      if (!gutterSide) {
        for (const p of pts) {
          for (const s of ['player', 'npc'] as Side[]) {
            const f = fighter(s);
            const on = alive(f) && dist(f.x, f.y, p.x, p.y) < POINT_R;
            if (on && p.owner !== s) {
              p.prog[s] += dt / (p.owner ? LIGHT_HOT_S : LIGHT_COLD_S) * (s === 'npc' && ctx.hard ? 1.15 : 1);
              if (p.prog[s] >= 1) {
                p.owner = s; p.prog.player = 0; p.prog.npc = 0; p.litAt = time;
                ctx.sfx('flame-burst');
                ctx.float(p.x, p.y - 44, 'LIT', sideCss(s));
              }
            } else p.prog[s] = Math.max(0, p.prog[s] - dt * 0.8);
          }
        }
        for (const s of ['player', 'npc'] as Side[]) if (pts.every((p) => p.owner === s)) summon(s, time);
      }
      // Burning lines.
      for (const [a, b] of lines) {
        const pa = pts[a], pb = pts[b];
        if (!pa.owner || pa.owner !== pb.owner) continue;
        const victim = enemyOf(pa.owner);
        if (!alive(victim) || time < (lineTickAt.get(victim) ?? 0)) continue;
        if (segDist(victim.x, victim.y, pa.x, pa.y, pb.x, pb.y) < 16) {
          lineTickAt.set(victim, time + LINE_TICK);
          ctx.hit(victim, LINE_DMG, victim.x, victim.y);
          ctx.sfx('sizzle');
        }
      }
      // Imps.
      for (const imp of imps) {
        const foe = enemyOf(imp.side);
        if (!alive(foe)) continue;
        imp.orbit += dt * 1.4;
        const tx = foe.x + Math.cos(imp.orbit) * 130, ty = clamp(foe.y - 30 + Math.sin(imp.orbit) * 80, top + 40, H - 50);
        const k = Math.min(1, dt * 2.5);
        imp.x += (tx - imp.x) * k; imp.y += (ty - imp.y) * k;
        imp.target?.moveTo(imp.x, imp.y);
        if (time >= imp.nextShot) {
          imp.nextShot = time + (imp.side === 'npc' && ctx.hard ? 1200 : 1450);
          const a = Math.atan2(foe.y - imp.y, foe.x - imp.x);
          tk.spawnBullet({ x: imp.x, y: imp.y, angle: a, speed: 270, damage: 7, r: 6, lifeMs: 2600, color: imp.side === 'player' ? 0x6ad8ff : 0xff7a3a, hits: [foe] });
          ctx.sfx('fireball');
        }
      }
      imps = imps.filter((i) => {
        if (time < i.dieAt) return true;
        i.target?.remove();
        if (i.dieAt > 0) ctx.float(i.x, i.y - 20, 'the imp goes home', '#e0d0ff');
        return false;
      });
    },

    npcSeek() {
      if (gutterSide) return null;
      // Evoke goes for the nearest point that isn't his, preferring ones you're not standing on.
      let best: Point | null = null, bs = Infinity;
      for (const p of pts) {
        if (p.owner === 'npc') continue;
        const s = dist(p.x, p.y, npc.x, npc.y) + (dist(p.x, p.y, player.x, player.y) < POINT_R * 2 ? 260 : 0) - (p.owner === null ? 40 : 0);
        if (s < bs) { bs = s; best = p; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },

    drawGround(g, time) {
      // The ring and the star, chalked; scorch round each point.
      g.lineStyle(2, CHALK, 0.55); g.strokeCircle(cx, cy, R + 26);
      g.lineStyle(1.2, CHALK, 0.35); g.strokeCircle(cx, cy, R + 14);
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2 + 0.1; rune(g, cx + Math.cos(a) * (R + 20), cy + Math.sin(a) * (R + 20), 4, i, CHALK, 0.45, 1.1); }
      for (const [a, b] of lines) {
        const pa = pts[a], pb = pts[b];
        const burning = pa.owner && pa.owner === pb.owner;
        if (burning) {
          const c = sideColor(pa.owner);
          g.lineStyle(10, dim(c, 0.3), 0.35); g.lineBetween(pa.x, pa.y, pb.x, pb.y);
          g.lineStyle(4, c, 0.75 + Math.sin(time / 90) * 0.15); g.lineBetween(pa.x, pa.y, pb.x, pb.y);
          // Tongues of flame along it.
          for (let k = 0; k < 9; k++) {
            const t = (k + 0.5) / 9;
            const fx = pa.x + (pb.x - pa.x) * t, fy = pa.y + (pb.y - pa.y) * t;
            const h = 8 + Math.sin(time / 70 + k * 1.7) * 4;
            g.fillStyle(lit(c, 0.3), 0.7); g.fillTriangle(fx - 4, fy, fx + 4, fy, fx + Math.sin(time / 50 + k) * 2, fy - h);
          }
        } else {
          g.lineStyle(2, CHALK, 0.6); g.lineBetween(pa.x, pa.y, pb.x, pb.y);
          if (pa.owner || pb.owner) { g.lineStyle(1, sideColor(pa.owner ?? pb.owner), 0.3); g.lineBetween(pa.x, pa.y, pb.x, pb.y); }
        }
      }
      for (const p of pts) {
        g.fillStyle(SCORCH, 0.3); g.fillCircle(p.x, p.y, POINT_R);
        g.lineStyle(1.5, sideColor(p.owner), p.owner ? 0.8 : 0.4); g.strokeCircle(p.x, p.y, POINT_R);
        // Lighting progress, per side.
        for (const s of ['player', 'npc'] as Side[]) {
          if (p.prog[s] <= 0) continue;
          g.lineStyle(4, sideColor(s), 0.9); g.beginPath(); g.arc(p.x, p.y, POINT_R + 5, -Math.PI / 2, -Math.PI / 2 + p.prog[s] * Math.PI * 2, false); g.strokePath();
        }
      }
      // The summoning flash.
      if (gutterSide) {
        const k = clamp(1 - (gutterAt - time) / 900, 0, 1);
        g.fillStyle(sideColor(gutterSide), 0.25 * (1 - k)); g.fillCircle(cx, cy, R * (0.4 + k));
      }
    },

    drawAir(g, time) {
      for (const p of pts) {
        const flame = p.owner ? (p.owner === 'player' ? 0x7ae0ff : 0xff8a3a) : 0;
        candle(g, p.x, p.y + 6, 1.1, flame, time);
        if (time - p.litAt < 400) { const k = (time - p.litAt) / 400; g.lineStyle(3 * (1 - k), GOLD, 1 - k); g.strokeCircle(p.x, p.y - 30, 8 + k * 30); }
      }
      for (const imp of imps) drawImp(g, imp, time);
    },

    drawHud(g) {
      for (const [s, x0, d] of [['player', 24, 1], ['npc', W - 24, -1]] as [Side, number, number][]) {
        const n = pts.filter((p) => p.owner === s).length;
        for (let i = 0; i < 5; i++) {
          const x = x0 + d * i * 18, y = top + 14;
          g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 7);
          if (i < n) { g.fillStyle(sideColor(s), 1); g.fillTriangle(x - 3, y + 3, x + 3, y + 3, x, y - 6); }
          else { g.lineStyle(1, 0x8a8a9a, 0.8); g.strokeCircle(x, y, 5); }
        }
      }
    },

    destroy() { for (const i of imps) i.target?.remove(); imps = []; },
  };

  function drawImp(g: G, imp: Imp, time: number): void {
    const c = imp.side === 'player' ? 0x3a8ad8 : 0xc83a2a;
    const fl = imp.side === 'player' ? 0x9ae8ff : 0xffb040;
    const x = imp.x, y = imp.y + Math.sin(time / 120) * 3;
    const hurt = time - imp.hurtAt < 120;
    const fade = clamp((imp.dieAt - time) / 600, 0, 1) * clamp((time - imp.bornAt) / 300, 0, 1);
    g.fillStyle(0x000000, 0.18 * fade); g.fillEllipse(x, imp.y + 42, 22, 6);
    glow(g, x, y, 22, fl, 0.06 * fade, 3);
    // Bat wings beating.
    const flap = Math.sin(time / 45) * 0.5 + 0.5;
    for (const k of [-1, 1]) {
      g.fillStyle(dim(c, 0.35), fade);
      g.fillTriangle(x + k * 4, y - 4, x + k * (20 + flap * 6), y - 14 - flap * 8, x + k * 16, y + 4);
      g.fillTriangle(x + k * 16, y + 4, x + k * (20 + flap * 6), y - 14 - flap * 8, x + k * 24, y + 2);
    }
    g.fillStyle(hurt ? 0xffffff : c, fade); g.fillEllipse(x, y, 16, 18);
    g.fillCircle(x, y - 11, 7);
    g.fillStyle(lit(c, 0.3), fade); g.fillTriangle(x - 6, y - 14, x - 3, y - 15, x - 7, y - 24); g.fillTriangle(x + 6, y - 14, x + 3, y - 15, x + 7, y - 24);
    g.fillStyle(fl, fade); g.fillCircle(x - 2.6, y - 11, 1.8); g.fillCircle(x + 2.6, y - 11, 1.8);
    g.lineStyle(1, 0x1a0a0a, fade); g.beginPath(); g.arc(x, y - 9, 3, 0.2, Math.PI - 0.2, false); g.strokePath();
    // The tail, with a spade.
    const tx = x - Math.sin(time / 160) * 10, ty = y + 18;
    g.lineStyle(2, c, fade); g.lineBetween(x, y + 8, tx, ty);
    g.fillStyle(c, fade); g.fillTriangle(tx - 3, ty, tx + 3, ty, tx, ty + 5);
    // Fire in its hands.
    g.fillStyle(fl, 0.9 * fade); g.fillCircle(x + 9, y + 2, 3 + Math.sin(time / 60) * 1);
    // Its life left, as a thin arc.
    g.lineStyle(1.5, fl, 0.6 * fade); g.beginPath(); g.arc(x, y, 20, -Math.PI / 2, -Math.PI / 2 + clamp(imp.hp / IMP_HP, 0, 1) * Math.PI * 2, false); g.strokePath();
  }
}

export const SUMMONING_CIRCLE: GimmickDef = {
  id: 'arcane-summoning',
  rules: 'Stand on a point of the star to light its candle. Two of your candles set their line burning; all five summon an imp on your side.',
  make,
};
