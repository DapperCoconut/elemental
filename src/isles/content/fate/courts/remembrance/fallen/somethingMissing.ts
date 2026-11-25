import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fmn } from '../art';
import { fallenId } from '../../../../meteor/spec';
import {
  FMN_BLUE, GILT, GILT_DARK, GILT_LIT, GLASS, INK, MEM_ROSE, PAPER, PAVE_RED, SEPIA_DARK, SEPIA_DEEP, SEPIA_PALE,
  TIMBER, TIMBER_DARK, TIMBER_LIT,
} from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Something Missing — Dulcie Pargeter, in the true town the thief who lifted pledges back out
 * of the pawnshop windows and returned them to their owners. In the King's telling she never
 * rebelled at all: she dressed the windows on Pawn Row for the Prince, and kept what she liked.
 *
 * A window-dresser's velvet is spread over the yard with seven keepsakes laid out on it — a
 * locket, a pocket-watch, a baby's shoe, spectacles, a toy horse, a thimble, a posy — each with
 * its pawn ticket on a string. Look well. Dulcie throws a dust-sheet over the lot, and when she
 * whips it off, ONE IS GONE. Nothing marks where it lay but a patch of velvet the sun has not
 * faded. Whoever reaches the empty place first has remembered it: every keepsake left turns on
 * the other fighter and flies at them, one after another. Nobody in time, and the keepsakes
 * burst where they lie.
 *
 * It is a race and a memory test, and Dulcie is good at both. Past half she also swaps two of
 * the others while the sheet is down, so the layout itself lies to you. The bot remembers too —
 * it simply takes a beat to be sure.
 */

const ID = fallenId('remembrance', 'something-missing');
const LOOK_MS = 3300;
const COVER_MS = 1300;
const NAME_MS = 2800;
const BURST_MS = 760;
const REST_MS = 1500;
const REACH = 36;
const BURST_R = 62;

type Kind = 'locket' | 'watch' | 'shoe' | 'specs' | 'horse' | 'thimble' | 'posy';
const KINDS: Kind[] = ['locket', 'watch', 'shoe', 'specs', 'horse', 'thimble', 'posy'];
interface Keep { kind: Kind; x: number; y: number; gone: boolean }
type Phase = 'look' | 'cover' | 'name' | 'burst' | 'rest';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const cloth = { x: W / 2, y: (top + H) / 2 + 12, w: 620, h: 340 };
  const slots: { x: number; y: number }[] = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    slots.push({ x: cloth.x - 225 + c * 150 + (rng() - 0.5) * 30, y: cloth.y - 85 + r * 170 + (rng() - 0.5) * 30 });
  }
  const free = Math.floor(rng() * slots.length);
  const keeps: Keep[] = [];
  let k = 0;
  for (let i = 0; i < slots.length; i++) if (i !== free) keeps.push({ kind: KINDS[k++], x: slots[i].x, y: slots[i].y, gone: false });

  let phase: Phase = 'look';
  let phaseAt = 0;
  let started = false;
  let missing: Keep | null = null;
  let late = false;
  let now = 0;

  const go = (p: Phase): void => { phase = p; phaseAt = now; };
  /** First to the empty place: every keepsake left flies at the other, one after another. */
  const remembered = (by: Fighter): void => {
    const victim = by === player ? npc : player;
    ctx.sfx('jackpot');
    ctx.flash(by.x, by.y, GILT_LIT);
    const left = keeps.filter((kp) => !kp.gone);
    left.forEach((kp, i) => {
      tk.schedule(160 + i * 150, () => {
        if (!alive(victim)) return;
        const a = Math.atan2(victim.y - kp.y, victim.x - kp.x);
        if (victim === npc) tk.spawnBullet({ x: kp.x, y: kp.y - 10, angle: a, speed: 300, damage: 15, r: 7, color: GILT_LIT, hits: [npc], lifeMs: 2600 });
        else tk.spawnBullet({ x: kp.x, y: kp.y - 10, angle: a, speed: 280, damage: 8, r: 7, color: MEM_ROSE, lifeMs: 2600 });
        ctx.sfx('sparkle');
      });
    });
    go('rest');
  };

  return {
    update(time) {
      now = time;
      if (!started) { started = true; phaseAt = time; }
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true;
        ctx.banner('SLEIGHT OF HAND', '#f2d68a');
        ctx.sfx('curse-cast');
      }
      const el = time - phaseAt;
      if (phase === 'look' && el >= LOOK_MS) { go('cover'); ctx.sfx('whoosh'); }
      else if (phase === 'cover' && el >= COVER_MS) {
        const pool = keeps.filter((kp) => !kp.gone);
        missing = pool[Math.floor(rng() * pool.length)];
        missing.gone = true;
        if (late) {
          const rest = keeps.filter((kp) => !kp.gone);
          const a = rest[Math.floor(rng() * rest.length)];
          const others = rest.filter((kp) => kp !== a);
          const b = others[Math.floor(rng() * others.length)];
          if (a && b) { const tx = a.x, ty = a.y; a.x = b.x; a.y = b.y; b.x = tx; b.y = ty; }
        }
        go('name');
        ctx.sfx('smoke');
      } else if (phase === 'name') {
        if (missing) {
          const p = alive(player) && dist(player.x, player.y, missing.x, missing.y) < REACH;
          const n = alive(npc) && dist(npc.x, npc.y, missing.x, missing.y) < REACH;
          if (p || n) { remembered(p ? player : npc); return; }
        }
        if (el >= NAME_MS) { go('burst'); ctx.sfx('beam-charge'); }
      } else if (phase === 'burst' && el >= tk.warn(BURST_MS)) {
        ctx.sfx('explosion-small');
        for (const kp of keeps) {
          if (kp.gone) continue;
          tk.boom(kp.x, kp.y, BURST_R, MEM_ROSE);
          if (alive(player) && dist(player.x, player.y, kp.x, kp.y) < BURST_R + 18) tk.hitPlayer(16, player.x, player.y);
          if (alive(npc) && dist(npc.x, npc.y, kp.x, kp.y) < BURST_R + 18) ctx.hit(npc, 26, npc.x, npc.y);
        }
        go('rest');
      } else if (phase === 'rest' && el >= REST_MS) {
        if (missing) missing.gone = false;
        missing = null;
        go('look');
        ctx.sfx('crystal-chime');
      }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      const el = now - phaseAt;
      if (phase === 'name' && missing && el > (late ? 700 : 950)) return { x: missing.x, y: missing.y };
      if (phase === 'burst') {
        let near: Keep | null = null, nd = BURST_R + 40;
        for (const kp of keeps) { if (kp.gone) continue; const d = dist(npc.x, npc.y, kp.x, kp.y); if (d < nd) { nd = d; near = kp; } }
        if (near) { const d = nd || 1; return { x: tk.clampX(npc.x + ((npc.x - near.x) / d) * 110), y: tk.clampY(npc.y + ((npc.y - near.y) / d) * 110) }; }
      }
      return null;
    },

    drawGround(g, time) {
      drawVelvet(g, cloth);
      if (phase === 'name' && missing) {
        // The unfaded nap where it lay: the only clue, and a faint one.
        g.fillStyle(0x2a6a4a, 0.22); g.fillEllipse(missing.x, missing.y + 2, 40, 26);
      }
      const el = time - phaseAt;
      for (const kp of keeps) {
        if (kp.gone) continue;
        if (phase === 'burst') {
          const k = clamp(el / tk.warn(BURST_MS), 0, 1);
          g.lineStyle(2, MEM_ROSE, 0.5 + k * 0.5); g.strokeCircle(kp.x, kp.y, BURST_R);
          g.fillStyle(MEM_ROSE, 0.08 + 0.2 * k); g.fillCircle(kp.x, kp.y, BURST_R * k);
        }
      }
    },

    drawAir(g, time) {
      const el = time - phaseAt;
      const hidden = phase === 'cover' && el > COVER_MS * 0.22;
      if (!hidden) {
        for (const kp of keeps) if (!kp.gone) drawKeepsake(g, kp, time, phase === 'burst');
      }
      if (phase === 'cover') drawDustSheet(g, cloth, el / COVER_MS, time);
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 16;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 80, y - 13, 160, 28, 6);
      // A little velvet tray: seven places, the empty one dotted while you must name it.
      g.fillStyle(0x1e4a36, 1); g.fillRect(x - 72, y - 8, 76, 16);
      for (let i = 0; i < 7; i++) {
        const px = x - 66 + i * 10.5;
        const empty = phase === 'name' || phase === 'burst';
        if (empty && i === 3) { g.lineStyle(1, GILT_LIT, 0.6 + Math.sin(time / 90) * 0.4); g.strokeCircle(px, y, 3.5); }
        else { g.fillStyle(GILT, 1); g.fillCircle(px, y, 3); }
      }
      const el = time - phaseAt;
      const span = phase === 'look' ? LOOK_MS : phase === 'cover' ? COVER_MS : phase === 'name' ? NAME_MS : phase === 'burst' ? tk.warn(BURST_MS) : REST_MS;
      const kk = clamp(el / span, 0, 1);
      g.fillStyle(0x2a241e, 1); g.fillRect(x + 12, y - 4, 60, 8);
      g.fillStyle(phase === 'name' ? GILT_LIT : phase === 'burst' ? PAVE_RED : SEPIA_DARK, 1); g.fillRect(x + 12, y - 4, 60 * (phase === 'name' ? 1 - kk : kk), 8);
      g.lineStyle(1, GILT, 1); g.strokeRect(x + 12, y - 4, 60, 8);
    },
  };
}

/** The window-dresser's velvet: bottle-green, folds, a gilt fringe with tassels at the corners. */
function drawVelvet(g: G, c: { x: number; y: number; w: number; h: number }): void {
  const x0 = c.x - c.w / 2, y0 = c.y - c.h / 2;
  shadow(g, c.x, c.y + c.h / 2, c.w, 30, 0.25);
  g.fillStyle(0x163a2a, 1); g.fillRect(x0 - 4, y0 - 4, c.w + 8, c.h + 8);
  g.fillStyle(0x1e4a36, 1); g.fillRect(x0, y0, c.w, c.h);
  for (let i = 0; i < 9; i++) {
    const fx = x0 + 30 + i * 68;
    g.fillStyle(0x2a5a44, 0.35); g.fillPoints([{ x: fx, y: y0 }, { x: fx + 26, y: y0 }, { x: fx - 40, y: y0 + c.h }, { x: fx - 66, y: y0 + c.h }], true);
  }
  g.lineStyle(3, GILT_DARK, 1); g.strokeRect(x0, y0, c.w, c.h);
  for (let fx = x0 + 6; fx < x0 + c.w; fx += 9) {
    g.lineStyle(1.5, GILT, 0.9); g.lineBetween(fx, y0 + c.h, fx + 1, y0 + c.h + 7);
  }
  for (const [tx, ty] of [[x0, y0], [x0 + c.w, y0], [x0 + c.w, y0 + c.h], [x0, y0 + c.h]]) {
    g.fillStyle(GILT_DARK, 1); g.fillCircle(tx, ty, 6);
    g.fillStyle(GILT, 1); g.fillEllipse(tx, ty + 8, 7, 12);
    g.fillStyle(GILT_LIT, 1); g.fillCircle(tx - 1, ty - 1, 2);
  }
}

/** One keepsake on the velvet, with its pawn ticket on a string. */
function drawKeepsake(g: G, kp: Keep, time: number, hot: boolean): void {
  const { x, y } = kp;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 2, y + 6, 34, 10);
  // The ticket: a buff tag with a punched hole and a number in ink strokes.
  g.lineStyle(1, SEPIA_DARK, 0.9); g.lineBetween(x + 6, y - 2, x + 20, y + 10);
  g.fillStyle(PAPER, 1); g.fillRect(x + 16, y + 8, 16, 10);
  g.fillStyle(SEPIA_DARK, 1); g.fillCircle(x + 19, y + 13, 1.3);
  g.lineStyle(1, INK, 0.8); g.lineBetween(x + 22, y + 11, x + 29, y + 11); g.lineBetween(x + 22, y + 15, x + 27, y + 15);
  switch (kp.kind) {
    case 'locket':
      g.lineStyle(1, GILT, 1); g.beginPath(); g.arc(x, y - 18, 10, 0.3, Math.PI - 0.3, true); g.strokePath();
      g.fillStyle(GILT_DARK, 1); g.fillEllipse(x, y - 4, 20, 24);
      g.fillStyle(GILT, 1); g.fillEllipse(x, y - 5, 16, 20);
      g.lineStyle(1, GILT_LIT, 1); g.strokeEllipse(x, y - 5, 10, 13);
      g.fillStyle(MEM_ROSE, 0.6); g.fillCircle(x, y - 5, 2.5);
      break;
    case 'watch': {
      g.fillStyle(GILT_DARK, 1); g.fillCircle(x, y - 6, 12);
      g.fillStyle(SEPIA_PALE, 1); g.fillCircle(x, y - 6, 9.5);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle(INK, 1); g.fillCircle(x + Math.cos(a) * 7.5, y - 6 + Math.sin(a) * 7.5, 0.7); }
      const a = time / 2000;
      g.lineStyle(1.2, INK, 1); g.lineBetween(x, y - 6, x + Math.cos(a) * 6, y - 6 + Math.sin(a) * 6); g.lineBetween(x, y - 6, x + Math.cos(a / 12) * 4, y - 6 + Math.sin(a / 12) * 4);
      g.fillStyle(GILT, 1); g.fillRect(x - 2, y - 21, 4, 4); g.lineStyle(1.5, GILT, 1); g.strokeCircle(x, y - 23, 3);
      break;
    }
    case 'shoe':
      g.fillStyle(0xe8d8e0, 1); g.fillEllipse(x, y - 3, 26, 14);
      g.fillStyle(0xf6eaf0, 1); g.fillEllipse(x - 4, y - 8, 14, 10);
      g.fillStyle(SEPIA_DARK, 0.6); g.fillEllipse(x - 4, y - 8, 8, 5);
      g.lineStyle(1, MEM_ROSE, 1); g.lineBetween(x - 2, y - 12, x + 6, y - 14); g.lineBetween(x - 2, y - 12, x + 4, y - 8);
      g.fillStyle(MEM_ROSE, 1); g.fillCircle(x - 2, y - 12, 1.8);
      break;
    case 'specs':
      g.lineStyle(1.6, GILT, 1); g.strokeCircle(x - 8, y - 6, 7); g.strokeCircle(x + 8, y - 6, 7);
      g.fillStyle(GLASS, 0.35); g.fillCircle(x - 8, y - 6, 6); g.fillCircle(x + 8, y - 6, 6);
      g.lineBetween(x - 2, y - 7, x + 2, y - 7); g.lineBetween(x - 15, y - 7, x - 20, y - 2); g.lineBetween(x + 15, y - 7, x + 20, y - 2);
      g.fillStyle(0xffffff, 0.6); g.fillCircle(x - 10, y - 9, 1.5); g.fillCircle(x + 6, y - 9, 1.5);
      break;
    case 'horse':
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 12, y - 2, 24, 3);
      for (const lx of [-9, -4, 4, 9]) { g.fillStyle(TIMBER, 1); g.fillRect(x + lx - 1, y - 8, 2.5, 7); }
      g.fillStyle(TIMBER_LIT, 1); g.fillEllipse(x, y - 12, 22, 10);
      g.fillStyle(TIMBER_LIT, 1); g.fillPoints([{ x: x + 7, y: y - 14 }, { x: x + 12, y: y - 26 }, { x: x + 18, y: y - 22 }, { x: x + 11, y: y - 12 }], true);
      g.fillStyle(PAVE_RED, 1); g.fillRect(x - 4, y - 17, 8, 4);
      g.lineStyle(1.5, SEPIA_DEEP, 1); g.lineBetween(x + 10, y - 25, x + 7, y - 16); g.lineBetween(x - 11, y - 12, x - 15, y - 6);
      g.fillStyle(INK, 1); g.fillCircle(x + 14, y - 22, 1);
      break;
    case 'thimble':
      g.fillStyle(0x9a9aa4, 1); g.fillPoints([{ x: x - 8, y: y }, { x: x + 8, y: y }, { x: x + 6, y: y - 16 }, { x: x - 6, y: y - 16 }], true);
      g.fillStyle(0xc0c0ca, 1); g.fillEllipse(x, y - 16, 12, 5);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { g.fillStyle(0x5a5a64, 1); g.fillCircle(x - 5 + c * 3.3, y - 12 + r * 4, 0.8); }
      g.fillStyle(0x7a7a84, 1); g.fillRect(x - 8, y - 2, 16, 2);
      break;
    case 'posy':
      g.lineStyle(1.2, 0x4a6a3a, 1); for (const a of [-0.4, 0, 0.4]) g.lineBetween(x, y, x + Math.sin(a) * 14, y - 12);
      g.fillStyle(PAPER, 1); g.fillTriangle(x - 6, y - 6, x + 6, y - 6, x, y + 4);
      fmn(g, x - 6, y - 14, 1.3); fmn(g, x + 5, y - 15, 1.3); fmn(g, x, y - 18, 1.4);
      g.fillStyle(FMN_BLUE, 0.4); g.fillCircle(x, y - 15, 7);
      g.lineStyle(1.5, MEM_ROSE, 1); g.lineBetween(x - 4, y - 4, x + 4, y - 4);
      break;
  }
  if (hot) glow(g, x, y - 6, 34, MEM_ROSE, 0.06 + Math.sin(time / 50) * 0.03, 3);
  else glow(g, x, y - 6, 18, lit(GILT, 0.3), 0.025, 2);
}

/** The dust-sheet flung over the velvet: it sails in from the back, settles breathing, and is whipped away. */
function drawDustSheet(g: G, c: { x: number; y: number; w: number; h: number }, k: number, time: number): void {
  const inK = clamp(k / 0.22, 0, 1), outK = clamp((k - 0.82) / 0.18, 0, 1);
  const x0 = c.x - c.w / 2 - 14 + outK * (c.w + 60), y0 = c.y - c.h / 2 - 14 - (1 - inK) * (c.h * 0.8);
  const w = c.w + 28, h = (c.h + 28) * (0.3 + inK * 0.7);
  const a = 1 - outK * 0.6;
  g.fillStyle(0x000000, 0.22 * a); g.fillRect(x0 + 8, y0 + 12, w, h);
  g.fillStyle(0xe4dcc8, a); g.fillRoundedRect(x0, y0, w, h, 14);
  for (let i = 0; i < 6; i++) {
    const fx = x0 + 40 + i * (w / 6) + Math.sin(time / 300 + i) * 6;
    g.fillStyle(0xc8bea4, 0.6 * a); g.fillPoints([{ x: fx, y: y0 + 6 }, { x: fx + 16, y: y0 + 6 }, { x: fx + 30, y: y0 + h - 6 }, { x: fx + 6, y: y0 + h - 6 }], true);
  }
  // The lumps of what lies under it.
  for (let i = 0; i < 4; i++) { g.fillStyle(0xf2ecdc, 0.5 * a); g.fillEllipse(x0 + w * (0.2 + i * 0.2), y0 + h * (0.35 + (i % 2) * 0.3), 46, 20); }
  g.lineStyle(1.5, 0xb0a68c, a); g.strokeRoundedRect(x0, y0, w, h, 14);
}

export const FALLEN_SOMETHING_MISSING: GimmickDef = {
  id: ID,
  rules: 'Keepsakes lie on the velvet; under the dust-sheet one goes missing. First to where it lay sends the rest flying at the other. Too slow: they burst.',
  make,
};
