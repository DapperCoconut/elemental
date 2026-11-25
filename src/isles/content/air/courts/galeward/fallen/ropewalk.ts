import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { FLAG, FLAG_DARK, ROCK, ROCK_DARK, ROPE, ROPE_DARK, TAR, TIMBER, TIMBER_DARK, TIMBER_LIT } from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * The Long Lay — Hesper Lay, Ropemaker of the Ropewalk.
 *
 * The Ropewalk runs the east side of Weathercock Square: a long alley where the hemp is stretched
 * from the jack's hooks to the sledge and twisted into line. In the star's telling Hesper made one
 * cord only, for years — the fine waxed twine the collectors tie over the cork of every bottle of
 * breath — and the collars that hold the becalmed to their cots.
 *
 * Three strands run the length of the yard. A strand is laid when its hooks start to spin (it
 * trembles, warned) and the top — the grooved wooden cone a ropemaker walks down the strands —
 * races along it; whoever it overtakes is twisted into the lay, held and hurt. When all three are
 * laid the sledge hauls: the two outer ropes close on the middle, carrying everyone between them
 * inward to be laid up into the hawser. Be out past an outer rope before it moves, or dash over it.
 *
 * The exploit is the jack: strike its crank, and the next lay runs down the strand nearest
 * Hesper, on a short warning. Halfway down she walks two tops at once, in opposite directions.
 */

const ID = fallenId('galeward', 'ropewalk');
const BAND = 20;
const LAY_WARN = 1100;
const JACK_WARN = 650;
const TOP_V = 310;
const HAUL_WARN = 1300;
const HAUL_MS = 1500;
const GAP_MS = 900;
const JACK_COOL = 1600;
const CORE = 34;

interface Top { strand: number; x: number; dir: 1 | -1; warnAt: number; runAt: number; caught: Set<Fighter> }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top: TOPY, player, npc, tk } = ctx;
  const fy = (k: number) => TOPY + (H - TOPY) * k;
  const base = [fy(0.24), fy(0.5), fy(0.76)];
  const ys = [...base];
  const laid = [false, false, false];
  const jackX = 40, sledgeX = W - 40;
  const runFrom = jackX + 30, runTo = sledgeX - 30;
  let tops: Top[] = [];
  let haulWarnAt = -1, haulAt = -1, nextLay = 0, started = false, two = false;
  let forced: number | null = null;
  let jackStruck = -1e9, jackSpin = 0;
  const carried = new Set<Fighter>();

  const nearestStrand = (f: Fighter) => ys.reduce((b, y, i) => (Math.abs(f.y - y) < Math.abs(f.y - ys[b]) ? i : b), 0);
  const unlaid = () => [0, 1, 2].filter((i) => !laid[i] && !tops.some((t) => t.strand === i));

  const jack: StrikeTarget = ctx.target({
    x: jackX, y: fy(0.5) - 26, r: 28,
    onStruck(by) {
      if (tk.now - jackStruck < JACK_COOL || haulWarnAt >= 0 || haulAt >= 0) return;
      jackStruck = tk.now;
      const at = nearestStrand(by === 'player' ? npc : player);
      forced = laid[at] ? null : at;
      if (forced !== null) { nextLay = Math.min(nextLay, tk.now); ctx.sfx('gear-turn'); }
    },
  });

  function startLay(i: number, dir: 1 | -1, warn: number, time: number): void {
    tops.push({ strand: i, x: dir > 0 ? runFrom : runTo, dir, warnAt: time, runAt: time + tk.warn(warn), caught: new Set() });
    ctx.sfx('gear-turn');
  }

  function twist(f: Fighter, t: Top): void {
    t.caught.add(f);
    if (f === player) tk.hitPlayer(10, f.x, f.y); else ctx.hit(npc, 15, f.x, f.y);
    ctx.root(f, 900);
    ctx.sfx('chain');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextLay = time + 2200; }
      if (!two && npc.hp < npc.maxHp * 0.5) { two = true; ctx.banner('TWO TOPS', '#c9a86c'); ctx.sfx('gear-turn'); }
      jackSpin += dt * (tops.length ? 9 : 1.5);

      // Lays: the jack's choice, or the next strand(s) in turn.
      if (!tops.length && haulWarnAt < 0 && haulAt < 0 && time >= nextLay) {
        const free = unlaid();
        if (forced !== null && free.includes(forced)) {
          startLay(forced, 1, JACK_WARN, time);
          if (two && free.length > 1) startLay(free.find((i) => i !== forced) ?? free[0], -1, LAY_WARN, time);
        } else if (free.length) {
          startLay(free[0], 1, LAY_WARN, time);
          if (two && free.length > 1) startLay(free[free.length - 1], -1, LAY_WARN, time);
        }
        forced = null;
      }
      for (const t of tops) {
        if (time < t.runAt) continue;
        t.x += t.dir * TOP_V * dt;
        for (const f of [player, npc]) {
          if (!alive(f) || t.caught.has(f) || Math.abs(f.y - ys[t.strand]) > BAND + 14) continue;
          if (Math.abs(f.x - t.x) < 26) twist(f, t);
        }
      }
      const done = tops.filter((t) => (t.dir > 0 ? t.x >= runTo : t.x <= runFrom));
      if (done.length) {
        for (const t of done) laid[t.strand] = true;
        tops = tops.filter((t) => !done.includes(t));
        if (!tops.length) {
          if (laid.every(Boolean)) { haulWarnAt = time; ctx.sfx('engine'); }
          else nextLay = time + GAP_MS;
        }
      }

      // The haul: outer ropes close on the middle and carry whoever is between.
      if (haulWarnAt >= 0 && time >= haulWarnAt + tk.warn(HAUL_WARN)) {
        haulWarnAt = -1; haulAt = time; carried.clear();
        for (const f of [player, npc]) if (alive(f) && f.y > ys[0] && f.y < ys[2]) carried.add(f);
        ctx.sfx('chain');
      }
      if (haulAt >= 0) {
        const k = clamp((time - haulAt) / HAUL_MS, 0, 1);
        const e = k * k * (3 - 2 * k);
        ys[0] = base[0] + (base[1] - CORE / 2 - base[0]) * e;
        ys[2] = base[2] - (base[2] - base[1] - CORE / 2) * e;
        for (const f of carried) {
          if (!alive(f) || ctx.dashing(f)) { carried.delete(f); continue; }
          if (f.y < ys[0] + 14) ctx.nudge(f, 0, ys[0] + 14 - f.y);
          if (f.y > ys[2] - 14) ctx.nudge(f, 0, ys[2] - 14 - f.y);
        }
        if (k >= 1) {
          ctx.sfx('hit-heavy');
          for (const f of carried) {
            if (!alive(f) || f.y < ys[0] - 4 || f.y > ys[2] + 4) continue;
            if (f === player) tk.hitPlayer(14, f.x, f.y); else ctx.hit(npc, 22, f.x, f.y);
            ctx.root(f, 1300);
          }
          haulAt = -1; carried.clear();
          laid.fill(false); ys.splice(0, 3, ...base);
          nextLay = time + 1600;
        }
      }
    },

    npcSeek(): Pt | null {
      if (!alive(npc)) return null;
      const t = tk.now;
      // Haul coming: out past the nearer outer rope.
      if (haulWarnAt >= 0 && npc.y > ys[0] - 30 && npc.y < ys[2] + 30) {
        return { x: npc.x, y: npc.y < ys[1] ? tk.clampY(ys[0] - 60) : tk.clampY(ys[2] + 60) };
      }
      // A top on her strand that has not passed her: off the band.
      for (const tp of tops) {
        const ahead = tp.dir > 0 ? tp.x < npc.x + 20 : tp.x > npc.x - 20;
        if (ahead && Math.abs(npc.y - ys[tp.strand]) < BAND + 30) {
          const s = npc.y < ys[tp.strand] ? -1 : 1;
          return { x: npc.x, y: tk.clampY(ys[tp.strand] + s * (BAND + 56)) };
        }
      }
      // Idle, with you on a strand: crank the jack at you.
      if (!tops.length && haulWarnAt < 0 && haulAt < 0 && alive(player) && t - jackStruck > JACK_COOL) {
        const i = nearestStrand(player);
        if (!laid[i] && Math.abs(player.y - ys[i]) < BAND + 20 && npc.x < W * 0.4) return { x: jackX + 44, y: jack.y };
      }
      return null;
    },

    drawGround(g, time) {
      // The walk's floor: a long flagged alley, tar-spotted, with T-stakes holding the strands up.
      g.fillStyle(FLAG_DARK, 0.25); g.fillRect(0, base[0] - 34, W, base[2] - base[0] + 68);
      for (let x = 120; x < W - 80; x += 140) {
        g.fillStyle(TAR, 0.15); g.fillEllipse(x + 30, base[1] + 70, 26, 8);
        for (const y of base) {
          g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 2, y - 2, 4, 14);
          g.fillStyle(TIMBER, 1); g.fillRect(x - 10, y - 4, 20, 4);
          g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 10, y - 4, 20, 1);
        }
      }
      // Warnings: a strand trembling before its top runs; the haul's closing ground and safe margins.
      for (const tp of tops) {
        const k = time < tp.runAt ? clamp((time - tp.warnAt) / (tp.runAt - tp.warnAt), 0, 1) : 1;
        const y = ys[tp.strand];
        g.fillStyle(0xe8642a, 0.06 + k * 0.12); g.fillRect(0, y - BAND - 10, W, (BAND + 10) * 2);
        const from = tp.dir > 0 ? Math.max(tp.x, runFrom) : runFrom, to = tp.dir > 0 ? runTo : Math.min(tp.x, runTo);
        g.lineStyle(2, 0xe8642a, 0.3 + k * 0.4); g.lineBetween(from, y - BAND - 10, to, y - BAND - 10); g.lineBetween(from, y + BAND + 10, to, y + BAND + 10);
      }
      if (haulWarnAt >= 0 || haulAt >= 0) {
        const k = haulAt >= 0 ? 1 : clamp((time - haulWarnAt) / HAUL_WARN, 0, 1);
        g.fillStyle(0xe8642a, 0.05 + k * 0.12); g.fillRect(0, ys[0], W, ys[2] - ys[0]);
        g.fillStyle(lit(FLAG, 0.2), 0.12 + k * 0.1); g.fillRect(0, TOPY, W, base[0] - 26 - TOPY); g.fillRect(0, base[2] + 26, W, H - base[2] - 26);
        for (let x = 60 + ((time / 8) % 80); x < W; x += 80) {
          g.lineStyle(2, 0xe8642a, 0.25 + k * 0.4);
          g.lineBetween(x - 8, ys[0] + 10, x, ys[0] + 20); g.lineBetween(x + 8, ys[0] + 10, x, ys[0] + 20);
          g.lineBetween(x - 8, ys[2] - 10, x, ys[2] - 20); g.lineBetween(x + 8, ys[2] - 10, x, ys[2] - 20);
        }
      }
    },

    drawAir(g, time) {
      // The strands: loose yarn trembling when warned, or a hard laid rope; tops racing along.
      for (let i = 0; i < 3; i++) {
        const tp = tops.find((t) => t.strand === i);
        const shake = tp && time < tp.runAt ? Math.sin(time / 25 + i) * 2.5 : 0;
        if (laid[i]) drawLaid(g, jackX, sledgeX, ys[i], haulAt >= 0 || haulWarnAt >= 0 ? 1 : 0, time);
        else if (tp && time >= tp.runAt) {
          if (tp.dir > 0) { drawLaid(g, jackX, tp.x, ys[i], 0, time); drawYarn(g, tp.x, sledgeX, ys[i], 0); }
          else { drawYarn(g, jackX, tp.x, ys[i], 0); drawLaid(g, tp.x, sledgeX, ys[i], 0, time); }
        } else drawYarn(g, jackX, sledgeX, ys[i], shake);
      }
      for (const tp of tops) if (time >= tp.runAt) drawTop(g, tp.x, ys[tp.strand], tp.dir, time);
      drawJack(g, jackX, base, ys, jackSpin, time - jackStruck < 400);
      drawSledge(g, sledgeX, base, ys, haulWarnAt >= 0 ? Math.sin(time / 30) * 2 : 0);
    },

    drawHud(g, time) {
      const x = 30, y = TOPY + 28;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 12, y - 16, 120, 32, 8);
      for (let i = 0; i < 3; i++) {
        const sx = x + i * 30;
        if (laid[i]) { drawLaid(g, sx, sx + 22, y, 0, 0); }
        else { g.lineStyle(1, ROPE, 0.7); for (let k = -1; k <= 1; k++) g.lineBetween(sx, y + k * 2, sx + 22, y + k * 2); }
      }
      if (haulWarnAt >= 0 && Math.floor(time / 120) % 2 === 0) { g.lineStyle(2, 0xe8642a, 1); g.strokeRoundedRect(x - 12, y - 16, 120, 32, 8); }
    },

    destroy() { jack.remove(); },
  };
}

/** Three loose yarns of hemp, slightly apart, sagging between the stakes. */
function drawYarn(g: G, a: number, b: number, y: number, shake: number): void {
  for (let k = -1; k <= 1; k++) {
    g.lineStyle(1.5, k === 0 ? ROPE : ROPE_DARK, 0.9);
    g.lineBetween(a, y + k * 4 + shake * k, b, y + k * 4 - shake * k);
  }
}

/** A laid rope: thick, its twist shown as slanting turns; taut and pale-edged while hauled. */
function drawLaid(g: G, a: number, b: number, y: number, taut: number, time: number): void {
  if (b < a) [a, b] = [b, a];
  g.fillStyle(0x000000, 0.18); g.fillRect(a, y + 6, b - a, 4);
  g.fillStyle(ROPE_DARK, 1); g.fillRect(a, y - 5, b - a, 10);
  g.fillStyle(ROPE, 1); g.fillRect(a, y - 5, b - a, 4);
  g.lineStyle(1.5, dim(ROPE, 0.45), 1);
  for (let x = a + ((time / 20) % 8) * taut; x < b - 6; x += 8) g.lineBetween(x, y + 5, x + 6, y - 5);
  if (taut) { g.lineStyle(1, 0xffe0b0, 0.5 + Math.sin(time / 50) * 0.3); g.lineBetween(a, y - 6, b, y - 6); }
}

/** The top: a grooved cone of wood with three channels, its handle, and the twist streaming off it. */
function drawTop(g: G, x: number, y: number, dir: 1 | -1, time: number): void {
  shadow(g, x, y + 16, 34, 9, 0.3);
  g.fillStyle(TIMBER_DARK, 1); g.fillTriangle(x - dir * 18, y - 16, x - dir * 18, y + 16, x + dir * 16, y);
  g.fillStyle(TIMBER, 1); g.fillTriangle(x - dir * 16, y - 13, x - dir * 16, y + 9, x + dir * 12, y - 1);
  g.lineStyle(2, TIMBER_DARK, 1);
  for (const k of [-8, 0, 8]) g.lineBetween(x - dir * 18, y + k, x + dir * 6, y + k * 0.3);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - dir * 22 - 2, y - 24, 4, 14);
  g.fillStyle(TIMBER_DARK, 1); g.fillCircle(x - dir * 22, y - 26, 4);
  for (let i = 0; i < 3; i++) {
    const a = time / 40 + i * 2.1;
    g.fillStyle(ROPE, 0.6); g.fillCircle(x - dir * (24 + i * 7), y + Math.sin(a) * 6, 1.6);
  }
}

/** The jack: a heavy frame at the west end, a spinning plate with three hooks, and its crank. */
function drawJack(g: G, x: number, base: number[], ys: number[], spin: number, struck: boolean): void {
  shadow(g, x + 4, base[2] + 26, 50, 12, 0.3);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 12, base[0] - 26, 24, base[2] - base[0] + 52);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 12, base[0] - 26, 7, base[2] - base[0] + 52);
  for (let i = 0; i < 3; i++) {
    const y = ys[i];
    const a = spin + i;
    g.fillStyle(ROCK_DARK, 1); g.fillCircle(x, y, 9);
    g.fillStyle(ROCK, 1); g.fillCircle(x, y, 7);
    g.lineStyle(2, 0x3a3a44, 1); g.lineBetween(x + Math.cos(a) * 6, y + Math.sin(a) * 6, x + 14, y);
  }
  // The crank at the middle — the thing you strike.
  const cy = base[1];
  const ca = spin * 0.6;
  g.fillStyle(struck ? 0xe8642a : TIMBER_LIT, 1); g.fillCircle(x, cy - 30, 11);
  g.fillStyle(TIMBER_DARK, 1); g.fillCircle(x, cy - 30, 4);
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x, cy - 30, x + Math.cos(ca) * 18, cy - 30 + Math.sin(ca) * 18);
  g.fillStyle(TIMBER, 1); g.fillCircle(x + Math.cos(ca) * 18, cy - 30 + Math.sin(ca) * 18, 4);
}

/** The sledge: a weighted sled at the east end the strands are made fast to; it creaks before a haul. */
function drawSledge(g: G, x: number, base: number[], ys: number[], creak: number): void {
  shadow(g, x, base[2] + 30, 60, 14, 0.3);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 10 + creak, base[0] - 22, 20, base[2] - base[0] + 44);
  g.fillStyle(TIMBER, 1); g.fillRect(x + 4 + creak, base[0] - 22, 6, base[2] - base[0] + 44);
  for (const y of ys) { g.fillStyle(0x3a3a44, 1); g.fillCircle(x - 10 + creak, y, 4); }
  for (let i = 0; i < 3; i++) {
    const y = base[0] + 40 + i * 80;
    g.fillStyle(ROCK_DARK, 1); g.fillEllipse(x + 22, y, 22, 16);
    g.fillStyle(ROCK, 1); g.fillEllipse(x + 20, y - 3, 18, 11);
  }
}

export const FALLEN_ROPEWALK: GimmickDef = {
  id: ID,
  rules: 'Tops race down three strands, twisting in whoever they overtake. Laid, the outer ropes haul in on the middle. Strike the jack: the strand by her.',
  make,
};
