import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { SF, alive, angDiff, clamp, dist, makeClock, star } from '../palette';

/**
 * Dying Star — Keeper Betel.
 *
 * A fallen star, chained in the middle of the kiln-yard, is dying, and it breathes in threes.
 * SWELL: it bloats into a red giant, its burning edge rolling outward — anyone it reaches cooks.
 * COLLAPSE: it falls in on itself, and drags everything on the floor toward it as it goes — and
 * while it collapses, one side of its crust stays dark and cold: that is where the next blast
 * will be thinnest. NOVA: it blows its shell off as a white ring racing outward, and the ring
 * has a gap only where the crust was cold. Then it smoulders a moment and draws breath again.
 *
 * Betel knows the count. The exploit is the same count: fight at the swell's edge so Betel must
 * come through the heat to reach you, use the collapse's drag to close on him, and on the nova
 * stand in the gap while he stands anywhere else.
 */

type Beat = 'rest' | 'swell' | 'collapse' | 'nova';

export const dyingStarGimmick: GimmickDef = {
  id: 'starfall-dying-star',
  rules: 'The star breathes in threes: it SWELLS (burns near it), COLLAPSES (drags you in), then NOVAS — a ring outward with one gap, where its crust stayed dark.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard, rng } = ctx;
    const tick = makeClock();
    const cx = W / 2, cy = (top + H) / 2 + 10;
    const CORE_R = 46;
    const SWELL_R = hard ? 250 : 225;
    const SWELL_MS = 3000, COLLAPSE_MS = hard ? 1700 : 1900, REST_MS = hard ? 1600 : 2100;
    const BURN_TICK = 500, BURN_DMG = hard ? 6 : 5;
    const PULL = hard ? 105 : 92;
    const RING_SPEED = 360, RING_BAND = 30, GAP_HALF = hard ? 0.42 : 0.5;
    const NOVA_DMG = hard ? 24 : 20;
    const CORE_DMG = 8;

    let beat: Beat = 'rest';
    let beatAt = -1;
    let gapA = 0;
    let ringR = 0;
    let ringHit = new Set<Fighter>();
    let lastBurn = 0;
    let lastCore = 0;
    let now = 0;

    const radius = (): number => {
      const k = clamp((now - beatAt) / (beat === 'swell' ? SWELL_MS : beat === 'collapse' ? COLLAPSE_MS : REST_MS), 0, 1);
      if (beat === 'swell') return CORE_R + (SWELL_R - CORE_R) * (1 - (1 - k) * (1 - k));
      if (beat === 'collapse') return SWELL_R * (1 - k) * (1 - k) + 18 * (1 - (1 - k) * (1 - k));
      if (beat === 'nova') return 18;
      return 18 + (CORE_R - 18) * k;
    };

    const go = (b: Beat, time: number): void => {
      beat = b; beatAt = time;
      if (b === 'swell') { ctx.sfx('flame-burst'); ctx.float(cx, cy - 70, 'SWELL', '#ff6a3a'); }
      if (b === 'collapse') {
        // The cold side: never straight at whoever is closest, so it has to be read, not guessed.
        gapA = rng() * Math.PI * 2;
        ctx.sfx('gravity-slam'); ctx.float(cx, cy - 70, 'COLLAPSE', '#b9a6ff');
      }
      if (b === 'nova') { ringR = 18; ringHit = new Set(); ctx.sfx('explosion-large'); ctx.banner('NOVA', '#ffffff'); ctx.flash(cx, cy, SF.starHot); }
    };

    const inGap = (f: Fighter): boolean => Math.abs(angDiff(Math.atan2(f.y - cy, f.x - cx), gapA)) < GAP_HALF;

    return {
      update(time: number) {
        const dt = tick(time);
        now = time;
        if (beatAt < 0) { beatAt = time; beat = 'rest'; }
        const age = time - beatAt;
        if (beat === 'rest' && age >= REST_MS) go('swell', time);
        else if (beat === 'swell' && age >= SWELL_MS) go('collapse', time);
        else if (beat === 'collapse' && age >= COLLAPSE_MS) go('nova', time);
        const r = radius();
        const fs = [ctx.player, ctx.npc];
        if (beat === 'swell' && time - lastBurn >= BURN_TICK) {
          lastBurn = time;
          for (const f of fs) if (alive(f) && dist(f.x, f.y, cx, cy) < r) { ctx.hit(f, BURN_DMG, f.x, f.y); ctx.float(f.x, f.y - 40, 'SCORCHED', '#ff6a3a'); }
        }
        if (beat === 'collapse') {
          for (const f of fs) {
            if (!alive(f)) continue;
            const d = dist(f.x, f.y, cx, cy);
            if (d < 6) continue;
            const pull = PULL * dt * Math.min(1, 160 / Math.max(80, d) + 0.4);
            ctx.nudge(f, ((cx - f.x) / d) * pull, ((cy - f.y) / d) * pull);
          }
          if (time - lastCore >= 500) {
            lastCore = time;
            for (const f of fs) if (alive(f) && dist(f.x, f.y, cx, cy) < r + 8 && r < 70) ctx.hit(f, CORE_DMG, f.x, f.y);
          }
        }
        if (beat === 'nova') {
          ringR += RING_SPEED * dt;
          for (const f of fs) {
            if (!alive(f) || ringHit.has(f)) continue;
            const d = dist(f.x, f.y, cx, cy);
            if (Math.abs(d - ringR) < RING_BAND && !inGap(f)) {
              ringHit.add(f);
              ctx.hit(f, NOVA_DMG, f.x, f.y);
              ctx.float(f.x, f.y - 46, 'NOVA', '#ffffff');
            }
          }
          if (ringR > Math.hypot(W, H)) go('rest', time);
        }
      },

      npcSeek(): Pt | null {
        const n = ctx.npc;
        const d = dist(n.x, n.y, cx, cy);
        const a = Math.atan2(n.y - cy, n.x - cx);
        if (beat === 'swell' && d < SWELL_R + 50) return { x: clamp(cx + Math.cos(a) * (SWELL_R + 80), 60, W - 60), y: clamp(cy + Math.sin(a) * (SWELL_R + 80), top + 50, H - 50) };
        if (beat === 'collapse' || (beat === 'nova' && ringR < d + 40)) {
          // To the cold side, at a safe distance.
          return { x: clamp(cx + Math.cos(gapA) * 200, 60, W - 60), y: clamp(cy + Math.sin(gapA) * 200, top + 50, H - 50) };
        }
        return null;
      },

      drawGround(g, time) {
        const t = time / 1000;
        const r = radius();
        // The chain-ring it is bolted into, and the scorch of every swell before.
        g.fillStyle(0x000000, 0.25); g.fillCircle(cx, cy + 6, CORE_R + 30);
        g.lineStyle(6, 0x2a2a34, 1); g.strokeCircle(cx, cy, CORE_R + 22);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          g.lineStyle(4, 0x4a4a5a, 1); g.lineBetween(cx + Math.cos(a) * (CORE_R + 22), cy + Math.sin(a) * (CORE_R + 22), cx + Math.cos(a) * (CORE_R + 70), cy + Math.sin(a) * (CORE_R + 70));
          g.fillStyle(0x2a2a34, 1); g.fillCircle(cx + Math.cos(a) * (CORE_R + 70), cy + Math.sin(a) * (CORE_R + 70), 7);
        }
        if (beat === 'rest') {
          // The next swell's reach, shown faint as it draws breath.
          const k = clamp((time - beatAt) / REST_MS, 0, 1);
          g.lineStyle(2, SF.giant, 0.15 + k * 0.4); g.strokeCircle(cx, cy, SWELL_R);
        }
        if (beat === 'swell') {
          g.fillStyle(SF.giantDeep, 0.35); g.fillCircle(cx, cy, r);
          g.fillStyle(SF.giant, 0.22); g.fillCircle(cx, cy, r * 0.8);
          g.lineStyle(3, SF.giantLit, 0.8); g.strokeCircle(cx, cy, r);
          g.lineStyle(1.5, SF.giant, 0.4); g.strokeCircle(cx, cy, SWELL_R);
          // Convection cells on the giant's surface.
          for (let i = 0; i < 10; i++) {
            const a = i * 0.63 + t * 0.4;
            const rr = r * (0.3 + ((i * 3) % 7) / 10);
            g.fillStyle(SF.giantLit, 0.12); g.fillCircle(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, r * 0.16);
          }
        }
        if (beat === 'collapse') {
          // Infall lines streaming toward the core, and the cold wedge where the gap will be.
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            const ph = ((t * 1.6 + i * 0.13) % 1);
            const r0 = 340 * (1 - ph), r1 = r0 - 40;
            g.lineStyle(2, SF.dust, 0.5 * ph); g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * Math.max(r, r1), cy + Math.sin(a) * Math.max(r, r1));
          }
          g.fillStyle(SF.cometDeep, 0.22);
          g.slice(cx, cy, 420, gapA - GAP_HALF, gapA + GAP_HALF, false); g.fillPath();
          g.lineStyle(2, SF.comet, 0.6);
          g.lineBetween(cx, cy, cx + Math.cos(gapA - GAP_HALF) * 420, cy + Math.sin(gapA - GAP_HALF) * 420);
          g.lineBetween(cx, cy, cx + Math.cos(gapA + GAP_HALF) * 420, cy + Math.sin(gapA + GAP_HALF) * 420);
        }
        if (beat === 'nova') {
          // The shell racing outward, and its cold gap.
          g.lineStyle(RING_BAND * 2, SF.starHot, 0.35);
          g.beginPath(); g.arc(cx, cy, ringR, gapA + GAP_HALF, gapA - GAP_HALF + Math.PI * 2, false); g.strokePath();
          g.lineStyle(6, 0xffffff, 0.9);
          g.beginPath(); g.arc(cx, cy, ringR, gapA + GAP_HALF, gapA - GAP_HALF + Math.PI * 2, false); g.strokePath();
          g.lineStyle(2, SF.nebula, 0.6);
          g.beginPath(); g.arc(cx, cy, ringR - RING_BAND, gapA + GAP_HALF, gapA - GAP_HALF + Math.PI * 2, false); g.strokePath();
        }
      },

      drawAir(g, time) {
        const t = time / 1000;
        const r = radius();
        // The star itself: dim ember at rest, a huge red giant swelling, a white point collapsing.
        const coreR = beat === 'swell' ? Math.min(r * 0.45, 90) : Math.max(10, Math.min(r, CORE_R));
        const col = beat === 'swell' ? SF.giant : beat === 'collapse' ? SF.dust : beat === 'nova' ? SF.starHot : SF.giantLit;
        g.fillStyle(col, 0.18); g.fillCircle(cx, cy, coreR * 1.6);
        g.fillStyle(col, 0.85); g.fillCircle(cx, cy, coreR);
        g.fillStyle(SF.starHot, beat === 'swell' ? 0.35 : 0.8); g.fillCircle(cx - coreR * 0.2, cy - coreR * 0.2, coreR * 0.45);
        if (beat === 'collapse') {
          // The cold patch on its crust, facing the gap.
          g.fillStyle(SF.cometDeep, 0.9); g.fillCircle(cx + Math.cos(gapA) * coreR * 0.55, cy + Math.sin(gapA) * coreR * 0.55, coreR * 0.42);
          star(g, cx, cy, coreR * 1.8, SF.starHot, 0.6);
        }
        if (beat === 'swell') {
          // Prominences licking off the limb.
          for (let i = 0; i < 6; i++) {
            const a = i * 1.05 + t * 0.6;
            const h = 14 + Math.sin(t * 3 + i) * 8;
            g.lineStyle(4, SF.giantLit, 0.7);
            g.beginPath(); g.arc(cx + Math.cos(a) * coreR, cy + Math.sin(a) * coreR, h, a - Math.PI * 0.9, a + Math.PI * 0.9, false); g.strokePath();
          }
        }
        // Chains from the ring bolts into the star.
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          g.lineStyle(2.5, 0x5a5a6a, 0.9);
          g.lineBetween(cx + Math.cos(a) * (CORE_R + 70), cy + Math.sin(a) * (CORE_R + 70), cx + Math.cos(a) * coreR * 0.9, cy + Math.sin(a) * coreR * 0.9);
        }
      },

      drawHud(g) {
        // The count: three pips — swell, collapse, nova — the live one lit.
        const x0 = W / 2 - 28, y = top + 14;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 14, y - 10, 84, 20, 8);
        const order: Beat[] = ['swell', 'collapse', 'nova'];
        const cols = [SF.giant, SF.dust, SF.starHot];
        order.forEach((b, i) => { g.fillStyle(cols[i], beat === b ? 1 : 0.25); g.fillCircle(x0 + i * 28, y, beat === b ? 7 : 5); });
      },

      destroy() { ringHit.clear(); },
    };
  },
};
