import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { soulLantern } from '../art';
import { CREPE, IRON, IRON_LIT, PAPER_SHADE, TIMBER_DARK } from '../palette';
import { alive, clamp, dist } from '../util';
import { THEM, wirePlate, YOU } from './common';

/**
 * Sat Up — Iolanthe Brisk, Sitter of the Mourning House.
 *
 * In the Mourning House nobody lies down. The bereaved sit up behind the open shutters, and Brisk
 * walks the rows with a lantern-hook on a chain from the rafters, and anyone who slumps is hooked
 * by the collar and sat up, hard. In her yard the rule is the same for fighters: anyone held down —
 * laid out under one of her palls, or stunned by anything at all — has the hook come for them.
 *
 * Every few seconds she shakes a white pall out over you: its shadow follows you, stops, and drops.
 * Under it you are laid out (rooted, though you can still cast), and the hook starts down over you,
 * a ring tightening. Strike the hook while you are held and it swings off and drops on her
 * instead — a ring she has to walk out of. Better still, hold her: any stun you put on her brings
 * the hook down on her. Past half she shakes out two palls, one for each of you.
 */

const PALL_R = 78;
const FOLLOW = 1000;
const SET = 650;
const LAID_MS = 1500;
const HOOK_R = 52;
const LIFT_MS = 800;
const HOOK_DMG = 16;

type Side = 'player' | 'npc';
interface Pall { side: Side; x: number; y: number; t0: number; fell: boolean; liftAt: number }
interface Hook { on: Side; x: number; y: number; t0: number; warn: number; swung: boolean; target: StrikeTarget | null }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const fighter = (s: Side): Fighter => (s === 'player' ? player : npc);
  const other = (s: Side): Side => (s === 'player' ? 'npc' : 'player');
  const laidUntil: Record<Side, number> = { player: 0, npc: 0 };
  const lifting: Record<Side, number> = { player: 0, npc: 0 };
  const wasHeld: Record<Side, boolean> = { player: false, npc: false };
  const palls: Pall[] = [];
  const hooks: Hook[] = [];
  /** Sat-up fighters waiting to come down off the hook. */
  const pendingDrops: { side: Side; at: number }[] = [];
  let late = false;
  let nextPall = 0;
  let started = false;

  const held = (s: Side, time: number): boolean => {
    const f = fighter(s);
    return alive(f) && (time < laidUntil[s] || Date.now() < (f.stunnedUntil ?? 0));
  };
  const hookWarn = () => (late ? 800 : 1000);

  function lowerHook(on: Side, time: number, warn: number, swung: boolean): void {
    if (hooks.some((h) => h.on === on)) return;
    const f = fighter(on);
    const h: Hook = { on, x: f.x, y: f.y, t0: time, warn, swung, target: null };
    if (!swung) {
      h.target = ctx.target({
        x: h.x, y: h.y - 12, r: 18,
        onStruck: (by) => {
          if (by !== h.on || h.swung) return;
          // Swatted while held: it swings off and drops on the other.
          h.target?.remove(); h.target = null;
          const i = hooks.indexOf(h);
          if (i >= 0) hooks.splice(i, 1);
          lowerHook(other(h.on), ctx.scene.time.now, 800, true);
          ctx.sfx('whip');
        },
      });
    }
    hooks.push(h);
    ctx.sfx('chain');
  }

  function shakePall(side: Side, time: number): void {
    const f = fighter(side);
    palls.push({ side, x: f.x, y: f.y, t0: time, fell: false, liftAt: 0 });
    ctx.sfx('gust');
  }

  return {
    update(time, dtRaw) {
      const dt = clamp(dtRaw, 0, 0.1);
      if (!started) { started = true; nextPall = time + 3500; }
      if (!late && alive(npc) && npc.hp <= npc.maxHp * 0.5) { late = true; ctx.banner('A PALL FOR EACH OF YOU', '#f4f1ea'); ctx.sfx('boss-phase'); }

      if (time >= nextPall && alive(player) && alive(npc)) {
        shakePall('player', time);
        if (late) shakePall('npc', time);
        nextPall = time + (late ? 5200 : 6000);
      }
      for (let i = palls.length - 1; i >= 0; i--) {
        const p = palls[i];
        const f = fighter(p.side);
        const age = time - p.t0;
        if (age < FOLLOW && alive(f)) {
          // The shadow chases its mark, easing in.
          const k = 1 - Math.pow(0.02, dt);
          p.x += (f.x - p.x) * k * 2.2; p.y += (f.y - p.y) * k * 2.2;
        } else if (!p.fell && age >= FOLLOW + SET) {
          p.fell = true;
          p.liftAt = time + 3000;
          for (const s of ['player', 'npc'] as Side[]) {
            const q = fighter(s);
            if (!alive(q) || dist(q.x, q.y, p.x, p.y) > PALL_R + 16) continue;
            laidUntil[s] = time + LAID_MS;
            ctx.root(q, LAID_MS);
          }
          ctx.sfx('hush');
        }
        if (p.fell && time >= p.liftAt) palls.splice(i, 1);
      }

      // The held draw the hook.
      for (const s of ['player', 'npc'] as Side[]) {
        const h = held(s, time);
        if (h && !wasHeld[s] && time >= lifting[s]) lowerHook(s, time, hookWarn(), false);
        wasHeld[s] = h;
      }
      for (let i = hooks.length - 1; i >= 0; i--) {
        const h = hooks[i];
        if (time - h.t0 < h.warn) continue;
        h.target?.remove();
        hooks.splice(i, 1);
        const f = fighter(h.on);
        // A hook still over someone held — or a swung hook over anyone — sits them up.
        if (alive(f) && dist(f.x, f.y, h.x, h.y) < HOOK_R + 14 && (h.swung || held(h.on, time))) {
          lifting[h.on] = time + LIFT_MS + 400;
          ctx.airborne(f, LIFT_MS);
          ctx.root(f, LIFT_MS);
          ctx.sfx('wings');
          pendingDrops.push({ side: h.on, at: time + LIFT_MS });
        } else ctx.sfx('whoosh');
      }
      for (let i = pendingDrops.length - 1; i >= 0; i--) {
        const d = pendingDrops[i];
        if (time < d.at) continue;
        pendingDrops.splice(i, 1);
        const f = fighter(d.side);
        ctx.hit(f, HOOK_DMG, f.x, f.y);
        ctx.sfx('land');
      }
    },

    npcSeek() {
      const now = ctx.scene.time.now;
      // Out from under any pall or hook over her, if she can move.
      for (const p of palls) {
        if (p.fell) continue;
        if (dist(npc.x, npc.y, p.x, p.y) < PALL_R + 50) {
          const a = Math.atan2(npc.y - p.y, npc.x - p.x);
          return { x: clamp(p.x + Math.cos(a) * (PALL_R + 90), 60, W - 60), y: clamp(p.y + Math.sin(a) * (PALL_R + 90), top + 40, H - 40) };
        }
      }
      for (const h of hooks) {
        if (h.on !== 'npc' || held('npc', now)) continue;
        const a = Math.atan2(npc.y - h.y, npc.x - h.x);
        return { x: clamp(h.x + Math.cos(a) * 120, 60, W - 60), y: clamp(h.y + Math.sin(a) * 120, top + 40, H - 40) };
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 200, 60, W - 60), y: clamp(player.y + Math.sin(a) * 180, top + 40, H - 40) };
    },

    drawGround(g, time) {
      for (const p of palls) {
        const age = time - p.t0;
        if (p.fell) {
          // The pall lying: a white sheet with soft folds and a fringe.
          const fade = clamp((p.liftAt - time) / 500, 0, 1);
          g.fillStyle(CREPE, 0.8 * fade); g.fillEllipse(p.x, p.y, PALL_R * 2, PALL_R * 1.3);
          g.lineStyle(1.2, PAPER_SHADE, 0.9 * fade);
          for (let i = -2; i <= 2; i++) g.lineBetween(p.x + i * 22 - 10, p.y - PALL_R * 0.5, p.x + i * 22 + 8, p.y + PALL_R * 0.5);
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            g.lineBetween(p.x + Math.cos(a) * PALL_R, p.y + Math.sin(a) * PALL_R * 0.65, p.x + Math.cos(a) * (PALL_R + 5), p.y + Math.sin(a) * (PALL_R * 0.65 + 4));
          }
          continue;
        }
        // Its shadow: following, then fixed (the ring turns solid when it will not move again).
        const set = age >= FOLLOW;
        const k = set ? clamp((age - FOLLOW) / SET, 0, 1) : 0;
        g.fillStyle(0x000000, 0.12 + k * 0.16); g.fillEllipse(p.x, p.y, PALL_R * 2, PALL_R * 1.3);
        g.lineStyle(set ? 2.5 : 1.4, p.side === 'player' ? YOU : THEM, set ? 0.9 : 0.5); g.strokeEllipse(p.x, p.y, PALL_R * 2, PALL_R * 1.3);
      }
      for (const h of hooks) {
        const k = clamp((time - h.t0) / h.warn, 0, 1);
        const r = HOOK_R * (1.8 - k * 0.8);
        g.lineStyle(2.5, h.swung ? YOU : THEM, 0.5 + k * 0.5); g.strokeCircle(h.x, h.y, r);
        g.lineStyle(1.2, IRON, 0.6); g.strokeCircle(h.x, h.y, HOOK_R);
        g.fillStyle(0x000000, 0.1 + k * 0.2); g.fillEllipse(h.x, h.y + 2, 18, 6);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // A pall in the air: a great white sheet billowing, coming down as it sets.
      for (const p of palls) {
        if (p.fell) continue;
        const age = time - p.t0;
        const h = age < FOLLOW ? 150 : 150 * (1 - clamp((age - FOLLOW) / SET, 0, 1));
        const w = PALL_R * (1.4 + Math.sin(t * 6) * 0.08), y = p.y - 20 - h;
        const pts = [];
        for (let i = 0; i <= 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          pts.push({ x: p.x + Math.cos(a) * w, y: y + Math.sin(a) * w * 0.45 + Math.sin(t * 7 + i) * 5 });
        }
        g.fillStyle(CREPE, 0.75); g.fillPoints(pts, true);
        g.lineStyle(1, PAPER_SHADE, 0.9); g.strokePoints(pts, true);
        g.lineStyle(1, PAPER_SHADE, 0.6); g.lineBetween(p.x - w * 0.6, y - 4, p.x + w * 0.6, y + 6); g.lineBetween(p.x - w * 0.3, y + 10, p.x + w * 0.5, y - 10);
      }
      // A laid-out fighter: the pall drawn thin over them.
      for (const s of ['player', 'npc'] as Side[]) {
        const f = fighter(s);
        if (time >= laidUntil[s] || !alive(f)) continue;
        g.fillStyle(CREPE, 0.45); g.fillEllipse(f.x, f.y - 18, 52, 46);
      }
      // The hook on its chain from the rafters, with a little lantern swinging off it.
      for (const h of hooks) {
        const k = clamp((time - h.t0) / h.warn, 0, 1);
        const hy = top + (h.y - 50 - top) * k;
        for (let y = top; y < hy; y += 8) { g.lineStyle(1.6, IRON, 0.9); if (((y - top) / 8) % 2 < 1) g.strokeEllipse(h.x, y + 4, 4, 7); else g.strokeEllipse(h.x, y + 4, 2, 7); }
        g.lineStyle(3.5, IRON_LIT, 1);
        g.beginPath(); g.arc(h.x, hy + 12, 10, -0.3, Math.PI * 1.1, false); g.strokePath();
        g.fillStyle(IRON, 1); g.fillTriangle(h.x + 9, hy + 10, h.x + 14, hy + 2, h.x + 5, hy + 6);
        soulLantern(g, h.x - 16, hy + 2 + Math.sin(t * 3) * 2, 0.7, 1, t);
      }
      // Being sat up: a chain taut over them while they are lifted.
      for (const s of ['player', 'npc'] as Side[]) {
        const f = fighter(s);
        if (time >= lifting[s] - 400 || !alive(f)) continue;
        g.lineStyle(2, IRON, 1); g.lineBetween(f.x, top, f.x, f.y - 52);
        g.lineStyle(3, IRON_LIT, 1); g.beginPath(); g.arc(f.x, f.y - 44, 8, -0.3, Math.PI * 1.1, false); g.strokePath();
        glow(g, f.x, f.y - 30, 30, CREPE, 0.06, 2);
      }
    },

    drawHud(g, time) {
      const cx = W / 2, y = top + 8;
      wirePlate(g, cx, y, 170, 30);
      // A folded pall with its sand ring: the next shake.
      const k = clamp(1 - (nextPall - time) / (late ? 5200 : 6000), 0, 1);
      g.fillStyle(CREPE, 1); g.fillRect(cx - 62, y + 9, 16, 12);
      g.lineStyle(1, PAPER_SHADE, 1); g.strokeRect(cx - 62, y + 9, 16, 12); g.lineBetween(cx - 62, y + 15, cx - 46, y + 15);
      g.lineStyle(2, TIMBER_DARK, 1); g.beginPath(); g.arc(cx - 54, y + 15, 11, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      // Who is held: a small chair per fighter, a hook over it when the hook is coming.
      (['player', 'npc'] as Side[]).forEach((s, n) => {
        const x = cx + 4 + n * 38;
        const col = s === 'player' ? YOU : THEM;
        g.lineStyle(2, TIMBER_DARK, 1);
        g.lineBetween(x - 6, y + 22, x - 6, y + 8); g.lineBetween(x - 6, y + 16, x + 5, y + 16); g.lineBetween(x + 5, y + 16, x + 5, y + 22);
        g.fillStyle(held(s, time) ? col : 0xcfc6b0, 1); g.fillCircle(x, y + 11, 3.5);
        if (hooks.some((h) => h.on === s)) { g.lineStyle(1.6, IRON, 1); g.beginPath(); g.arc(x + 12, y + 12, 4, -0.3, Math.PI * 1.1, false); g.strokePath(); }
      });
    },

    destroy() { for (const h of hooks) h.target?.remove(); },
  };
}

export const FALLEN_SAT_UP: GimmickDef = {
  id: fallenId('lantern', 'sat-up'),
  rules: 'Whoever is held down — under her pall, or stunned — draws the hook. Held, strike the hook to swing it onto her. Stun her yourself.',
  make,
};
