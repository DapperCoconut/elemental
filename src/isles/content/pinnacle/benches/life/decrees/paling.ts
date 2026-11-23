import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { GREEN, OBS, poly } from '../art';
import { WHO, type Who, alive, clamp, fighterOf } from './util';

/**
 * Decree of the Paling — Councilor Ysolde Gamekeep, Seat of the Chase (hunt).
 *
 * Gamekeep wrote the game laws of the Wildhunt: the parks, the pales round them, and the drives
 * that sent beaters through the wood to push every living thing onto the stakes. The fight is
 * fenced by a pale of glass stakes with green-lit points. Brush it and it cuts (6, shoved back
 * in). Hit it at speed — a dash, a pounce, a blink, a body thrown — and you are IMPALED: 18 and
 * stunned. Every twelve seconds the beaters drum and THE DRIVE begins: the whole pale marches
 * inward, holds, then draws back; anyone it overtakes is swept in on its stakes.
 *
 * Hunt perfected throws you — shotgun, grapple, wall slam — and the pale turns every throw into
 * an impaling. But she pounces and lunges constantly, and a pounce that lands in the pale is hers.
 */

const CUT = 6;
const IMPALE = 18;
const IMPALE_STUN = 1200;
const BAND = 22;
const DRIVE_WARN = 1800;
const DRIVE_IN = 1000;
const DRIVE_HOLD = 4000;
const DRIVE_OUT = 1200;
const OUTER = 26;
const INNER_X = 170;
const INNER_Y = 110;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const every = ctx.hard ? 10000 : 12000;
  let next = 0;
  let phase: 'still' | 'warn' | 'in' | 'hold' | 'out' = 'still';
  let at = 0;
  let inset = 0;
  const cutCd: Record<Who, number> = { player: 0, npc: 0 };
  const impaledAt: Record<Who, number> = { player: -9999, npc: -9999 };
  const drumAt: number[] = [];

  /** The pen's current rect. `inset` 0 = at the field edge, 1 = fully driven in. */
  const pen = (k = inset) => ({
    l: OUTER + (INNER_X - OUTER) * k,
    r: W - OUTER - (INNER_X - OUTER) * k,
    t: top + OUTER + (INNER_Y - OUTER) * k,
    b: H - OUTER - (INNER_Y - OUTER) * k,
  });

  const touch = (w: Who, time: number) => {
    const f = fighterOf(ctx, w);
    const p = pen();
    const dl = f.x - p.l, dr = p.r - f.x, dt = f.y - p.t, db = p.b - f.y;
    const m = Math.min(dl, dr, dt, db);
    if (m > BAND) return;
    // Which way is in.
    let nx = 0, ny = 0;
    if (m === dl) nx = 1; else if (m === dr) nx = -1; else if (m === dt) ny = 1; else ny = -1;
    const over = Math.max(0, BAND - m);
    if (ctx.dashing(f) && time - impaledAt[w] > 1600) {
      impaledAt[w] = time;
      cutCd[w] = time + 900;
      ctx.hit(f, IMPALE, f.x, f.y);
      ctx.stun(f, IMPALE_STUN);
      ctx.nudge(f, nx * (over + 40), ny * (over + 40));
      ctx.float(f.x, f.y - 56, 'IMPALED', '#ffffff');
      ctx.flash(f.x, f.y, GREEN.glow);
      ctx.sfx('stab');
      if (w === 'npc') ctx.banner('THE COUNCILOR IS ON THE PALE', '#c8ff9a');
      return;
    }
    if (time < cutCd[w]) { ctx.nudge(f, nx * over, ny * over); return; }
    cutCd[w] = time + 700;
    ctx.hit(f, CUT, f.x, f.y);
    ctx.nudge(f, nx * (over + 34), ny * (over + 34));
    ctx.sfx('thorn');
  };

  return {
    update(time) {
      if (next === 0) next = time + every;
      if (phase === 'still' && time >= next - DRIVE_WARN) {
        phase = 'warn'; at = next;
        ctx.banner('THE DRIVE — THE PALE CLOSES IN', '#c8ff9a');
        drumAt.length = 0;
        for (let i = 0; i < 4; i++) drumAt.push(time + i * (DRIVE_WARN / 4));
      }
      while (drumAt.length && time >= drumAt[0]) { drumAt.shift(); ctx.sfx('drum-hit'); }
      if (phase === 'warn' && time >= at) { phase = 'in'; at = time + DRIVE_IN; ctx.sfx('roar'); }
      if (phase === 'in') { inset = clamp(1 - (at - time) / DRIVE_IN, 0, 1); if (time >= at) { phase = 'hold'; at = time + DRIVE_HOLD; } }
      if (phase === 'hold' && time >= at) { phase = 'out'; at = time + DRIVE_OUT; }
      if (phase === 'out') { inset = clamp((at - time) / DRIVE_OUT, 0, 1); if (time >= at) { phase = 'still'; inset = 0; next = time + every; } }
      for (const w of WHO) if (alive(fighterOf(ctx, w))) touch(w, time);
    },

    npcSeek(): Pt | null {
      const p = ctx.player, n = ctx.npc;
      const r = pen(phase === 'warn' || phase === 'in' ? 1 : inset);
      const cx = (r.l + r.r) / 2, cy = (r.t + r.b) / 2;
      // Get on the inside of the player, so whatever she throws sends them onto the stakes.
      const a = Math.atan2(cy - p.y, cx - p.x);
      let x = p.x + Math.cos(a) * 130, y = p.y + Math.sin(a) * 130;
      // ...but never with her own back to the pale.
      x = clamp(x, r.l + 90, r.r - 90);
      y = clamp(y, r.t + 80, r.b - 80);
      if (Math.abs(n.x - x) < 8 && Math.abs(n.y - y) < 8) return null;
      return { x, y };
    },

    drawGround(g, time) {
      const r = pen();
      // Where the drive will stop: a dashed line of seeds, glowing as the beaters drum.
      if (phase === 'warn' || phase === 'in' || phase === 'hold') {
        const q = pen(1);
        const k = phase === 'warn' ? clamp(1 - (at - time) / DRIVE_WARN, 0, 1) : 1;
        g.lineStyle(2, GREEN.vineLit, 0.15 + k * 0.35);
        for (let x = q.l; x < q.r; x += 26) { g.lineBetween(x, q.t, x + 12, q.t); g.lineBetween(x, q.b, x + 12, q.b); }
        for (let y = q.t; y < q.b; y += 26) { g.lineBetween(q.l, y, q.l, y + 12); g.lineBetween(q.r, y, q.r, y + 12); }
        // The ground the pale will take goes dark.
        g.fillStyle(0x000000, 0.18 * k);
        g.fillRect(0, top, q.l, H - top); g.fillRect(q.r, top, W - q.r, H - top);
        g.fillRect(q.l, top, q.r - q.l, q.t - top); g.fillRect(q.l, q.b, q.r - q.l, H - q.b);
      }
      // Outside the pale: trampled, dark.
      g.fillStyle(0x05040a, 0.5);
      g.fillRect(0, top, r.l, H - top); g.fillRect(r.r, top, W - r.r, H - top);
      g.fillRect(r.l, top, r.r - r.l, r.t - top); g.fillRect(r.l, r.b, r.r - r.l, H - r.b);
      // The pale: a cord of vine strung stake to stake, the stakes leaning in.
      g.lineStyle(3, GREEN.vineDark, 0.9); g.strokeRect(r.l, r.t, r.r - r.l, r.b - r.t);
      g.lineStyle(1.4, GREEN.vine, 0.9); g.strokeRect(r.l, r.t - 2, r.r - r.l, r.b - r.t);
      const shiver = phase === 'warn' ? Math.sin(time / 30) * 1.5 : 0;
      const stake = (x: number, y: number, nx: number, ny: number, i: number) => {
        // A stake of black glass, angled in, point lit green.
        const len = 26 + (i % 3) * 4;
        const tx = x + nx * len * 0.55 + ny * shiver, ty = y + ny * len * 0.55 - len * 0.55 + nx * shiver;
        const px = -ny * 4.5, py = nx * 4.5;
        poly(g, [x - px, y - py, x + px, y + py, tx, ty], OBS.glass);
        poly(g, [x, y, x + px, y + py, tx, ty], OBS.facet);
        g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(x, y, tx, ty);
        g.fillStyle(GREEN.glow, 0.35); g.fillCircle(tx, ty, 4);
        g.fillStyle(GREEN.bud, 1); g.fillCircle(tx, ty, 1.4);
      };
      let i = 0;
      for (let x = r.l; x <= r.r; x += 30) { stake(x, r.t, 0, 1, i++); stake(x, r.b + 6, 0, -1, i++); }
      for (let y = r.t + 30; y < r.b; y += 30) { stake(r.l, y + 6, 1, 0, i++); stake(r.r, y + 6, -1, 0, i++); }
    },

    drawAir(g, time) {
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        const k = (time - impaledAt[w]) / 700;
        if (k < 0 || k > 1) continue;
        // Splinters of the stake that took them.
        for (let j = 0; j < 8; j++) {
          const a = j * 0.79;
          g.fillStyle(j % 2 ? OBS.edge : GREEN.vineLit, 1 - k);
          g.fillTriangle(f.x + Math.cos(a) * (10 + k * 40), f.y + Math.sin(a) * (10 + k * 40), f.x + Math.cos(a + 0.1) * (16 + k * 44), f.y + Math.sin(a + 0.1) * (16 + k * 44), f.x + Math.cos(a - 0.1) * (14 + k * 42), f.y + Math.sin(a - 0.1) * (14 + k * 42));
        }
      }
    },

    drawHud(g, time) {
      // The beaters' horn: a curved horn glyph that fills toward the next drive.
      const cx = W / 2, y = top + 16;
      const k = phase === 'still' ? clamp(1 - (next - DRIVE_WARN - time) / (every - DRIVE_WARN), 0, 1) : 1;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(cx - 80, y - 10, 160, 20, 8);
      g.fillStyle(phase === 'still' ? GREEN.leaf : 0xffffff, 0.9); g.fillRoundedRect(cx - 72, y - 4, 144 * k, 8, 4);
      g.lineStyle(3, OBS.edge, 0.9);
      g.beginPath(); g.arc(cx + 96, y + 6, 12, Math.PI, Math.PI * 1.75, false); g.strokePath();
      g.fillStyle(OBS.edge, 0.9); g.fillTriangle(cx + 104, y - 6, cx + 112, y - 12, cx + 112, y + 2);
    },
  };
}

export const DECREE_PALING: GimmickDef = {
  id: 'bench-life-paling',
  rules: 'A pale of glass stakes fences the floor: brush it and it cuts; hit it at speed and you are impaled (stunned). Every 12s THE DRIVE marches it inward.',
  make,
};
