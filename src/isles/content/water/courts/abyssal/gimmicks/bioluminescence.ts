import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { ABY, abyssDark, alive, clamp, dist, drawCoral, makeClock, segDist } from '../palette';

/**
 * Bioluminescence — Glowkeeper Siph.
 *
 * In the deep, being hurt makes you shine. Every hit you take lights the photophores on your
 * skin a little brighter, and the glow only fades slowly. Deep eels live in burrows round the
 * arena's edge, and they hunt by light: every few seconds a burrow's eyes open, it sights the
 * *brightest* fighter, a line of cold light marks its strike — and then it lunges straight
 * down that line and through anyone standing on it.
 *
 * Two pockets of black silt — ink sumps — smother a glow fast if you stand in them. Siph keeps
 * herself dim and makes you bright. The play is the reverse: light her up with hits until she
 * is the brightest thing in the room, then go dark in a sump and let the eels choose.
 */

interface Eel { bx: number; by: number; tx: number; ty: number; aimAt: number; lungeAt: number; doneAt: number; hit: Set<Fighter>; whooshed: boolean }

export const bioluminescenceGimmick: GimmickDef = {
  id: 'abyssal-glow',
  rules: 'Every hit you take makes you glow. Eels lunge from the walls at the brightest fighter. Black silt sumps douse a glow.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, rng, hard } = ctx;
    const tick = makeClock();
    const PERIOD = hard ? 3900 : 5000;
    const AIM_MS = hard ? 1000 : 1150;
    const LUNGE_SPEED = 1100;
    const EEL_R = 30;
    const EEL_DMG = hard ? 17 : 15;
    const GLOW_PER_DMG = 2.4;
    const FADE = 7;
    const SUMP_FADE = 42;

    const burrows: Pt[] = [
      { x: 40, y: top + 90 }, { x: 40, y: H - 110 }, { x: W - 40, y: top + 120 }, { x: W - 40, y: H - 90 },
      { x: W * 0.33, y: H - 24 }, { x: W * 0.68, y: top + 18 },
    ];
    const sumps: { x: number; y: number; r: number }[] = [
      { x: W * 0.27, y: top + (H - top) * 0.32, r: 54 },
      { x: W * 0.72, y: top + (H - top) * 0.7, r: 54 },
    ];
    const glow = new Map<Fighter, number>([[ctx.player, 0], [ctx.npc, 18]]);
    let eels: Eel[] = [];
    let nextAt = -1;
    let now = 0;
    const coralSeed = Math.floor(rng() * 1000);

    const inSump = (f: Fighter): boolean => sumps.some((s) => dist(f.x, f.y, s.x, s.y) < s.r);
    const brightest = (): Fighter => ((glow.get(ctx.npc) ?? 0) > (glow.get(ctx.player) ?? 0) ? ctx.npc : ctx.player);

    const launch = (): void => {
      const f = brightest();
      // The burrow with the clearest line: far enough to see it coming, not across the room.
      let best = burrows[0], bestErr = Infinity;
      for (const b of burrows) {
        const d = dist(b.x, b.y, f.x, f.y);
        const err = Math.abs(d - 360) + rng() * 60;
        if (err < bestErr) { bestErr = err; best = b; }
      }
      const a = Math.atan2(f.y - best.y, f.x - best.x);
      eels.push({
        bx: best.x, by: best.y,
        // Straight through the target and on out of the room — never bent by clamping.
        tx: best.x + Math.cos(a) * 1300, ty: best.y + Math.sin(a) * 1300,
        aimAt: now, lungeAt: now + AIM_MS, doneAt: now + AIM_MS + 900, hit: new Set(), whooshed: false,
      });
      ctx.sfx('electric-charge');
      ctx.float(f.x, f.y - 50, f === ctx.player ? 'YOU ARE THE BRIGHTEST' : 'SIPH IS THE BRIGHTEST', '#9ff8ec');
    };

    const headOf = (e: Eel): Pt => {
      const k = clamp(((now - e.lungeAt) / 1000) * LUNGE_SPEED / Math.hypot(e.tx - e.bx, e.ty - e.by), 0, 1);
      return { x: e.bx + (e.tx - e.bx) * k, y: e.by + (e.ty - e.by) * k };
    };

    return {
      update(time: number) {
        const dt = tick(time);
        now = time;
        if (nextAt < 0) nextAt = time + PERIOD * 0.7;
        for (const [f, v] of glow) {
          const fade = inSump(f) ? SUMP_FADE : FADE;
          glow.set(f, clamp(v - fade * dt + (f === ctx.npc ? 1.2 * dt : 0), 0, 100));
        }
        if (time >= nextAt) {
          nextAt = time + PERIOD;
          launch();
          if (hard && (glow.get(ctx.player) ?? 0) > 60 && (glow.get(ctx.npc) ?? 0) > 60) launch();
        }
        for (const e of eels) {
          if (time < e.lungeAt) continue;
          const h = headOf(e);
          for (const f of [ctx.player, ctx.npc]) {
            if (!alive(f) || e.hit.has(f)) continue;
            if (segDist(f.x, f.y, e.bx, e.by, h.x, h.y) < EEL_R) {
              e.hit.add(f);
              ctx.hit(f, EEL_DMG, f.x, f.y);
              ctx.sfx('zap');
              const a = Math.atan2(e.ty - e.by, e.tx - e.bx);
              ctx.nudge(f, Math.cos(a + Math.PI / 2) * 26, Math.sin(a + Math.PI / 2) * 26);
            }
          }
          if (!e.whooshed) { e.whooshed = true; ctx.sfx('whoosh'); }
        }
        eels = eels.filter((e) => time < e.doneAt);
      },

      onPlayerHurt(amount) { glow.set(ctx.player, clamp((glow.get(ctx.player) ?? 0) + amount * GLOW_PER_DMG, 0, 100)); },
      onNpcHurt(amount) { glow.set(ctx.npc, clamp((glow.get(ctx.npc) ?? 0) + amount * GLOW_PER_DMG, 0, 100)); },

      npcSeek(): Pt | null {
        const n = ctx.npc;
        // Dodge a strike aimed down a line she is standing on.
        for (const e of eels) {
          if (now >= e.lungeAt) continue;
          if (segDist(n.x, n.y, e.bx, e.by, e.tx, e.ty) < EEL_R + 30) {
            const a = Math.atan2(e.ty - e.by, e.tx - e.bx) + Math.PI / 2;
            const s = (n.x - e.bx) * Math.cos(a) + (n.y - e.by) * Math.sin(a) >= 0 ? 1 : -1;
            return { x: clamp(n.x + Math.cos(a) * s * 110, 60, W - 60), y: clamp(n.y + Math.sin(a) * s * 110, top + 50, H - 50) };
          }
        }
        // Brighter than you: go and douse herself.
        if ((glow.get(n) ?? 0) > (glow.get(ctx.player) ?? 0) + 8) {
          let best = sumps[0];
          for (const s of sumps) if (dist(n.x, n.y, s.x, s.y) < dist(n.x, n.y, best.x, best.y)) best = s;
          return { x: best.x, y: best.y };
        }
        return null;
      },

      drawGround(g, time) {
        // Coral on the walls lighting the edges in cyan and rose.
        const crng = ((s: number) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; })(coralSeed + 1);
        drawCoral(g, 70, top + 200, 1.0, ABY.coralCyan, crng);
        drawCoral(g, W - 80, top + 260, 1.1, ABY.coralRose, crng);
        drawCoral(g, W * 0.5, H - 14, 0.9, ABY.coralViolet, crng);
        // Ink sumps: black silt, a slow oily ripple over each.
        for (const s of sumps) {
          g.fillStyle(0x020306, 0.95); g.fillEllipse(s.x, s.y, s.r * 2.2, s.r * 1.5);
          g.fillStyle(0x0a0c14, 1); g.fillEllipse(s.x, s.y, s.r * 1.8, s.r * 1.2);
          const k = (time / 1600) % 1;
          g.lineStyle(1.5, ABY.siltPale, 0.3 * (1 - k)); g.strokeEllipse(s.x, s.y, s.r * 1.8 * k, s.r * 1.2 * k);
        }
        // Burrows: ringed holes; their eyes glint when they are about to strike.
        for (const b of burrows) {
          g.fillStyle(0x000000, 0.9); g.fillCircle(b.x, b.y, 20);
          g.lineStyle(4, mixC(ABY.siltLit, ABY.coralTeal, 0.4), 1); g.strokeCircle(b.x, b.y, 22);
        }
        // Aim lines: a thin cold line that brightens as the strike comes.
        for (const e of eels) {
          if (now >= e.lungeAt) continue;
          const k = (time - e.aimAt) / (e.lungeAt - e.aimAt);
          g.lineStyle(EEL_R * 2, ABY.coralCyan, 0.05 + k * 0.12); g.lineBetween(e.bx, e.by, e.tx, e.ty);
          g.lineStyle(2, ABY.coralCyan, 0.4 + k * 0.5); g.lineBetween(e.bx, e.by, e.tx, e.ty);
          g.fillStyle(0xdffaff, 0.9); g.fillCircle(e.bx - 5, e.by - 3, 2.5 + k * 1.5); g.fillCircle(e.bx + 5, e.by - 3, 2.5 + k * 1.5);
        }
      },

      drawAir(g, time) {
        const p = ctx.player, n = ctx.npc;
        const gp = glow.get(p) ?? 0, gn = glow.get(n) ?? 0;
        // The dim of the deep, lit only by each fighter's glow and the coral at the walls.
        abyssDark(g, W, H, top, [
          { x: p.x, y: p.y, r: 80 + gp * 2.2, tint: ABY.coralCyan },
          { x: n.x, y: n.y, r: 70 + gn * 2.2, tint: ABY.coralCyan },
          { x: 70, y: top + 180, r: 130, tint: ABY.coralCyan }, { x: W - 80, y: top + 240, r: 130, tint: ABY.coralRose },
        ], hard ? 0.66 : 0.58);
        // Photophores: rings of small lights on each fighter, more of them the brighter they are.
        for (const [f, v] of [[p, gp], [n, gn]] as const) {
          if (!alive(f) || v < 3) continue;
          const count = 3 + Math.floor(v / 9);
          for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + time / 900;
            const tw = 0.6 + 0.4 * Math.sin(time / 120 + i * 1.7);
            g.fillStyle(ABY.coralCyan, (0.3 + v / 140) * tw); g.fillCircle(f.x + Math.cos(a) * 24, f.y + Math.sin(a) * 15, 2.2);
          }
          g.fillStyle(ABY.coralCyan, v / 900); g.fillCircle(f.x, f.y, 40 + v * 0.5);
        }
        // The eels in flight: a long dark ribbon body with a lit jaw and a lateral line of lights.
        for (const e of eels) {
          if (now < e.lungeAt) continue;
          const h = headOf(e);
          const a = Math.atan2(e.ty - e.by, e.tx - e.bx);
          const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
          const len = Math.min(dist(e.bx, e.by, h.x, h.y), 260);
          let lx = h.x, ly = h.y;
          for (let k = 1; k <= 14; k++) {
            const s = (k / 14) * len;
            const wob = Math.sin(time / 50 - k * 0.8) * 6 * (k / 14);
            const cx = h.x - ux * s + px * wob, cy = h.y - uy * s + py * wob;
            g.lineStyle(16 - k * 0.9, 0x0a1a20, 1); g.lineBetween(lx, ly, cx, cy);
            if (k % 2 === 0) { g.fillStyle(ABY.coralCyan, 0.8); g.fillCircle(cx + px * 3, cy + py * 3, 1.8); }
            lx = cx; ly = cy;
          }
          g.fillStyle(0x0a1a20, 1); g.fillTriangle(h.x + ux * 18, h.y + uy * 18, h.x + px * 9, h.y + py * 9, h.x - px * 9, h.y - py * 9);
          g.fillStyle(ABY.tooth, 0.9);
          g.fillTriangle(h.x + ux * 16, h.y + uy * 16, h.x + ux * 6 + px * 4, h.y + uy * 6 + py * 4, h.x + ux * 8, h.y + uy * 8);
          g.fillStyle(0xdffaff, 1); g.fillCircle(h.x + px * 5, h.y + py * 5, 2.4);
        }
      },

      drawHud(g) {
        // Two glow bars: yours, and Siph's. Whichever is longer is what the eels are watching.
        const bar = (x: number, v: number, lead: boolean): void => {
          const y = top + 12, w = 120;
          g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 3, y - 3, w + 6, 12, 5);
          g.fillStyle(lead ? ABY.coralCyan : ABY.coralTeal, 0.95); g.fillRoundedRect(x, y, w * (v / 100), 6, 3);
          if (lead) { g.lineStyle(1.5, 0xdffaff, 0.8); g.strokeRoundedRect(x - 3, y - 3, w + 6, 12, 5); }
        };
        const gp = glow.get(ctx.player) ?? 0, gn = glow.get(ctx.npc) ?? 0;
        bar(W / 2 - 140, gp, gp >= gn);
        bar(W / 2 + 20, gn, gn > gp);
      },

      destroy() { eels = []; glow.clear(); },
    };
  },
};
