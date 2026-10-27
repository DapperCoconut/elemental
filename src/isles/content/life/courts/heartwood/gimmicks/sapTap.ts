import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { HW, alive, amberBlock, clamp, dist, makeClock, sapDrop, spile } from '../palette';

/**
 * Sap Tap — Tapper Resinia.
 *
 * Four taps are driven into bark posts round the terrace, each with a sap bladder swelling under
 * its spout. A full tap is a loaded thing: shoulder into it and it splashes — the sap flies out
 * of the *far* side of the tap, away from whoever struck it, and lands in a gold puddle a little
 * way off. Anyone standing in a puddle starts to set: their amber meter fills while they stay in
 * it and drains when they step out. Fill it and they are sealed in amber — held fast, and the
 * next hit on them lands double.
 *
 * Resinia taps for a living. She walks round to the far side of a full tap so its splash is
 * thrown at you. The exploit is the same geometry the other way: put a full tap between you
 * and her, shoulder it, and she is the one standing in the gold.
 */

interface Tap { x: number; y: number; fill: number; splashedAt: number }
interface Splash { fromX: number; fromY: number; x: number; y: number; bornAt: number; landAt: number; dieAt: number; landed: boolean }
interface Amber { k: number; sealedUntil: number; primed: boolean; primedUntil: number }

export const sapTapGimmick: GimmickDef = {
  id: 'heartwood-sap-tap',
  rules: 'Shoulder a full tap: sap splashes out the far side. Stand in it and you set — sealed in amber, the next hit lands double.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const tick = makeClock();
    const STRIKE_R = 44;
    const THROW = 150;
    const PUDDLE_R = hard ? 92 : 84;
    const FILL_S = hard ? 5.5 : 7;
    const FLIGHT_MS = 520;
    const PUDDLE_MS = hard ? 5200 : 4400;
    const SET_RATE = hard ? 0.95 : 0.8;
    const SEAL_MS = 1500;
    const PRIME_MS = 3200;

    const mid = (top + H) / 2;
    const spots: Pt[] = [
      { x: W * 0.24, y: top + 110 }, { x: W * 0.76, y: top + 110 },
      { x: W * 0.24, y: H - 100 }, { x: W * 0.76, y: H - 100 },
    ];
    if (hard) spots.push({ x: W / 2, y: mid });
    const taps: Tap[] = spots.map((s, i) => ({ x: s.x, y: s.y, fill: 0.4 + i * 0.12, splashedAt: -99999 }));
    let splashes: Splash[] = [];
    const sets = new Map<Fighter, Amber>([
      [ctx.player, { k: 0, sealedUntil: 0, primed: false, primedUntil: 0 }],
      [ctx.npc, { k: 0, sealedUntil: 0, primed: false, primedUntil: 0 }],
    ]);
    let now = 0;

    const inPuddle = (f: Fighter): boolean => splashes.some((s) => s.landed && now < s.dieAt && dist(f.x, f.y, s.x, s.y) < PUDDLE_R);

    const strike = (t: Tap, f: Fighter): void => {
      const a = Math.atan2(t.y - f.y, t.x - f.x);
      const x = clamp(t.x + Math.cos(a) * THROW, 70, W - 70);
      const y = clamp(t.y + Math.sin(a) * THROW, top + 60, H - 50);
      splashes.push({ fromX: t.x, fromY: t.y - 26, x, y, bornAt: now, landAt: now + FLIGHT_MS, dieAt: now + FLIGHT_MS + PUDDLE_MS, landed: false });
      t.fill = 0; t.splashedAt = now;
      ctx.sfx('slime-splat');
      ctx.float(t.x, t.y - 50, 'SPLASH!', '#ffd76e');
    };

    const takenMult = (f: Fighter): number => {
      const s = sets.get(f);
      return s && s.primed && now < s.primedUntil ? 2 : 1;
    };
    const unprime = (f: Fighter): void => {
      const s = sets.get(f);
      if (!s || !s.primed) return;
      s.primed = false;
      ctx.float(f.x, f.y - 54, 'AMBER SHATTERS ×2', '#fff2c0');
      ctx.sfx('crystal-shatter');
      ctx.flash(f.x, f.y, HW.amberLit);
    };

    return {
      update(time: number) {
        const dt = tick(time);
        now = time;
        for (const t of taps) {
          t.fill = Math.min(1, t.fill + dt / FILL_S);
          if (t.fill < 1) continue;
          for (const f of [ctx.player, ctx.npc]) {
            if (alive(f) && dist(f.x, f.y, t.x, t.y) < STRIKE_R) { strike(t, f); break; }
          }
        }
        for (const s of splashes) {
          if (!s.landed && time >= s.landAt) { s.landed = true; ctx.sfx('splash'); }
        }
        splashes = splashes.filter((s) => time < s.dieAt);
        for (const [f, s] of sets) {
          if (!alive(f)) continue;
          if (s.primed && time >= s.primedUntil) s.primed = false;
          if (time < s.sealedUntil) continue;
          if (inPuddle(f)) s.k = Math.min(1, s.k + SET_RATE * dt);
          else s.k = Math.max(0, s.k - 1.4 * dt);
          if (s.k >= 1) {
            s.k = 0;
            s.sealedUntil = time + SEAL_MS;
            s.primed = true; s.primedUntil = time + SEAL_MS + PRIME_MS;
            ctx.root(f, SEAL_MS);
            ctx.sfx('status-freeze');
            ctx.float(f.x, f.y - 54, 'SET IN AMBER', '#f0a024');
          }
        }
      },

      playerTakenMult: () => takenMult(ctx.player),
      npcTakenMult: () => takenMult(ctx.npc),
      onPlayerHurt: () => unprime(ctx.player),
      onNpcHurt: () => unprime(ctx.npc),

      npcSeek(): Pt | null {
        const n = ctx.npc, p = ctx.player;
        // Get out of the gold first.
        const s = splashes.find((q) => q.landed && dist(n.x, n.y, q.x, q.y) < PUDDLE_R + 10);
        if (s) {
          const a = Math.atan2(n.y - s.y, n.x - s.x);
          return { x: clamp(s.x + Math.cos(a) * (PUDDLE_R + 50), 60, W - 60), y: clamp(s.y + Math.sin(a) * (PUDDLE_R + 50), top + 50, H - 50) };
        }
        // A full tap with the player beyond it: walk to its near side and shoulder it.
        let best: Tap | null = null, bestD = Infinity;
        for (const t of taps) {
          if (t.fill < 0.92) continue;
          const dp = dist(t.x, t.y, p.x, p.y);
          if (dp > THROW + PUDDLE_R) continue;
          const d = dist(n.x, n.y, t.x, t.y);
          if (d < bestD) { bestD = d; best = t; }
        }
        if (!best) return null;
        const a = Math.atan2(p.y - best.y, p.x - best.x);
        const back = { x: best.x - Math.cos(a) * 30, y: best.y - Math.sin(a) * 30 };
        // Only commit if the walk there does not take it through the player.
        return dist(n.x, n.y, back.x, back.y) < 420 ? back : null;
      },

      drawGround(g, time) {
        const t = time / 1000;
        for (const s of splashes) {
          if (s.landed) {
            const life = (s.dieAt - time) / PUDDLE_MS;
            const fade = Math.min(1, life * 3);
            g.fillStyle(HW.amberDeep, 0.35 * fade); g.fillEllipse(s.x, s.y, PUDDLE_R * 2.15, PUDDLE_R * 1.35);
            g.fillStyle(HW.sap, 0.45 * fade); g.fillEllipse(s.x, s.y, PUDDLE_R * 1.9, PUDDLE_R * 1.15);
            g.fillStyle(HW.amberLit, 0.3 * fade); g.fillEllipse(s.x - PUDDLE_R * 0.3, s.y - PUDDLE_R * 0.2, PUDDLE_R * 0.6, PUDDLE_R * 0.22);
            // Thick drips at the edge, and the skin wrinkling as it sets.
            for (let i = 0; i < 9; i++) {
              const a = (i / 9) * Math.PI * 2 + s.x;
              g.fillStyle(HW.sap, 0.5 * fade); g.fillCircle(s.x + Math.cos(a) * PUDDLE_R * 0.98, s.y + Math.sin(a) * PUDDLE_R * 0.6, 7);
            }
            g.lineStyle(1, HW.amberDeep, 0.4 * fade);
            for (let k = 1; k < 4; k++) g.strokeEllipse(s.x, s.y, PUDDLE_R * 0.5 * k + Math.sin(t * 2 + k) * 3, PUDDLE_R * 0.3 * k);
          } else {
            // The landing spot, shown while the sap is in the air.
            const k = (time - s.bornAt) / FLIGHT_MS;
            g.lineStyle(2, HW.amber, 0.4 + k * 0.5); g.strokeEllipse(s.x, s.y, PUDDLE_R * 2 * k, PUDDLE_R * 1.2 * k);
          }
        }
        // Tap posts: birch stumps, the spile and bucket, the bladder swelling under the spout.
        for (const tp of taps) {
          g.fillStyle(0x000000, 0.28); g.fillEllipse(tp.x, tp.y + 6, 56, 16);
          g.fillStyle(HW.barkShade, 1); g.fillRoundedRect(tp.x - 18, tp.y - 44, 36, 48, 8);
          g.fillStyle(HW.bark, 1); g.fillRoundedRect(tp.x - 15, tp.y - 44, 26, 46, 7);
          g.fillStyle(HW.mark, 0.8); g.fillEllipse(tp.x - 3, tp.y - 28, 16, 3); g.fillEllipse(tp.x + 2, tp.y - 12, 12, 2.5);
          g.fillStyle(HW.sapwood, 1); g.fillEllipse(tp.x - 2, tp.y - 44, 32, 10);
          spile(g, tp.x - 6, tp.y + 2, 11, tp.fill);
          // A full tap: the ring round it pulses — "shoulder me".
          if (tp.fill >= 1) {
            const pulse = 0.5 + 0.5 * Math.sin(time / 120);
            g.lineStyle(2.5, HW.amberLit, 0.5 + pulse * 0.4); g.strokeCircle(tp.x, tp.y - 10, STRIKE_R - 4 + pulse * 4);
          } else {
            g.lineStyle(3, 0x000000, 0.3); g.beginPath(); g.arc(tp.x, tp.y - 10, STRIKE_R - 6, -Math.PI / 2, Math.PI * 1.5); g.strokePath();
            g.lineStyle(3, HW.amber, 0.7); g.beginPath(); g.arc(tp.x, tp.y - 10, STRIKE_R - 6, -Math.PI / 2, -Math.PI / 2 + tp.fill * Math.PI * 2); g.strokePath();
          }
        }
      },

      drawAir(g, time) {
        const t = time / 1000;
        for (const tp of taps) {
          // The bladder: a gold drop hanging from the spout, fattening as it fills.
          const r = 2 + tp.fill * 7;
          sapDrop(g, tp.x + 2, tp.y - 26 + tp.fill * 4, r, 0.95);
          const since = time - tp.splashedAt;
          if (since >= 0 && since < 300) {
            const k = since / 300;
            g.lineStyle(3 * (1 - k), HW.amberLit, 1 - k); g.strokeCircle(tp.x, tp.y - 20, 12 + k * 30);
          }
        }
        // Sap in flight: a rope of gold arcing from the tap to where it will land.
        for (const s of splashes) {
          if (s.landed) continue;
          const k = clamp((time - s.bornAt) / FLIGHT_MS, 0, 1);
          for (let i = 0; i < 6; i++) {
            const kk = clamp(k - i * 0.05, 0, 1);
            const x = s.fromX + (s.x - s.fromX) * kk, y = s.fromY + (s.y - s.fromY) * kk - Math.sin(kk * Math.PI) * 70;
            sapDrop(g, x, y, 6 - i * 0.7, 1 - i * 0.12);
          }
        }
        // Whoever is sealed: a block of amber round them. Primed: cracks glinting.
        for (const [f, s] of sets) {
          if (!alive(f)) continue;
          if (time < s.sealedUntil) amberBlock(g, f.x, f.y, 34, 1, t);
          else if (s.k > 0.05) amberBlock(g, f.x, f.y, 30, s.k * 0.6, t);
          if (s.primed && time >= s.sealedUntil) {
            g.lineStyle(1.5, HW.amberHot, 0.7 + 0.3 * Math.sin(time / 80));
            g.lineBetween(f.x - 14, f.y - 20, f.x - 2, f.y - 6); g.lineBetween(f.x - 2, f.y - 6, f.x + 12, f.y - 18);
            g.lineBetween(f.x - 2, f.y - 6, f.x + 2, f.y + 10);
          }
        }
      },

      drawHud(g) {
        // Two amber meters: how far each of you has set.
        const meter = (x: number, f: Fighter): void => {
          const s = sets.get(f);
          if (!s) return;
          const y = top + 10;
          g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 42, y - 6, 84, 12, 5);
          const v = now < s.sealedUntil ? 1 : s.k;
          g.fillStyle(HW.amber, 0.95); g.fillRoundedRect(x - 40, y - 4, 80 * v, 8, 4);
          if (s.primed) { g.lineStyle(2, HW.amberHot, 1); g.strokeRoundedRect(x - 44, y - 8, 88, 16, 6); }
        };
        meter(W / 2 - 70, ctx.player);
        meter(W / 2 + 70, ctx.npc);
      },

      destroy() { splashes = []; sets.clear(); },
    };
  },
};
