import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { glow } from '../../../../../art/IsleArt';
import { OBS, seam } from '../../../../../art/PinnacleArt';
import { glassDrop } from '../art';
import { B, FEN, VEN, VEN_CSS, VEN_DARK, VEN_DEEP, VEN_LIT, VEN_LIT_CSS, type Who, WHO, alive, clamp, dist, stepOf } from '../palette';

/**
 * Seat of the Under-Fen — the Decree of What Swims Beneath.
 *
 * The floor is glass, and the fen is under it, and something long lives in the fen. It swims under
 * the fighters, slow and patient, following the blood: every wound either side takes runs down
 * into the water as SCENT, and scent fades in a few seconds. When it is ready it marks whoever
 * bleeds most, follows them under the glass, stops — the floor cracks — and comes up through it:
 * a bite that hurts and holds. Where it came up there is a hole for a while: open water, and slow.
 *
 * The councilor's traps and limbs hold you still and bleed you a little at a time; that is how he
 * feeds it. Feed it him instead: hit him hard, all at once, and when the glass cracks under him,
 * make sure he is still standing there (his Black Hole roots him for three seconds while it arms).
 */

const ID = `${B.id}-beneath`;

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, tk } = ctx;
  const SWIM = ctx.hard ? 2600 : 3400;
  const MARK = 1200;
  const LOCK = 700;
  const DIVE = 1200;
  const BITE_R = 72;
  const HOLE_R = 58;
  const HOLE_MS = 4200;
  const HALF_LIFE = 3;
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);

  type State = 'swim' | 'mark' | 'lock' | 'dive';
  let state: State = 'swim';
  let at = 0;
  let quarry: Who = 'player';
  const pos: Pt = { x: W / 2, y: H - 80 };
  let heading = -Math.PI / 2;
  const trail: Pt[] = [];
  let lockAt: Pt = { x: 0, y: 0 };
  let riseAt = -9999;
  const scent: Record<Who, number> = { player: 0, npc: 0 };
  const holes: { x: number; y: number; at: number }[] = [];

  const higher = (): Who => (scent.npc > scent.player ? 'npc' : 'player');
  const inHole = (f: Fighter): boolean => holes.some((h) => dist(f.x, f.y, h.x, h.y) < HOLE_R);

  const steer = (tx: number, ty: number, speed: number, dt: number, turn: number) => {
    const want = Math.atan2(ty - pos.y, tx - pos.x);
    let d = want - heading;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    heading += clamp(d, -turn * dt, turn * dt);
    pos.x = clamp(pos.x + Math.cos(heading) * speed * dt, 30, W - 30);
    pos.y = clamp(pos.y + Math.sin(heading) * speed * dt, top + 20, H - 20);
  };

  const bite = (time: number) => {
    riseAt = time;
    holes.push({ x: lockAt.x, y: lockAt.y, at: time });
    ctx.sfx('crystal-shatter');
    ctx.sfx('roar');
    for (const w of WHO) {
      const f = fighter(w);
      if (!alive(f) || dist(f.x, f.y, lockAt.x, lockAt.y) > BITE_R) continue;
      if (w === 'player') { tk.hitPlayer(20, f.x, f.y); ctx.root(f, 1100); }
      else { ctx.hit(f, Math.max(12, f.maxHp * 0.07), f.x, f.y); ctx.root(f, 1100); }
      ctx.float(f.x, f.y - 52, 'TAKEN UNDER', w === 'npc' ? VEN_LIT_CSS : '#c9b0ff');
      scent[w] *= 0.3; // it has fed
    }
  };

  return {
    update(time, dt) {
      const step = stepOf(dt);
      if (at === 0) { at = time + SWIM; ctx.banner('SOMETHING SWIMS UNDER THE GLASS — IT FOLLOWS THE BLOOD', VEN_CSS); }
      const fade = Math.pow(0.5, step / HALF_LIFE);
      scent.player *= fade; scent.npc *= fade;
      if (state === 'swim') {
        const q = fighter(higher());
        if (Math.max(scent.player, scent.npc) < 3) {
          const a = time / 2400;
          steer(W / 2 + Math.cos(a) * 280, (top + H) / 2 + Math.sin(a) * 170, 150, step, 2.2);
        } else steer(q.x, q.y + 40, 175, step, 2.6);
        if (time >= at) {
          quarry = Math.max(scent.player, scent.npc) < 3
            ? (dist(pos.x, pos.y, ctx.player.x, ctx.player.y) <= dist(pos.x, pos.y, ctx.npc.x, ctx.npc.y) ? 'player' : 'npc')
            : higher();
          state = 'mark'; at = time + MARK;
          ctx.sfx('heartbeat');
          const q2 = fighter(quarry);
          ctx.float(q2.x, q2.y - 56, quarry === 'player' ? 'IT HAS YOUR SCENT' : 'IT HAS HIS SCENT', VEN_LIT_CSS);
        }
      } else if (state === 'mark') {
        const q = fighter(quarry);
        steer(q.x, q.y, 260, step, 6);
        if (time >= at) { state = 'lock'; at = time + tk.warn(LOCK); lockAt = { x: pos.x, y: pos.y }; ctx.sfx('crystal-chime'); }
      } else if (state === 'lock') {
        if (time >= at) { bite(time); state = 'dive'; at = time + DIVE; }
      } else if (state === 'dive') {
        steer(lockAt.x + Math.cos(heading) * 300, lockAt.y + 200, 120, step, 1.5);
        if (time >= at) { state = 'swim'; at = time + SWIM; }
      }
      trail.unshift({ x: pos.x, y: pos.y });
      if (trail.length > 64) trail.pop();
      while (holes.length && time - holes[0].at > HOLE_MS) holes.shift();
    },
    onPlayerHurt(amount) { scent.player += (amount / Math.max(1, ctx.player.maxHp)) * 100; },
    onNpcHurt(amount) { scent.npc += (amount / Math.max(1, ctx.npc.maxHp)) * 100; },
    playerSpeedMult() { return inHole(ctx.player) ? 0.65 : 1; },
    npcSpeedMult() { return inHole(ctx.npc) ? 0.65 : 1; },
    npcSeek() {
      const n = ctx.npc;
      const away = (from: Pt, d: number): Pt => {
        const a = Math.atan2(n.y - from.y, n.x - from.x);
        return { x: clamp(n.x + Math.cos(a) * d, 60, W - 60), y: clamp(n.y + Math.sin(a) * d, top + 50, H - 50) };
      };
      if ((state === 'mark' || state === 'lock') && quarry === 'npc') return away(state === 'lock' ? lockAt : pos, 220);
      if (state === 'swim' && scent.npc > scent.player && scent.npc > 3) return away(pos, 180);
      for (const h of holes) if (dist(n.x, n.y, h.x, h.y) < HOLE_R + 10) return away(h, 120);
      return null;
    },
    drawGround(g, time) {
      const t = time / 1000;
      const now = ctx.scene.time.now;
      // Holes: open water ringed with broken glass.
      for (const h of holes) {
        const k = clamp((now - h.at) / HOLE_MS, 0, 1);
        const a = k > 0.85 ? (1 - k) / 0.15 : 1;
        g.fillStyle(FEN, a); g.fillEllipse(h.x, h.y, HOLE_R * 2, HOLE_R * 1.5);
        g.fillStyle(VEN_DARK, 0.7 * a); g.fillEllipse(h.x, h.y + 4, HOLE_R * 1.4, HOLE_R * 0.9);
        g.lineStyle(1.2, VEN, 0.4 * a); g.strokeEllipse(h.x, h.y, HOLE_R * (1.2 + 0.4 * ((t * 0.8) % 1)), HOLE_R * 0.9 * (1.2 + 0.4 * ((t * 0.8) % 1)));
        for (let i = 0; i < 12; i++) {
          const an = (i / 12) * Math.PI * 2;
          const ex = h.x + Math.cos(an) * HOLE_R, ey = h.y + Math.sin(an) * HOLE_R * 0.75;
          g.fillStyle(i % 2 ? OBS.facet : OBS.sheen, a);
          g.fillTriangle(ex, ey, ex + Math.cos(an + 1.2) * 16, ey + Math.sin(an + 1.2) * 12, ex + Math.cos(an) * 14, ey + Math.sin(an) * 10);
        }
      }
      // The thing itself, dark under the glass: a long body following its own wake.
      const n = trail.length;
      for (let i = n - 1; i >= 0; i -= 3) {
        const p = trail[i];
        const f = i / Math.max(1, n - 1);
        const r = 26 * (1 - f * 0.75) + (i < 6 ? 4 : 0);
        g.fillStyle(0x010201, 0.8); g.fillCircle(p.x, p.y, r);
        if (i % 6 === 0) { g.fillStyle(VEN, 0.25 + 0.15 * Math.sin(t * 3 + i)); g.fillCircle(p.x, p.y, 2.4); }
      }
      // Fins, eyes.
      const hx = pos.x, hy = pos.y, ca = Math.cos(heading), sa = Math.sin(heading);
      for (const s of [-1, 1]) {
        g.fillStyle(0x010201, 0.7);
        g.fillTriangle(hx - ca * 18 - sa * 16 * s, hy - sa * 18 + ca * 16 * s, hx - ca * 40 - sa * 44 * s, hy - sa * 40 + ca * 44 * s, hx - ca * 42 - sa * 14 * s, hy - sa * 42 + ca * 14 * s);
        const ex = hx + ca * 16 - sa * 10 * s, ey = hy + sa * 16 + ca * 10 * s;
        glow(g, ex, ey, 10, VEN_LIT, state === 'swim' ? 0.05 : 0.12, 2);
        g.fillStyle(VEN_LIT, state === 'swim' ? 0.55 : 1); g.fillCircle(ex, ey, 2.8);
      }
      // The glass over it: polish streaks so it reads as UNDER.
      g.fillStyle(0xffffff, 0.04);
      g.fillTriangle(hx - 60, hy - 40, hx - 30, hy - 40, hx - 70, hy + 40);
      // Scent: a dotted green thread from its snout to the one it wants.
      if (state === 'swim' && Math.max(scent.player, scent.npc) >= 3) {
        const q = fighter(higher());
        const d = dist(hx, hy, q.x, q.y);
        for (let s = 20; s < d; s += 22) {
          const f = s / d;
          g.fillStyle(VEN, 0.25); g.fillCircle(hx + (q.x - hx) * f, hy + (q.y - hy) * f + Math.sin(t * 5 + s * 0.1) * 3, 1.8);
        }
      }
      // The bulge as it follows its quarry; then the cracks spreading as it stops.
      if (state === 'mark') {
        for (let i = 0; i < 3; i++) {
          const ph = (t * 1.6 + i / 3) % 1;
          g.lineStyle(2, VEN, 0.5 * (1 - ph)); g.strokeEllipse(hx, hy, 30 + ph * 90, 22 + ph * 64);
        }
      }
      if (state === 'lock') {
        const k = clamp(1 - (at - now) / tk.warn(LOCK), 0, 1);
        g.fillStyle(VEN, 0.08 + 0.18 * k); g.fillCircle(lockAt.x, lockAt.y, BITE_R);
        g.lineStyle(2, Math.floor(time / 80) % 2 ? VEN_LIT : VEN, 0.9); g.strokeCircle(lockAt.x, lockAt.y, BITE_R);
        for (let i = 0; i < 9; i++) {
          const an = (i / 9) * Math.PI * 2 + 0.3;
          const len = BITE_R * (0.4 + 0.7 * k);
          seam(g, [
            { x: lockAt.x, y: lockAt.y },
            { x: lockAt.x + Math.cos(an + 0.15) * len * 0.5, y: lockAt.y + Math.sin(an + 0.15) * len * 0.5 },
            { x: lockAt.x + Math.cos(an) * len, y: lockAt.y + Math.sin(an) * len },
          ], 1.2, 0.9, k, VEN);
        }
      }
      // Blood in the water under whoever is bleeding.
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f) || scent[w] < 3) continue;
        const k = clamp(scent[w] / 30, 0, 1);
        g.fillStyle(VEN_DEEP, 0.15 + 0.25 * k); g.fillEllipse(f.x, f.y + 16, 30 + k * 30, 10 + k * 8);
      }
    },
    drawAir(g, time) {
      const k = (time - riseAt) / 650;
      if (k >= 0 && k <= 1) {
        // The jaws come up through the glass: two great curved fangs and a burst of shards.
        const x = lockAt.x, y = lockAt.y;
        const up = Math.sin(k * Math.PI);
        const shut = clamp(k * 2.2, 0, 1);
        for (const s of [-1, 1]) {
          const bx = x + s * (BITE_R * 0.9 - shut * BITE_R * 0.55);
          g.fillStyle(0x020403, 1);
          g.fillTriangle(bx - s * 18, y + 10, bx + s * 18, y + 10, bx - s * 10 * shut, y - 110 * up);
          g.lineStyle(2, OBS.edge, 0.8); g.lineBetween(bx + s * 18, y + 10, bx - s * 10 * shut, y - 110 * up);
          g.fillStyle(VEN, 0.6); g.fillCircle(bx - s * 10 * shut, y - 110 * up + 6, 3);
        }
        glow(g, x, y - 40 * up, 60, VEN, 0.06 * up, 3);
        for (let i = 0; i < 14; i++) {
          const an = -Math.PI / 2 + (i - 7) * 0.22;
          const r = 30 + k * 110;
          g.fillStyle(i % 3 ? OBS.sheen : OBS.edge, 1 - k);
          const sx = x + Math.cos(an) * r, sy = y + Math.sin(an) * r * 0.9 + k * k * 60;
          g.fillTriangle(sx, sy, sx + 6, sy + 3, sx + 1, sy + 9);
        }
        for (let i = 0; i < 6; i++) glassDrop(g, x + (i - 2.5) * 18, y - 60 * up + k * k * 50, 3, 1 - k);
      }
      if ((state === 'mark' || state === 'lock') && alive(fighter(quarry))) {
        const q = fighter(quarry);
        g.lineStyle(2, VEN_LIT, 0.7 + 0.3 * Math.sin(time / 70)); g.strokeCircle(q.x, q.y - 50, 7);
        g.fillStyle(VEN_LIT, 1); g.fillCircle(q.x, q.y - 50, 2.5);
      }
    },
    drawHud(g, time) {
      const cx = W / 2, cy = top + 16;
      g.fillStyle(0x030503, 0.85); g.fillRoundedRect(cx - 120, cy - 11, 240, 22, 8);
      g.lineStyle(1.5, OBS.edge, 0.6); g.strokeRoundedRect(cx - 120, cy - 11, 240, 22, 8);
      const bar = (x: number, w: Who, flip: boolean) => {
        const k = clamp(scent[w] / 30, 0, 1);
        g.fillStyle(VEN_DARK, 1); g.fillRect(x, cy - 4, 90, 8);
        g.fillStyle(higher() === w && scent[w] >= 3 ? VEN_LIT : VEN, 1);
        if (flip) g.fillRect(x + 90 - 90 * k, cy - 4, 90 * k, 8); else g.fillRect(x, cy - 4, 90 * k, 8);
      };
      bar(cx - 110, 'player', true);
      bar(cx + 20, 'npc', false);
      // A little fin between, pointing at its quarry.
      const d = higher() === 'player' ? -1 : 1;
      const pulse = state === 'swim' ? 0.6 : 0.6 + 0.4 * Math.sin(time / 60);
      g.fillStyle(VEN_LIT, pulse); g.fillTriangle(cx - 8 * d, cy - 6, cx - 8 * d, cy + 6, cx + 9 * d, cy);
    },
  };
};

export const DECREE_BENEATH: GimmickDef = {
  id: ID,
  rules: 'What swims beneath the glass shall rise for whoever bleeds most, and hold them; where it rose the floor is open water.',
  make,
};
