import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { ABY, alive, clamp, dist, makeClock, segDist } from '../palette';

/**
 * Whale Fall — Bonepicker Orla.
 *
 * A whale skeleton lies across the arena, skull at one end, flukes at the other, its ribs
 * arching over the spine. Inside the ribcage is cover: the bones turn blows, and anything that
 * hits you in there lands 40% lighter. But a whale fall is a larder, and the hagfish living in
 * it do not care who you are — linger inside the ribs and a knot of them boils out of the
 * marrow at you, slimy, slow, and biting. They chase whoever woke them until that one has been
 * out of the ribs a while; then they slide back into the bones.
 *
 * Orla treats the ribs as her shelter and slips out before the hagfish wake. They bite her
 * just as happily as you: the play is to keep her in there — fight her inside, stand in the
 * gap she wants to leave through, or wake the swarm and then step out and let it find her.
 */

interface Hag { x: number; y: number; ph: number }
interface Swarm { target: Fighter; hags: Hag[]; bornAt: number; outFor: number; returning: boolean; home: Pt; lastBite: number }

export const whaleFallGimmick: GimmickDef = {
  id: 'abyssal-whale',
  rules: 'Inside the whale\'s ribs you take 40% less damage — but linger there and the hagfish come boiling out after you.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, rng, hard } = ctx;
    const tick = makeClock();
    const A: Pt = { x: 170, y: top + 420 };   // skull end
    const B: Pt = { x: W - 170, y: top + 150 }; // flukes end
    const RIB_HALF = 82;
    const T0 = 0.14, T1 = 0.82;
    const WAKE_S = hard ? 1.2 : 1.5;
    const HAG_SPEED = hard ? 182 : 165;
    const BITE = hard ? 4 : 3;
    const ribs = Array.from({ length: 8 }, (_, i) => T0 + 0.02 + (i / 7) * (T1 - T0 - 0.04));
    const along = (t: number): Pt => ({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t });
    const ang = Math.atan2(B.y - A.y, B.x - A.x);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const P0 = along(T0), P1 = along(T1);

    const inside = (f: Fighter): boolean => alive(f) && segDist(f.x, f.y, P0.x, P0.y, P1.x, P1.y) < RIB_HALF;
    const linger = new Map<Fighter, number>([[ctx.player, 0], [ctx.npc, 0]]);
    const slowUntil = new Map<Fighter, number>([[ctx.player, 0], [ctx.npc, 0]]);
    let swarms: Swarm[] = [];
    let now = 0;
    let npcCooling = false;

    /** Nearest point on the spine to a fighter (where the hagfish come out). */
    const spineNear = (f: Fighter): Pt => {
      const dx = P1.x - P0.x, dy = P1.y - P0.y;
      const t = clamp(((f.x - P0.x) * dx + (f.y - P0.y) * dy) / (dx * dx + dy * dy), 0, 1);
      return { x: P0.x + dx * t, y: P0.y + dy * t };
    };

    const wake = (f: Fighter): void => {
      const home = spineNear(f);
      const n = hard ? 7 : 6;
      const hags: Hag[] = [];
      for (let i = 0; i < n; i++) hags.push({ x: home.x + (rng() - 0.5) * 30, y: home.y + (rng() - 0.5) * 20, ph: rng() * 6 });
      swarms.push({ target: f, hags, bornAt: now, outFor: 0, returning: false, home, lastBite: 0 });
      ctx.sfx('slime-splat');
      ctx.float(home.x, home.y - 40, 'HAGFISH!', '#e8b8c8');
    };

    return {
      update(time: number) {
        const dt = tick(time);
        now = time;
        for (const f of [ctx.player, ctx.npc]) {
          const hunted = swarms.some((s) => s.target === f && !s.returning);
          const v = (linger.get(f) ?? 0) + (inside(f) ? dt : -dt * 1.6);
          linger.set(f, clamp(v, 0, WAKE_S + 0.5));
          if (!hunted && inside(f) && v >= WAKE_S) { wake(f); linger.set(f, 0); }
        }
        if (npcCooling && (linger.get(ctx.npc) ?? 0) <= 0.05) npcCooling = false;
        if ((linger.get(ctx.npc) ?? 0) > WAKE_S * 0.62) npcCooling = true;

        for (const s of swarms) {
          const f = s.target;
          if (!s.returning) {
            s.outFor = inside(f) ? 0 : s.outFor + dt;
            if (s.outFor > 1.6 || time - s.bornAt > 6500 || !alive(f)) s.returning = true;
          }
          const goal: Pt = s.returning ? s.home : { x: f.x, y: f.y };
          let anyClose = false;
          s.hags.forEach((h, i) => {
            h.ph += dt * 9;
            // Each hag aims a little off the goal so the knot spreads into a writhing ring.
            const off = (i / s.hags.length) * Math.PI * 2 + time / 900;
            const gx = goal.x + (s.returning ? 0 : Math.cos(off) * 16), gy = goal.y + (s.returning ? 0 : Math.sin(off) * 12);
            const d = dist(h.x, h.y, gx, gy);
            const sp = (s.returning ? HAG_SPEED * 1.3 : HAG_SPEED) * (0.85 + (i % 3) * 0.08);
            if (d > 1) { const st = Math.min(d, sp * dt); h.x += ((gx - h.x) / d) * st + Math.sin(h.ph) * 0.6; h.y += ((gy - h.y) / d) * st + Math.cos(h.ph) * 0.6; }
            if (!s.returning && dist(h.x, h.y, f.x, f.y) < 28) anyClose = true;
          });
          if (anyClose && time - s.lastBite >= 430) {
            s.lastBite = time;
            ctx.hit(f, BITE, f.x, f.y);
            slowUntil.set(f, time + 700);
            if (Math.floor(time / 430) % 3 === 0) ctx.sfx('hit-light');
          }
        }
        swarms = swarms.filter((s) => !(s.returning && s.hags.every((h) => dist(h.x, h.y, s.home.x, s.home.y) < 10)));
      },

      playerTakenMult: () => (inside(ctx.player) ? 0.6 : 1),
      npcTakenMult: () => (inside(ctx.npc) ? 0.6 : 1),
      playerSpeedMult: () => (now < (slowUntil.get(ctx.player) ?? 0) ? 0.74 : 1),
      npcSpeedMult: () => (now < (slowUntil.get(ctx.npc) ?? 0) ? 0.74 : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc;
        const hunted = swarms.find((s) => s.target === n && !s.returning);
        const side = (n.x - P0.x) * nx + (n.y - P0.y) * ny >= 0 ? 1 : -1;
        if (hunted || npcCooling) {
          if (!inside(n) && !hunted) return null;
          // Out through the nearest gap between the ribs, then keep going.
          const sp = spineNear(n);
          return { x: clamp(sp.x + nx * side * (RIB_HALF + 110), 60, W - 60), y: clamp(sp.y + ny * side * (RIB_HALF + 110), top + 50, H - 50) };
        }
        if (!inside(n)) {
          // Into cover, on the player's end of the whale.
          const sp = spineNear(ctx.player);
          return { x: sp.x + nx * side * 30, y: sp.y + ny * side * 30 };
        }
        return null;
      },

      drawGround(g, time) {
        // The fall's stain: bacterial mat, white and rust, spread round the bones.
        const mid = along(0.5);
        g.fillStyle(0x1b2018, 0.55); g.fillEllipse(mid.x, mid.y, 760, 300);
        g.fillStyle(0xe8e4d2, 0.06); g.fillEllipse(mid.x - 40, mid.y + 20, 420, 140);
        g.fillStyle(0xd89a4a, 0.05); g.fillEllipse(mid.x + 80, mid.y - 30, 300, 100);
        // The cover zone, faintly outlined so you can read where the ribs keep you.
        const pts = [
          { x: P0.x + nx * RIB_HALF, y: P0.y + ny * RIB_HALF }, { x: P1.x + nx * RIB_HALF, y: P1.y + ny * RIB_HALF },
          { x: P1.x - nx * RIB_HALF, y: P1.y - ny * RIB_HALF }, { x: P0.x - nx * RIB_HALF, y: P0.y - ny * RIB_HALF },
        ];
        g.fillStyle(ABY.boneShadow, 0.25); g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x, p.y)), true, true);
        g.lineStyle(1.5, ABY.boneMid, 0.25);
        g.lineBetween(pts[0].x, pts[0].y, pts[1].x, pts[1].y); g.lineBetween(pts[2].x, pts[2].y, pts[3].x, pts[3].y);
        // The spine, vertebra by vertebra.
        for (let i = 0; i <= 26; i++) {
          const t = i / 26;
          const p = along(t);
          const s = 1.2 - t * 0.6;
          g.fillStyle(ABY.boneShadow, 0.9); g.fillEllipse(p.x, p.y + 4, 30 * s, 18 * s);
          g.fillStyle(mixC(ABY.boneDark, ABY.boneMid, 0.6), 1); g.fillEllipse(p.x, p.y, 26 * s, 15 * s);
          g.fillStyle(ABY.bone, 0.8); g.fillEllipse(p.x - 2, p.y - 2, 12 * s, 6 * s);
          g.fillStyle(ABY.blood, 0.7); g.fillCircle(p.x + 5 * s, p.y - 3, 1.3);
        }
        // Skull at the west end.
        g.fillStyle(ABY.boneShadow, 1); g.fillEllipse(A.x - 10, A.y + 6, 120, 76);
        g.fillStyle(ABY.boneMid, 1); g.fillEllipse(A.x - 10, A.y + 2, 112, 66);
        g.fillStyle(ABY.boneMid, 1); g.fillTriangle(A.x - 60, A.y - 18, A.x - 60, A.y + 26, A.x - 150, A.y + 30);
        g.fillStyle(0x0d0c0a, 1); g.fillEllipse(A.x - 18, A.y - 6, 22, 14);
        // Flukes at the east end.
        for (const sgn of [-1, 1]) {
          g.fillStyle(ABY.boneDark, 0.9);
          g.fillTriangle(B.x, B.y, B.x + 80, B.y + sgn * 70, B.x + 40, B.y + sgn * 18);
        }
        // Each rib's foot, stuck in the silt either side of the spine.
        for (const t of ribs) {
          const p = along(t);
          for (const sgn of [-1, 1]) {
            g.fillStyle(0x000000, 0.35); g.fillEllipse(p.x + nx * sgn * RIB_HALF, p.y + ny * sgn * RIB_HALF + 2, 20, 7);
            g.fillStyle(ABY.boneMid, 1); g.fillCircle(p.x + nx * sgn * RIB_HALF, p.y + ny * sgn * RIB_HALF, 5);
          }
        }
        // Slime trails where the hagfish have been.
        for (const s of swarms) {
          for (const h of s.hags) { g.fillStyle(0xd8e8d0, 0.12); g.fillEllipse(h.x, h.y + 4, 18, 7); }
        }
        // Warn the ones lingering: the marrow seethes under them.
        for (const f of [ctx.player, ctx.npc]) {
          const v = linger.get(f) ?? 0;
          if (!inside(f) || v < WAKE_S * 0.45) continue;
          const sp = spineNear(f);
          const k = v / WAKE_S;
          for (let i = 0; i < 5; i++) {
            const a = time / 160 + i * 1.3;
            g.fillStyle(0xe8b8c8, 0.25 + k * 0.5); g.fillEllipse(sp.x + Math.cos(a) * 14 * k, sp.y + Math.sin(a) * 8 * k, 8, 4);
          }
        }
      },

      drawAir(g, time) {
        // Hagfish: pale pink eels, wriggling, a row of slime pores down each.
        for (const s of swarms) {
          for (const h of s.hags) {
            const goal = s.returning ? s.home : s.target;
            const a = Math.atan2(goal.y - h.y, goal.x - h.x);
            const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
            let x = h.x, y = h.y;
            for (let k = 0; k < 7; k++) {
              const wob = Math.sin(h.ph - k * 0.9) * 4;
              const nxp = h.x - ux * k * 5 + px * wob, nyp = h.y - uy * k * 5 + py * wob;
              g.lineStyle(6 - k * 0.6, mixC(0xc89aa8, 0x8a6070, k / 7), 1); g.lineBetween(x, y, nxp, nyp);
              x = nxp; y = nyp;
            }
            g.fillStyle(0xf0d0d8, 1); g.fillCircle(h.x, h.y, 3);
            g.fillStyle(0x3a1a22, 1); g.fillCircle(h.x + ux * 2, h.y + uy * 2, 1.2);
          }
        }
        // The ribs arch up over the spine — painted over the fighters but thin, so you can see
        // who is inside the cage.
        for (const t of ribs) {
          const p = along(t);
          const h = 92 - Math.abs(t - 0.45) * 60;
          for (const sgn of [-1, 1]) {
            const fx = p.x + nx * sgn * RIB_HALF, fy = p.y + ny * sgn * RIB_HALF;
            let lx = fx, ly = fy;
            for (let k = 1; k <= 10; k++) {
              const s = k / 10;
              const cx = fx + (p.x - fx) * s, cy = fy + (p.y - fy) * s - Math.sin(s * Math.PI * 0.5) * h;
              g.lineStyle(7 - s * 3, ABY.boneShadow, 0.55); g.lineBetween(lx, ly + 1, cx, cy + 1);
              g.lineStyle(5 - s * 2, ABY.boneMid, 0.7); g.lineBetween(lx, ly, cx, cy);
              lx = cx; ly = cy;
            }
          }
          // Where each pair meets, a knot of red bone-worms.
          g.fillStyle(ABY.blood, 0.7); g.fillCircle(p.x, p.y - h, 2.5);
        }
        // A gleam on whoever is sheltering.
        for (const f of [ctx.player, ctx.npc]) {
          if (!inside(f)) continue;
          g.lineStyle(1.5, ABY.bone, 0.35 + Math.sin(time / 300) * 0.1); g.strokeCircle(f.x, f.y, 26);
        }
      },

      drawHud(g) {
        // Your linger meter: how close the hagfish are to waking under you.
        const v = (linger.get(ctx.player) ?? 0) / WAKE_S;
        if (v <= 0.02) return;
        const x = W / 2 - 70, y = top + 12, w = 140;
        g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 3, y - 3, w + 6, 12, 5);
        g.fillStyle(v > 0.75 ? 0xe86a8a : 0xc89aa8, 0.95); g.fillRoundedRect(x, y, w * Math.min(1, v), 6, 3);
      },

      destroy() { swarms = []; linger.clear(); slowUntil.clear(); },
    };
  },
};
