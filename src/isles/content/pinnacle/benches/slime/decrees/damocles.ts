import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { glow, mulberry } from '../../../../../art/IsleArt';
import { OBS, seam } from '../../../../../art/PinnacleArt';
import { nameBlade } from '../art';
import { B, VEN, VEN_CSS, VEN_LIT, VEN_LIT_CSS, VIOLET_CSS, type Who, WHO, alive, clamp, dist, stepOf } from '../palette';

/**
 * Seat of the Thread — the Decree of the Hanging Name.
 *
 * Every name on the Register hangs by a thread. Over each fighter hangs their own name, ground to
 * an edge, on a single strand of spider-silk from the dark above; it follows its owner a little
 * slower than they walk. Every wound its owner takes frays the thread, and so does every blow the
 * FOE lands on the blade itself. When the thread goes the name drops — straight down where it
 * hung, not where its owner has got to — and whoever is under it is cut and stunned. It is hung
 * again a moment later, on a fresh thread.
 *
 * The councilor's strings hold you, its marionette walks you, its Linen Tomb wraps you motionless
 * in the middle of the room — and your blade catches up. Turn it round: your blade drops where it
 * hangs, behind you. Walk him under it.
 */

const ID = `${B.id}-hanging-name`;

interface Blade { x: number; y: number; fray: number; state: 'hang' | 'fall' | 'stuck'; at: number; drop: Pt; strikeLock: number; target: StrikeTarget }

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, tk } = ctx;
  const SNAP = ctx.hard ? 30 : 36; // % of max HP taken before the thread goes
  const LAG = ctx.hard ? 170 : 150;
  const FALL = 850;
  const STUCK = 2500;
  const CUT_R = 62;
  const HANG = 150;
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const rngs: Record<Who, number> = { player: 4411, npc: 7719 };

  const blades = {} as Record<Who, Blade>;
  for (const w of WHO) {
    const f = fighter(w);
    blades[w] = {
      x: f.x, y: f.y, fray: 0, state: 'hang', at: 0, drop: { x: f.x, y: f.y }, strikeLock: 0,
      target: ctx.target({
        x: f.x, y: f.y, r: 24, passThrough: true,
        onStruck(by) {
          const b = blades[w];
          const now = ctx.scene.time.now;
          if (by === w || b.state !== 'hang' || now < b.strikeLock) return;
          b.strikeLock = now + 300;
          b.fray += 4;
        },
      }),
    };
  }

  const snap = (w: Who, time: number) => {
    const b = blades[w];
    b.state = 'fall'; b.at = time + tk.warn(FALL); b.drop = { x: b.x, y: b.y };
    ctx.sfx('snap-back');
    ctx.float(b.x, b.y - HANG - 30, w === 'player' ? 'YOUR THREAD GOES' : 'HIS THREAD GOES', w === 'player' ? VIOLET_CSS : VEN_LIT_CSS);
  };

  const land = (w: Who, time: number) => {
    const b = blades[w];
    b.state = 'stuck'; b.at = time + STUCK;
    ctx.sfx('crystal-shatter'); ctx.sfx('hammer-forge');
    for (const v of WHO) {
      const f = fighter(v);
      if (!alive(f) || dist(f.x, f.y, b.drop.x, b.drop.y) > CUT_R) continue;
      if (v === 'player') { tk.hitPlayer(24, f.x, f.y); ctx.stun(f, 900); }
      else { ctx.hit(f, Math.max(14, f.maxHp * 0.1), f.x, f.y); ctx.stun(f, 1000); }
      ctx.float(f.x, f.y - 56, v === w ? 'STRUCK FROM THE REGISTER' : 'UNDER THE WRONG NAME', v === 'npc' ? VEN_LIT_CSS : VIOLET_CSS);
    }
  };

  return {
    update(time, dt) {
      const step = stepOf(dt);
      if (blades.player.at === 0 && blades.player.state === 'hang') { blades.player.at = 1; ctx.banner('EVERY NAME HANGS BY A THREAD', VEN_CSS); }
      for (const w of WHO) {
        const b = blades[w];
        const f = fighter(w);
        if (b.state === 'hang') {
          const d = dist(b.x, b.y, f.x, f.y);
          if (d > 1) { const m = Math.min(d, LAG * step); b.x += ((f.x - b.x) / d) * m; b.y += ((f.y - b.y) / d) * m; }
          if (b.fray >= SNAP && alive(f)) snap(w, time);
        } else if (b.state === 'fall' && time >= b.at) land(w, time);
        else if (b.state === 'stuck' && time >= b.at) {
          b.state = 'hang'; b.fray = 0; b.x = f.x; b.y = f.y; ctx.sfx('whip');
        }
        const p = b.state === 'hang' ? b : b.drop;
        b.target.moveTo(p.x, p.y);
      }
    },
    onPlayerHurt(amount) { if (blades.player.state === 'hang') blades.player.fray += (amount / Math.max(1, ctx.player.maxHp)) * 100; },
    onNpcHurt(amount) { if (blades.npc.state === 'hang') blades.npc.fray += (amount / Math.max(1, ctx.npc.maxHp)) * 100; },
    npcSeek() {
      const n = ctx.npc;
      const away = (p: Pt, d: number): Pt => {
        const a = Math.atan2(n.y - p.y, n.x - p.x) || 0.5;
        return { x: clamp(n.x + Math.cos(a) * d, 60, W - 60), y: clamp(n.y + Math.sin(a) * d, top + 50, H - 50) };
      };
      for (const w of WHO) {
        const b = blades[w];
        if (b.state === 'fall' && dist(n.x, n.y, b.drop.x, b.drop.y) < CUT_R + 60) return away(b.drop, 170);
      }
      const mine = blades.npc;
      // A frayed thread: keep moving so the blade trails behind.
      if (mine.state === 'hang' && mine.fray > SNAP * 0.7 && dist(n.x, n.y, mine.x, mine.y) < 60) return away(mine, 160);
      return null;
    },
    drawGround(g, time) {
      for (const w of WHO) {
        const b = blades[w];
        if (b.state === 'hang') {
          const k = clamp(b.fray / SNAP, 0, 1);
          g.fillStyle(0x000000, 0.25 + k * 0.15); g.fillEllipse(b.x, b.y + 6, 44, 12);
          if (k > 0.7) { g.lineStyle(1.5, VEN, 0.3 + 0.4 * Math.sin(time / 80)); g.strokeEllipse(b.x, b.y + 6, CUT_R * 2, CUT_R * 1.4); }
        } else if (b.state === 'fall') {
          const k = clamp(1 - (b.at - time) / tk.warn(FALL), 0, 1);
          g.fillStyle(VEN, 0.08 + 0.2 * k); g.fillCircle(b.drop.x, b.drop.y, CUT_R);
          g.lineStyle(2, Math.floor(time / 80) % 2 ? VEN_LIT : VEN, 0.9); g.strokeCircle(b.drop.x, b.drop.y, CUT_R);
          g.fillStyle(0x000000, 0.3 + 0.4 * k); g.fillEllipse(b.drop.x, b.drop.y + 6, 20 + 30 * k, 6 + 8 * k);
        } else {
          // Driven into the glass: cracks out from it.
          const rr = mulberry(rngs[w]);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + rr() * 0.4;
            seam(g, [b.drop, { x: b.drop.x + Math.cos(a) * 30, y: b.drop.y + Math.sin(a) * 20 }, { x: b.drop.x + Math.cos(a + 0.2) * 56, y: b.drop.y + Math.sin(a + 0.2) * 38 }], 1, 0.7, 0, VEN);
          }
        }
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      for (const w of WHO) {
        const b = blades[w];
        const rr = mulberry(rngs[w]);
        if (b.state === 'hang') {
          const k = clamp(b.fray / SNAP, 0, 1);
          const sway = Math.sin(t * 1.8 + (w === 'npc' ? 1.3 : 0)) * 6 * (1 + k);
          const bx = b.x + sway, by = b.y - HANG;
          // The thread: three strands that part as it frays, the last one trembling.
          const strands = k < 0.45 ? 3 : k < 0.8 ? 2 : 1;
          for (let s = 0; s < strands; s++) {
            const off = (s - (strands - 1) / 2) * (1 + k * 3);
            const shake = strands === 1 ? Math.sin(time / 30) * 1.5 : 0;
            g.lineStyle(strands === 1 ? 1 : 1.3, k > 0.8 ? VEN_LIT : 0xe8e0f0, 0.75);
            g.lineBetween(b.x + off * 0.3, top - 4, bx + off + shake, by - 8);
          }
          if (k > 0.45) for (let i = 0; i < 3; i++) { g.lineStyle(1, 0xe8e0f0, 0.5); g.lineBetween(bx - 2, by - 30 - i * 14, bx - 8 - i * 3, by - 22 - i * 14); }
          nameBlade(g, bx, by, 1, rr, k > 0.7 ? k : 0, t * 1.8);
        } else if (b.state === 'fall') {
          const k = clamp(1 - (b.at - time) / tk.warn(FALL), 0, 1);
          const y = b.drop.y - HANG * (1 - k * k) - 30 * (1 - k);
          if (k > 0.5) glow(g, b.drop.x, y + 20, 26, VEN_LIT, 0.06, 2);
          // The snapped end, flying up.
          g.lineStyle(1, 0xe8e0f0, 0.6 * (1 - k)); g.lineBetween(b.drop.x, top - 4, b.drop.x + 10 * k, top + (b.drop.y - HANG - top) * (1 - k));
          nameBlade(g, b.drop.x, y - 22, 1, rr, 1, 0);
        } else {
          // Stuck point-down in the floor.
          nameBlade(g, b.drop.x, b.drop.y - 30, 1, rr, 0, 0);
          const k = clamp(1 - (b.at - time) / STUCK, 0, 1);
          if (k > 0.6) { g.lineStyle(1, 0xe8e0f0, (k - 0.6) * 2); g.lineBetween(fighter(w).x, top - 4, fighter(w).x, fighter(w).y - HANG * (k - 0.6) * 2.5); }
        }
      }
    },
    drawHud(g) {
      const cx = W / 2, cy = top + 16;
      g.fillStyle(0x030503, 0.85); g.fillRoundedRect(cx - 110, cy - 11, 220, 22, 8);
      g.lineStyle(1.5, OBS.edge, 0.6); g.strokeRoundedRect(cx - 110, cy - 11, 220, 22, 8);
      const meter = (x: number, w: Who) => {
        const b = blades[w];
        const k = b.state === 'hang' ? clamp(1 - b.fray / SNAP, 0, 1) : 0;
        g.fillStyle(0x1a1626, 1); g.fillRect(x, cy - 2, 86, 4);
        g.fillStyle(k < 0.3 ? VEN_LIT : 0xe8e0f0, 1); g.fillRect(x, cy - 1.5, 86 * k, 3);
      };
      meter(cx - 100, 'player');
      meter(cx + 14, 'npc');
      g.fillStyle(VEN, 1); g.fillCircle(cx, cy, 3);
    },
    destroy() { for (const w of WHO) blades[w].target.remove(); },
  };
};

export const DECREE_HANGING_NAME: GimmickDef = {
  id: ID,
  rules: 'Every name shall hang by a thread that wounds fray; when it goes, the name falls where it hung, on whoever stands beneath.',
  make,
};
