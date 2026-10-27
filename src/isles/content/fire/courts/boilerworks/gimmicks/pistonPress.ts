import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit } from '../../../../../art/IsleArt';
import { BRASS, IRON, IRON_LIT, RIVET, clamp, frameClock, rivets } from '../util';

/**
 * Piston Press — Press-Hand Dunk works the stamping hall, where a ceiling of drop-pistons beats
 * brand-plates flat. The floor is a 6×4 grid of stamping beds. The pistons come down in
 * *patterns* — rows marching across with one bed left open, columns sweeping the other way, a
 * checkerboard and its answer, and a cross aimed at wherever the player stands.
 *
 * Every slam is announced by its shadow: a dark square swelling on the bed and the piston
 * head visibly descending out of the roof. A slam hits **anyone** on the bed and leaves them
 * dazed (heavily slowed) for a moment, so luring Dunk under a falling row is the whole game.
 * The open bed in a marching row only ever shifts one step from the row before, so it can
 * always be walked.
 */

interface Slam { c: number; r: number; firesAt: number; bornAt: number; done: boolean; liftAt: number }

const COLS = 6;
const ROWS = 4;
const WARN_MS = 1150;
const DOWN_MS = 420;

function makePistonPress(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const cw = W / COLS;
  const ch = (H - top) / ROWS;
  const dmg = hard ? 24 : 18;
  const warn = hard ? 950 : WARN_MS;
  const tick = frameClock();

  const slams: Slam[] = [];
  let dazedP = 0;
  let dazedN = 0;
  let nextPattern = ctx.scene.time.now + 2400;
  let patternIdx = 0;
  const dust: { x: number; y: number; r: number; life: number }[] = [];

  const cellOf = (x: number, y: number): { c: number; r: number } => ({
    c: clamp(Math.floor(x / cw), 0, COLS - 1), r: clamp(Math.floor((y - top) / ch), 0, ROWS - 1),
  });
  const cellMid = (c: number, r: number): Pt => ({ x: cw * (c + 0.5), y: top + ch * (r + 0.5) });
  const alive = (f: Fighter): boolean => f.active && f.hp > 0;

  const queue = (c: number, r: number, delay: number, time: number): void => {
    slams.push({ c, r, firesAt: time + delay + warn, bornAt: time + delay, done: false, liftAt: time + delay + warn + DOWN_MS });
  };

  let echoAt = 0;
  const cross = (time: number): void => {
    const at = cellOf(ctx.player.x, ctx.player.y);
    for (let c = 0; c < COLS; c++) queue(c, at.r, 0, time);
    for (let r = 0; r < ROWS; r++) if (r !== at.r) queue(at.c, r, 0, time);
  };

  /** The four patterns, in rotation. Each returns how long it keeps the hall busy. */
  const patterns: ((time: number) => number)[] = [
    // Rows march top→bottom (or back), one open bed drifting by at most one per row.
    (time) => {
      const down = ctx.rng() < 0.5;
      let gap = Math.floor(ctx.rng() * COLS);
      for (let i = 0; i < ROWS; i++) {
        const r = down ? i : ROWS - 1 - i;
        for (let c = 0; c < COLS; c++) if (c !== gap) queue(c, r, i * 620, time);
        gap = clamp(gap + (ctx.rng() < 0.5 ? -1 : 1), 0, COLS - 1);
      }
      return ROWS * 620 + warn + 900;
    },
    // Columns sweep across from the side the player is *not* on, one open bed drifting.
    (time) => {
      const fromLeft = ctx.player.x > W / 2;
      let gap = Math.floor(ctx.rng() * ROWS);
      for (let i = 0; i < COLS; i++) {
        const c = fromLeft ? i : COLS - 1 - i;
        for (let r = 0; r < ROWS; r++) if (r !== gap) queue(c, r, i * 480, time);
        gap = clamp(gap + (ctx.rng() < 0.5 ? -1 : 1), 0, ROWS - 1);
      }
      return COLS * 480 + warn + 900;
    },
    // Checkerboard, then its answer: stand on one colour, then step to the other.
    (time) => {
      const k = ctx.rng() < 0.5 ? 0 : 1;
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        if ((c + r) % 2 === k) queue(c, r, 0, time);
        else queue(c, r, warn + 700, time);
      }
      return warn * 2 + 700 + 900;
    },
    // Dunk's cross: the player's row and column. Step diagonally. Hard: an echo cross follows.
    (time) => {
      cross(time);
      if (hard) { echoAt = time + warn + 450; return warn * 2 + 1300; }
      return warn + 1200;
    },
  ];

  const stamp = (f: Fighter, s: Slam, isPlayer: boolean, time: number): void => {
    if (!alive(f)) return;
    const at = cellOf(f.x, f.y);
    if (at.c !== s.c || at.r !== s.r) return;
    ctx.hit(f, dmg, f.x, f.y);
    if (isPlayer) dazedP = time + 1000; else { dazedN = time + 1200; ctx.float(f.x, f.y - 36, 'STAMPED', '#ffe08a'); }
  };

  return {
    update(time) {
      const dt = tick(time);
      if (time >= nextPattern) {
        const busy = patterns[patternIdx % patterns.length](time);
        patternIdx++;
        nextPattern = time + busy + (hard ? 500 : 1100);
        if (patternIdx % 4 === 1) ctx.float(W / 2, top + 30, 'PRESS ON!', '#ffd27a');
      }
      if (echoAt && time >= echoAt) { echoAt = 0; cross(time); }
      let boomed = false;
      for (const s of slams) {
        if (s.done || time < s.firesAt) continue;
        s.done = true;
        stamp(ctx.player, s, true, time);
        stamp(ctx.npc, s, false, time);
        const m = cellMid(s.c, s.r);
        dust.push({ x: m.x, y: m.y, r: 20, life: 0.5 });
        boomed = true;
      }
      if (boomed) { ctx.sfx('stone-slam'); ctx.scene.cameras.main.shake(90, 0.004); }
      for (let i = slams.length - 1; i >= 0; i--) if (slams[i].done && time > slams[i].liftAt + 300) slams.splice(i, 1);
      for (const d of dust) { d.r += 220 * dt; d.life -= dt; }
      for (let i = dust.length - 1; i >= 0; i--) if (dust[i].life <= 0) dust.splice(i, 1);
    },

    playerSpeedMult: () => (ctx.scene.time.now < dazedP ? 0.4 : 1),
    npcSpeedMult: () => (ctx.scene.time.now < dazedN ? 0.4 : 1),

    npcSeek(): Pt | null {
      const now = ctx.scene.time.now;
      const n = ctx.npc;
      const danger = new Set<string>();
      for (const s of slams) if (!s.done && s.firesAt - now < warn * 0.9 + 200) danger.add(`${s.c},${s.r}`);
      const here = cellOf(n.x, n.y);
      if (!danger.has(`${here.c},${here.r}`)) return null;
      let best: Pt | null = null;
      let bd = Infinity;
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        if (danger.has(`${c},${r}`)) continue;
        const m = cellMid(c, r);
        const d = Math.hypot(m.x - n.x, m.y - n.y);
        if (d < bd) { bd = d; best = m; }
      }
      return best;
    },

    drawGround(g, time) {
      // Bed outlines: stamped steel frames with brass corner bolts.
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        const x = c * cw, y = top + r * ch;
        g.lineStyle(3, dim(IRON, 0.5), 0.9); g.strokeRect(x + 3, y + 3, cw - 6, ch - 6);
        g.lineStyle(1, IRON_LIT, 0.35); g.strokeRect(x + 6, y + 6, cw - 12, ch - 12);
        for (const [bx, by] of [[x + 10, y + 10], [x + cw - 10, y + 10], [x + 10, y + ch - 10], [x + cw - 10, y + ch - 10]]) {
          g.fillStyle(BRASS, 0.8); g.fillCircle(bx, by, 2.4);
        }
      }
      // Shadows swell under descending pistons.
      for (const s of slams) {
        const x = s.c * cw, y = top + s.r * ch;
        if (!s.done) {
          if (time < s.bornAt) continue;
          const k = clamp((time - s.bornAt) / (s.firesAt - s.bornAt), 0, 1);
          const iw = (cw - 14) * (0.35 + k * 0.65), ih = (ch - 14) * (0.35 + k * 0.65);
          const m = cellMid(s.c, s.r);
          g.fillStyle(0x000000, 0.18 + k * 0.42); g.fillRect(m.x - iw / 2, m.y - ih / 2, iw, ih);
          g.lineStyle(2, 0xffc060, 0.25 + k * 0.6); g.strokeRect(x + 6, y + 6, cw - 12, ch - 12);
          if (k > 0.8 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.5); g.strokeRect(x + 4, y + 4, cw - 8, ch - 8); }
        } else if (time < s.liftAt + 300) {
          // Fresh stamp: the bed glows from the strike, cracks radiate.
          const a = clamp(1 - (time - s.firesAt) / (DOWN_MS + 300), 0, 1);
          const m = cellMid(s.c, s.r);
          g.fillStyle(0xffb050, 0.18 * a); g.fillRect(x + 6, y + 6, cw - 12, ch - 12);
          g.lineStyle(1.5, 0x111111, 0.6 * a);
          for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2 + s.c;
            g.lineBetween(m.x, m.y, m.x + Math.cos(ang) * cw * 0.4, m.y + Math.sin(ang) * ch * 0.4);
          }
        }
      }
      for (const d of dust) {
        g.lineStyle(3, 0xcfc4b0, d.life * 1.2); g.strokeCircle(d.x, d.y, d.r);
      }
    },

    drawAir(g, time) {
      // The pistons themselves: a steel head on a polished rod dropping out of the roof.
      for (const s of slams) {
        let drop: number;
        if (!s.done) {
          if (time < s.bornAt) continue;
          const k = clamp((time - s.bornAt) / (s.firesAt - s.bornAt), 0, 1);
          // Hang high, then fall fast at the end.
          drop = k < 0.75 ? k * 0.25 : 0.19 + ((k - 0.75) / 0.25) ** 2 * 0.81;
        } else if (time < s.liftAt) drop = 1;
        else if (time < s.liftAt + 300) drop = 1 - (time - s.liftAt) / 300;
        else continue;
        const m = cellMid(s.c, s.r);
        const hw = cw * 0.38, hh = ch * 0.3;
        const headY = m.y - (1 - drop) * 260;
        const a = clamp(0.25 + drop, 0, 1);
        // Rod up to the roof.
        g.fillStyle(0x8a929c, a); g.fillRect(m.x - 9, top - 10, 18, headY - hh - top + 10);
        g.fillStyle(0xd8dee6, a * 0.8); g.fillRect(m.x - 5, top - 10, 4, headY - hh - top + 10);
        // Head block.
        g.fillStyle(dim(IRON, 0.4), a); g.fillRect(m.x - hw - 2, headY - hh - 2, hw * 2 + 4, hh * 2 + 4);
        g.fillStyle(IRON, a); g.fillRect(m.x - hw, headY - hh, hw * 2, hh * 2);
        g.fillStyle(lit(IRON, 0.25), a); g.fillRect(m.x - hw, headY - hh, hw * 2, 4);
        g.fillStyle(0xd9a92a, a * 0.9); g.fillRect(m.x - hw, headY + hh - 8, hw * 2, 5);
        rivets(g, { x: m.x - hw + 6, y: headY - hh + 9 }, { x: m.x + hw - 6, y: headY - hh + 9 }, 16, 1.4, RIVET);
        // The King's brand on the die face, so stamped beds read as branded.
        g.lineStyle(2, 0xff7a2f, a * 0.7); g.strokeCircle(m.x, headY, hh * 0.45);
      }
      // Dazed stars.
      const now = time;
      for (const [f, until] of [[ctx.player, dazedP], [ctx.npc, dazedN]] as [Fighter, number][]) {
        if (now >= until || !alive(f)) continue;
        for (let i = 0; i < 3; i++) {
          const a = now / 180 + (i * Math.PI * 2) / 3;
          g.fillStyle(0xffe08a, 0.9); g.fillCircle(f.x + Math.cos(a) * 16, f.y - 40 + Math.sin(a) * 5, 2.6);
        }
      }
    },
  };
}

export const PISTON_PRESS: GimmickDef = {
  id: 'boilerworks-piston-press',
  rules: 'Pistons stamp the floor in patterns behind growing shadows. A stamp hits anyone under it and dazes them.',
  make: makePistonPress,
};
