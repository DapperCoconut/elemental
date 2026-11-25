import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { glow, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { Clock, R, RCOL, alive, dist, drawGlint, jit, segDist } from '../util';

/**
 * THE TITHE WINCH — Winchman Jethro Sounding (string).
 *
 * In the star's telling the man who works the winch over the Tithe Hole was never made to: he
 * asked for the job. The hole sits in the middle of the floor under an iron grate and a timber
 * A-frame, and every few seconds he throws the hook. Its lane is painted on the ice as a dotted
 * rope for most of a second, then the hook flies out along it and bites the FIRST fighter it
 * reaches — whoever that is. A hooked fighter is hauled toward the hole (walking against the
 * rope only slows it); reach the grate and it swings open, you go under, and come up on the ice
 * stunned and frozen through.
 *
 * Strike the winch drum (it stands at the north lip of the hole) and the pawl slips: every rope
 * runs free. Halfway down he throws two hooks at once — a fork you must stand between.
 *
 * The exploit is the rule itself: the hook takes the first body in its lane. Keep the Winchman
 * between you and the hole and it is his own collar the hook finds — then leave the drum alone.
 */

type Side = 'player' | 'npc';

interface Hook {
  /** warn: lane painted · fly: hook in flight · reel: biting someone · back: rope coiling home. */
  phase: 'warn' | 'fly' | 'reel' | 'back';
  t0: number;
  ang: number;
  /** Distance of the hook head from the hole. */
  reach: number;
  caught: Side | null;
  seed: number;
}

interface Body { side: Side; dunks: number; hookedBy: Hook | null; dunkedAt: number }

const HOLE_R = 46;
const WARN_MS = 950;
const FLY_SPEED = 760;
const MAX_REACH = 480;
const BITE_R = 30;
const REEL = 170;
const DUNK_DMG = 26;
const DUNK_STUN = 950;

export const FALLEN_TITHE_WINCH: GimmickDef = {
  id: fallenId('rimefast', 'tithe-winch'),
  rules: 'The hook flies down a painted lane and bites the first fighter it reaches, hauling them to the Tithe Hole. Strike the drum to let the rope run.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, tk } = ctx;
    const hole: Pt = { x: W / 2, y: (top + H) / 2 + 10 };
    const drumAt: Pt = { x: hole.x, y: hole.y - 96 };
    const hooks: Hook[] = [];
    const bodies: Body[] = (['player', 'npc'] as Side[]).map((side) => ({ side, dunks: 0, hookedBy: null, dunkedAt: -9999 }));
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const bodyOf = (s: Side): Body => bodies[s === 'player' ? 0 : 1];
    let now = 0;
    let nextThrow = 2200;
    let forked = false;
    let drumSpin = 0;
    let drumSpinAt = -9999;
    let grateOpenAt = -9999;

    const head = (h: Hook): Pt => ({ x: hole.x + Math.cos(h.ang) * h.reach, y: hole.y + Math.sin(h.ang) * h.reach });

    /** Any blow on the drum knocks the pawl out: every biting hook lets go and the rope runs home. */
    const drum: StrikeTarget = ctx.target({
      x: drumAt.x, y: drumAt.y, r: 24,
      onStruck: (by) => {
        let freed = 0;
        for (const h of hooks) {
          if (h.phase !== 'reel' || !h.caught) continue;
          bodyOf(h.caught).hookedBy = null;
          h.caught = null; h.phase = 'back'; freed++;
        }
        if (!freed) return;
        drumSpinAt = now;
        ctx.sfx('chain');
        ctx.float(drumAt.x, drumAt.y - 40, by === 'player' ? 'PAWL KNOCKED — ROPE RUNS' : 'HE SLIPS THE PAWL', by === 'player' ? RCOL.green : RCOL.red);
      },
    });

    const throwHook = (ang: number, seed: number): void => {
      hooks.push({ phase: 'warn', t0: now, ang, reach: 0, caught: null, seed });
    };

    const dunk = (b: Body, h: Hook): void => {
      const f = fighterOf(b.side);
      b.hookedBy = null; b.dunks++; b.dunkedAt = now;
      h.caught = null; h.phase = 'back';
      grateOpenAt = now;
      // Hauled out by the collar and dropped on the ice, on the side the rope came from.
      ctx.nudge(f, Math.cos(h.ang) * 130 + (hole.x - f.x), Math.sin(h.ang) * 130 + (hole.y - f.y));
      ctx.hit(f, DUNK_DMG, hole.x, hole.y);
      ctx.stun(f, DUNK_STUN);
      ctx.flash(hole.x, hole.y, R.frost);
      ctx.sfx('splash'); tk.sfx('status-freeze');
      ctx.float(f.x, f.y - 54, b.side === 'player' ? 'UNDER — AND OUT' : 'SOUNDING GOES UNDER', b.side === 'player' ? RCOL.red : RCOL.green);
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (dt === 0) return;
        if (!forked && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          forked = true;
          ctx.banner('DOUBLE TITHE — he throws two hooks', RCOL.warm);
          ctx.sfx('chain');
        }
        if (time >= nextThrow && alive(ctx.player)) {
          const a = Math.atan2(ctx.player.y - hole.y, ctx.player.x - hole.x);
          if (forked) { throwHook(a - 0.36, time * 0.01); throwHook(a + 0.36, time * 0.013); }
          else throwHook(a, time * 0.01);
          tk.sfx('whoosh');
          nextThrow = time + (forked ? 3000 : 3500);
        }
        for (const h of hooks) {
          if (h.phase === 'warn' && time - h.t0 >= WARN_MS) { h.phase = 'fly'; ctx.sfx('whip'); }
          if (h.phase === 'fly') {
            h.reach += FLY_SPEED * dt;
            const p = head(h);
            for (const b of bodies) {
              const f = fighterOf(b.side);
              if (!alive(f) || b.hookedBy || ctx.isAirborne(f) || time - b.dunkedAt < 1200) continue;
              if (dist(f.x, f.y, p.x, p.y) < BITE_R + 20) {
                h.phase = 'reel'; h.caught = b.side; b.hookedBy = h;
                ctx.hit(f, 6, f.x, f.y);
                ctx.sfx('trap-snap');
                ctx.float(f.x, f.y - 48, b.side === 'player' ? 'HOOKED' : 'HIS OWN HOOK', b.side === 'player' ? RCOL.red : RCOL.green);
                break;
              }
            }
            if (h.phase === 'fly' && (h.reach >= MAX_REACH || p.x < 30 || p.x > W - 30 || p.y < top || p.y > H - 20)) h.phase = 'back';
          }
          if (h.phase === 'reel' && h.caught) {
            const b = bodyOf(h.caught), f = fighterOf(h.caught);
            if (!alive(f)) { b.hookedBy = null; h.caught = null; h.phase = 'back'; continue; }
            const d = dist(f.x, f.y, hole.x, hole.y);
            h.ang = Math.atan2(f.y - hole.y, f.x - hole.x);
            h.reach = d;
            if (d < HOLE_R - 4) dunk(b, h);
            else {
              const step = Math.min(d, REEL * (forked ? 1.15 : 1) * dt);
              ctx.nudge(f, (hole.x - f.x) / d * step, (hole.y - f.y) / d * step);
              drumSpin += dt * 6;
            }
          }
          if (h.phase === 'back') h.reach -= 900 * dt;
        }
        for (let i = hooks.length - 1; i >= 0; i--) if (hooks[i].phase === 'back' && hooks[i].reach <= 0) hooks.splice(i, 1);
      },

      playerSpeedMult: () => (bodyOf('player').hookedBy ? 0.45 : 1),
      npcSpeedMult: () => (bodyOf('npc').hookedBy ? 0.45 : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc, p = ctx.player;
        // Hooked: to the drum, to knock his own pawl loose.
        if (bodyOf('npc').hookedBy) return { x: drumAt.x + 34, y: drumAt.y + 10 };
        // A lane painted under him: off it, the short way.
        for (const h of hooks) {
          if (h.phase !== 'warn') continue;
          const ex = hole.x + Math.cos(h.ang) * MAX_REACH, ey = hole.y + Math.sin(h.ang) * MAX_REACH;
          if (segDist(n.x, n.y, hole.x, hole.y, ex, ey) < 80) {
            const side = (n.x - hole.x) * -Math.sin(h.ang) + (n.y - hole.y) * Math.cos(h.ang) >= 0 ? 1 : -1;
            return { x: tk.clampX(n.x - Math.sin(h.ang) * side * 120), y: tk.clampY(n.y + Math.cos(h.ang) * side * 120) };
          }
        }
        // Otherwise: beside you, off your line to the hole, so the next hook has a clear run at you.
        const a = Math.atan2(p.y - hole.y, p.x - hole.x) + 1.1;
        const d = Math.max(140, dist(p.x, p.y, hole.x, hole.y));
        return { x: tk.clampX(hole.x + Math.cos(a) * d), y: tk.clampY(hole.y + Math.sin(a) * d) };
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        // Trodden ring of slush where the debtors are walked up to the hole.
        g.fillStyle(R.slush, 0.35); g.fillEllipse(hole.x, hole.y + 4, HOLE_R * 4.4, HOLE_R * 3.2);
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * Math.PI * 2;
          g.fillStyle(R.snowShade, 0.55); g.fillEllipse(hole.x + Math.cos(a) * HOLE_R * 1.9, hole.y + Math.sin(a) * HOLE_R * 1.4, 9, 5);
        }
        // The hole: black water, a skin of new ice round the edge.
        g.fillStyle(R.iceDark, 1); g.fillCircle(hole.x, hole.y, HOLE_R + 6);
        g.fillStyle(R.water, 1); g.fillCircle(hole.x, hole.y, HOLE_R);
        const k = (t * 0.5) % 1;
        g.lineStyle(1.5, R.waterLit, 0.5 * (1 - k)); g.strokeCircle(hole.x, hole.y, HOLE_R * k);
        // A face, pale and asleep, turning slowly far down.
        g.fillStyle(0x6a8a9a, 0.14); g.fillEllipse(hole.x + Math.sin(t * 0.3) * 12, hole.y + 6, 18, 30);
        // The grate: iron bars, swung open for a moment after someone goes through.
        const open = Math.max(0, 1 - (time - grateOpenAt) / 900);
        const squash = 1 - open * 0.85;
        g.lineStyle(4, R.iron, 1);
        for (let i = -3; i <= 3; i++) {
          const x = hole.x + i * 12 * squash;
          const hh = Math.sqrt(Math.max(0, HOLE_R * HOLE_R - (i * 12) ** 2));
          g.lineBetween(x, hole.y - hh, x, hole.y + hh);
        }
        g.lineStyle(3, R.iron, 1); g.lineBetween(hole.x - HOLE_R * squash, hole.y, hole.x + HOLE_R * squash, hole.y);
        g.lineStyle(1, R.ironLit, 0.6); g.strokeCircle(hole.x, hole.y, HOLE_R + 1);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle(R.ironLit, 1); g.fillCircle(hole.x + Math.cos(a) * HOLE_R, hole.y + Math.sin(a) * HOLE_R, 2.4); }
        // Painted lanes: a dotted rope across the ice, filling in as the throw comes.
        for (const h of hooks) {
          if (h.phase !== 'warn') continue;
          const p = Math.min(1, (time - h.t0) / WARN_MS);
          const n = 30;
          for (let i = 2; i < n; i++) {
            const r = (i / n) * MAX_REACH;
            const x = hole.x + Math.cos(h.ang) * r, y = hole.y + Math.sin(h.ang) * r;
            if (x < 20 || x > W - 20 || y < top || y > H - 10) break;
            const lit = i / n < p;
            g.fillStyle(lit ? R.scarf : R.rope, lit ? 0.85 : 0.45); g.fillCircle(x, y, lit ? 3.6 : 2.4);
          }
          g.lineStyle(2, R.scarf, 0.25 + p * 0.3);
          const ex = hole.x + Math.cos(h.ang) * MAX_REACH, ey = hole.y + Math.sin(h.ang) * MAX_REACH;
          g.lineBetween(hole.x + Math.cos(h.ang + 0.08) * 60, hole.y + Math.sin(h.ang + 0.08) * 60, ex, ey);
        }
        // The drum's sledge: two runners and a deck, with the coil of spare rope beside it.
        shadow(g, drumAt.x, drumAt.y + 18, 92, 22);
        g.fillStyle(R.timberDark, 1); g.fillRect(drumAt.x - 44, drumAt.y + 14, 88, 5); g.fillRect(drumAt.x - 44, drumAt.y - 2, 88, 5);
        g.fillStyle(R.timber, 1); g.fillRect(drumAt.x - 38, drumAt.y - 6, 76, 22);
        for (let i = 0; i < 4; i++) { g.lineStyle(1, R.timberDark, 0.8); g.lineBetween(drumAt.x - 38 + i * 19, drumAt.y - 6, drumAt.x - 38 + i * 19, drumAt.y + 16); }
        for (let i = 0; i < 3; i++) { g.lineStyle(3, R.rope, 0.9); g.strokeEllipse(drumAt.x + 62, drumAt.y + 8, 30 - i * 8, 14 - i * 4); }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        // The winch drum on its cheeks, the rope wound on it, the crank and the pawl.
        const spin = drumSpin + Math.max(0, 1 - (time - drumSpinAt) / 700) * 24;
        g.fillStyle(R.iron, 1); g.fillRect(drumAt.x - 30, drumAt.y - 34, 6, 34); g.fillRect(drumAt.x + 24, drumAt.y - 34, 6, 34);
        g.fillStyle(R.timberLit, 1); g.fillRoundedRect(drumAt.x - 24, drumAt.y - 34, 48, 26, 6);
        for (let i = 0; i < 7; i++) {
          const y = drumAt.y - 32 + ((i * 4 + spin * 4) % 26);
          g.lineStyle(2, R.rope, 0.95); g.lineBetween(drumAt.x - 23, y, drumAt.x + 23, y + 1.5);
        }
        const ca = spin;
        g.lineStyle(3, R.ironLit, 1); g.lineBetween(drumAt.x + 30, drumAt.y - 21, drumAt.x + 30 + Math.cos(ca) * 14, drumAt.y - 21 + Math.sin(ca) * 14);
        g.fillStyle(R.timberDark, 1); g.fillCircle(drumAt.x + 30 + Math.cos(ca) * 14, drumAt.y - 21 + Math.sin(ca) * 14, 3.5);
        g.fillStyle(R.brass, 1); g.fillCircle(drumAt.x - 27, drumAt.y - 21, 4);
        g.lineStyle(2, R.brass, 1); g.lineBetween(drumAt.x - 27, drumAt.y - 21, drumAt.x - 22, drumAt.y - 10);
        const reeling = hooks.some((h) => h.phase === 'reel');
        if (reeling) glow(g, drumAt.x, drumAt.y - 20, 34, R.scarf, 0.05, 3);
        // The A-frame over the hole: three spars to a block, the rope dropping from the sheave.
        const apex: Pt = { x: hole.x, y: hole.y - 118 };
        g.lineStyle(6, R.timberDark, 1);
        g.lineBetween(hole.x - HOLE_R - 18, hole.y + 10, apex.x, apex.y);
        g.lineBetween(hole.x + HOLE_R + 18, hole.y + 10, apex.x, apex.y);
        g.lineStyle(4, R.timber, 1);
        g.lineBetween(hole.x - HOLE_R - 16, hole.y + 8, apex.x - 1, apex.y + 2);
        g.lineBetween(hole.x + HOLE_R + 16, hole.y + 8, apex.x + 1, apex.y + 2);
        g.lineStyle(2, R.rope, 0.9); g.lineBetween(hole.x - 30, hole.y - 50, hole.x + 30, hole.y - 50);
        g.fillStyle(R.iron, 1); g.fillCircle(apex.x, apex.y, 8);
        g.fillStyle(R.ironLit, 1); g.fillCircle(apex.x, apex.y, 4);
        for (let i = 0; i < 5; i++) { g.fillStyle(R.rime, 0.8); g.fillCircle(apex.x - 14 + i * 7, apex.y - 6 + jit(4, i) * 4, 1.6); }
        g.lineStyle(2, R.rope, 1); g.lineBetween(apex.x, apex.y, drumAt.x, drumAt.y - 26);
        // Each hook: rope from the sheave to the head, barbed iron J at the end.
        for (const h of hooks) {
          if (h.phase === 'warn') {
            const sway = Math.sin(t * 9) * 5;
            g.lineStyle(2, R.rope, 1); g.lineBetween(apex.x, apex.y, hole.x + sway, hole.y - 30);
            drawHookHead(g, hole.x + sway, hole.y - 30, h.ang, 1);
            continue;
          }
          const p = head(h);
          const hx = p.x, hy = h.phase === 'fly' ? p.y - 22 - Math.sin(Math.min(1, h.reach / MAX_REACH) * Math.PI) * 30 : p.y - 8;
          g.lineStyle(4, R.timberDark, 0.5); g.lineBetween(apex.x, apex.y, hx, hy + 2);
          g.lineStyle(2.4, R.rope, 1); g.lineBetween(apex.x, apex.y, hx, hy);
          // Lay of the rope: little twists along it.
          for (let i = 1; i < 10; i++) {
            const k = i / 10;
            const x = apex.x + (hx - apex.x) * k, y = apex.y + (hy - apex.y) * k;
            g.lineStyle(1, R.timberDark, 0.7); g.lineBetween(x - 2, y - 2, x + 2, y + 2);
          }
          drawHookHead(g, hx, hy, h.ang, h.phase === 'reel' ? 1.15 : 1);
          if (h.phase === 'fly') { g.fillStyle(0x000000, 0.2); g.fillEllipse(p.x, p.y + 4, 18, 6); }
          if (h.phase === 'reel') {
            // The ice scoured where they are dragged.
            for (let i = 0; i < 5; i++) {
              const r = h.reach + 8 + i * 9;
              g.fillStyle(R.snow, 0.5 - i * 0.08); g.fillCircle(hole.x + Math.cos(h.ang) * r, hole.y + Math.sin(h.ang) * r + 10, 3 - i * 0.4);
            }
          }
        }
        // Spray where someone just went through.
        const sp = 1 - (time - grateOpenAt) / 700;
        if (sp > 0) for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          g.fillStyle(R.frost, sp); g.fillCircle(hole.x + Math.cos(a) * (HOLE_R + (1 - sp) * 40), hole.y + Math.sin(a) * (HOLE_R + (1 - sp) * 30) - (1 - sp) * 30, 3);
        }
        drawGlint(g, apex.x + 6, apex.y - 3, 4, 0.5 + Math.sin(t * 3) * 0.3);
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // The winch slate: chalk tallies of who has gone under, a column each.
        const x = 16, y = H - 96;
        g.fillStyle(R.timberDark, 1); g.fillRoundedRect(x - 4, y - 4, 156, 86, 4);
        g.fillStyle(0x1e2428, 1); g.fillRect(x, y, 148, 78);
        g.lineStyle(1, 0xe8e8e0, 0.4); g.lineBetween(x + 74, y + 6, x + 74, y + 72);
        // A little drawn head over each column: yours plain, his under a sou'wester brim.
        g.fillStyle(0xe8e8e0, 0.85); g.fillCircle(x + 37, y + 14, 5); g.fillCircle(x + 111, y + 14, 5);
        g.fillRect(x + 102, y + 8, 18, 3);
        for (const b of bodies) {
          const cx = b.side === 'player' ? x + 14 : x + 88;
          for (let i = 0; i < Math.min(10, b.dunks); i++) {
            const grp = Math.floor(i / 5), k = i % 5;
            const bx = cx + grp * 28 + k * 5, by = y + 30;
            g.lineStyle(2, 0xf0f0e8, 0.9);
            if (k < 4) g.lineBetween(bx, by, bx + 1, by + 26);
            else g.lineBetween(bx - 21, by + 22, bx + 2, by + 4);
          }
        }
        // Hooked: a strain gauge of how far is left to the hole, ticking red.
        const me = bodyOf('player').hookedBy;
        if (me) {
          const d = dist(ctx.player.x, ctx.player.y, hole.x, hole.y);
          const k = Math.max(0, Math.min(1, (d - HOLE_R) / 300));
          const bx = W / 2 - 110, by = H - 30;
          g.fillStyle(0x000000, 0.5); g.fillRoundedRect(bx - 4, by - 4, 228, 16, 6);
          g.fillStyle(R.rope, 1); g.fillRect(bx, by, 220 * k, 8);
          for (let i = 0; i < 22; i++) { g.lineStyle(1, R.timberDark, 0.8); g.lineBetween(bx + i * 10, by, bx + i * 10 + 4, by + 8); }
          if (Math.floor(time / 180) % 2 === 0) { g.lineStyle(2, R.scarf, 0.9); g.strokeRoundedRect(bx - 4, by - 4, 228, 16, 6); }
          g.fillStyle(R.water, 1); g.fillCircle(bx - 14, by + 4, 8); g.lineStyle(2, R.iron, 1); g.strokeCircle(bx - 14, by + 4, 8);
        }
      },

      destroy() { drum.remove(); },
    };
  },
};

/** The winch hook: a forged iron J with a barb, an eye at the top where the rope is spliced on. */
function drawHookHead(g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, s: number): void {
  const c = Math.cos(ang), sn = Math.sin(ang);
  const P = (u: number, v: number): Pt => ({ x: x + (c * u - sn * v) * s, y: y + (sn * u + c * v) * s });
  const a = P(-4, 0), b = P(10, 0), m = P(14, 6), e = P(10, 12), f = P(4, 10), barb = P(6, 5);
  g.lineStyle(4.5, 0x1a1c20, 1);
  g.lineBetween(a.x, a.y, b.x, b.y); g.lineBetween(b.x, b.y, m.x, m.y); g.lineBetween(m.x, m.y, e.x, e.y); g.lineBetween(e.x, e.y, f.x, f.y);
  g.lineStyle(2.5, R.ironLit, 1);
  g.lineBetween(a.x, a.y, b.x, b.y); g.lineBetween(b.x, b.y, m.x, m.y); g.lineBetween(m.x, m.y, e.x, e.y); g.lineBetween(e.x, e.y, f.x, f.y);
  g.lineStyle(2, R.ironLit, 1); g.lineBetween(f.x, f.y, barb.x, barb.y);
  g.lineStyle(2, R.iron, 1); g.strokeCircle(a.x, a.y, 3 * s);
  g.fillStyle(R.frost, 0.9); g.fillCircle(m.x, m.y, 1.4);
}
