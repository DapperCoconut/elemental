import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  CLOTH_RED, FOE_C, GILT, INK, INK_SOFT, IRON, MINE_C, MYTH_LIT, PAGE, PARCH, PARCH_DARK, TIMBER, TIMBER_DARK,
  clamp, dist, frameClock, inkRect, inked, openBook, quill, scribble,
} from '../util';
import { alive, pagePlate } from './common';

/**
 * Told Back to You — Prosper Lectern, the Prince's Reader-Aloud, who in the King's telling read the
 * town its own day back every evening, the way the crown preferred it to have gone.
 *
 * He stands at his lectern and tells the stranger's story *as it happens* — a moment late. A paper
 * cut-out of the stranger walks exactly where you walked, a couple of seconds behind you, and the
 * Reader does the voices at it: the GIANT's boom (a wide ring that drops on the cut-out) and the
 * WOLF's growl (a short lunge along the way the cut-out is walking). Each voice is marked on the
 * floor first. Walk on and you are clear of it; double back over your own tracks and you walk into
 * your own story.
 *
 * The exploit is the trail: the voices strike whoever stands there, and the one who follows you
 * walks your tracks — lead the Reader down your path and his own voices land on him. At half
 * health he reads faster (the cut-out closes on your heels) and the story starts printing itself:
 * the cut-out leaves lines of wet type behind it that hold whoever steps in them.
 */

const ID = fallenId('fable', 'told-back');
const LAG_MS = 2300;
const LAG_LATE_MS = 1600;
const VOICE_EVERY = 1500;
const VOICE_LATE = 1150;
const GIANT_R = 88;
const GIANT_WARN = 1050;
const WOLF_LEN = 230;
const WOLF_HW = 30;
const WOLF_WARN = 800;
const TYPE_MS = 4000;

type Voice = 'giant' | 'wolf';
interface Sample { t: number; x: number; y: number }
interface Burst { kind: Voice; x: number; y: number; ang: number; at: number; fireAt: number; fired: boolean }
interface Type { x: number; y: number; ang: number; at: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk, player, npc } = ctx;
  const step = frameClock();
  const LX = W / 2, LY = top + 70;

  let started = false;
  let late = false;
  let nextVoice = 0;
  let voiceIx = 0;
  let trail: Sample[] = [];
  let bursts: Burst[] = [];
  let types: Type[] = [];
  let lastType = 0;
  let lastTypeTick = 0;
  let speaking = -9999;

  const lag = (): number => (late ? LAG_LATE_MS : LAG_MS);

  /** Where the cut-out stands: the stranger's position `lag` ms ago, and its heading. */
  const cutout = (time: number): { p: Pt; ang: number } | null => {
    const t = time - lag();
    if (!trail.length || trail[0].t > t) return null;
    let i = 0;
    while (i < trail.length - 1 && trail[i + 1].t <= t) i++;
    const a = trail[i], b = trail[Math.min(trail.length - 1, i + 1)];
    const k = b.t > a.t ? clamp((t - a.t) / (b.t - a.t), 0, 1) : 0;
    const back = trail[Math.max(0, i - 8)];
    const ang = Math.hypot(a.x - back.x, a.y - back.y) > 4 ? Math.atan2(a.y - back.y, a.x - back.x) : 0;
    return { p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, ang };
  };

  const inBurst = (b: Burst, x: number, y: number): boolean => {
    if (b.kind === 'giant') return dist(x, y, b.x, b.y) < GIANT_R + 16;
    const ux = Math.cos(b.ang), uy = Math.sin(b.ang);
    const f = (x - b.x) * ux + (y - b.y) * uy;
    const s = Math.abs(-(x - b.x) * uy + (y - b.y) * ux);
    return f > -20 && f < WOLF_LEN && s < WOLF_HW + 18;
  };

  const typeHolds = (f: Fighter, time: number): boolean => types.some((t) => time - t.at < TYPE_MS && dist(f.x, f.y, t.x, t.y) < 30);

  return {
    update(time) {
      step(time);
      if (!started) { started = true; nextVoice = time + 3000; }
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true;
        ctx.banner('HE READS FASTER — AND THE STORY PRINTS ITSELF', '#d8c8ff');
        ctx.sfx('sonic-pulse');
      }
      if (alive(player)) {
        const last = trail[trail.length - 1];
        if (!last || time - last.t > 40) trail.push({ t: time, x: player.x, y: player.y });
      }
      trail = trail.filter((s) => time - s.t < LAG_MS + 800);
      const co = cutout(time);
      // The voices, done at the cut-out.
      if (co && time >= nextVoice) {
        nextVoice = time + (late ? VOICE_LATE : VOICE_EVERY);
        const kind: Voice = voiceIx++ % 3 === 2 ? 'giant' : 'wolf';
        const warn = tk.warn(kind === 'giant' ? GIANT_WARN : WOLF_WARN);
        bursts.push({ kind, x: co.p.x, y: co.p.y, ang: co.ang, at: time, fireAt: time + warn, fired: false });
        speaking = time;
        ctx.sfx(kind === 'giant' ? 'drum-hit' : 'screech');
      }
      for (const b of bursts) {
        if (b.fired || time < b.fireAt) continue;
        b.fired = true;
        ctx.sfx(b.kind === 'giant' ? 'quake' : 'roar');
        for (const f of [player, npc]) {
          if (!alive(f) || ctx.isAirborne(f) || !inBurst(b, f.x, f.y)) continue;
          ctx.hit(f, f === player ? (b.kind === 'giant' ? 18 : 14) : (b.kind === 'giant' ? 28 : 22), f.x, f.y);
          if (b.kind === 'wolf') ctx.nudge(f, Math.cos(b.ang) * 60, Math.sin(b.ang) * 60);
          ctx.flash(f.x, f.y, MYTH_LIT);
        }
      }
      bursts = bursts.filter((b) => !b.fired || time - b.fireAt < 450);
      // Late: the cut-out prints lines of wet type behind it.
      if (late && co && time - lastType > 260) {
        lastType = time;
        types.push({ x: co.p.x, y: co.p.y, ang: co.ang, at: time, seed: Math.floor(time) % 997 });
      }
      types = types.filter((t) => time - t.at < TYPE_MS);
      if (time - lastTypeTick > 500) {
        lastTypeTick = time;
        for (const f of [player, npc]) if (alive(f) && typeHolds(f, time)) ctx.root(f, 450);
      }
    },

    npcSeek(): Pt | null {
      for (const b of bursts) {
        if (b.fired || !inBurst(b, npc.x, npc.y)) continue;
        if (b.kind === 'giant') {
          const a = Math.atan2(npc.y - b.y, npc.x - b.x);
          return { x: clamp(b.x + Math.cos(a) * 150, 60, W - 60), y: clamp(b.y + Math.sin(a) * 150, top + 50, H - 50) };
        }
        const nx = -Math.sin(b.ang), ny = Math.cos(b.ang);
        const s = (npc.x - b.x) * nx + (npc.y - b.y) * ny >= 0 ? 1 : -1;
        return { x: clamp(npc.x + nx * s * 100, 60, W - 60), y: clamp(npc.y + ny * s * 100, top + 50, H - 50) };
      }
      // He knows better than to walk the stranger's tracks: come at her from the side.
      if (alive(player) && trail.length > 4) {
        const recent = trail.slice(-Math.ceil(trail.length / 2));
        const onTrack = recent.some((s) => dist(npc.x, npc.y, s.x, s.y) < 50);
        if (onTrack) {
          const a = Math.atan2(player.y - npc.y, player.x - npc.x) + Math.PI / 2;
          return { x: clamp(player.x + Math.cos(a) * 140, 60, W - 60), y: clamp(player.y + Math.sin(a) * 140, top + 50, H - 50) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      g.fillStyle(0x000000, 0.2); g.fillEllipse(LX, LY + 4, 110, 26);
      // The trail the story is reading: faint printed footsteps along it.
      for (let i = 0; i < trail.length; i += 6) {
        const s = trail[i];
        const age = (time - s.t) / (LAG_MS + 800);
        g.fillStyle(INK_SOFT, 0.25 * (1 - age)); g.fillEllipse(s.x + (i % 12 ? 6 : -6), s.y + 18, 7, 11);
      }
      for (const t of types) {
        const a = clamp(1 - (time - t.at) / TYPE_MS, 0, 1);
        g.fillStyle(PARCH, 0.55 * a); g.fillEllipse(t.x, t.y + 14, 60, 22);
        scribble(g, t.x - 24, t.y + 10, 48, 2, 7, INK, 0.75 * a, t.seed, 2);
      }
      for (const b of bursts) {
        const k = b.fired ? 1 : clamp((time - b.at) / Math.max(1, b.fireAt - b.at), 0, 1);
        const a = b.fired ? 0.5 * (1 - (time - b.fireAt) / 450) : 0.08 + 0.22 * k;
        if (b.kind === 'giant') {
          g.fillStyle(b.fired ? MYTH_LIT : INK, a); g.fillCircle(b.x, b.y, GIANT_R);
          g.lineStyle(2, MYTH_LIT, 0.3 + 0.5 * k); g.strokeCircle(b.x, b.y, GIANT_R);
          // A giant's footprint forming inside the ring.
          g.fillStyle(INK, 0.15 + 0.3 * k); g.fillEllipse(b.x, b.y + 10, 54, 76);
          for (let i = 0; i < 5; i++) g.fillCircle(b.x - 20 + i * 10, b.y - 34 - Math.abs(i - 2) * -3, 6);
        } else {
          const ux = Math.cos(b.ang), uy = Math.sin(b.ang), nx = -uy * WOLF_HW, ny = ux * WOLF_HW;
          const ex = b.x + ux * WOLF_LEN, ey = b.y + uy * WOLF_LEN;
          g.fillStyle(b.fired ? MYTH_LIT : INK, a);
          g.fillTriangle(b.x + nx, b.y + ny, ex + nx, ey + ny, ex - nx, ey - ny);
          g.fillTriangle(b.x + nx, b.y + ny, b.x - nx, b.y - ny, ex - nx, ey - ny);
          g.lineStyle(2, MYTH_LIT, 0.3 + 0.5 * k);
          g.lineBetween(b.x + nx, b.y + ny, ex + nx, ey + ny); g.lineBetween(b.x - nx, b.y - ny, ex - nx, ey - ny);
          // Claw rakes down the lane.
          for (let c = -1; c <= 1; c++) {
            const o = c * 10;
            g.lineStyle(3, INK, 0.2 + 0.4 * k);
            g.lineBetween(b.x + ux * 40 - uy * o, b.y + uy * 40 + ux * o, b.x + ux * (40 + 150 * k) - uy * o, b.y + uy * (40 + 150 * k) + ux * o);
          }
        }
      }
    },

    drawAir(g, time) {
      drawLectern(g, LX, LY, time, time - speaking < 600);
      // The voice leaving him toward the cut-out.
      const co = cutout(time);
      if (time - speaking < 600 && co) {
        const k = (time - speaking) / 600;
        const a = Math.atan2(co.p.y - LY, co.p.x - LX);
        for (let i = 0; i < 3; i++) {
          const r = 30 + (k + i / 3) % 1 * 90;
          g.lineStyle(2.4, MYTH_LIT, 0.6 * (1 - ((k + i / 3) % 1)));
          g.beginPath(); g.arc(LX, LY - 50, r, a - 0.4, a + 0.4, false); g.strokePath();
        }
      }
      if (co) drawCutout(g, co.p.x, co.p.y, time);
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 4;
      pagePlate(g, x, y, 170, 28);
      // How far behind you the story reads: two figures on a ruled line.
      const gap = lag() / LAG_MS;
      g.lineStyle(1, INK_SOFT, 0.7); g.lineBetween(x - 70, y + 20, x + 20, y + 20);
      g.fillStyle(MINE_C, 1); g.fillCircle(x + 14, y + 14, 4);
      g.fillStyle(PARCH_DARK, 1); g.fillRect(x + 14 - 70 * gap - 3, y + 9, 6, 10);
      g.lineStyle(1, INK, 0.8); g.strokeRect(x + 14 - 70 * gap - 3, y + 9, 6, 10);
      // The next voice: two wolves, then the giant.
      for (let i = 0; i < 3; i++) {
        const kind: Voice = (voiceIx + i) % 3 === 2 ? 'giant' : 'wolf';
        const vx = x + 36 + i * 16;
        if (kind === 'giant') { g.fillStyle(INK, i === 0 ? 1 : 0.45); g.fillEllipse(vx, y + 15, 9, 13); }
        else { g.fillStyle(0x6e6a78, i === 0 ? 1 : 0.45); g.fillTriangle(vx - 5, y + 20, vx + 5, y + 20, vx, y + 8); }
      }
      const k = clamp(1 - (nextVoice - time) / (late ? VOICE_LATE : VOICE_EVERY), 0, 1);
      g.fillStyle(FOE_C, 0.9); g.fillRect(x - 80, y + 25, 160 * k, 2);
      if (late) { g.fillStyle(INK, 0.9); g.fillRect(x + 78, y + 8, 3, 12); }
    },
  };
}

/** The Reader's lectern: a carved stand, the licensed book open on it, a quill and a candle. */
function drawLectern(g: G, x: number, y: number, time: number, speaking: boolean): void {
  inked(g, [{ x: x - 24, y }, { x: x + 24, y }, { x: x + 14, y: y - 8 }, { x: x - 14, y: y - 8 }], TIMBER_DARK, 1, 1.6);
  inkRect(g, x - 6, y - 40, 12, 32, TIMBER, 1, 1.6);
  g.lineStyle(1.2, dim(TIMBER, 0.3), 0.9); for (let k = 1; k < 4; k++) g.lineBetween(x - 6, y - 8 - k * 8, x + 6, y - 8 - k * 8);
  inked(g, [{ x: x - 34, y: y - 40 }, { x: x + 34, y: y - 40 }, { x: x + 28, y: y - 58 }, { x: x - 28, y: y - 58 }], TIMBER, 1, 1.8);
  openBook(g, x, y - 42, 60, 22, CLOTH_RED, 1, true, 77);
  quill(g, x + 30, y - 48, -2.2, 20);
  inkRect(g, x - 34, y - 62, 6, 12, PAGE, 1, 1);
  const lean = speaking ? Math.sin(time / 50) * 3 : Math.sin(time / 400) * 0.6;
  g.fillStyle(GILT, 0.95); g.fillTriangle(x - 34, y - 62, x - 28, y - 62, x - 31 + lean, y - 72);
  g.fillStyle(IRON, 1); g.fillRect(x - 36, y - 51, 10, 2);
}

/** The stranger as the story tells it: a paper cut-out on a card stand, scissor-edged, bobbing. */
function drawCutout(g: G, x: number, y: number, time: number): void {
  const bob = Math.sin(time / 120) * 1.5;
  g.fillStyle(0x000000, 0.2); g.fillEllipse(x + 5, y + 20, 34, 9);
  inkRect(g, x - 14, y + 14, 28, 5, PARCH_DARK, 1, 1);
  const by = y + 14 + bob;
  inked(g, [
    { x: x - 12, y: by }, { x: x - 14, y: by - 24 }, { x: x - 18, y: by - 32 }, { x: x - 10, y: by - 38 },
    { x: x + 10, y: by - 38 }, { x: x + 18, y: by - 32 }, { x: x + 14, y: by - 24 }, { x: x + 12, y: by },
  ], PAGE, 0.95, 1.6);
  g.fillStyle(PAGE, 0.95); g.fillCircle(x, by - 47, 10);
  g.lineStyle(1.6, INK, 0.85); g.strokeCircle(x, by - 47, 10);
  // Dotted scissor line round it and printed lines across its chest.
  g.lineStyle(1, INK_SOFT, 0.6);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillStyle(INK_SOFT, 0.6); g.fillCircle(x + Math.cos(a) * 15, by - 47 + Math.sin(a) * 15, 0.9); }
  scribble(g, x - 9, by - 28, 18, 3, 6, INK_SOFT, 0.55, 31, 1);
  g.fillStyle(MINE_C, 0.9); g.fillCircle(x - 3, by - 48, 1.6); g.fillCircle(x + 3, by - 48, 1.6);
}

export const FALLEN_TOLD_BACK: GimmickDef = {
  id: ID,
  rules: 'A paper you walks your steps a moment behind, and the Reader does his voices at it. Never retrace yourself; lead him down your trail.',
  make,
};
